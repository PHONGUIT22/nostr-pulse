// scripts/build-ring1-cache.mjs
/**
 * Ring-1 Web-of-Trust (WoT) Snapshot Builder
 *
 * Reads Root Anchors from src/lib/anchors.ts.
 * Queries Kind 3 (Contact List) events from primary Nostr relays.
 * Computes accumulated Ring-1 trust scores:
 *   Ring1Score(target) = sum(W_anchor for anchor in FollowingAnchors)
 * Persists snapshot cache to src/data/ring1-cache.json and src/lib/ring1-cache.json.
 */

import { SimplePool } from "nostr-tools/pool";
import fs from "fs";
import path from "path";

const RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
];

const TIMEOUT_MS = 5000;

/**
 * Load Root Anchors metadata from src/lib/anchors.ts
 */
function loadAnchors() {
  const anchorsTsPath = path.resolve("src/lib/anchors.ts");
  if (!fs.existsSync(anchorsTsPath)) {
    throw new Error(`Cannot find anchors registry at: ${anchorsTsPath}`);
  }

  const code = fs.readFileSync(anchorsTsPath, "utf8");
  const blockRegex = /\{\s*pubkey:\s*"([0-9a-fA-F]{64})",\s*name:\s*"([^"]+)",\s*tier:\s*"([^"]+)",\s*weight:\s*([0-9.]+),\s*note:\s*"([^"]*)"/g;
  
  const anchors = [];
  let match;
  while ((match = blockRegex.exec(code)) !== null) {
    anchors.push({
      pubkey: match[1].toLowerCase(),
      name: match[2],
      tier: match[3],
      weight: parseFloat(match[4]),
      note: match[5],
    });
  }

  if (anchors.length === 0) {
    throw new Error("Failed to parse any anchors from src/lib/anchors.ts");
  }

  return anchors;
}

async function buildRing1Cache() {
  console.log("===============================================================================");
  console.log("  NOSTRPULSE WoT - RING-1 SNAPSHOT CACHE BUILDER");
  console.log("===============================================================================");
  
  // 1. Read Root Anchors
  const rootAnchors = loadAnchors();
  const anchorMap = new Map(rootAnchors.map((a) => [a.pubkey, a]));
  const anchorPubkeys = rootAnchors.map((a) => a.pubkey);

  console.log(`Loaded ${rootAnchors.length} Root Anchors from src/lib/anchors.ts.`);
  console.log(`Querying ${RELAYS.length} relays with ${TIMEOUT_MS / 1000}s timeout:`);
  RELAYS.forEach((r) => console.log(`  - ${r}`));
  console.log("");

  const pool = new SimplePool();

  try {
    // 2. Fetch Kind 3 Contact Lists in batch with timeout
    console.log(`[1/3] Fetching Kind 3 contact list events from relays (timeout: ${TIMEOUT_MS / 1000}s)...`);
    const latestKind3ByAuthor = new Map();

    try {
      const events = await pool.querySync(
        RELAYS,
        { kinds: [3], authors: anchorPubkeys },
        { timeout: TIMEOUT_MS }
      );

      for (const ev of events) {
        if (!ev || !ev.pubkey || !Array.isArray(ev.tags)) continue;
        const author = ev.pubkey.toLowerCase();
        const existing = latestKind3ByAuthor.get(author);

        if (!existing || ev.created_at > existing.created_at) {
          latestKind3ByAuthor.set(author, ev);
        }
      }
    } catch (err) {
      console.warn("  Batch querySync warning:", err.message);
    }

    // Fallback: If any anchors were missed in batch querySync, query them individually
    const missingAnchors = anchorPubkeys.filter((p) => !latestKind3ByAuthor.has(p));
    if (missingAnchors.length > 0) {
      console.log(`  Querying ${missingAnchors.length} remaining anchors individually...`);
      for (const missingPubkey of missingAnchors) {
        const anchor = anchorMap.get(missingPubkey);
        try {
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
          const ev = await Promise.race([
            pool.get(RELAYS, { kinds: [3], authors: [missingPubkey] }),
            timeoutPromise,
          ]);
          if (ev && Array.isArray(ev.tags)) {
            latestKind3ByAuthor.set(missingPubkey, ev);
            console.log(`    + Retrieved ${anchor?.name || missingPubkey.slice(0, 10)} (${ev.tags.filter((t) => t[0] === "p").length} follows)`);
          }
        } catch {
          // Ignore individual timeout
        }
      }
    }

    console.log(`  Retrieved latest Kind 3 events for ${latestKind3ByAuthor.size} / ${anchorPubkeys.length} Root Anchors.`);
    console.log("");

    // 3. Process each Kind 3 event and accumulate Ring 1 scores
    console.log("[2/3] Processing contact list graph and calculating accumulated Ring-1 scores...");
    
    // Map: targetPubkey -> { score: number, endorsedByCount: number, endorsedBy: string[], endorsedByNames: string[] }
    const ring1Map = new Map();
    const rootPubkeysSet = new Set(anchorPubkeys);

    for (const [authorPubkey, ev] of latestKind3ByAuthor.entries()) {
      const anchor = anchorMap.get(authorPubkey);
      if (!anchor) continue;

      const weight = anchor.weight;
      const followedPubkeysInEvent = new Set();

      for (const tag of ev.tags) {
        if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
          const targetPubkey = tag[1].toLowerCase();

          // Exclude self-follows and follows targeting other Root Anchors
          if (targetPubkey === authorPubkey || rootPubkeysSet.has(targetPubkey)) {
            continue;
          }

          followedPubkeysInEvent.add(targetPubkey);
        }
      }

      for (const targetPubkey of followedPubkeysInEvent) {
        if (!ring1Map.has(targetPubkey)) {
          ring1Map.set(targetPubkey, {
            score: 0,
            endorsedByCount: 0,
            endorsedBy: [],
            endorsedByNames: [],
          });
        }

        const record = ring1Map.get(targetPubkey);
        record.score += weight;
        record.endorsedByCount += 1;
        record.endorsedBy.push(authorPubkey);
        record.endorsedByNames.push(anchor.name);
      }

      console.log(`  Processed ${anchor.name.padEnd(16)} (Weight: ${weight.toFixed(2)}) -> ${followedPubkeysInEvent.size} follows`);
    }

    console.log("");
    console.log(`Total unique Verified Ring-1 Pubkeys discovered: ${ring1Map.size}`);
    console.log("");

    // Round scores and optimize payload to stay well below 1.5MB limit
    const ring1Serialized = {};
    for (const [pubkey, data] of ring1Map.entries()) {
      ring1Serialized[pubkey] = {
        score: Math.round(data.score * 1000) / 1000,
        count: data.endorsedByCount,
        anchors: data.endorsedByNames,
      };
    }

    // 4. Persistence to JSON snapshots
    console.log("[3/3] Saving snapshot cache to disk (optimized for < 1.5MB cold-start)...");
    const payload = {
      version: 2,
      generatedAt: new Date().toISOString(),
      totalAnchorsConfigured: rootAnchors.length,
      anchorsResolved: latestKind3ByAuthor.size,
      totalRing1Nodes: ring1Map.size,
      ring1: ring1Serialized,
    };

    const serializedPayload = JSON.stringify(payload, null, 2);

    // Save to src/data/ring1-cache.json
    const dataDir = path.resolve("src/data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dataCachePath = path.join(dataDir, "ring1-cache.json");
    fs.writeFileSync(dataCachePath, serializedPayload, "utf8");
    console.log(`  Saved: ${dataCachePath} (${(Buffer.byteLength(serializedPayload) / 1024).toFixed(1)} KB)`);

    // Also save to src/lib/ring1-cache.json for direct import convenience
    const libCachePath = path.resolve("src/lib/ring1-cache.json");
    fs.writeFileSync(libCachePath, serializedPayload, "utf8");
    console.log(`  Saved: ${libCachePath} (${(Buffer.byteLength(serializedPayload) / 1024).toFixed(1)} KB)`);

    // 5. Summary Statistics & Top Endorsed Nodes
    const sortedEntries = Array.from(ring1Map.entries())
      .map(([pubkey, data]) => ({
        pubkey,
        score: Math.round(data.score * 1000) / 1000,
        endorsedByCount: data.endorsedByCount,
        endorsedByNames: data.endorsedByNames,
      }))
      .sort((a, b) => b.score - a.score);

    console.log("\n===============================================================================");
    console.log("  RING-1 SNAPSHOT SUMMARY REPORT");
    console.log("===============================================================================");
    console.log(`Total Anchors Configured:   ${rootAnchors.length}`);
    console.log(`Anchors Successfully Read: ${latestKind3ByAuthor.size}`);
    console.log(`Total Ring-1 Verified Keys: ${ring1Map.size}`);
    console.log("Endorsement Distribution:");
    console.log(`  - Followed by >= 5 Anchors: ${sortedEntries.filter((e) => e.endorsedByCount >= 5).length}`);
    console.log(`  - Followed by >= 3 Anchors: ${sortedEntries.filter((e) => e.endorsedByCount >= 3).length}`);
    console.log(`  - Followed by >= 2 Anchors: ${sortedEntries.filter((e) => e.endorsedByCount >= 2).length}`);
    console.log(`  - Followed by 1 Anchor:     ${sortedEntries.filter((e) => e.endorsedByCount === 1).length}`);
    console.log("-------------------------------------------------------------------------------");
    console.log("Top 10 Highest-Scoring Ring-1 Nodes:");
    sortedEntries.slice(0, 10).forEach((entry, idx) => {
      console.log(
        `  ${(idx + 1).toString().padStart(2)}. ${entry.pubkey.slice(0, 12)}... | Score: ${entry.score
          .toFixed(3)
          .padStart(6)} | Endorsed by ${entry.endorsedByCount} anchors: [${entry.endorsedByNames.slice(0, 3).join(", ")}${
          entry.endorsedByNames.length > 3 ? "..." : ""
        }]`
      );
    });
    console.log("===============================================================================\n");

  } catch (err) {
    console.error("Error during buildRing1Cache:", err);
  } finally {
    try {
      pool.close(RELAYS);
    } catch {
      // Ignore pool close errors
    }
  }
}

buildRing1Cache();
