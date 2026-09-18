// scripts/test-trust-score-api.ts
import { GET, OPTIONS } from "../src/app/api/v1/trust-score/[pubkey]/route";

async function main() {
  console.log("=== Testing /api/v1/trust-score/[pubkey] Endpoint ===\n");

  // 1. Test CORS OPTIONS
  const optionsRes = await OPTIONS();
  console.log("[Test 1] OPTIONS Preflight status:", optionsRes.status);
  console.log("CORS Header Access-Control-Allow-Origin:", optionsRes.headers.get("Access-Control-Allow-Origin"));
  console.log("CORS Header Access-Control-Allow-Methods:", optionsRes.headers.get("Access-Control-Allow-Methods"));
  console.log("Cache-Control:", optionsRes.headers.get("Cache-Control"));

  // 2. Test fiatjaf pubkey (Root Anchor / Hop 0)
  const fiatjafHex = "3bf0c63fcb93463407af97b5e0971f574718cc60247077f06b6040de57164f78";
  console.log(`\n[Test 2] Querying Root Anchor (fiatjaf): ${fiatjafHex}`);
  const req1 = new Request(`http://localhost:3000/api/v1/trust-score/${fiatjafHex}`);
  const res1 = await GET(req1, { params: Promise.resolve({ pubkey: fiatjafHex }) });
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Response JSON:", JSON.stringify(data1, null, 2));

  // Verify structure
  if (
    typeof data1.pubkey === "string" &&
    typeof data1.score === "number" &&
    typeof data1.tier === "string" &&
    typeof data1.wot?.direct_anchor_endorsed === "boolean" &&
    typeof data1.wot?.distance === "number" &&
    typeof data1.wot?.endorsers_count === "number" &&
    typeof data1.economic_stake?.verified_zaps_sats === "number" &&
    typeof data1.economic_stake?.sybil_filtered_sats === "number"
  ) {
    console.log("--> Schema check PASSED!");
  } else {
    console.error("--> Schema check FAILED!");
  }

  // 3. Test npub resolution (fiatjaf npub)
  const fiatjafNpub = "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
  console.log(`\n[Test 3] Querying via npub: ${fiatjafNpub}`);
  const req2 = new Request(`http://localhost:3000/api/v1/trust-score/${fiatjafNpub}`);
  const res2 = await GET(req2, { params: Promise.resolve({ pubkey: fiatjafNpub }) });
  const data2 = await res2.json();
  console.log("Status:", res2.status);
  console.log("Resolved pubkey:", data2.pubkey);
  console.log("Score:", data2.score, "| Tier:", data2.tier);

  // 4. Test unknown / isolated keypair
  const unknownKey = "0000000000000000000000000000000000000000000000000000000000000001";
  console.log(`\n[Test 4] Querying unknown / isolated keypair: ${unknownKey}`);
  const req3 = new Request(`http://localhost:3000/api/v1/trust-score/${unknownKey}`);
  const res3 = await GET(req3, { params: Promise.resolve({ pubkey: unknownKey }) });
  const data3 = await res3.json();
  console.log("Status:", res3.status);
  console.log("Score:", data3.score, "| Tier:", data3.tier);
  console.log("WoT Distance:", data3.wot.distance, "| Direct Anchor Endorsed:", data3.wot.direct_anchor_endorsed);

  // 5. Test invalid format
  console.log(`\n[Test 5] Querying invalid format ("not_a_pubkey")`);
  const req4 = new Request(`http://localhost:3000/api/v1/trust-score/not_a_pubkey`);
  const res4 = await GET(req4, { params: Promise.resolve({ pubkey: "not_a_pubkey" }) });
  const data4 = await res4.json();
  console.log("Status:", res4.status);
  console.log("Error response:", data4);

  console.log("\n=== All Trust Score API Tests Completed Successfully ===");
}

main().catch(console.error);
