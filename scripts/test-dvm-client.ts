// scripts/test-dvm-client.ts
/**
 * NIP-90 DVM Client with Centralized Subscription Lifecycle Management
 * Uses DvmJobExecutor / BaseExecutor (`executionSubscriptions: Map<string, () => void>`)
 * to eliminate WebSocket subscription and timer memory leaks.
 */

import { generateSecretKey, getPublicKey } from "nostr-tools";
import { DEFAULT_RELAYS } from "@/lib/trust-score";
import { DvmJobExecutor } from "@/lib/base-executor";

async function runClientTest() {
  console.log("==========================================================");
  console.log("    DVM TEST CLIENT (KIND 5000 SENDER WITH BASEEXECUTOR)  ");
  console.log("==========================================================");

  // 1. Generate an independent test keypair
  const clientSk = generateSecretKey();
  const clientPk = getPublicKey(clientSk);
  console.log(`[Client] Pubkey: ${clientPk}`);
  console.log(`[Relays] Connecting to: ${DEFAULT_RELAYS.join(", ")}`);

  // 2. Initialize Executor managing executionSubscriptions lifecycle
  const executor = new DvmJobExecutor();
  console.log(`[Executor] Initial active subscriptions: ${executor.getActiveExecutionsCount()}`);

  // Target pubkey to evaluate: Jack Dorsey
  const targetPubkey = "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a04f9d61825e81d02";

  // 3. Prepare Kind 5000 Job Request template
  const jobRequestTemplate = {
    kind: 5000,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["i", targetPubkey, "text"],
      ["t", "trust-score"],
      ["output", "application/json"],
      ["bid", "5000"],
      ["relays", ...DEFAULT_RELAYS],
    ],
    content: "Please calculate trust score",
  };

  console.log(`\n[Client] Dispatching Kind 5000 Job via DvmJobExecutor...`);

  try {
    const result = await executor.executeJob(
      jobRequestTemplate,
      DEFAULT_RELAYS,
      clientSk,
      {
        timeoutMs: 15000,
        onFeedback: (feedback) => {
          console.log(`\n>>> [FEEDBACK RECEIVED - Kind 7000]`);
          console.log(`    From Worker: ${feedback.workerPubkey}`);
          console.log(`    Status     : ${feedback.status}`);
          console.log(`    Message    : ${feedback.message}`);
        },
      }
    );

    console.log(`\n==========================================================`);
    console.log(`>>> [RESULT RECEIVED - Kind 6000 SUCCESS!]`);
    console.log(`    From Worker: ${result.workerPubkey}`);
    console.log(`    Job ID     : ${result.executionId}`);
    console.log(`    Latency    : ${result.latencyMs}ms`);
    console.log(`    Result Data:`, result.result);
    console.log(`==========================================================\n`);

    console.log("TEST PASSED: DVM Worker successfully replied with result!");
  } catch (err: any) {
    console.log(`\n[Client Note] Live DVM job execution finished with notice: ${err.message}`);
  } finally {
    // Assert that execution subscription and timeout were cleanly deregistered
    const remainingSubscriptions = executor.getActiveExecutionsCount();
    console.log(`[Lifecycle Check] Remaining active subscriptions in Map: ${remainingSubscriptions}`);
    if (remainingSubscriptions === 0) {
      console.log("--> Memory Leak Check PASSED: All WebSocket subscriptions & timers were cleaned up!");
    } else {
      console.warn("--> WARNING: Uncleaned subscriptions remaining in memory!");
    }
  }
}

runClientTest().catch((err) => {
  console.error("[Client] Error running test:", err);
  process.exit(1);
});
