// scripts/test-widget-api.ts
import { POST as quotePost, OPTIONS as quoteOptions } from "../src/app/api/widget/quote/route";
import { POST as claimPost, OPTIONS as claimOptions } from "../src/app/api/widget/claim/route";
import { getZapTotalsFromDb } from "../src/lib/db";

async function main() {
  console.log("=== Testing Standalone NutZap Widget Backend Endpoints ===\n");

  // 1. Test Quote Preflight OPTIONS
  const optRes = await quoteOptions();
  console.log("[Test 1] Quote OPTIONS status:", optRes.status);
  console.log("CORS Header Access-Control-Allow-Origin:", optRes.headers.get("Access-Control-Allow-Origin"));

  // 2. Test Quote Generation POST /api/widget/quote
  console.log("\n[Test 2] Requesting 21 Sats Mint Quote...");
  const quoteReq = new Request("http://localhost:3000/api/widget/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 21, mintUrl: "https://testnut.cashu.space" }),
  });

  const quoteRes = await quotePost(quoteReq);
  const quoteData = await quoteRes.json();
  console.log("Status:", quoteRes.status);
  console.log("Quote response:", {
    quoteId: quoteData.quoteId,
    invoicePrefix: quoteData.invoice?.substring(0, 20),
    amountSats: quoteData.amountSats,
    isMock: quoteData.isMock,
  });

  if (!quoteData.quoteId || !quoteData.invoice) {
    throw new Error("Quote generation did not return quoteId or invoice");
  }

  // 3. Test Claim POST /api/widget/claim
  const targetPubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"; // fiatjaf
  console.log(`\n[Test 3] Simulating NutZap claim for pubkey: ${targetPubkey}`);

  const beforeTotals = await getZapTotalsFromDb(targetPubkey);
  console.log("Before totals:", beforeTotals);

  const claimReq = new Request("http://localhost:3000/api/widget/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteId: quoteData.quoteId,
      amountSats: 21,
      recipientPubkey: targetPubkey,
      comment: "Grant Test NutZap 🥜⚡",
      isMock: true,
    }),
  });

  const claimRes = await claimPost(claimReq);
  const claimData = await claimRes.json();
  console.log("Status:", claimRes.status);
  console.log("Claim response:", claimData);

  const afterTotals = await getZapTotalsFromDb(targetPubkey);
  console.log("After totals:", afterTotals);

  if (afterTotals && beforeTotals && afterTotals.total_sats > beforeTotals.total_sats) {
    console.log("--> SQLite zap_totals successfully accumulated in local DB!");
  }

  console.log("\n=== Widget Backend Endpoints Successfully Verified ===");
}

main().catch(console.error);
