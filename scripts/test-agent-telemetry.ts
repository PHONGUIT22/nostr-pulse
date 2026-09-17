// scripts/test-agent-telemetry.ts
/**
 * Test Suite for Feature 3: Developer Telemetry & Audit Trail (src/lib/telemetry.ts)
 */

import {
  logAgentEvent,
  getAgentTelemetrySummary,
} from "../src/lib/telemetry";
import { initDatabase, getDb } from "../src/lib/db";

async function main() {
  console.log("===============================================================================");
  console.log("  TEST: DEVELOPER TELEMETRY & AUDIT TRAIL (src/lib/telemetry.ts)               ");
  console.log("===============================================================================\n");

  await initDatabase();
  const db = getDb();

  console.log(">>> [1/4] Logging agent payment event...");
  const paymentEvent = await logAgentEvent({
    type: "payment",
    data: {
      amountSats: 42,
      rail: "nutzap",
      recipient: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
      mint: "https://testnut.cashu.space",
    },
  });
  console.log(`  [+] Payment logged: ID ${paymentEvent.id}, Sats: ${paymentEvent.amountSats}`);
  if (paymentEvent.amountSats !== 42 || paymentEvent.type !== "payment") {
    throw new Error("Payment event recording failed");
  }

  console.log(">>> [2/4] Logging radar block event...");
  const blockEvent = await logAgentEvent({
    type: "radar_block",
    data: {
      recipient: "0000000000000000000000000000000000000000000000000000000000000001",
      reason: "Isolated keypair outside Web-of-Trust graph (Trust score < 40)",
      attemptedAmountSats: 100,
    },
  });
  console.log(`  [+] Radar block logged: ID ${blockEvent.id}`);
  if (blockEvent.type !== "radar_block") {
    throw new Error("Radar block event recording failed");
  }

  console.log(">>> [3/4] Logging job settlement & mint audit events...");
  await logAgentEvent({
    type: "job_settlement",
    data: {
      jobId: "job_998822",
      amountSats: 10,
      worker: "cameri",
    },
  });

  await logAgentEvent({
    type: "mint_audit",
    data: {
      mintUrl: "https://mint.minibits.cash/Bitcoin",
      riskLevel: "LOW",
      trustScore: 85,
    },
  });
  console.log("  [+] Job settlement and Mint audit logged.");

  console.log(">>> [4/4] Querying getAgentTelemetrySummary()...");
  const summary = await getAgentTelemetrySummary(24);
  console.log("  [+] Telemetry Summary Result:");
  console.log(`      Total Spent Sats    : ${summary.totalSpentSats} sats`);
  console.log(`      Transaction Count   : ${summary.txCount}`);
  console.log(`      Blocked Sybil Attacks: ${summary.blockedSybilAttacks}`);
  console.log(`      Recent Events Count : ${summary.recentEvents.length}`);

  if (summary.totalSpentSats < 52) {
    throw new Error(`Expected at least 52 total spent sats (42 + 10), got ${summary.totalSpentSats}`);
  }
  if (summary.txCount < 1) {
    throw new Error(`Expected txCount >= 1, got ${summary.txCount}`);
  }
  if (summary.blockedSybilAttacks < 1) {
    throw new Error(`Expected blockedSybilAttacks >= 1, got ${summary.blockedSybilAttacks}`);
  }
  if (summary.recentEvents.length < 4) {
    throw new Error(`Expected at least 4 recent events, got ${summary.recentEvents.length}`);
  }

  // Print sample event from summary
  const sample = summary.recentEvents[0];
  console.log(`\n  [+] Sample Event: [${sample.type}] at ${new Date(sample.timestamp * 1000).toISOString()}`);
  console.log(`      Data: ${JSON.stringify(sample.data)}`);

  console.log("\n===============================================================================");
  console.log(">>> ALL DEVELOPER TELEMETRY TESTS PASSED WITH 100% SUCCESS!");
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
