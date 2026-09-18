// src/app/api/bounties/route.ts
import { NextResponse } from "next/server";
import { fetchOpenBounties } from "@/lib/nip90";

export const dynamic = "force-dynamic";

/**
 * GET /api/bounties
 * Fetches open NIP-90 computational bounties and AI tasks from verified Nostr relays.
 */
export async function GET() {
  try {
    const tasks = await fetchOpenBounties();
    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (err: any) {
    console.error("[API /api/bounties] Failed to fetch open bounties:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch open bounties",
        tasks: [],
      },
      { status: 500 }
    );
  }
}
