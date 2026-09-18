#!/usr/bin/env node
import {
  creators_default
} from "./chunk-5OMV7EKZ.js";

// src/lib/db.ts
import { createClient } from "@libsql/client";
import path from "path";
var globalForDb = globalThis;
function getDb() {
  if (globalForDb.libsqlClient) {
    return globalForDb.libsqlClient;
  }
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), "nostrpulse.db").replace(/\\/g, "/")}`;
  const client = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  globalForDb.libsqlClient = client;
  return client;
}
async function initDatabase() {
  if (globalForDb.initPromise) {
    return globalForDb.initPromise;
  }
  globalForDb.initPromise = (async () => {
    const db = getDb();
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS trust_edges (
        source_pubkey TEXT,
        target_pubkey TEXT,
        weight REAL DEFAULT 1.0,
        kind TEXT,
        PRIMARY KEY (source_pubkey, target_pubkey, kind)
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS zap_totals (
        pubkey TEXT PRIMARY KEY,
        total_sats INTEGER DEFAULT 0,
        valid_sender_sats INTEGER DEFAULT 0
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agent_spending_records (
        id TEXT PRIMARY KEY,
        amount_sats INTEGER NOT NULL,
        rail TEXT NOT NULL,
        recipient_pubkey TEXT,
        event_id TEXT,
        memo TEXT,
        created_at INTEGER NOT NULL
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS telemetry_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        actor_pubkey TEXT,
        target_pubkey TEXT,
        amount_sats INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        metadata_json TEXT,
        error TEXT,
        created_at INTEGER NOT NULL
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agent_spending_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        amount_sats INTEGER NOT NULL,
        recipient TEXT,
        rail TEXT,
        status TEXT,
        reason TEXT
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agent_telemetry (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        data_json TEXT NOT NULL,
        amount_sats INTEGER DEFAULT 0
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_creators_npub ON creators(npub);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_creators_score ON creators(trust_score DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_creators_synced ON creators(last_synced DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_trust_edges_source ON trust_edges(source_pubkey);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_trust_edges_target ON trust_edges(target_pubkey);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_zap_totals_sats ON zap_totals(total_sats DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_spending_created ON agent_spending_records(created_at DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_spending_recipient ON agent_spending_records(recipient_pubkey);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_telemetry_category ON telemetry_events(category);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_telemetry_status ON telemetry_events(status);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_spending_log_timestamp ON agent_spending_log(timestamp DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_spending_log_recipient ON agent_spending_log(recipient);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_agent_telemetry_timestamp ON agent_telemetry(timestamp DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_agent_telemetry_type ON agent_telemetry(type);`);
    const countRes = await db.execute("SELECT COUNT(*) as count FROM creators");
    const count = Number(countRes.rows[0]?.count || 0);
    if (count === 0 && Array.isArray(creators_default) && creators_default.length > 0) {
      const now = Math.floor(Date.now() / 1e3);
      const batchQueries = [];
      for (const [index, c] of creators_default.entries()) {
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
          if (matchK) initialSats = Math.round(parseFloat(matchK[1]) * 1e3);
          else if (matchM) initialSats = Math.round(parseFloat(matchM[1]) * 1e6);
          else if (matchPure) initialSats = parseInt(matchPure[1].replace(/,/g, ""), 10);
        }
        const metadataJson = JSON.stringify({
          name: c.name,
          handle: c.handle,
          picture: c.picture,
          about: c.about,
          nip05: c.nip05,
          lud16: c.lud16,
          zapsReceived: c.zapsReceived
        });
        batchQueries.push({
          sql: `
            INSERT OR REPLACE INTO creators (pubkey, npub, nip05, lud16, metadata_json, trust_score, last_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [pubkey, npub, nip05, lud16, metadataJson, score, now]
        });
        batchQueries.push({
          sql: `
            INSERT OR REPLACE INTO zap_totals (pubkey, total_sats, valid_sender_sats)
            VALUES (?, ?, ?)
          `,
          args: [pubkey, initialSats, Math.round(initialSats * 0.9)]
        });
      }
      if (batchQueries.length > 0) {
        await db.batch(batchQueries, "write");
      }
    }
  })();
  return globalForDb.initPromise;
}
function rowToCreator(row, zapRow) {
  let meta = {};
  if (row.metadata_json) {
    try {
      meta = JSON.parse(row.metadata_json);
    } catch {
    }
  }
  const totalSats = zapRow?.total_sats ?? row.total_sats ?? meta.total_sats ?? 0;
  let zapsStr = meta.zapsReceived || "0 Sats";
  if (totalSats > 0) {
    if (totalSats >= 1e6) {
      zapsStr = `${(totalSats / 1e6).toFixed(1)}M Sats`;
    } else if (totalSats >= 1e3) {
      zapsStr = `${(totalSats / 1e3).toFixed(1)}k Sats`;
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
    nip05: row.nip05 || meta.nip05 || void 0,
    about: meta.about || meta.bio || void 0,
    lud16: row.lud16 || meta.lud16 || void 0
  };
}
async function upsertCreator(data) {
  await initDatabase();
  const db = getDb();
  const now = data.last_synced ?? Math.floor(Date.now() / 1e3);
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
      now
    ]
  });
}
async function upsertTrustEdges(edges) {
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
      e.kind
    ]
  }));
  await db.batch(queries, "write");
}
async function upsertZapTotals(data) {
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
    args: [data.pubkey.toLowerCase(), data.total_sats, data.valid_sender_sats]
  });
}
async function accumulateZapTotals(data) {
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
    args: [clean, data.addTotalSats, data.addValidSats]
  });
}
async function recordZapEdge(sourcePubkey, targetPubkey, sats) {
  await initDatabase();
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO trust_edges (source_pubkey, target_pubkey, weight, kind)
      VALUES (?, ?, ?, 'zap')
      ON CONFLICT(source_pubkey, target_pubkey, kind) DO UPDATE SET
        weight = trust_edges.weight + excluded.weight;
    `,
    args: [sourcePubkey.toLowerCase(), targetPubkey.toLowerCase(), sats]
  });
}
async function getCreatorFromDb(pubkeyOrNpub) {
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
    args: [clean, clean]
  });
  if (res.rows.length === 0) return null;
  return rowToCreator(res.rows[0]);
}
async function getAllCreatorsFromDb(limit = 100) {
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
    args: [limit]
  });
  return res.rows.map((r) => rowToCreator(r));
}
async function getTopZappedCreatorsFromDb(limit = 10) {
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
    args: [limit]
  });
  return res.rows.map((r) => rowToCreator(r));
}
async function getTopCreatorsFromDb(limit = 10) {
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
    args: [limit]
  });
  return res.rows.map((r) => rowToCreator(r));
}
async function getTrustEdgesFromDb(pubkey, kind) {
  await initDatabase();
  const db = getDb();
  const clean = pubkey.toLowerCase();
  const sql = kind ? `SELECT * FROM trust_edges WHERE (source_pubkey = ? OR target_pubkey = ?) AND kind = ?` : `SELECT * FROM trust_edges WHERE source_pubkey = ? OR target_pubkey = ?`;
  const args = kind ? [clean, clean, kind] : [clean, clean];
  const res = await db.execute({ sql, args });
  return res.rows;
}
async function getZapTotalsFromDb(pubkey) {
  await initDatabase();
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT * FROM zap_totals WHERE pubkey = ? LIMIT 1`,
    args: [pubkey.toLowerCase()]
  });
  if (res.rows.length === 0) return null;
  return res.rows[0];
}
async function insertSpendingRecord(record) {
  await initDatabase();
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO agent_spending_records (id, amount_sats, rail, recipient_pubkey, event_id, memo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      record.id,
      record.amount_sats,
      record.rail,
      record.recipient_pubkey ? record.recipient_pubkey.toLowerCase() : null,
      record.event_id || null,
      record.memo || null,
      record.created_at
    ]
  });
}
async function getRecentSpendingRecords(sinceEpochSec) {
  await initDatabase();
  const db = getDb();
  const res = await db.execute({
    sql: `
      SELECT * FROM agent_spending_records
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `,
    args: [sinceEpochSec]
  });
  return res.rows.map((r) => ({
    id: String(r.id),
    amount_sats: Number(r.amount_sats),
    rail: String(r.rail),
    recipient_pubkey: r.recipient_pubkey ? String(r.recipient_pubkey) : null,
    event_id: r.event_id ? String(r.event_id) : null,
    memo: r.memo ? String(r.memo) : null,
    created_at: Number(r.created_at)
  }));
}
async function insertTelemetryEvent(event) {
  await initDatabase();
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO telemetry_events (
        id, event_type, category, status, actor_pubkey, target_pubkey,
        amount_sats, latency_ms, metadata_json, error, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      event.id,
      event.event_type,
      event.category,
      event.status,
      event.actor_pubkey ? event.actor_pubkey.toLowerCase() : null,
      event.target_pubkey ? event.target_pubkey.toLowerCase() : null,
      event.amount_sats ?? 0,
      event.latency_ms ?? 0,
      event.metadata_json || null,
      event.error || null,
      event.created_at
    ]
  });
}
async function getTelemetryEventsFromDb(options = {}) {
  await initDatabase();
  const db = getDb();
  const limit = options.limit || 50;
  let sql = `SELECT * FROM telemetry_events WHERE 1=1`;
  const args = [];
  if (options.category) {
    sql += ` AND category = ?`;
    args.push(options.category);
  }
  if (options.status) {
    sql += ` AND status = ?`;
    args.push(options.status);
  }
  if (options.since) {
    sql += ` AND created_at >= ?`;
    args.push(options.since);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  args.push(limit);
  const res = await db.execute({ sql, args });
  return res.rows.map((r) => ({
    id: String(r.id),
    eventType: String(r.event_type),
    category: String(r.category),
    status: String(r.status),
    actorPubkey: r.actor_pubkey ? String(r.actor_pubkey) : null,
    targetPubkey: r.target_pubkey ? String(r.target_pubkey) : null,
    amountSats: Number(r.amount_sats || 0),
    latencyMs: Number(r.latency_ms || 0),
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : {},
    error: r.error ? String(r.error) : null,
    createdAt: Number(r.created_at)
  }));
}
async function getTelemetryStatsFromDb() {
  await initDatabase();
  const db = getDb();
  const res = await db.execute(`
    SELECT
      COALESCE(SUM(amount_sats), 0) as totalVolumeSats,
      COUNT(*) as totalEvents,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successEvents,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedEvents,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blockedEvents
    FROM telemetry_events
  `);
  const row = res.rows[0] || {};
  return {
    totalVolumeSats: Number(row.totalVolumeSats || 0),
    totalEvents: Number(row.totalEvents || 0),
    successEvents: Number(row.successEvents || 0),
    failedEvents: Number(row.failedEvents || 0),
    blockedEvents: Number(row.blockedEvents || 0)
  };
}
async function insertAgentSpendingLog(entry) {
  await initDatabase();
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO agent_spending_log (id, timestamp, amount_sats, recipient, rail, status, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      entry.id,
      entry.timestamp,
      entry.amount_sats,
      entry.recipient ? entry.recipient.toLowerCase() : null,
      entry.rail,
      entry.status,
      entry.reason || null
    ]
  });
}
async function getRolling24hApprovedSpend(sinceTimestamp) {
  await initDatabase();
  const db = getDb();
  const res = await db.execute({
    sql: `
      SELECT COALESCE(SUM(amount_sats), 0) as total_spent
      FROM agent_spending_log
      WHERE status = 'approved' AND timestamp >= ?
    `,
    args: [sinceTimestamp]
  });
  return Number(res.rows[0]?.total_spent || 0);
}
async function getAgentSpendingLogs(limit = 50) {
  await initDatabase();
  const db = getDb();
  const res = await db.execute({
    sql: `
      SELECT * FROM agent_spending_log
      ORDER BY timestamp DESC
      LIMIT ?
    `,
    args: [limit]
  });
  return res.rows.map((r) => ({
    id: String(r.id),
    timestamp: Number(r.timestamp),
    amount_sats: Number(r.amount_sats),
    recipient: r.recipient ? String(r.recipient) : null,
    rail: String(r.rail),
    status: String(r.status),
    reason: r.reason ? String(r.reason) : null
  }));
}
async function insertAgentTelemetry(entry) {
  await initDatabase();
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO agent_telemetry (id, timestamp, type, data_json, amount_sats)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [
      entry.id,
      entry.timestamp,
      entry.type,
      entry.data_json,
      entry.amount_sats ?? 0
    ]
  });
}
async function getAgentTelemetryRecords(sinceTimestamp, limit = 50) {
  await initDatabase();
  const db = getDb();
  let sql = `SELECT * FROM agent_telemetry`;
  const args = [];
  if (sinceTimestamp !== void 0) {
    sql += ` WHERE timestamp >= ?`;
    args.push(sinceTimestamp);
  }
  sql += ` ORDER BY timestamp DESC LIMIT ?`;
  args.push(limit);
  const res = await db.execute({ sql, args });
  return res.rows.map((r) => ({
    id: String(r.id),
    timestamp: Number(r.timestamp),
    type: String(r.type),
    data_json: String(r.data_json),
    amount_sats: Number(r.amount_sats || 0)
  }));
}

export {
  getDb,
  initDatabase,
  rowToCreator,
  upsertCreator,
  upsertTrustEdges,
  upsertZapTotals,
  accumulateZapTotals,
  recordZapEdge,
  getCreatorFromDb,
  getAllCreatorsFromDb,
  getTopZappedCreatorsFromDb,
  getTopCreatorsFromDb,
  getTrustEdgesFromDb,
  getZapTotalsFromDb,
  insertSpendingRecord,
  getRecentSpendingRecords,
  insertTelemetryEvent,
  getTelemetryEventsFromDb,
  getTelemetryStatsFromDb,
  insertAgentSpendingLog,
  getRolling24hApprovedSpend,
  getAgentSpendingLogs,
  insertAgentTelemetry,
  getAgentTelemetryRecords
};
