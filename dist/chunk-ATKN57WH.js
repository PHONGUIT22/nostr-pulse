#!/usr/bin/env node
import {
  creators_default
} from "./chunk-5OMV7EKZ.js";

// src/lib/nostr.ts
import { nip19 as nip192 } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";

// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// src/lib/creators.ts
import { nip19 } from "nostr-tools";
var FEATURED_CREATORS = creators_default.map((c, index) => ({
  ...c,
  name: c.name?.startsWith("Nostr Creator #") ? `@${c.handle}` : c.name || `@${c.handle}`,
  lud16: c.lud16 || `${c.handle}@getalby.com`,
  score: c.score || Math.max(99 - index, 70),
  zapsReceived: c.zapsReceived || `${(50 - index * 1.5).toFixed(1)}k Sats`,
  picture: c.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.npub}`
}));

// src/lib/nostr.ts
var DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol"
];
var sharedNostrPool = null;
function getNostrPool() {
  if (!sharedNostrPool) {
    const pool = new SimplePool();
    const origEnsureRelay = pool.ensureRelay.bind(pool);
    pool.ensureRelay = function(url, params) {
      return origEnsureRelay(url, params).catch(() => {
        return {
          url,
          connected: false,
          subscribe: () => ({ close: () => {
          }, id: "dummy" }),
          publish: () => Promise.resolve(""),
          close: () => {
          }
        };
      });
    };
    sharedNostrPool = pool;
  }
  return sharedNostrPool;
}
var profileMemoryCache = /* @__PURE__ */ new Map();
function normalizeRelayUrl(url) {
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.startsWith("wss://") && !clean.startsWith("ws://")) {
    clean = "wss://" + clean;
  }
  return clean;
}
var DISALLOWED_RELAYS = /* @__PURE__ */ new Set([
  "wss://relay.damus.io",
  "wss://nostr.wine",
  "wss://relay.snort.social",
  "wss://eden.nostr.land"
]);
function mergeRelays(primary = [], fallback = DEFAULT_RELAYS) {
  const set = /* @__PURE__ */ new Set();
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
function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function normalizeToHex(input) {
  const clean = input.trim();
  if (clean.startsWith("npub1")) {
    try {
      const decoded = nip192.decode(clean);
      if (decoded.type === "npub") {
        const hex = typeof decoded.data === "string" ? decoded.data : bytesToHex(decoded.data);
        return { hex: hex.toLowerCase(), npub: clean };
      }
    } catch (err) {
      console.debug("[Nostr] Failed to decode npub identifier:", clean, err);
    }
  }
  if (clean.startsWith("nprofile1")) {
    try {
      const decoded = nip192.decode(clean);
      if (decoded.type === "nprofile" && decoded.data.pubkey) {
        const hex = decoded.data.pubkey.toLowerCase();
        return { hex, npub: nip192.npubEncode(hex) };
      }
    } catch (err) {
      console.debug("[Nostr] Failed to decode nprofile identifier:", clean, err);
    }
  }
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    try {
      return {
        hex: clean.toLowerCase(),
        npub: nip192.npubEncode(clean.toLowerCase())
      };
    } catch (err) {
      console.debug("[Nostr] Failed to encode hex to npub:", clean, err);
    }
  }
  const match = FEATURED_CREATORS.find(
    (c) => c.npub === clean || c.handle?.toLowerCase() === clean.toLowerCase() || c.pubkey?.toLowerCase() === clean.toLowerCase()
  );
  if (match && match.pubkey) {
    return { hex: match.pubkey.toLowerCase(), npub: match.npub };
  }
  return { hex: clean, npub: clean };
}
async function fetchNostrProfile(npubOrHex, customRelays) {
  const { hex: hexPubkey, npub: encodedNpub } = normalizeToHex(npubOrHex);
  if (!hexPubkey) return null;
  if (profileMemoryCache.has(hexPubkey)) {
    return profileMemoryCache.get(hexPubkey);
  }
  const fetchPromise = (async () => {
    const targetRelays = mergeRelays(customRelays, DEFAULT_RELAYS);
    const pool = getNostrPool();
    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 2500));
      const queryPromise = pool.querySync(targetRelays, {
        kinds: [0],
        authors: [hexPubkey]
      }).catch((err) => {
        console.debug("[Nostr] querySync error in fetchNostrProfile:", err);
        return [];
      });
      const events = await Promise.race([queryPromise, timeoutPromise]);
      if (Array.isArray(events) && events.length > 0) {
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
              relays_connected: targetRelays.length
            };
          } catch (parseErr) {
            console.debug("[Nostr] Malformed JSON in kind 0 profile event:", parseErr);
          }
        }
      }
    } catch (err) {
      console.debug("[Nostr] Relay pool query timed out, attempting fallback cache:", err);
    }
    try {
      const resPrimal = await fetch("https://primal.net/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["user_profile", { pubkey: hexPubkey }]),
        cache: "no-store",
        signal: AbortSignal.timeout(2e3)
      });
      if (resPrimal.ok) {
        const events = await resPrimal.json();
        if (Array.isArray(events)) {
          const kind0 = events.find((e) => e.kind === 0);
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
                relays_connected: targetRelays.length
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
        created_at: Math.floor(Date.now() / 1e3) - 86400 * 400,
        relays_connected: targetRelays.length
      };
    }
    return null;
  })();
  profileMemoryCache.set(hexPubkey, fetchPromise);
  return fetchPromise;
}

export {
  DEFAULT_RELAYS,
  getNostrPool,
  normalizeRelayUrl,
  normalizeToHex,
  fetchNostrProfile
};
