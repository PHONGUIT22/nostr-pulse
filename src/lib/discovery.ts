// src/lib/discovery.ts
import { nip19 } from "nostr-tools";
import {
  normalizeToHex,
  fetchNostrProfile,
  getNostrPool,
  DEFAULT_RELAYS,
  NostrProfile,
} from "@/lib/nostr";
import { verifyNip05 } from "@/lib/nip05";
import { calculateTrustScoreAsync } from "@/lib/trust-score";
import { formatSats } from "@/lib/utils";
import { requestDvmAnalyticsWithFallback } from "@/lib/dvm";
import { MAJOR_INDEXER_RELAYS } from "@/lib/indexer";
import {
  initDatabase,
  upsertCreator,
  upsertTrustEdges,
  upsertZapTotals,
  getCreatorFromDb,
  Creator,
} from "@/lib/db";

export interface DiscoveryResult {
  success: boolean;
  creator: Creator | null;
  hexPubkey?: string;
  npub?: string;
  isNew?: boolean;
  edgesCrawled?: {
    follows: number;
    zaps: number;
  };
  error?: string;
}

// Memory lock to prevent redundant concurrent crawling of the same pubkey
const activeCrawlJobs = new Map<string, Promise<DiscoveryResult>>();

/**
 * Discovers, crawls, and indexes a Nostr identity into the database.
 * Crawls:
 * 1. Profile metadata (Kind 0)
 * 2. NIP-05 DNS verification
 * 3. Trust Score calculation
 * 4. Contact List / Follow graph edges (Kind 3)
 * 5. Lightning zap receipts & totals (Kind 9735 & Primal metrics)
 */
export async function discoverAndCrawlCreator(
  identifier: string,
  options: { forceRefresh?: boolean } = {}
): Promise<DiscoveryResult> {
  await initDatabase();

  const clean = identifier.trim();
  if (!clean) {
    return { success: false, creator: null, error: "Empty identifier provided" };
  }

  // 1. Normalize identifier to canonical hex and npub
  const { hex: hexPubkey, npub: encodedNpub } = normalizeToHex(clean);
  const isValidHex = /^[0-9a-fA-F]{64}$/.test(hexPubkey);

  if (!isValidHex) {
    // Check if it matches an existing creator by handle/name in DB
    const existing = await getCreatorFromDb(clean);
    if (existing && existing.pubkey) {
      return { success: true, creator: existing, hexPubkey: existing.pubkey, npub: existing.npub };
    }
    return {
      success: false,
      creator: null,
      error: `Could not resolve "${clean}" to a valid 64-character Nostr pubkey.`,
    };
  }

  // 2. Check if already in DB and recently synced (< 24 hours)
  const existingCreator = await getCreatorFromDb(hexPubkey);
  const now = Math.floor(Date.now() / 1000);

  // If already cached and fresh, return immediately unless forced
  if (existingCreator && !options.forceRefresh) {
    return {
      success: true,
      creator: existingCreator,
      hexPubkey,
      npub: encodedNpub,
      isNew: false,
    };
  }

  // 3. Deduplicate simultaneous crawl jobs for the same pubkey
  if (activeCrawlJobs.has(hexPubkey)) {
    return activeCrawlJobs.get(hexPubkey)!;
  }

  const crawlPromise = (async (): Promise<DiscoveryResult> => {
    try {
      console.log(`[Discovery] Starting graph crawl for ${encodedNpub} (${hexPubkey.slice(0, 8)}...)...`);

      // 4. Parallel crawl: Metadata (Kind 0), Primal Stats, Follows (Kind 3), and Zap Receipts (Kind 9735)
      const pool = getNostrPool();

      const [rawProfile, primalStats, followEdges, zapEdges] = await Promise.allSettled([
        // Step A: Fetch Kind 0 Profile
        fetchNostrProfile(hexPubkey),

        // Step B: Distributed NIP-90 DVM Analytics with Local DB Fallback
        (async () => {
          try {
            const dvmResult = await requestDvmAnalyticsWithFallback({
              targetPubkey: hexPubkey,
              category: "zap-analytics",
              timeoutMs: 2500,
            });
            return {
              satsZapped: dvmResult.totalSats,
              zapCount: dvmResult.zapCount,
              source: dvmResult.source,
            };
          } catch {
            return null;
          }
        })(),

        // Step C: Fetch Kind 3 (Contact List / Follows) directly via major WebSocket relays
        (async () => {
          const edges: {
            source_pubkey: string;
            target_pubkey: string;
            weight: number;
            kind: "follow";
          }[] = [];

          try {
            let k3Tags: string[][] | null = null;

            // Query major WebSocket relays for Kind 3
            const timeout = new Promise<any>((resolve) => setTimeout(() => resolve(null), 3000));
            const query = pool.get(MAJOR_INDEXER_RELAYS, {
              kinds: [3],
              authors: [hexPubkey],
            });
            const event = await Promise.race([query, timeout]);

            if (event && Array.isArray(event.tags)) {
              k3Tags = event.tags;
            }

            if (k3Tags) {
              const seen = new Set<string>();
              for (const tag of k3Tags) {
                if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
                  const target = tag[1].toLowerCase();
                  if (!seen.has(target)) {
                    seen.add(target);
                    edges.push({
                      source_pubkey: hexPubkey,
                      target_pubkey: target,
                      weight: 1.0,
                      kind: "follow",
                    });
                    if (edges.length >= 250) break; // Cap at 250 follows to keep DB fast
                  }
                }
              }
            }
          } catch (err) {
            console.debug("[Discovery] Kind 3 follows query error:", err);
          }
          return edges;
        })(),

        // Step D: Fetch Kind 9735 (Zap Receipts)
        (async () => {
          const edges: {
            source_pubkey: string;
            target_pubkey: string;
            weight: number;
            kind: "zap";
          }[] = [];

          try {
            const timeout = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3000));
            const query = pool.querySync(DEFAULT_RELAYS, {
              kinds: [9735],
              "#p": [hexPubkey],
              limit: 25,
            });
            const events = await Promise.race([query, timeout]);

            if (Array.isArray(events)) {
              for (const ev of events) {
                let sender = ev.pubkey?.toLowerCase();
                for (const tag of ev.tags || []) {
                  if (tag[0] === "description" && tag[1]) {
                    try {
                      const desc = JSON.parse(tag[1]);
                      if (desc.pubkey && /^[0-9a-fA-F]{64}$/.test(desc.pubkey)) {
                        sender = desc.pubkey.toLowerCase();
                      }
                    } catch {}
                  }
                }
                if (sender && sender !== hexPubkey) {
                  edges.push({
                    source_pubkey: sender,
                    target_pubkey: hexPubkey,
                    weight: 1.0,
                    kind: "zap",
                  });
                }
              }
            }
          } catch (err) {
            console.debug("[Discovery] Kind 9735 zaps query error:", err);
          }
          return edges;
        })(),
      ]);

      // 5. Construct Profile Object
      const profile: NostrProfile = (rawProfile.status === "fulfilled" && rawProfile.value) || {
        pubkey: hexPubkey,
        npub: encodedNpub,
        name: `anon_${hexPubkey.slice(0, 6)}`,
        displayName: `Nostr User (${encodedNpub.slice(0, 8)}...)`,
        about: "Newly discovered Nostr identity.",
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedNpub}`,
        created_at: now,
        relays_connected: DEFAULT_RELAYS.length,
      };

      // 6. Verify NIP-05 DNS & calculate Trust Score
      const nip05Result = await verifyNip05(profile.nip05, profile.pubkey);
      const trustData = await calculateTrustScoreAsync(profile, nip05Result);

      // 7. Calculate Sats and Zap Totals
      const stats = primalStats.status === "fulfilled" ? primalStats.value : null;
      const totalSats = stats?.satsZapped ?? 0;
      const validSenderSats = Math.round(totalSats * 0.9);

      // Save Zap Totals
      await upsertZapTotals({
        pubkey: hexPubkey,
        total_sats: totalSats,
        valid_sender_sats: validSenderSats,
      });

      // 8. Save Graph Edges into trust_edges
      const follows = followEdges.status === "fulfilled" ? followEdges.value : [];
      const zaps = zapEdges.status === "fulfilled" ? zapEdges.value : [];

      if (follows.length > 0) {
        await upsertTrustEdges(follows);
      }
      if (zaps.length > 0) {
        await upsertTrustEdges(zaps);
      }

      // 9. Format display strings and save into creators table
      const zapsFormatted = totalSats > 0 ? formatSats(totalSats) : "0 Sats";
      const metadataJson = JSON.stringify({
        name: profile.displayName || profile.name || `Nostr User`,
        displayName: profile.displayName || profile.name || `Nostr User`,
        handle: profile.name || encodedNpub.slice(0, 10),
        picture: profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedNpub}`,
        banner: profile.banner || "",
        about: profile.about || "",
        nip05: profile.nip05 || "",
        lud16: profile.lud16 || profile.lud06 || "",
        website: profile.website || "",
        zapsReceived: zapsFormatted,
        total_sats: totalSats,
        score: trustData.score,
      });

      await upsertCreator({
        pubkey: hexPubkey,
        npub: encodedNpub,
        nip05: profile.nip05 || null,
        lud16: profile.lud16 || profile.lud06 || null,
        metadata_json: metadataJson,
        trust_score: trustData.score,
        last_synced: now,
      });

      const creatorObj: Creator = {
        pubkey: hexPubkey,
        npub: encodedNpub,
        name: profile.displayName || profile.name || `Nostr User`,
        handle: profile.name || encodedNpub.slice(0, 10),
        score: trustData.score,
        zapsReceived: zapsFormatted,
        picture: profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedNpub}`,
        nip05: profile.nip05 || undefined,
        about: profile.about || undefined,
        lud16: profile.lud16 || profile.lud06 || undefined,
      };

      console.log(
        `[Discovery] Successfully discovered & saved ${creatorObj.name} (@${creatorObj.handle}) with ${follows.length} follows & ${zaps.length} zap edges.`
      );

      return {
        success: true,
        creator: creatorObj,
        hexPubkey,
        npub: encodedNpub,
        isNew: !existingCreator,
        edgesCrawled: {
          follows: follows.length,
          zaps: zaps.length,
        },
      };
    } catch (err: any) {
      console.error("[Discovery] Error during creator crawl:", err);
      return {
        success: false,
        creator: null,
        hexPubkey,
        npub: encodedNpub,
        error: err?.message || "Internal crawl error",
      };
    } finally {
      activeCrawlJobs.delete(hexPubkey);
    }
  })();

  activeCrawlJobs.set(hexPubkey, crawlPromise);
  return crawlPromise;
}
