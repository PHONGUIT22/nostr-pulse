// src/app/api/telemetry/route.ts
import { NextResponse } from "next/server";
import { getTelemetryOverview, queryTelemetryEvents, type TelemetryCategory, type TelemetryStatus } from "@/lib/telemetry";
import { getSpendingSummary } from "@/lib/spending-guardrails";
import { getOrInitAgentIdentity } from "@/lib/identity-manager";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as TelemetryCategory | null;
    const status = searchParams.get("status") as TelemetryStatus | null;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;

    const [overview, events, spendingSummary, identity] = await Promise.all([
      getTelemetryOverview(),
      queryTelemetryEvents({
        category: category || undefined,
        status: status || undefined,
        limit,
      }),
      getSpendingSummary(),
      Promise.resolve(getOrInitAgentIdentity()),
    ]);

    return NextResponse.json({
      success: true,
      agent: {
        pubkey: identity.pubkey,
        npub: identity.npub,
        source: identity.source,
        isEphemeral: identity.isEphemeral,
      },
      spending: spendingSummary,
      overview,
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to retrieve telemetry data",
      },
      { status: 500 }
    );
  }
}
