#!/usr/bin/env node
import {
  getAgentPubkey
} from "./chunk-5WBKDHXQ.js";
import {
  getAgentTelemetryRecords,
  getTelemetryEventsFromDb,
  getTelemetryStatsFromDb,
  insertAgentTelemetry,
  insertTelemetryEvent
} from "./chunk-UEOH474S.js";

// src/lib/telemetry.ts
var inMemoryTelemetryEvents = [];
var MAX_TELEMETRY_RING_SIZE = 500;
async function logTelemetryEvent(event) {
  const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = event.createdAt || Date.now();
  const nowSec = Math.floor(createdAt / 1e3);
  let actorPubkey = event.actorPubkey;
  if (!actorPubkey) {
    try {
      actorPubkey = getAgentPubkey();
    } catch {
      actorPubkey = "nostrpulse_agent";
    }
  }
  const completeEvent = {
    id,
    eventType: event.eventType,
    category: event.category,
    status: event.status,
    actorPubkey,
    targetPubkey: event.targetPubkey,
    amountSats: event.amountSats ?? 0,
    latencyMs: event.latencyMs ?? 0,
    metadata: event.metadata || {},
    error: event.error,
    createdAt
  };
  inMemoryTelemetryEvents.unshift(completeEvent);
  if (inMemoryTelemetryEvents.length > MAX_TELEMETRY_RING_SIZE) {
    inMemoryTelemetryEvents.pop();
  }
  try {
    await insertTelemetryEvent({
      id,
      event_type: completeEvent.eventType,
      category: completeEvent.category,
      status: completeEvent.status,
      actor_pubkey: completeEvent.actorPubkey || null,
      target_pubkey: completeEvent.targetPubkey || null,
      amount_sats: completeEvent.amountSats,
      latency_ms: completeEvent.latencyMs,
      metadata_json: JSON.stringify(completeEvent.metadata || {}),
      error: completeEvent.error || null,
      created_at: nowSec
    });
  } catch (err) {
    console.debug("[Telemetry] SQLite persistence notice:", err);
  }
  return completeEvent;
}
async function queryTelemetryEvents(options = {}) {
  const limit = options.limit || 50;
  try {
    const dbEvents = await getTelemetryEventsFromDb(options);
    if (dbEvents && dbEvents.length > 0) {
      return dbEvents;
    }
  } catch {
  }
  let filtered = inMemoryTelemetryEvents;
  if (options.category) {
    filtered = filtered.filter((e) => e.category === options.category);
  }
  if (options.status) {
    filtered = filtered.filter((e) => e.status === options.status);
  }
  if (options.since) {
    filtered = filtered.filter((e) => e.createdAt >= options.since);
  }
  return filtered.slice(0, limit);
}
async function getTelemetryOverview() {
  const byCategory = {
    payment: 0,
    radar: 0,
    mint: 0,
    compute: 0,
    identity: 0
  };
  inMemoryTelemetryEvents.forEach((e) => {
    if (byCategory[e.category] !== void 0) {
      byCategory[e.category]++;
    }
  });
  let totalVolumeSats = 0;
  let totalEvents = 0;
  let successEvents = 0;
  let failedEvents = 0;
  let blockedEvents = 0;
  try {
    const stats = await getTelemetryStatsFromDb();
    if (stats.totalEvents > 0) {
      totalVolumeSats = stats.totalVolumeSats;
      totalEvents = stats.totalEvents;
      successEvents = stats.successEvents;
      failedEvents = stats.failedEvents;
      blockedEvents = stats.blockedEvents;
    }
  } catch {
  }
  if (totalEvents === 0) {
    totalEvents = inMemoryTelemetryEvents.length;
    totalVolumeSats = inMemoryTelemetryEvents.reduce((sum, e) => sum + (e.amountSats || 0), 0);
    successEvents = inMemoryTelemetryEvents.filter((e) => e.status === "success").length;
    failedEvents = inMemoryTelemetryEvents.filter((e) => e.status === "failed").length;
    blockedEvents = inMemoryTelemetryEvents.filter((e) => e.status === "blocked").length;
  }
  const successRatePercent = totalEvents > 0 ? Math.round(successEvents / totalEvents * 100) : 100;
  const recentEvents = await queryTelemetryEvents({ limit: 25 });
  return {
    totalVolumeSats,
    totalEvents,
    successRatePercent,
    successEvents,
    failedEvents,
    blockedEvents,
    byCategory,
    recentEvents
  };
}
function clearTelemetryCache() {
  inMemoryTelemetryEvents.length = 0;
}
async function logAgentEvent(event) {
  const id = `tel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = Math.floor(Date.now() / 1e3);
  const amountSats = Number(
    event.data?.amountSats || event.data?.amount_sats || event.data?.amount || 0
  );
  await insertAgentTelemetry({
    id,
    timestamp,
    type: event.type,
    data_json: JSON.stringify(event.data || {}),
    amount_sats: amountSats
  });
  return {
    id,
    timestamp,
    type: event.type,
    data: event.data,
    amountSats
  };
}
async function getAgentTelemetrySummary(timeframeHours = 24) {
  const sinceTimestamp = Math.floor(Date.now() / 1e3) - timeframeHours * 3600;
  const records = await getAgentTelemetryRecords(sinceTimestamp, 500);
  let totalSpentSats = 0;
  let txCount = 0;
  let blockedSybilAttacks = 0;
  for (const r of records) {
    if (r.type === "payment" || r.type === "job_settlement") {
      totalSpentSats += r.amount_sats || 0;
    }
    if (r.type === "payment") {
      txCount++;
    }
    if (r.type === "radar_block") {
      blockedSybilAttacks++;
    }
  }
  const recentEvents = records.slice(0, 20).map((r) => {
    let parsedData = {};
    try {
      parsedData = JSON.parse(r.data_json);
    } catch {
      parsedData = { raw: r.data_json };
    }
    return {
      id: r.id,
      timestamp: r.timestamp,
      type: r.type,
      data: parsedData
    };
  });
  return {
    totalSpentSats,
    txCount,
    blockedSybilAttacks,
    recentEvents
  };
}

export {
  logTelemetryEvent,
  queryTelemetryEvents,
  getTelemetryOverview,
  clearTelemetryCache,
  logAgentEvent,
  getAgentTelemetrySummary
};
