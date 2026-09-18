#!/usr/bin/env node
import {
  getSpendingSummary,
  recordAgentSpending
} from "./chunk-P5CMUG5H.js";
import {
  MAJOR_INDEXER_RELAYS,
  decodeBolt11AmountSats
} from "./chunk-EALAT4FZ.js";
import {
  assertSpendingAllowed,
  getRolling24hSpend,
  getSpendingPolicy
} from "./chunk-KE5YZBLK.js";
import {
  getAgentTelemetrySummary,
  getTelemetryOverview,
  logAgentEvent,
  logTelemetryEvent,
  queryTelemetryEvents
} from "./chunk-LNEBNG6B.js";
import {
  getOrInitAgentIdentity
} from "./chunk-5WBKDHXQ.js";
import {
  payWithNWC
} from "./chunk-TIRW26YG.js";
import {
  DEFAULT_CASHU_MINT,
  auditCashuMint,
  createCashuMintQuote,
  parseCashuToken,
  routeCashuMint,
  sendCashuNutZap
} from "./chunk-3T5VUZXK.js";
import "./chunk-CDTDPUJF.js";
import {
  calculateTrustScore
} from "./chunk-TEBCT7SR.js";
import {
  encodeNpub,
  getWebOfTrustDistance,
  normalizePubkey
} from "./chunk-RI52V5BR.js";
import {
  accumulateZapTotals,
  getCreatorFromDb,
  getTrustEdgesFromDb,
  getZapTotalsFromDb,
  initDatabase,
  recordZapEdge,
  upsertZapTotals
} from "./chunk-UEOH474S.js";
import {
  DEFAULT_RELAYS,
  getNostrPool,
  normalizeToHex
} from "./chunk-PIGNIESQ.js";
import "./chunk-A334PT4L.js";

// src/mcp-entry.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z as z2 } from "zod";

// src/lib/dvm.ts
import { finalizeEvent as finalizeEvent2, generateSecretKey as generateSecretKey2, nip19 } from "nostr-tools";

// src/lib/tool-registry.ts
import { z } from "zod";
function mapJsonSchemaToZod(schema) {
  if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
    return { _: z.object({}).optional() };
  }
  const properties = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (typeof prop === "object" && prop && "type" in prop) {
      let zodType;
      switch (prop.type) {
        case "string":
          if (Array.isArray(prop.enum) && prop.enum.length > 0) {
            zodType = z.enum(prop.enum.map(String));
          } else {
            zodType = z.string();
          }
          break;
        case "number":
          zodType = z.number();
          break;
        case "integer":
          zodType = z.number().int();
          break;
        case "boolean":
          zodType = z.boolean();
          break;
        case "array":
          zodType = z.array(z.any());
          break;
        case "object":
          zodType = z.record(z.string(), z.any());
          break;
        default:
          zodType = z.any();
      }
      if (typeof prop.description === "string" && prop.description.trim()) {
        zodType = zodType.describe(prop.description.trim());
      }
      properties[key] = Array.isArray(schema.required) && schema.required.includes(key) ? zodType : zodType.optional();
    }
  }
  return properties;
}
var ToolRegistry = class {
  constructor() {
    this.tools = /* @__PURE__ */ new Map();
  }
  /**
   * Internal converter from JSON Schema to ZodRawShape (extracted from dvmcp-discovery)
   */
  mapJsonSchemaToZod(schema) {
    return mapJsonSchemaToZod(schema);
  }
  /**
   * Registers an arbitrary Tool into the registry
   */
  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }
  /**
   * Retrieves a registered tool by name
   */
  getTool(name) {
    return this.tools.get(name);
  }
  /**
   * Returns all registered tools
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }
  /**
   * Converts a DVM Worker announcement (NIP-89) into a validated registered Tool.
   * Uses mapJsonSchemaToZod to ensure schema compatibility with MCP runtime.
   */
  registerDvmWorkerCapability(announcement) {
    const toolName = (announcement.identifier || announcement.name).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const fallbackSchema = {
      type: "object",
      properties: {
        pubkey: {
          type: "string",
          description: "Nostr public key (hex or npub) to query"
        },
        category: {
          type: "string",
          description: "Analysis category (e.g. zap-analytics, reputation)"
        }
      },
      required: ["pubkey"]
    };
    const inputSchema = announcement.inputSchema || fallbackSchema;
    const tool = {
      name: toolName,
      description: announcement.about || `DVM Analytics Tool powered by Nostr DVM ${announcement.pubkey.slice(0, 8)}...`,
      inputSchema,
      dvmPubkey: announcement.pubkey,
      supportedKinds: announcement.supportedKinds,
      relays: announcement.relays,
      execute: announcement.execute
    };
    this.registerTool(tool);
    return tool;
  }
  /**
   * Binds all registered tools to an MCP Server instance.
   * Uses mapJsonSchemaToZod to pass the required Zod raw shape for parameter validation.
   *
   * @param server - McpServer instance from @modelcontextprotocol/sdk
   * @param allowedTools - Optional array of tool names to filter which tools get registered
   */
  registerToMcpServer(server, allowedTools2) {
    const allowedSet = allowedTools2 ? new Set(allowedTools2) : null;
    for (const tool of this.tools.values()) {
      if (allowedSet && !allowedSet.has(tool.name)) {
        continue;
      }
      if (server._registeredTools?.[tool.name]) {
        continue;
      }
      const zodRawShape = this.mapJsonSchemaToZod(tool.inputSchema);
      server.tool(
        tool.name,
        tool.description,
        zodRawShape,
        async (args) => {
          try {
            if (tool.execute) {
              const result = await tool.execute(args);
              return {
                content: [
                  {
                    type: "text",
                    text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
                  }
                ]
              };
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    tool: tool.name,
                    status: "dispatched",
                    args,
                    dvmPubkey: tool.dvmPubkey
                  })
                }
              ]
            };
          } catch (err) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error executing tool ${tool.name}: ${err?.message || String(err)}`
                }
              ],
              isError: true
            };
          }
        }
      );
    }
  }
  /**
   * Generates a Zod object validator from a tool's input schema
   */
  getZodValidator(toolName) {
    const tool = this.tools.get(toolName);
    if (!tool) return null;
    return z.object(this.mapJsonSchemaToZod(tool.inputSchema));
  }
};
var globalToolRegistry = new ToolRegistry();
globalToolRegistry.registerTool({
  name: "pay_lightning_nwc",
  description: "Pay a BOLT-11 Lightning invoice via NIP-47 Nostr Wallet Connect.",
  inputSchema: {
    type: "object",
    properties: {
      invoice: {
        type: "string",
        description: "BOLT-11 Lightning invoice."
      },
      nwcUri: {
        type: "string",
        description: "Explicit NWC connection URI (falls back to env NWC_CONNECTION_URI)."
      },
      timeoutMs: {
        type: "integer",
        description: "Timeout in milliseconds (default: 15000)"
      },
      amountMsat: {
        type: "integer",
        description: "Optional amount in millisatoshis for amountless invoices"
      }
    },
    required: ["invoice"]
  },
  execute: async (args) => {
    const { assertSpendingAllowed: assertSpendingAllowed2 } = await import("./guardrails-NOP2T7LB.js");
    const { logAgentEvent: logAgentEvent2 } = await import("./telemetry-6KUR4ZVW.js");
    const { decodeBolt11AmountSats: decodeBolt11AmountSats2 } = await import("./indexer-YEF6LIRC.js");
    const { payWithNWC: payWithNWC2 } = await import("./nwc-MZICHVJ7.js");
    const amountSats = args.amountMsat && args.amountMsat > 0 ? Math.round(args.amountMsat / 1e3) : decodeBolt11AmountSats2(args.invoice) || 1;
    const guardrail = await assertSpendingAllowed2({
      amountSats,
      rail: "nwc"
    });
    if (!guardrail.allowed) {
      await logAgentEvent2({
        type: "radar_block",
        data: {
          amountSats,
          rail: "nwc",
          invoice: args.invoice,
          reason: guardrail.reason
        }
      });
      return {
        status: "blocked_by_guardrails",
        reason: guardrail.reason
      };
    }
    const res = await payWithNWC2({
      invoice: args.invoice,
      nwcUri: args.nwcUri,
      timeoutMs: args.timeoutMs,
      amountMsat: args.amountMsat
    });
    if (res.status === "success") {
      await logAgentEvent2({
        type: "payment",
        data: {
          amountSats,
          rail: "nwc",
          invoice: args.invoice,
          preimage: res.preimage,
          feesPaidSats: res.fees_paid,
          responseEventId: res.responseEventId,
          status: "settled"
        }
      });
    }
    return res;
  }
});
globalToolRegistry.registerTool({
  name: "audit_cashu_mint",
  description: "Audit Cashu mint health, NUT-06 status, and counterparty risk score.",
  inputSchema: {
    type: "object",
    properties: {
      mintUrl: {
        type: "string",
        description: "Target Cashu mint URL (e.g., https://mint.minibits.cash/Bitcoin)."
      },
      forceRefresh: {
        type: "boolean",
        description: "Bypass in-memory audit cache and perform fresh live probe (default: false)"
      }
    },
    required: ["mintUrl"]
  },
  execute: async (args) => {
    const { auditCashuMint: auditCashuMint2 } = await import("./mint-mesh-BOHNGSHO.js");
    return auditCashuMint2(args.mintUrl, args.forceRefresh);
  }
});
globalToolRegistry.registerTool({
  name: "route_cashu_mint",
  description: "Route to the highest-trust, lowest-latency Cashu mint for a payment.",
  inputSchema: {
    type: "object",
    properties: {
      amountSats: {
        type: "integer",
        description: "Intended payment or minting amount in Satoshis"
      },
      preferredMint: {
        type: "string",
        description: "Optional preferred mint URL to prioritize if verified and healthy"
      },
      minTrustScore: {
        type: "integer",
        description: "Minimum WoT Trust Score required to pass the security gate (default: 45)"
      }
    }
  },
  execute: async (args) => {
    const { routeCashuMint: routeCashuMint2 } = await import("./mint-mesh-BOHNGSHO.js");
    return routeCashuMint2({
      amountSats: args.amountSats,
      preferredMint: args.preferredMint,
      minTrustScore: args.minTrustScore
    });
  }
});
globalToolRegistry.registerTool({
  name: "get_agent_identity",
  description: "Get the autonomous agent's Nostr public identity and npub.",
  inputSchema: {
    type: "object",
    properties: {}
  },
  execute: async () => {
    const { getOrInitAgentIdentity: getOrInitAgentIdentity2 } = await import("./identity-manager-E4SUCG4A.js");
    const identity = getOrInitAgentIdentity2();
    return {
      pubkey: identity.pubkey,
      npub: identity.npub,
      source: identity.source,
      isEphemeral: identity.isEphemeral,
      createdAt: identity.createdAt
    };
  }
});
globalToolRegistry.registerTool({
  name: "get_spending_guardrails",
  description: "Check current AI agent spending budget, daily limits, and remaining satoshis.",
  inputSchema: {
    type: "object",
    properties: {}
  },
  execute: async () => {
    const { getSpendingSummary: getSpendingSummary2 } = await import("./spending-guardrails-JBHMPSDX.js");
    return getSpendingSummary2();
  }
});
globalToolRegistry.registerTool({
  name: "get_agent_telemetry",
  description: "Retrieve agent telemetry metrics, rolling spend volume, and security events.",
  inputSchema: {
    type: "object",
    properties: {
      timeframeHours: {
        type: "integer",
        description: "Rolling window in hours (default: 24)"
      },
      limit: {
        type: "integer",
        description: "Maximum number of telemetry events to retrieve (default: 20)"
      }
    }
  },
  execute: async (args) => {
    const { getSpendingPolicy: getSpendingPolicy2, getRolling24hSpend: getRolling24hSpend2 } = await import("./guardrails-NOP2T7LB.js");
    const { getAgentTelemetrySummary: getAgentTelemetrySummary2, getTelemetryOverview: getTelemetryOverview2, queryTelemetryEvents: queryTelemetryEvents2 } = await import("./telemetry-6KUR4ZVW.js");
    const hours = Number(args.timeframeHours) || 24;
    const limit = Number(args.limit) || 20;
    const policy = getSpendingPolicy2();
    const spentTodaySats = await getRolling24hSpend2();
    const remainingSats = Math.max(0, policy.dailyLimitSats - spentTodaySats);
    const summary = await getAgentTelemetrySummary2(hours);
    const overview = await getTelemetryOverview2();
    const events = await queryTelemetryEvents2({ limit });
    return {
      dailyLimitSats: policy.dailyLimitSats,
      spentTodaySats,
      remainingSats,
      totalSpentSats: summary.totalSpentSats,
      txCount: summary.txCount,
      blockedSybilAttacks: summary.blockedSybilAttacks,
      recentEvents: summary.recentEvents.slice(0, limit),
      events,
      overview
    };
  }
});

// src/lib/base-executor.ts
import { finalizeEvent, generateSecretKey } from "nostr-tools";
var BaseExecutor = class {
  constructor() {
    /** Map tracking active execution IDs to their respective teardown/cleanup functions */
    this.executionSubscriptions = /* @__PURE__ */ new Map();
    /** Map tracking active timer handles for timeout management */
    this.executionTimeouts = /* @__PURE__ */ new Map();
  }
  /**
   * Cleans up an active execution by calling its teardown callback and deleting it from state.
   *
   * @param executionId - Unique identifier of the job/task (e.g. Nostr Job Event ID)
   */
  cleanupExecution(executionId) {
    const timeoutHandle = this.executionTimeouts.get(executionId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.executionTimeouts.delete(executionId);
    }
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
  registerExecution(executionId, cleanupFn, timeoutMs, onTimeout) {
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
  cleanupAllExecutions() {
    for (const timer of this.executionTimeouts.values()) {
      clearTimeout(timer);
    }
    this.executionTimeouts.clear();
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
  getActiveExecutionsCount() {
    return this.executionSubscriptions.size;
  }
  /**
   * Checks if an execution is currently registered and active
   */
  isExecutionActive(executionId) {
    return this.executionSubscriptions.has(executionId);
  }
  /**
   * Returns a list of all active execution IDs
   */
  getActiveExecutionIds() {
    return Array.from(this.executionSubscriptions.keys());
  }
};
var DvmJobExecutor = class extends BaseExecutor {
  constructor(pool) {
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
  async executeJob(jobTemplate, relays = DEFAULT_RELAYS, secretKey, options = {}) {
    const sk = secretKey || generateSecretKey();
    const signedEvent = finalizeEvent(jobTemplate, sk);
    const executionId = signedEvent.id;
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 25e3;
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const subFilter = {
        kinds: [
          DVM_KINDS.JOB_RESULT_DATA_ANALYSIS,
          DVM_KINDS.JOB_RESULT_COMPUTE,
          DVM_KINDS.JOB_FEEDBACK
        ],
        "#e": [executionId],
        since: Math.floor(Date.now() / 1e3) - 10
      };
      let sub = null;
      try {
        sub = this.pool.subscribeMany(relays, subFilter, {
          onevent: (event) => {
            if (event.kind === DVM_KINDS.JOB_FEEDBACK) {
              const statusTag = event.tags.find((t) => t[0] === "status")?.[1] || "processing";
              if (options.onFeedback) {
                options.onFeedback({
                  status: statusTag,
                  message: event.content || "",
                  workerPubkey: event.pubkey
                });
              }
              return;
            }
            if (event.kind === DVM_KINDS.JOB_RESULT_COMPUTE || event.kind === DVM_KINDS.JOB_RESULT_DATA_ANALYSIS) {
              if (isSettled) return;
              isSettled = true;
              let parsedResult = event.content;
              try {
                parsedResult = JSON.parse(event.content);
              } catch {
              }
              const executionResult = {
                executionId,
                workerPubkey: event.pubkey,
                result: parsedResult,
                rawContent: event.content,
                latencyMs: Date.now() - startTime
              };
              this.cleanupExecution(executionId);
              resolve(executionResult);
            }
          }
        });
      } catch (subErr) {
        reject(subErr);
        return;
      }
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
};
var globalDvmExecutor = new DvmJobExecutor();

// src/lib/dvm.ts
var DVM_DEFAULT_RELAYS = MAJOR_INDEXER_RELAYS;
var DVM_KINDS = {
  JOB_REQUEST_DATA_ANALYSIS: 5300,
  JOB_REQUEST_COMPUTE: 5e3,
  JOB_RESULT_DATA_ANALYSIS: 6300,
  JOB_RESULT_COMPUTE: 6e3,
  JOB_FEEDBACK: 7e3,
  NIP89_DVM_ANNOUNCEMENT: 31990
};
function resolveSecretKey(key) {
  if (key instanceof Uint8Array) return key;
  if (typeof key === "string" && key.trim()) {
    const trimmed = key.trim();
    if (trimmed.startsWith("nsec1")) {
      try {
        const decoded = nip19.decode(trimmed);
        if (decoded.type === "nsec") return decoded.data;
      } catch {
      }
    }
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Uint8Array.from(Buffer.from(trimmed, "hex"));
    }
  }
  return generateSecretKey2();
}
async function getLocalDatabaseAnalytics(targetHex) {
  const startTime = Date.now();
  await initDatabase();
  const [zapTotals, creator, zapEdges] = await Promise.all([
    getZapTotalsFromDb(targetHex),
    getCreatorFromDb(targetHex),
    getTrustEdgesFromDb(targetHex, "zap")
  ]);
  const totalSats = zapTotals?.total_sats || 0;
  const validSenderSats = zapTotals?.valid_sender_sats || Math.round(totalSats * 0.9);
  const zapCount = Math.max(zapEdges.length, totalSats > 0 ? 1 : 0);
  return {
    pubkey: targetHex,
    totalSats,
    validSenderSats,
    zapCount,
    trustScore: creator?.score,
    reputationTier: (creator?.score || 0) >= 80 ? "Verified Builder" : (creator?.score || 0) >= 50 ? "Active Contributor" : "Unverified",
    historicalTimeframe: "local-indexed-cache",
    source: "local_db",
    dvmFallback: true,
    latencyMs: Date.now() - startTime,
    reason: "Retrieved from local SQLite database (zap_totals & trust_edges)"
  };
}
async function requestDvmAnalyticsWithFallback(req) {
  const startTime = Date.now();
  const { hex: targetHex } = normalizeToHex(req.targetPubkey);
  if (!targetHex || !/^[0-9a-fA-F]{64}$/.test(targetHex)) {
    return {
      pubkey: req.targetPubkey,
      totalSats: 0,
      validSenderSats: 0,
      zapCount: 0,
      source: "local_db",
      dvmFallback: true,
      latencyMs: Date.now() - startTime,
      reason: "Invalid Nostr 64-character hex target pubkey"
    };
  }
  const category = req.category || "zap-analytics";
  const timeframe = req.timeframe || "all-time";
  const timeoutMs = req.timeoutMs ?? 3e3;
  const relays = req.relays || DVM_DEFAULT_RELAYS;
  const bidSats = req.bidSats ?? 2;
  const pool = getNostrPool();
  const clientSk = resolveSecretKey(req.secretKey);
  const jobRequestTemplate = {
    kind: DVM_KINDS.JOB_REQUEST_DATA_ANALYSIS,
    created_at: Math.floor(Date.now() / 1e3),
    tags: [
      ["i", targetHex, "pubkey"],
      ["output", "application/json"],
      ["param", "analysis", "zap-history"],
      ["param", "timeframe", timeframe],
      ["t", category],
      ["t", "reputation"],
      ["bid", String(bidSats * 1e3)],
      // Millisats
      ["relays", ...relays]
    ],
    content: `Calculate historical zap volume and reputation metrics for ${targetHex}`
  };
  const signedJob = finalizeEvent2(jobRequestTemplate, clientSk);
  const dvmPromise = new Promise((resolve, reject) => {
    let sub = null;
    const cleanup = () => {
      try {
        if (sub) sub.close();
      } catch {
      }
      globalDvmExecutor.cleanupExecution(signedJob.id);
    };
    try {
      sub = pool.subscribeMany(
        relays,
        {
          kinds: [DVM_KINDS.JOB_RESULT_DATA_ANALYSIS, DVM_KINDS.JOB_RESULT_COMPUTE],
          "#e": [signedJob.id]
        },
        {
          async onevent(event) {
            try {
              let resultPayload = {};
              try {
                resultPayload = JSON.parse(event.content);
              } catch {
                resultPayload = { rawContent: event.content };
              }
              const totalSats = Number(resultPayload.totalSats || resultPayload.total_sats || resultPayload.satsZapped || 0);
              const validSenderSats = Number(resultPayload.validSenderSats || resultPayload.valid_sender_sats || Math.round(totalSats * 0.9));
              const zapCount = Number(resultPayload.zapCount || resultPayload.zap_count || 0);
              const trustScore = resultPayload.score || resultPayload.trustScore;
              const reputationTier = resultPayload.tier || resultPayload.reputationTier;
              if (totalSats > 0) {
                await upsertZapTotals({
                  pubkey: targetHex,
                  total_sats: totalSats,
                  valid_sender_sats: validSenderSats
                }).catch(() => {
                });
              }
              cleanup();
              resolve({
                pubkey: targetHex,
                totalSats,
                validSenderSats,
                zapCount,
                trustScore,
                reputationTier,
                historicalTimeframe: timeframe,
                source: "dvm",
                dvmFallback: false,
                dvmPubkey: event.pubkey,
                jobId: signedJob.id,
                latencyMs: Date.now() - startTime
              });
            } catch (parseErr) {
              cleanup();
              reject(parseErr);
            }
          }
        }
      );
      globalDvmExecutor.registerExecution(signedJob.id, () => {
        try {
          if (sub) sub.close();
        } catch {
        }
      });
    } catch (subErr) {
      cleanup();
      reject(subErr);
    }
    try {
      Promise.allSettled(pool.publish(relays, signedJob));
    } catch (pubErr) {
      cleanup();
      reject(pubErr);
    }
  });
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(async () => {
      globalDvmExecutor.cleanupExecution(signedJob.id);
      const fallbackData = await getLocalDatabaseAnalytics(targetHex);
      fallbackData.jobId = signedJob.id;
      fallbackData.reason = `DVM response timed out after ${timeoutMs}ms. Fallback to local SQLite database.`;
      resolve(fallbackData);
    }, timeoutMs);
  });
  return Promise.race([dvmPromise, timeoutPromise]).catch(async (err) => {
    console.debug(`[DVM] Error in DVM job request (${err?.message}), falling back to local DB:`, err);
    return getLocalDatabaseAnalytics(targetHex);
  });
}

// src/mcp-entry.ts
try {
  process.loadEnvFile?.(".env.local");
} catch {
  try {
    process.loadEnvFile?.(".env");
  } catch {
  }
}
var VALID_PROFILES = [
  "minimal",
  "radar",
  "payment",
  "full"
];
var PROFILE_TOOLS = {
  minimal: [
    "check_trust_score",
    "pay_cashu_nutzap",
    "get_spending_guardrails"
  ],
  radar: [
    "check_trust_score",
    "audit_cashu_mint"
  ],
  payment: [
    "pay_cashu_nutzap",
    "pay_lightning_nwc",
    "get_spending_guardrails"
  ],
  full: [
    "check_trust_score",
    "pay_cashu_nutzap",
    "request_nip90_job",
    "pay_lightning_nwc",
    "pay_with_nwc",
    "audit_cashu_mint",
    "route_cashu_mint",
    "get_agent_identity",
    "get_spending_guardrails",
    "get_agent_telemetry"
  ]
};
function resolveActiveProfile() {
  if (process.env.npm_config_profile) {
    const val = process.env.npm_config_profile.trim().toLowerCase();
    if (VALID_PROFILES.includes(val)) {
      return val;
    }
  }
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--profile=")) {
      const val = arg.split("=")[1]?.trim().toLowerCase();
      if (VALID_PROFILES.includes(val)) {
        return val;
      }
    } else if (arg === "--profile" && i + 1 < process.argv.length) {
      const val = process.argv[i + 1]?.trim().toLowerCase();
      if (VALID_PROFILES.includes(val)) {
        return val;
      }
    }
  }
  const envProfile = process.env.NOSTRPULSE_PROFILE?.trim().toLowerCase();
  if (envProfile && VALID_PROFILES.includes(envProfile)) {
    return envProfile;
  }
  return "full";
}
var activeProfile = resolveActiveProfile();
var allowedTools = new Set(PROFILE_TOOLS[activeProfile]);
function isToolAllowed(name) {
  return allowedTools.has(name);
}
var mcpServer = new McpServer({
  name: "nostrpulse-mcp-server",
  version: "1.2.0"
});
if (isToolAllowed("check_trust_score")) {
  mcpServer.tool(
    "check_trust_score",
    "Verify anti-Sybil Trust Score (0-100) and Web-of-Trust distance for a Nostr pubkey.",
    {
      pubkey: z2.string().describe(
        "Target Nostr public key in 64-char hex or npub format"
      )
    },
    async ({ pubkey }) => {
      try {
        await initDatabase();
        const hex = normalizePubkey(pubkey);
        if (!hex) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Invalid public key format. Expected 64-char hex or bech32 npub.",
                    input: pubkey
                  },
                  null,
                  2
                )
              }
            ],
            isError: true
          };
        }
        const npub = encodeNpub(hex);
        const wotResult = getWebOfTrustDistance(hex);
        const [creatorDb, zapRow] = await Promise.all([
          getCreatorFromDb(hex),
          getZapTotalsFromDb(hex)
        ]);
        const verifiedZapsSats = zapRow?.valid_sender_sats ?? 0;
        const totalZapsSats = zapRow?.total_sats ?? 0;
        const sybilFilteredSats = Math.max(0, totalZapsSats - verifiedZapsSats);
        let score = creatorDb ? creatorDb.score : 0;
        let tier = "Unverified / Potential Bot";
        if (creatorDb) {
          score = creatorDb.score;
          if (wotResult.distance === 0 || score >= 80 && wotResult.distance <= 1) {
            tier = "Verified Builder";
          } else if (score >= 50 && wotResult.distance <= 2) {
            tier = "Active Contributor";
          } else {
            tier = "Unverified / Potential Bot";
          }
        } else {
          const calculated = calculateTrustScore(
            { pubkey: hex, npub, name: "" },
            void 0,
            wotResult
          );
          score = calculated.score;
          tier = calculated.tier;
        }
        const payload = {
          pubkey: hex,
          npub,
          name: creatorDb?.name || void 0,
          score: Math.round(score),
          tier,
          wot: {
            direct_anchor_endorsed: wotResult.distance === 0 || wotResult.distance === 1 && wotResult.endorsedByCount > 0,
            distance: wotResult.distance,
            endorsers_count: wotResult.endorsedByCount,
            endorsers: wotResult.endorsers,
            sybil_risk: wotResult.sybilRisk
          },
          economic_stake: {
            verified_zaps_sats: verifiedZapsSats,
            sybil_filtered_sats: sybilFilteredSats
          }
        };
        await logTelemetryEvent({
          eventType: "radar.trust_score.checked",
          category: "radar",
          status: "success",
          targetPubkey: hex,
          metadata: { score: payload.score, tier: payload.tier, distance: payload.wot.distance }
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(payload, null, 2)
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error calculating trust score: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
if (isToolAllowed("pay_cashu_nutzap")) {
  mcpServer.tool(
    "pay_cashu_nutzap",
    "Send an eCash NutZap payment (NIP-61) to a Nostr recipient under guardrail limits.",
    {
      recipient: z2.string().describe("Recipient Nostr public key (64-char hex or bech32 npub)"),
      amountSats: z2.number().int().min(1).describe("Amount in satoshis to pay"),
      cashuToken: z2.string().nullish().describe(
        "Optional Cashu eCash token string; if omitted, generates a mint quote invoice"
      ),
      mintUrl: z2.string().nullish().describe("Optional target Cashu mint URL"),
      comment: z2.string().nullish().describe("Optional payment message memo")
    },
    async ({ recipient, amountSats, cashuToken, mintUrl, comment }) => {
      try {
        await initDatabase();
        const hexRecipient = normalizePubkey(recipient);
        if (!hexRecipient) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { error: "Invalid recipient public key format.", recipient },
                  null,
                  2
                )
              }
            ],
            isError: true
          };
        }
        let cleanMint = mintUrl?.trim();
        if (!cleanMint) {
          try {
            const routeRes = await routeCashuMint({ amountSats });
            if (routeRes.meshHealthy && routeRes.selectedMint?.mintUrl) {
              cleanMint = routeRes.selectedMint.mintUrl;
            }
          } catch {
          }
        }
        cleanMint = (cleanMint || DEFAULT_CASHU_MINT).trim();
        const guardrail = await assertSpendingAllowed({
          amountSats,
          recipientPubkey: hexRecipient,
          rail: "nutzap"
        });
        if (!guardrail.allowed) {
          await logAgentEvent({
            type: "radar_block",
            data: {
              amountSats,
              recipient: hexRecipient,
              rail: "nutzap",
              reason: guardrail.reason
            }
          });
          await logTelemetryEvent({
            eventType: "payment.guardrail_blocked",
            category: "payment",
            status: "blocked",
            targetPubkey: hexRecipient,
            amountSats,
            metadata: { rail: "nutzap", reason: guardrail.reason },
            error: guardrail.reason
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "blocked_by_guardrails",
                    reason: guardrail.reason
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
        if (cashuToken && cashuToken.trim()) {
          const parsedToken = parseCashuToken(cashuToken.trim());
          if (parsedToken.totalAmountSats < amountSats) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: `Insufficient token balance. Token has ${parsedToken.totalAmountSats} sats, but ${amountSats} sats required.`
                    },
                    null,
                    2
                  )
                }
              ],
              isError: true
            };
          }
          const zapResult = await sendCashuNutZap({
            recipientPubkey: hexRecipient,
            cashuToken: cashuToken.trim(),
            amountSats,
            comment: comment || "Value-4-Value eCash NutZap \u{1F95C}\u26A1",
            mintUrl: cleanMint
          });
          await Promise.allSettled([
            recordAgentSpending({
              amountSats,
              rail: "cashu",
              recipientPubkey: hexRecipient,
              eventId: zapResult.id,
              memo: comment || void 0
            }),
            logAgentEvent({
              type: "payment",
              data: {
                amountSats,
                rail: "nutzap",
                recipient: hexRecipient,
                mint: cleanMint,
                eventId: zapResult.id,
                status: "settled"
              }
            }),
            accumulateZapTotals({
              pubkey: hexRecipient,
              addTotalSats: amountSats,
              addValidSats: amountSats
            }),
            recordZapEdge("mcp_agent_sender", hexRecipient, amountSats),
            logTelemetryEvent({
              eventType: "payment.nutzap.settled",
              category: "payment",
              status: "success",
              targetPubkey: hexRecipient,
              amountSats,
              metadata: { eventId: zapResult.id, mintUrl: cleanMint }
            })
          ]);
          const current24h = await getRolling24hSpend();
          const policy = getSpendingPolicy();
          const responseData = {
            success: true,
            status: "settled",
            kind: 9321,
            eventId: zapResult.id,
            amountSats,
            recipient: hexRecipient,
            changeToken: zapResult.changeToken,
            guardrail: {
              remainingDailySats: Math.max(0, policy.dailyLimitSats - current24h)
            },
            message: `Successfully delivered ${amountSats.toLocaleString()} Sats NutZap to ${hexRecipient}!`
          };
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(responseData, null, 2)
              }
            ]
          };
        }
        const quote = await createCashuMintQuote(amountSats, cleanMint);
        const quoteData = {
          success: true,
          status: "payment_required",
          quoteId: quote.quoteId,
          invoice: quote.invoice,
          amountSats,
          mintUrl: quote.mintUrl,
          recipient: hexRecipient,
          message: `Lightning invoice generated. Pay ${amountSats} sats to mint proofs and complete NutZap.`
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(quoteData, null, 2)
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error processing NutZap payment: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
if (isToolAllowed("request_nip90_job")) {
  mcpServer.tool(
    "request_nip90_job",
    "Dispatch a NIP-90 DVM analytics computation task across Nostr relays with local fallback.",
    {
      prompt: z2.string().describe("Target Nostr public key or computation query"),
      category: z2.enum(["zap-analytics", "reputation", "trust-score"]).optional().describe(
        "Task category: 'zap-analytics', 'reputation', or 'trust-score' (default: 'trust-score')"
      ),
      timeframe: z2.enum(["all-time", "1y", "30d"]).optional().describe("Historical timeframe: 'all-time', '1y', or '30d' (default: 'all-time')"),
      bidSats: z2.number().int().min(0).optional().describe("Bid fee in satoshis (default: 5)"),
      timeoutMs: z2.number().int().min(500).max(1e4).optional().describe("Timeout in milliseconds (default: 3500)")
    },
    async ({ prompt, category, timeframe, bidSats, timeoutMs }) => {
      try {
        const hex = normalizePubkey(prompt) || prompt;
        const result = await requestDvmAnalyticsWithFallback({
          targetPubkey: hex,
          category: category || "trust-score",
          timeframe: timeframe || "all-time",
          bidSats: bidSats ?? 5,
          timeoutMs: timeoutMs ?? 3500
        });
        const responsePayload = {
          pubkey: result.pubkey,
          totalSats: result.totalSats,
          validSenderSats: result.validSenderSats,
          zapCount: result.zapCount,
          trustScore: result.trustScore,
          reputationTier: result.reputationTier,
          source: result.source,
          dvmFallback: result.dvmFallback,
          dvmPubkey: result.dvmPubkey || void 0,
          jobId: result.jobId || void 0,
          latencyMs: result.latencyMs
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(responsePayload, null, 2)
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error processing NIP-90 DVM request: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
var nwcToolHandler = async ({ invoice, nwcUri, timeoutMs, amountMsat }) => {
  try {
    const amountSats = amountMsat && amountMsat > 0 ? Math.round(amountMsat / 1e3) : decodeBolt11AmountSats(invoice) || 1;
    const guardrail = await assertSpendingAllowed({
      amountSats,
      rail: "nwc"
    });
    if (!guardrail.allowed) {
      await logAgentEvent({
        type: "radar_block",
        data: {
          amountSats,
          rail: "nwc",
          invoice,
          reason: guardrail.reason
        }
      });
      await logTelemetryEvent({
        eventType: "payment.guardrail_blocked",
        category: "payment",
        status: "blocked",
        amountSats,
        metadata: { rail: "nwc", reason: guardrail.reason },
        error: guardrail.reason
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "blocked_by_guardrails",
                reason: guardrail.reason
              },
              null,
              2
            )
          }
        ]
      };
    }
    const result = await payWithNWC({
      invoice,
      nwcUri,
      timeoutMs: timeoutMs ?? 15e3,
      amountMsat
    });
    if (result.status === "success") {
      await Promise.allSettled([
        recordAgentSpending({
          amountSats,
          rail: "lightning_nwc",
          eventId: result.responseEventId,
          memo: `Lightning NWC Payment (Preimage: ${result.preimage?.slice(0, 10)}...)`
        }),
        logAgentEvent({
          type: "payment",
          data: {
            amountSats,
            rail: "nwc",
            invoice,
            preimage: result.preimage,
            feesPaidSats: result.fees_paid,
            responseEventId: result.responseEventId,
            status: "settled"
          }
        }),
        logTelemetryEvent({
          eventType: "payment.nwc.settled",
          category: "payment",
          status: "success",
          amountSats,
          metadata: { preimage: result.preimage, feesPaid: result.fees_paid }
        })
      ]);
      const current24h = await getRolling24hSpend();
      const policy = getSpendingPolicy();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                status: "settled",
                preimage: result.preimage,
                feesPaidSats: result.fees_paid,
                responseEventId: result.responseEventId,
                guardrail: {
                  remainingDailySats: Math.max(0, policy.dailyLimitSats - current24h)
                },
                message: `Lightning payment settled successfully via NWC! Preimage: ${result.preimage}`
              },
              null,
              2
            )
          }
        ]
      };
    }
    await logTelemetryEvent({
      eventType: "payment.nwc.failed",
      category: "payment",
      status: "failed",
      amountSats,
      error: result.error,
      metadata: { errorCode: result.errorCode }
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              status: result.status,
              error: result.error,
              errorCode: result.errorCode,
              responseEventId: result.responseEventId
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing NWC payment: ${err?.message || String(err)}`
        }
      ],
      isError: true
    };
  }
};
var nwcToolSchema = {
  invoice: z2.string().describe("BOLT-11 Lightning invoice"),
  nwcUri: z2.string().optional().describe(
    "Optional NWC connection URI (falls back to env NWC_CONNECTION_URI)"
  ),
  timeoutMs: z2.number().int().min(1e3).max(6e4).optional().describe("Timeout in milliseconds (default: 15000)"),
  amountMsat: z2.number().int().min(1).optional().describe("Optional amount in millisatoshis for amountless invoices")
};
if (isToolAllowed("pay_lightning_nwc")) {
  mcpServer.tool(
    "pay_lightning_nwc",
    "Pay a BOLT-11 Lightning invoice via NIP-47 Nostr Wallet Connect.",
    nwcToolSchema,
    nwcToolHandler
  );
}
if (activeProfile === "full" && isToolAllowed("pay_with_nwc")) {
  mcpServer.tool(
    "pay_with_nwc",
    "Pay a BOLT-11 Lightning invoice via NIP-47 Nostr Wallet Connect (alias).",
    nwcToolSchema,
    nwcToolHandler
  );
}
if (isToolAllowed("audit_cashu_mint")) {
  mcpServer.tool(
    "audit_cashu_mint",
    "Audit Cashu mint health, NUT-06 status, and counterparty risk score.",
    {
      mintUrl: z2.string().describe("Target Cashu mint URL to audit"),
      forceRefresh: z2.boolean().optional().describe("Bypass in-memory audit cache and perform fresh live probe (default: false)")
    },
    async ({ mintUrl, forceRefresh }) => {
      try {
        await initDatabase();
        const audit = await auditCashuMint(mintUrl, forceRefresh ?? false);
        await logTelemetryEvent({
          eventType: "mint.audited",
          category: "mint",
          status: audit.isOnline ? "success" : "failed",
          metadata: { mintUrl, trustScore: audit.trustScore, riskLevel: audit.riskLevel }
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(audit, null, 2)
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error auditing Cashu Mint: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
if (isToolAllowed("route_cashu_mint")) {
  mcpServer.tool(
    "route_cashu_mint",
    "Route to the highest-trust, lowest-latency Cashu mint for a payment.",
    {
      amountSats: z2.number().int().min(1).optional().describe("Payment amount in satoshis"),
      preferredMint: z2.string().optional().describe("Optional preferred mint URL to prioritize if verified and healthy"),
      minTrustScore: z2.number().int().min(0).max(100).optional().describe("Minimum required trust score (default: 45)")
    },
    async ({ amountSats, preferredMint, minTrustScore }) => {
      try {
        await initDatabase();
        const routing = await routeCashuMint({
          amountSats,
          preferredMint,
          minTrustScore: minTrustScore ?? 45
        });
        await logTelemetryEvent({
          eventType: "mint.routed",
          category: "mint",
          status: routing.meshHealthy ? "success" : "failed",
          amountSats,
          metadata: { selectedMint: routing.selectedMint?.mintUrl }
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(routing, null, 2)
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error routing Cashu Mint: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
if (isToolAllowed("get_agent_identity")) {
  mcpServer.tool(
    "get_agent_identity",
    "Get the autonomous agent's Nostr public identity and npub.",
    {},
    async () => {
      try {
        const identity = getOrInitAgentIdentity();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  pubkey: identity.pubkey,
                  npub: identity.npub,
                  source: identity.source,
                  isEphemeral: identity.isEphemeral,
                  createdAt: identity.createdAt
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error resolving agent identity: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
if (isToolAllowed("get_spending_guardrails")) {
  mcpServer.tool(
    "get_spending_guardrails",
    "Check current AI agent spending budget, daily limits, and remaining satoshis.",
    {},
    async () => {
      try {
        await initDatabase();
        const summary = await getSpendingSummary();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error inspecting spending guardrails: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
if (isToolAllowed("get_agent_telemetry")) {
  mcpServer.tool(
    "get_agent_telemetry",
    "Retrieve agent telemetry metrics, rolling spend volume, and security events.",
    {
      timeframeHours: z2.number().int().min(1).max(720).optional().describe("Timeframe in hours (default: 24)"),
      limit: z2.number().int().min(1).max(100).optional().describe("Max events to return (default: 20)")
    },
    async ({ timeframeHours, limit }) => {
      try {
        await initDatabase();
        const hours = timeframeHours ?? 24;
        const policy = getSpendingPolicy();
        const spentTodaySats = await getRolling24hSpend();
        const remainingSats = Math.max(0, policy.dailyLimitSats - spentTodaySats);
        const summary = await getAgentTelemetrySummary(hours);
        const overview = await getTelemetryOverview();
        const events = await queryTelemetryEvents({ limit: limit ?? 20 });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  dailyLimitSats: policy.dailyLimitSats,
                  spentTodaySats,
                  remainingSats,
                  totalSpentSats: summary.totalSpentSats,
                  txCount: summary.txCount,
                  blockedSybilAttacks: summary.blockedSybilAttacks,
                  recentEvents: summary.recentEvents.slice(0, limit ?? 20),
                  events,
                  overview: {
                    totalVolumeSats: overview.totalVolumeSats,
                    totalEvents: overview.totalEvents,
                    successRatePercent: overview.successRatePercent,
                    byCategory: overview.byCategory
                  }
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving agent telemetry: ${err?.message || String(err)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
globalToolRegistry.registerToMcpServer(mcpServer, Array.from(allowedTools));
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error(
    `[NostrPulse MCP] Active Profile: ${activeProfile} (${allowedTools.size} tools active). StdioServerTransport connected.`
  );
}
main().catch((error) => {
  console.error("[NostrPulse MCP] Fatal error starting MCP server:", error);
  process.exit(1);
});
export {
  PROFILE_TOOLS,
  VALID_PROFILES,
  activeProfile,
  allowedTools,
  isToolAllowed,
  resolveActiveProfile
};
