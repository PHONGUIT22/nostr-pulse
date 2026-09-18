#!/usr/bin/env node
import {
  getWebOfTrustDistance
} from "./chunk-RI52V5BR.js";

// src/lib/economic-stake.ts
import { SimplePool } from "nostr-tools/pool";

// src/lib/trust-score.ts
function calculateTrustScore(profile, nip05Result, wotResult, economicStakeResult) {
  const resolvedNip05 = nip05Result || {
    isVerified: Boolean(profile?.nip05 && profile.nip05.includes("@")),
    nip05: profile?.nip05 || "",
    domain: profile?.nip05?.split("@")[1] || ""
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
      breakdown: []
    };
  }
  let rawScore = 0;
  const breakdown = [];
  const resolvedWot = wotResult || getWebOfTrustDistance(profile.pubkey || "");
  let graphPoints = 0;
  let graphDesc = "";
  if (resolvedWot.distance === 0) {
    graphPoints = 45;
    graphDesc = `Hop 0: Core Root Anchor in Nostr Web-of-Trust (${resolvedWot.tier || "Core Protocol"}) \u2022 45/45 pts`;
  } else if (resolvedWot.distance === 1) {
    const scoreHop1 = Math.min(40, resolvedWot.rawScore);
    graphPoints = Math.round(scoreHop1 / 40 * 45);
    const endorsers = resolvedWot.endorsers || [];
    const sample = endorsers.slice(0, 3).join(", ");
    const extra = endorsers.length > 3 ? ` +${endorsers.length - 3} more` : "";
    graphDesc = `Hop 1: Endorsed by ${resolvedWot.endorsedByCount} Anchors${sample ? ` (${sample}${extra})` : ""} \u2022 ${graphPoints}/45 pts`;
  } else if (resolvedWot.distance === 2) {
    const scoreHop2 = Math.min(25, (resolvedWot.endorsedByCount || 1) * 5);
    graphPoints = scoreHop2;
    graphDesc = `Hop 2: Transitive Trust via ${resolvedWot.endorsedByCount} Ring-1 node${resolvedWot.endorsedByCount > 1 ? "s" : ""} \u2022 ${graphPoints}/45 pts`;
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
    description: graphDesc
  });
  const hasLud16 = Boolean(profile.lud16 && profile.lud16.includes("@"));
  let economicPoints = 0;
  let economicDesc = "";
  if (economicStakeResult) {
    const baseEndpoint = hasLud16 ? 5 : 0;
    const validSats = economicStakeResult.totalValidSats;
    const satsScore = Math.min(25, Math.round(Math.log10(validSats + 1) * 5));
    economicPoints = Math.min(30, baseEndpoint + satsScore);
    const validCount = economicStakeResult.validZapsCount;
    const filteredCount = economicStakeResult.filteredSybilZapsCount;
    const filteredSats = economicStakeResult.totalFilteredSats;
    if (hasLud16) {
      economicDesc = `Active Lightning Address (${profile.lud16})`;
      if (validSats > 0) {
        economicDesc += ` \u2022 ${validSats.toLocaleString()} Sats from ${validCount} WoT sender${validCount > 1 ? "s" : ""} (+${satsScore} pts)`;
      } else {
        economicDesc += " \u2022 No verified WoT incoming zaps yet (5/30 pts)";
      }
      if (filteredCount > 0) {
        economicDesc += ` (${filteredCount} Sybil zap${filteredCount > 1 ? "s" : ""} / ${filteredSats.toLocaleString()} Sats filtered)`;
      }
    } else {
      economicDesc = "No Lightning payment address configured (0/30 pts)";
    }
  } else {
    economicPoints = hasLud16 ? 20 : 0;
    economicDesc = hasLud16 ? `Active Lightning Payment Address (${profile.lud16}) configured for Zaps` : "No Lightning payment address linked (0/30 pts)";
  }
  rawScore += economicPoints;
  breakdown.push({
    label: "Economic Proof-of-Trust (Zaps)",
    category: "Economic Stake",
    points: economicPoints,
    maxPoints: 30,
    passed: economicPoints >= 15,
    sybilRiskLevel: economicPoints >= 15 ? "Low" : hasLud16 ? "Moderate" : "High",
    description: economicDesc
  });
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
    description: isNip05Verified ? `Cryptographically signed by https://${resolvedNip05.domain}/.well-known/nostr.json (${nip05Points}/15 pts)` : profile.nip05 ? `Verification Failed: ${resolvedNip05.error || "Pubkey mismatch with DNS record"}` : "No NIP-05 identifier configured (Secondary signal: 0/15 pts)"
  });
  const now = Math.floor(Date.now() / 1e3);
  const accountAgeSeconds = profile.created_at ? now - profile.created_at : 0;
  const isOlderThan1Year = accountAgeSeconds >= 86400 * 365;
  const isOlderThan6Months = accountAgeSeconds >= 86400 * 180;
  let agePoints = 0;
  if (isOlderThan1Year) agePoints = 6;
  else if (isOlderThan6Months) agePoints = 4;
  else if (profile.created_at) agePoints = 2;
  const relayCount = profile.relays_connected || 6;
  const relayPoints = relayCount >= 4 ? 4 : relayCount >= 2 ? 2 : 0;
  const longevityPoints = agePoints + relayPoints;
  rawScore += longevityPoints;
  const ageMonths = Math.max(1, Math.round(accountAgeSeconds / (86400 * 30)));
  breakdown.push({
    label: "Account Longevity & Relay Distribution",
    category: "Network Longevity",
    points: longevityPoints,
    maxPoints: 10,
    passed: longevityPoints >= 6,
    sybilRiskLevel: isOlderThan6Months ? "Low" : "Moderate",
    description: isOlderThan6Months ? `Established keypair (${ageMonths} months active) replicated across ${relayCount} relays (${longevityPoints}/10 pts)` : `Active keypair observed on ${relayCount} relays (${longevityPoints}/10 pts)`
  });
  let finalScore = rawScore;
  let isGatekeeperCapped = false;
  let gatekeeperReason = "";
  const hasZeroGraph = graphPoints === 0;
  const hasZeroEconomicStake = !economicStakeResult || economicStakeResult.totalValidSats === 0;
  if (hasZeroGraph && hasZeroEconomicStake) {
    if (finalScore > 25) {
      finalScore = 25;
      isGatekeeperCapped = true;
      gatekeeperReason = "Sybil Gatekeeper: Isolated keypair with zero Graph Connectivity and zero Economic Stake from WoT. Hard-capped at 25/100.";
    }
  } else if (resolvedWot.distance >= 3) {
    if (finalScore > 35) {
      finalScore = 35;
      isGatekeeperCapped = true;
      gatekeeperReason = "Sybil Gatekeeper: Keypair outside trust graph (Hop > 2). Hard-capped at 35/100.";
    }
  } else if (resolvedWot.distance === 2) {
    if (finalScore > 50) {
      finalScore = 50;
      isGatekeeperCapped = true;
      gatekeeperReason = "Sybil Gatekeeper: Hop 2 transitive trust cannot exceed Active Contributor. Hard-capped at 50/100.";
    }
  }
  let tier = "Unverified / Potential Bot";
  let tierColor = "text-rose-400";
  let tierBg = "bg-rose-950/40";
  let tierBorder = "border-rose-800/80";
  let sybilResistanceLevel = "Vulnerable";
  let summary = isGatekeeperCapped ? gatekeeperReason : "Caution: Unverified identity keys. Exercise caution before conducting high-value Zaps.";
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
    breakdown
  };
}

export {
  calculateTrustScore
};
