// src/app/api/indexer/run/route.ts
import { NextResponse } from "next/server";
import { runIndexerPass, MAJOR_INDEXER_RELAYS } from "@/lib/indexer";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = typeof body?.batchSize === "number" ? body.batchSize : 15;
    const pubkeys = Array.isArray(body?.pubkeys) ? body.pubkeys : undefined;

    const result = await runIndexerPass({
      batchSize,
      pubkeys,
      verbose: false,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API indexer] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Indexer pass failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await runIndexerPass({
      batchSize: 15,
      verbose: false,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API indexer] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Indexer pass failed" },
      { status: 500 }
    );
  }
}
