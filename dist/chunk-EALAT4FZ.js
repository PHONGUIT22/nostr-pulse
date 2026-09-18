#!/usr/bin/env node
import {
  verifyNip05
} from "./chunk-CDTDPUJF.js";
import {
  calculateTrustScore
} from "./chunk-TEBCT7SR.js";
import {
  accumulateZapTotals,
  getCreatorFromDb,
  getDb,
  initDatabase,
  recordZapEdge,
  upsertCreator,
  upsertTrustEdges
} from "./chunk-UEOH474S.js";

// src/lib/indexer.ts
import { SimplePool } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
var MAJOR_INDEXER_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://purplerelay.com",
  "wss://relay.primal.net",
  "wss://nostr.mom"
];
function decodeBolt11AmountSats(bolt11) {
  if (!bolt11 || typeof bolt11 !== "string") return null;
  const clean = bolt11.toLowerCase().trim();
  const match = clean.match(/^ln(bc|tb|bcrt|sb)(\d+)([munp]?)1/);
  if (!match) return null;
  const num = parseInt(match[2], 10);
  const multiplier = match[3];
  switch (multiplier) {
    case "m":
      return Math.round(num * 1e5);
    case "u":
      return Math.round(num * 100);
    case "n":
      return Math.round(num * 0.1);
    case "p":
      return Math.round(num * 1e-4);
    default:
      return Math.round(num * 1e8);
  }
}
function decodeZapReceipt(event) {
  if (!event || event.kind !== 9735 || !Array.isArray(event.tags)) {
    return null;
  }
  const pTag = event.tags.find((t) => t[0] === "p" && t[1]);
  if (!pTag || !/^[0-9a-fA-F]{64}$/.test(pTag[1])) return null;
  const recipientPubkey = pTag[1].toLowerCase();
  const bolt11Tag = event.tags.find((t) => t[0] === "bolt11" && t[1]);
  const bolt11 = bolt11Tag ? bolt11Tag[1] : void 0;
  let senderPubkey = "";
  let amountFromDesc = 0;
  let comment = "";
  const descTag = event.tags.find((t) => t[0] === "description" && t[1]);
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
          const amtTag = zapRequest.tags.find((t) => t[0] === "amount" && t[1]);
          if (amtTag && !isNaN(Number(amtTag[1]))) {
            amountFromDesc = Math.round(Number(amtTag[1]) / 1e3);
          }
        }
      }
    } catch {
    }
  }
  if (!senderPubkey) {
    const uppercaseP = event.tags.find((t) => t[0] === "P" && t[1]);
    if (uppercaseP && /^[0-9a-fA-F]{64}$/.test(uppercaseP[1])) {
      senderPubkey = uppercaseP[1].toLowerCase();
    } else if (event.pubkey && /^[0-9a-fA-F]{64}$/.test(event.pubkey)) {
      senderPubkey = event.pubkey.toLowerCase();
    }
  }
  let amountSats = amountFromDesc;
  if (amountSats <= 0 && bolt11) {
    const fromBolt11 = decodeBolt11AmountSats(bolt11);
    if (fromBolt11 && fromBolt11 > 0) {
      amountSats = fromBolt11;
    }
  }
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
    createdAt: event.created_at || Math.floor(Date.now() / 1e3)
  };
}
async function queryRelaysSafe(pool, relays, filters, timeoutMs = 5e3) {
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs));
    const query = pool.querySync(relays, filters).catch(() => []);
    const results = await Promise.race([query, timeout]);
    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
}
async function runIndexerPass(options = {}) {
  const startTime = Date.now();
  await initDatabase();
  const db = getDb();
  const relays = options.relays || MAJOR_INDEXER_RELAYS;
  const verbose = options.verbose ?? true;
  const pool = new SimplePool();
  const result = {
    success: true,
    totalCreators: 0,
    profilesUpdated: 0,
    followsIndexed: 0,
    zapsIndexed: 0,
    satsAccumulated: 0,
    durationMs: 0,
    errors: []
  };
  try {
    let targetPubkeys = options.pubkeys;
    if (!targetPubkeys || targetPubkeys.length === 0) {
      const dbRows = await db.execute("SELECT pubkey FROM creators");
      targetPubkeys = dbRows.rows.map((r) => String(r.pubkey).toLowerCase());
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
    const batchSize = options.batchSize || 20;
    const batches = [];
    for (let i = 0; i < targetPubkeys.length; i += batchSize) {
      batches.push(targetPubkeys.slice(i, i + batchSize));
    }
    for (const [batchIdx, batch] of batches.entries()) {
      if (verbose) {
        console.log(`[Indexer] Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} pubkeys)...`);
      }
      const [kind0Events, kind3Events, kind9735Events] = await Promise.all([
        // A. REQ kinds: [0] (Profile metadata)
        queryRelaysSafe(pool, relays, {
          kinds: [0],
          authors: batch
        }, 6e3),
        // B. REQ kinds: [3] (Contact lists)
        queryRelaysSafe(pool, relays, {
          kinds: [3],
          authors: batch
        }, 6e3),
        // C. REQ kinds: [9735] (Zap receipts for target pubkeys)
        queryRelaysSafe(pool, relays, {
          kinds: [9735],
          "#p": batch,
          limit: 200
        }, 6e3)
      ]);
      const now = Math.floor(Date.now() / 1e3);
      const latestKind0Map = /* @__PURE__ */ new Map();
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
            const nip05Res = await verifyNip05(nip05, author);
            const profileObj = {
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
              created_at: ev.created_at
            };
            const trustData = calculateTrustScore(profileObj, nip05Res);
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
              score: trustData.score
            });
            await upsertCreator({
              pubkey: author,
              npub,
              nip05: nip05 || null,
              lud16: lud16 || null,
              metadata_json: metadataJson,
              trust_score: trustData.score,
              last_synced: now
            });
            result.profilesUpdated += 1;
          } catch (err) {
            result.errors.push(`Error updating profile ${author.slice(0, 8)}: ${err.message}`);
          }
        })
      );
      const latestKind3Map = /* @__PURE__ */ new Map();
      for (const ev of kind3Events) {
        const existing = latestKind3Map.get(ev.pubkey);
        if (!existing || ev.created_at > existing.created_at) {
          latestKind3Map.set(ev.pubkey, ev);
        }
      }
      const followEdgesToInsert = [];
      for (const [author, ev] of latestKind3Map.entries()) {
        if (Array.isArray(ev.tags)) {
          const targets = /* @__PURE__ */ new Set();
          for (const tag of ev.tags) {
            if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
              const target = tag[1].toLowerCase();
              if (target !== author && !targets.has(target)) {
                targets.add(target);
                followEdgesToInsert.push({
                  source_pubkey: author,
                  target_pubkey: target,
                  weight: 1,
                  kind: "follow"
                });
                if (targets.size >= 250) break;
              }
            }
          }
        }
      }
      if (followEdgesToInsert.length > 0) {
        await upsertTrustEdges(followEdgesToInsert);
        result.followsIndexed += followEdgesToInsert.length;
      }
      const satsAccMap = /* @__PURE__ */ new Map();
      const seenEventIds = /* @__PURE__ */ new Set();
      for (const ev of kind9735Events) {
        if (seenEventIds.has(ev.id)) continue;
        seenEventIds.add(ev.id);
        const decoded = decodeZapReceipt(ev);
        if (!decoded) continue;
        const { recipientPubkey, senderPubkey, amountSats } = decoded;
        const isValidSender = senderPubkey !== recipientPubkey && senderPubkey !== "anonymous_zapper";
        if (!satsAccMap.has(recipientPubkey)) {
          satsAccMap.set(recipientPubkey, { totalSats: 0, validSats: 0 });
        }
        const acc = satsAccMap.get(recipientPubkey);
        acc.totalSats += amountSats;
        if (isValidSender) {
          acc.validSats += amountSats;
        }
        if (senderPubkey && senderPubkey !== "anonymous_zapper") {
          await recordZapEdge(senderPubkey, recipientPubkey, amountSats);
        }
        result.zapsIndexed += 1;
        result.satsAccumulated += amountSats;
      }
      for (const [recipient, { totalSats, validSats }] of satsAccMap.entries()) {
        await accumulateZapTotals({
          pubkey: recipient,
          addTotalSats: totalSats,
          addValidSats: validSats
        });
        const updatedCreator = await getCreatorFromDb(recipient);
        if (updatedCreator) {
          const formatted = updatedCreator.zapsReceived;
          const metaRes = await db.execute({
            sql: "SELECT metadata_json FROM creators WHERE pubkey = ?",
            args: [recipient]
          });
          if (metaRes.rows.length > 0) {
            let meta = {};
            try {
              meta = JSON.parse(String(metaRes.rows[0].metadata_json || "{}"));
            } catch {
            }
            meta.zapsReceived = formatted;
            await db.execute({
              sql: "UPDATE creators SET metadata_json = ? WHERE pubkey = ?",
              args: [JSON.stringify(meta), recipient]
            });
          }
        }
      }
    }
    result.durationMs = Date.now() - startTime;
    if (verbose) {
      console.log(`
===============================================================================`);
      console.log(`  WEBSOCKET INDEXER PASS COMPLETE (${result.durationMs}ms)`);
      console.log(`===============================================================================`);
      console.log(`  - Creators checked:   ${result.totalCreators}`);
      console.log(`  - Profiles updated:   ${result.profilesUpdated} (Kind 0)`);
      console.log(`  - Follows indexed:    ${result.followsIndexed} (Kind 3 edges)`);
      console.log(`  - Zaps decoded:       ${result.zapsIndexed} (Kind 9735 receipts)`);
      console.log(`  - Sats accumulated:   ${result.satsAccumulated} sats`);
      console.log(`===============================================================================
`);
    }
    return result;
  } catch (err) {
    console.error("[Indexer] Fatal error in indexer pass:", err);
    result.success = false;
    result.errors.push(err?.message || "Fatal indexer failure");
    result.durationMs = Date.now() - startTime;
    return result;
  } finally {
    try {
      pool.close(relays);
    } catch {
    }
  }
}
var periodicTimer = null;
function startBackgroundIndexer(intervalMs = 3e5) {
  if (periodicTimer) {
    return;
  }
  console.log(`[Indexer] Starting periodic background indexer worker (interval: ${intervalMs}ms)...`);
  periodicTimer = setInterval(() => {
    runIndexerPass({ verbose: false }).catch((err) => {
      console.warn("[Indexer] Background pass error:", err);
    });
  }, intervalMs);
}
function stopBackgroundIndexer() {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
    console.log("[Indexer] Background indexer worker stopped.");
  }
}

export {
  MAJOR_INDEXER_RELAYS,
  decodeBolt11AmountSats,
  decodeZapReceipt,
  runIndexerPass,
  startBackgroundIndexer,
  stopBackgroundIndexer
};
