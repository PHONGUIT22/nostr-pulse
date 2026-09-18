// scripts/test-agent-local.ts
import { parseAgentIntent, resolveCreatorTarget, executeLocalNutZap, DEMO_TESTNUT_TOKEN } from "../src/lib/agent-runner";

async function runTests() {
  console.log("=== TEST 1: INTENT PARSER ===");
  const testPrompts = [
    "Tip 21 sats to jb55",
    "Lookup profile for fiatjaf",
    "Lookup profile for satoshi",
    "Send 50 sats NutZap to Jack",
    "Check your current wallet budget balance",
    "Audit mint guardrails",
    "Who is odell",
    "Send 100 sats to jb55",
  ];

  for (const p of testPrompts) {
    const intent = parseAgentIntent(p);
    console.log(`Prompt: "${p}" -> Action: ${intent.action}, Target: ${intent.recipientQuery}, Amount: ${intent.amountSats} sats`);
  }

  console.log("\n=== TEST 2: RESOLVE CREATOR ===");
  const resolved = await resolveCreatorTarget("jb55");
  console.log("Resolved jb55:", {
    query: resolved.query,
    hexPubkey: resolved.hexPubkey,
    isValidHex: resolved.isValidHex,
    name: resolved.creator?.name,
    handle: resolved.creator?.handle,
    wotHop: resolved.wot?.distance,
    trustScore: resolved.wot?.normalizedScore,
  });

  const resolvedSatoshi = await resolveCreatorTarget("satoshi");
  console.log("Resolved satoshi:", {
    query: resolvedSatoshi.query,
    hexPubkey: resolvedSatoshi.hexPubkey,
    isValidHex: resolvedSatoshi.isValidHex,
    name: resolvedSatoshi.creator?.name,
    handle: resolvedSatoshi.creator?.handle,
  });

  console.log("\n=== TEST 3: EXECUTE DEMO NUTZAP ===");
  const zapRes = await executeLocalNutZap({
    recipientPubkey: resolved.hexPubkey,
    amountSats: 21,
    sessionToken: DEMO_TESTNUT_TOKEN,
    comment: "Test 21 sats demo NutZap",
  });
  console.log("Demo NutZap Result:", {
    success: zapRes.success,
    eventId: zapRes.eventId,
    amountSats: zapRes.amountSats,
    message: zapRes.message,
    error: zapRes.error,
  });

  console.log("\n=== TEST 4: SSE UI STREAM VERIFICATION ===");
  const { executeLocalAutonomousStream } = await import("../src/lib/agent-runner");
  const streamRes = executeLocalAutonomousStream({
    prompt: "Tip 21 sats to jb55",
    sessionToken: DEMO_TESTNUT_TOKEN,
  });
  console.log("Stream Response Status:", streamRes.status, streamRes.headers.get("content-type"));

  const reader = streamRes.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let streamText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamText += decoder.decode(value, { stream: true });
    }
    console.log("Stream Chunks Received:\n", streamText.slice(0, 500), "\n... (length:", streamText.length, "bytes)");
    
    // Check if tool-output-available and NIP-61 event is present in the stream
    if (streamText.includes("find_creator") && streamText.includes("execute_nutzap") && streamText.includes("32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245")) {
      console.log("\n🎉 SSE UI STREAM PERFECTLY EMITTED BOTH TOOLS AND NIP-61 EVENT!");
    } else {
      console.error("\n❌ STREAM DID NOT CONTAIN EXPECTED TOOL DATA");
      process.exit(1);
    }
  }

  if (zapRes.success && resolved.isValidHex) {
    console.log("\n✅ ALL LOCAL ENGINE TESTS PASSED WITH 100% SUCCESS!");
  } else {
    console.error("\n❌ TESTS FAILED:", zapRes);
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
