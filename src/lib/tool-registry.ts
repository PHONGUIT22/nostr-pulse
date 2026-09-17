// src/lib/tool-registry.ts
/**
 * DVMCP Tool Registry & JSON Schema to Zod Converter
 *
 * Provides utilities to translate JSON Schema definitions (e.g. from DVM Worker NIP-89
 * announcements or DVMCP compute discovery) into Zod raw shapes (z.ZodRawShape).
 * This enables dynamic runtime validation when registering tools into @modelcontextprotocol/sdk
 * McpServer instances or Vercel AI SDK agents.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolPropertySchema {
  type?: string;
  description?: string;
  enum?: (string | number | boolean)[];
  items?: ToolPropertySchema;
  properties?: Record<string, ToolPropertySchema>;
  [key: string]: any;
}

export interface ToolInputSchema {
  type?: "object" | string;
  properties?: Record<string, ToolPropertySchema>;
  required?: string[];
  description?: string;
  [key: string]: any;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  dvmPubkey?: string;
  supportedKinds?: number[];
  relays?: string[];
  execute?: (args: Record<string, any>) => Promise<any>;
}

/**
 * Converts a JSON Schema input definition to a Zod raw shape (z.ZodRawShape).
 * If the schema has no properties, safely returns an optional object placeholder.
 *
 * @param schema - JSON Schema definition for tool inputs
 * @returns z.ZodRawShape compatible with McpServer and z.object()
 */
export function mapJsonSchemaToZod(schema?: ToolInputSchema | null): z.ZodRawShape {
  if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
    return { _: z.object({}).optional() };
  }

  const properties: Record<string, z.ZodType> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    if (typeof prop === "object" && prop && "type" in prop) {
      let zodType: z.ZodType;

      switch (prop.type) {
        case "string":
          if (Array.isArray(prop.enum) && prop.enum.length > 0) {
            zodType = z.enum(prop.enum.map(String) as [string, ...string[]]);
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

      properties[key] =
        Array.isArray(schema.required) && schema.required.includes(key)
          ? zodType
          : zodType.optional();
    }
  }

  return properties as z.ZodRawShape;
}

/**
 * ToolRegistry manages tool registrations and binds DVM Worker capabilities
 * to runtime Model Context Protocol (MCP) servers and AI SDK agents.
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Internal converter from JSON Schema to ZodRawShape (extracted from dvmcp-discovery)
   */
  private mapJsonSchemaToZod(schema: Tool["inputSchema"]): z.ZodRawShape {
    return mapJsonSchemaToZod(schema);
  }

  /**
   * Registers an arbitrary Tool into the registry
   */
  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieves a registered tool by name
   */
  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Returns all registered tools
   */
  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Converts a DVM Worker announcement (NIP-89) into a validated registered Tool.
   * Uses mapJsonSchemaToZod to ensure schema compatibility with MCP runtime.
   */
  public registerDvmWorkerCapability(announcement: {
    name: string;
    identifier?: string;
    about?: string;
    pubkey: string;
    supportedKinds?: number[];
    categories?: string[];
    relays?: string[];
    inputSchema?: ToolInputSchema;
    execute?: (args: Record<string, any>) => Promise<any>;
  }): Tool {
    const toolName = (announcement.identifier || announcement.name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");

    // Standard fallback schema for Nostr DVM analytics if none provided
    const fallbackSchema: ToolInputSchema = {
      type: "object",
      properties: {
        pubkey: {
          type: "string",
          description: "Nostr public key (hex or npub) to query",
        },
        category: {
          type: "string",
          description: "Analysis category (e.g. zap-analytics, reputation)",
        },
      },
      required: ["pubkey"],
    };

    const inputSchema = announcement.inputSchema || fallbackSchema;

    const tool: Tool = {
      name: toolName,
      description:
        announcement.about ||
        `DVM Analytics Tool powered by Nostr DVM ${announcement.pubkey.slice(0, 8)}...`,
      inputSchema,
      dvmPubkey: announcement.pubkey,
      supportedKinds: announcement.supportedKinds,
      relays: announcement.relays,
      execute: announcement.execute,
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
  public registerToMcpServer(server: McpServer, allowedTools?: string[]): void {
    const allowedSet = allowedTools ? new Set(allowedTools) : null;
    for (const tool of this.tools.values()) {
      if (allowedSet && !allowedSet.has(tool.name)) {
        continue;
      }

      if ((server as any)._registeredTools?.[tool.name]) {
        continue;
      }

      const zodRawShape = this.mapJsonSchemaToZod(tool.inputSchema);

      server.tool(
        tool.name,
        tool.description,
        zodRawShape,
        async (args: Record<string, any>) => {
          try {
            if (tool.execute) {
              const result = await tool.execute(args);
              return {
                content: [
                  {
                    type: "text" as const,
                    text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    tool: tool.name,
                    status: "dispatched",
                    args,
                    dvmPubkey: tool.dvmPubkey,
                  }),
                },
              ],
            };
          } catch (err: any) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error executing tool ${tool.name}: ${err?.message || String(err)}`,
                },
              ],
              isError: true,
            };
          }
        }
      );
    }
  }

  /**
   * Generates a Zod object validator from a tool's input schema
   */
  public getZodValidator(toolName: string): z.ZodObject<any> | null {
    const tool = this.tools.get(toolName);
    if (!tool) return null;
    return z.object(this.mapJsonSchemaToZod(tool.inputSchema));
  }
}

// Global default singleton registry instance
export const globalToolRegistry = new ToolRegistry();

// Register core NIP-47 and Dynamic Mint Mesh tools
globalToolRegistry.registerTool({
  name: "pay_lightning_nwc",
  description:
    "Pay a BOLT-11 Lightning invoice via NIP-47 Nostr Wallet Connect.",
  inputSchema: {
    type: "object",
    properties: {
      invoice: {
        type: "string",
        description: "BOLT-11 Lightning invoice.",
      },
      nwcUri: {
        type: "string",
        description:
          "Explicit NWC connection URI (falls back to env NWC_CONNECTION_URI).",
      },
      timeoutMs: {
        type: "integer",
        description: "Timeout in milliseconds (default: 15000)",
      },
      amountMsat: {
        type: "integer",
        description: "Optional amount in millisatoshis for amountless invoices",
      },
    },
    required: ["invoice"],
  },
  execute: async (args: Record<string, any>) => {
    const { assertSpendingAllowed } = await import("./guardrails");
    const { logAgentEvent } = await import("./telemetry");
    const { decodeBolt11AmountSats } = await import("./indexer");
    const { payWithNWC } = await import("./nwc");

    const amountSats =
      args.amountMsat && args.amountMsat > 0
        ? Math.round(args.amountMsat / 1000)
        : decodeBolt11AmountSats(args.invoice) || 1;

    const guardrail = await assertSpendingAllowed({
      amountSats,
      rail: "nwc",
    });

    if (!guardrail.allowed) {
      await logAgentEvent({
        type: "radar_block",
        data: {
          amountSats,
          rail: "nwc",
          invoice: args.invoice,
          reason: guardrail.reason,
        },
      });

      return {
        status: "blocked_by_guardrails",
        reason: guardrail.reason,
      };
    }

    const res = await payWithNWC({
      invoice: args.invoice,
      nwcUri: args.nwcUri,
      timeoutMs: args.timeoutMs,
      amountMsat: args.amountMsat,
    });

    if (res.status === "success") {
      await logAgentEvent({
        type: "payment",
        data: {
          amountSats,
          rail: "nwc",
          invoice: args.invoice,
          preimage: res.preimage,
          feesPaidSats: res.fees_paid,
          responseEventId: res.responseEventId,
          status: "settled",
        },
      });
    }

    return res;
  },
});

globalToolRegistry.registerTool({
  name: "audit_cashu_mint",
  description:
    "Audit Cashu mint health, NUT-06 status, and counterparty risk score.",
  inputSchema: {
    type: "object",
    properties: {
      mintUrl: {
        type: "string",
        description: "Target Cashu mint URL (e.g., https://mint.minibits.cash/Bitcoin).",
      },
      forceRefresh: {
        type: "boolean",
        description: "Bypass in-memory audit cache and perform fresh live probe (default: false)",
      },
    },
    required: ["mintUrl"],
  },
  execute: async (args: Record<string, any>) => {
    const { auditCashuMint } = await import("./mint-mesh");
    return auditCashuMint(args.mintUrl, args.forceRefresh);
  },
});

globalToolRegistry.registerTool({
  name: "route_cashu_mint",
  description:
    "Route to the highest-trust, lowest-latency Cashu mint for a payment.",
  inputSchema: {
    type: "object",
    properties: {
      amountSats: {
        type: "integer",
        description: "Intended payment or minting amount in Satoshis",
      },
      preferredMint: {
        type: "string",
        description: "Optional preferred mint URL to prioritize if verified and healthy",
      },
      minTrustScore: {
        type: "integer",
        description: "Minimum WoT Trust Score required to pass the security gate (default: 45)",
      },
    },
  },
  execute: async (args: Record<string, any>) => {
    const { routeCashuMint } = await import("./mint-mesh");
    return routeCashuMint({
      amountSats: args.amountSats,
      preferredMint: args.preferredMint,
      minTrustScore: args.minTrustScore,
    });
  },
});

globalToolRegistry.registerTool({
  name: "get_agent_identity",
  description:
    "Get the autonomous agent's Nostr public identity and npub.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  execute: async () => {
    const { getOrInitAgentIdentity } = await import("./identity-manager");
    const identity = getOrInitAgentIdentity();
    return {
      pubkey: identity.pubkey,
      npub: identity.npub,
      source: identity.source,
      isEphemeral: identity.isEphemeral,
      createdAt: identity.createdAt,
    };
  },
});

globalToolRegistry.registerTool({
  name: "get_spending_guardrails",
  description:
    "Check current AI agent spending budget, daily limits, and remaining satoshis.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  execute: async () => {
    const { getSpendingSummary } = await import("./spending-guardrails");
    return getSpendingSummary();
  },
});

globalToolRegistry.registerTool({
  name: "get_agent_telemetry",
  description:
    "Retrieve agent telemetry metrics, rolling spend volume, and security events.",
  inputSchema: {
    type: "object",
    properties: {
      timeframeHours: {
        type: "integer",
        description: "Rolling window in hours (default: 24)",
      },
      limit: {
        type: "integer",
        description: "Maximum number of telemetry events to retrieve (default: 20)",
      },
    },
  },
  execute: async (args: Record<string, any>) => {
    const { getSpendingPolicy, getRolling24hSpend } = await import("./guardrails");
    const { getAgentTelemetrySummary, getTelemetryOverview, queryTelemetryEvents } = await import("./telemetry");

    const hours = Number(args.timeframeHours) || 24;
    const limit = Number(args.limit) || 20;

    const policy = getSpendingPolicy();
    const spentTodaySats = await getRolling24hSpend();
    const remainingSats = Math.max(0, policy.dailyLimitSats - spentTodaySats);

    const summary = await getAgentTelemetrySummary(hours);
    const overview = await getTelemetryOverview();
    const events = await queryTelemetryEvents({ limit });

    return {
      dailyLimitSats: policy.dailyLimitSats,
      spentTodaySats,
      remainingSats,
      totalSpentSats: summary.totalSpentSats,
      txCount: summary.txCount,
      blockedSybilAttacks: summary.blockedSybilAttacks,
      recentEvents: summary.recentEvents.slice(0, limit),
      events,
      overview,
    };
  },
});


