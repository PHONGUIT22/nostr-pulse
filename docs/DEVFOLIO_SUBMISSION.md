# NostrPulse: Decentralized Reputation Engine & Cashu eCash NutZaps

**Track:** Freedom Stack (BOSS Battle - Bitshala)  
**Live App:** [https://nostrpulse.vercel.app](https://nostrpulse.vercel.app)  
**Repository:** [https://github.com/PHONGUIT22/nostr-pulse](https://github.com/PHONGUIT22/nostr-pulse)  

---

### The problem NostrPulse solves

Twitter charges $8 a month for a blue checkmark, backed by a corporate database that can suspend any account at will. Nostr fixes the deplatforming vulnerability by making identity a cryptographic keypair (`npub` / `nsec`).

However, that design introduced two protocol bottlenecks:

1. **Identity is computationally free:** Anyone can generate 10,000 Nostr keypairs in seconds for zero satoshis. Scammers clone creator bios, scrape avatars, and spam relays with impersonation profiles. Traditional KYC ruins anonymity and privacy; on the other hand, naive client-side Web-of-Trust graph crawlers freeze the browser thread when traversing multi-hop follow lists.
2. **Lightning tipping is fragile:** Standard Lightning Zaps (NIP-57) require synchronous coordination. If a creator's phone goes to sleep, their node goes offline, or their routing channels lack inbound liquidity, the payment fails immediately. Fans attempting to send 100 sats hit routing timeouts and dropped invoices.

NostrPulse resolves both failures through local graph verification, Sats-weighted economic stake analysis, and asynchronous Chaumian eCash:

- **4-Tier Web-of-Trust Graph Engine:** Instead of trusting superficial profile metadata, NostrPulse scores identity depth using network proximity to 12 curated ecosystem root anchors (Fiatjaf, Jack Dorsey, NVK, Calle, ODELL, Pablof7z, Gigi, Derek Ross, Rockstar, Lyn Alden, etc.):
  - **Hop 0 (Root Anchors):** Hardcoded foundational builders and protocol authors.
  - **Hop 1 (Ring-1 Anchors):** 5,544 unique pubkeys directly followed by Root Anchors, loaded instantly into an in-memory hash set (`< 3ms` cold lookup) from a pre-computed graph snapshot. Points scale directly with anchor diversity: `Math.round((Math.min(8.0, rawScore) / 8.0) * 45)`.
  - **Hop 2 (Transitive Trust):** Validated across high-speed relay gossip (Damus, Primus, Eden, Nos).
  - **Hop 3+ (Isolated Graph):** Zero anchor reachability.
- **Sats-Weighted In-Degree Economic Stake:** Bot armies can inflate follow counts for free, but burning real Bitcoin satoshis carries real financial cost. NostrPulse queries Kind 9735 zap receipts, validates cryptographic bolt11 preimages, and applies strict filters:
  - **Wash Trading Rejection:** Discards self-zapping loops where `senderHex === targetHex`.
  - **Sybil Sender Filter:** Ignores zaps originating from isolated bots whose WoT score is 0 (`wotDistance > 2`).
  - **Logarithmic Saturation:** Calculates points via `Math.round(Math.min(30, Math.log10(validSats + 1) * 2.5))` with a 20-point baseline for verified Lightning addresses (`lud16`).
- **Strict Anti-Sybil Gatekeeper (0–25 pt Hard Ceiling):** Accounts with zero graph connection (`distance >= 3`) AND zero verified economic stake (`validSats === 0`) are hard-clamped to a maximum score of 25/100 (`Unverified / Potential Bot`). Sybil accounts cannot game their way into verified tiers simply by filling out bios, banner images, or arbitrary NIP-05 DNS handles.
- **Two-Way Chaumian eCash NutZaps (NIP-61):** Creators do not need to maintain an active node or monitor Lightning channels. Sats are minted into Cashu bearer proofs, encrypted with NIP-44 v2, and published as Kind 9321 events. The recipient can stay offline for weeks, decrypt their inbox on demand, and swap proofs with the mint in a single click.
- **Interoperability & Open Ecosystem Adoption:**
  - **Embeddable Widget (`public/widget.js`):** A zero-dependency web component (`<nutzap-me>`) that developers can drop into any static blog or website with a single `<script>` tag.
  - **Public REST API (`GET /api/v1/trust-score/[pubkey]`):** A CORS-enabled endpoint delivering real-time WoT distance, anchor endorsement counts, and Sybil-filtered satoshi volumes to third-party clients like Coracle, Amethyst, and Snort.

---

### Challenges I ran into

The hardest bugs did not come from building UI layouts—they came from broken assumptions at the protocol boundary where Nostr relays, Chaumian mints, and browser runtimes collide:

#### 1. The 16-Hex vs 66-Hex Keyset ID Mismatch (`Inputs: 0` Bug)
When redeeming incoming Cashu V4 tokens, mint nodes repeatedly returned `MintOperationError: Inputs: 0, Outputs: 0`. The proofs were mathematically valid, yet the swap aborted silently before touching the mint network.
- **Root Cause:** Cashu V4 CBOR tokens (`cashuB`) truncate keyset IDs to 16 hex characters to minimize QR payload size. However, Mint backends and `@cashu/cashu-ts` v4 strictly validate proofs against full 66-hex IDs. When passing truncated proofs into `wallet.receive()`, the SDK dropped all unrecognized proofs, submitting an empty input array to the mint.
- **Resolution:** Implemented an auto-expansion step inside `claimNutZapToken()` in `src/lib/cashu.ts`. Before submitting the swap, the client queries `/v1/keysets` directly from the mint, matches the truncated 16-hex prefix against active 66-hex keyset entries, normalizes the proofs with the full ID, and feeds a canonical token object into the wallet. Proof redemptions settled consistently in under 800ms.

#### 2. Zero-Dependency RFC 8949 CBOR Decoder for the Browser
Next-generation Cashu tokens (`cashuB...`) use binary CBOR encoding (NUT-00). Standard npm CBOR parsers pulled in heavy Node.js `Buffer` shims, inflating the production bundle by hundreds of kilobytes and throwing `ReferenceError: Buffer is not defined` inside browser Web Worker execution contexts.
- **Resolution:** Avoided bloated polyfills by implementing an RFC 8949 binary CBOR decoder from scratch in pure TypeScript (`decodeCbor()` in `src/lib/cashu.ts`). It operates directly on native `Uint8Array` primitives, parsing major types (unsigned ints, byte strings, UTF-8 text, arrays, maps) using raw bitwise shifts (`initialByte >> 5`). The implementation weighs ~80 lines of code, introduces zero npm dependencies, and parses V4 token payloads in sub-milliseconds.

#### 3. Eliminating Relay Front-Running via NIP-44 v2 Authenticated Encryption
Cashu proofs are bearer assets: possession of the secret string grants instant spend authority. Broadcasting raw Cashu tokens in plaintext over public Nostr relays allowed malicious relay operators and scrapers to extract proofs and redeem them at the mint before the intended recipient processed the event.
- **Resolution:** Enforced mandatory NIP-44 v2 payload encryption for all Kind 9321 NutZaps. The sender generates an ephemeral keypair and derives a ChaCha20-Poly1305 shared secret using the recipient's public key (via secp256k1 ECDH). Proofs never hit relay memory in plaintext. Only the recipient holding the corresponding private key can decrypt the content and execute the proof swap.

#### 4. Solving Client-Side Graph Freezes via Pre-Computed Ring-1 Caching
Crawling Kind 3 contact lists for 12 Root Anchors across multiple relays dynamically at runtime spawned 50+ concurrent WebSocket subscriptions. This saturated network bandwidth and locked the browser's main thread for 4 to 8 seconds on mobile devices.
- **Resolution:** Built an offline graph compilation pipeline (`scripts/build-ring1-cache.ts`) that crawls Kind 3 contact lists across 5 high-speed relays, aggregating 5,544 unique Ring-1 pubkeys along with their endorsing anchor sets. Baked this into `src/data/ring1-cache.json` (~290 KB). In production, this snapshot loads into an in-memory `Set` and `Map`, cutting Hop-1 graph lookups from ~5,000ms down to `< 3ms` without issuing a single network request.

#### 5. Fail-Closed Verification over Optimistic UI (NUT-07 Double-Spend Defense)
If a sender replayed an already-claimed eCash token or a creator attempted to redeem proofs twice, mint nodes rejected the swap. Early optimistic UI updates showed transient balance bumps that reverted after mint rejection, confusing users.
- **Resolution:** Re-architected `verifyTokenWithMint()` and `NutZapInbox` into a fail-closed verification pipeline. The client queries the mint's NUT-07 spend state endpoint prior to presenting claim actions. If a proof returns `SPENT`, the UI intercepts the state and renders an educational security badge: `Double-Spend Protection Active (NUT-07 SPENT)`. This demonstrates that the Chaumian mint prevented duplicate redemption without corrupting wallet state or interrupting the user session.
