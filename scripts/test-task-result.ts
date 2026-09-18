// scripts/test-task-result.ts
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { sendCashuNutZap, DEFAULT_CASHU_MINT } from "@/lib/cashu";

async function main() {
  console.log("==========================================================");
  console.log("       TESTING TASKRESULTVIEW NUTZAP SETTLEMENT FLOW      ");
  console.log("==========================================================\n");

  const workerSk = generateSecretKey();
  const workerPk = getPublicKey(workerSk);

  console.log(`[Worker] Recipient Pubkey: ${workerPk}`);

  // Test token format (mock v3 payload with valid structure)
  const mockToken = {
    token: [
      {
        mint: DEFAULT_CASHU_MINT,
        proofs: [
          {
            id: "009a1f293252e123",
            amount: 5,
            secret: "test_secret_for_nutzap_flow",
            C: "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
          },
        ],
      },
    ],
    unit: "sat",
  };

  const base64 = Buffer.from(JSON.stringify(mockToken)).toString("base64");
  const cashuToken = `cashuA${base64.replace(/\+/g, "-").replace(/\//g, "_")}`;

  console.log("[NutZap] Executing sendCashuNutZap to worker...");
  const { signedEvent: zapEvent, changeToken } = await sendCashuNutZap({
    recipientPubkey: workerPk,
    cashuToken,
    amountSats: 5,
    comment: "Accepted & Settled NIP-90 Job #test-job 🥜",
    mintUrl: DEFAULT_CASHU_MINT,
  });

  console.log("\n==========================================================");
  console.log(">>> sendCashuNutZap SUCCESS!");
  console.log(`    Event ID : ${zapEvent.id}`);
  console.log(`    Kind     : ${zapEvent.kind} (NIP-61 NutZap)`);
  console.log(`    Change   : ${changeToken ? "Change token generated" : "Exact payment (no change)"}`);
  console.log(`    Recipient: ${workerPk}`);
  console.log(`    Amount   : 5000 msats (5 sats)`);
  console.log("==========================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
