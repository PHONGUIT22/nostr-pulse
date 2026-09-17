// scripts/test-executor-lifecycle.ts
/**
 * Concurrency & Memory Leak Verification Test for BaseExecutor
 * Simulates 50 concurrent agent requests to verify that all subscriptions
 * and timers in `executionSubscriptions` and `executionTimeouts` are cleanly destroyed.
 */

import { BaseExecutor } from "../src/lib/base-executor";

// Test implementation of BaseExecutor to stress-test subscription mapping
class MockAgentExecutor extends BaseExecutor {
  public simulateAgentRequest(
    executionId: string,
    timeoutMs: number,
    resolutionMs: number
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let isClosed = false;

      // Simulated WebSocket subscription close callback
      const mockSubClose = () => {
        isClosed = true;
      };

      this.registerExecution(
        executionId,
        mockSubClose,
        timeoutMs,
        () => {
          reject(new Error(`Timeout for ${executionId}`));
        }
      );

      // Simulate network / DVM resolution
      if (resolutionMs <= timeoutMs) {
        setTimeout(() => {
          this.cleanupExecution(executionId);
          resolve(`Result for ${executionId}`);
        }, resolutionMs);
      }
    });
  }

  public getActiveCount(): number {
    return this.getActiveExecutionsCount();
  }

  public hasSubscription(id: string): boolean {
    return this.isExecutionActive(id);
  }
}

async function main() {
  console.log("=== Testing BaseExecutor Lifecycle & 50-Agent Concurrency ===\n");

  const executor = new MockAgentExecutor();

  // -------------------------------------------------------------------------
  // Test 1: Single execution register and cleanup
  // -------------------------------------------------------------------------
  console.log("[Test 1] Testing single execution lifecycle...");
  const execId1 = "exec_single_1";
  const p1 = executor.simulateAgentRequest(execId1, 1000, 100);

  console.log("Active count during execution:", executor.getActiveCount());
  if (!executor.hasSubscription(execId1)) {
    throw new Error("Expected execution to be registered in Map");
  }

  const res1 = await p1;
  console.log("Received result:", res1);
  console.log("Active count after cleanup:", executor.getActiveCount());

  if (executor.getActiveCount() !== 0) {
    throw new Error("Expected 0 active executions after cleanup");
  }
  console.log("--> Single execution cleanup: PASSED\n");

  // -------------------------------------------------------------------------
  // Test 2: Timeout cleanup verification
  // -------------------------------------------------------------------------
  console.log("[Test 2] Testing execution timeout cleanup...");
  const execIdTimeout = "exec_timeout_1";
  try {
    // Timeout in 150ms, resolution would take 1000ms
    await executor.simulateAgentRequest(execIdTimeout, 150, 1000);
    throw new Error("Expected request to time out");
  } catch (err: any) {
    console.log("Caught expected timeout error:", err.message);
  }

  console.log("Active count after timeout cleanup:", executor.getActiveCount());
  if (executor.getActiveCount() !== 0) {
    throw new Error("Expected 0 active executions after timeout");
  }
  console.log("--> Timeout cleanup: PASSED\n");

  // -------------------------------------------------------------------------
  // Test 3: 50 Concurrent Agent Requests (Concurrency Stress Test)
  // -------------------------------------------------------------------------
  console.log("[Test 3] Simulating 50 Concurrent Agent Requests...");
  const CONCURRENT_AGENTS = 50;
  const promises: Promise<any>[] = [];

  for (let i = 1; i <= CONCURRENT_AGENTS; i++) {
    const agentExecutionId = `agent_req_${i}_${Date.now()}`;
    // Half resolve fast, half test varying delays
    const resolutionDelay = 50 + (i % 10) * 20;
    const timeout = 1000;

    promises.push(
      executor.simulateAgentRequest(agentExecutionId, timeout, resolutionDelay)
    );
  }

  console.log(`Peak concurrent subscriptions registered in Map: ${executor.getActiveCount()}`);
  if (executor.getActiveCount() !== CONCURRENT_AGENTS) {
    throw new Error(`Expected ${CONCURRENT_AGENTS} registered executions in Map, got ${executor.getActiveCount()}`);
  }

  const allResults = await Promise.all(promises);
  console.log(`Successfully completed all ${allResults.length} concurrent agent requests!`);

  console.log(`Final remaining subscriptions in Map: ${executor.getActiveCount()}`);
  if (executor.getActiveCount() !== 0) {
    throw new Error(`Memory leak detected! ${executor.getActiveCount()} dangling subscriptions remain.`);
  }
  console.log("--> 50-Agent Concurrency Stress Test: PASSED (0 memory leaks)\n");

  // -------------------------------------------------------------------------
  // Test 4: cleanupAllExecutions batch purge
  // -------------------------------------------------------------------------
  console.log("[Test 4] Testing cleanupAllExecutions emergency shutdown...");
  for (let i = 1; i <= 10; i++) {
    executor.simulateAgentRequest(`dangling_${i}`, 10000, 10000).catch(() => {});
  }
  console.log("Registered 10 long-running dangling requests. Count:", executor.getActiveCount());
  executor.cleanupAllExecutions();
  console.log("Count after cleanupAllExecutions():", executor.getActiveCount());
  if (executor.getActiveCount() !== 0) {
    throw new Error("Expected 0 executions after cleanupAllExecutions");
  }
  console.log("--> cleanupAllExecutions purge: PASSED\n");

  console.log("=== ALL BaseExecutor Lifecycle Tests PASSED Successfully! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
