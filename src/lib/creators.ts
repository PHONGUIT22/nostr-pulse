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
export function extractHexPubkey(creator: Creator): string {
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

/**
 * Retrieves creator zap stats directly from the local SQLite database (zap_totals & trust_edges).
 * Completely replaces external HTTP fetch to primal.net/api.
 */
export async function getCreatorZapStats(hexPubkey: string): Promise<{ satsZapped: number; zapCount: number } | null> {
  if (!hexPubkey) return null;

  if (typeof window === "undefined") {
    try {
      const { initDatabase, getZapTotalsFromDb, getTrustEdgesFromDb } = await import("@/lib/db");
      await initDatabase();
      const zapTotal = await getZapTotalsFromDb(hexPubkey);
      if (zapTotal) {
        const zapEdges = await getTrustEdgesFromDb(hexPubkey, "zap");
        return {
          satsZapped: zapTotal.total_sats,
          zapCount: zapEdges.length,
        };
      }
    } catch (err) {
      console.debug("[Creators] Failed to read zap totals from DB:", err);
    }
  }

  return null;
}

// Backward compatibility alias (now backed by DB, no primal.net/api calls)
export const fetchPrimalUserStats = getCreatorZapStats;

// Base seed creators array
export const FEATURED_CREATORS: Creator[] = (importedCreators as Creator[]).map((c, index) => ({
  ...c,
  name: c.name?.startsWith("Nostr Creator #") ? `@${c.handle}` : c.name || `@${c.handle}`,
  lud16: c.lud16 || `${c.handle}@getalby.com`,
  score: c.score || Math.max(99 - index, 70),
  zapsReceived: c.zapsReceived || `${(50 - index * 1.5).toFixed(1)}k Sats`,
  picture: c.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.npub}`,
}));

export const CREATORS = FEATURED_CREATORS;

/**
 * Retrieves dynamic top creators backed by the local SQLite database.
 * If running on server, pulls live records from DB; falls back to seed list if empty.
 */
export async function getLiveTopCreators(limit = 10): Promise<Creator[]> {
  if (typeof window === "undefined") {
    try {
      const { initDatabase, getTopCreatorsFromDb } = await import("@/lib/db");
      await initDatabase();
      const dbCreators = await getTopCreatorsFromDb(limit);

      if (dbCreators && dbCreators.length > 0) {
        return dbCreators;
      }
    } catch (err) {
      console.warn("[Creators] Could not query database creators, falling back to seed:", err);
    }
  }

  const baseList = FEATURED_CREATORS.slice(0, limit);

  // Fetch stats from local DB for fallback list in parallel
  const resolved = await Promise.all(
    baseList.map(async (creator) => {
      const hex = extractHexPubkey(creator);
      let realZapsStr = creator.zapsReceived;

      if (hex) {
        const stats = await getCreatorZapStats(hex);
        if (stats && stats.satsZapped > 0) {
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

/**
 * Retrieves all creators from database or seed fallback.
 */
export async function getAllCreators(limit = 100): Promise<Creator[]> {
  if (typeof window === "undefined") {
    try {
      const { initDatabase, getAllCreatorsFromDb } = await import("@/lib/db");
      await initDatabase();
      const dbCreators = await getAllCreatorsFromDb(limit);
      if (dbCreators && dbCreators.length > 0) {
        return dbCreators;
      }
    } catch (err) {
      console.warn("[Creators] Could not query database for all creators:", err);
    }
  }
  return FEATURED_CREATORS.slice(0, limit);
}