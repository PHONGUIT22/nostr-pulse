#!/usr/bin/env node
import {
  getWebOfTrustDistance
} from "./chunk-RI52V5BR.js";
import {
  getRecentSpendingRecords,
  insertSpendingRecord
} from "./chunk-JHYB5MLN.js";

// src/lib/spending-guardrails.ts
var inMemorySpendingRecords = [];
var MAX_RING_BUFFER_SIZE = 500;
function getSpendingConfig() {
  const parseEnvInt = (key, fallback) => {
    const val = process.env[key]?.trim();
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  };
  const isEnabled = process.env.AGENT_GUARDRAILS_ENABLED !== "false" && process.env.AGENT_GUARDRAILS_ENABLED !== "0";
  return {
    maxPerTxSats: parseEnvInt("AGENT_MAX_SATS_PER_TX", parseEnvInt("AGENT_MAX_TX_SATS", 50)),
    dailyBudgetSats: parseEnvInt(
      "AGENT_DAILY_LIMIT_SATS",
      parseEnvInt("AGENT_DAILY_BUDGET_SATS", 500)
    ),
    minRecipientTrustScore: parseEnvInt("AGENT_MIN_RECIPIENT_TRUST_SCORE", 0),
    enabled: isEnabled
  };
}
var activeConfig = getSpendingConfig();
function updateSpendingConfig(newConfig) {
  activeConfig = {
    ...activeConfig,
    ...newConfig
  };
  return activeConfig;
}
async function getDailySpentSats() {
  const oneDayAgoSec = Math.floor(Date.now() / 1e3) - 86400;
  try {
    const { getRolling24hApprovedSpend } = await import("./db-LHPVZTQM.js");
    const rollingSpent = await getRolling24hApprovedSpend(oneDayAgoSec);
    if (rollingSpent > 0) {
      return { totalSats: rollingSpent, count: 1 };
    }
  } catch {
  }
  try {
    const dbRecords = await getRecentSpendingRecords(oneDayAgoSec);
    if (dbRecords && dbRecords.length > 0) {
      const totalSats2 = dbRecords.reduce((sum, r) => sum + r.amount_sats, 0);
      return { totalSats: totalSats2, count: dbRecords.length };
    }
  } catch {
  }
  const oneDayAgoMs = Date.now() - 86400 * 1e3;
  const validMemRecords = inMemorySpendingRecords.filter((r) => r.createdAt >= oneDayAgoMs);
  const totalSats = validMemRecords.reduce((sum, r) => sum + r.amountSats, 0);
  return { totalSats, count: validMemRecords.length };
}
async function checkSpendingAllowed(params) {
  const { amountSats, recipientPubkey, bypassGuardrail } = params;
  const config = activeConfig;
  const { totalSats: currentDailySpent } = await getDailySpentSats();
  const remainingDaily = Math.max(0, config.dailyBudgetSats - currentDailySpent);
  if (!config.enabled || bypassGuardrail) {
    return {
      allowed: true,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily
    };
  }
  if (amountSats <= 0) {
    return {
      allowed: false,
      reason: `Invalid payment amount: ${amountSats} sats. Amount must be greater than 0.`,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily
    };
  }
  if (amountSats > config.maxPerTxSats) {
    return {
      allowed: false,
      reason: `Spending Guardrail Blocked: Payment of ${amountSats.toLocaleString()} sats exceeds the maximum single-transaction limit of ${config.maxPerTxSats.toLocaleString()} sats.`,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily
    };
  }
  if (currentDailySpent + amountSats > config.dailyBudgetSats) {
    return {
      allowed: false,
      reason: `Spending Guardrail Blocked: Payment of ${amountSats.toLocaleString()} sats exceeds the 24-hour budget limit. Current 24h spent: ${currentDailySpent.toLocaleString()} sats, remaining allowance: ${remainingDaily.toLocaleString()} sats (Budget: ${config.dailyBudgetSats.toLocaleString()} sats).`,
      amountSats,
      maxPerTxSats: config.maxPerTxSats,
      dailyBudgetSats: config.dailyBudgetSats,
      currentDailySpentSats: currentDailySpent,
      remainingDailySats: remainingDaily
    };
  }
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
        remainingDailySats: remainingDaily
      };
    }
  }
  return {
    allowed: true,
    amountSats,
    maxPerTxSats: config.maxPerTxSats,
    dailyBudgetSats: config.dailyBudgetSats,
    currentDailySpentSats: currentDailySpent,
    remainingDailySats: remainingDaily - amountSats
  };
}
async function recordAgentSpending(record) {
  const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nowSec = Math.floor(Date.now() / 1e3);
  const spendingRecord = {
    id,
    amountSats: record.amountSats,
    rail: record.rail,
    recipientPubkey: record.recipientPubkey,
    eventId: record.eventId,
    memo: record.memo,
    createdAt: Date.now()
  };
  inMemorySpendingRecords.unshift(spendingRecord);
  if (inMemorySpendingRecords.length > MAX_RING_BUFFER_SIZE) {
    inMemorySpendingRecords.pop();
  }
  try {
    await insertSpendingRecord({
      id,
      amount_sats: record.amountSats,
      rail: record.rail,
      recipient_pubkey: record.recipientPubkey || null,
      event_id: record.eventId || null,
      memo: record.memo || null,
      created_at: nowSec
    });
  } catch (err) {
    console.debug("[SpendingGuardrails] Notice: SQLite persistence fallback to in-memory:", err);
  }
  return spendingRecord;
}
async function getSpendingSummary() {
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
    recentRecords: inMemorySpendingRecords.slice(0, 20)
  };
}
function resetInMemorySpending() {
  inMemorySpendingRecords.length = 0;
}

export {
  getSpendingConfig,
  updateSpendingConfig,
  getDailySpentSats,
  checkSpendingAllowed,
  recordAgentSpending,
  getSpendingSummary,
  resetInMemorySpending
};
