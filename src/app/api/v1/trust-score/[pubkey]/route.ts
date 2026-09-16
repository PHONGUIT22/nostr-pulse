// src/app/api/v1/trust-score/[pubkey]/route.ts
import { NextResponse } from "next/server";
import { normalizePubkey, encodeNpub, getWebOfTrustDistance } from "@/lib/wot";
import { getCreatorFromDb, getZapTotalsFromDb } from "@/lib/db";
import { calculateTrustScore } from "@/lib/trust-score";

interface RouteContext {
  params: Promise<{ pubkey: string }>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

/**
 * Handle CORS preflight OPTIONS request
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/v1/trust-score/[pubkey]
 *
 * Public Open API endpoint providing Trust Score, Web-of-Trust graph metrics,
 * and Economic Stake data for any Nostr pubkey or npub.
 * Designed for external clients (Coracle, Amethyst, Nostr clients) as an anti-spam/anti-Sybil filter.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { pubkey: rawParam } = await context.params;

    if (!rawParam) {
      return NextResponse.json(
        { error: "Public key or npub is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const hexPubkey = normalizePubkey(rawParam);
    if (!hexPubkey) {
      return NextResponse.json(
        { error: "Invalid Nostr public key or npub format" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const npub = encodeNpub(hexPubkey);

    // 1. Query Web-of-Trust graph distance (Hop 0, 1, 2, 3)
    const wotResult = getWebOfTrustDistance(hexPubkey);

    // 2. Query local database for creator profile and zap records
    const [creatorDb, zapRow] = await Promise.all([
      getCreatorFromDb(hexPubkey),
      getZapTotalsFromDb(hexPubkey),
    ]);

    // 3. Resolve Economic Stake satoshis
    const verifiedZapsSats = zapRow?.valid_sender_sats ?? 0;
    const totalZapsSats = zapRow?.total_sats ?? 0;
    const sybilFilteredSats = Math.max(0, totalZapsSats - verifiedZapsSats);

    // 4. Resolve Score and Tier
    let score = creatorDb ? creatorDb.score : 0;
    let tier: "Verified Builder" | "Active Contributor" | "Unverified / Potential Bot" =
      "Unverified / Potential Bot";

    if (creatorDb) {
      score = creatorDb.score;
      if (wotResult.distance === 0 || (score >= 80 && wotResult.distance <= 1)) {
        tier = "Verified Builder";
      } else if (score >= 50 && wotResult.distance <= 2) {
        tier = "Active Contributor";
      } else {
        tier = "Unverified / Potential Bot";
      }
    } else {
      // Calculate algorithmic score for new/unindexed pubkey using WoT graph distance
      const simulatedProfile = {
        pubkey: hexPubkey,
        npub,
        name: "",
        created_at: undefined,
      };
      const calculated = calculateTrustScore(simulatedProfile, undefined, wotResult);
      score = calculated.score;
      tier = calculated.tier;
    }

    // 5. Structure standard output according to grant specification
    const responsePayload = {
      pubkey: hexPubkey,
      score: Math.round(score),
      tier,
      wot: {
        direct_anchor_endorsed:
          wotResult.distance === 0 ||
          (wotResult.distance === 1 && wotResult.endorsedByCount > 0),
        distance: wotResult.distance,
        endorsers_count: wotResult.endorsedByCount,
      },
      economic_stake: {
        verified_zaps_sats: verifiedZapsSats,
        sybil_filtered_sats: sybilFilteredSats,
      },
    };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error: any) {
    console.error("[TrustScoreAPI] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error while resolving trust score" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
