// src/app/api/widget/claim/route.ts
import { NextResponse } from "next/server";
import { pollMintAndClaimToken, sendCashuNutZap, DEFAULT_CASHU_MINT } from "@/lib/cashu";
import { accumulateZapTotals, recordZapEdge } from "@/lib/db";
import { normalizePubkey } from "@/lib/wot";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      quoteId,
      mintUrl = DEFAULT_CASHU_MINT,
      amountSats = 100,
      recipientPubkey,
      comment = "Value-4-Value NutZap 🥜",
      isMock = false,
    } = body;

    if (!recipientPubkey) {
      return NextResponse.json(
        { error: "recipientPubkey is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const hexRecipient = normalizePubkey(recipientPubkey);
    if (!hexRecipient) {
      return NextResponse.json(
        { error: "Invalid recipient public key" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Fast path for simulated/demo environments or if marked as mock
    if (isMock || String(quoteId).startsWith("quote_")) {
      const mockEventId = `nutzap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Update local database
      await Promise.allSettled([
        accumulateZapTotals({
          pubkey: hexRecipient,
          addTotalSats: amountSats,
          addValidSats: amountSats,
        }),
        recordZapEdge("nutzap_widget_anonymous", hexRecipient, amountSats),
      ]);

      return NextResponse.json(
        {
          success: true,
          status: "settled",
          eventId: mockEventId,
          amountSats,
          recipientPubkey: hexRecipient,
          message: `Minted and delivered ${amountSats} Sats NutZap!`,
          isMock: true,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Live path: poll Mint for payment and mint proofs (with 10s max wait per poll request)
    try {
      const cashuToken = await pollMintAndClaimToken(amountSats, quoteId, mintUrl, 10);
      
      // Send NIP-61 NutZap
      const zapResult = await sendCashuNutZap({
        recipientPubkey: hexRecipient,
        cashuToken,
        amountSats,
        comment,
        mintUrl,
      });

      // Update database records
      await Promise.allSettled([
        accumulateZapTotals({
          pubkey: hexRecipient,
          addTotalSats: amountSats,
          addValidSats: amountSats,
        }),
        recordZapEdge("nutzap_widget_sender", hexRecipient, amountSats),
      ]);

      return NextResponse.json(
        {
          success: true,
          status: "settled",
          eventId: zapResult.id,
          amountSats,
          recipientPubkey: hexRecipient,
          message: `Successfully sent ${amountSats} Sats eCash NutZap!`,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    } catch (claimErr: any) {
      // If payment is not yet ready, return pending state
      const errMsg = String(claimErr?.message || "").toLowerCase();
      if (errMsg.includes("pending") || errMsg.includes("expired") || errMsg.includes("timed out")) {
        return NextResponse.json(
          {
            success: false,
            status: "pending",
            message: "Awaiting Lightning payment settlement",
          },
          { status: 202, headers: CORS_HEADERS }
        );
      }

      throw claimErr;
    }
  } catch (error: any) {
    console.error("[Widget API] Claim error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to claim eCash proofs" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
