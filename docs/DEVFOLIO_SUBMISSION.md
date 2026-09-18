# Devfolio Submission Draft - NostrPulse

## Field 1: The problem it solves
Decentralized protocols like Nostr eliminate deplatforming, but introduce two fatal bottlenecks:

1. Identity is computationally free (Sybil Flood): Anyone can spin up 10,000 Nostr keypairs (npub) in seconds for zero sats. Scammers clone creator bios, scrape avatars, and spam relays with impersonation profiles. KYC destroys privacy, while running live multi-hop graph crawlers client-side freezes mobile browsers.
2. Lightning tipping requires synchronous presence: Standard Zaps (NIP-57) fail if a creator's phone sleeps, node loses power, or inbound liquidity runs out. Meanwhile, existing Cashu eCash (NIP-61) tooling lacked a receiver web interface for creators to claim incoming bearer tokens.

NostrPulse resolves both failures through local graph verification, Sats-weighted stake, and asynchronous Chaumian eCash:

- 4-Tier Web-of-Trust Engine (sub-3ms lookup): Scores identity depth using proximity to 21 curated ecosystem Root Anchors (fiatjaf, jb55, jack, cameri). Hop 1 utilizes an in-memory snapshot of 5,544 Ring-1 nodes (O(1) lookups), while Hop 2 leverages transitive trust gossip.
- Sats-Weighted In-Degree (Economic Stake): Analyzes Kind 9735 Zap receipts with strict anti-wash trading (self-zaps discarded) and Sybil filtering (ignoring zaps from isolated bots with WoT = 0). Points scale logarithmically with a 20-point baseline for verified Lightning addresses.
- Strict 25-Point Gatekeeper: Accounts with zero graph connection and zero verified WoT sats are hard-clamped to maximum 25/100 (Unverified / Potential Bot), making metadata gaming futile.
- Two-Way Chaumian eCash NutZaps (NIP-61): Sats travel asynchronously as encrypted bearer proofs (Kind 9321). In the NutZap Inbox, creators decrypt payloads via NIP-44 v2 and swap proofs with the Mint in 1 click.
- Open Adoption: Zero-dependency standalone embeddable NutZap widget (public/widget.js) and public CORS-enabled REST API (/api/v1/trust-score/[pubkey]).

---

## Field 2: Challenges I ran into
The hardest challenges came from broken protocol assumptions between Nostr, Cashu, and browser runtimes:

1. The 16-Hex vs 66-Hex Keyset ID Mismatch: When claiming incoming Cashu V4 tokens, mint nodes returned "MintOperationError: Inputs: 0, Outputs: 0". Cashu V4 CBOR tokens (cashuB) truncate keyset IDs to 16 hex characters for compact QRs, but mint backends and SDKs validate against full 66-hex IDs, dropping truncated proofs. I built an in-memory auto-expansion pipeline in claimNutZapToken(): it fetches /v1/keysets from the mint, matches prefixes, normalizes proof IDs, and feeds canonical tokens into the wallet. Swaps now settle consistently under 800ms.
2. Zero-Dependency RFC 8949 CBOR Decoder: npm CBOR parsers pull heavy Node.js Buffer polyfills, bloating bundles and throwing ReferenceErrors in web workers. Handling bearer money via untrusted shims also risks supply-chain attacks. I implemented an RFC 8949 binary CBOR decoder from scratch in pure TypeScript (decodeCbor()). Operating directly on native Uint8Array with bitwise shifts, it weighs ~80 lines of code, adds zero npm dependencies, and parses V4 tokens in sub-milliseconds.
3. Eliminating Relay Front-Running: Cashu proofs are bearer assets—anyone knowing the secret owns the sats. Plaintext broadcasts on open relays allow malicious relay operators to steal proofs. NostrPulse enforces mandatory NIP-44 v2 payload encryption for Kind 9321 NutZaps via ephemeral secp256k1 ECDH keys, ensuring tokens never touch relay memory in plaintext.
4. Client-Side Graph Freezes: Live graph traversal across 21 root anchors spawned 50+ WebSocket subscriptions, freezing browser threads. I decoupled graph math into an offline script generating ring1-cache.json (5,544 nodes), enabling sub-3ms O(1) in-memory lookups.
5. Fail-Closed NUT-07 Double-Spend Defense: Replayed tokens initially confused optimistic UI states. I re-architected verifyTokenWithMint() to fail closed with a 4s timeout, gracefully rendering an educational "Double-Spend Protection Active (NUT-07 SPENT)" status.
