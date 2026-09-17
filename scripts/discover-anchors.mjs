// scripts/discover-anchors.mjs
/**
 * Automated Root Anchor Discovery Tool via Kind 3 (Contact List) Graph Intersection
 *
 * Queries Nostr Kind 3 contact lists for Supreme Core Nodes:
 * - fiatjaf (protocol creator)
 * - jb55 (Damus creator)
 * - Vitor Pamplona (Amethyst creator)
 *
 * Computes graph intersection to identify high-reputation builders followed by >= 2 core nodes.
 * Outputs a formatted candidate report ready for review and integration into src/lib/anchors.ts.
 */

import { SimplePool } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
import fs from "fs";
import path from "path";

const RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
];

const CORE_NODES = [
  {
    name: "fiatjaf",
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  },
  {
    name: "jb55",
    pubkey: "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
  },
  {
    name: "Vitor Pamplona",
    pubkey: "460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c",
  },
];

const CORE_PUBKEYS = new Set(CORE_NODES.map((n) => n.pubkey.toLowerCase()));

// Load existing root anchors from src/lib/anchors.ts for comparison
function loadExistingAnchors() {
  const anchorsMap = new Map();
  try {
    const anchorsTsPath = path.resolve("src/lib/anchors.ts");
    if (fs.existsSync(anchorsTsPath)) {
      const code = fs.readFileSync(anchorsTsPath, "utf8");
      const blockRegex = /\{\s*pubkey:\s*"([0-9a-fA-F]{64})",\s*name:\s*"([^"]+)",\s*tier:\s*"([^"]+)",\s*weight:\s*([0-9.]+),\s*note:\s*"([^"]*)"/g;
      let match;
      while ((match = blockRegex.exec(code)) !== null) {
        const anchor = {
          pubkey: match[1].toLowerCase(),
          name: match[2],
          tier: match[3],
          weight: parseFloat(match[4]),
          note: match[5],
        };
        anchorsMap.set(anchor.pubkey, anchor);
      }
    }
  } catch (err) {
    console.warn("Could not parse existing anchors from src/lib/anchors.ts:", err.message);
  }
  return anchorsMap;
}

const EXISTING_ANCHORS_MAP = loadExistingAnchors();

async function discoverAnchors() {
  console.log("===============================================================================");
  console.log("  NOSTRPULSE WoT - AUTOMATED ROOT ANCHOR DISCOVERY (GRAPH INTERSECTION)");
  console.log("===============================================================================");
  console.log(`Connecting to ${RELAYS.length} high-performance relays:`);
  RELAYS.forEach((r) => console.log(`  - ${r}`));
  console.log("");

  const pool = new SimplePool();

  try {
    // 1. Fetch Kind 3 events for all core nodes
    console.log("[1/3] Fetching Kind 3 (Contact List) events for supreme core nodes...");
    const coreContactsMap = new Map();

    for (const node of CORE_NODES) {
      process.stdout.write(`  Querying Kind 3 for ${node.name} (${node.pubkey.slice(0, 10)}...)... `);
      
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
      const fetchPromise = pool.get(RELAYS, {
        kinds: [3],
        authors: [node.pubkey],
      });

      const event = await Promise.race([fetchPromise, timeoutPromise]);

      if (event && Array.isArray(event.tags)) {
        const follows = new Set();
        for (const tag of event.tags) {
          if (tag[0] === "p" && tag[1] && /^[0-9a-fA-F]{64}$/.test(tag[1])) {
            follows.add(tag[1].toLowerCase());
          }
        }
        coreContactsMap.set(node.pubkey.toLowerCase(), {
          node,
          follows,
        });
        console.log(`OK (${follows.size} followed accounts)`);
      } else {
        console.log(`FAILED / TIMED OUT (0 follows)`);
        coreContactsMap.set(node.pubkey.toLowerCase(), {
          node,
          follows: new Set(),
        });
      }
    }

    console.log("");

    // 2. Compute Graph Intersection across core nodes
    console.log("[2/3] Executing graph intersection algorithm...");
    const followOccurrences = new Map();

    for (const [corePubkey, { node, follows }] of coreContactsMap.entries()) {
      for (const targetPubkey of follows) {
        // Exclude the 3 supreme core nodes themselves
        if (CORE_PUBKEYS.has(targetPubkey)) continue;

        if (!followOccurrences.has(targetPubkey)) {
          followOccurrences.set(targetPubkey, {
            pubkey: targetPubkey,
            count: 0,
            followedBy: [],
          });
        }

        const record = followOccurrences.get(targetPubkey);
        record.count += 1;
        record.followedBy.push(node.name);
      }
    }

    // Filter candidates followed by >= 2 core nodes
    const qualifiedCandidates = Array.from(followOccurrences.values())
      .filter((candidate) => candidate.count >= 2)
      .sort((a, b) => b.count - a.count);

    console.log(`  - Total unique pubkeys in combined follow graph: ${followOccurrences.size}`);
    console.log(`  - Qualified candidate builders (followed by >= 2 core nodes): ${qualifiedCandidates.length}`);
    console.log("");

    // 3. Resolve Profile Metadata (Kind 0) for Candidates
    console.log(`[3/3] Resolving profile metadata for top ${Math.min(qualifiedCandidates.length, 100)} candidates...`);
    const candidatePubkeys = qualifiedCandidates.slice(0, 100).map((c) => c.pubkey);
    const profileMap = new Map();

    // Check local creators.json first
    try {
      const creatorsPath = path.resolve("src/lib/creators.json");
      if (fs.existsSync(creatorsPath)) {
        const creators = JSON.parse(fs.readFileSync(creatorsPath, "utf8"));
        for (const c of creators) {
          if (c.pubkey) {
            profileMap.set(c.pubkey.toLowerCase(), {
              name: c.name,
              display_name: c.handle,
              nip05: c.nip05,
              about: c.about,
            });
          }
        }
      }
    } catch {
      // Ignore local read errors
    }

    // Batch resolve remaining profiles via Primal API
    const unresolvedPubkeys = candidatePubkeys.filter((p) => !profileMap.has(p));
    if (unresolvedPubkeys.length > 0) {
      try {
        const res = await fetch("https://primal.net/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(["user_infos", { pubkeys: unresolvedPubkeys }]),
        });
        if (res.ok) {
          const events = await res.json();
          for (const ev of events) {
            if (ev.kind === 0 && ev.content) {
              try {
                const parsed = JSON.parse(ev.content);
                profileMap.set(ev.pubkey.toLowerCase(), parsed);
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        console.warn("  Primal metadata fallback warning:", err.message);
      }
    }

    console.log(`  Successfully resolved metadata for ${profileMap.size} candidates.`);

    console.log("");

    // 4. Construct Final Review Payload
    const reportList = qualifiedCandidates.map((candidate) => {
      let npub = "";
      try {
        npub = nip19.npubEncode(candidate.pubkey);
      } catch {
        npub = candidate.pubkey;
      }

      const existingAnchor = EXISTING_ANCHORS_MAP.get(candidate.pubkey);
      const meta = profileMap.get(candidate.pubkey) || {};
      const name = existingAnchor?.name || meta.name || meta.display_name || "Unknown";
      const nip05 = meta.nip05 || "";
      const about = meta.about ? meta.about.slice(0, 100).replace(/[\r\n]+/g, " ") : "";

      let suggestedTier = "ecosystem";
      if (candidate.count === 3) {
        suggestedTier = "client";
      }

      return {
        pubkey: candidate.pubkey,
        npub,
        name,
        nip05: nip05 || undefined,
        about: about || undefined,
        intersectionCount: candidate.count,
        followedBy: candidate.followedBy,
        alreadyInAnchors: Boolean(existingAnchor),
        currentTier: existingAnchor ? existingAnchor.tier : undefined,
        suggestedTier: existingAnchor ? existingAnchor.tier : suggestedTier,
        weight: existingAnchor
          ? existingAnchor.weight
          : candidate.count === 3
          ? 0.9
          : 0.85,
        note: existingAnchor
          ? existingAnchor.note
          : `Auto-discovered: followed by ${candidate.followedBy.join(", ")}`,
      };
    });

    const newCandidates = reportList.filter((r) => !r.alreadyInAnchors);
    const existingCount = reportList.filter((r) => r.alreadyInAnchors).length;

    console.log("===============================================================================");
    console.log("  DISCOVERY SUMMARY REPORT");
    console.log("===============================================================================");
    console.log(`Total Candidates with >= 2 Core Follows: ${reportList.length}`);
    console.log(`  - 3/3 Core Nodes Intersection:         ${reportList.filter((r) => r.intersectionCount === 3).length}`);
    console.log(`  - 2/3 Core Nodes Intersection:         ${reportList.filter((r) => r.intersectionCount === 2).length}`);
    console.log(`  - Already in ROOT_ANCHORS:             ${existingCount}`);
    console.log(`  - New Potential Root Anchors to add:   ${newCandidates.length}`);
    console.log("===============================================================================\n");

    console.log("CANDIDATES READY FOR REVIEW & INTEGRATION (JSON):");
    console.log(JSON.stringify(newCandidates, null, 2));

  } catch (err) {
    console.error("Error during anchor discovery:", err);
  } finally {
    try {
      pool.close(RELAYS);
    } catch {
      // Ignore pool close errors
    }
  }
}

discoverAnchors();
