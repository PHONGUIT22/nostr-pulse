// src/app/api/dvm/analytics/route.ts
import { NextResponse } from "next/server";
import { requestDvmAnalyticsWithFallback, discoverDvmAnnouncements } from "@/lib/dvm";
import { normalizeToHex } from "@/lib/nostr";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTarget = body?.targetPubkey || body?.pubkey || body?.npub || "";

    if (!rawTarget) {
      return NextResponse.json(
        { error: "Target pubkey or npub is required" },
        { status: 400 }
      );
    }

    const { hex: targetHex } = normalizeToHex(rawTarget);
    const category = body?.category || "zap-analytics";
    const timeframe = body?.timeframe || "all-time";
    const timeoutMs = typeof body?.timeoutMs === "number" ? body.timeoutMs : 3000;

    const result = await requestDvmAnalyticsWithFallback({
      targetPubkey: targetHex,
      category,
      timeframe,
      timeoutMs,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API DVM Analytics] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process DVM analytics request" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTarget = searchParams.get("pubkey") || searchParams.get("npub") || "";

    // If query is for discovering active DVM announcements (NIP-89)
    if (searchParams.get("discover") === "true") {
      const dvms = await discoverDvmAnnouncements();
      return NextResponse.json({ dvms });
    }

    if (!rawTarget) {
      return NextResponse.json(
        { error: "Pubkey or npub query parameter is required" },
        { status: 400 }
      );
    }

    const { hex: targetHex } = normalizeToHex(rawTarget);
    const category = (searchParams.get("category") as any) || "zap-analytics";
    const timeframe = (searchParams.get("timeframe") as any) || "all-time";
    const timeoutMs = searchParams.get("timeout")
      ? parseInt(searchParams.get("timeout")!, 10)
      : 3000;

    const result = await requestDvmAnalyticsWithFallback({
      targetPubkey: targetHex,
      category,
      timeframe,
      timeoutMs,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API DVM Analytics] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process DVM analytics request" },
      { status: 500 }
    );
  }
}
