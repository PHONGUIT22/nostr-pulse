// scripts/test-dvm-fallback.ts
import { requestDvmAnalyticsWithFallback, discoverDvmAnnouncements } from "../src/lib/dvm";
import { initDatabase, getZapTotalsFromDb } from "../src/lib/db";

async function main() {
  console.log("===============================================================================");
  console.log("  TESTING DVM (NIP-89/NIP-90) DISTRIBUTED ANALYTICS WITH LOCAL DB FALLBACK");
  console.log("===============================================================================");

  await initDatabase();

  const jb55Pubkey = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245";

  // Check what is currently in local database
  const localZap = await getZapTotalsFromDb(jb55Pubkey);
  console.log(`[Local DB Baseline] jb55 total_sats in DB: ${localZap?.total_sats ?? 0}`);

  console.log("\n[DVM Client] Sending distributed Kind 5300 request for zap-analytics with 2500ms timeout...");
  const res = await requestDvmAnalyticsWithFallback({
    targetPubkey: jb55Pubkey,
    category: "zap-analytics",
    timeoutMs: 2500,
  });

  console.log("\n===============================================================================");
  console.log("  ANALYTICS RESULT RECEIVED");
  console.log("===============================================================================");
  console.log(`  - Target Pubkey : ${res.pubkey}`);
  console.log(`  - Data Source   : ${res.source.toUpperCase()}`);
  console.log(`  - Is Fallback?  : ${res.dvmFallback}`);
  console.log(`  - Total Sats    : ${res.totalSats}`);
  console.log(`  - Valid Sats    : ${res.validSenderSats}`);
  console.log(`  - Zap Count     : ${res.zapCount}`);
  console.log(`  - Trust Score   : ${res.trustScore}`);
  console.log(`  - Response Time : ${res.latencyMs}ms`);
  console.log(`  - Detail Reason : ${res.reason || "N/A"}`);
  console.log("===============================================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
