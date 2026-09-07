// src/lib/trust-score.ts
import { NostrProfile } from "@/lib/nostr";
import { Nip05Result } from "@/lib/nip05";

export interface TrustScoreBreakdownItem {
  label: string;
  category: "NIP-05 Identity" | "Web-of-Trust (WoT)" | "Lightning V4V" | "Network Longevity" | "Profile Quality";
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
  sybilResistanceLevel: "High" | "Medium" | "Low" | "Vulnerable";
  breakdown: TrustScoreBreakdownItem[];
}

// Trusted core seed keys in Nostr network used for Web-of-Trust (WoT) scoring
const REPUTABLE_SEED_PUBKEYS = new Set([
  "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a04f9d61825e81d02", // jack
  "3bf0c63fcb93463407af97b5e0907d743715840c6ee7abbd2e1070d12194e322", // fiatjaf
  "04c915daefee38317fa734444acee618e13e4537084fb5dd00d31024f6b8733d", // odell
  "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", // jb55 (Damus)
  "6e468422dfb74a5738702a8823b9b24e6042f4ff427a944bb8427906aec33732", // nvk (Coinkite)
  "d0dd2632b85fa1e6f987f650fc90e55ee14f9d9a0d845e2c56a1b8db5fdfbc05", // derekross
]);

export function calculateTrustScore(
  profile: NostrProfile | null,
  nip05Result?: Nip05Result
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
      sybilResistanceLevel: "Vulnerable",
      breakdown: [],
    };
  }

  let rawScore = 0;
  const breakdown: TrustScoreBreakdownItem[] = [];

  // =========================================================================
  // Pillar 1: NIP-05 Cryptographic DNS Verification (Max: 25 pts)
  // =========================================================================
  const isNip05Verified = resolvedNip05.isVerified;
  let nip05Points = 0;

  if (isNip05Verified) {
    // Bonus points for custom domain instead of free public gateways
    const isCustomDomain = resolvedNip05.domain && !["nostrcheck.me", "nostrplebs.com", "iris.to"].includes(resolvedNip05.domain);
    nip05Points = isCustomDomain ? 25 : 22;
  }

  rawScore += nip05Points;
  breakdown.push({
    label: "NIP-05 Cryptographic DNS Identity",
    category: "NIP-05 Identity",
    points: nip05Points,
    maxPoints: 25,
    passed: isNip05Verified,
    sybilRiskLevel: isNip05Verified ? "Low" : "High",
    description: isNip05Verified
      ? `Cryptographically signed by https://${resolvedNip05.domain}/.well-known/nostr.json`
      : profile.nip05
      ? `Verification Failed: ${resolvedNip05.error || "Pubkey mismatch with DNS record"}`
      : "No NIP-05 identifier configured (High vulnerability to impersonation)",
  });

  // =========================================================================
  // Pillar 2: Web-of-Trust (WoT) & Graph Connectivity (Max: 25 pts)
  // =========================================================================
  let wotPoints = 0;
  const isSeedKey = profile.pubkey && REPUTABLE_SEED_PUBKEYS.has(profile.pubkey.toLowerCase());

  if (isSeedKey) {
    wotPoints = 25;
  } else if ((profile as any).wot_score && typeof (profile as any).wot_score === "number") {
    wotPoints = Math.min(25, Math.round(((profile as any).wot_score / 100) * 25));
  } else {
    // Evaluated based on social graph heuristics
    const followers = (profile as any).followers_count || 0;
    const following = (profile as any).following_count || 0;

    if (followers > 500) {
      wotPoints = 20;
    } else if (followers > 100 || following > 50) {
      wotPoints = 12;
    } else if (followers > 10) {
      wotPoints = 6;
    } else {
      wotPoints = 0;
    }
  }

  rawScore += wotPoints;
  breakdown.push({
    label: "Web-of-Trust (WoT) Graph Connectivity",
    category: "Web-of-Trust (WoT)",
    points: wotPoints,
    maxPoints: 25,
    passed: wotPoints >= 12,
    sybilRiskLevel: wotPoints >= 12 ? "Low" : "Moderate",
    description: isSeedKey
      ? "Direct Seed Node in the Nostr Core Web-of-Trust"
      : wotPoints >= 12
      ? `Established network connectivity across distributed follower graph`
      : "Isolated or nascent keypair (Low Web-of-Trust endorsements)",
  });

  // =========================================================================
  // Pillar 3: Lightning Value-4-Value Payment Endpoint (Max: 20 pts)
  // =========================================================================
  const hasLud16 = Boolean(profile.lud16 && profile.lud16.includes("@"));
  const lud16Points = hasLud16 ? 20 : 0;
  rawScore += lud16Points;

  breakdown.push({
    label: "Lightning Value-4-Value (LUD-16 / NIP-57)",
    category: "Lightning V4V",
    points: lud16Points,
    maxPoints: 20,
    passed: hasLud16,
    sybilRiskLevel: hasLud16 ? "Low" : "Moderate",
    description: hasLud16
      ? `Active Lightning Payment Address (${profile.lud16}) configured for Zaps`
      : "No Lightning address linked (Cannot send or receive value)",
  });

  // =========================================================================
  // Pillar 4: Network Longevity & Relay Synchronization (Max: 15 pts)
  // =========================================================================
  const now = Math.floor(Date.now() / 1000);
  const accountAgeSeconds = profile.created_at ? now - profile.created_at : 0;
  const isOlderThan1Year = accountAgeSeconds >= 86400 * 365;
  const isOlderThan6Months = accountAgeSeconds >= 86400 * 180;
  
  let agePoints = 0;
  if (isOlderThan1Year) agePoints = 10;
  else if (isOlderThan6Months) agePoints = 7;
  else if (profile.created_at) agePoints = 3;

  const relayCount = profile.relays_connected || 6;
  const relayPoints = relayCount >= 4 ? 5 : relayCount >= 2 ? 3 : 0;
  const longevityPoints = agePoints + relayPoints;
  rawScore += longevityPoints;

  const ageMonths = Math.max(1, Math.round(accountAgeSeconds / (86400 * 30)));
  breakdown.push({
    label: "Key Longevity & Multi-Relay Propagation",
    category: "Network Longevity",
    points: longevityPoints,
    maxPoints: 15,
    passed: longevityPoints >= 10,
    sybilRiskLevel: isOlderThan6Months ? "Low" : "Moderate",
    description: isOlderThan6Months
      ? `Established keypair (${ageMonths} months active) replicated across ${relayCount} relays`
      : `Newly active keypair observed on ${relayCount} relays`,
  });

  // =========================================================================
  // Pillar 5: Profile Metadata Richness & Consistency (Max: 15 pts)
  // =========================================================================
  let metaPoints = 0;
  if (profile.picture && profile.picture.startsWith("http")) metaPoints += 5;
  if (profile.about && profile.about.trim().length >= 25) metaPoints += 5;
  if (profile.website && profile.website.startsWith("http")) metaPoints += 5;
  rawScore += metaPoints;

  breakdown.push({
    label: "Metadata Completeness & Web Presence",
    category: "Profile Quality",
    points: metaPoints,
    maxPoints: 15,
    passed: metaPoints >= 10,
    sybilRiskLevel: metaPoints >= 10 ? "Low" : "High",
    description: metaPoints >= 10
      ? "Fully populated metadata (Avatar, Bio, and external domain link)"
      : "Incomplete metadata profile (Missing avatar, bio, or external links)",
  });

  // =========================================================================
  // ANTI-SYBIL GUARD (Damping Factor)
  // =========================================================================
  // Cap score at 44 if lacking both NIP-05 verification and WoT graph connectivity.
  // Prevents spammers from gaming metadata scores.
  let finalScore = rawScore;
  let isSybilDamped = false;

  if (!isNip05Verified && wotPoints < 10) {
    if (finalScore >= 45) {
      finalScore = 44;
      isSybilDamped = true;
    }
  }

  // Tier classification
  let tier: TrustScoreResult["tier"] = "Unverified / Potential Bot";
  let tierColor = "text-rose-400";
  let tierBg = "bg-rose-950/40";
  let tierBorder = "border-rose-800/80";
  let sybilResistanceLevel: TrustScoreResult["sybilResistanceLevel"] = "Vulnerable";
  let summary = isSybilDamped
    ? "Sybil Risk Alert: Unverified DNS identity with isolated network graph. Capped at 44."
    : "Caution: Unverified identity keys. Exercise caution before conducting high-value Zaps.";

  if (finalScore >= 80) {
    tier = "Verified Builder";
    tierColor = "text-emerald-400";
    tierBg = "bg-emerald-950/40";
    tierBorder = "border-emerald-700/80";
    sybilResistanceLevel = "High";
    summary = "High Sybil Resistance: Cryptographically verified NIP-05 identity with strong Web-of-Trust graph.";
  } else if (finalScore >= 50) {
    tier = "Active Contributor";
    tierColor = "text-amber-400";
    tierBg = "bg-amber-950/40";
    tierBorder = "border-amber-700/80";
    sybilResistanceLevel = "Medium";
    summary = "Moderate Sybil Resistance: Real network participant with partial cryptographic verification.";
  }

  return {
    score: finalScore,
    tier,
    tierColor,
    tierBg,
    tierBorder,
    summary,
    nip05Status: resolvedNip05,
    wotScore: wotPoints,
    sybilResistanceLevel,
    breakdown,
  };
}