// src/lib/search.ts
import { nip19 } from "nostr-tools";

export function resolveNostrSearch(query: string): string {
  const clean = query.trim();
  if (!clean) return "/";

  // 1. Standard npub format
  if (clean.startsWith("npub1")) {
    return `/p/${clean}`;
  }

  // 2. 64-character hex public key
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    try {
      const npub = nip19.npubEncode(clean);
      return `/p/${npub}`;
    } catch {
      return "/";
    }
  }

  // 3. Fallback: redirect to generic search query
  return `/p/${clean}`;
}