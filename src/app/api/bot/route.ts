import {
  streamText,
  tool,
  isStepCount,
  convertToModelMessages,
  type ModelMessage,
} from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { normalizeToHex } from "@/lib/nostr";
import { FEATURED_CREATORS } from "@/lib/creators";
import {
  sendCashuNutZap,
  parseCashuToken,
  verifyTokenWithMint,
  DEFAULT_CASHU_MINT,
} from "@/lib/cashu";

interface IncomingPart {
  type?: string;
  text?: string;
}

interface RawMessage {
  role?: string;
  content?: string;
  text?: string;
  parts?: IncomingPart[];
}

export const maxDuration = 30;

// Tool 1: find_creator
// Takes a creator name or identifier (e.g. "jb55") and resolves it to a standard Nostr Hex Pubkey
const findCreator = tool({
  description:
    "Find a Nostr creator by name, handle, or npub, and resolve their standard 64-character Hex Pubkey and profile information.",
  inputSchema: z.object({
    name: z
      .string()
      .describe(
        "The name, handle, npub, or pubkey of the creator (e.g. 'jb55', 'jack', 'fiatjaf')"
      ),
  }),
  execute: async ({ name }) => {
    const { hex, npub } = normalizeToHex(name);
    const cleanName = name.trim().toLowerCase();

    // Match with database first, then fallback to featured creators cache
    let matched = null;
    try {
      const { getCreatorFromDb } = await import("@/lib/db");
      const dbMatch = await getCreatorFromDb(hex || cleanName);
      if (dbMatch) {
        matched = dbMatch;
      }
    } catch {}

    if (!matched) {
      matched = FEATURED_CREATORS.find(
        (c) =>
          c.npub === npub ||
          c.pubkey?.toLowerCase() === hex.toLowerCase() ||
          c.handle?.toLowerCase() === cleanName ||
          c.name?.toLowerCase() === cleanName
      ) || null;
    }

    const isValidHex = /^[0-9a-fA-F]{64}$/.test(hex);

    return {
      query: name,
      hexPubkey: hex,
      npub,
      isValidHex,
      creator: matched
        ? {
            name: matched.name,
            handle: matched.handle,
            about: matched.about,
            picture: matched.picture,
            nip05: matched.nip05,
            lud16: matched.lud16,
          }
        : null,
      message: isValidHex
        ? `Found Nostr Hex Pubkey: ${hex}`
        : `Could not resolve a valid 64-character Hex Pubkey for "${name}".`,
    };
  },
});

// Tool 2 Factory: execute_nutzap
// Takes Pubkey, Sats amount, and Cashu Token, then sends an encrypted NIP-61 NutZap via NIP-44
const createExecuteNutzapTool = (sessionToken?: string) =>
  tool({
    description:
      "Execute an encrypted Cashu NutZap (NIP-61 Kind 9321 via NIP-44) to a Nostr recipient pubkey using a Cashu eCash token budget.",
    inputSchema: z.object({
      pubkey: z
        .string()
        .describe("The recipient's Nostr public key (64-character hex or npub)"),
      amountSats: z
        .number()
        .positive()
        .describe("The amount in Satoshis to send (e.g. 21)"),
      cashuToken: z
        .string()
        .optional()
        .describe(
          "The Cashu eCash token string (cashuA... or cashuB...). Optional if budget is already loaded in session."
        ),
      comment: z
        .string()
        .optional()
        .describe("Optional note or memo for the recipient"),
    }),
    execute: async ({ pubkey, amountSats, cashuToken, comment }) => {
      try {
        const activeToken = cashuToken?.trim() || sessionToken?.trim();
        if (!activeToken) {
          return {
            success: false,
            error:
              "No Cashu token provided. Please fund the Agent with a valid Cashu eCash token budget first.",
          };
        }

        // 1. Resolve and validate recipient hex pubkey
        const { hex: hexPubkey } = normalizeToHex(pubkey);
        if (!hexPubkey || !/^[0-9a-fA-F]{64}$/.test(hexPubkey)) {
          return {
            success: false,
            error: `Invalid recipient pubkey format: "${pubkey}". Must be a valid 64-character hex or npub.`,
          };
        }

        // 2. Inspect and validate Cashu token balance
        let mintUrl = DEFAULT_CASHU_MINT;
        try {
          const tokenInfo = parseCashuToken(activeToken);
          if (tokenInfo.mint) {
            mintUrl = tokenInfo.mint;
          }
          if (tokenInfo.totalAmountSats < amountSats) {
            return {
              success: false,
              error: `Insufficient token balance: Cashu token contains ${tokenInfo.totalAmountSats} sats, but ${amountSats} sats was requested.`,
            };
          }
        } catch (parseError: unknown) {
          const errorMsg =
            parseError instanceof Error
              ? parseError.message
              : "Failed to decode Cashu token payload";
          return {
            success: false,
            error: `Invalid Cashu token: ${errorMsg}`,
          };
        }

        // 3. Verify token has not already been spent with the Mint node
        const mintVerification = await verifyTokenWithMint(activeToken);
        if (!mintVerification.isValid) {
          return {
            success: false,
            error:
              mintVerification.reason ||
              "This Cashu eCash token has already been spent or claimed.",
          };
        }

        // 4. Send encrypted NutZap (NIP-61) to Nostr relays
        const zapEvent = await sendCashuNutZap({
          recipientPubkey: hexPubkey,
          cashuToken: activeToken,
          amountSats,
          comment: comment || "Value-4-Value eCash NutZap 🥜 via NostrPulse Agent",
          mintUrl,
        });

        return {
          success: true,
          eventId: zapEvent.id,
          changeToken: zapEvent.changeToken,
          recipientPubkey: hexPubkey,
          amountSats,
          mintUrl,
          message: `Successfully sent ${amountSats} sats NutZap to ${hexPubkey}! Event published to relays.`,
        };
      } catch (error: unknown) {
        // Catch network errors, relay broadcast issues, or cryptographic failures
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Failed to execute NutZap due to network or token error.";
        return {
          success: false,
          error: errorMsg,
        };
      }
    },
  });

// GET handler: Health check and agent capability info
export async function GET() {
  return Response.json({
    status: "ok",
    agent: "NostrPulse Agent API",
    tools: ["find_creator", "execute_nutzap"],
  });
}

// POST handler: AI streaming with tools
export async function POST(req: Request) {
  try {
    // Extract token from request headers or JSON body
    const headerToken = req.headers.get("x-cashu-token") || "";
    const body = (await req.json()) as {
      cashuToken?: string;
      messages?: RawMessage[];
      prompt?: string;
    };

    let sessionToken = (body.cashuToken || headerToken || "").trim();
    const rawMessages: RawMessage[] =
      body.messages ||
      (body.prompt ? [{ role: "user", content: body.prompt }] : []);

    // Fallback: extract cashu token from raw messages if not in body/header
    if (!sessionToken && Array.isArray(rawMessages)) {
      for (const msg of rawMessages) {
        if (typeof msg.content === "string") {
          const match = msg.content.match(/\b(cashu[AB][A-Za-z0-9_-]+)/);
          if (match) {
            sessionToken = match[1];
            break;
          }
        }
      }
    }

    // Inspect budget info if session token is provided
    let budgetInfo: { sats: number; mint: string } | null = null;
    if (sessionToken) {
      try {
        const parsed = parseCashuToken(sessionToken);
        budgetInfo = { sats: parsed.totalAmountSats, mint: parsed.mint };
      } catch {
        // Token parse fallback
      }
    }

    // Convert UI messages ({ parts: [...] }) to model messages with `content`
    let formattedMessages: ModelMessage[] = [];
    try {
      formattedMessages = await convertToModelMessages(
        rawMessages as Parameters<typeof convertToModelMessages>[0],
        {
          ignoreIncompleteToolCalls: true,
        }
      );
    } catch {
      // Fallback mapping: extract text from parts and assign to content
      formattedMessages = rawMessages.map((msg: RawMessage): ModelMessage => {
        const role =
          msg.role === "assistant" || msg.role === "system"
            ? msg.role
            : "user";
        if (typeof msg.content === "string") {
          return { role, content: msg.content };
        }
        if (Array.isArray(msg.parts)) {
          const text = msg.parts
            .filter(
              (p): p is IncomingPart & { text: string } =>
                Boolean(p && typeof p.text === "string")
            )
            .map((p) => p.text)
            .join("\n")
            .trim();
          return { role, content: text };
        }
        return {
          role,
          content: typeof msg.text === "string" ? msg.text : "",
        };
      });
    }

    const executeNutzap = createExecuteNutzapTool(sessionToken);

    const budgetStatusText = budgetInfo
      ? `ACTIVE WALLET STATUS: Fully funded with ${budgetInfo.sats} Satoshis from Mint ${budgetInfo.mint}.\n` +
        "You have direct authorization to spend from this active session budget.\n" +
        "You do NOT need to ask the user for a token or confirm wallet balance."
      : sessionToken
      ? `ACTIVE WALLET STATUS: Fully funded with an active session token (${sessionToken.slice(0, 15)}...). You have direct authorization to spend from this active session budget.`
      : "ACTIVE WALLET STATUS: No Cashu token is currently loaded. If the user asks you to send or tip sats, politely inform them to paste a Cashu token into the Machine Money Vault above.";

    const systemPrompt =
      "You are NostrPulse Agent, an autonomous Web3 AI agent specialized in Nostr identity resolution and Cashu eCash Value-4-Value micropayments.\n\n" +
      "LANGUAGE & FORMATTING RULES:\n" +
      "1. Respond completely in natural, concise, and professional English.\n" +
      "2. CRITICAL: Do NOT use markdown bold/italic asterisks (**) or bullet asterisks (*) in any output. Write clean, plain text without asterisks.\n\n" +
      "TOOLS:\n" +
      "1. find_creator: Resolves any Nostr creator name, handle, or npub into a standard 64-character Hex Pubkey.\n" +
      "2. execute_nutzap: Sends encrypted Chaumian eCash NutZaps (NIP-61 Kind 9321) to a Nostr recipient pubkey.\n\n" +
      budgetStatusText + "\n\n" +
      "AUTONOMOUS EXECUTION WORKFLOW:\n" +
      (sessionToken
        ? "- When asked to tip, zap, or send sats to any creator:\n" +
          "  You have an active session token loaded. YOU MUST EXECUTE THE TRANSACTION AUTONOMOUSLY.\n" +
          "  Step 1: If the recipient pubkey is not provided as a 64-character hex, call find_creator immediately.\n" +
          "  Step 2: Immediately call execute_nutzap with the resolved pubkey and the requested amount in Sats. Leave cashuToken omitted or empty as the server injects the active session budget automatically.\n" +
          "  DO NOT stop to ask the user for confirmation.\n" +
          "  DO NOT say you lack a token or that you cannot send sats, because the session token is already loaded.\n" +
          "  Execute both tools in sequence to complete the payment in the same turn.\n"
        : "- When asked to tip, zap, or send sats without a loaded budget:\n" +
          "  Remind the user to load a Cashu token into the Machine Money Vault first.\n") +
      "- When asked about your wallet balance or budget:\n" +
      (budgetInfo
        ? `  Report that your wallet has an active budget of ${budgetInfo.sats} Sats from Mint ${budgetInfo.mint}.`
        : sessionToken
        ? "  Report that your wallet is loaded with an active Cashu eCash token budget ready for spending."
        : "  Report that your wallet is currently unfunded (0 Sats) and waiting for a Cashu token deposit.");

    const result = streamText({
      model: google(process.env.GOOGLE_MODEL || "gemini-3.8-flash"),
      system: systemPrompt,
      messages: formattedMessages,
      tools: {
        find_creator: findCreator,
        execute_nutzap: executeNutzap,
      },
      stopWhen: isStepCount(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
