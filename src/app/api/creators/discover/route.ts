// src/app/api/creators/discover/route.ts
import { NextResponse } from "next/server";
import { discoverAndCrawlCreator } from "@/lib/discovery";
import { normalizeToHex } from "@/lib/nostr";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query || body?.npub || body?.pubkey || "";

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const { hex, npub } = normalizeToHex(query);
    const force = Boolean(body?.force);

    // Run discovery crawl
    const result = await discoverAndCrawlCreator(query, { forceRefresh: force });

    return NextResponse.json({
      ...result,
      targetUrl: `/p/${npub || result.npub || query}`,
    });
  } catch (err: any) {
    console.error("[API discover] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to discover creator" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || searchParams.get("npub") || "";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const { hex, npub } = normalizeToHex(query);
    const force = searchParams.get("force") === "true";

    const result = await discoverAndCrawlCreator(query, { forceRefresh: force });

    return NextResponse.json({
      ...result,
      targetUrl: `/p/${npub || result.npub || query}`,
    });
  } catch (err: any) {
    console.error("[API discover] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to discover creator" },
      { status: 500 }
    );
  }
}
