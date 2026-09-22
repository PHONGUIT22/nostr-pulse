// src/lib/trust-score.ts
import { NostrProfile, fetchNostrProfile, DEFAULT_RELAYS } from "@/lib/nostr";
import { Nip05Result } from "@/lib/nip05";

import { 
  getWebOfTrustDistance, 
  resolveWebOfTrustDistance, 
  WebOfTrustDistanceResult 
} from "@/lib/wot";

import {
  fetchEconomicStake,
  EconomicStakeResult,
} from "@/lib/economic-stake";

export { fetchNostrProfile, DEFAULT_RELAYS };
export type { NostrProfile, WebOfTrustDistanceResult, EconomicStakeResult };

export interface TrustScoreBreakdownItem {
  label: string;
  category: 
    | "Graph Connectivity" 
    | "Economic Stake" 
    | "NIP-05 Identity" 
    | "Network Longevity" 
    | "Web-of-Trust (WoT)" 
    | "Lightning V4V" 
    | "Profile Quality";
  points: number;
  maxPoints: number;
  passed: boolean;
  description: string;
  sybilRiskLevel?: "Low" | "Moderate" | "High";
}

export interface TrustScoreResult {
  score: number;
  tier: "Verified Builder" | "Active Contributor" | "Unverified / Potential Bot";
  tierColor: string;
  tierBg: string;
  tierBorder: string;
  summary: string;
  nip05Status: Nip05Result;
  wotScore: number;
  wotDistance: 0 | 1 | 2 | 3;
  wotDetails?: WebOfTrustDistanceResult;
  economicStake?: EconomicStakeResult;
  sybilResistanceLevel: "High" | "Medium" | "Low" | "Vulnerable";
  breakdown: TrustScoreBreakdownItem[];
}

export function calculateTrustScore(
  profile: NostrProfile | null,
  nip05Result?: Nip05Result,
  wotResult?: WebOfTrustDistanceResult,
  economicStakeResult?: EconomicStakeResult
): TrustScoreResult {
  // 1. Resolve NIP-05 identifier
  const resolvedNip05: Nip05Result = nip05Result || {
    isVerified: Boolean(profile?.nip05 && profile.nip05.includes("@")),
    nip05: profile?.nip05 || "",
    domain: profile?.nip05?.split("@")[1] || "",
  };

  if (!profile) {
    return {
      score: 5,
      tier: "Unverified / Potential Bot",
      tierColor: "text-rose-400",
      tierBg: "bg-rose-950/40",
      tierBorder: "border-rose-800/80",
      summary: "Profile data is unavailable or could not be queried from open relays.",
      nip05Status: resolvedNip05,
      wotScore: 0,
      wotDistance: 3,
      sybilResistanceLevel: "Vulnerable",
      breakdown: [],
    };
  }

  let rawScore = 0;
  const breakdown: TrustScoreBreakdownItem[] = [];

  // =========================================================================
  // Pillar 1: Graph Connectivity (Hop-distance from Anchors) (Max: 45 pts / 45%)
  // =========================================================================
  const resolvedWot: WebOfTrustDistanceResult =
    wotResult || getWebOfTrustDistance(profile.pubkey || "");

  let graphPoints = 0;
  let graphDesc = "";

  if (resolvedWot.distance === 0) {
    graphPoints = 45;
    graphDesc = `Hop 0: Core Root Anchor in Nostr Web-of-Trust (${resolvedWot.tier || "Core Protocol"}) • 45/45 pts`;
  } else if (resolvedWot.distance === 1) {
    // rawScore is the accumulated sum of anchor weights (up to 40)
    const scoreHop1 = Math.min(40, resolvedWot.rawScore);
    graphPoints = Math.round((scoreHop1 / 40) * 45);
    const endorsers = resolvedWot.endorsers || [];
    const sample = endorsers.slice(0, 3).join(", ");
    const extra = endorsers.length > 3 ? ` +${endorsers.length - 3} more` : "";
    graphDesc = `Hop 1: Endorsed by ${resolvedWot.endorsedByCount} Anchors${sample ? ` (${sample}${extra})` : ""} • ${graphPoints}/45 pts`;
  } else if (resolvedWot.distance === 2) {
    const scoreHop2 = Math.min(25, (resolvedWot.endorsedByCount || 1) * 5);
    graphPoints = scoreHop2;
    graphDesc = `Hop 2: Transitive Trust via ${resolvedWot.endorsedByCount} Ring-1 node${resolvedWot.endorsedByCount > 1 ? "s" : ""} • ${graphPoints}/45 pts`;
  } else {
    graphPoints = 0;
    graphDesc = "Hop > 2: Isolated keypair outside trust graph (0/45 pts)";
  }

  rawScore += graphPoints;

  breakdown.push({
    label: "Graph Connectivity (Hop-distance)",
    category: "Graph Connectivity",
    points: graphPoints,
    maxPoints: 45,
    passed: graphPoints >= 20,
    sybilRiskLevel: resolvedWot.sybilRisk,
    description: graphDesc,
  });

  // =========================================================================
  // Pillar 2: Economic Proof-of-Trust (Real Sats Zaps from WoT) (Max: 30 pts / 30%)
  // =========================================================================
  const hasLud16 = Boolean(profile.lud16 && profile.lud16.includes("@"));
  let economicPoints = 0;
  let economicDesc = "";

  if (economicStakeResult) {
    // 5 base points for active payment address + up to 25 pts from verified sats
    const baseEndpoint = hasLud16 ? 5 : 0;
    const validSats = economicStakeResult.totalValidSats;
    const satsScore = Math.min(25, Math.round(Math.log10(validSats + 1) * 5.0));
    economicPoints = Math.min(30, baseEndpoint + satsScore);

    const validCount = economicStakeResult.validZapsCount;
    const filteredCount = economicStakeResult.filteredSybilZapsCount;
    const filteredSats = economicStakeResult.totalFilteredSats;

    if (hasLud16) {
      economicDesc = `Active Lightning Address (${profile.lud16})`;
      if (validSats > 0) {
        economicDesc += ` • ${validSats.toLocaleString()} Sats from ${validCount} WoT sender${validCount > 1 ? "s" : ""} (+${satsScore} pts)`;
      } else {
        economicDesc += " • No verified WoT incoming zaps yet (5/30 pts)";
      }
      if (filteredCount > 0) {
        economicDesc += ` (${filteredCount} Sybil zap${filteredCount > 1 ? "s" : ""} / ${filteredSats.toLocaleString()} Sats filtered)`;
      }
    } else {
      economicDesc = "No Lightning payment address configured (0/30 pts)";
    }
  } else {
    // Synchronous fallback when live receipts are not queried
    economicPoints = hasLud16 ? 20 : 0;
    economicDesc = hasLud16
      ? `Active Lightning Payment Address (${profile.lud16}) configured for Zaps`
      : "No Lightning payment address linked (0/30 pts)";
  }

  // Baseline protection for Root Anchors (Hop 0) against relay timeout / zero zaps
  const isRootAnchor = resolvedWot.distance === 0 || resolvedWot.isDirectAnchor;
  if (isRootAnchor) {
    const rootMinPoints = hasLud16 ? 27 : 25;
    if (economicPoints < rootMinPoints) {
      economicPoints = rootMinPoints;
      economicDesc = hasLud16
        ? `Root Anchor Protocol Pioneer (${profile.lud16}) • Verified Economic Stake Baseline (${economicPoints}/30 pts)`
        : `Root Anchor Protocol Pioneer • Verified Economic Stake Baseline (${economicPoints}/30 pts)`;
    }
  }

  rawScore += economicPoints;

  breakdown.push({
    label: "Economic Proof-of-Trust (Zaps)",
    category: "Economic Stake",
    points: economicPoints,
    maxPoints: 30,
    passed: economicPoints >= 15,
    sybilRiskLevel: economicPoints >= 15 ? "Low" : hasLud16 ? "Moderate" : "High",
    description: economicDesc,
  });

  // =========================================================================
  // Pillar 3: NIP-05 Cryptographic DNS Identity (Max: 15 pts / 15%)
  // =========================================================================
  const isNip05Verified = resolvedNip05.isVerified;
  let nip05Points = 0;

  if (isNip05Verified) {
    const isCustomDomain = resolvedNip05.domain && !["nostrcheck.me", "nostrplebs.com", "iris.to"].includes(resolvedNip05.domain);
    nip05Points = isCustomDomain ? 15 : 12;
  }

  rawScore += nip05Points;

  breakdown.push({
    label: "NIP-05 Cryptographic DNS",
    category: "NIP-05 Identity",
    points: nip05Points,
    maxPoints: 15,
    passed: isNip05Verified,
    sybilRiskLevel: isNip05Verified ? "Low" : "High",
    description: isNip05Verified
      ? `Cryptographically signed by https://${resolvedNip05.domain}/.well-known/nostr.json (${nip05Points}/15 pts)`
      : profile.nip05
      ? `Verification Failed: ${resolvedNip05.error || "Pubkey mismatch with DNS record"}`
      : "No NIP-05 identifier configured (Secondary signal: 0/15 pts)",
  });

  // =========================================================================
  // Pillar 4: Account Longevity & Relay Distribution (Max: 10 pts / 10%)
  // =========================================================================
  const now = Math.floor(Date.now() / 1000);
  const accountAgeSeconds = profile.created_at ? now - profile.created_at : 0;
  const isOlderThan1Year = accountAgeSeconds >= 86400 * 365;
  const isOlderThan6Months = accountAgeSeconds >= 86400 * 180;

  let agePoints = 0;
  if (isOlderThan1Year) agePoints = 6;
  else if (isOlderThan6Months) agePoints = 4;
  else if (profile.created_at) agePoints = 2;

  const relayCount = profile.relays_connected || 6;
  const relayPoints = relayCount >= 4 ? 4 : relayCount >= 2 ? 2 : 0;
  let longevityPoints = agePoints + relayPoints;

  let longevityDesc = "";
  const ageMonths = Math.max(1, Math.round(accountAgeSeconds / (86400 * 30)));

  // Baseline protection for Root Anchors (Hop 0) against missing/delayed relay metadata
  if (isRootAnchor) {
    if (longevityPoints < 9) {
      longevityPoints = 9;
    }
    longevityDesc = `Genesis Root Anchor keypair observed across ${relayCount} relays (${longevityPoints}/10 pts)`;
  } else {
    longevityDesc = isOlderThan6Months
      ? `Established keypair (${ageMonths} months active) replicated across ${relayCount} relays (${longevityPoints}/10 pts)`
      : `Active keypair observed on ${relayCount} relays (${longevityPoints}/10 pts)`;
  }

  rawScore += longevityPoints;

  breakdown.push({
    label: "Account Longevity & Relay Distribution",
    category: "Network Longevity",
    points: longevityPoints,
    maxPoints: 10,
    passed: longevityPoints >= 6,
    sybilRiskLevel: isOlderThan6Months || isRootAnchor ? "Low" : "Moderate",
    description: longevityDesc,
  });

  // =========================================================================
  // ANTI-SYBIL GATEKEEPER (Strict Social Distance & Economic Stake Constraints)
  // =========================================================================
  let finalScore = rawScore;
  let isGatekeeperCapped = false;
  let gatekeeperReason = "";

  const hasZeroGraph = graphPoints === 0; // Hop > 2 / isolated
  const hasZeroEconomicStake = !economicStakeResult || economicStakeResult.totalValidSats === 0;

  // 1. PRIMARY GATEKEEPER: Zero Graph Connectivity AND Zero Economic Stake from verified WoT
  // Hard-cap at maximum 25 points, forced "Unverified / Potential Bot" (regardless of NIP-05 or bio)
  if (hasZeroGraph && hasZeroEconomicStake) {
    if (finalScore > 25) {
      finalScore = 25;
      isGatekeeperCapped = true;
      gatekeeperReason = "Sybil Gatekeeper: Isolated keypair with zero Graph Connectivity and zero Economic Stake from WoT. Hard-capped at 25/100.";
    }
  } 
  // 2. Hop > 2 with some economic stake: still outside trust graph, capped at 35/100
  else if (resolvedWot.distance >= 3) {
    if (finalScore > 35) {
      finalScore = 35;
      isGatekeeperCapped = true;
      gatekeeperReason = "Sybil Gatekeeper: Keypair outside trust graph (Hop > 2). Hard-capped at 35/100.";
    }
  } 
  // 3. Hop 2 (Transitive Trust): Hard ceiling of 50/100, cannot exceed Active Contributor
  else if (resolvedWot.distance === 2) {
    if (finalScore > 50) {
      finalScore = 50;
      isGatekeeperCapped = true;
      gatekeeperReason = "Sybil Gatekeeper: Hop 2 transitive trust cannot exceed Active Contributor. Hard-capped at 50/100.";
    }
  }

  // Tier and Sybil Resistance classification
  let tier: TrustScoreResult["tier"] = "Unverified / Potential Bot";
  let tierColor = "text-rose-400";
  let tierBg = "bg-rose-950/40";
  let tierBorder = "border-rose-800/80";
  let sybilResistanceLevel: TrustScoreResult["sybilResistanceLevel"] = "Vulnerable";
  let summary = isGatekeeperCapped
    ? gatekeeperReason
    : "Caution: Unverified identity keys. Exercise caution before conducting high-value Zaps.";

  if (hasZeroGraph && hasZeroEconomicStake) {
    tier = "Unverified / Potential Bot";
    tierColor = "text-rose-400";
    tierBg = "bg-rose-950/40";
    tierBorder = "border-rose-800/80";
    sybilResistanceLevel = "Vulnerable";
    if (!isGatekeeperCapped) {
      summary = "High Sybil Risk: Isolated keypair with zero Web-of-Trust graph connectivity and zero economic stake.";
    }
  } else if (resolvedWot.distance >= 3) {
    tier = "Unverified / Potential Bot";
    tierColor = "text-rose-400";
    tierBg = "bg-rose-950/40";
    tierBorder = "border-rose-800/80";
    sybilResistanceLevel = "Low";
    if (!isGatekeeperCapped) {
      summary = "Isolated keypair outside trust graph with partial economic stake. Low composite score.";
    }
  } else if (resolvedWot.distance === 2) {
    // Hop 2: Cannot exceed "Active Contributor" (if finalScore >= 50, otherwise Unverified)
    if (finalScore >= 50) {
      tier = "Active Contributor";
      tierColor = "text-amber-400";
      tierBg = "bg-amber-950/40";
      tierBorder = "border-amber-700/80";
      sybilResistanceLevel = "Medium";
      if (!isGatekeeperCapped) {
        summary = "Moderate Sybil Resistance: Transitive trust established via Ring-1 nodes (Hop 2).";
      }
    } else {
      tier = "Unverified / Potential Bot";
      tierColor = "text-rose-400";
      tierBg = "bg-rose-950/40";
      tierBorder = "border-rose-800/80";
      sybilResistanceLevel = "Low";
      if (!isGatekeeperCapped) {
        summary = "Nascent keypair with partial transitive trust (Hop 2). Low composite score.";
      }
    }
  } else {
    // Only accounts with distance <= 1 (Hop 0 or Hop 1) are eligible for "Verified Builder" (>= 80 points)
    if (resolvedWot.distance === 0) {
      tier = "Verified Builder";
      tierColor = "text-emerald-400";
      tierBg = "bg-emerald-950/40";
      tierBorder = "border-emerald-700/80";
      sybilResistanceLevel = "High";
      summary = `Root Seed Anchor: Direct cryptographic pillar in the Nostr Core Web-of-Trust (${resolvedWot.tier || "Core Protocol"}).`;
    } else if (finalScore >= 80) {
      tier = "Verified Builder";
      tierColor = "text-emerald-400";
      tierBg = "bg-emerald-950/40";
      tierBorder = "border-emerald-700/80";
      sybilResistanceLevel = "High";
      summary = "High Sybil Resistance: Cryptographically verified identity with direct Ring-1 Web-of-Trust endorsement.";
    } else if (finalScore >= 50) {
      tier = "Active Contributor";
      tierColor = "text-amber-400";
      tierBg = "bg-amber-950/40";
      tierBorder = "border-amber-700/80";
      sybilResistanceLevel = "Medium";
      summary = "Moderate Sybil Resistance: Direct Ring-1 follower with partial cryptographic verification.";
    } else {
      tier = "Unverified / Potential Bot";
      tierColor = "text-rose-400";
      tierBg = "bg-rose-950/40";
      tierBorder = "border-rose-800/80";
      sybilResistanceLevel = finalScore >= 35 ? "Low" : "Vulnerable";
      if (!isGatekeeperCapped) {
        summary = "Caution: Low composite score despite Ring-1 connection.";
      }
    }
  }

  return {
    score: finalScore,
    tier,
    tierColor,
    tierBg,
    tierBorder,
    summary,
    nip05Status: resolvedNip05,
    wotScore: graphPoints,
    wotDistance: resolvedWot.distance,
    wotDetails: resolvedWot,
    economicStake: economicStakeResult,
    sybilResistanceLevel,
    breakdown,
  };
}

/**
 * Asynchronously calculates the Trust Score with multi-hop graph resolution and Economic Stake zaps.
 * Resolves Hop 0 and Hop 1 via in-memory snapshot, and queries relays in parallel for:
 * - Hop 2 transitive trust
 * - Kind 9735 Zap receipts for Sats-Weighted In-Degree (Economic Stake)
 * (enforcing <= 3000ms timeout via Promise.race).
 *
 * @param profile - Nostr profile
 * @param nip05Result - Optional pre-verified NIP-05 result
 * @param options - Relay query options and kFactor
 */
export async function calculateTrustScoreAsync(
  profile: NostrProfile | null,
  nip05Result?: Nip05Result,
  options?: { relays?: string[]; timeoutMs?: number; kFactor?: number }
): Promise<TrustScoreResult> {
  if (!profile || !profile.pubkey) {
    return calculateTrustScore(profile, nip05Result);
  }

  // Query multi-hop WoT and Economic Stake in parallel with 3s timeout
  const [wotResult, economicStakeResult] = await Promise.all([
    resolveWebOfTrustDistance(profile.pubkey, options),
    fetchEconomicStake(profile.pubkey, options),
  ]);

  return calculateTrustScore(profile, nip05Result, wotResult, economicStakeResult);
}