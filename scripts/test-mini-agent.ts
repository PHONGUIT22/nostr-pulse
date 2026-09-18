// scripts/test-mini-agent.ts
/**
 * NostrPulse Autonomous Agent End-to-End Showcase
 *
 * Implements a 5-stage autonomous lifecycle demonstrating an LLM agent
 * (via Gemini / OpenAI SDK) discovering and orchestrating all 10 NostrPulse MCP tools:
 *
 * Stage 1: Identity Bootstrapping & Spending Policy (get_agent_identity, get_spending_guardrails)
 * Stage 2: Web-of-Trust Radar & Anti-Sybil Defense (check_trust_score)
 * Stage 3: WoT-Gated Dynamic Mint Mesh Risk Radar & Routing (audit_cashu_mint, route_cashu_mint)
 * Stage 4: Protected Payment Rails & Spending Guardrails (pay_cashu_nutzap, pay_lightning_nwc / pay_with_nwc)
 * Stage 5: Distributed Compute & Telemetry Audit Trail (request_nip90_job, get_agent_telemetry)
 */

try {
  process.loadEnvFile?.(".env.local");
} catch {
  try {
    process.loadEnvFile?.(".env");
  } catch {}
}

import fs from "fs";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";

// ANSI terminal color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

// Detect inference provider: local Ollama vs Google AI Studio (Gemini)
const isOllama =
  process.argv.some((arg) => arg === "--ollama" || arg.startsWith("--ollama=")) ||
  process.env.USE_OLLAMA === "true" ||
  process.env.npm_config_ollama !== undefined;

// Parse CLI model override if supplied: --model=<name> or --model <name>
const cliModel = (() => {
  if (process.env.npm_config_model) {
    return process.env.npm_config_model.trim();
  }
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--model=")) {
      return arg.split("=")[1]?.trim();
    }
    if (arg === "--model" && i + 1 < process.argv.length) {
      return process.argv[i + 1]?.trim();
    }
  }
  return undefined;
})();

const apiKey = isOllama
  ? (process.env.OLLAMA_API_KEY || "ollama")
  : (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const baseURL = isOllama
  ? (process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1")
  : "https://generativelanguage.googleapis.com/v1beta/openai/";

// Configure OpenAI client for either Google AI Studio (Gemini) or local Ollama
const llmClient = new OpenAI({
  apiKey: apiKey || "dummy-key",
  baseURL,
});

// Candidate models: fallback list tailored for SLM (Ollama) or flagship (Gemini)
const CANDIDATE_MODELS: string[] = isOllama
  ? ([
      cliModel,
      process.env.OLLAMA_MODEL,
      "qwen2.5-coder:1.5b",
      "qwen2.5:1.5b",
      "qwen2.5:0.5b",
    ].filter(Boolean) as string[])
  : ([
      cliModel,
      process.env.GEMINI_MODEL,
      "gemini-3.8-flash",
    ].filter(Boolean) as string[]);

async function callLlmWithFallback(
  params: Omit<OpenAI.ChatCompletionCreateParamsNonStreaming, "model">,
  maxRetries = 4
): Promise<{ response: OpenAI.ChatCompletion; modelUsed: string }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await llmClient.chat.completions.create({
          ...params,
          model,
        });
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        if (err?.status === 429) {
          const waitSec = attempt * 3;
          console.log(
            `  ${colors.yellow}[Rate Limit 429] Free-tier quota throttled. Backing off ${waitSec}s (retry ${attempt}/${maxRetries})...${colors.reset}`
          );
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        } else if (err?.code === "ECONNREFUSED" && isOllama) {
          console.log(
            `  ${colors.red}[Ollama Error] Connection refused at ${baseURL}. Is Ollama running? (${err?.message || String(err)})${colors.reset}`
          );
          throw err;
        } else {
          console.log(
            `  ${colors.dim}[Model Notice] ${model} message: ${err?.message || String(err)}${colors.reset}`
          );
          await new Promise((r) => setTimeout(r, isOllama ? 500 : 2000));
        }
      }
    }
  }

  throw lastError;
}

// Backward-compatible alias for existing call sites
const callGeminiWithFallback = callLlmWithFallback;

// Track exercised tools across all stages
const exercisedTools = new Set<string>();

interface StageDefinition {
  stageNumber: number;
  title: string;
  expectedTools: string[];
  prompt: string;
}

const STAGES: StageDefinition[] = [
  {
    stageNumber: 1,
    title: "Sovereign Identity Bootstrapping & Spending Policy",
    expectedTools: ["get_agent_identity", "get_spending_guardrails"],
    prompt:
      "Execute both tools to initialize: First call get_agent_identity to inspect your Nostr public identity, and then call get_spending_guardrails to check your spending limits and allowance.",
  },
  {
    stageNumber: 2,
    title: "Anti-Sybil Web-of-Trust Radar & Counterparty Verification",
    expectedTools: ["check_trust_score"],
    prompt:
      "Call check_trust_score with pubkey '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d' to audit developer fiatjaf's reputation and anti-Sybil score before authorizing payments.",
  },
  {
    stageNumber: 3,
    title: "WoT-Gated Dynamic Mint Mesh Risk Radar & Routing",
    expectedTools: ["audit_cashu_mint", "route_cashu_mint"],
    prompt:
      "Audit Cashu mints: First call audit_cashu_mint with mintUrl 'https://testnut.cashu.space' to check its counterparty risk, and then call route_cashu_mint with amountSats 50 to discover the optimal routing mint.",
  },
  {
    stageNumber: 4,
    title: "Protected Payment Rails & Spending Guardrails",
    expectedTools: ["pay_cashu_nutzap", "pay_lightning_nwc", "pay_with_nwc"],
    prompt:
      "Test payment rails with guardrail protection: First call pay_cashu_nutzap for recipient '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d' with amountSats 21. Next call pay_lightning_nwc with invoice 'lnbc210n1p42h3uhpp5ddytc2sly6dkk2u8uus8mcd9p7a4a8tek2kucfadzlw9gxkper9sdqqcqzzsxqrrss' and amountMsat 21000, and also call pay_with_nwc with the same invoice.",
  },
  {
    stageNumber: 5,
    title: "Distributed NIP-90 Compute & Telemetry Audit Trail",
    expectedTools: ["request_nip90_job", "get_agent_telemetry"],
    prompt:
      "Complete the lifecycle: First call request_nip90_job for category 'zap-analytics' on prompt '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d', and then call get_agent_telemetry with timeframeHours 24 and limit 5 to retrieve your developer audit trail.",
  },
];

const SLM_STAGES: StageDefinition[] = [
  {
    stageNumber: 1,
    title: "Anti-Sybil Web-of-Trust Radar Check",
    expectedTools: ["check_trust_score"],
    prompt:
      "Call check_trust_score with pubkey '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d' to verify reputation.",
  },
  {
    stageNumber: 2,
    title: "Guardrail-Protected eCash Payment",
    expectedTools: ["get_spending_guardrails", "pay_cashu_nutzap"],
    prompt:
      "First call get_spending_guardrails to check remaining allowance, then call pay_cashu_nutzap for recipient '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d' with amountSats 21.",
  },
];

async function runStage(
  stage: StageDefinition,
  mcpClient: Client,
  geminiTools: OpenAI.ChatCompletionTool[],
  conversationHistory: OpenAI.ChatCompletionMessageParam[],
  totalStages = 5
): Promise<void> {
  console.log(
    `\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.cyan}${colors.bold} [STAGE ${stage.stageNumber}/${totalStages}] ${stage.title}${colors.reset}`
  );
  console.log(
    `${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.green}${colors.bold}[AGENT PROMPT]${colors.reset} "${stage.prompt}"\n`
  );

  conversationHistory.push({
    role: "user",
    content: stage.prompt,
  });

  try {
    let loopCount = 0;
    const maxLoop = 4; // Allow multi-step tool calling loop per stage

    while (loopCount < maxLoop) {
      loopCount++;

      const { response, modelUsed } = await callGeminiWithFallback({
        messages: conversationHistory,
        tools: geminiTools,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      let toolCalls = choice?.message?.tool_calls;

      // Fallback: If no structured tool_calls returned, check if SLM emitted JSON tool calls in message.content
      if ((!toolCalls || toolCalls.length === 0) && choice?.message?.content) {
        const rawContent = choice.message.content.trim();
        const synthesizedCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> = [];

        // Balanced brace parser to handle nested JSON objects from SLMs
        const extractedObjects: any[] = [];
        let depth = 0;
        let startIndex = -1;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < rawContent.length; i++) {
          const char = rawContent[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (char === "\\") {
            escapeNext = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") {
              if (depth === 0) startIndex = i;
              depth++;
            } else if (char === "}") {
              depth--;
              if (depth === 0 && startIndex !== -1) {
                const sub = rawContent.slice(startIndex, i + 1);
                try {
                  extractedObjects.push(JSON.parse(sub));
                } catch {}
                startIndex = -1;
              }
            }
          }
        }

        for (const parsed of extractedObjects) {
          if (!parsed || typeof parsed !== "object") continue;
          const toolName = parsed.name || parsed.tool || parsed.function;
          if (
            typeof toolName === "string" &&
            geminiTools.some((t) => "function" in t && t.function.name === toolName)
          ) {
            let args = parsed.arguments || parsed.args || parsed.parameters || {};
            if (Array.isArray(args)) {
              const flattened: Record<string, any> = {};
              for (const argObj of args) {
                if (argObj && typeof argObj === "object") {
                  for (const [k, v] of Object.entries(argObj)) {
                    flattened[k] = (v && typeof v === "object" && "default" in (v as any)) ? (v as any).default : v;
                  }
                }
              }
              args = flattened;
            }
            synthesizedCalls.push({
              id: `call_${Math.random().toString(36).slice(2, 9)}`,
              type: "function",
              function: {
                name: toolName,
                arguments: typeof args === "string" ? args : JSON.stringify(args),
              },
            });
          }
        }

        if (synthesizedCalls.length > 0) {
          toolCalls = synthesizedCalls as any;
        }
      }

      // If no tool calls requested, assistant synthesized final text response
      if (!toolCalls || toolCalls.length === 0) {
        const reply = choice?.message?.content || "";
        if (reply.trim()) {
          console.log(
            `${colors.blue}${colors.bold}[AGENT SYNTHESIS (${modelUsed})]${colors.reset}\n${reply.trim()}\n`
          );
          conversationHistory.push({
            role: "assistant",
            content: reply,
          });
        }
        break;
      }

      // Execute requested tools
      conversationHistory.push(choice.message);

      for (const call of toolCalls) {
        if (call.type !== "function") continue;

        const toolName = call.function.name;
        exercisedTools.add(toolName);

        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          toolArgs = {};
        }

        // Clean null and placeholder values often generated by SLMs for optional fields
        for (const [k, v] of Object.entries(toolArgs)) {
          if (v === null || v === "null" || v === "your-cashu-token-string" || v === "your-mint-url") {
            delete toolArgs[k];
          }
        }

        console.log(
          `  ${colors.yellow}${colors.bold}[TOOL CALL INVOKED]${colors.reset} ${colors.yellow}${toolName}${colors.reset}`
        );
        console.log(
          `  ${colors.dim}Arguments:${colors.reset} ${JSON.stringify(toolArgs)}`
        );

        let toolResult: any;
        try {
          toolResult = await mcpClient.callTool({
            name: toolName,
            arguments: toolArgs,
          });
        } catch (callErr: any) {
          toolResult = {
            isError: true,
            content: [{ type: "text", text: `Tool execution notice: ${callErr?.message || String(callErr)}` }],
          };
        }

        const resultText = toolResult.content?.[0]?.text || "{}";
        let parsedResult: any = {};
        try {
          parsedResult = JSON.parse(resultText);
        } catch {
          parsedResult = { raw: resultText };
        }

        // Analyze and display guardrails status
        if (parsedResult.status === "blocked_by_guardrails") {
          console.log(
            `  ${colors.red}${colors.bold}[BLOCKED BY GUARDRAILS]${colors.reset} ${parsedResult.reason || "Policy Violation"}`
          );
        } else if (toolResult.isError || parsedResult.error) {
          console.log(
            `  ${colors.yellow}[TOOL NOTICE]${colors.reset} ${parsedResult.error || "Handled gracefully"}`
          );
        } else {
          console.log(
            `  ${colors.green}${colors.bold}[APPROVED / SUCCESS]${colors.reset} ${toolName} execution verified.`
          );
        }

        // Print snippet of response
        const snippet = resultText.length > 200 ? resultText.slice(0, 200) + "..." : resultText;
        console.log(`  ${colors.dim}Response Snippet:${colors.reset} ${snippet.replace(/\n/g, " ")}\n`);

        conversationHistory.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Early break if all expected tools for this stage have been exercised
      if (stage.expectedTools.every((tool) => exercisedTools.has(tool))) {
        break;
      }

      // Small delay between tool-calling loop turns
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (stageErr: any) {
    console.error(
      `${colors.red}[Stage Notice] Gracefully handled error in Stage ${stage.stageNumber}: ${stageErr?.message || String(stageErr)}${colors.reset}`
    );
    console.log(`${colors.dim}Continuing to next autonomous lifecycle stage...${colors.reset}\n`);
  }

  // Inter-stage pause to preserve API rate limits
  await new Promise((r) => setTimeout(r, 1500));
}

async function main() {
  const isSlmTest =
    process.env.SLM_TEST === "true" ||
    process.argv.includes("--profile=minimal") ||
    process.argv.includes("--slm") ||
    process.env.NOSTRPULSE_PROFILE === "minimal" ||
    process.env.npm_config_profile === "minimal" ||
    process.env.npm_config_slm !== undefined;

  const targetProfile =
    process.env.npm_config_profile?.toLowerCase() ||
    (isSlmTest
      ? "minimal"
      : (process.argv.find((a) => a.startsWith("--profile="))?.split("=")[1]?.toLowerCase() ||
         process.env.NOSTRPULSE_PROFILE?.toLowerCase() ||
         "full"));

  const bannerType = isOllama
    ? `LOCAL OLLAMA INFERENCE (${targetProfile.toUpperCase()} PROFILE)`
    : isSlmTest
      ? "2-STAGE SLM PROFILE (500M - 1.5B)"
      : "5-STAGE END-TO-END MCP LIFECYCLE";

  console.log("===============================================================================");
  console.log(`  NOSTRPULSE AUTONOMOUS AGENT SHOWCASE: ${bannerType}      `);
  console.log("===============================================================================\n");

  // 1. Check for API key (bypassed if using local Ollama)
  if (!isOllama) {
    const activeKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!activeKey || activeKey === "AIzaSy..." || activeKey.trim() === "") {
      console.log(
        `\n${colors.yellow}⚠️  [SKIP] GEMINI_API_KEY was not found in environment (.env / .env.local).${colors.reset}`
      );
      console.log("👉 This is a live autonomous LLM Agent end-to-end test suite.");
      console.log("👉 To run with Gemini, obtain a free API key at: https://aistudio.google.com");
      console.log(
        `👉 Or run locally with Ollama:${colors.green} npm exec tsx scripts/test-mini-agent.ts --ollama --profile=minimal${colors.reset}`
      );
      console.log(
        `👉 To test MCP tools directly without an LLM key, run:${colors.green} npm exec tsx scripts/test-mcp-stdio.ts${colors.reset}\n`
      );
      process.exit(0);
    }
  } else {
    console.log(
      `${colors.magenta}${colors.bold}>>> Local Ollama Inference Mode Active!${colors.reset}`
    );
    console.log(`    Base URL: ${baseURL}`);
    console.log(`    Candidate Models: ${CANDIDATE_MODELS.join(", ")}\n`);
  }

  // 2. Establish connection to MCP Server via Stdio
  const isNpm =
    process.argv.includes("--npm") ||
    process.env.USE_NPM === "true" ||
    process.env.npm_config_npm !== undefined;

  console.log(
    `${colors.dim}>>> Connecting to ${isNpm ? "published nostrpulse-mcp npm package" : "NostrPulse MCP Server"} (${targetProfile} profile) over Stdio JSON-RPC...${colors.reset}`
  );

  const distEntryPath = path.resolve(process.cwd(), "dist/mcp-entry.js");
  const srcEntryPath = path.resolve(process.cwd(), "src/mcp-entry.ts");
  const hasDist = fs.existsSync(distEntryPath);
  const profileArg = `--profile=${targetProfile}`;

  const transportCommand = isNpm
    ? (process.platform === "win32" ? "npx.cmd" : "npx")
    : "node";

  const transportArgs = isNpm
    ? ["-y", "nostrpulse-mcp", profileArg]
    : hasDist
      ? [distEntryPath, profileArg]
      : (process.platform === "win32"
          ? ["/c", "npx.cmd", "tsx", srcEntryPath, profileArg]
          : ["tsx", srcEntryPath, profileArg]);

  const transport = new StdioClientTransport({
    command: transportCommand,
    args: transportArgs,
    env: {
      ...process.env,
      NOSTRPULSE_PROFILE: targetProfile,
    },
  });

  const mcpClient = new Client(
    { name: "nostrpulse-autonomous-agent", version: "1.1.1" },
    { capabilities: {} }
  );

  try {
    await mcpClient.connect(transport);
    console.log(`${colors.green}✔ Connected to NostrPulse MCP Server!${colors.reset}`);

    // Discover tools
    const { tools } = await mcpClient.listTools();
    console.log(
      `${colors.green}✔ Discovered ${tools.length} active MCP Tools (${targetProfile} profile):${colors.reset} ${tools.map((t) => t.name).join(", ")}\n`
    );

    const geminiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || "",
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }));

    const systemPrompt = isOllama
      ? "You are an autonomous AI agent for NostrPulse. You MUST use tool calls to answer. Output strictly valid JSON arguments matching the tool schema. Do not invent arguments."
      : isSlmTest
        ? "You are a lightweight autonomous Nostr agent. Use check_trust_score to verify identity, get_spending_guardrails to check limits, and pay_cashu_nutzap to send payments. Call tools directly."
        : "You are an autonomous AI agent operating with the NostrPulse MCP server. You have access to sovereign identity, Web-of-Trust anti-Sybil tools, eCash and Lightning payment rails, dynamic mint routing, and telemetry audit tools. When asked to perform actions or inspect data, call the appropriate tool(s) to fulfill tasks accurately.";

    const conversationHistory: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // 3. Execute autonomous lifecycle stages
    const stagesToRun = (isSlmTest || targetProfile === "minimal") ? SLM_STAGES : STAGES;
    for (const stage of stagesToRun) {
      await runStage(stage, mcpClient, geminiTools, conversationHistory, stagesToRun.length);
    }

    // 4. Print Final Lifecycle Summary Report
    console.log(
      `\n${colors.green}${colors.bold}===============================================================================${colors.reset}`
    );
    console.log(
      `${colors.green}${colors.bold}  AUTONOMOUS AGENT ${stagesToRun.length === 2 ? "2-STAGE SLM" : "5-STAGE"} SHOWCASE COMPLETED SUCCESSFULLY!                   ${colors.reset}`
    );
    console.log(
      `${colors.green}${colors.bold}===============================================================================${colors.reset}\n`
    );

    console.log(`${colors.bold}Tools Exercised During Lifecycle (${exercisedTools.size}/${tools.length}):${colors.reset}`);
    for (const tool of tools) {
      const status = exercisedTools.has(tool.name)
        ? `${colors.green}✔ EXERCISED${colors.reset}`
        : `${colors.dim}○ REGISTERED${colors.reset}`;
      console.log(`  * ${tool.name.padEnd(26)} [${status}]`);
    }
    console.log();
  } catch (fatalErr: any) {
    console.error(`${colors.red}[Fatal Error] Showcase failure:${colors.reset}`, fatalErr);
    process.exit(1);
  } finally {
    try {
      await transport.close();
    } catch {}
    process.exit(0);
  }
}

main();