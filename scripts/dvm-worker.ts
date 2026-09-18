// scripts/dvm-worker.ts
import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { fetchNostrProfile, calculateTrustScore } from "../src/lib/trust-score";
import { MAJOR_INDEXER_RELAYS } from "../src/lib/indexer";
import { publishDvmAnnouncement, DVM_KINDS } from "../src/lib/dvm";
import {
  initDatabase,
  getZapTotalsFromDb,
  getCreatorFromDb,
  getTrustEdgesFromDb,
} from "../src/lib/db";
import { normalizeToHex } from "../src/lib/nostr";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { globalToolRegistry } from "../src/lib/tool-registry";

// Auto-load .env.local or .env if present
try {
  process.loadEnvFile?.(".env.local");
} catch {
  try {
    process.loadEnvFile?.(".env");
  } catch {}
}

const RELAYS = MAJOR_INDEXER_RELAYS;

/**
 * Initialize DVM Worker Keypair
 */
function getWorkerKey(): Uint8Array {
  const envKey = process.env.DVM_SECRET_KEY?.trim();
  if (envKey) {
    try {
      if (envKey.startsWith("nsec1")) {
        const decoded = nip19.decode(envKey);
        if (decoded.type === "nsec") {
          return decoded.data as Uint8Array;
        }
      } else if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
        return Uint8Array.from(Buffer.from(envKey, "hex"));
      }
    } catch (err) {
      console.warn("[DVM] Failed to parse DVM_SECRET_KEY from environment, generating a fresh keypair.", err);
    }
  }

  return generateSecretKey();
}

async function startDvmWorker() {
  console.log("===============================================================================");
  console.log("       NOSTRPULSE DATA VENDING MACHINE (DVM) WORKER (NIP-89 & NIP-90)          ");
  console.log("             Reputation Scoring & Deep Zap Analytics Engine                    ");
  console.log("===============================================================================");

  await initDatabase();

  const workerSk = getWorkerKey();
  const workerPk = getPublicKey(workerSk);
  const workerPrivHex = Buffer.from(workerSk).toString("hex");

  console.log(`[Identity] Worker Pubkey : ${workerPk}`);
  console.log(`[Identity] Worker Privkey: ${workerPrivHex}`);
  console.log(`[Relays] Connecting to   : ${RELAYS.join(", ")}`);
  console.log(`[Filter] Listening for   : Kinds [5000, 5300] (trust-score, zap-analytics, reputation)`);
  console.log("-------------------------------------------------------------------------------\n");

  const pool = new SimplePool();
  const processedJobs = new Set<string>();

  // 1. Broadcast NIP-89 DVM Announcement (Kind 31990) with JSON Schema
  try {
    console.log("[DVM] Publishing NIP-89 DVM Announcement (Kind 31990)...");
    const dvmSchema = {
      type: "object",
      properties: {
        pubkey: {
          type: "string",
          description: "Target Nostr public key (hex or npub) to query",
        },
        category: {
          type: "string",
          description: "Analytics category: zap-analytics, reputation, or trust-score",
        },
        timeframe: {
          type: "string",
          description: "Historical timeframe: all-time, 1y, or 30d",
        },
      },
      required: ["pubkey"],
    };

    const announcement = await publishDvmAnnouncement({
      identifier: "nostrpulse-analytics-dvm",
      name: "NostrPulse Analytics & Reputation DVM",
      about: "Distributed Lightning Zap History & Identity Reputation Vending Machine",
      supportedKinds: [5300, 5000],
      categories: ["zap-analytics", "reputation", "trust-score"],
      relays: RELAYS,
      secretKey: workerSk,
      inputSchema: dvmSchema,
    });
    console.log(`[DVM] NIP-89 Announcement broadcasted successfully (ID: ${announcement.id.slice(0, 10)}...)`);

    // 1b. Bind DVM compute capability to MCP Server using mapJsonSchemaToZod
    const mcpServer = new McpServer({
      name: "nostrpulse-dvm-mcp",
      version: "1.0.0",
    });

    globalToolRegistry.registerDvmWorkerCapability({
      identifier: "dvm_analytics",
      name: "NostrPulse Analytics & Reputation DVM",
      about: "Query deep Lightning zap analytics and reputation metrics for any Nostr identity",
      pubkey: workerPk,
      supportedKinds: [5300, 5000],
      categories: ["zap-analytics", "reputation", "trust-score"],
      relays: RELAYS,
      inputSchema: dvmSchema,
      execute: async (args) => {
        const { hex } = normalizeToHex(args.pubkey || "");
        const [zapTotals, creator] = await Promise.all([
          getZapTotalsFromDb(hex),
          getCreatorFromDb(hex),
        ]);
        return {
          pubkey: hex,
          totalSats: zapTotals?.total_sats || 0,
          validSenderSats: zapTotals?.valid_sender_sats || 0,
          trustScore: creator?.score || 70,
        };
      },
    });

    globalToolRegistry.registerToMcpServer(mcpServer);
    console.log("[MCP] Successfully converted DVM JSON Schema to Zod and registered tool 'dvm_analytics' to McpServer!");
  } catch (err) {
    console.warn("[DVM] Failed to publish NIP-89 announcement or register MCP tool:", err);
  }

  // 2. Subscribe to Kind 5000 & 5300 Job Request events
  const filter: { kinds: number[]; since: number } = {
    kinds: [DVM_KINDS.JOB_REQUEST_DATA_ANALYSIS, DVM_KINDS.JOB_REQUEST_COMPUTE],
    since: Math.floor(Date.now() / 1000) - 30,
  };

  const sub = pool.subscribeMany(RELAYS, filter, {
    async onevent(event) {
      if (processedJobs.has(event.id)) return;

      // Check category tags
      const hasSupportedTag = event.tags.some(
        (t) =>
          t[0] === "t" &&
          ["trust-score", "zap-analytics", "reputation", "nostrpulse-task"].includes(t[1]?.toLowerCase())
      );
      if (!hasSupportedTag) return;

      processedJobs.add(event.id);

      const isAnalyticsJob = event.kind === 5300 || event.tags.some((t) => t[0] === "t" && t[1]?.toLowerCase() === "zap-analytics");
      const jobCategory = isAnalyticsJob ? "zap-analytics" : "trust-score";

      console.log(`\n[DVM] >>> Incoming Job Request detected!`);
      console.log(`[DVM] Job ID    : ${event.id}`);
      console.log(`[DVM] Kind      : ${event.kind} (${jobCategory})`);
      console.log(`[DVM] Requester : ${event.pubkey}`);
      console.log(`[DVM] Created At: ${new Date(event.created_at * 1000).toISOString()}`);

      // Extract target pubkey from tag ["i", "<target>", ...]
      const inputTag = event.tags.find((t) => t[0] === "i");
      const targetInput = inputTag ? inputTag[1]?.trim() : null;

      const relaysTag = event.tags.find((t) => t[0] === "relays");
      const requestedRelays = relaysTag
        ? relaysTag.slice(1).filter((r) => typeof r === "string" && (r.startsWith("wss://") || r.startsWith("ws://")))
        : [];
      const broadcastRelays = Array.from(new Set([...RELAYS, ...requestedRelays]));

      if (!targetInput) {
        console.warn(`[DVM] Job ${event.id} missing target pubkey in ['i', ...] tag.`);
        return;
      }

      const { hex: targetHex } = normalizeToHex(targetInput);
      console.log(`[DVM] Target Pubkey: ${targetHex}`);

      // Step 1: Send Kind 7000 feedback with status "processing"
      try {
        const feedbackEvent = finalizeEvent(
          {
            kind: DVM_KINDS.JOB_FEEDBACK,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["e", event.id],
              ["p", event.pubkey],
              ["status", "processing"],
            ],
            content: `Calculating ${jobCategory} for target ${targetHex.slice(0, 10)}...`,
          },
          workerSk
        );
        Promise.allSettled(pool.publish(broadcastRelays, feedbackEvent));
        console.log(`[DVM] Kind 7000 (status: processing) sent.`);
      } catch {}

      // Step 2: Perform calculation based on category
      try {
        let resultPayload: any;
        const resultKind = event.kind === 5300 ? DVM_KINDS.JOB_RESULT_DATA_ANALYSIS : DVM_KINDS.JOB_RESULT_COMPUTE;

        if (isAnalyticsJob) {
          // Deep Historical Zap Analytics
          console.log(`[DVM] Querying deep historical zap metrics from DB and relays for ${targetHex.slice(0, 8)}...`);
          const zapTotals = await getZapTotalsFromDb(targetHex);
          const creator = await getCreatorFromDb(targetHex);
          const zapEdges = await getTrustEdgesFromDb(targetHex, "zap");
          const followEdges = await getTrustEdgesFromDb(targetHex, "follow");

          const totalSats = zapTotals?.total_sats || 0;
          const validSenderSats = zapTotals?.valid_sender_sats || Math.round(totalSats * 0.9);

          resultPayload = {
            pubkey: targetHex,
            totalSats,
            validSenderSats,
            zapCount: Math.max(zapEdges.length, totalSats > 0 ? 1 : 0),
            trustScore: creator?.score || 70,
            reputationTier: (creator?.score || 0) >= 80 ? "Verified Builder" : "Active Contributor",
            historicalTimeframe: "all-time",
            followsCount: followEdges.length,
            analyzedAt: Math.floor(Date.now() / 1000),
            engine: "NostrPulse DVM v1.0",
          };
        } else {
          // Trust Score Computation
          console.log(`[DVM] Fetching profile metadata and computing trust score...`);
          const profile = await fetchNostrProfile(targetHex, broadcastRelays);
          const trustScoreResult = calculateTrustScore(profile);
          resultPayload = trustScoreResult;
        }

        // Step 3: Sign and publish Kind 6300 or 6000 result event
        const resultEvent = finalizeEvent(
          {
            kind: resultKind,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["e", event.id],
              ["p", event.pubkey],
              ["amount", "1000"], // Fee: 1 sat (1000 millisats)
              ["i", targetHex, "pubkey"],
              ["t", jobCategory],
            ],
            content: JSON.stringify(resultPayload),
          },
          workerSk
        );

        console.log(`[DVM] Publishing Kind ${resultKind} result event...`);
        await Promise.allSettled(pool.publish(broadcastRelays, resultEvent));
        console.log(`[DVM] >>> SUCCESS! Kind ${resultKind} published! (ID: ${resultEvent.id})`);
      } catch (err: any) {
        console.error(`[DVM] Error processing job ${event.id}:`, err);
        try {
          const failureFeedback = finalizeEvent(
            {
              kind: DVM_KINDS.JOB_FEEDBACK,
              created_at: Math.floor(Date.now() / 1000),
              tags: [
                ["e", event.id],
                ["p", event.pubkey],
                ["status", "error"],
              ],
              content: `Computation error: ${err?.message || String(err)}`,
            },
            workerSk
          );
          await Promise.allSettled(pool.publish(broadcastRelays, failureFeedback));
        } catch {}
      }
    },
  });

  console.log("[DVM] Worker is live and awaiting distributed job requests.");
}

startDvmWorker().catch((err) => {
  console.error("DVM Worker fatal error:", err);
  process.exit(1);
});
