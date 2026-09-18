#!/usr/bin/env node
import {
  calculateTrustScore
} from "./chunk-TEBCT7SR.js";
import {
  getWebOfTrustDistance,
  normalizePubkey
} from "./chunk-RI52V5BR.js";
import {
  getCreatorFromDb,
  getRolling24hApprovedSpend,
  initDatabase,
  insertAgentSpendingLog
} from "./chunk-UEOH474S.js";

// src/lib/guardrails.ts
function getSpendingPolicy() {
  const parseEnvInt = (key, fallback) => {
    const val = process.env[key]?.trim();
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  };
  return {
    maxSatsPerTx: parseEnvInt("AGENT_MAX_SATS_PER_TX", 50),
    dailyLimitSats: parseEnvInt("AGENT_DAILY_LIMIT_SATS", 500),
    minTrustScoreTarget: parseEnvInt("AGENT_MIN_RECIPIENT_SCORE", 40)
  };
}
var activePolicy = getSpendingPolicy();
function updateSpendingPolicy(newPolicy) {
  activePolicy = {
    ...activePolicy,
    ...newPolicy
  };
  return activePolicy;
}
async function getRolling24hSpend() {
  const oneDayAgoSec = Math.floor(Date.now() / 1e3) - 86400;
  return getRolling24hApprovedSpend(oneDayAgoSec);
}
async function resolveRecipientTrustScore(recipientHex) {
  try {
    const creator = await getCreatorFromDb(recipientHex);
    if (creator && typeof creator.score === "number" && creator.score > 0) {
      return creator.score;
    }
  } catch {
  }
  const wot = getWebOfTrustDistance(recipientHex);
  const calculated = calculateTrustScore(
    { pubkey: recipientHex, npub: "", name: "" },
    void 0,
    wot
  );
  return calculated.score;
}
async function assertSpendingAllowed({
  amountSats,
  recipientPubkey,
  rail
}) {
  await initDatabase();
  const policy = activePolicy;
  const timestamp = Math.floor(Date.now() / 1e3);
  const logId = `spl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanRecipient = recipientPubkey ? normalizePubkey(recipientPubkey) || recipientPubkey : "";
  if (!amountSats || amountSats <= 0) {
    const reason = `Payment amount must be greater than 0 satoshis (received: ${amountSats}).`;
    await insertAgentSpendingLog({
      id: logId,
      timestamp,
      amount_sats: amountSats || 0,
      recipient: cleanRecipient || null,
      rail,
      status: "rejected",
      reason
    });
    return { allowed: false, reason };
  }
  if (amountSats > policy.maxSatsPerTx) {
    const reason = `Single transaction amount (${amountSats.toLocaleString()} sats) exceeds policy limit (${policy.maxSatsPerTx.toLocaleString()} sats).`;
    await insertAgentSpendingLog({
      id: logId,
      timestamp,
      amount_sats: amountSats,
      recipient: cleanRecipient || null,
      rail,
      status: "rejected",
      reason
    });
    return { allowed: false, reason };
  }
  const current24hSpend = await getRolling24hSpend();
  if (current24hSpend + amountSats > policy.dailyLimitSats) {
    const remaining = Math.max(0, policy.dailyLimitSats - current24hSpend);
    const reason = `24h rolling spending limit exceeded: ${current24hSpend.toLocaleString()} + ${amountSats.toLocaleString()} > ${policy.dailyLimitSats.toLocaleString()} sats (Remaining allowance: ${remaining.toLocaleString()} sats).`;
    await insertAgentSpendingLog({
      id: logId,
      timestamp,
      amount_sats: amountSats,
      recipient: cleanRecipient || null,
      rail,
      status: "rejected",
      reason
    });
    return { allowed: false, reason };
  }
  if (policy.minTrustScoreTarget > 0 && cleanRecipient) {
    const recipientScore = await resolveRecipientTrustScore(cleanRecipient);
    if (recipientScore < policy.minTrustScoreTarget) {
      const reason = `Recipient trust score (${recipientScore}/100) is below required policy threshold (${policy.minTrustScoreTarget}/100). Auto-rejected by Anti-Sybil Radar.`;
      await insertAgentSpendingLog({
        id: logId,
        timestamp,
        amount_sats: amountSats,
        recipient: cleanRecipient || null,
        rail,
        status: "rejected",
        reason
      });
      return { allowed: false, reason };
    }
  }
  await insertAgentSpendingLog({
    id: logId,
    timestamp,
    amount_sats: amountSats,
    recipient: cleanRecipient || null,
    rail,
    status: "approved",
    reason: "Passed all spending policy guardrails."
  });
  return { allowed: true };
}

export {
  getSpendingPolicy,
  updateSpendingPolicy,
  getRolling24hSpend,
  resolveRecipientTrustScore,
  assertSpendingAllowed
};
