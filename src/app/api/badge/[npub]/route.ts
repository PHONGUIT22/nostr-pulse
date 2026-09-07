import { NextRequest, NextResponse } from "next/server";
import { fetchNostrProfile, normalizeToHex, NostrProfile } from "@/lib/nostr";
import { verifyNip05 } from "@/lib/nip05";
import { calculateTrustScore } from "@/lib/trust-score";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ npub: string }> | { npub: string } }
) {
  const resolvedParams = await context.params;
  const rawNpub = decodeURIComponent(resolvedParams.npub);
  const { hex: hexPubkey, npub: encodedNpub } = normalizeToHex(rawNpub);

  // Fetch profile data
  const rawProfile = await fetchNostrProfile(rawNpub);
  const profile: NostrProfile = rawProfile || {
    pubkey: hexPubkey,
    npub: encodedNpub,
    created_at: Math.floor(Date.now() / 1000),
  };

  // Verify NIP-05 & calculate Trust Score
  const nip05Result = await verifyNip05(profile.nip05, profile.pubkey);
  const trustData = calculateTrustScore(profile, nip05Result);

  const score = trustData.score;
  let bgRight = "#10b981"; // Emerald
  let tierLabel = "VERIFIED";

  if (score < 50) {
    bgRight = "#f43f5e"; // Rose
    tierLabel = "UNVERIFIED";
  } else if (score < 80) {
    bgRight = "#f59e0b"; // Amber
    tierLabel = "CONTRIBUTOR";
  }

  // GitHub Shields.io style SVG badge template
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="195" height="28" viewBox="0 0 195 28">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="195" height="28" rx="6" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <rect width="105" height="28" fill="#0f172a"/>
      <rect x="105" width="90" height="28" fill="${bgRight}"/>
      <rect width="195" height="28" fill="url(#b)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-rendering="geometricPrecision" font-size="11" font-weight="700">
      <!-- Icon Lightning -->
      <path d="M16 8l-6 7h4l-2 5 6-7h-4l2-5z" fill="#f59e0b"/>
      <text x="58" y="18" fill="#fff">NOSTR TRUST</text>
      <text x="150" y="18" fill="#0f172a">${score}/100 • ${tierLabel}</text>
    </g>
  </svg>
  `.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}