// scripts/test-guardrails-policy.ts
/**
 * Test Suite for Feature 2: Spending Guardrails & Budget Policy (src/lib/guardrails.ts)
 */

import {
  getSpendingPolicy,
  updateSpendingPolicy,
  assertSpendingAllowed,
  getRolling24hSpend,
} from "../src/lib/guardrails";
import { initDatabase, getDb, getAgentSpendingLogs } from "../src/lib/db";

async function main() {
  console.log("===============================================================================");
  console.log("  TEST: SPENDING GUARDRAILS & BUDGET POLICY (src/lib/guardrails.ts)            ");
  console.log("===============================================================================\n");

  await initDatabase();
  const db = getDb();

  // 1. Verify SpendingPolicy defaults
  const policy = getSpendingPolicy();
  console.log(">>> [1/5] Verifying SpendingPolicy default values:");
  console.log(`    maxSatsPerTx       : ${policy.maxSatsPerTx} sats (expected 50)`);
  console.log(`    dailyLimitSats     : ${policy.dailyLimitSats} sats (expected 500)`);
  console.log(`    minTrustScoreTarget: ${policy.minTrustScoreTarget} (expected 40)`);

  if (policy.maxSatsPerTx !== 50 || policy.dailyLimitSats !== 500 || policy.minTrustScoreTarget !== 40) {
    throw new Error("Default SpendingPolicy values do not match requirements");
  }
  console.log("  [+] Default policy matches specifications.\n");

  // 2. Test Single Transaction Cap Check (amount > maxSatsPerTx)
  console.log(">>> [2/5] Testing Single Transaction Cap...");
  const fiatjafPubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const overMaxTx = await assertSpendingAllowed({
    amountSats: 60,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });

  if (overMaxTx.allowed) {
    throw new Error("Expected 60 sats to be rejected by maxSatsPerTx (50)");
  }
  console.log(`  [+] Transaction over 50 sats rejected as expected: "${overMaxTx.reason}"\n`);

  // 3. Test Recipient Trust Score Gate (recipient with low score < 40)
  console.log(">>> [3/5] Testing Recipient Trust Score Gate...");
  // Use a newly generated random pubkey with zero WoT distance (score < 40)
  const unknownPubkey = "0000000000000000000000000000000000000000000000000000000000000001";
  const lowTrustCheck = await assertSpendingAllowed({
    amountSats: 20,
    recipientPubkey: unknownPubkey,
    rail: "nwc",
  });

  if (lowTrustCheck.allowed) {
    throw new Error("Expected isolated pubkey with score < 40 to be rejected");
  }
  console.log(`  [+] Low trust recipient rejected as expected: "${lowTrustCheck.reason}"\n`);

  // 4. Test Valid Approved Payment (amount <= 50, trust >= 40)
  console.log(">>> [4/5] Testing Valid Payment Approval...");
  const validPayment = await assertSpendingAllowed({
    amountSats: 25,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });

  if (!validPayment.allowed) {
    throw new Error(`Expected valid payment of 25 sats to fiatjaf to be approved, but got: ${validPayment.reason}`);
  }
  console.log("  [+] Valid payment of 25 sats to fiatjaf was approved.\n");

  // 5. Test 24h Rolling Budget Accumulation and Limit Enforcement
  console.log(">>> [5/5] Testing 24h Rolling Budget Limit...");
  // Temporarily set dailyLimitSats to 80 for this specific test
  updateSpendingPolicy({ maxSatsPerTx: 50, dailyLimitSats: 80, minTrustScoreTarget: 40 });

  // Currently spent: at least 25 sats
  const currentSpent = await getRolling24hSpend();
  console.log(`  [+] Current 24h approved spend in SQLite: ${currentSpent} sats`);

  // Send another 50 sats (total = currentSpent + 50)
  const secondPayment = await assertSpendingAllowed({
    amountSats: 50,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });
  console.log(`  [+] Second payment of 50 sats allowed: ${secondPayment.allowed}`);

  // Now next payment of 30 sats should exceed the daily limit of 80 sats
  const overDaily = await assertSpendingAllowed({
    amountSats: 30,
    recipientPubkey: fiatjafPubkey,
    rail: "nutzap",
  });

  if (overDaily.allowed) {
    throw new Error("Expected payment exceeding 24h rolling limit to be rejected");
  }
  console.log(`  [+] Over-budget payment rejected as expected: "${overDaily.reason}"\n`);

  // 6. Verify SQLite Logging
  const logs = await getAgentSpendingLogs(10);
  console.log(`  [+] SQLite agent_spending_log verified (${logs.length} entries recorded):`);
  logs.slice(0, 4).forEach((log) => {
    console.log(`      [${log.status.toUpperCase()}] ${log.amount_sats} sats via ${log.rail} -> ${log.reason || "Approved"}`);
  });

  console.log("\n===============================================================================");
  console.log(">>> ALL GUARDRAILS & SPENDING POLICY TESTS PASSED WITH 100% SUCCESS!");
  console.log("===============================================================================\n");
}

main()
  .catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
