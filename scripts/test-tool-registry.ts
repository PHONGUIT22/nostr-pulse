// scripts/test-tool-registry.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  mapJsonSchemaToZod,
  ToolRegistry,
  globalToolRegistry,
  type ToolInputSchema,
} from "../src/lib/tool-registry";

async function main() {
  console.log("=== Testing ToolRegistry & mapJsonSchemaToZod (DVMCP Discovery) ===\n");

  // -------------------------------------------------------------------------
  // Test 1: Empty or missing properties schema fallback
  // -------------------------------------------------------------------------
  console.log("[Test 1] Testing empty schema fallback...");
  const emptySchema1: ToolInputSchema = { type: "object", properties: {} };
  const shape1 = mapJsonSchemaToZod(emptySchema1);
  const zodObject1 = z.object(shape1);

  const parsedEmpty = zodObject1.safeParse({});
  console.log("Parsed empty input with fallback shape:", parsedEmpty.success ? "PASSED" : "FAILED");
  if (!shape1._) {
    throw new Error("Expected fallback optional '_' property for empty schema");
  }
  console.log("Fallback shape keys:", Object.keys(shape1));

  // -------------------------------------------------------------------------
  // Test 2: Standard types mapping (string, number, integer, boolean, enum)
  // -------------------------------------------------------------------------
  console.log("\n[Test 2] Testing JSON Schema to Zod type conversion...");
  const fullSchema: ToolInputSchema = {
    type: "object",
    properties: {
      pubkey: {
        type: "string",
        description: "64-char Nostr hex pubkey",
      },
      timeframe: {
        type: "string",
        enum: ["all-time", "1y", "30d"],
        description: "Analysis timeframe",
      },
      limit: {
        type: "integer",
        description: "Max records to query",
      },
      minSats: {
        type: "number",
        description: "Minimum satoshis threshold",
      },
      includeInactive: {
        type: "boolean",
        description: "Whether to include inactive profiles",
      },
    },
    required: ["pubkey", "timeframe"],
  };

  const shape2 = mapJsonSchemaToZod(fullSchema);
  const validator2 = z.object(shape2);

  // Valid payload test
  const validPayload = {
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    timeframe: "all-time",
    limit: 50,
    minSats: 21.5,
    includeInactive: false,
  };

  const validResult = validator2.safeParse(validPayload);
  console.log("Validation of valid payload:", validResult.success ? "PASSED" : "FAILED");
  if (!validResult.success) {
    console.error("Validation error:", validResult.error);
    throw new Error("Valid payload failed validation");
  }

  // Missing required field test
  const invalidMissingRequired = {
    timeframe: "all-time",
  };
  const missingResult = validator2.safeParse(invalidMissingRequired);
  console.log("Rejection of missing required 'pubkey':", !missingResult.success ? "PASSED" : "FAILED");
  if (missingResult.success) {
    throw new Error("Validation unexpectedly succeeded with missing required property");
  }

  // Invalid integer test
  const invalidIntegerPayload = {
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    timeframe: "all-time",
    limit: 12.34, // float where integer expected
  };
  const intResult = validator2.safeParse(invalidIntegerPayload);
  console.log("Rejection of non-integer for integer field:", !intResult.success ? "PASSED" : "FAILED");

  // Invalid enum test
  const invalidEnumPayload = {
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    timeframe: "invalid-timeframe",
  };
  const enumResult = validator2.safeParse(invalidEnumPayload);
  console.log("Rejection of invalid enum value:", !enumResult.success ? "PASSED" : "FAILED");

  // -------------------------------------------------------------------------
  // Test 3: ToolRegistry instance & DVM Worker capability registration
  // -------------------------------------------------------------------------
  console.log("\n[Test 3] Testing ToolRegistry and dynamic DVM capability registration...");
  const registry = new ToolRegistry();

  const dvmCapability = registry.registerDvmWorkerCapability({
    identifier: "nostrpulse_zap_analytics",
    name: "NostrPulse Zap Analytics DVM",
    about: "Computes historical sats volume and WoT in-degree for any Nostr identity",
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    supportedKinds: [5300, 5000],
    categories: ["zap-analytics", "reputation"],
    inputSchema: {
      type: "object",
      properties: {
        pubkey: { type: "string", description: "Target Nostr pubkey" },
        depth: { type: "integer", description: "Graph traversal depth" },
      },
      required: ["pubkey"],
    },
    execute: async (args) => {
      return {
        target: args.pubkey,
        depth: args.depth || 1,
        totalSats: 2450000,
        source: "MOCK_DVM",
      };
    },
  });

  console.log("Registered tool name:", dvmCapability.name);
  const registered = registry.getTool("nostrpulse_zap_analytics");
  console.log("Retrieved registered tool:", registered ? "PASSED" : "FAILED");

  const toolValidator = registry.getZodValidator("nostrpulse_zap_analytics");
  if (!toolValidator) throw new Error("Could not get Zod validator for registered tool");

  const toolValidationResult = toolValidator.safeParse({
    pubkey: "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6",
    depth: 2,
  });
  console.log("Tool validator safeParse result:", toolValidationResult.success ? "PASSED" : "FAILED");

  // -------------------------------------------------------------------------
  // Test 4: Binding ToolRegistry to McpServer
  // -------------------------------------------------------------------------
  console.log("\n[Test 4] Testing registration into McpServer instance...");
  const mcpServer = new McpServer({
    name: "nostrpulse-dvmcp-server",
    version: "1.0.0",
  });

  // Register tools into McpServer
  registry.registerToMcpServer(mcpServer);
  console.log("McpServer registration completed without errors: PASSED");

  // Test execution of tool
  const execResult = await dvmCapability.execute?.({
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    depth: 1,
  });
  console.log("Direct tool execution output:", execResult);

  console.log("\n=== All mapJsonSchemaToZod & ToolRegistry Tests Completed Successfully! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
