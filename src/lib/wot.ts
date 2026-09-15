// src/lib/wot.ts
import { nip19 } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { ROOT_ANCHORS, isRootAnchor, getRootAnchor, getAnchorWeight } from "./anchors";
import ring1Snapshot from "./ring1-cache.json";


/**
 * Interface representing a node in the Ring-1 snapshot cache.
 */
export interface Ring1CacheEntry {
  /** Accumulated weighted score */
  score: number;
  /** Number of Root Anchors following this node */
  count: number;
  /** Names of the endorsing Root Anchors */
  anchors: string[];
}

/**
 * Result structure returned by Web-of-Trust distance queries.
 */
export interface WebOfTrustDistanceResult {
  /** 64-character lowercase hex public key */
  pubkey: string;
  /** Bech32 npub representation */
  npub: string;
  /** Graph distance: 0 (Root Anchor), 1 (Direct Ring-1), 2 (Transitive Hop 2), 3 (Hop > 2 / Isolated) */
  distance: 0 | 1 | 2 | 3;
  /** True if the target is a direct Root Anchor */
  isDirectAnchor: boolean;
  /** Raw accumulated weight or Hop 2 score */
  rawScore: number;
  /** Points awarded toward Pillar 2 WoT (0 to 25 ceiling) */
  wotPoints: number;
  /** Normalized trust score scaled to 0-100 */
  normalizedScore: number;
  /** Number of Root Anchors or Ring-1 endorsers */
  endorsedByCount: number;
  /** Names of endorsing Root Anchors (Hop 0 and Hop 1) */
  endorsers: string[];
  /** Hex public keys of endorsing Ring-1 members (Hop 2) */
  ring1Endorsers?: string[];
  /** Classification tier if the target is a Root Anchor */
  tier?: string;
  /** Sybil attack vulnerability assessment */
  sybilRisk: "Low" | "Moderate" | "High";
}

/**
 * In-memory lookup map for $O(1)$ fast graph queries.
 */
const RING1_LOOKUP_MAP = new Map<string, Ring1CacheEntry>();

// Initialize in-memory cache from snapshot on module load
try {
  if (ring1Snapshot && typeof ring1Snapshot === "object" && (ring1Snapshot as any).ring1) {
    const rawRing1 = (ring1Snapshot as any).ring1;
    for (const [pubkey, data] of Object.entries(rawRing1)) {
      const entry = data as any;
      RING1_LOOKUP_MAP.set(pubkey.toLowerCase(), {
        score: Number(entry.score || 0),
        count: Number(entry.count || entry.endorsedByCount || 0),
        anchors: Array.isArray(entry.anchors) ? entry.anchors : entry.endorsedByNames || [],
      });
    }
  }
} catch (err) {
  console.warn("[WoT] Failed to initialize in-memory Ring-1 lookup map:", err);
}

/**
 * Normalizes any Nostr public key representation (npub or 64-char hex)
 * into a canonical lowercase 64-character hex string.
 *
 * @param input - npub1... or hex public key
 * @returns 64-character lowercase hex string or null if invalid
 */
export function normalizePubkey(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // If provided as bech32 npub
  if (trimmed.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === "npub" && typeof decoded.data === "string") {
        return decoded.data.toLowerCase();
      }
    } catch {
      return null;
    }
  }

  // If provided as 64-character hex
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

/**
 * Safely encodes a 64-character hex public key to bech32 npub format.
 *
 * @param hex - 64-character hex public key
 * @returns bech32 npub string or original string on failure
 */
export function encodeNpub(hex: string): string {
  try {
    return nip19.npubEncode(hex);
  } catch {
    return hex;
  }
}

/**
 * Queries the relay pool for accounts that follow the target public key
 * via Kind 3 contact list events referencing the target in '#p' tags.
 *
 * Guaranteed strict timeout <= 3000ms via Promise.race to prevent hanging.
 *
 * @param targetPubkey - Target public key in hex or npub format
 * @param relays - Optional array of Nostr relay URLs
 * @param timeoutMs - Maximum timeout in milliseconds (capped at 3000ms)
 * @returns Array of unique follower hex public keys
 */
export async function queryReverseFollowers(
  targetPubkey: string,
  relays: string[] = ["wss://relay.primal.net", "wss://nos.lol", "wss://relay.damus.io"],
  timeoutMs = 3000
): Promise<string[]> {
  const hex = normalizePubkey(targetPubkey);
  if (!hex) return [];

  // Enforce strict performance guardrail (max 3000ms)
  const effectiveTimeout = Math.min(3000, Math.max(500, timeoutMs));
  const pool = new SimplePool();

  try {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), effectiveTimeout)
    );

    const queryPromise = pool.querySync(
      relays,
      { kinds: [3], "#p": [hex], limit: 30 },
      { maxWait: effectiveTimeout }
    );

    const events = await Promise.race([queryPromise, timeoutPromise]);
    if (Array.isArray(events)) {
      const authors = new Set<string>();
      for (const ev of events) {
        if (ev && ev.pubkey && /^[0-9a-fA-F]{64}$/.test(ev.pubkey)) {
          authors.add(ev.pubkey.toLowerCase());
        }
      }
      return Array.from(authors);
    }
    return [];
  } catch (err) {
    console.warn(`[WoT] queryReverseFollowers timeout/error for ${hex}:`, err);
    return [];
  } finally {
    try {
      pool.close(relays);
    } catch {
      // Ignore pool close errors
    }
  }
}

/**
 * Synchronously queries the Web-of-Trust graph distance:
 * - Hop 0: Target is a configured Root Anchor (Distance = 0, wotPoints = 25, Sybil Risk = Low)
 * - Hop 1: Target is directly followed by >= 1 Root Anchor (Distance = 1, wotPoints = max(1, round(Score_Hop1/8.0 * 25)))
 * - Hop > 1: Target is unverified in fast cache (Distance = 3, wotPoints = 0, Sybil Risk = High)
 *
 * @param targetPubkey - Target public key in either hex or npub format
 * @returns WebOfTrustDistanceResult containing distance, scores, endorsers and Sybil risk
 */
export function getWebOfTrustDistance(targetPubkey: string): WebOfTrustDistanceResult {
  const hex = normalizePubkey(targetPubkey);

  // Invalid or unparseable pubkey
  if (!hex) {
    return {
      pubkey: targetPubkey || "",
      npub: targetPubkey || "",
      distance: 3,
      isDirectAnchor: false,
      rawScore: 0,
      wotPoints: 0,
      normalizedScore: 0,
      endorsedByCount: 0,
      endorsers: [],
      ring1Endorsers: [],
      sybilRisk: "High",
    };
  }

  const npub = encodeNpub(hex);

  // =========================================================================
  // Hop 0: Root Seed Anchors
  // =========================================================================
  const directAnchor = getRootAnchor(hex);
  if (directAnchor) {
    return {
      pubkey: hex,
      npub,
      distance: 0,
      isDirectAnchor: true,
      rawScore: 1.0,
      wotPoints: 25,
      normalizedScore: 100,
      endorsedByCount: ROOT_ANCHORS.length,
      endorsers: [directAnchor.name],
      ring1Endorsers: [],
      tier: directAnchor.tier,
      sybilRisk: "Low",
    };
  }

  // =========================================================================
  // Hop 1: Direct Trust from Anchors (Ring-1 Cache)
  // =========================================================================
  const ring1Entry = RING1_LOOKUP_MAP.get(hex);
  if (ring1Entry) {
    const rawScore = ring1Entry.score;
    const scoreHop1 = Math.min(8.0, rawScore);
    const wotPoints = Math.max(1, Math.round((scoreHop1 / 8.0) * 25));
    const count = ring1Entry.count;

    return {
      pubkey: hex,
      npub,
      distance: 1,
      isDirectAnchor: false,
      rawScore,
      wotPoints,
      normalizedScore: Math.round((wotPoints / 25) * 100),
      endorsedByCount: count,
      endorsers: ring1Entry.anchors,
      ring1Endorsers: [],
      sybilRisk: count >= 2 ? "Low" : "Moderate",
    };
  }

  // =========================================================================
  // Hop > 1 / Unknown (Synchronous fallback, distance = 3)
  // =========================================================================
  return {
    pubkey: hex,
    npub,
    distance: 3,
    isDirectAnchor: false,
    rawScore: 0,
    wotPoints: 0,
    normalizedScore: 0,
    endorsedByCount: 0,
    endorsers: [],
    ring1Endorsers: [],
    sybilRisk: "High",
  };
}

/**
 * Asynchronously resolves the full 4-tier Web-of-Trust graph distance:
 * - Hop 0: Root Seed Anchor (wotPoints = 25/25, Low Sybil Risk)
 * - Hop 1: Direct Trust from Anchors (wotPoints = max(1, round(Score_Hop1/8.0 * 25)))
 * - Hop 2: Transitive Trust via >= 1 Ring-1 node (Score_Hop2 = min(15, count * 3), wotPoints = Score_Hop2)
 * - Hop 3: Isolated / Unknown (wotPoints = 0/25, High Sybil Risk)
 *
 * @param targetPubkey - Target public key in hex or npub format
 * @param options - Optional relay and timeout settings (max 3000ms enforced)
 * @returns Promise<WebOfTrustDistanceResult>
 */
export async function resolveWebOfTrustDistance(
  targetPubkey: string,
  options?: { relays?: string[]; timeoutMs?: number }
): Promise<WebOfTrustDistanceResult> {
  const hex = normalizePubkey(targetPubkey);

  if (!hex) {
    return {
      pubkey: targetPubkey || "",
      npub: targetPubkey || "",
      distance: 3,
      isDirectAnchor: false,
      rawScore: 0,
      wotPoints: 0,
      normalizedScore: 0,
      endorsedByCount: 0,
      endorsers: [],
      ring1Endorsers: [],
      sybilRisk: "High",
    };
  }

  // 1. Check Hop 0 & Hop 1 via synchronous in-memory lookup
  const fastResult = getWebOfTrustDistance(hex);
  if (fastResult.distance === 0 || fastResult.distance === 1) {
    return fastResult;
  }

  // 2. Check Hop 2 (Transitive Trust via Ring-1 reverse followers query)
  const followers = await queryReverseFollowers(
    hex,
    options?.relays,
    options?.timeoutMs ?? 3000
  );

  const ring1Followers = Array.from(
    new Set(followers.filter((author) => isVerifiedRing1(author)))
  );

  if (ring1Followers.length >= 1) {
    const scoreHop2 = Math.min(15, ring1Followers.length * 3);
    const wotPoints = scoreHop2;

    return {
      pubkey: hex,
      npub: encodeNpub(hex),
      distance: 2,
      isDirectAnchor: false,
      rawScore: scoreHop2,
      wotPoints,
      normalizedScore: Math.round((wotPoints / 25) * 100),
      endorsedByCount: ring1Followers.length,
      endorsers: [],
      ring1Endorsers: ring1Followers,
      sybilRisk: "Moderate",
    };
  }

  // 3. Hop > 2 / Isolated Keypair
  return {
    pubkey: hex,
    npub: encodeNpub(hex),
    distance: 3,
    isDirectAnchor: false,
    rawScore: 0,
    wotPoints: 0,
    normalizedScore: 0,
    endorsedByCount: 0,
    endorsers: [],
    ring1Endorsers: [],
    sybilRisk: "High",
  };
}

/**
 * Checks whether a given public key belongs to Verified Ring 1.
 *
 * @param targetPubkey - Target public key (hex or npub)
 * @returns boolean true if the pubkey is in Ring 1
 */
export function isVerifiedRing1(targetPubkey: string): boolean {
  const hex = normalizePubkey(targetPubkey);
  if (!hex) return false;
  return RING1_LOOKUP_MAP.has(hex);
}

/**
 * Retrieves the normalized Web-of-Trust graph score (0 to 100) for a pubkey.
 *
 * @param targetPubkey - Target public key (hex or npub)
 * @returns number score between 0 and 100
 */
export function getWebOfTrustScore(targetPubkey: string): number {
  return getWebOfTrustDistance(targetPubkey).normalizedScore;
}

/**
 * Returns diagnostic metadata regarding the active Ring-1 snapshot cache.
 */
export function getRing1CacheMetadata() {
  return {
    version: (ring1Snapshot as any)?.version || 1,
    generatedAt: (ring1Snapshot as any)?.generatedAt || null,
    totalAnchorsConfigured: (ring1Snapshot as any)?.totalAnchorsConfigured || ROOT_ANCHORS.length,
    anchorsResolved: (ring1Snapshot as any)?.anchorsResolved || 0,
    totalRing1Nodes: RING1_LOOKUP_MAP.size,
  };
}

/**
 * Fetches Kind 3 contact list directly from relays with guaranteed timeout protection
 * to safeguard against websocket connection drops or network flakiness.
 *
 * @param pubkey - 64-character hex pubkey
 * @param relays - Array of relay URLs
 * @param timeoutMs - Maximum timeout in milliseconds before aborting (default: 4000ms)
 * @returns Array of followed pubkeys extracted from 'p' tags
 */
export async function queryLiveContactListWithTimeout(
  pubkey: string,
  relays: string[] = ["wss://relay.primal.net", "wss://nos.lol", "wss://relay.damus.io"],
  timeoutMs = 4000
): Promise<string[]> {
  const hex = normalizePubkey(pubkey);
  if (!hex) return [];

  const pool = new SimplePool();
  try {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const fetchPromise = pool.get(relays, {
      kinds: [3],
      authors: [hex],
    });

    const event = await Promise.race([fetchPromise, timeoutPromise]);
    if (event && Array.isArray(event.tags)) {
      const follows: string[] = [];
      for (const tag of event.tags) {
        if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
          follows.push(tag[1].toLowerCase());
        }
      }
      return follows;
    }
    return [];
  } catch (err) {
    console.warn(`[WoT] Live contact query failed for ${hex}:`, err);
    return [];
  } finally {
    try {
      pool.close(relays);
    } catch {
      // Ignore pool close errors
    }
  }
}