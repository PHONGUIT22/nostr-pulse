// src/lib/trust-score.ts
import { NostrProfile } from "@/lib/nostr";
import { Nip05Result } from "@/lib/nip05";

export interface ExtraSignals {
  relayCount?: number;
  hasNip65RelayList?: boolean;
  hasRecentNotes?: boolean;
  accountCreatedAt?: number;
}

export interface TrustScoreBreakdownItem {
  label: string;
  category:
    | "NIP-05 Identity"
    | "Core Network Proximity & Graph Signal"
    | "Lightning V4V"
    | "Account Longevity"
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
  networkProximityScore: number;
  sybilResistanceLevel: "High" | "Medium" | "Low" | "Vulnerable";
  breakdown: TrustScoreBreakdownItem[];
}

// Trusted core seed keys in Nostr network used for Core Network Proximity scoring
const REPUTABLE_SEED_PUBKEYS = new Set([
  "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2", // Jack (jack)
  "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", // fiatjaf
  "91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832", // UNCLE ROCKSTAR
  "00000000827ffaa94bfea288c3dfce4422c794fbb96625b6b31e9049f729d700", // Cameri
  "04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9", // ODELL
  "6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93", // Gigi
  "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", // jb55 (Damus)
  "3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24", // Derek Ross
]);

// Established Nostr identity providers (NIP-05 hosting)
const ESTABLISHED_NIP05_PROVIDERS = [
  "primal.net",
  "nostrplebs.com",
  "getalby.com",
  "nostr.com",
  "snort.social",
  "nostrich.love",
];

// Free / disposable NIP-05 gateways
const FREE_NIP05_GATEWAYS = [
  "nostrcheck.me",
  "iris.to",
  "nostr.band",
  "nostr.wine",
];

export function calculateTrustScore(
  profile: NostrProfile | null,
  nip05Result?: Nip05Result,
  extraSignals?: ExtraSignals
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
      networkProximityScore: 0,
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

  if (isNip05Verified && resolvedNip05.domain) {
    const domain = resolvedNip05.domain.toLowerCase();
    if (FREE_NIP05_GATEWAYS.includes(domain)) {
      nip05Points = 12;
    } else if (ESTABLISHED_NIP05_PROVIDERS.includes(domain)) {
      nip05Points = 20;
    } else {
      // Custom domain (highest authority)
      nip05Points = 25;
    }
  }

  rawScore += nip05Points;
  breakdown.push({
    label: "NIP-05 Cryptographic DNS Verification",
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
  // Pillar 2: Core Network Proximity & Relays Sync (Max: 25 pts)
  // =========================================================================
  let networkProximityPoints = 0;
  const isSeedKey = profile.pubkey && REPUTABLE_SEED_PUBKEYS.has(profile.pubkey.toLowerCase());

  if (isSeedKey) {
    networkProximityPoints = 25;
  } else {
    // Relay diversity: +3 pts per relay, up to 15 pts
    const relayCount = extraSignals?.relayCount ?? profile.relays_connected ?? 0;
    const relayDiversityPoints = Math.min(15, relayCount * 3);

    // NIP-65 Relay List presence: +10 pts
    const nip65Points = extraSignals?.hasNip65RelayList ? 10 : 0;

    networkProximityPoints = Math.min(25, relayDiversityPoints + nip65Points);
  }

  rawScore += networkProximityPoints;
  breakdown.push({
    label: "Core Network Proximity & Relay Sync",
    category: "Core Network Proximity & Graph Signal",
    points: networkProximityPoints,
    maxPoints: 25,
    passed: networkProximityPoints >= 12,
    sybilRiskLevel: networkProximityPoints >= 12 ? "Low" : "Moderate",
    description: isSeedKey
      ? "Direct Seed Node in the Nostr Core Network"
      : networkProximityPoints >= 12
      ? "Established relay diversity with multi-hop network presence"
      : "Limited relay presence (Low network graph connectivity)",
  });

  // =========================================================================
  // Pillar 3: Lightning Value-4-Value & eCash Readiness (Max: 20 pts)
  // =========================================================================
  const hasLud16 = Boolean(profile.lud16 && profile.lud16.includes("@"));
  const hasLnurlEndpoint = Boolean(profile.lud16 || profile.lud06);
  const lud16Points = hasLud16 ? 15 : 0;
  const lnurlReadinessPoints = Boolean(profile.lud06) ? 5 : 0;
  const lightningPoints = lud16Points + lnurlReadinessPoints;

  rawScore += lightningPoints;
  breakdown.push({
    label: "Lightning Value-4-Value & eCash Readiness",
    category: "Lightning V4V",
    points: lightningPoints,
    maxPoints: 20,
    passed: hasLud16,
    sybilRiskLevel: hasLud16 ? "Low" : "Moderate",
    description: hasLud16
      ? `Active Lightning Address (${profile.lud16}) with LNURL-pay endpoint configured`
      : hasLnurlEndpoint
      ? "LNURL-pay endpoint detected but no standard Lightning Address (lud16)"
      : "No Lightning address linked (Cannot send or receive value)",
  });

  // =========================================================================
  // Pillar 4: Account Longevity & Broadcast Activity (Max: 15 pts)
  // =========================================================================
  const now = Math.floor(Date.now() / 1000);
  const effectiveCreatedAt = extraSignals?.accountCreatedAt || profile.created_at;
  const accountAgeSeconds = effectiveCreatedAt ? now - effectiveCreatedAt : 0;
  const isOlderThan1Year = accountAgeSeconds >= 86400 * 365;
  const isOlderThan6Months = accountAgeSeconds >= 86400 * 180;
  const isOlderThan1Month = accountAgeSeconds >= 86400 * 30;

  let agePoints = 0;
  if (isOlderThan1Year) agePoints = 8;
  else if (isOlderThan6Months) agePoints = 5;
  else if (isOlderThan1Month) agePoints = 2;

  const broadcastPoints = extraSignals?.hasRecentNotes ? 7 : 0;
  // Seed keys are known long-established builders — award full longevity
  const longevityPoints = isSeedKey ? 15 : Math.min(15, agePoints + broadcastPoints);
  rawScore += longevityPoints;

  const ageMonths = Math.max(1, Math.round(accountAgeSeconds / (86400 * 30)));
  breakdown.push({
    label: "Account Longevity & Broadcast Activity",
    category: "Account Longevity",
    points: longevityPoints,
    maxPoints: 15,
    passed: longevityPoints >= 8,
    sybilRiskLevel: isOlderThan6Months ? "Low" : "Moderate",
    description: isOlderThan6Months
      ? `Established keypair (${ageMonths} months active)${
          extraSignals?.hasRecentNotes ? " with recent broadcast activity" : ""
        }`
      : `Newly active keypair (${ageMonths} month${ageMonths !== 1 ? "s" : ""})${
          extraSignals?.hasRecentNotes ? " — recent notes detected" : " — no recent broadcasts"
        }`,
  });

  // =========================================================================
  // Pillar 5: Identity Completeness & Profile Entropy (Max: 15 pts)
  // =========================================================================
  let metaPoints = 0;
  if (profile.picture && profile.picture.startsWith("http")) metaPoints += 5;
  if (profile.about && profile.about.trim().length >= 10) {
    metaPoints += profile.website && profile.website.startsWith("https") ? 5 : 3;
  }
  if (profile.website && profile.website.startsWith("https")) metaPoints += 5;

  // Anti-Spam Penalty: deduct 10 pts for hex-pattern handles
  const profileName = profile.name || "";
  const isHexHandle = /^(npub1|[0-9a-f]{8,})/i.test(profileName);
  if (isHexHandle) {
    metaPoints = Math.max(0, metaPoints - 10);
  }

  rawScore += metaPoints;
  breakdown.push({
    label: "Identity Completeness & Profile Entropy",
    category: "Profile Quality",
    points: metaPoints,
    maxPoints: 15,
    passed: metaPoints >= 10,
    sybilRiskLevel: metaPoints >= 10 ? "Low" : "High",
    description: isHexHandle
      ? "Anti-Spam Penalty: Handle matches hex/npub pattern (−10 pts)"
      : metaPoints >= 10
      ? "Fully populated metadata (Avatar, Bio, and external domain link)"
      : "Incomplete metadata profile (Missing avatar, bio, or external links)",
  });

  // =========================================================================
  // ANTI-SYBIL GUARD (Damping Factor)
  // =========================================================================
  // Cap score at 42 if lacking both NIP-05 verification and Core Network Proximity.
  // Prevents spammers from gaming metadata scores.
  let finalScore = rawScore;
  let isSybilDamped = false;

  if (!isNip05Verified && networkProximityPoints < 10) {
    if (finalScore > 42) {
      finalScore = 42;
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
    ? "Sybil Risk Alert: Unverified DNS identity with isolated network graph. Capped at 42."
    : "Caution: Unverified identity keys. Exercise caution before conducting high-value Zaps.";

  if (finalScore >= 80) {
    tier = "Verified Builder";
    tierColor = "text-emerald-400";
    tierBg = "bg-emerald-950/40";
    tierBorder = "border-emerald-700/80";
    sybilResistanceLevel = "High";
    summary = "High Sybil Resistance: Cryptographically verified NIP-05 identity with strong network proximity.";
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
    networkProximityScore: networkProximityPoints,
    sybilResistanceLevel,
    breakdown,
  };
}