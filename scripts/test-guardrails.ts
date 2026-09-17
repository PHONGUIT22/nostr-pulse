// scripts/test-guardrails.ts
/**
 * Test Suite for Agent Guardrails, Zero-Config Identity & Spending Policy
 *
 * Verifies:
 * 1. Auto-generation and persistence of agent keypair in .nostrpulse/
 * 2. Transaction within budget -> allowed: true
 * 3. Single-transaction cap breach (> 50 sats) -> allowed: false with clear reason
 * 4. Daily allowance saturation -> blocks excessive transactions
 * 5. Clean termination via process.exit(0) in finally block
 */

import fs from "fs";
import path from "path";
import {
  getOrInitAgentIdentity,
  getAgentPubkey,
  getAgentNpub,
} from "../src/lib/identity-manager";
import {
  getSpendingPolicy,
  updateSpendingPolicy,
  assertSpendingAllowed,
  getRolling24hSpend,
} from "../src/lib/guardrails";
import { initDatabase, getAgentSpendingLogs } from "../src/lib/db";

async function runGuardrailsVerification() {
  console.log("===============================================================================");
  console.log("  TEST: AGENT GUARDRAILS & ZERO-CONFIG IDENTITY (scripts/test-guardrails.ts)  ");
  console.log("===============================================================================\n");

  await initDatabase();

  // ---------------------------------------------------------------------------
  // Test 1: Verify Auto-Generation & Persistence of Agent Keypair in .nostrpulse/
  // ---------------------------------------------------------------------------
  console.log(">>> [Test 1] Verifying Agent Identity Bootstrapping & Keystore Persistence...");
  const identity = getOrInitAgentIdentity();
  const pubkey = getAgentPubkey();
  const npub = getAgentNpub();

  console.log(`  [+] Agent Pubkey     : ${pubkey}`);
  console.log(`  [+] Agent Npub       : ${npub}`);
  console.log(`  [+] Identity Source  : ${identity.source}`);

  if (!pubkey || pubkey.length !== 64) {
    throw new Error(`Invalid pubkey generated: ${pubkey}`);
  }
  if (!npub || !npub.startsWith("npub1")) {
    throw new Error(`Invalid npub generated: ${npub}`);
  }

  const identityFilePath = path.join(process.cwd(), ".nostrpulse", "agent-identity.json");
  if (!fs.existsSync(identityFilePath)) {
    throw new Error(`.nostrpulse/agent-identity.json does not exist at ${identityFilePath}`);
  }

  const savedFileContent = JSON.parse(fs.readFileSync(identityFilePath, "utf8"));
  if (savedFileContent.pubkey !== pubkey || savedFileContent.npub !== npub) {
    throw new Error("Persisted .nostrpulse/agent-identity.json content does not match active identity");
  }
  console.log(`  [+] Keystore verified on disk: ${identityFilePath}`);
  console.log("--> Test 1 (Identity & Keystore Persistence): PASSED\n");

  // ---------------------------------------------------------------------------
  // Test 2: Test Transaction Within Budget -> allowed: true
  // ---------------------------------------------------------------------------
  console.log(">>> [Test 2] Testing Transaction Within Budget (allowed: true)...");
  const fiatjafPubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const validPayment = await assertSpendingAllowed({
    amountSats: 21,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });

  console.log(`  [+] Payment of 21 sats: allowed = ${validPayment.allowed}`);
  if (!validPayment.allowed) {
    throw new Error(`Expected payment within budget to be allowed, but got: ${validPayment.reason}`);
  }
  console.log("--> Test 2 (Transaction Within Budget): PASSED\n");

  // ---------------------------------------------------------------------------
  // Test 3: Test Single-Transaction Cap Breach (> 50 sats) -> allowed: false
  // ---------------------------------------------------------------------------
  console.log(">>> [Test 3] Testing Single-Transaction Cap Breach (> 50 sats)...");
  const policy = getSpendingPolicy();
  const breachAmount = policy.maxSatsPerTx + 25; // 75 sats

  const singleTxBreach = await assertSpendingAllowed({
    amountSats: breachAmount,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });

  console.log(`  [+] Payment of ${breachAmount} sats: allowed = ${singleTxBreach.allowed}`);
  console.log(`  [+] Rejection Reason: "${singleTxBreach.reason}"`);

  if (singleTxBreach.allowed) {
    throw new Error(`Expected payment of ${breachAmount} sats to exceed single-tx cap (${policy.maxSatsPerTx} sats)`);
  }
  if (!singleTxBreach.reason || !singleTxBreach.reason.includes("exceeds policy limit")) {
    throw new Error(`Expected clear reason indicating single-tx limit breach, got: ${singleTxBreach.reason}`);
  }
  console.log("--> Test 3 (Single-Transaction Cap Breach): PASSED\n");

  // ---------------------------------------------------------------------------
  // Test 4: Test Daily Allowance Saturation -> blocks excessive transactions
  // ---------------------------------------------------------------------------
  console.log(">>> [Test 4] Testing Daily Allowance Saturation...");
  const currentSpendBefore = await getRolling24hSpend();
  console.log(`  [+] Current 24h rolling approved spend: ${currentSpendBefore} sats`);

  // Dynamically set daily limit to test saturation
  const testDailyCap = currentSpendBefore + 45;
  updateSpendingPolicy({
    maxSatsPerTx: 50,
    dailyLimitSats: testDailyCap,
    minTrustScoreTarget: 40,
  });
  console.log(`  [+] Configured temporary test daily limit: ${testDailyCap} sats`);

  // 4a. Make an allowed transaction that almost reaches the limit
  const stepPayment = await assertSpendingAllowed({
    amountSats: 30,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });
  if (!stepPayment.allowed) {
    throw new Error(`Step payment of 30 sats was unexpectedly rejected: ${stepPayment.reason}`);
  }
  console.log(`  [+] Step payment of 30 sats approved (Total spend: ${currentSpendBefore + 30} / ${testDailyCap} sats)`);

  // 4b. Next payment of 25 sats should saturate and breach daily allowance
  const saturatedPayment = await assertSpendingAllowed({
    amountSats: 25,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });

  console.log(`  [+] Excessive payment of 25 sats: allowed = ${saturatedPayment.allowed}`);
  console.log(`  [+] Rejection Reason: "${saturatedPayment.reason}"`);

  if (saturatedPayment.allowed) {
    throw new Error("Expected excessive transaction to be blocked by daily allowance saturation");
  }
  if (!saturatedPayment.reason || !saturatedPayment.reason.includes("spending limit exceeded")) {
    throw new Error(`Expected clear 24h limit breach reason, got: ${saturatedPayment.reason}`);
  }
  console.log("--> Test 4 (Daily Allowance Saturation): PASSED\n");

  // ---------------------------------------------------------------------------
  // Test 5: Verify SQLite Audit Records
  // ---------------------------------------------------------------------------
  console.log(">>> [Test 5] Verifying Audit Trail in SQLite agent_spending_log...");
  const logs = await getAgentSpendingLogs(5);
  console.log(`  [+] Retrieved ${logs.length} recent spending log entries:`);
  for (const log of logs) {
    console.log(`      * [${log.status.toUpperCase()}] ${log.amount_sats} sats via ${log.rail} (reason: ${log.reason})`);
  }
  if (logs.length === 0) {
    throw new Error("No spending log entries found in database");
  }
  console.log("--> Test 5 (SQLite Audit Trail): PASSED\n");

  console.log("===============================================================================");
  console.log(">>> ALL AGENT GUARDRAILS TESTS PASSED WITH 100% SUCCESS!");
  console.log("===============================================================================\n");
}

async function main() {
  try {
    await runGuardrailsVerification();
  } catch (err: any) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    // Explicit clean exit to prevent event-loop hanging on Windows
    process.exit(0);
  }
}

main();
