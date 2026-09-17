// src/scripts/enrich-creators.mjs
/**
 * Direct WebSocket Relay Indexer & Creator Enrichment Worker
 * Connects directly to 6 major relays:
 * - wss://relay.damus.io
 * - wss://nos.lol
 * - wss://relay.nostr.band
 * - wss://purplerelay.com
 * - wss://relay.primal.net
 * - wss://nostr.mom
 *
 * For all creators in the SQLite database, sends REQ:
 * - kinds: [0] (Profile metadata & NIP-05)
 * - kinds: [3] (Contact list follow graph edges)
 * - kinds: [9735], #p: [<pubkey>] (Zap receipts)
 *
 * Decodes bolt11 and description tags to extract real sats and sender,
 * and accumulates totals directly into the local SQLite database.
 */

import { SimplePool } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://purplerelay.com",
  "wss://relay.primal.net",
  "wss://nostr.mom",
];

// Initialize database client
const dbPath = path.resolve(process.cwd(), "nostrpulse.db").replace(/\\/g, "/");
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || `file:${dbPath}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Decodes satoshis from Lightning BOLT11 invoice human-readable part.
 */
function decodeBolt11AmountSats(bolt11) {
  if (!bolt11 || typeof bolt11 !== "string") return null;
  const clean = bolt11.toLowerCase().trim();
  const match = clean.match(/^ln(bc|tb|bcrt|sb)(\d+)([munp]?)1/);
  if (!match) return null;

  const num = parseInt(match[2], 10);
  const multiplier = match[3];

  switch (multiplier) {
    case "m": // milli-bitcoin (0.001 BTC = 100,000 sats)
      return Math.round(num * 100000);
    case "u": // micro-bitcoin (0.000001 BTC = 100 sats)
      return Math.round(num * 100);
    case "n": // nano-bitcoin (0.000000001 BTC = 0.1 sats)
      return Math.round(num * 0.1);
    case "p": // pico-bitcoin (0.000000000001 BTC = 0.0001 sats)
      return Math.round(num * 0.0001);
    default: // full bitcoin (1 BTC = 100,000,000 sats)
      return Math.round(num * 100000000);
  }
}

/**
 * Decodes Kind 9735 Zap Receipt event extracting sender, recipient, and exact sats.
 */
function decodeZapReceipt(event) {
  if (!event || event.kind !== 9735 || !Array.isArray(event.tags)) return null;

  const pTag = event.tags.find((t) => t[0] === "p" && t[1]);
  if (!pTag || !/^[0-9a-fA-F]{64}$/.test(pTag[1])) return null;
  const recipientPubkey = pTag[1].toLowerCase();

  const bolt11Tag = event.tags.find((t) => t[0] === "bolt11" && t[1]);
  const bolt11 = bolt11Tag ? bolt11Tag[1] : undefined;

  let senderPubkey = "";
  let amountFromDesc = 0;

  const descTag = event.tags.find((t) => t[0] === "description" && t[1]);
  if (descTag && typeof descTag[1] === "string") {
    try {
      const zapRequest = JSON.parse(descTag[1]);
      if (zapRequest && typeof zapRequest === "object") {
        if (zapRequest.pubkey && typeof zapRequest.pubkey === "string") {
          senderPubkey = zapRequest.pubkey.toLowerCase();
        }
        if (Array.isArray(zapRequest.tags)) {
          const amtTag = zapRequest.tags.find((t) => t[0] === "amount" && t[1]);
          if (amtTag && !isNaN(Number(amtTag[1]))) {
            amountFromDesc = Math.round(Number(amtTag[1]) / 1000);
          }
        }
      }
    } catch {}
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
  };
}

function formatSats(sats) {
  if (sats >= 1000000) return `${(sats / 1000000).toFixed(1)}M Sats`;
  if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k Sats`;
  return `${sats} Sats`;
}

async function queryRelays(pool, filters, timeoutMs = 6000) {
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs));
    const query = pool.querySync(RELAYS, filters).catch(() => []);
    const res = await Promise.race([query, timeout]);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

async function run() {
  console.log("===============================================================================");
  console.log("  WEBSOCKET RELAY INDEXER & CREATOR ENRICHMENT");
  console.log("===============================================================================");
  console.log(`Connecting to ${RELAYS.length} major relays:`);
  RELAYS.forEach((r) => console.log(`  - ${r}`));

  const pool = new SimplePool();

  try {
    // 1. Fetch all creators from the database
    const dbCreators = await db.execute("SELECT pubkey, npub, metadata_json, trust_score FROM creators");
    const creatorsList = dbCreators.rows;

    console.log(`\nFound ${creatorsList.length} creators in SQLite database to index.`);
    if (creatorsList.length === 0) {
      console.log("No creators in DB. Run database initialization first.");
      process.exit(0);
    }

    const pubkeys = creatorsList.map((c) => String(c.pubkey).toLowerCase());
    const batchSize = 15;
    const now = Math.floor(Date.now() / 1000);

    let totalProfilesUpdated = 0;
    let totalFollowEdges = 0;
    let totalZapsDecoded = 0;
    let totalSatsAccumulated = 0;

    for (let i = 0; i < pubkeys.length; i += batchSize) {
      const batch = pubkeys.slice(i, i + batchSize);
      console.log(`\nIndexing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pubkeys.length / batchSize)} (${batch.length} pubkeys)...`);

      // REQ Kind 0, Kind 3, Kind 9735 in parallel
      const [kind0Events, kind3Events, kind9735Events] = await Promise.all([
        queryRelays(pool, { kinds: [0], authors: batch }),
        queryRelays(pool, { kinds: [3], authors: batch }),
        queryRelays(pool, { kinds: [9735], "#p": batch, limit: 150 }),
      ]);

      console.log(`  - Received: ${kind0Events.length} kind:0, ${kind3Events.length} kind:3, ${kind9735Events.length} kind:9735`);

      // --- 1. Kind 0 (Profile & NIP-05) ---
      const latestKind0 = new Map();
      for (const ev of kind0Events) {
        const existing = latestKind0.get(ev.pubkey);
        if (!existing || ev.created_at > existing.created_at) {
          latestKind0.set(ev.pubkey, ev);
        }
      }

      for (const [author, ev] of latestKind0.entries()) {
        try {
          const meta = JSON.parse(ev.content);
          const name = meta.display_name || meta.displayName || meta.name || `Nostr User`;
          const handle = meta.name || author.slice(0, 10);
          const nip05 = meta.nip05 || "";
          const lud16 = meta.lud16 || meta.lud06 || "";

          let npub = "";
          try {
            npub = nip19.npubEncode(author);
          } catch {
            npub = author;
          }

          // Calculate trust score estimate
          const baseScore = lud16 && nip05 ? 96 : nip05 ? 88 : 75;

          const metadataJson = JSON.stringify({
            name,
            displayName: name,
            handle,
            picture: meta.picture || meta.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${npub}`,
            about: meta.about || meta.bio || "Active Nostr builder and creator.",
            nip05,
            lud16,
            banner: meta.banner || "",
            website: meta.website || "",
            score: baseScore,
          });

          await db.execute({
            sql: `
              UPDATE creators SET
                nip05 = COALESCE(?, nip05),
                lud16 = COALESCE(?, lud16),
                metadata_json = ?,
                last_synced = ?
              WHERE pubkey = ?
            `,
            args: [nip05 || null, lud16 || null, metadataJson, now, author],
          });

          totalProfilesUpdated += 1;
        } catch {}
      }

      // --- 2. Kind 3 (Follow Graph Edges) ---
      const latestKind3 = new Map();
      for (const ev of kind3Events) {
        const existing = latestKind3.get(ev.pubkey);
        if (!existing || ev.created_at > existing.created_at) {
          latestKind3.set(ev.pubkey, ev);
        }
      }

      const followQueries = [];
      for (const [author, ev] of latestKind3.entries()) {
        if (Array.isArray(ev.tags)) {
          const targets = new Set();
          for (const tag of ev.tags) {
            if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
              const target = tag[1].toLowerCase();
              if (target !== author && !targets.has(target)) {
                targets.add(target);
                followQueries.push({
                  sql: `
                    INSERT INTO trust_edges (source_pubkey, target_pubkey, weight, kind)
                    VALUES (?, ?, 1.0, 'follow')
                    ON CONFLICT(source_pubkey, target_pubkey, kind) DO UPDATE SET weight = 1.0;
                  `,
                  args: [author, target],
                });
                if (targets.size >= 250) break;
              }
            }
          }
        }
      }

      if (followQueries.length > 0) {
        await db.batch(followQueries, "write");
        totalFollowEdges += followQueries.length;
      }

      // --- 3. Kind 9735 (Zap Receipts & bolt11 decoding) ---
      const recipientSatsMap = new Map();
      const zapEdgeQueries = [];
      const seenZaps = new Set();

      for (const ev of kind9735Events) {
        if (seenZaps.has(ev.id)) continue;
        seenZaps.add(ev.id);

        const decoded = decodeZapReceipt(ev);
        if (!decoded) continue;

        const { recipientPubkey, senderPubkey, amountSats } = decoded;

        if (!recipientSatsMap.has(recipientPubkey)) {
          recipientSatsMap.set(recipientPubkey, { totalSats: 0, validSats: 0 });
        }
        const acc = recipientSatsMap.get(recipientPubkey);
        acc.totalSats += amountSats;
        if (senderPubkey !== recipientPubkey && senderPubkey !== "anonymous_zapper") {
          acc.validSats += amountSats;
          zapEdgeQueries.push({
            sql: `
              INSERT INTO trust_edges (source_pubkey, target_pubkey, weight, kind)
              VALUES (?, ?, ?, 'zap')
              ON CONFLICT(source_pubkey, target_pubkey, kind) DO UPDATE SET
                weight = trust_edges.weight + excluded.weight;
            `,
            args: [senderPubkey, recipientPubkey, amountSats],
          });
        }

        totalZapsDecoded += 1;
        totalSatsAccumulated += amountSats;
      }

      if (zapEdgeQueries.length > 0) {
        await db.batch(zapEdgeQueries, "write");
      }

      // Accumulate into zap_totals in database
      for (const [recipient, { totalSats, validSats }] of recipientSatsMap.entries()) {
        await db.execute({
          sql: `
            INSERT INTO zap_totals (pubkey, total_sats, valid_sender_sats)
            VALUES (?, ?, ?)
            ON CONFLICT(pubkey) DO UPDATE SET
              total_sats = zap_totals.total_sats + excluded.total_sats,
              valid_sender_sats = zap_totals.valid_sender_sats + excluded.valid_sender_sats;
          `,
          args: [recipient, totalSats, validSats],
        });

        // Update formatted sats in creator metadata_json
        const zapRes = await db.execute({
          sql: "SELECT total_sats FROM zap_totals WHERE pubkey = ?",
          args: [recipient],
        });
        const currentTotal = zapRes.rows[0]?.total_sats || 0;
        const formatted = formatSats(Number(currentTotal));

        const metaRow = await db.execute({
          sql: "SELECT metadata_json FROM creators WHERE pubkey = ?",
          args: [recipient],
        });
        if (metaRow.rows.length > 0) {
          let meta = {};
          try {
            meta = JSON.parse(metaRow.rows[0].metadata_json || "{}");
          } catch {}
          meta.zapsReceived = formatted;
          await db.execute({
            sql: "UPDATE creators SET metadata_json = ? WHERE pubkey = ?",
            args: [JSON.stringify(meta), recipient],
          });
        }
      }
    }

    console.log("\n===============================================================================");
    console.log("  ENRICHMENT & INDEXING COMPLETE");
    console.log("===============================================================================");
    console.log(`  - Total creators indexed: ${pubkeys.length}`);
    console.log(`  - Profiles updated:       ${totalProfilesUpdated} (Kind 0)`);
    console.log(`  - Follow edges indexed:   ${totalFollowEdges} (Kind 3)`);
    console.log(`  - Zap receipts decoded:   ${totalZapsDecoded} (Kind 9735)`);
    console.log(`  - Sats accumulated:       ${totalSatsAccumulated} Sats`);
    console.log("===============================================================================\n");
  } catch (err) {
    console.error("Enrichment fatal error:", err);
  } finally {
    pool.close(RELAYS);
    process.exit(0);
  }
}

run();