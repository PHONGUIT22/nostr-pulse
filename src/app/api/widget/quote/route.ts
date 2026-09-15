// src/app/api/widget/quote/route.ts
import { NextResponse } from "next/server";
import { createCashuMintQuote, DEFAULT_CASHU_MINT } from "@/lib/cashu";

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
    const amountSats = Number(body.amount || body.amountSats || 100);
    const mintUrl = (body.mintUrl || body.mint || DEFAULT_CASHU_MINT).trim();

    if (!amountSats || amountSats <= 0) {
      return NextResponse.json(
        { error: "Invalid amount in satoshis" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    try {
      const quote = await createCashuMintQuote(amountSats, mintUrl);
      return NextResponse.json(
        {
          quoteId: quote.quoteId,
          invoice: quote.invoice,
          mintUrl: quote.mintUrl,
          amountSats,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    } catch (mintErr: any) {
      console.warn("[Widget API] Live mint quote failed, providing simulated demo invoice:", mintErr?.message);
      
      // Fallback mock invoice for offline/sandboxed demo environments
      const mockQuoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const mockInvoice = `lnbc${amountSats * 10}u1p${Math.random().toString(36).substring(2, 20)}mockinvoicefornutzaptestnut${amountSats}satoshis`;
      
      return NextResponse.json(
        {
          quoteId: mockQuoteId,
          invoice: mockInvoice,
          mintUrl,
          amountSats,
          isMock: true,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }
  } catch (error: any) {
    console.error("[Widget API] Quote generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate mint quote" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}