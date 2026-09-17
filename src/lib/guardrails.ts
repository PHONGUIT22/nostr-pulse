// src/lib/guardrails.ts
/**
 * Spending Guardrails & Budget Policy
 *
 * Prevents autonomous AI agents from draining balances through infinite loops,
 * malicious prompt injections, or unauthorized high-value transactions.
 */

import {
  initDatabase,
  insertAgentSpendingLog,
  getRolling24hApprovedSpend,
  getCreatorFromDb,
} from "@/lib/db";
import { normalizePubkey, getWebOfTrustDistance } from "@/lib/wot";
import { calculateTrustScore } from "@/lib/trust-score";

export interface SpendingPolicy {
  /** Max sats allowed in a single call (Default: 50 sats) */
  maxSatsPerTx: number;
  /** Max sats spendable within rolling 24 hours (Default: 500 sats) */
  dailyLimitSats: number;
  /** Auto-reject payments if recipient Trust Score < threshold (Default: 40) */
  minTrustScoreTarget: number;
}

export interface SpendingValidationParams {
  amountSats: number;
  recipientPubkey?: string;
  rail: "nutzap" | "nwc";
}

export interface SpendingValidationResult {
  allowed: boolean;
  reason?: string;
  current24hSpend?: number;
  policy?: SpendingPolicy;
}

/**
 * Loads the active spending policy from environment variables with safe defaults.
 */
export function getSpendingPolicy(): SpendingPolicy {
  const parseEnvInt = (key: string, fallback: number): number => {
    const val = process.env[key]?.trim();
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  };

  return {
    maxSatsPerTx: parseEnvInt("AGENT_MAX_SATS_PER_TX", 50),
    dailyLimitSats: parseEnvInt("AGENT_DAILY_LIMIT_SATS", 500),
    minTrustScoreTarget: parseEnvInt("AGENT_MIN_RECIPIENT_SCORE", 40),
  };
}

let activePolicy: SpendingPolicy = getSpendingPolicy();

/**
 * Overrides or updates the spending policy at runtime (useful for testing or dynamic policies).
 */
export function updateSpendingPolicy(newPolicy: Partial<SpendingPolicy>): SpendingPolicy {
  activePolicy = {
    ...activePolicy,
    ...newPolicy,
  };
  return activePolicy;
}

/**
 * Computes the total approved satoshis spent within the rolling 24-hour window.
 */
export async function getRolling24hSpend(): Promise<number> {
  const oneDayAgoSec = Math.floor(Date.now() / 1000) - 86400;
  return getRolling24hApprovedSpend(oneDayAgoSec);
}

/**
 * Evaluates the Trust Score of a recipient public key using database or WoT calculation.
 */
export async function resolveRecipientTrustScore(recipientHex: string): Promise<number> {
  try {
    // 1. Check local creator cache in SQLite
    const creator = await getCreatorFromDb(recipientHex);
    if (creator && typeof creator.score === "number" && creator.score > 0) {
      return creator.score;
    }
  } catch {}

  // 2. Compute using Web-of-Trust graph distance
  const wot = getWebOfTrustDistance(recipientHex);
  const calculated = calculateTrustScore(
    { pubkey: recipientHex, npub: "", name: "" },
    undefined,
    wot
  );

  return calculated.score;
}

/**
 * Validates whether an intended payment complies with spending guardrails:
 * 1. Validates amountSats <= policy.maxSatsPerTx.
 * 2. Computes current 24h rolling spend from agent_spending_log + amountSats <= policy.dailyLimitSats.
 * 3. Evaluates recipient trust score >= minTrustScoreTarget.
 * 4. Logs the decision directly into SQLite table agent_spending_log.
 *
 * @param params.amountSats - Intended payment amount in satoshis
 * @param params.recipientPubkey - Recipient Nostr public key (hex or npub)
 * @param params.rail - Payment rail ("nutzap" | "nwc")
 * @returns Promise<{ allowed: boolean; reason?: string }>
 */
export async function assertSpendingAllowed({
  amountSats,
  recipientPubkey,
  rail,
}: SpendingValidationParams): Promise<{ allowed: boolean; reason?: string }> {
  await initDatabase();
  const policy = activePolicy;
  const timestamp = Math.floor(Date.now() / 1000);
  const logId = `spl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanRecipient = recipientPubkey
    ? (normalizePubkey(recipientPubkey) || recipientPubkey)
    : "";

  // Sanity check: Amount must be positive
  if (!amountSats || amountSats <= 0) {
    const reason = `Payment amount must be greater than 0 satoshis (received: ${amountSats}).`;
    await insertAgentSpendingLog({
      id: logId,
      timestamp,
      amount_sats: amountSats || 0,
      recipient: cleanRecipient || null,
      rail,
      status: "rejected",
      reason,
    });
    return { allowed: false, reason };
  }

  // 1. Single Transaction Cap Check
  if (amountSats > policy.maxSatsPerTx) {
    const reason = `Single transaction amount (${amountSats.toLocaleString()} sats) exceeds policy limit (${policy.maxSatsPerTx.toLocaleString()} sats).`;
    await insertAgentSpendingLog({
      id: logId,
      timestamp,
      amount_sats: amountSats,
      recipient: cleanRecipient || null,
      rail,
      status: "rejected",
      reason,
    });
    return { allowed: false, reason };
  }

  // 2. 24-Hour Rolling Budget Limit Check
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
      reason,
    });
    return { allowed: false, reason };
  }

  // 3. Recipient Trust Score Target Gate
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
        reason,
      });
      return { allowed: false, reason };
    }
  }

  // 4. All checks passed: Log approved decision in SQLite
  await insertAgentSpendingLog({
    id: logId,
    timestamp,
    amount_sats: amountSats,
    recipient: cleanRecipient || null,
    rail,
    status: "approved",
    reason: "Passed all spending policy guardrails.",
  });

  return { allowed: true };
}
