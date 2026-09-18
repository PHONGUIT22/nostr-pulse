// scripts/test-profiles.ts
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface ProfileExpectation {
  profile: string;
  expectedCount: number;
  expectedTools: string[];
  forbiddenTools: string[];
}

const PROFILES: ProfileExpectation[] = [
  {
    profile: "minimal",
    expectedCount: 3,
    expectedTools: ["check_trust_score", "pay_cashu_nutzap", "get_spending_guardrails"],
    forbiddenTools: ["request_nip90_job", "pay_lightning_nwc", "pay_with_nwc", "audit_cashu_mint", "route_cashu_mint", "get_agent_identity", "get_agent_telemetry"],
  },
  {
    profile: "radar",
    expectedCount: 2,
    expectedTools: ["check_trust_score", "audit_cashu_mint"],
    forbiddenTools: ["pay_cashu_nutzap", "request_nip90_job", "pay_lightning_nwc", "pay_with_nwc", "route_cashu_mint", "get_agent_identity", "get_spending_guardrails", "get_agent_telemetry"],
  },
  {
    profile: "payment",
    expectedCount: 3,
    expectedTools: ["pay_cashu_nutzap", "pay_lightning_nwc", "get_spending_guardrails"],
    forbiddenTools: ["check_trust_score", "request_nip90_job", "pay_with_nwc", "audit_cashu_mint", "route_cashu_mint", "get_agent_identity", "get_agent_telemetry"],
  },
  {
    profile: "full",
    expectedCount: 10,
    expectedTools: [
      "check_trust_score",
      "pay_cashu_nutzap",
      "request_nip90_job",
      "pay_lightning_nwc",
      "pay_with_nwc",
      "audit_cashu_mint",
      "route_cashu_mint",
      "get_agent_identity",
      "get_spending_guardrails",
      "get_agent_telemetry",
    ],
    forbiddenTools: [],
  },
];

async function testProfile(profile: string | null, expectation: ProfileExpectation) {
  const distEntryPath = path.resolve(process.cwd(), "dist/mcp-entry.js");
  const args = profile ? [distEntryPath, `--profile=${profile}`] : [distEntryPath];

  const transport = new StdioClientTransport({
    command: "node",
    args,
  });

  const client = new Client(
    { name: `test-${profile || "default"}`, version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name).sort();

    console.log(`\n=== Testing Profile: "${profile ?? "(default fallback)"}" ===`);
    console.log(`Tool Count: ${toolNames.length} (Expected: ${expectation.expectedCount})`);
    console.log(`Active Tools: ${toolNames.join(", ")}`);

    if (toolNames.length !== expectation.expectedCount) {
      throw new Error(
        `Profile "${profile}" tool count mismatch! Got ${toolNames.length}, expected ${expectation.expectedCount}`
      );
    }

    for (const expected of expectation.expectedTools) {
      if (!toolNames.includes(expected)) {
        throw new Error(`Profile "${profile}" is missing expected tool: ${expected}`);
      }
    }

    for (const forbidden of expectation.forbiddenTools) {
      if (toolNames.includes(forbidden)) {
        throw new Error(`Profile "${profile}" contains forbidden tool: ${forbidden}`);
      }
    }

    console.log(`✔ Profile "${profile ?? "default"}": ALL CHECKS PASSED`);
  } finally {
    await transport.close();
  }
}

async function main() {
  console.log("---------------------------------------------------------------");
  console.log("  NOSTRPULSE MCP PROFILE SUITE VERIFICATION                    ");
  console.log("---------------------------------------------------------------");

  for (const exp of PROFILES) {
    await testProfile(exp.profile, exp);
  }

  // Also test default fallback (no --profile flag)
  const fullExpectation = PROFILES.find((p) => p.profile === "full")!;
  await testProfile(null, fullExpectation);

  console.log("\n===============================================================");
  console.log("  ALL MCP PROFILES VERIFIED SUCCESSFULLY (100% COMPLIANT)      ");
  console.log("===============================================================\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
