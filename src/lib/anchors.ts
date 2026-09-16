// src/lib/anchors.ts

/**
 * Valid classification tiers for Nostr Web-of-Trust (WoT) Root Anchors.
 */
export type AnchorTier = "core" | "client" | "infra" | "ecosystem";

/**
 * Interface representing a trusted Root Anchor node in the Weighted Trust Graph.
 */
export interface RootAnchor {
  /** 64-character lowercase hex public key */
  pubkey: string;
  /** Display name or alias of the anchor entity */
  name: string;
  /** Functional tier categorization */
  tier: AnchorTier;
  /** Trust graph weight multiplier ranging from 0.0 to 1.0 */
  weight: number;
  /** Contextual note describing role and contributions */
  note: string;
}

/**
 * Initial registry of curated Root Anchors across 4 weighted tiers:
 * - Tier 1: Core Protocol creators & fundamental NIP authors (Weight: 1.0)
 * - Tier 2: Primary Client developers & platform architects (Weight: 0.9)
 * - Tier 3: Cashu, Lightning, and relay infrastructure engineers (Weight: 0.85)
 * - Tier 4: Ecosystem Key Opinion Leaders & content creators (Weight: 0.7)
 */
export const ROOT_ANCHORS: RootAnchor[] = [
  // =========================================================================
  // Tier 1: Core Protocol (Weight 1.0)
  // =========================================================================
  {
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    name: "fiatjaf",
    tier: "core",
    weight: 1.0,
    note: "Nostr protocol creator and core specification author",
  },
  {
    pubkey: "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
    name: "jb55",
    tier: "core",
    weight: 1.0,
    note: "Damus creator, early protocol co-designer, npub/zap pioneer",
  },
  {
    pubkey: "00000000827ffaa94bfea288c3dfce4422c794fbb96625b6b31e9049f729d700",
    name: "cameri",
    tier: "core",
    weight: 1.0,
    note: "nostr.land relay operator and core infrastructure maintainer",
  },
  {
    pubkey: "35d26e4690cbe1a898af61cc3515661eb5fa763b57bd0b42e45099c8b32fd50f",
    name: "scsibug",
    tier: "core",
    weight: 1.0,
    note: "nostr-rs-relay author and high-performance relay pioneer",
  },
  {
    pubkey: "04c842b19420455629230da6ae20037a1d86e20eb2d161082622aa4ab9209181",
    name: "mikedilger",
    tier: "core",
    weight: 1.0,
    note: "Gossip client developer and NIP consensus contributor",
  },

  // =========================================================================
  // Tier 2: Client Devs (Weight 0.9)
  // =========================================================================
  {
    pubkey: "460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c",
    name: "Vitor Pamplona",
    tier: "client",
    weight: 0.9,
    note: "Amethyst client lead and Android ecosystem architect",
  },
  {
    pubkey: "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
    name: "Kieran",
    tier: "client",
    weight: 0.9,
    note: "Snort client creator and web client pioneer",
  },
  {
    pubkey: "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
    name: "hodlbod",
    tier: "client",
    weight: 0.9,
    note: "Coracle client creator and Web-of-Trust researcher",
  },
  {
    pubkey: "d61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a",
    name: "miljan",
    tier: "client",
    weight: 0.9,
    note: "Primal client and caching infrastructure lead",
  },
  {
    pubkey: "3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24",
    name: "Derek Ross",
    tier: "client",
    weight: 0.9,
    note: "NostrNests creator and developer relations advocate",
  },

  // =========================================================================
  // Tier 3: Cashu & Lightning Infra (Weight 0.85)
  // =========================================================================
  {
    pubkey: "50d94fc2d8580c682b071a542f8b1e31a200b0508bab95a33bef0855df281d63",
    name: "calle",
    tier: "infra",
    weight: 0.85,
    note: "Cashu eCash protocol founder and core developer",
  },
  {
    pubkey: "91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832",
    name: "UNCLE ROCKSTAR",
    tier: "infra",
    weight: 0.85,
    note: "BTCPay Server core maintainer and Bitcoin infrastructure builder",
  },
  {
    pubkey: "e1ff3bfdd4e40315959b08b4fcc8245eaa514637e1d4ec2ae166b743341be1af",
    name: "benthecarman",
    tier: "infra",
    weight: 0.85,
    note: "Bitcoin/Lightning developer and Nostr toolchain contributor",
  },
  {
    pubkey: "c1aa0a2f0e1211dd3c46e285d64a411aca4f250bd372a0e85b98f7d6d03c9251",
    name: "motorina",
    tier: "infra",
    weight: 0.85,
    note: "Spring relay and nostr protocol infrastructure developer",
  },
  {
    pubkey: "c4eabae1be3cf657bc1855ee05e69de9f059cb7a059227168b80b89761cbc4e0",
    name: "jack mallers",
    tier: "infra",
    weight: 0.85,
    note: "Strike CEO and global Lightning payment network architect",
  },

  // =========================================================================
  // Tier 4: Ecosystem Key Opinion Leaders (Weight 0.7)
  // =========================================================================
  {
    pubkey: "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
    name: "jack",
    tier: "ecosystem",
    weight: 0.7,
    note: "Block head, early Nostr funder and ecosystem champion",
  },
  {
    pubkey: "04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9",
    name: "ODELL",
    tier: "ecosystem",
    weight: 0.7,
    note: "Open-source funder, freedom tech advocate, and podcast host",
  },
  {
    pubkey: "6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93",
    name: "Gigi",
    tier: "ecosystem",
    weight: 0.7,
    note: "Author of 21 Lessons, Bitcoin philosopher and educator",
  },
  {
    pubkey: "eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f",
    name: "Lyn Alden",
    tier: "ecosystem",
    weight: 0.7,
    note: "Macroeconomist, author of Broken Money and tech advocate",
  },
  {
    pubkey: "c49d52a573366792b9a6e4851587c28042fb24fa5625c6d67b8c95c8751aca15",
    name: "hodlonaut",
    tier: "ecosystem",
    weight: 0.7,
    note: "Bitcoin icon, Citadel21 editor and community defender",
  },
  {
    pubkey: "85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204",
    name: "preston",
    tier: "ecosystem",
    weight: 0.7,
    note: "Financial analyst, podcast host and Bitcoin investor",
  },
  {
    pubkey: "c48e29f04b482cc01ca1f9ef8c86ef8318c059e0e9353235162f080f26e14c11",
    name: "walker",
    tier: "ecosystem",
    weight: 0.7,
    note: "Bitcoin podcast host, media creator and Nostr builder",
  },
];

/**
 * Array of 64-character lowercase hex public keys for all configured Root Anchors.
 */
export const ANCHOR_PUBKEYS: string[] = ROOT_ANCHORS.map((anchor) => anchor.pubkey.toLowerCase());

/**
 * In-memory map of Root Anchors indexed by lowercase hex public key for O(1) lookups.
 */
const ANCHORS_BY_PUBKEY = new Map<string, RootAnchor>(
  ROOT_ANCHORS.map((anchor) => [anchor.pubkey.toLowerCase(), anchor])
);

/**
 * Checks whether a given public key belongs to the Root Anchors registry.
 *
 * @param pubkey - 64-character hex public key to check
 * @returns boolean true if pubkey is a recognized Root Anchor
 */
export function isRootAnchor(pubkey: string): boolean {
  if (!pubkey) return false;
  return ANCHORS_BY_PUBKEY.has(pubkey.toLowerCase().trim());
}

/**
 * Retrieves the trust graph weight multiplier of a Root Anchor.
 * Returns 0 if the public key is not registered as a Root Anchor.
 *
 * @param pubkey - 64-character hex public key
 * @returns number weight between 0.0 and 1.0
 */
export function getAnchorWeight(pubkey: string): number {
  if (!pubkey) return 0;
  const anchor = ANCHORS_BY_PUBKEY.get(pubkey.toLowerCase().trim());
  return anchor ? anchor.weight : 0;
}

/**
 * Retrieves the full RootAnchor object for a given public key if registered.
 *
 * @param pubkey - 64-character hex public key
 * @returns RootAnchor object or undefined
 */
export function getRootAnchor(pubkey: string): RootAnchor | undefined {
  if (!pubkey) return undefined;
  return ANCHORS_BY_PUBKEY.get(pubkey.toLowerCase().trim());
}
