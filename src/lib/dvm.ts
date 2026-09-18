// src/lib/dvm.ts
/**
 * Nostr Data Vending Machine (DVM) Module (NIP-89 & NIP-90)
 *
 * Implements distributed computation requests for heavy analytics (such as deep historical
 * zap history, cumulative sats volume, and reputation metrics) across Nostr DVMs.
 *
 * If the distributed DVMs do not respond within the configured timeout window,
 * automatically falls back gracefully to querying the internal SQLite database.
 */

import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { Event, EventTemplate, VerifiedEvent } from "nostr-tools";
import { getNostrPool, normalizeToHex } from "@/lib/nostr";
import { MAJOR_INDEXER_RELAYS } from "@/lib/indexer";
import {
  initDatabase,
  getZapTotalsFromDb,
  getCreatorFromDb,
  getTrustEdgesFromDb,
  upsertZapTotals,
} from "@/lib/db";
import {
  mapJsonSchemaToZod,
  ToolRegistry,
  globalToolRegistry,
  type ToolInputSchema,
  type Tool,
} from "./tool-registry";
import {
  BaseExecutor,
  DvmJobExecutor,
  globalDvmExecutor,
} from "./base-executor";

export {
  mapJsonSchemaToZod,
  ToolRegistry,
  globalToolRegistry,
  BaseExecutor,
  DvmJobExecutor,
  globalDvmExecutor,
};
export type { ToolInputSchema, Tool };

// Major relays for NIP-89/NIP-90 DVM discovery & job dispatching
export const DVM_DEFAULT_RELAYS = MAJOR_INDEXER_RELAYS;

// Standard NIP-90 Kinds for Data Processing & Analytics
export const DVM_KINDS = {
  JOB_REQUEST_DATA_ANALYSIS: 5300,
  JOB_REQUEST_COMPUTE: 5000,
  JOB_RESULT_DATA_ANALYSIS: 6300,
  JOB_RESULT_COMPUTE: 6000,
  JOB_FEEDBACK: 7000,
  NIP89_DVM_ANNOUNCEMENT: 31990,
} as const;

export interface DvmAnalyticsRequest {
  targetPubkey: string;
  category?: "zap-analytics" | "reputation" | "trust-score";
  timeframe?: "all-time" | "1y" | "30d";
  bidSats?: number;
  relays?: string[];
  timeoutMs?: number;
  secretKey?: Uint8Array | string;
}

export interface DvmAnalyticsResponse {
  pubkey: string;
  totalSats: number;
  validSenderSats: number;
  zapCount: number;
  trustScore?: number;
  reputationTier?: string;
  historicalTimeframe?: string;
  source: "dvm" | "local_db";
  dvmFallback: boolean;
  dvmPubkey?: string;
  jobId?: string;
  latencyMs: number;
  reason?: string;
}

export interface DvmAnnouncement {
  pubkey: string;
  identifier: string;
  name: string;
  about?: string;
  picture?: string;
  lud16?: string;
  supportedKinds: number[];
  categories: string[];
  relays: string[];
  inputSchema?: ToolInputSchema;
}

/**
 * Resolves or generates an ephemeral secret key for signing requests
 */
function resolveSecretKey(key?: Uint8Array | string): Uint8Array {
  if (key instanceof Uint8Array) return key;
  if (typeof key === "string" && key.trim()) {
    const trimmed = key.trim();
    if (trimmed.startsWith("nsec1")) {
      try {
        const decoded = nip19.decode(trimmed);
        if (decoded.type === "nsec") return decoded.data as Uint8Array;
      } catch {}
    }
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Uint8Array.from(Buffer.from(trimmed, "hex"));
    }
  }
  return generateSecretKey();
}

/**
 * NIP-89: Publishes a DVM Announcement (Kind 31990) to declare this node's
 * analytics and reputation calculation capabilities on Nostr relays.
 */
export async function publishDvmAnnouncement(params: {
  identifier?: string;
  name?: string;
  about?: string;
  picture?: string;
  lud16?: string;
  supportedKinds?: number[];
  categories?: string[];
  relays?: string[];
  secretKey?: Uint8Array | string;
  inputSchema?: ToolInputSchema;
}): Promise<Event> {
  const identifier = params.identifier || "nostrpulse-analytics-dvm";
  const name = params.name || "NostrPulse Analytics & Reputation DVM";
  const about = params.about || "Distributed Lightning Zap History & Identity Reputation Vending Machine";
  const lud16 = params.lud16 || "dvm@nostrpulse.com";
  const supportedKinds = params.supportedKinds || [5300, 5000];
  const categories = params.categories || ["zap-analytics", "reputation", "trust-score"];
  const targetRelays = params.relays || DVM_DEFAULT_RELAYS;
  const sk = resolveSecretKey(params.secretKey);

  const tags: string[][] = [
    ["d", identifier],
    ...supportedKinds.map((k) => ["k", String(k)]),
    ...categories.map((c) => ["t", c]),
    ["relays", ...targetRelays],
  ];

  const defaultSchema: ToolInputSchema = {
    type: "object",
    properties: {
      pubkey: {
        type: "string",
        description: "Target Nostr public key (hex or npub) to query",
      },
      category: {
        type: "string",
        description: "Analysis category (zap-analytics, reputation, trust-score)",
      },
      timeframe: {
        type: "string",
        description: "Analysis timeframe (all-time, 1y, 30d)",
      },
    },
    required: ["pubkey"],
  };

  const content = JSON.stringify({
    name,
    about,
    picture: params.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=nostrpulse-dvm",
    lud16,
    inputSchema: params.inputSchema || defaultSchema,
  });

  const template: EventTemplate = {
    kind: DVM_KINDS.NIP89_DVM_ANNOUNCEMENT,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };

  const signed = finalizeEvent(template, sk);
  const pool = getNostrPool();

  try {
    await Promise.allSettled(pool.publish(targetRelays, signed));
  } catch (err) {
    console.debug("[NIP-89] Failed to broadcast DVM announcement:", err);
  }

  return signed;
}

/**
 * NIP-89: Discovers active Data Vending Machines (Kind 31990) supporting
 * analytics/reputation requests from Nostr relays.
 */
export async function discoverDvmAnnouncements(
  relays = DVM_DEFAULT_RELAYS,
  categories = ["zap-analytics", "reputation", "trust-score"]
): Promise<DvmAnnouncement[]> {
  const pool = getNostrPool();

  try {
    const timeout = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3000));
    const query = pool.querySync(relays, {
      kinds: [DVM_KINDS.NIP89_DVM_ANNOUNCEMENT],
      "#k": ["5300", "5000"],
      limit: 20,
    }).catch(() => []);

    const events = await Promise.race([query, timeout]);
    if (!Array.isArray(events) || events.length === 0) return [];

    const announcements: DvmAnnouncement[] = [];
    for (const ev of events) {
      try {
        const dTag = ev.tags.find((t: any) => t[0] === "d")?.[1] || "";
        const supportedKinds = ev.tags
          .filter((t: any) => t[0] === "k" && !isNaN(Number(t[1])))
          .map((t: any) => Number(t[1]));
        const evCategories = ev.tags.filter((t: any) => t[0] === "t").map((t: any) => t[1]);
        const relaysTag = ev.tags.find((t: any) => t[0] === "relays");
        const announcedRelays = relaysTag ? relaysTag.slice(1) : relays;

        let meta: any = {};
        try {
          meta = JSON.parse(ev.content);
        } catch {}

        announcements.push({
          pubkey: ev.pubkey,
          identifier: dTag,
          name: meta.name || `DVM-${ev.pubkey.slice(0, 8)}`,
          about: meta.about,
          picture: meta.picture,
          lud16: meta.lud16,
          supportedKinds,
          categories: evCategories,
          relays: announcedRelays,
          inputSchema: meta.inputSchema,
        });
      } catch {}
    }

    return announcements;
  } catch {
    return [];
  }
}

/**
 * Fallback mechanism: queries metrics directly from local SQLite database
 */
export async function getLocalDatabaseAnalytics(targetHex: string): Promise<DvmAnalyticsResponse> {
  const startTime = Date.now();
  await initDatabase();

  const [zapTotals, creator, zapEdges] = await Promise.all([
    getZapTotalsFromDb(targetHex),
    getCreatorFromDb(targetHex),
    getTrustEdgesFromDb(targetHex, "zap"),
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
    reason: "Retrieved from local SQLite database (zap_totals & trust_edges)",
  };
}

/**
 * NIP-90 Distributed Request with Local Database Fallback:
 *
 * 1. Dispatches distributed Kind 5300 (or Kind 5000) Job Request to relays.
 * 2. Subscribes for Kind 6300 / 6000 result from DVMs.
 * 3. If DVM responds within timeoutMs:
 *    - Parses historical analytics payload.
 *    - Saves/updates fresh totals in local database.
 *    - Returns response with source: "dvm".
 * 4. If DVM times out or fails:
 *    - Falls back immediately to internal SQLite database queries.
 *    - Returns response with source: "local_db" & dvmFallback: true.
 */
export async function requestDvmAnalyticsWithFallback(
  req: DvmAnalyticsRequest
): Promise<DvmAnalyticsResponse> {
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
      reason: "Invalid Nostr 64-character hex target pubkey",
    };
  }

  const category = req.category || "zap-analytics";
  const timeframe = req.timeframe || "all-time";
  const timeoutMs = req.timeoutMs ?? 3000; // Default 3s timeout
  const relays = req.relays || DVM_DEFAULT_RELAYS;
  const bidSats = req.bidSats ?? 2;

  const pool = getNostrPool();
  const clientSk = resolveSecretKey(req.secretKey);

  // Construct NIP-90 Job Request (Kind 5300 - Data Analysis)
  const jobRequestTemplate: EventTemplate = {
    kind: DVM_KINDS.JOB_REQUEST_DATA_ANALYSIS,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["i", targetHex, "pubkey"],
      ["output", "application/json"],
      ["param", "analysis", "zap-history"],
      ["param", "timeframe", timeframe],
      ["t", category],
      ["t", "reputation"],
      ["bid", String(bidSats * 1000)], // Millisats
      ["relays", ...relays],
    ],
    content: `Calculate historical zap volume and reputation metrics for ${targetHex}`,
  };

  const signedJob = finalizeEvent(jobRequestTemplate, clientSk);

  // Promise that resolves when DVM returns Kind 6300 or 6000
  const dvmPromise = new Promise<DvmAnalyticsResponse>((resolve, reject) => {
    let sub: any = null;

    const cleanup = () => {
      try {
        if (sub) sub.close();
      } catch {}
      globalDvmExecutor.cleanupExecution(signedJob.id);
    };

    try {
      sub = pool.subscribeMany(
        relays,
        {
          kinds: [DVM_KINDS.JOB_RESULT_DATA_ANALYSIS, DVM_KINDS.JOB_RESULT_COMPUTE],
          "#e": [signedJob.id],
        },
        {
          async onevent(event: Event) {
            try {
              let resultPayload: any = {};
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

              // Save fresh DVM-computed totals into local SQLite database
              if (totalSats > 0) {
                await upsertZapTotals({
                  pubkey: targetHex,
                  total_sats: totalSats,
                  valid_sender_sats: validSenderSats,
                }).catch(() => {});
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
                latencyMs: Date.now() - startTime,
              });
            } catch (parseErr) {
              cleanup();
              reject(parseErr);
            }
          },
        }
      );

      // Register into global execution manager to prevent WebSocket leaks
      globalDvmExecutor.registerExecution(signedJob.id, () => {
        try {
          if (sub) sub.close();
        } catch {}
      });
    } catch (subErr) {
      cleanup();
      reject(subErr);
    }

    // Publish the job request
    try {
      Promise.allSettled(pool.publish(relays, signedJob));
    } catch (pubErr) {
      cleanup();
      reject(pubErr);
    }
  });

  // Timeout promise that triggers local database fallback
  const timeoutPromise = new Promise<DvmAnalyticsResponse>((resolve) => {
    setTimeout(async () => {
      globalDvmExecutor.cleanupExecution(signedJob.id);
      const fallbackData = await getLocalDatabaseAnalytics(targetHex);
      fallbackData.jobId = signedJob.id;
      fallbackData.reason = `DVM response timed out after ${timeoutMs}ms. Fallback to local SQLite database.`;
      resolve(fallbackData);
    }, timeoutMs);
  });

  // Race DVM against local DB timeout fallback
  return Promise.race([dvmPromise, timeoutPromise]).catch(async (err) => {
    console.debug(`[DVM] Error in DVM job request (${err?.message}), falling back to local DB:`, err);
    return getLocalDatabaseAnalytics(targetHex);
  });
}
