// src/lib/base-executor.ts
/**
 * BaseExecutor & DVM Execution Lifecycle Manager
 *
 * Implements centralized subscription lifecycle and timeout management for NIP-90 DVM jobs.
 * Prevents memory leaks and dangling WebSocket connections across concurrent agent requests
 * using the `executionSubscriptions: Map<string, () => void>` pattern.
 */

import { SimplePool, finalizeEvent, generateSecretKey, type Event, type EventTemplate } from "nostr-tools";
import { getNostrPool, DEFAULT_RELAYS, normalizeToHex } from "./nostr";
import { DVM_KINDS } from "./dvm";

export interface ExecutionOptions {
  timeoutMs?: number;
  onFeedback?: (feedback: { status: string; message: string; workerPubkey: string }) => void;
}

export interface DvmExecutionResult<T = any> {
  executionId: string;
  workerPubkey: string;
  result: T;
  rawContent: string;
  latencyMs: number;
}

/**
 * Abstract BaseExecutor managing active WebSocket subscriptions and timeouts.
 * Extracted and generalized from dvmcp-discovery/src/base-executor.ts
 */
export abstract class BaseExecutor {
  /** Map tracking active execution IDs to their respective teardown/cleanup functions */
  protected executionSubscriptions: Map<string, () => void> = new Map();

  /** Map tracking active timer handles for timeout management */
  protected executionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Cleans up an active execution by calling its teardown callback and deleting it from state.
   *
   * @param executionId - Unique identifier of the job/task (e.g. Nostr Job Event ID)
   */
  public cleanupExecution(executionId: string): void {
    // 1. Clear any pending timeout timer
    const timeoutHandle = this.executionTimeouts.get(executionId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.executionTimeouts.delete(executionId);
    }

    // 2. Execute the registered cleanup function (e.g. sub.close())
    const cleanupFn = this.executionSubscriptions.get(executionId);
    if (cleanupFn) {
      try {
        cleanupFn();
      } catch (err) {
        console.debug(`[BaseExecutor] Error in cleanup function for execution ${executionId}:`, err);
      }
      this.executionSubscriptions.delete(executionId);
    }
  }

  /**
   * Registers a cleanup callback and an optional timeout for a given execution ID.
   *
   * @param executionId - Unique identifier of the execution
   * @param cleanupFn - Teardown function to close WebSocket subscription or release resources
   * @param timeoutMs - Optional timeout in milliseconds
   * @param onTimeout - Optional callback triggered when timeout occurs
   */
  public registerExecution(
    executionId: string,
    cleanupFn: () => void,
    timeoutMs?: number,
    onTimeout?: () => void
  ): void {
    // If an existing execution with this ID is active, clean it up first
    if (this.executionSubscriptions.has(executionId)) {
      this.cleanupExecution(executionId);
    }

    this.executionSubscriptions.set(executionId, cleanupFn);

    if (timeoutMs && timeoutMs > 0) {
      const timer = setTimeout(() => {
        this.executionTimeouts.delete(executionId);
        if (onTimeout) {
          try {
            onTimeout();
          } catch (err) {
            console.debug(`[BaseExecutor] Error in onTimeout handler for ${executionId}:`, err);
          }
        }
        this.cleanupExecution(executionId);
      }, timeoutMs);

      this.executionTimeouts.set(executionId, timer);
    }
  }

  /**
   * Teardown all active subscriptions and clear all timers across the executor.
   * Used during server shutdown or test resets to prevent memory leaks.
   */
  public cleanupAllExecutions(): void {
    // Clear all timers
    for (const timer of this.executionTimeouts.values()) {
      clearTimeout(timer);
    }
    this.executionTimeouts.clear();

    // Run all subscription cleanups
    for (const [id, cleanupFn] of this.executionSubscriptions.entries()) {
      try {
        cleanupFn();
      } catch (err) {
        console.debug(`[BaseExecutor] Error cleaning up subscription ${id}:`, err);
      }
    }
    this.executionSubscriptions.clear();
  }

  /**
   * Returns the count of currently active executions/subscriptions
   */
  public getActiveExecutionsCount(): number {
    return this.executionSubscriptions.size;
  }

  /**
   * Checks if an execution is currently registered and active
   */
  public isExecutionActive(executionId: string): boolean {
    return this.executionSubscriptions.has(executionId);
  }

  /**
   * Returns a list of all active execution IDs
   */
  public getActiveExecutionIds(): string[] {
    return Array.from(this.executionSubscriptions.keys());
  }
}

/**
 * Concrete DvmJobExecutor implementing NIP-90 job execution with strict lifecycle management.
 */
export class DvmJobExecutor extends BaseExecutor {
  private pool: SimplePool;

  constructor(pool?: SimplePool) {
    super();
    this.pool = pool || getNostrPool();
  }

  /**
   * Dispatches a NIP-90 job request to relays, automatically managing WebSocket subscription
   * lifecycle and timeout cleanup through `this.executionSubscriptions`.
   *
   * @param jobTemplate - NIP-90 EventTemplate (Kind 5000 / 5300)
   * @param relays - Target Nostr relays
   * @param secretKey - Ephemeral or client secret key
   * @param options - Execution timeout and feedback callbacks
   */
  public async executeJob<T = any>(
    jobTemplate: EventTemplate,
    relays: string[] = DEFAULT_RELAYS,
    secretKey?: Uint8Array,
    options: ExecutionOptions = {}
  ): Promise<DvmExecutionResult<T>> {
    const sk = secretKey || generateSecretKey();
    const signedEvent = finalizeEvent(jobTemplate, sk);
    const executionId = signedEvent.id;
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 25000;

    return new Promise<DvmExecutionResult<T>>((resolve, reject) => {
      let isSettled = false;

      // 1. Subscribe to Kind 6000/6300 (Result) and Kind 7000 (Feedback)
      const subFilter = {
        kinds: [
          DVM_KINDS.JOB_RESULT_DATA_ANALYSIS,
          DVM_KINDS.JOB_RESULT_COMPUTE,
          DVM_KINDS.JOB_FEEDBACK,
        ],
        "#e": [executionId],
        since: Math.floor(Date.now() / 1000) - 10,
      };

      let sub: any = null;

      try {
        sub = this.pool.subscribeMany(relays, subFilter, {
          onevent: (event: Event) => {
            // Kind 7000: Job Feedback
            if (event.kind === DVM_KINDS.JOB_FEEDBACK) {
              const statusTag = event.tags.find((t) => t[0] === "status")?.[1] || "processing";
              if (options.onFeedback) {
                options.onFeedback({
                  status: statusTag,
                  message: event.content || "",
                  workerPubkey: event.pubkey,
                });
              }
              return;
            }

            // Kind 6000 or 6300: Job Result
            if (
              event.kind === DVM_KINDS.JOB_RESULT_COMPUTE ||
              event.kind === DVM_KINDS.JOB_RESULT_DATA_ANALYSIS
            ) {
              if (isSettled) return;
              isSettled = true;

              let parsedResult: any = event.content;
              try {
                parsedResult = JSON.parse(event.content);
              } catch {}

              const executionResult: DvmExecutionResult<T> = {
                executionId,
                workerPubkey: event.pubkey,
                result: parsedResult,
                rawContent: event.content,
                latencyMs: Date.now() - startTime,
              };

              // Clean up subscription & timeout immediately
              this.cleanupExecution(executionId);
              resolve(executionResult);
            }
          },
        });
      } catch (subErr) {
        reject(subErr);
        return;
      }

      // 2. Register subscription into centralized lifecycle manager
      this.registerExecution(
        executionId,
        () => {
          try {
            if (sub) sub.close();
          } catch (err) {
            console.debug(`[DvmJobExecutor] Error closing subscription for ${executionId}:`, err);
          }
        },
        timeoutMs,
        () => {
          if (!isSettled) {
            isSettled = true;
            reject(
              new Error(
                `[DvmJobExecutor] Execution ${executionId} timed out after ${timeoutMs}ms without response.`
              )
            );
          }
        }
      );

      // 3. Publish the job request to relays
      Promise.allSettled(this.pool.publish(relays, signedEvent)).then((pubResults) => {
        const hasSuccess = pubResults.some((r) => r.status === "fulfilled");
        if (!hasSuccess) {
          if (!isSettled) {
            isSettled = true;
            this.cleanupExecution(executionId);
            reject(new Error(`[DvmJobExecutor] Failed to publish job ${executionId} to any relay.`));
          }
        }
      });
    });
  }
}

// Global default singleton executor instance
export const globalDvmExecutor = new DvmJobExecutor();
