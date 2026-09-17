// scripts/reset-guardrails.ts
/**
 * NostrPulse Spending Guardrails Database Reset & Prime Utility
 *
 * Controls the SQLite transaction history in 'nostrpulse.db' for spending guardrails.
 *
 * Modes:
 *   1. Full Reset (Default):
 *      Clears all spending logs to restore full 24h daily budget (0 spent / 500 sats remaining).
 *      Command: npm exec tsx scripts/reset-guardrails.ts
 *
 *   2. Prime for Demo Showcase (--prime or --prime=<N>):
 *      Clears logs and inserts a baseline spent amount (e.g. 494 sats) so that
 *      remaining allowance is EXACTLY N sats (default: 6 sats).
 *      This allows testing or recording the 21 sats -> blocked -> 5 sats adaptive fallback.
 *      Command: npm exec tsx scripts/reset-guardrails.ts --prime
 */

try {
  process.loadEnvFile?.(".env.local");
} catch {
  try {
    process.loadEnvFile?.(".env");
  } catch {}
}

import path from "path";
import { createClient } from "@libsql/client";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

export async function resetGuardrails(options?: { primeRemainingSats?: number }) {
  const dbPath = path.resolve(process.cwd(), "nostrpulse.db").replace(/\\/g, "/");
  const dbUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    `file:${dbPath}`;

  const db = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("===============================================================================");
  console.log("  NOSTRPULSE SPENDING GUARDRAILS DATABASE RESET / PRIME UTILITY               ");
  console.log("===============================================================================\n");
  console.log(`${colors.dim}>>> Connecting to database: ${dbUrl}...${colors.reset}`);

  // Ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS agent_spending_log (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      amount_sats INTEGER NOT NULL,
      recipient TEXT,
      rail TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT
    );
  `);

  // Clear previous spending logs
  await db.execute(`DELETE FROM agent_spending_log;`);
  try {
    await db.execute(`DELETE FROM agent_telemetry;`);
  } catch {}

  const dailyLimit = parseInt(process.env.AGENT_DAILY_LIMIT_SATS || "500", 10);
  const primeRemaining = options?.primeRemainingSats;

  if (primeRemaining !== undefined && primeRemaining >= 0) {
    const baselineSpent = Math.max(0, dailyLimit - primeRemaining);
    const nowSec = Math.floor(Date.now() / 1000);

    if (baselineSpent > 0) {
      await db.execute({
        sql: `
          INSERT INTO agent_spending_log (id, timestamp, amount_sats, recipient, rail, status, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `prime_${Date.now()}`,
          nowSec,
          baselineSpent,
          null,
          "nutzap",
          "approved",
          "Simulated baseline spend for deterministic guardrail showcase",
        ],
      });
    }

    console.log(`${colors.green}✔ Successfully primed spending guardrails!${colors.reset}`);
    console.log(`  - 24h Daily Budget Limit : ${colors.bold}${dailyLimit} sats${colors.reset}`);
    console.log(`  - Simulated Baseline Spent: ${colors.yellow}${baselineSpent} sats${colors.reset}`);
    console.log(`  - Remaining Daily Budget  : ${colors.cyan}${colors.bold}${primeRemaining} sats${colors.reset}\n`);
    console.log(
      `${colors.dim}👉 When an Agent attempts a 21 sats payment, guardrails will block it (need 21 > 6 sats).${colors.reset}`
    );
    console.log(
      `${colors.dim}👉 The Adaptive Fallback will then automatically settle ${Math.min(5, primeRemaining)} sats successfully.${colors.reset}\n`
    );
  } else {
    console.log(`${colors.green}✔ Successfully reset spending guardrails!${colors.reset}`);
    console.log(`  - 24h Daily Budget Limit : ${colors.bold}${dailyLimit} sats${colors.reset}`);
    console.log(`  - Current Spent Today    : ${colors.green}0 sats${colors.reset}`);
    console.log(`  - Remaining Daily Budget  : ${colors.cyan}${colors.bold}${dailyLimit} sats${colors.reset}\n`);
  }

  db.close();
}

// CLI Execution handler
const isPrime =
  process.argv.includes("--prime") ||
  process.argv.some((a) => a.startsWith("--prime=")) ||
  process.env.PRIME_ALLOWANCE !== undefined ||
  process.env.npm_config_prime !== undefined;

const primeValue = (() => {
  if (process.env.npm_config_prime && process.env.npm_config_prime !== "true") {
    const v = parseInt(process.env.npm_config_prime, 10);
    if (!isNaN(v)) return v;
  }
  for (const a of process.argv) {
    if (a.startsWith("--prime=")) {
      const v = parseInt(a.split("=")[1], 10);
      return isNaN(v) ? 6 : v;
    }
  }
  return isPrime ? 6 : undefined;
})();

resetGuardrails({ primeRemainingSats: primeValue }).catch((err) => {
  console.error("Error resetting guardrails:", err);
  process.exit(1);
});
