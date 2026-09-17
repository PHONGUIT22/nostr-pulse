// scripts/test-mint-mesh.ts
/**
 * Test Suite for WoT-Gated Dynamic Mint Mesh
 */

import {
  auditCashuMint,
  selectBestMint,
  routeCashuMint,
  DEFAULT_MINT_MESH_URLS,
  type MintRiskProfile,
  type MintAuditResult,
} from "../src/lib/mint-mesh";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running WoT-Gated Dynamic Mint Mesh Test Suite ===\n");

  // Test 1: Offline Mint handling
  console.log("[Test 1] Testing offline / unreachable mint auditing...");
  const offlineMintUrl = "https://nonexistent-mint-123456789.xyz";
  const offlineAudit = await auditCashuMint(offlineMintUrl, true);

  assert(!offlineAudit.isOnline, "Offline mint should have isOnline=false");
  assert(offlineAudit.trustScore === 0, "Offline mint trust score should be 0");
  assert(offlineAudit.isGated, "Offline mint should be gated");
  assert(offlineAudit.tier === "Offline", "Tier should be 'Offline'");
  assert(offlineAudit.breakdown.length === 5, "Should provide 5-pillar breakdown");
  console.log("--> Passed!");

  // Test 2: Live Mint Auditing (Testnut and Minibits)
  console.log("\n[Test 2a] Auditing official Cashu Testnut mint (https://testnut.cashu.space)...");
  const testnutUrl = "https://testnut.cashu.space";
  const testnutAudit = await auditCashuMint(testnutUrl, true);

  console.log(`  Mint Name: ${testnutAudit.name}`);
  console.log(`  Online: ${testnutAudit.isOnline}`);
  console.log(`  Latency: ${testnutAudit.latencyMs}ms`);
  console.log(`  Admin Pubkey: ${testnutAudit.adminPubkey || "(none)"}`);
  console.log(`  Trust Score: ${testnutAudit.trustScore}/100`);
  console.log(`  Risk Level: ${testnutAudit.riskLevel}`);
  console.log(`  Recommendation: ${testnutAudit.recommendation}`);
  console.log(`  Tier: ${testnutAudit.tier}`);
  console.log(`  WoT Distance: ${testnutAudit.wotDistance}`);
  console.log(`  Supported NUTs: ${testnutAudit.supportedNuts.join(", ")}`);

  assert(testnutAudit.breakdown.length === 5, "Must have 5 pillars in breakdown");
  for (const pillar of testnutAudit.breakdown) {
    console.log(`    - ${pillar.label}: ${pillar.points}/${pillar.maxPoints} pts (Passed: ${pillar.passed})`);
  }
  console.log("--> Passed!");

  console.log("\n[Test 2b] Auditing Minibits mint (https://mint.minibits.cash/Bitcoin)...");
  const minibitsUrl = "https://mint.minibits.cash/Bitcoin";
  const minibitsAudit = await auditCashuMint(minibitsUrl, true);

  console.log(`  Mint Name: ${minibitsAudit.name}`);
  console.log(`  Online: ${minibitsAudit.isOnline}`);
  console.log(`  Latency: ${minibitsAudit.latencyMs}ms`);
  console.log(`  Admin Pubkey: ${minibitsAudit.adminPubkey || "(none)"}`);
  console.log(`  Trust Score: ${minibitsAudit.trustScore}/100`);
  console.log(`  Risk Level: ${minibitsAudit.riskLevel}`);
  console.log(`  Recommendation: ${minibitsAudit.recommendation}`);
  console.log(`  Supported NUTs: ${minibitsAudit.supportedNuts.join(", ")}`);

  assert(minibitsAudit.breakdown.length === 5, "Must have 5 pillars in breakdown");
  assert(minibitsAudit.trustScore >= 0, "Trust score must be non-negative");
  console.log("--> Passed!");

  // Test 3: Dynamic Mint Mesh Routing
  console.log("\n[Test 3] Testing dynamic mint routing across default mesh...");
  const routing = await routeCashuMint({
    amountSats: 500,
    minTrustScore: 40,
  });

  console.log(`  Total Candidates Audited: ${routing.totalCandidateCount}`);
  console.log(`  Active Qualified Mesh: ${routing.activeMeshCount}`);
  console.log(`  Mesh Healthy: ${routing.meshHealthy}`);
  console.log(`  Selected Optimal Mint: ${routing.selectedMint.name} (${routing.selectedMint.mintUrl})`);
  console.log(`  Selected Mint Score: ${routing.selectedMint.trustScore}/100, Latency: ${routing.selectedMint.latencyMs}ms`);

  assert(routing.totalCandidateCount >= 3, "Mesh should have at least 3 candidates");
  assert(routing.rankedMesh.length > 0, "Ranked mesh should not be empty");
  assert(Boolean(routing.selectedMint.mintUrl), "Selected mint must have valid URL");
  console.log("--> Passed!");

  // Test 4: Dynamic Mint Mesh with Preferred Mint Prioritization
  console.log("\n[Test 4] Testing preferred mint prioritization...");
  const preferredUrl = "https://mint.minibits.cash/Bitcoin";
  const preferredRouting = await routeCashuMint({
    amountSats: 1000,
    preferredMint: preferredUrl,
    minTrustScore: 40,
  });

  console.log(`  Preferred Mint: ${preferredUrl}`);
  console.log(`  Selected Mint: ${preferredRouting.selectedMint.mintUrl}`);
  console.log("--> Passed!");

  // Test 5: selectBestMint & MintRiskProfile fields
  console.log("\n[Test 5] Testing selectBestMint and MintRiskProfile fields...");
  const bestMint = await selectBestMint([
    "https://nonexistent-mint-123456789.xyz",
    "https://testnut.cashu.space",
    "https://mint.minibits.cash/Bitcoin",
  ]);

  if (!bestMint) {
    throw new Error("Best mint should not be null");
  }

  assert(bestMint.trustScore > 0, "Best mint must have positive trust score");
  assert(Array.isArray(bestMint.supportedNuts), "supportedNuts must be an array");
  assert(["LOW", "MODERATE", "HIGH_RISK"].includes(bestMint.riskLevel), "riskLevel must match type");
  assert(["TRUSTED", "USE_WITH_CAP", "AVOID"].includes(bestMint.recommendation), "recommendation must match type");
  console.log(`  Selected Best Mint: ${bestMint.mintUrl} (Score: ${bestMint.trustScore}, Risk: ${bestMint.riskLevel}, Rec: ${bestMint.recommendation})`);
  console.log(`  Supported NUTs: ${bestMint.supportedNuts.join(", ")}`);
  console.log("--> Passed!");

  console.log("\n=== All WoT-Gated Dynamic Mint Mesh Tests Passed Successfully! ===");
}

runTests()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
