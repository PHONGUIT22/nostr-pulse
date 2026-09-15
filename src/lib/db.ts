// src/lib/db.ts
import { createClient, Client } from "@libsql/client";
import path from "path";
import seedCreators from "./creators.json";

export interface CreatorRow {
  pubkey: string;
  npub: string;
  nip05: string | null;
  lud16: string | null;
  metadata_json: string | null;
  trust_score: number;
  last_synced: number;
}

export interface TrustEdgeRow {
  source_pubkey: string;
  target_pubkey: string;
  weight: number;
  kind: "follow" | "zap";
}

export interface ZapTotalsRow {
  pubkey: string;
  total_sats: number;
  valid_sender_sats: number;
}

export interface Creator {
  pubkey?: string;
  name: string;
  npub: string;
  handle: string;
  score: number;
  zapsReceived: string;
  picture?: string;
  nip05?: string;
  about?: string;
  lud16?: string;
}

// Global cache to prevent multiple client instances during development hot reloads
const globalForDb = globalThis as unknown as {
  libsqlClient?: Client;
  initPromise?: Promise<void>;
};

export function getDb(): Client {
  if (globalForDb.libsqlClient) {
    return globalForDb.libsqlClient;
  }

  const dbUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    `file:${path.resolve(process.cwd(), "nostrpulse.db").replace(/\\/g, "/")}`;

  const client = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  globalForDb.libsqlClient = client;
  return client;
}

/**
 * Ensures tables and indexes exist, and seeds initial creators if database is empty.
 */
export async function initDatabase(): Promise<void> {
  if (globalForDb.initPromise) {
    return globalForDb.initPromise;
  }

  globalForDb.initPromise = (async () => {
    const db = getDb();

    // 1. Create creators table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS creators (
        pubkey TEXT PRIMARY KEY,
        npub TEXT UNIQUE,
        nip05 TEXT,
        lud16 TEXT,
        metadata_json TEXT,
        trust_score REAL DEFAULT 0,
        last_synced INTEGER DEFAULT 0
      );
    `);

    // 2. Create trust_edges table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS trust_edges (
        source_pubkey TEXT,
        target_pubkey TEXT,
        weight REAL DEFAULT 1.0,
        kind TEXT,
        PRIMARY KEY (source_pubkey, target_pubkey, kind)
      );
    `);

    // 3. Create zap_totals table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS zap_totals (
        pubkey TEXT PRIMARY KEY,
        total_sats INTEGER DEFAULT 0,
        valid_sender_sats INTEGER DEFAULT 0
      );
    `);

    // 4. Create helpful indexes
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_creators_npub ON creators(npub);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_creators_score ON creators(trust_score DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_creators_synced ON creators(last_synced DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_trust_edges_source ON trust_edges(source_pubkey);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_trust_edges_target ON trust_edges(target_pubkey);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_zap_totals_sats ON zap_totals(total_sats DESC);`);

    // 5. Seed initial 26 creators if empty
    const countRes = await db.execute("SELECT COUNT(*) as count FROM creators");
    const count = Number(countRes.rows[0]?.count || 0);

    if (count === 0 && Array.isArray(seedCreators) && seedCreators.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      const batchQueries: { sql: string; args: any[] }[] = [];

      for (const [index, c] of seedCreators.entries()) {
        const pubkey = (c.pubkey || "").toLowerCase();
        if (!pubkey) continue;

        const npub = c.npub;
        const nip05 = c.nip05 || null;
        const lud16 = c.lud16 || null;
        const score = c.score || Math.max(99 - index, 70);

        let initialSats = 0;
        if (typeof c.zapsReceived === "string") {
          const matchK = c.zapsReceived.match(/([\d.]+)\s*k\s*Sats/i);
          const matchM = c.zapsReceived.match(/([\d.]+)\s*M\s*Sats/i);
          const matchPure = c.zapsReceived.match(/([\d,]+)\s*Sats/i);
          if (matchK) initialSats = Math.round(parseFloat(matchK[1]) * 1000);
          else if (matchM) initialSats = Math.round(parseFloat(matchM[1]) * 1000000);
          else if (matchPure) initialSats = parseInt(matchPure[1].replace(/,/g, ""), 10);
        }

        const metadataJson = JSON.stringify({
          name: c.name,
          handle: c.handle,
          picture: c.picture,
          about: c.about,
          nip05: c.nip05,
          lud16: c.lud16,
          zapsReceived: c.zapsReceived,
        });

        batchQueries.push({
          sql: `
            INSERT OR REPLACE INTO creators (pubkey, npub, nip05, lud16, metadata_json, trust_score, last_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [pubkey, npub, nip05, lud16, metadataJson, score, now],
        });

        batchQueries.push({
          sql: `
            INSERT OR REPLACE INTO zap_totals (pubkey, total_sats, valid_sender_sats)
            VALUES (?, ?, ?)
          `,
          args: [pubkey, initialSats, Math.round(initialSats * 0.9)],
        });
      }

      if (batchQueries.length > 0) {
        await db.batch(batchQueries, "write");
      }
    }
  })();

  return globalForDb.initPromise;
}

/**
 * Maps a database row and optional zap totals into a frontend Creator object.
 */
export function rowToCreator(row: any, zapRow?: any): Creator {
  let meta: any = {};
  if (row.metadata_json) {
    try {
      meta = JSON.parse(row.metadata_json);
    } catch {}
  }

  const totalSats = zapRow?.total_sats ?? row.total_sats ?? meta.total_sats ?? 0;
  let zapsStr = meta.zapsReceived || "0 Sats";

  if (totalSats > 0) {
    if (totalSats >= 1000000) {
      zapsStr = `${(totalSats / 1000000).toFixed(1)}M Sats`;
    } else if (totalSats >= 1000) {
      zapsStr = `${(totalSats / 1000).toFixed(1)}k Sats`;
    } else {
      zapsStr = `${totalSats} Sats`;
    }
  }

  const displayName = meta.displayName || meta.name || row.npub.slice(0, 10);
  const handle = meta.name || meta.handle || row.npub.slice(0, 10);

  return {
    pubkey: row.pubkey,
    npub: row.npub,
    name: displayName.startsWith("Nostr Creator #") ? `@${handle}` : displayName,
    handle,
    score: Number(row.trust_score ?? meta.score ?? 70),
    zapsReceived: zapsStr,
    picture: meta.picture || meta.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.npub}`,
    nip05: row.nip05 || meta.nip05 || undefined,
    about: meta.about || meta.bio || undefined,
    lud16: row.lud16 || meta.lud16 || undefined,
  };
}

/**
 * Upserts a creator record in the database.
 */
export async function upsertCreator(data: {
  pubkey: string;
  npub: string;
  nip05?: string | null;
  lud16?: string | null;
  metadata_json?: string | null;
  trust_score?: number;
  last_synced?: number;
}): Promise<void> {
  await initDatabase();
  const db = getDb();
  const now = data.last_synced ?? Math.floor(Date.now() / 1000);

  await db.execute({
    sql: `
      INSERT INTO creators (pubkey, npub, nip05, lud16, metadata_json, trust_score, last_synced)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pubkey) DO UPDATE SET
        npub = excluded.npub,
        nip05 = COALESCE(excluded.nip05, creators.nip05),
        lud16 = COALESCE(excluded.lud16, creators.lud16),
        metadata_json = COALESCE(excluded.metadata_json, creators.metadata_json),
        trust_score = CASE WHEN excluded.trust_score > 0 THEN excluded.trust_score ELSE creators.trust_score END,
        last_synced = excluded.last_synced;
    `,
    args: [
      data.pubkey.toLowerCase(),
      data.npub,
      data.nip05 || null,
      data.lud16 || null,
      data.metadata_json || null,
      data.trust_score ?? 0,
      now,
    ],
  });
}

/**
 * Upserts a batch of trust edges (follows or zaps).
 */
export async function upsertTrustEdges(
  edges: {
    source_pubkey: string;
    target_pubkey: string;
    weight: number;
    kind: "follow" | "zap";
  }[]
): Promise<void> {
  if (edges.length === 0) return;
  await initDatabase();
  const db = getDb();

  const queries = edges.map((e) => ({
    sql: `
      INSERT INTO trust_edges (source_pubkey, target_pubkey, weight, kind)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(source_pubkey, target_pubkey, kind) DO UPDATE SET
        weight = excluded.weight;
    `,
    args: [
      e.source_pubkey.toLowerCase(),
      e.target_pubkey.toLowerCase(),
      e.weight,
      e.kind,
    ],
  }));

  // LibSQL allows batch execution
  await db.batch(queries, "write");
}

/**
 * Upserts zap totals for a given pubkey.
 */
export async function upsertZapTotals(data: {
  pubkey: string;
  total_sats: number;
  valid_sender_sats: number;
}): Promise<void> {
  await initDatabase();
  const db = getDb();

  await db.execute({
    sql: `
      INSERT INTO zap_totals (pubkey, total_sats, valid_sender_sats)
      VALUES (?, ?, ?)
      ON CONFLICT(pubkey) DO UPDATE SET
        total_sats = excluded.total_sats,
        valid_sender_sats = excluded.valid_sender_sats;
    `,
    args: [data.pubkey.toLowerCase(), data.total_sats, data.valid_sender_sats],
  });
}

/**
 * Accumulates sats into zap_totals for a recipient pubkey.
 */
export async function accumulateZapTotals(data: {
  pubkey: string;
  addTotalSats: number;
  addValidSats: number;
}): Promise<void> {
  await initDatabase();
  const db = getDb();
  const clean = data.pubkey.toLowerCase();

  await db.execute({
    sql: `
      INSERT INTO zap_totals (pubkey, total_sats, valid_sender_sats)
      VALUES (?, ?, ?)
      ON CONFLICT(pubkey) DO UPDATE SET
        total_sats = zap_totals.total_sats + excluded.total_sats,
        valid_sender_sats = zap_totals.valid_sender_sats + excluded.valid_sender_sats;
    `,
    args: [clean, data.addTotalSats, data.addValidSats],
  });
}

/**
 * Records or accumulates a zap edge from sender to recipient.
 */
export async function recordZapEdge(
  sourcePubkey: string,
  targetPubkey: string,
  sats: number
): Promise<void> {
  await initDatabase();
  const db = getDb();

  await db.execute({
    sql: `
      INSERT INTO trust_edges (source_pubkey, target_pubkey, weight, kind)
      VALUES (?, ?, ?, 'zap')
      ON CONFLICT(source_pubkey, target_pubkey, kind) DO UPDATE SET
        weight = trust_edges.weight + excluded.weight;
    `,
    args: [sourcePubkey.toLowerCase(), targetPubkey.toLowerCase(), sats],
  });
}

/**
 * Retrieves a single creator from the DB by hex pubkey or npub.
 */
export async function getCreatorFromDb(pubkeyOrNpub: string): Promise<Creator | null> {
  await initDatabase();
  const db = getDb();
  const clean = pubkeyOrNpub.trim().toLowerCase();

  const res = await db.execute({
    sql: `
      SELECT c.*, z.total_sats, z.valid_sender_sats
      FROM creators c
      LEFT JOIN zap_totals z ON c.pubkey = z.pubkey
      WHERE c.pubkey = ? OR c.npub = ?
      LIMIT 1
    `,
    args: [clean, clean],
  });

  if (res.rows.length === 0) return null;
  return rowToCreator(res.rows[0]);
}

/**
 * Retrieves all creators from database ordered by trust score.
 */
export async function getAllCreatorsFromDb(limit: number = 100): Promise<Creator[]> {
  await initDatabase();
  const db = getDb();

  const res = await db.execute({
    sql: `
      SELECT c.*, z.total_sats, z.valid_sender_sats
      FROM creators c
      LEFT JOIN zap_totals z ON c.pubkey = z.pubkey
      ORDER BY c.trust_score DESC, c.last_synced DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return res.rows.map((r) => rowToCreator(r));
}

/**
 * Retrieves top creators sorted by Bitcoin Lightning Zaps (zap_totals).
 */
export async function getTopZappedCreatorsFromDb(limit: number = 10): Promise<Creator[]> {
  await initDatabase();
  const db = getDb();

  const res = await db.execute({
    sql: `
      SELECT c.*, z.total_sats, z.valid_sender_sats
      FROM creators c
      LEFT JOIN zap_totals z ON c.pubkey = z.pubkey
      ORDER BY COALESCE(z.total_sats, 0) DESC, c.trust_score DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return res.rows.map((r) => rowToCreator(r));
}

/**
 * Retrieves top creators from DB (hybrid leaderboard).
 */
export async function getTopCreatorsFromDb(limit: number = 10): Promise<Creator[]> {
  await initDatabase();
  const db = getDb();

  const res = await db.execute({
    sql: `
      SELECT c.*, z.total_sats, z.valid_sender_sats
      FROM creators c
      LEFT JOIN zap_totals z ON c.pubkey = z.pubkey
      ORDER BY c.trust_score DESC, COALESCE(z.total_sats, 0) DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return res.rows.map((r) => rowToCreator(r));
}

/**
 * Retrieves graph edges (follows or zaps) for a given pubkey.
 */
export async function getTrustEdgesFromDb(
  pubkey: string,
  kind?: "follow" | "zap"
): Promise<TrustEdgeRow[]> {
  await initDatabase();
  const db = getDb();
  const clean = pubkey.toLowerCase();

  const sql = kind
    ? `SELECT * FROM trust_edges WHERE (source_pubkey = ? OR target_pubkey = ?) AND kind = ?`
    : `SELECT * FROM trust_edges WHERE source_pubkey = ? OR target_pubkey = ?`;

  const args = kind ? [clean, clean, kind] : [clean, clean];
  const res = await db.execute({ sql, args });

  return res.rows as unknown as TrustEdgeRow[];
}

/**
 * Retrieves zap totals for a given pubkey.
 */
export async function getZapTotalsFromDb(pubkey: string): Promise<ZapTotalsRow | null> {
  await initDatabase();
  const db = getDb();

  const res = await db.execute({
    sql: `SELECT * FROM zap_totals WHERE pubkey = ? LIMIT 1`,
    args: [pubkey.toLowerCase()],
  });

  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as ZapTotalsRow;
}