// src/lib/creators.ts
import { formatSats } from "@/lib/utils";
import importedCreators from "./creators.json";
import { nip19 } from "nostr-tools";

export interface Creator {
  pubkey?: string;
  name: string;
  npub: string;
  handle: string;
  score: number;
  zapsReceived: string;
  picture?: string;
  nip05?: string;
  about?: string;
  lud16?: string;
}

// 1. Safe helper to derive Hex Pubkey from npub
function extractHexPubkey(creator: Creator): string {
  if (creator.pubkey && /^[0-9a-fA-F]{64}$/.test(creator.pubkey)) {
    return creator.pubkey.toLowerCase();
  }
  if (creator.npub && creator.npub.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(creator.npub);
      if (decoded.type === "npub") return decoded.data as string;
    } catch {}
  }
  return "";
}

// 2. Fetch real stats (Kind 10000105) from Primal API
async function fetchPrimalUserStats(hexPubkey: string): Promise<{ satsZapped: number; zapCount: number } | null> {
  if (!hexPubkey) return null;

  try {
    const res = await fetch("https://primal.net/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["user_profile", { pubkey: hexPubkey }]),
      next: { revalidate: 3600 }, // Cache 1 hour on CDN
      signal: AbortSignal.timeout(2000), // 2s timeout to prevent lag
    });

    if (!res.ok) return null;
    const events = await res.json();

    if (Array.isArray(events)) {
      // Find kind 10000105 event containing Primal metrics
      const statsEvent = events.find((e: any) => e.kind === 10000105);
      if (statsEvent && statsEvent.content) {
        const stats = JSON.parse(statsEvent.content);
        return {
          satsZapped: Number(stats.satszapped || 0),
          zapCount: Number(stats.total_zap_count || 0),
        };
      }
    }
  } catch {}

  return null;
}

// Base featured creators array
export const FEATURED_CREATORS: Creator[] = (importedCreators as Creator[]).map((c, index) => ({
  ...c,
  name: c.name?.startsWith("Nostr Creator #") ? `@${c.handle}` : c.name || `@${c.handle}`,
  lud16: c.lud16 || `${c.handle}@getalby.com`,
  score: c.score || Math.max(99 - index, 70),
  zapsReceived: c.zapsReceived || `${(50 - index * 1.5).toFixed(1)}k Sats`,
  picture: c.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.npub}`,
}));

export const CREATORS = FEATURED_CREATORS;

// 3. Attach real zaps to top creators leaderboard
export async function getLiveTopCreators(limit = 10): Promise<Creator[]> {
  const baseList = FEATURED_CREATORS.slice(0, limit);

  // Fetch stats for 10 creators in parallel
  const resolved = await Promise.all(
    baseList.map(async (creator) => {
      const hex = extractHexPubkey(creator);
      let realZapsStr = creator.zapsReceived;

      if (hex) {
        const stats = await fetchPrimalUserStats(hex);
        if (stats && stats.satsZapped > 0) {
          // Format integer sats to compact notation: 4500000 -> 4.5M Sats
          realZapsStr = formatSats(stats.satsZapped);
        }
      }

      return {
        ...creator,
        zapsReceived: realZapsStr,
      };
    })
  );

  return resolved;
}