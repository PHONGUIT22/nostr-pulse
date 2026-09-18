// scripts/test-guardrails-and-telemetry.ts
/**
 * Test Suite: Agent Spending Guardrails, Zero-Config Identity & Telemetry
 */

import {
  getOrInitAgentIdentity,
  getAgentPubkey,
  getAgentNpub,
  clearAgentIdentityCache,
  parsePrivateKey,
} from "../src/lib/identity-manager";
import {
  checkSpendingAllowed,
  recordAgentSpending,
  getSpendingSummary,
  updateSpendingConfig,
  resetInMemorySpending,
} from "../src/lib/spending-guardrails";
import {
  logTelemetryEvent,
  queryTelemetryEvents,
  getTelemetryOverview,
  clearTelemetryCache,
} from "../src/lib/telemetry";

async function runTests() {
  console.log("===============================================================================");
  console.log("  TEST: ZERO-CONFIG IDENTITY, SPENDING GUARDRAILS & TELEMETRY AUDIT TRAIL      ");
  console.log("===============================================================================\n");

  // ---------------------------------------------------------------------------
  // TEST 1: Identity Manager & Zero-Config Bootstrapping
  // ---------------------------------------------------------------------------
  console.log(">>> [1/3] Testing Zero-Config Identity Bootstrapping...");
  clearAgentIdentityCache();

  // Test parsePrivateKey
  const { nip19 } = await import("nostr-tools");
  const validSk = new Uint8Array(32).fill(7);
  const sampleNsec = nip19.nsecEncode(validSk);
  const parsedFromNsec = parsePrivateKey(sampleNsec);
  if (!parsedFromNsec || parsedFromNsec.length !== 32) {
    throw new Error("Failed to parse valid nsec private key");
  }
  console.log("  [+] parsePrivateKey from nsec succeeded.");

  const identity = getOrInitAgentIdentity({ forceRefresh: true });
  console.log(`  [+] Agent Identity resolved:`);
  console.log(`      Pubkey: ${identity.pubkey}`);
  console.log(`      Npub  : ${identity.npub}`);
  console.log(`      Source: ${identity.source}`);
  console.log(`      Ephemeral: ${identity.isEphemeral}`);

  if (!identity.pubkey || identity.pubkey.length !== 64) {
    throw new Error("Invalid agent pubkey generated");
  }
  if (!identity.npub.startsWith("npub1")) {
    throw new Error("Invalid agent npub generated");
  }

  const fastPubkey = getAgentPubkey();
  const fastNpub = getAgentNpub();
  if (fastPubkey !== identity.pubkey || fastNpub !== identity.npub) {
    throw new Error("Fast lookup mismatch with initialized identity");
  }
  console.log("  [+] Fast non-blocking identity lookups validated.\n");

  // ---------------------------------------------------------------------------
  // TEST 2: Spending Guardrails & Budget Manager
  // ---------------------------------------------------------------------------
  console.log(">>> [2/3] Testing Agent Spending Guardrails & Budget Manager...");
  resetInMemorySpending();
  updateSpendingConfig({
    maxPerTxSats: 2000,
    dailyBudgetSats: 5000,
    enabled: true,
  });

  // Test 2a: Small valid payment
  const check1 = await checkSpendingAllowed({ amountSats: 500, rail: "cashu" });
  if (!check1.allowed) {
    throw new Error(`Expected 500 sats to be allowed, but rejected: ${check1.reason}`);
  }
  console.log("  [+] Check 1: 500 sats payment permitted.");

  // Test 2b: Exceeding single-tx limit (e.g. 2,500 sats when max is 2,000)
  const check2 = await checkSpendingAllowed({ amountSats: 2500, rail: "cashu" });
  if (check2.allowed) {
    throw new Error("Expected 2,500 sats to be blocked by maxPerTxSats (2000)");
  }
  console.log(`  [+] Check 2: Single-tx cap enforced correctly: "${check2.reason}"`);

  // Record some spending
  await recordAgentSpending({
    amountSats: 1500,
    rail: "cashu",
    recipientPubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    memo: "Test payment 1",
  });
  await recordAgentSpending({
    amountSats: 1500,
    rail: "lightning_nwc",
    memo: "Test payment 2",
  });

  // Test 2c: Exceeding daily budget (1500 + 1500 = 3000 spent; budget is 5000; next 2500 should fail)
  const check3 = await checkSpendingAllowed({ amountSats: 2500, rail: "lightning_nwc" });
  if (check3.allowed) {
    throw new Error("Expected daily budget overrun to be blocked");
  }
  console.log(`  [+] Check 3: 24h Daily allowance budget enforced: "${check3.reason}"`);

  // Test 2d: Summary inspection
  const summary = await getSpendingSummary();
  console.log(`  [+] Guardrails Summary:`);
  console.log(`      Daily Budget: ${summary.dailyBudgetSats} sats`);
  console.log(`      Spent Today : ${summary.currentDailySpentSats} sats`);
  console.log(`      Remaining   : ${summary.remainingDailySats} sats`);
  console.log(`      Max Single  : ${summary.maxPerTxSats} sats`);
  console.log(`      Total Tx 24h: ${summary.totalTransactions24h}`);

  if (summary.currentDailySpentSats < 3000) {
    throw new Error(`Summary recorded spending mismatch: expected >= 3000, got ${summary.currentDailySpentSats}`);
  }
  console.log("  [+] Spending Guardrails verified successfully.\n");

  // ---------------------------------------------------------------------------
  // TEST 3: Telemetry Event Logging & Audit Trail
  // ---------------------------------------------------------------------------
  console.log(">>> [3/3] Testing Telemetry Event Logging & Audit Trail...");
  clearTelemetryCache();

  // Log sample events across categories
  const ev1 = await logTelemetryEvent({
    eventType: "payment.nutzap.settled",
    category: "payment",
    status: "success",
    targetPubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    amountSats: 21,
    metadata: { mint: "https://testnut.cashu.space" },
  });

  const ev2 = await logTelemetryEvent({
    eventType: "payment.guardrail_blocked",
    category: "payment",
    status: "blocked",
    amountSats: 10000,
    error: "Exceeded daily budget",
    metadata: { rail: "cashu" },
  });

  const ev3 = await logTelemetryEvent({
    eventType: "radar.trust_score.checked",
    category: "radar",
    status: "success",
    targetPubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    metadata: { score: 95, tier: "Verified Builder" },
  });

  const ev4 = await logTelemetryEvent({
    eventType: "mint.audited",
    category: "mint",
    status: "success",
    metadata: { mintUrl: "https://mint.minibits.cash/Bitcoin", score: 85 },
  });

  if (!ev1.id || !ev2.id || !ev3.id || !ev4.id) {
    throw new Error("Telemetry events missing generated IDs");
  }

  // Query events
  const allEvents = await queryTelemetryEvents({ limit: 10 });
  if (allEvents.length < 4) {
    throw new Error(`Expected at least 4 telemetry events, got ${allEvents.length}`);
  }

  const blockedEvents = await queryTelemetryEvents({ status: "blocked" });
  if (blockedEvents.length < 1) {
    throw new Error("Expected at least 1 blocked telemetry event");
  }
  console.log(`  [+] Filtered query (status='blocked') returned ${blockedEvents.length} event.`);

  // Overview stats
  const overview = await getTelemetryOverview();
  console.log("  [+] Telemetry Overview:");
  console.log(`      Total Events: ${overview.totalEvents}`);
  console.log(`      Success Rate: ${overview.successRatePercent}%`);
  console.log(`      By Category : ${JSON.stringify(overview.byCategory)}`);

  console.log("\n===============================================================================");
  console.log(">>> ALL TESTS PASSED! ZERO-CONFIG IDENTITY, GUARDRAILS & TELEMETRY VALIDATED.");
  console.log("===============================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
