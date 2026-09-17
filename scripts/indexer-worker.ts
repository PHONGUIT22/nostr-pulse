// scripts/indexer-worker.ts
/**
 * Direct WebSocket Indexer Background Worker
 * Periodically connects to 5-8 major Nostr relays:
 * - wss://relay.damus.io
 * - wss://nos.lol
 * - wss://relay.nostr.band
 * - wss://purplerelay.com
 * - wss://relay.primal.net
 * - wss://nostr.mom
 *
 * For all users in the SQLite database, sends REQ for:
 * - kinds: [0] (Profile metadata & NIP-05)
 * - kinds: [3] (Contact list follows)
 * - kinds: [9735], #p: [<pubkey>] (Zap receipts)
 *
 * Decodes bolt11 and description tags to extract real sats and sender pubkey,
 * and accumulates totals into the database.
 */

import { runIndexerPass, MAJOR_INDEXER_RELAYS } from "../src/lib/indexer";
import { initDatabase, getDb } from "../src/lib/db";

const args = process.argv.slice(2);
const isRunOnce = args.includes("--once");
const intervalArgIndex = args.indexOf("--interval");
const intervalMs = intervalArgIndex !== -1 && args[intervalArgIndex + 1]
  ? parseInt(args[intervalArgIndex + 1], 10)
  : 300000; // Default 5 minutes

async function main() {
  console.log("===============================================================================");
  console.log("  NOSTRPULSE WEBSOCKET INDEXER WORKER DAEMON");
  console.log("===============================================================================");
  console.log(`Relays (${MAJOR_INDEXER_RELAYS.length}):`);
  MAJOR_INDEXER_RELAYS.forEach((r) => console.log(`  - ${r}`));
  console.log(`Mode: ${isRunOnce ? "Single Pass (--once)" : `Continuous (every ${intervalMs / 1000}s)`}`);
  console.log("===============================================================================\n");

  await initDatabase();

  let isRunning = false;

  async function executeCycle() {
    if (isRunning) return;
    isRunning = true;
    try {
      console.log(`[${new Date().toISOString()}] Starting indexing cycle...`);
      await runIndexerPass({ verbose: true });
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] Indexer cycle failed:`, err?.message || err);
    } finally {
      isRunning = false;
    }
  }

  // Initial immediate pass
  await executeCycle();

  if (isRunOnce) {
    console.log("Single pass complete. Worker exiting.");
    process.exit(0);
  }

  // Recurring loop
  const timer = setInterval(executeCycle, intervalMs);

  const shutdown = () => {
    console.log("\nReceived shutdown signal. Stopping indexer worker...");
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Worker fatal error:", err);
  process.exit(1);
});
