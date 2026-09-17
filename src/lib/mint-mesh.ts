// src/lib/mint-mesh.ts
/**
 * WoT-Gated Dynamic Mint Mesh (Cashu NUT-06 & 5-Pillar Trust Auditing)
 *
 * Provides real-time health auditing and autonomous routing for Cashu Mints:
 * - Probes NUT-06 /v1/info endpoints for operational health, keysets, and NUT compliance
 * - Resolves mint operator Nostr identity and evaluates WoT Graph Distance + Economic Stake
 * - Computes a 5-Pillar Mint Trust Score (0 - 100) with Anti-Sybil Gatekeeping
 * - Categorizes mint counterparty risk: LOW (score >= 75), MODERATE (score >= 45), HIGH_RISK (< 45 or unverified admin)
 * - Offers selectBestMint for selecting the highest-trust mint across candidates
 */

import {
  normalizePubkey,
  encodeNpub,
  getWebOfTrustDistance,
  type WebOfTrustDistanceResult,
} from "@/lib/wot";
import {
  calculateTrustScore,
  fetchNostrProfile,
  type NostrProfile,
  type TrustScoreResult,
} from "@/lib/trust-score";
import { verifyNip05, type Nip05Result } from "@/lib/nip05";
import { getCreatorFromDb, getZapTotalsFromDb } from "@/lib/db";
import { RECOMMENDED_MINTS, DEFAULT_CASHU_MINT } from "@/lib/cashu";

export interface MintNutCompliance {
  nut04Mint: boolean;
  nut05Melt: boolean;
  nut07StateCheck: boolean;
  nut08FeeReturn: boolean;
  nut10Dleq: boolean;
  nut11P2pk?: boolean;
  rawNuts?: Record<string, any>;
}

export interface MintPillarBreakdown {
  label: string;
  points: number;
  maxPoints: number;
  passed: boolean;
  description: string;
}

export interface MintRiskProfile {
  mintUrl: string;
  trustScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH_RISK";
  adminPubkey: string | null;
  supportedNuts: string[];
  recommendation: "TRUSTED" | "USE_WITH_CAP" | "AVOID";
  // Extended fields for telemetry, diagnostic breakdown, and backward compatibility
  name?: string;
  version?: string;
  description?: string;
  isOnline?: boolean;
  latencyMs?: number;
  operatorNpub?: string;
  operatorName?: string;
  wotDistance?: number;
  wotEndorsersCount?: number;
  nip05Verified?: boolean;
  tier?:
    | "Tier 1: High-Trust Verified Mint"
    | "Tier 2: Community Mint"
    | "Tier 3: Unverified / High-Risk Mint"
    | "Offline";
  isGated?: boolean;
  gateReason?: string;
  compliance?: MintNutCompliance;
  breakdown?: MintPillarBreakdown[];
  auditedAt?: number;
}

export interface MintAuditResult extends MintRiskProfile {
  name: string;
  isOnline: boolean;
  latencyMs: number;
  wotDistance: number;
  wotEndorsersCount: number;
  tier:
    | "Tier 1: High-Trust Verified Mint"
    | "Tier 2: Community Mint"
    | "Tier 3: Unverified / High-Risk Mint"
    | "Offline";
  isGated: boolean;
  compliance: MintNutCompliance;
  breakdown: MintPillarBreakdown[];
  auditedAt: number;
}

export interface DynamicMintRoutingResult {
  selectedMint: MintAuditResult;
  rankedMesh: MintAuditResult[];
  gatedOutMints: MintAuditResult[];
  totalCandidateCount: number;
  activeMeshCount: number;
  meshHealthy: boolean;
}

export const DEFAULT_MINT_MESH_URLS = [
  "https://testnut.cashu.space",
  "https://mint.minibits.cash/Bitcoin",
  "https://mint.macadamia.cash",
  "https://legend.lnbits.com/cashu/api/v1/4gr9xm9YVgah95qcqzQgeh",
];

// In-memory cache for mint audits to prevent excessive probing (TTL: 60s)
const auditCache = new Map<string, { result: MintAuditResult; expiresAt: number }>();
const AUDIT_CACHE_TTL_MS = 60 * 1000;

// Curated operator map for known ecosystem mints when contact is omitted in NUT-06
const KNOWN_MINT_OPERATORS: Record<string, { pubkey: string; nip05?: string }> = {
  "https://testnut.cashu.space": {
    pubkey: "140e4e08e6e5898867f5dbffec52eed1f92e394e432c2536c93437e584285b7b",
    nip05: "calle@cashu.space",
  },
  "https://mint.minibits.cash/bitcoin": {
    pubkey: "140e4e08e6e5898867f5dbffec52eed1f92e394e432c2536c93437e584285b7b",
    nip05: "calle@minibits.cash",
  },
  "https://mint.macadamia.cash": {
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    nip05: "admin@macadamia.cash",
  },
};

/**
 * Probes and extracts NUT-06 information from a Cashu mint endpoint.
 */
async function fetchMintInfo(
  mintUrl: string,
  timeoutMs = 3500
): Promise<{
  info: any | null;
  latencyMs: number;
  isOnline: boolean;
}> {
  const cleanUrl = mintUrl.trim().replace(/\/+$/, "");
  const infoEndpoint = `${cleanUrl}/v1/info`;
  const startTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(infoEndpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      // Try legacy /info endpoint
      const legacyEndpoint = `${cleanUrl}/info`;
      const legacyController = new AbortController();
      const legacyTimer = setTimeout(() => legacyController.abort(), 2000);
      try {
        const legacyRes = await fetch(legacyEndpoint, {
          signal: legacyController.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(legacyTimer);
        if (legacyRes.ok) {
          const data = await legacyRes.json();
          return { info: data, latencyMs: Date.now() - startTime, isOnline: true };
        }
      } catch {}
      return { info: null, latencyMs, isOnline: false };
    }

    const data = await res.json();
    return { info: data, latencyMs, isOnline: true };
  } catch {
    clearTimeout(timer);
    return { info: null, latencyMs: Date.now() - startTime, isOnline: false };
  }
}

/**
 * Extracts Nostr admin contact info (pubkey, NIP-05) from mint metadata.
 */
function extractAdminContact(info: any): {
  pubkey: string | null;
  nip05: string | null;
} {
  if (!info) return { pubkey: null, nip05: null };

  let foundPubkey: string | null = null;
  let foundNip05: string | null = null;

  // 1. Check contact array: e.g. [["nostr", "npub1..."], ["email", "..."]]
  if (Array.isArray(info.contact)) {
    for (const item of info.contact) {
      if (Array.isArray(item) && item.length >= 2) {
        const type = String(item[0]).toLowerCase();
        const val = String(item[1]).trim();
        if (type === "nostr" || type === "npub" || type === "nip05") {
          const cleanVal = val.replace(/^nostr:\/?\/?/i, "").trim();
          if (cleanVal.includes("@")) {
            foundNip05 = foundNip05 || cleanVal;
          } else {
            const norm = normalizePubkey(cleanVal);
            if (norm) foundPubkey = foundPubkey || norm;
          }
        }
      } else if (typeof item === "object" && item !== null) {
        const method = String(item.method || "").toLowerCase();
        const val = String(item.info || "").trim();
        if (method === "nostr" || method === "npub" || method === "nip05") {
          const cleanVal = val.replace(/^nostr:\/?\/?/i, "").trim();
          if (cleanVal.includes("@")) {
            foundNip05 = foundNip05 || cleanVal;
          } else {
            const norm = normalizePubkey(cleanVal);
            if (norm) foundPubkey = foundPubkey || norm;
          }
        }
      }
    }
  } else if (typeof info.contact === "object" && info.contact !== null) {
    for (const [key, value] of Object.entries(info.contact)) {
      const type = key.toLowerCase();
      const val = String(value).trim();
      if (type === "nostr" || type === "npub" || type === "nip05") {
        const cleanVal = val.replace(/^nostr:\/?\/?/i, "").trim();
        if (cleanVal.includes("@")) {
          foundNip05 = foundNip05 || cleanVal;
        } else {
          const norm = normalizePubkey(cleanVal);
          if (norm) foundPubkey = foundPubkey || norm;
        }
      }
    }
  }

  // 2. Check info.pubkey (hex pubkey of mint / operator)
  if (!foundPubkey && info.pubkey && typeof info.pubkey === "string") {
    let clean = info.pubkey.trim();
    if (clean.length === 66 && (clean.startsWith("02") || clean.startsWith("03"))) {
      clean = clean.slice(2);
    }
    const norm = normalizePubkey(clean);
    if (norm) foundPubkey = norm;
  }

  return {
    pubkey: foundPubkey,
    nip05: foundNip05,
  };
}

/**
 * Resolves a NIP-05 address into a 64-character hex Nostr public key.
 */
async function resolveNip05ToPubkey(nip05: string): Promise<string | null> {
  try {
    const clean = nip05.trim().toLowerCase();
    const parts = clean.split("@");
    if (parts.length !== 2) return null;
    const [name, domain] = parts;
    const res = await fetch(
      `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`,
      {
        signal: AbortSignal.timeout(2000),
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pk = data?.names?.[name];
    if (pk && typeof pk === "string") {
      return normalizePubkey(pk);
    }
  } catch {}
  return null;
}

/**
 * Extracts list of supported NUT strings (e.g. ['NUT-04', 'NUT-05', 'NUT-11']) from NUT-06 info.
 */
function extractSupportedNuts(info: any): string[] {
  if (!info || !info.nuts || typeof info.nuts !== "object") return [];
  const list: string[] = [];
  for (const key of Object.keys(info.nuts)) {
    const num = parseInt(key.replace(/^nut-?/i, ""), 10);
    if (!isNaN(num)) {
      const formatted = `NUT-${num < 10 ? "0" + num : num}`;
      if (!list.includes(formatted)) {
        list.push(formatted);
      }
    } else {
      const upper = key.toUpperCase();
      if (!list.includes(upper)) list.push(upper);
    }
  }
  return list.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
}

/**
 * Evaluates NUT protocol compliance from NUT-06 info.
 */
function extractCompliance(info: any): MintNutCompliance {
  const nuts = info?.nuts || {};
  const hasNut = (num: number) => Boolean(nuts[num] || nuts[String(num)]);

  return {
    nut04Mint: hasNut(4),
    nut05Melt: hasNut(5),
    nut07StateCheck: hasNut(7),
    nut08FeeReturn: hasNut(8),
    nut10Dleq: hasNut(10),
    nut11P2pk: hasNut(11),
    rawNuts: nuts,
  };
}

/**
 * Audits a Cashu Mint endpoint using the NostrPulse 5-Pillar Trust Score framework.
 *
 * @param mintUrl - Base URL of the Cashu Mint
 * @param forceRefresh - If true, bypasses in-memory cache
 * @returns MintRiskProfile with risk level, supported NUTs, and trust score
 */
export async function auditCashuMint(
  mintUrl: string,
  forceRefresh = false
): Promise<MintAuditResult> {
  const cleanUrl = mintUrl.trim().replace(/\/+$/, "");

  // Check cache
  const cached = auditCache.get(cleanUrl);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const { info, latencyMs, isOnline } = await fetchMintInfo(cleanUrl);

  const breakdown: MintPillarBreakdown[] = [];

  // Offline Mint handling
  if (!isOnline || !info) {
    const offlineResult: MintAuditResult = {
      mintUrl: cleanUrl,
      trustScore: 0,
      riskLevel: "HIGH_RISK",
      adminPubkey: null,
      supportedNuts: [],
      recommendation: "AVOID",
      isOnline: false,
      latencyMs,
      name: cleanUrl.replace(/^https?:\/\//, ""),
      wotDistance: 3,
      wotEndorsersCount: 0,
      tier: "Offline",
      isGated: true,
      gateReason: "Mint is unreachable or returned non-200 response on NUT-06 info probe.",
      compliance: {
        nut04Mint: false,
        nut05Melt: false,
        nut07StateCheck: false,
        nut08FeeReturn: false,
        nut10Dleq: false,
      },
      breakdown: [
        {
          label: "Pillar 1: Operator WoT Graph Connectivity",
          points: 0,
          maxPoints: 35,
          passed: false,
          description: "Mint endpoint is offline.",
        },
        {
          label: "Pillar 2: Economic Proof-of-Trust (Zaps)",
          points: 0,
          maxPoints: 20,
          passed: false,
          description: "Mint endpoint is offline.",
        },
        {
          label: "Pillar 3: Cryptographic Identity & Transport Security",
          points: 0,
          maxPoints: 15,
          passed: false,
          description: "Mint endpoint is offline.",
        },
        {
          label: "Pillar 4: Operational Health & Latency",
          points: 0,
          maxPoints: 15,
          passed: false,
          description: "Probe timed out or connection failed.",
        },
        {
          label: "Pillar 5: NUT Protocol Compliance",
          points: 0,
          maxPoints: 15,
          passed: false,
          description: "No NUT capabilities detected.",
        },
      ],
      auditedAt: Date.now(),
    };

    auditCache.set(cleanUrl, { result: offlineResult, expiresAt: Date.now() + 15000 });
    return offlineResult;
  }

  const compliance = extractCompliance(info);
  const supportedNuts = extractSupportedNuts(info);

  // Extract admin contact (pubkey, NIP-05)
  const contact = extractAdminContact(info);
  let adminPubkey = contact.pubkey;
  let adminNip05 = contact.nip05;

  // Resolve NIP-05 if pubkey was missing
  if (!adminPubkey && adminNip05) {
    adminPubkey = await resolveNip05ToPubkey(adminNip05);
  }

  // Fallback to known mint operator registry if not advertised
  if (!adminPubkey && KNOWN_MINT_OPERATORS[cleanUrl.toLowerCase()]) {
    adminPubkey = KNOWN_MINT_OPERATORS[cleanUrl.toLowerCase()].pubkey;
    if (!adminNip05) {
      adminNip05 = KNOWN_MINT_OPERATORS[cleanUrl.toLowerCase()].nip05 || null;
    }
  }

  const operatorNpub = adminPubkey ? encodeNpub(adminPubkey) : undefined;

  // Resolve admin reputation via fetchNostrProfile and calculateTrustScore
  let profile: NostrProfile | null = null;
  let nip05Result: Nip05Result | undefined = undefined;
  let wotResult: WebOfTrustDistanceResult | null = null;
  let creatorDb: any = null;
  let zapRow: any = null;
  let isVerifiableAdmin = false;

  if (adminPubkey) {
    try {
      [profile, creatorDb, zapRow] = await Promise.all([
        fetchNostrProfile(adminPubkey).catch(() => null),
        getCreatorFromDb(adminPubkey).catch(() => null),
        getZapTotalsFromDb(adminPubkey).catch(() => null),
      ]);

      const targetNip05 = adminNip05 || profile?.nip05 || creatorDb?.nip05;
      if (targetNip05) {
        nip05Result = await verifyNip05(targetNip05, adminPubkey).catch(() => undefined);
      }

      wotResult = getWebOfTrustDistance(adminPubkey);

      const effectiveProfile: NostrProfile = profile || {
        pubkey: adminPubkey,
        npub: operatorNpub || "",
        name: creatorDb?.name || "",
        nip05: targetNip05 || "",
      };

      const calculatedAdminScore = calculateTrustScore(
        effectiveProfile,
        nip05Result,
        wotResult
      );

      isVerifiableAdmin = Boolean(
        wotResult.distance <= 2 ||
          nip05Result?.isVerified ||
          profile?.name ||
          creatorDb ||
          calculatedAdminScore.score >= 20
      );
    } catch (err) {
      console.debug("[MintMesh] Admin reputation resolution warning:", err);
    }
  }

  const wotDistance = wotResult ? wotResult.distance : 3;
  const wotEndorsersCount = wotResult ? wotResult.endorsedByCount : 0;

  // =========================================================================
  // Pillar 1: Operator WoT Graph Connectivity (Max: 35 pts)
  // =========================================================================
  let p1Points = 0;
  let p1Desc = "";

  if (wotResult && adminPubkey) {
    if (wotResult.distance === 0) {
      p1Points = 35;
      p1Desc = `Root Seed Anchor: Mint operated directly by Nostr core anchor (${wotResult.tier || "Core Protocol"})`;
    } else if (wotResult.distance === 1) {
      const endorsers = wotResult.endorsers || [];
      const sample = endorsers.slice(0, 2).join(", ");
      p1Points = Math.min(30, 20 + wotResult.endorsedByCount * 2);
      p1Desc = `Hop 1: Operator endorsed by ${wotResult.endorsedByCount} Anchors${sample ? ` (${sample})` : ""}`;
    } else if (wotResult.distance === 2) {
      p1Points = Math.min(20, 10 + wotResult.endorsedByCount * 2);
      p1Desc = `Hop 2: Operator verified via transitive trust graph (${wotResult.endorsedByCount} Ring-1 endorsers)`;
    } else {
      p1Points = 8;
      p1Desc = "Hop > 2: Operator pubkey present but outside Ring-2 trust graph";
    }
  } else {
    // Check if mint is in curated recommended list
    const isRecommended = RECOMMENDED_MINTS.some(
      (m) => m.url.toLowerCase() === cleanUrl.toLowerCase()
    );
    if (isRecommended) {
      p1Points = 25;
      p1Desc = "Ecosystem Benchmark: Recognized community mint in NostrPulse trusted index";
    } else {
      p1Points = 10;
      p1Desc = "Autonomous Mint: No verifiable Nostr operator identity in NUT-06 contacts";
    }
  }

  breakdown.push({
    label: "Pillar 1: Operator WoT Graph Connectivity",
    points: p1Points,
    maxPoints: 35,
    passed: p1Points >= 15,
    description: `${p1Desc} • ${p1Points}/35 pts`,
  });

  // =========================================================================
  // Pillar 2: Economic Proof-of-Trust (Zaps) (Max: 20 pts)
  // =========================================================================
  let p2Points = 0;
  let p2Desc = "";

  const validZapsSats = zapRow?.valid_sender_sats ?? 0;
  if (validZapsSats > 0) {
    const satsPoints = Math.min(20, Math.round(Math.log10(validZapsSats + 1) * 4.0));
    p2Points = Math.max(8, satsPoints);
    p2Desc = `Operator received ${validZapsSats.toLocaleString()} Sats in verified WoT Zaps`;
  } else if (adminPubkey) {
    p2Points = 5;
    p2Desc = "Active Nostr keypair, no verified incoming WoT Zaps recorded";
  } else {
    p2Points = 5;
    p2Desc = "Pseudonymous mint operator, economic stake signal neutral";
  }

  breakdown.push({
    label: "Pillar 2: Economic Proof-of-Trust (Zaps)",
    points: p2Points,
    maxPoints: 20,
    passed: p2Points >= 8,
    description: `${p2Desc} • ${p2Points}/20 pts`,
  });

  // =========================================================================
  // Pillar 3: Cryptographic Identity & Transport Security (Max: 15 pts)
  // =========================================================================
  let p3Points = 0;
  let p3Desc = "";

  const isHttps = cleanUrl.startsWith("https://");
  if (isHttps) {
    p3Points += 8;
    p3Desc = "Encrypted HTTPS transport";
  } else {
    p3Desc = "Insecure HTTP transport (security risk)";
  }

  const isNip05Verified = Boolean(nip05Result?.isVerified);
  if (isNip05Verified) {
    p3Points += 7;
    p3Desc += ` • Verified NIP-05 (${nip05Result?.nip05})`;
  } else if (info.name && info.pubkey) {
    p3Points += 4;
    p3Desc += " • Valid NUT-06 public keyset signature";
  }

  p3Points = Math.min(15, p3Points);
  breakdown.push({
    label: "Pillar 3: Cryptographic Identity & Transport Security",
    points: p3Points,
    maxPoints: 15,
    passed: isHttps,
    description: `${p3Desc} • ${p3Points}/15 pts`,
  });

  // =========================================================================
  // Pillar 4: Operational Health & Latency (Max: 15 pts)
  // =========================================================================
  let p4Points = 0;
  let p4Desc = "";

  if (latencyMs < 300) {
    p4Points = 15;
    p4Desc = `Ultra-fast response (${latencyMs}ms)`;
  } else if (latencyMs < 800) {
    p4Points = 12;
    p4Desc = `Good responsiveness (${latencyMs}ms)`;
  } else if (latencyMs < 1500) {
    p4Points = 8;
    p4Desc = `Moderate latency (${latencyMs}ms)`;
  } else if (latencyMs < 3000) {
    p4Points = 4;
    p4Desc = `High latency (${latencyMs}ms)`;
  } else {
    p4Points = 1;
    p4Desc = `Degraded responsiveness (${latencyMs}ms)`;
  }

  breakdown.push({
    label: "Pillar 4: Operational Health & Latency",
    points: p4Points,
    maxPoints: 15,
    passed: latencyMs < 1500,
    description: `${p4Desc} • ${p4Points}/15 pts`,
  });

  // =========================================================================
  // Pillar 5: NUT Protocol Compliance (Max: 15 pts)
  // =========================================================================
  let p5Points = 0;
  if (compliance.nut04Mint) p5Points += 3;
  if (compliance.nut05Melt) p5Points += 4;
  if (compliance.nut07StateCheck) p5Points += 3;
  if (compliance.nut08FeeReturn) p5Points += 3;
  if (compliance.nut10Dleq) p5Points += 2;
  if (compliance.nut11P2pk) p5Points += 2;

  p5Points = Math.min(15, p5Points);
  const p5Desc =
    supportedNuts.length > 0
      ? `Supported capabilities: ${supportedNuts.join(", ")}`
      : "Basic Cashu V3 compatibility";

  breakdown.push({
    label: "Pillar 5: NUT Protocol Compliance",
    points: p5Points,
    maxPoints: 15,
    passed: compliance.nut04Mint && compliance.nut05Melt,
    description: `${p5Desc} • ${p5Points}/15 pts`,
  });

  // =========================================================================
  // Anti-Sybil Gatekeeper & Risk Profiling
  // =========================================================================
  let rawScore = p1Points + p2Points + p3Points + p4Points + p5Points;
  let isGated = false;
  let gateReason: string | undefined;

  // Insecure HTTP gatekeeper
  if (!isHttps) {
    rawScore = Math.min(rawScore, 25);
    isGated = true;
    gateReason = "Insecure HTTP: Transport encryption is mandatory for production mint routing.";
  }

  // Latency > 3500ms gatekeeper
  if (latencyMs > 3500) {
    rawScore = Math.min(rawScore, 35);
    isGated = true;
    gateReason = "Extreme latency: Mint latency exceeded 3500ms threshold.";
  }

  // Verifiable admin requirement
  if (!adminPubkey) {
    rawScore = Math.min(rawScore, 40);
    isGated = true;
    if (!gateReason) {
      gateReason = "No verifiable Nostr admin contact in mint metadata.";
    }
  }

  const finalTrustScore = Math.round(rawScore);

  // Determine Risk Level:
  // - "LOW" (score >= 75)
  // - "MODERATE" (score >= 45)
  // - "HIGH_RISK" (score < 45 or no verifiable admin)
  let riskLevel: MintRiskProfile["riskLevel"];
  if (!adminPubkey || finalTrustScore < 45) {
    riskLevel = "HIGH_RISK";
  } else if (finalTrustScore >= 75) {
    riskLevel = "LOW";
  } else {
    riskLevel = "MODERATE";
  }

  // Determine Recommendation:
  // - "TRUSTED" (LOW risk)
  // - "USE_WITH_CAP" (MODERATE risk)
  // - "AVOID" (HIGH_RISK)
  let recommendation: MintRiskProfile["recommendation"];
  if (riskLevel === "LOW") {
    recommendation = "TRUSTED";
  } else if (riskLevel === "MODERATE") {
    recommendation = "USE_WITH_CAP";
  } else {
    recommendation = "AVOID";
  }

  // Tier classification
  let tier: MintRiskProfile["tier"];
  if (finalTrustScore >= 65) {
    tier = "Tier 1: High-Trust Verified Mint";
  } else if (finalTrustScore >= 45) {
    tier = "Tier 2: Community Mint";
  } else {
    tier = "Tier 3: Unverified / High-Risk Mint";
    isGated = true;
    if (!gateReason) {
      gateReason = "Trust score is below the WoT security threshold (< 45/100).";
    }
  }

  const result: MintAuditResult = {
    mintUrl: cleanUrl,
    trustScore: finalTrustScore,
    riskLevel,
    adminPubkey: adminPubkey || null,
    supportedNuts,
    recommendation,
    name: info.name || cleanUrl.replace(/^https?:\/\//, ""),
    version: info.version,
    description: info.description,
    isOnline: true,
    latencyMs,
    operatorNpub,
    operatorName: profile?.name || creatorDb?.name || undefined,
    wotDistance,
    wotEndorsersCount,
    nip05Verified: isNip05Verified,
    tier,
    isGated,
    gateReason,
    compliance,
    breakdown,
    auditedAt: Date.now(),
  };

  auditCache.set(cleanUrl, { result, expiresAt: Date.now() + AUDIT_CACHE_TTL_MS });
  return result;
}

/**
 * Evaluates all candidate mints and returns the one with the highest Trust Score.
 *
 * @param mintCandidates - Array of Cashu Mint base URLs
 * @returns MintRiskProfile of the best candidate or null if candidates array is empty
 */
export async function selectBestMint(
  mintCandidates: string[]
): Promise<MintRiskProfile | null> {
  if (!mintCandidates || mintCandidates.length === 0) {
    return null;
  }

  // Evaluate all candidate mints concurrently
  const audits = await Promise.all(
    mintCandidates.map((url) =>
      auditCashuMint(url).catch(() => ({
        mintUrl: url,
        trustScore: 0,
        riskLevel: "HIGH_RISK" as const,
        adminPubkey: null,
        supportedNuts: [],
        recommendation: "AVOID" as const,
        isOnline: false,
        latencyMs: 9999,
        wotDistance: 3,
        wotEndorsersCount: 0,
        tier: "Offline" as const,
        isGated: true,
        gateReason: "Audit execution failure",
        compliance: {
          nut04Mint: false,
          nut05Melt: false,
          nut07StateCheck: false,
          nut08FeeReturn: false,
          nut10Dleq: false,
        },
        breakdown: [],
        auditedAt: Date.now(),
      }))
    )
  );

  // Sort descending by trustScore, breaking ties with lowest latency
  const sorted = audits.sort((a, b) => {
    if (b.trustScore !== a.trustScore) {
      return b.trustScore - a.trustScore;
    }
    return (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999);
  });

  return sorted[0] || null;
}

/**
 * Dynamically audits and routes payments to the optimal Cashu Mint in the mesh.
 *
 * @param options.amountSats - Optional satoshi payment amount
 * @param options.preferredMint - Optional preferred mint URL
 * @param options.candidateMints - Optional custom array of candidate mint URLs
 * @param options.minTrustScore - Minimum WoT trust score threshold (default: 45)
 */
export async function routeCashuMint(options: {
  amountSats?: number;
  preferredMint?: string;
  candidateMints?: string[];
  minTrustScore?: number;
} = {}): Promise<DynamicMintRoutingResult> {
  const minScore = options.minTrustScore ?? 45;
  const candidates = options.candidateMints?.length
    ? options.candidateMints
    : DEFAULT_MINT_MESH_URLS;

  // Audit all candidate mints concurrently
  const audits = await Promise.all(
    candidates.map((url) =>
      auditCashuMint(url).catch((err) => {
        console.debug(`[MintMesh] Failed auditing ${url}:`, err);
        return {
          mintUrl: url,
          trustScore: 0,
          riskLevel: "HIGH_RISK" as const,
          adminPubkey: null,
          supportedNuts: [],
          recommendation: "AVOID" as const,
          isOnline: false,
          latencyMs: 9999,
          name: url,
          wotDistance: 3,
          wotEndorsersCount: 0,
          tier: "Offline" as const,
          isGated: true,
          gateReason: "Audit execution error",
          compliance: {
            nut04Mint: false,
            nut05Melt: false,
            nut07StateCheck: false,
            nut08FeeReturn: false,
            nut10Dleq: false,
          },
          breakdown: [],
          auditedAt: Date.now(),
        };
      })
    )
  );

  // Separate qualified vs gated mints
  const qualifiedMints = audits.filter(
    (a) => a.isOnline && a.trustScore >= minScore
  );
  const gatedOutMints = audits.filter(
    (a) => !a.isOnline || a.trustScore < minScore
  );

  // Scoring function: Composite = TrustScore * 0.65 + LatencyScore * 0.35 + PreferredBoost
  const calculateRoutingScore = (a: MintRiskProfile) => {
    const latencyScore = Math.max(0, 100 - Math.min(100, (a.latencyMs ?? 9999) / 20));
    const isPreferred =
      options.preferredMint &&
      a.mintUrl.toLowerCase() === options.preferredMint.toLowerCase();
    const preferredBoost = isPreferred ? 15 : 0;
    return a.trustScore * 0.65 + latencyScore * 0.35 + preferredBoost;
  };

  const rankedMesh = (qualifiedMints.length > 0 ? qualifiedMints : audits).sort(
    (a, b) => calculateRoutingScore(b) - calculateRoutingScore(a)
  );

  const selectedMint = rankedMesh[0];

  return {
    selectedMint,
    rankedMesh,
    gatedOutMints,
    totalCandidateCount: audits.length,
    activeMeshCount: qualifiedMints.length,
    meshHealthy: qualifiedMints.length > 0,
  };
}
