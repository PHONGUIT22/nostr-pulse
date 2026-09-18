// src/app/api/creators/route.ts
import { NextResponse } from "next/server";
import {
  initDatabase,
  getAllCreatorsFromDb,
  getTopZappedCreatorsFromDb,
  getTopCreatorsFromDb,
} from "@/lib/db";

export async function GET(req: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const sort = searchParams.get("sort") || "hybrid";

    let creators;
    if (sort === "zaps") {
      creators = await getTopZappedCreatorsFromDb(limit);
    } else if (sort === "score") {
      creators = await getAllCreatorsFromDb(limit);
    } else {
      creators = await getTopCreatorsFromDb(limit);
    }

    return NextResponse.json(creators);
  } catch (err: any) {
    console.error("[API creators] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch creators" },
      { status: 500 }
    );
  }
}
