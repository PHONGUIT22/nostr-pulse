// src/lib/telemetry.ts
/**
 * Developer Observability & Telemetry Event Logging Layer
 *
 * Provides a Stripe-grade audit trail for autonomous AI agent actions:
 * - Payment settlements (NutZaps and NWC)
 * - Guardrail interventions and budget enforcement
 * - Radar anti-Sybil audits and Gatekeeper clamp events
 * - Dynamic mint audits and routing
 * - NIP-90 distributed DVM compute dispatching
 */

import {
  insertTelemetryEvent,
  getTelemetryEventsFromDb,
  getTelemetryStatsFromDb,
  insertAgentTelemetry,
  getAgentTelemetryRecords,
} from "@/lib/db";
import { getAgentPubkey } from "@/lib/identity-manager";

export type TelemetryCategory = "payment" | "radar" | "mint" | "compute" | "identity";
export type TelemetryStatus = "success" | "failed" | "blocked";

export type TelemetryEventType =
  | "payment.nutzap.settled"
  | "payment.nutzap.failed"
  | "payment.nwc.settled"
  | "payment.nwc.failed"
  | "payment.guardrail_blocked"
  | "radar.trust_score.checked"
  | "radar.sybil_detected"
  | "mint.audited"
  | "mint.routed"
  | "dvm.job_dispatched"
  | "dvm.fallback_triggered"
  | "identity.bootstrapped";

export interface TelemetryEvent {
  id: string;
  eventType: TelemetryEventType;
  category: TelemetryCategory;
  status: TelemetryStatus;
  actorPubkey?: string;
  targetPubkey?: string;
  amountSats?: number;
  latencyMs?: number;
  metadata?: Record<string, any>;
  error?: string;
  createdAt: number;
}

export interface TelemetryOverview {
  totalVolumeSats: number;
  totalEvents: number;
  successRatePercent: number;
  successEvents: number;
  failedEvents: number;
  blockedEvents: number;
  byCategory: Record<TelemetryCategory, number>;
  recentEvents: TelemetryEvent[];
}

// In-memory fallback ring buffer for high-frequency low-latency telemetry
const inMemoryTelemetryEvents: TelemetryEvent[] = [];
const MAX_TELEMETRY_RING_SIZE = 500;

/**
 * Logs a structured audit telemetry event
 */
export async function logTelemetryEvent(
  event: Omit<TelemetryEvent, "id" | "createdAt"> & { id?: string; createdAt?: number }
): Promise<TelemetryEvent> {
  const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = event.createdAt || Date.now();
  const nowSec = Math.floor(createdAt / 1000);

  // Auto-resolve actor pubkey if omitted
  let actorPubkey = event.actorPubkey;
  if (!actorPubkey) {
    try {
      actorPubkey = getAgentPubkey();
    } catch {
      actorPubkey = "nostrpulse_agent";
    }
  }

  const completeEvent: TelemetryEvent = {
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
    createdAt,
  };

  // 1. Unshift into in-memory ring buffer
  inMemoryTelemetryEvents.unshift(completeEvent);
  if (inMemoryTelemetryEvents.length > MAX_TELEMETRY_RING_SIZE) {
    inMemoryTelemetryEvents.pop();
  }

  // 2. Persist to SQLite database asynchronously
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
      created_at: nowSec,
    });
  } catch (err) {
    console.debug("[Telemetry] SQLite persistence notice:", err);
  }

  return completeEvent;
}

/**
 * Queries telemetry audit events with filtering
 */
export async function queryTelemetryEvents(options: {
  category?: TelemetryCategory;
  status?: TelemetryStatus;
  limit?: number;
  since?: number;
} = {}): Promise<TelemetryEvent[]> {
  const limit = options.limit || 50;

  try {
    const dbEvents = await getTelemetryEventsFromDb(options);
    if (dbEvents && dbEvents.length > 0) {
      return dbEvents as TelemetryEvent[];
    }
  } catch {}

  // Fallback to in-memory buffer
  let filtered = inMemoryTelemetryEvents;
  if (options.category) {
    filtered = filtered.filter((e) => e.category === options.category);
  }
  if (options.status) {
    filtered = filtered.filter((e) => e.status === options.status);
  }
  if (options.since) {
    filtered = filtered.filter((e) => e.createdAt >= options.since!);
  }

  return filtered.slice(0, limit);
}

/**
 * Computes high-level aggregated telemetry metrics for developer dashboards
 */
export async function getTelemetryOverview(): Promise<TelemetryOverview> {
  const byCategory: Record<TelemetryCategory, number> = {
    payment: 0,
    radar: 0,
    mint: 0,
    compute: 0,
    identity: 0,
  };

  inMemoryTelemetryEvents.forEach((e) => {
    if (byCategory[e.category] !== undefined) {
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
  } catch {}

  if (totalEvents === 0) {
    totalEvents = inMemoryTelemetryEvents.length;
    totalVolumeSats = inMemoryTelemetryEvents.reduce((sum, e) => sum + (e.amountSats || 0), 0);
    successEvents = inMemoryTelemetryEvents.filter((e) => e.status === "success").length;
    failedEvents = inMemoryTelemetryEvents.filter((e) => e.status === "failed").length;
    blockedEvents = inMemoryTelemetryEvents.filter((e) => e.status === "blocked").length;
  }

  const successRatePercent =
    totalEvents > 0 ? Math.round((successEvents / totalEvents) * 100) : 100;

  const recentEvents = await queryTelemetryEvents({ limit: 25 });

  return {
    totalVolumeSats,
    totalEvents,
    successRatePercent,
    successEvents,
    failedEvents,
    blockedEvents,
    byCategory,
    recentEvents,
  };
}

/**
 * Clears in-memory telemetry buffer (for testing and resets)
 */
export function clearTelemetryCache(): void {
  inMemoryTelemetryEvents.length = 0;
}

// =============================================================================
// Feature 3: Developer Telemetry & Audit Trail API
// =============================================================================

export interface AgentEventInput {
  type: "payment" | "radar_block" | "job_settlement" | "mint_audit";
  data: Record<string, any>;
}

export interface AgentTelemetryRecord {
  id: string;
  timestamp: number;
  type: "payment" | "radar_block" | "job_settlement" | "mint_audit";
  data: Record<string, any>;
  amountSats?: number;
}

export interface AgentTelemetrySummary {
  totalSpentSats: number;
  txCount: number;
  blockedSybilAttacks: number;
  recentEvents: Array<{
    id: string;
    timestamp: number;
    type: "payment" | "radar_block" | "job_settlement" | "mint_audit";
    data: Record<string, any>;
  }>;
}

/**
 * Stores a structured JSON audit event log into SQLite table agent_telemetry.
 */
export async function logAgentEvent(event: AgentEventInput): Promise<AgentTelemetryRecord> {
  const id = `tel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const amountSats = Number(
    event.data?.amountSats || event.data?.amount_sats || event.data?.amount || 0
  );

  await insertAgentTelemetry({
    id,
    timestamp,
    type: event.type,
    data_json: JSON.stringify(event.data || {}),
    amount_sats: amountSats,
  });

  return {
    id,
    timestamp,
    type: event.type,
    data: event.data,
    amountSats,
  };
}

/**
 * Retrieves audit trail summary showing what the agent paid, which mints it used,
 * which jobs it computed, and which bots were blocked.
 *
 * @param timeframeHours - Rolling window in hours (default: 24 hours)
 */
export async function getAgentTelemetrySummary(timeframeHours = 24): Promise<AgentTelemetrySummary> {
  const sinceTimestamp = Math.floor(Date.now() / 1000) - timeframeHours * 3600;
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

  // Extract the most recent 20 events
  const recentEvents = records.slice(0, 20).map((r) => {
    let parsedData: Record<string, any> = {};
    try {
      parsedData = JSON.parse(r.data_json);
    } catch {
      parsedData = { raw: r.data_json };
    }
    return {
      id: r.id,
      timestamp: r.timestamp,
      type: r.type as AgentEventInput["type"],
      data: parsedData,
    };
  });

  return {
    totalSpentSats,
    txCount,
    blockedSybilAttacks,
    recentEvents,
  };
}

