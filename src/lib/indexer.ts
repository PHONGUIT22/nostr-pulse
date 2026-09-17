// src/lib/indexer.ts
import { SimplePool } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
import { getNostrPool, NostrProfile } from "@/lib/nostr";
import { verifyNip05 } from "@/lib/nip05";
import { calculateTrustScore } from "@/lib/trust-score";
import { formatSats } from "@/lib/utils";
import {
  initDatabase,
  getDb,
  upsertCreator,
  upsertTrustEdges,
  accumulateZapTotals,
  recordZapEdge,
  getCreatorFromDb,
} from "@/lib/db";

// 5-8 Major production relays for the WebSocket Indexer
export const MAJOR_INDEXER_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://purplerelay.com",
  "wss://relay.primal.net",
  "wss://nostr.mom",
];

export interface DecodedZapReceipt {
  eventId: string;
  recipientPubkey: string;
  senderPubkey: string;
  amountSats: number;
  bolt11?: string;
  comment?: string;
  createdAt: number;
}

export interface IndexerResult {
  success: boolean;
  totalCreators: number;
  profilesUpdated: number;
  followsIndexed: number;
  zapsIndexed: number;
  satsAccumulated: number;
  durationMs: number;
  errors: string[];
}

/**
 * Decodes satoshis directly from Lightning BOLT11 invoice human-readable part (HRP).
 * Examples:
 * - lnbc210n1... -> 21 sats (210 nano-BTC)
 * - lnbc1u1...   -> 100 sats (1 micro-BTC)
 * - lnbc50u1...  -> 5,000 sats (50 micro-BTC)
 * - lnbc1m1...   -> 100,000 sats (1 milli-BTC)
 */
export function decodeBolt11AmountSats(bolt11: string): number | null {
  if (!bolt11 || typeof bolt11 !== "string") return null;
  const clean = bolt11.toLowerCase().trim();
  const match = clean.match(/^ln(bc|tb|bcrt|sb)(\d+)([munp]?)1/);
  if (!match) return null;

  const num = parseInt(match[2], 10);
  const multiplier = match[3];

  switch (multiplier) {
    case "m": // milli-bitcoin (0.001 BTC = 100,000 sats)
      return Math.round(num * 100_000);
    case "u": // micro-bitcoin (0.000001 BTC = 100 sats)
      return Math.round(num * 100);
    case "n": // nano-bitcoin (0.000000001 BTC = 0.1 sats)
      return Math.round(num * 0.1);
    case "p": // pico-bitcoin (0.000000000001 BTC = 0.0001 sats)
      return Math.round(num * 0.0001);
    default: // 1 BTC = 100,000,000 sats
      return Math.round(num * 100_000_000);
  }
}

/**
 * Decodes a Kind 9735 Zap Receipt event by decoding the embedded Kind 9734 zap request
 * in the 'description' tag, plus extracting the exact sats from description or bolt11.
 */
export function decodeZapReceipt(event: any): DecodedZapReceipt | null {
  if (!event || event.kind !== 9735 || !Array.isArray(event.tags)) {
    return null;
  }

  // 1. Recipient public key from 'p' tag
  const pTag = event.tags.find((t: any) => t[0] === "p" && t[1]);
  if (!pTag || !/^[0-9a-fA-F]{64}$/.test(pTag[1])) return null;
  const recipientPubkey = pTag[1].toLowerCase();

  // 2. Bolt11 invoice tag
  const bolt11Tag = event.tags.find((t: any) => t[0] === "bolt11" && t[1]);
  const bolt11 = bolt11Tag ? bolt11Tag[1] : undefined;

  // 3. Embedded Kind 9734 Zap Request inside 'description' tag
  let senderPubkey = "";
  let amountFromDesc = 0;
  let comment = "";

  const descTag = event.tags.find((t: any) => t[0] === "description" && t[1]);
  if (descTag && typeof descTag[1] === "string") {
    try {
      const zapRequest = JSON.parse(descTag[1]);
      if (zapRequest && typeof zapRequest === "object") {
        if (zapRequest.pubkey && typeof zapRequest.pubkey === "string") {
          senderPubkey = zapRequest.pubkey.toLowerCase();
        }
        if (typeof zapRequest.content === "string") {
          comment = zapRequest.content;
        }
        if (Array.isArray(zapRequest.tags)) {
          const amtTag = zapRequest.tags.find((t: any) => t[0] === "amount" && t[1]);
          if (amtTag && !isNaN(Number(amtTag[1]))) {
            // NIP-57 zap request amount tag is in millisatoshis
            amountFromDesc = Math.round(Number(amtTag[1]) / 1000);
          }
        }
      }
    } catch {
      // Malformed description JSON
    }
  }

  // Fallback for sender if not inside zap request
  if (!senderPubkey) {
    const uppercaseP = event.tags.find((t: any) => t[0] === "P" && t[1]);
    if (uppercaseP && /^[0-9a-fA-F]{64}$/.test(uppercaseP[1])) {
      senderPubkey = uppercaseP[1].toLowerCase();
    } else if (event.pubkey && /^[0-9a-fA-F]{64}$/.test(event.pubkey)) {
      senderPubkey = event.pubkey.toLowerCase();
    }
  }

  // Determine actual satoshis: prioritize description amount, fallback to bolt11 decode
  let amountSats = amountFromDesc;
  if (amountSats <= 0 && bolt11) {
    const fromBolt11 = decodeBolt11AmountSats(bolt11);
    if (fromBolt11 && fromBolt11 > 0) {
      amountSats = fromBolt11;
    }
  }

  // If still 0, default to minimum standard micro-zap (21 sats)
  if (amountSats <= 0) {
    amountSats = 21;
  }

  return {
    eventId: event.id,
    recipientPubkey,
    senderPubkey: senderPubkey || "anonymous_zapper",
    amountSats,
    bolt11,
    comment,
    createdAt: event.created_at || Math.floor(Date.now() / 1000),
  };
}

/**
 * Helper to query multiple relays with timeout protection.
 */
async function queryRelaysSafe(
  pool: SimplePool,
  relays: string[],
  filters: any,
  timeoutMs = 5000
): Promise<any[]> {
  try {
    const timeout = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), timeoutMs));
    const query = pool.querySync(relays, filters).catch(() => []);
    const results = await Promise.race([query, timeout]);
    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
}

/**
 * Executes a full indexing pass directly via WebSocket to major relays:
 * 1. Queries list of user pubkeys from the SQLite database.
 * 2. REQ kinds: [0] (Profile metadata & NIP-05 DNS verification).
 * 3. REQ kinds: [3] (Contact list follow graph edges).
 * 4. REQ kinds: [9735], #p: [<pubkeys>] (Zap receipts with description & bolt11 decoding).
 * 5. Accumulates sats into zap_totals and updates creators & trust_edges.
 */
export async function runIndexerPass(options: {
  pubkeys?: string[];
  relays?: string[];
  batchSize?: number;
  verbose?: boolean;
} = {}): Promise<IndexerResult> {
  const startTime = Date.now();
  await initDatabase();
  const db = getDb();

  const relays = options.relays || MAJOR_INDEXER_RELAYS;
  const verbose = options.verbose ?? true;
  const pool = new SimplePool();

  const result: IndexerResult = {
    success: true,
    totalCreators: 0,
    profilesUpdated: 0,
    followsIndexed: 0,
    zapsIndexed: 0,
    satsAccumulated: 0,
    durationMs: 0,
    errors: [],
  };

  try {
    // 1. Fetch target pubkeys from database if not explicitly provided
    let targetPubkeys = options.pubkeys;
    if (!targetPubkeys || targetPubkeys.length === 0) {
      const dbRows = await db.execute("SELECT pubkey FROM creators");
      targetPubkeys = dbRows.rows.map((r: any) => String(r.pubkey).toLowerCase());
    }

    result.totalCreators = targetPubkeys.length;
    if (verbose) {
      console.log(`[Indexer] Connecting to ${relays.length} major WebSocket relays:`);
      relays.forEach((r) => console.log(`  - ${r}`));
      console.log(`[Indexer] Target creators in DB: ${targetPubkeys.length}`);
    }

    if (targetPubkeys.length === 0) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Split target pubkeys into manageable batches (e.g. 20 per batch)
    const batchSize = options.batchSize || 20;
    const batches: string[][] = [];
    for (let i = 0; i < targetPubkeys.length; i += batchSize) {
      batches.push(targetPubkeys.slice(i, i + batchSize));
    }

    for (const [batchIdx, batch] of batches.entries()) {
      if (verbose) {
        console.log(`[Indexer] Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} pubkeys)...`);
      }

      // Parallel query: Kind 0, Kind 3, Kind 9735
      const [kind0Events, kind3Events, kind9735Events] = await Promise.all([
        // A. REQ kinds: [0] (Profile metadata)
        queryRelaysSafe(pool, relays, {
          kinds: [0],
          authors: batch,
        }, 6000),

        // B. REQ kinds: [3] (Contact lists)
        queryRelaysSafe(pool, relays, {
          kinds: [3],
          authors: batch,
        }, 6000),

        // C. REQ kinds: [9735] (Zap receipts for target pubkeys)
        queryRelaysSafe(pool, relays, {
          kinds: [9735],
          "#p": batch,
          limit: 200,
        }, 6000),
      ]);

      const now = Math.floor(Date.now() / 1000);

      // =======================================================================
      // STEP 1: Process Kind 0 (Profile & NIP-05)
      // =======================================================================
      // Deduplicate to newest Kind 0 per author
      const latestKind0Map = new Map<string, any>();
      for (const ev of kind0Events) {
        const existing = latestKind0Map.get(ev.pubkey);
        if (!existing || ev.created_at > existing.created_at) {
          latestKind0Map.set(ev.pubkey, ev);
        }
      }

      await Promise.all(
        Array.from(latestKind0Map.entries()).map(async ([author, ev]) => {
          try {
            const meta = JSON.parse(ev.content);
            const nip05 = meta.nip05 || "";
            const lud16 = meta.lud16 || meta.lud06 || "";
            const name = meta.display_name || meta.displayName || meta.name || `Nostr User`;
            const handle = meta.name || author.slice(0, 10);

            let npub = "";
            try {
              npub = nip19.npubEncode(author);
            } catch {
              npub = author;
            }

            // Cryptographic NIP-05 check
            const nip05Res = await verifyNip05(nip05, author);

            const profileObj: NostrProfile = {
              pubkey: author,
              npub,
              name: handle,
              displayName: name,
              about: meta.about || meta.bio,
              picture: meta.picture || meta.image,
              banner: meta.banner,
              nip05,
              lud16,
              website: meta.website,
              created_at: ev.created_at,
            };

            const trustData = calculateTrustScore(profileObj, nip05Res);

            // Retrieve existing creator row to keep zap total formatted
            const existingCreator = await getCreatorFromDb(author);
            const zapsFormatted = existingCreator?.zapsReceived || "0 Sats";

            const metadataJson = JSON.stringify({
              name,
              displayName: name,
              handle,
              picture: profileObj.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${npub}`,
              banner: profileObj.banner || "",
              about: profileObj.about || "",
              nip05,
              lud16,
              website: profileObj.website || "",
              zapsReceived: zapsFormatted,
              score: trustData.score,
            });

            await upsertCreator({
              pubkey: author,
              npub,
              nip05: nip05 || null,
              lud16: lud16 || null,
              metadata_json: metadataJson,
              trust_score: trustData.score,
              last_synced: now,
            });

            result.profilesUpdated += 1;
          } catch (err: any) {
            result.errors.push(`Error updating profile ${author.slice(0, 8)}: ${err.message}`);
          }
        })
      );

      // =======================================================================
      // STEP 2: Process Kind 3 (Follow Graph Edges)
      // =======================================================================
      const latestKind3Map = new Map<string, any>();
      for (const ev of kind3Events) {
        const existing = latestKind3Map.get(ev.pubkey);
        if (!existing || ev.created_at > existing.created_at) {
          latestKind3Map.set(ev.pubkey, ev);
        }
      }

      const followEdgesToInsert: {
        source_pubkey: string;
        target_pubkey: string;
        weight: number;
        kind: "follow";
      }[] = [];

      for (const [author, ev] of latestKind3Map.entries()) {
        if (Array.isArray(ev.tags)) {
          const targets = new Set<string>();
          for (const tag of ev.tags) {
            if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
              const target = tag[1].toLowerCase();
              if (target !== author && !targets.has(target)) {
                targets.add(target);
                followEdgesToInsert.push({
                  source_pubkey: author,
                  target_pubkey: target,
                  weight: 1.0,
                  kind: "follow",
                });
                if (targets.size >= 250) break; // Cap per author
              }
            }
          }
        }
      }

      if (followEdgesToInsert.length > 0) {
        await upsertTrustEdges(followEdgesToInsert);
        result.followsIndexed += followEdgesToInsert.length;
      }

      // =======================================================================
      // STEP 3: Process Kind 9735 (Decode description & bolt11, accumulate sats)
      // =======================================================================
      const satsAccMap = new Map<string, { totalSats: number; validSats: number }>();
      const seenEventIds = new Set<string>();

      for (const ev of kind9735Events) {
        if (seenEventIds.has(ev.id)) continue;
        seenEventIds.add(ev.id);

        const decoded = decodeZapReceipt(ev);
        if (!decoded) continue;

        const { recipientPubkey, senderPubkey, amountSats } = decoded;

        // Skip self-zaps for valid sender calculations
        const isValidSender = senderPubkey !== recipientPubkey && senderPubkey !== "anonymous_zapper";

        // Accumulate in memory map for batch DB update
        if (!satsAccMap.has(recipientPubkey)) {
          satsAccMap.set(recipientPubkey, { totalSats: 0, validSats: 0 });
        }
        const acc = satsAccMap.get(recipientPubkey)!;
        acc.totalSats += amountSats;
        if (isValidSender) {
          acc.validSats += amountSats;
        }

        // Record or accumulate zap edge in trust_edges table
        if (senderPubkey && senderPubkey !== "anonymous_zapper") {
          await recordZapEdge(senderPubkey, recipientPubkey, amountSats);
        }

        result.zapsIndexed += 1;
        result.satsAccumulated += amountSats;
      }

      // Save accumulated sats into zap_totals and update creator metadata
      for (const [recipient, { totalSats, validSats }] of satsAccMap.entries()) {
        await accumulateZapTotals({
          pubkey: recipient,
          addTotalSats: totalSats,
          addValidSats: validSats,
        });

        // Update formatted zaps in creators table
        const updatedCreator = await getCreatorFromDb(recipient);
        if (updatedCreator) {
          const formatted = updatedCreator.zapsReceived;
          const metaRes = await db.execute({
            sql: "SELECT metadata_json FROM creators WHERE pubkey = ?",
            args: [recipient],
          });
          if (metaRes.rows.length > 0) {
            let meta: any = {};
            try {
              meta = JSON.parse(String(metaRes.rows[0].metadata_json || "{}"));
            } catch {}
            meta.zapsReceived = formatted;
            await db.execute({
              sql: "UPDATE creators SET metadata_json = ? WHERE pubkey = ?",
              args: [JSON.stringify(meta), recipient],
            });
          }
        }
      }
    }

    result.durationMs = Date.now() - startTime;
    if (verbose) {
      console.log(`\n===============================================================================`);
      console.log(`  WEBSOCKET INDEXER PASS COMPLETE (${result.durationMs}ms)`);
      console.log(`===============================================================================`);
      console.log(`  - Creators checked:   ${result.totalCreators}`);
      console.log(`  - Profiles updated:   ${result.profilesUpdated} (Kind 0)`);
      console.log(`  - Follows indexed:    ${result.followsIndexed} (Kind 3 edges)`);
      console.log(`  - Zaps decoded:       ${result.zapsIndexed} (Kind 9735 receipts)`);
      console.log(`  - Sats accumulated:   ${result.satsAccumulated} sats`);
      console.log(`===============================================================================\n`);
    }

    return result;
  } catch (err: any) {
    console.error("[Indexer] Fatal error in indexer pass:", err);
    result.success = false;
    result.errors.push(err?.message || "Fatal indexer failure");
    result.durationMs = Date.now() - startTime;
    return result;
  } finally {
    try {
      pool.close(relays);
    } catch {}
  }
}

// Memory handle for background recurring timer
let periodicTimer: NodeJS.Timeout | null = null;

/**
 * Starts periodic background worker that indexes DB users every intervalMs.
 */
export function startBackgroundIndexer(intervalMs = 300000): void {
  if (periodicTimer) {
    return; // Already running
  }
  console.log(`[Indexer] Starting periodic background indexer worker (interval: ${intervalMs}ms)...`);
  periodicTimer = setInterval(() => {
    runIndexerPass({ verbose: false }).catch((err) => {
      console.warn("[Indexer] Background pass error:", err);
    });
  }, intervalMs);
}

/**
 * Stops periodic background worker.
 */
export function stopBackgroundIndexer(): void {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
    console.log("[Indexer] Background indexer worker stopped.");
  }
}
