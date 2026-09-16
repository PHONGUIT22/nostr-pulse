// src/lib/nostr.ts
import { nip19 } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { FEATURED_CREATORS } from "@/lib/creators";

// Top public Nostr relays for high-availability fallback
export const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol"
];

let sharedNostrPool: SimplePool | null = null;
export function getNostrPool(): SimplePool {
  if (!sharedNostrPool) {
    const pool = new SimplePool();
    const origEnsureRelay = pool.ensureRelay.bind(pool);
    pool.ensureRelay = function (url: string, params?: any) {
      return origEnsureRelay(url, params).catch(() => {
        // Return dummy relay to prevent unhandled rejection in subscribeMany / querySync
        return {
          url,
          connected: false,
          subscribe: () => ({ close: () => {}, id: "dummy" }),
          publish: () => Promise.resolve(""),
          close: () => {},
        } as any;
      });
    };
    sharedNostrPool = pool;
  }
  return sharedNostrPool;
}

const profileMemoryCache = new Map<string, Promise<NostrProfile | null>>();

export interface NostrProfile {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  lud06?: string;
  website?: string;
  created_at?: number;
  relays_connected?: number;
}

export interface NostrNote {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
}

/**
 * Normalizes relay URL (strips trailing slashes, prepends wss:// if missing)
 */
export function normalizeRelayUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.startsWith("wss://") && !clean.startsWith("ws://")) {
    clean = "wss://" + clean;
  }
  return clean;
}

const DISALLOWED_RELAYS = new Set([
  "wss://relay.damus.io",
  "wss://nostr.wine",
  "wss://relay.snort.social",
  "wss://eden.nostr.land",
]);

/**
 * Deduplicates and sanitizes relay list, filtering out known problematic relays
 */
export function mergeRelays(primary: string[] = [], fallback: string[] = DEFAULT_RELAYS): string[] {
  const set = new Set<string>();
  [...primary, ...fallback].forEach((r) => {
    if (r && typeof r === "string") {
      try {
        const clean = normalizeRelayUrl(r);
        if (!DISALLOWED_RELAYS.has(clean)) {
          set.add(clean);
        }
      } catch (err) {
        console.debug("[Nostr] Failed to parse/normalize relay URL:", r, err);
      }
    }
  });
  const res = Array.from(set);
  return res.length > 0 ? res : DEFAULT_RELAYS;
}

/**
 * Converts Uint8Array to pure hex string
 */
export function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalizes user input (npub, nprofile, or hex) into a canonical 64-char hex public key and npub.
 */
export function normalizeToHex(input: string): { hex: string; npub: string } {
  const clean = input.trim();

  // Decode npub identifier
  if (clean.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(clean);
      if (decoded.type === "npub") {
        const hex = typeof decoded.data === "string" 
          ? decoded.data 
          : bytesToHex(decoded.data as any);
        return { hex: hex.toLowerCase(), npub: clean };
      }
    } catch (err) {
      console.debug("[Nostr] Failed to decode npub identifier:", clean, err);
    }
  }

  // Decode NIP-19 nprofile identifier
  if (clean.startsWith("nprofile1")) {
    try {
      const decoded = nip19.decode(clean);
      if (decoded.type === "nprofile" && decoded.data.pubkey) {
        const hex = decoded.data.pubkey.toLowerCase();
        return { hex, npub: nip19.npubEncode(hex) };
      }
    } catch (err) {
      console.debug("[Nostr] Failed to decode nprofile identifier:", clean, err);
    }
  }

  // Validate standard 64-character hex pubkey
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    try {
      return {
        hex: clean.toLowerCase(),
        npub: nip19.npubEncode(clean.toLowerCase()),
      };
    } catch (err) {
      console.debug("[Nostr] Failed to encode hex to npub:", clean, err);
    }
  }

  // Lookup in featured creator registry
  const match = FEATURED_CREATORS.find(
    (c) =>
      c.npub === clean ||
      c.handle?.toLowerCase() === clean.toLowerCase() ||
      c.pubkey?.toLowerCase() === clean.toLowerCase()
  );

  if (match && match.pubkey) {
    return { hex: match.pubkey.toLowerCase(), npub: match.npub };
  }

  return { hex: clean, npub: clean };
}

/**
 * Fetches a user's NIP-65 relay list metadata (Kind 10002).
 */
export async function fetchUserRelays(pubkeyOrNpub: string): Promise<string[]> {
  const { hex: hexPubkey } = normalizeToHex(pubkeyOrNpub);
  if (!hexPubkey || !/^[0-9a-fA-F]{64}$/.test(hexPubkey)) return DEFAULT_RELAYS;

  const pool = getNostrPool();
  try {
    const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2500));
    
    // Query event Kind 10002 (NIP-65 Relay List Metadata)
    const queryPromise = pool.querySync(DEFAULT_RELAYS, {
      kinds: [10002],
      authors: [hexPubkey],
      limit: 1,
    }).catch((err) => {
      console.debug("[Nostr] querySync error in fetchUserRelays:", err);
      return [];
    });

    const events = await Promise.race([queryPromise, timeoutPromise]);

    if (Array.isArray(events) && events.length > 0) {
      const nip65Event = events[0];
      const customRelays: string[] = [];

      for (const tag of nip65Event.tags || []) {
        if (tag[0] === "r" && tag[1]) {
          customRelays.push(tag[1]);
        }
      }

      if (customRelays.length > 0) {
        return mergeRelays(customRelays, DEFAULT_RELAYS);
      }
    }
  } catch (err) {
    console.debug("[Nostr] Failed to fetch NIP-65 relay list:", err);
  }

  return DEFAULT_RELAYS;
}

/**
 * Fetches user profile metadata (Kind 0) from connected relays, with Primal API and local fallback.
 * Employs an in-memory promise cache to deduplicate concurrent requests.
 */
export async function fetchNostrProfile(npubOrHex: string, customRelays?: string[]): Promise<NostrProfile | null> {
  const { hex: hexPubkey, npub: encodedNpub } = normalizeToHex(npubOrHex);
  if (!hexPubkey) return null;

  if (profileMemoryCache.has(hexPubkey)) {
    return profileMemoryCache.get(hexPubkey)!;
  }

  const fetchPromise = (async (): Promise<NostrProfile | null> => {
    const targetRelays = mergeRelays(customRelays, DEFAULT_RELAYS);
    const pool = getNostrPool();

    // Primary strategy: Query connected relays for latest Kind 0 metadata
    try {
      const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2500));

      const queryPromise = pool.querySync(targetRelays, {
        kinds: [0],
        authors: [hexPubkey],
      }).catch((err) => {
        console.debug("[Nostr] querySync error in fetchNostrProfile:", err);
        return [];
      });

      const events = await Promise.race([queryPromise, timeoutPromise]);

      if (Array.isArray(events) && events.length > 0) {
        // Pick the newest event by created_at timestamp
        const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];

        if (latestEvent && latestEvent.content) {
          try {
            const metadata = JSON.parse(latestEvent.content);
            return {
              pubkey: hexPubkey,
              npub: encodedNpub,
              name: metadata.name,
              displayName: metadata.display_name || metadata.displayName || metadata.name,
              about: metadata.about || metadata.bio,
              picture: metadata.picture || metadata.image,
              banner: metadata.banner,
              nip05: metadata.nip05,
              lud16: metadata.lud16 || metadata.lud06,
              website: metadata.website,
              created_at: latestEvent.created_at,
              relays_connected: targetRelays.length,
            };
          } catch (parseErr) {
            console.debug("[Nostr] Malformed JSON in kind 0 profile event:", parseErr);
          }
        }
      }
    } catch (err) {
      console.debug("[Nostr] Relay pool query timed out, attempting fallback cache:", err);
    }

    // Secondary strategy: Primal caching API fallback
    try {
      const resPrimal = await fetch("https://primal.net/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["user_profile", { pubkey: hexPubkey }]),
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });

      if (resPrimal.ok) {
        const events = await resPrimal.json();
        if (Array.isArray(events)) {
          const kind0 = events.find((e: any) => e.kind === 0);
          if (kind0 && kind0.content) {
            try {
              const profile = JSON.parse(kind0.content);
              return {
                pubkey: hexPubkey,
                npub: encodedNpub,
                name: profile.name,
                displayName: profile.display_name || profile.displayName || profile.name,
                about: profile.about || profile.bio,
                picture: profile.picture || profile.image,
                banner: profile.banner,
                nip05: profile.nip05,
                lud16: profile.lud16 || profile.lud06,
                website: profile.website,
                created_at: kind0.created_at,
                relays_connected: targetRelays.length,
              };
            } catch (parseErr) {
              console.debug("[Nostr] Malformed JSON in Primal profile event:", parseErr);
            }
          }
        }
      }
    } catch (primalErr) {
      console.debug("[Nostr] Primal fallback query failed:", primalErr);
    }

    // Tertiary strategy: Embedded curated creators list fallback
    const matched = FEATURED_CREATORS.find(
      (c) => c.npub === encodedNpub || c.pubkey?.toLowerCase() === hexPubkey.toLowerCase()
    );

    if (matched) {
      return {
        pubkey: matched.pubkey || hexPubkey,
        npub: matched.npub || encodedNpub,
        name: matched.handle,
        displayName: matched.name,
        about: matched.about || `Active Nostr builder and creator.`,
        picture: matched.picture,
        nip05: matched.nip05,
        lud16: matched.lud16,
        created_at: Math.floor(Date.now() / 1000) - 86400 * 400,
        relays_connected: targetRelays.length,
      };
    }

    return null;
  })();

  profileMemoryCache.set(hexPubkey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches recent text notes (Kind 1) authored by the given pubkey.
 */
export async function fetchRecentNotes(npubOrHex: string, limit: number = 5, customRelays?: string[]): Promise<NostrNote[]> {
  const { hex: hexPubkey } = normalizeToHex(npubOrHex);
  if (!hexPubkey || !/^[0-9a-fA-F]{64}$/.test(hexPubkey)) return [];

  const targetRelays = mergeRelays(customRelays, DEFAULT_RELAYS);
  const pool = getNostrPool();

  try {
    const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3500));
    
    const queryPromise = pool.querySync(targetRelays, {
      kinds: [1],
      authors: [hexPubkey],
      limit: limit * 2,
    }).catch((err) => {
      console.debug("[Nostr] querySync error in fetchRecentNotes:", err);
      return [];
    });

    const events = await Promise.race([queryPromise, timeoutPromise]);

    if (!Array.isArray(events) || events.length === 0) return [];

    return events
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, limit)
      .map((e) => ({
        id: e.id,
        pubkey: e.pubkey,
        content: e.content,
        created_at: e.created_at,
        tags: e.tags,
      }));
  } catch (err) {
    console.debug("[Nostr] Failed to fetch creator notes:", err);
    return [];
  }
}