// src/lib/spending-guardrails.ts
/**
 * Agent Spending Guardrails & Budget Manager
 *
 * Enforces strict financial limits on autonomous AI agent payments (Cashu NutZaps and NWC):
 * 1. Single Transaction Cap (maxPerTxSats): Prevents catastrophic single overpayments.
 * 2. Daily Allowance Budget (dailyBudgetSats): Caps cumulative 24-hour spending.
 * 3. Trust Score Security Gate (optional minTrustScore): Disallows large payments to isolated/unverified accounts.
 */

import { insertSpendingRecord, getRecentSpendingRecords } from "@/lib/db";
import { getWebOfTrustDistance } from "@/lib/wot";

export interface SpendingGuardrailsConfig {
  /** Maximum satoshis allowed in a single payment transaction (default: 5000 sats) */
  maxPerTxSats: number;
  /** Maximum satoshis allowed in a rolling 24-hour window (default: 25000 sats) */
  dailyBudgetSats: number;
  /** Minimum recipient WoT Trust Score required for payments > 500 sats (default: 0 = disabled) */
  minRecipientTrustScore: number;
  /** Master switch to enable or disable spending guardrails (default: true) */
  enabled: boolean;
}

export interface SpendingCheckResult {
  allowed: boolean;
  reason?: string;
  amountSats: number;
  maxPerTxSats: number;
  dailyBudgetSats: number;
  currentDailySpentSats: number;
  remainingDailySats: number;
}

export interface SpendingRecord {
  id: string;
  amountSats: number;
  rail: "cashu" | "lightning_nwc";
  recipientPubkey?: string;
  eventId?: string;
  memo?: string;
  createdAt: number;
}

// In-memory fallback ring buffer for environments without active SQLite persistence
const inMemorySpendingRecords: SpendingRecord[] = [];
const MAX_RING_BUFFER_SIZE = 500;

/**
 * Loads spending guardrails configuration from environment variables or defaults
 */
export function getSpendingConfig(): SpendingGuardrailsConfig {
  const parseEnvInt = (key: string, fallback: number): number => {
    const val = process.env[key]?.trim();
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  };

  const isEnabled = process.env.AGENT_GUARDRAILS_ENABLED !== "false" && process.env.AGENT_GUARDRAILS_ENABLED !== "0";

  return {
    maxPerTxSats: parseEnvInt("AGENT_MAX_SATS_PER_TX", parseEnvInt("AGENT_MAX_TX_SATS", 5000)),
    dailyBudgetSats: parseEnvInt(
      "AGENT_DAILY_LIMIT_SATS",
      parseEnvInt("AGENT_DAILY_BUDGET_SATS", 25000)
    ),
    minRecipientTrustScore: parseEnvInt("AGENT_MIN_RECIPIENT_TRUST_SCORE", 0),
    enabled: isEnabled,
  };
}

let activeConfig: SpendingGuardrailsConfig = getSpendingConfig();

/**
 * Updates active spending guardrails configuration at runtime
 */
export function updateSpendingConfig(newConfig: Partial<SpendingGuardrailsConfig>): SpendingGuardrailsConfig {
  activeConfig = {
    ...activeConfig,
    ...newConfig,
  };
  return activeConfig;
}

/**
 * Calculates total satoshis spent in the last 24 hours
 */
export async function getDailySpentSats(): Promise<{ totalSats: number; count: number }> {
  const oneDayAgoSec = Math.floor(Date.now() / 1000) - 86400;

  try {
    const { getRolling24hApprovedSpend } = await import("./db");
    const rollingSpent = await getRolling24hApprovedSpend(oneDayAgoSec);
    if (rollingSpent > 0) {
      return { totalSats: rollingSpent, count: 1 };
    }
  } catch {}

  try {
    const dbRecords = await getRecentSpendingRecords(oneDayAgoSec);
    if (dbRecords && dbRecords.length > 0) {
      const totalSats = dbRecords.reduce((sum, r) => sum + r.amount_sats, 0);
      return { totalSats, count: dbRecords.length };
    }
  } catch {
    // Fallback to in-memory ring buffer
  }

  const oneDayAgoMs = Date.now() - 86400 * 1000;
  const validMemRecords = inMemorySpendingRecords.filter((r) => r.createdAt >= oneDayAgoMs);
  const totalSats = validMemRecords.reduce((sum, r) => sum + r.amountSats, 0);
  return { totalSats, count: validMemRecords.length };
}

/**
 * Validates whether an intended payment complies with spending limits and budget guardrails
 *
 * @param params.amountSats - Intended payment amount in satoshis
 * @param params.recipientPubkey - Optional recipient hex pubkey
 * @param params.rail - Payment method ('cashu' | 'lightning_nwc')
 * @param params.bypassGuardrail - Explicit override flag if authorized by developer
 */
export async function checkSpendingAllowed(params: {
  amountSats: number;
  recipientPubkey?: string;
  rail?: "cashu" | "lightning_nwc";
  bypassGuardrail?: boolean;
}): Promise<SpendingCheckResult> {
  const { amountSats, recipientPubkey, bypassGuardrail } = params;
  const config = activeConfig;

  const { totalSats: currentDailySpent } = await getDailySpentSats();
  const remainingDaily = Math.max(0, config.dailyBudgetSats - currentDailySpent);

  // Default allowed result if guardrails disabled or bypassed
  if (!config.enabled || bypassGuardrail) {
    return {
      allowed: true,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily,
    };
  }

  // 1. Sanity Check: Amount must be positive integer
  if (amountSats <= 0) {
    return {
      allowed: false,
      reason: `Invalid payment amount: ${amountSats} sats. Amount must be greater than 0.`,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily,
    };
  }

  // 2. Single Transaction Limit Check
  if (amountSats > config.maxPerTxSats) {
    return {
      allowed: false,
      reason: `Spending Guardrail Blocked: Payment of ${amountSats.toLocaleString()} sats exceeds the maximum single-transaction limit of ${config.maxPerTxSats.toLocaleString()} sats.`,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily,
    };
  }

  // 3. Daily Allowance Budget Check
  if (currentDailySpent + amountSats > config.dailyBudgetSats) {
    return {
      allowed: false,
      reason: `Spending Guardrail Blocked: Payment of ${amountSats.toLocaleString()} sats exceeds the 24-hour budget limit. Current 24h spent: ${currentDailySpent.toLocaleString()} sats, remaining allowance: ${remainingDaily.toLocaleString()} sats (Budget: ${config.dailyBudgetSats.toLocaleString()} sats).`,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily,
    };
  }

  // 4. Optional Recipient Trust Score Gate
  if (config.minRecipientTrustScore > 0 && recipientPubkey && amountSats > 500) {
    const wot = getWebOfTrustDistance(recipientPubkey);
    if (wot.normalizedScore < config.minRecipientTrustScore && wot.distance > 1) {
      return {
        allowed: false,
        reason: `Spending Guardrail Blocked: Recipient has low Web-of-Trust score (${wot.normalizedScore}/100, Sybil risk: ${wot.sybilRisk}). Minimum trust score of ${config.minRecipientTrustScore} required for payments exceeding 500 sats.`,
        amountSats,
        maxPerTxSats: config.maxPerTxSats,
        dailyBudgetSats: config.dailyBudgetSats,
        currentDailySpentSats: currentDailySpent,
        remainingDailySats: remainingDaily,
      };
    }
  }

  return {
    allowed: true,
    amountSats,
    maxPerTxSats: config.maxPerTxSats,
    dailyBudgetSats: config.dailyBudgetSats,
    currentDailySpentSats: currentDailySpent,
    remainingDailySats: remainingDaily - amountSats,
  };
}

/**
 * Records a settled payment into persistent storage and in-memory buffer
 */
export async function recordAgentSpending(record: {
  amountSats: number;
  rail: "cashu" | "lightning_nwc";
  recipientPubkey?: string;
  eventId?: string;
  memo?: string;
}): Promise<SpendingRecord> {
  const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nowSec = Math.floor(Date.now() / 1000);

  const spendingRecord: SpendingRecord = {
    id,
    amountSats: record.amountSats,
    rail: record.rail,
    recipientPubkey: record.recipientPubkey,
    eventId: record.eventId,
    memo: record.memo,
    createdAt: Date.now(),
  };

  // 1. Add to in-memory ring buffer
  inMemorySpendingRecords.unshift(spendingRecord);
  if (inMemorySpendingRecords.length > MAX_RING_BUFFER_SIZE) {
    inMemorySpendingRecords.pop();
  }

  // 2. Persist to SQLite
  try {
    await insertSpendingRecord({
      id,
      amount_sats: record.amountSats,
      rail: record.rail,
      recipient_pubkey: record.recipientPubkey || null,
      event_id: record.eventId || null,
      memo: record.memo || null,
      created_at: nowSec,
    });
  } catch (err) {
    console.debug("[SpendingGuardrails] Notice: SQLite persistence fallback to in-memory:", err);
  }

  return spendingRecord;
}

/**
 * Retrieves a full summary of current agent spending metrics and budget health
 */
export async function getSpendingSummary(): Promise<{
  dailyBudgetSats: number;
  currentDailySpentSats: number;
  remainingDailySats: number;
  maxPerTxSats: number;
  totalTransactions24h: number;
  guardrailsEnabled: boolean;
  recentRecords: SpendingRecord[];
}> {
  const config = activeConfig;
  const { totalSats: currentDailySpent, count: totalTransactions24h } = await getDailySpentSats();
  const remainingDaily = Math.max(0, config.dailyBudgetSats - currentDailySpent);

  return {
    dailyBudgetSats: config.dailyBudgetSats,
    currentDailySpentSats: currentDailySpent,
    remainingDailySats: remainingDaily,
    maxPerTxSats: config.maxPerTxSats,
    totalTransactions24h,
    guardrailsEnabled: config.enabled,
    recentRecords: inMemorySpendingRecords.slice(0, 20),
  };
}

/**
 * Resets in-memory spending records (primarily for testing and mock environments)
 */
export function resetInMemorySpending(): void {
  inMemorySpendingRecords.length = 0;
}
