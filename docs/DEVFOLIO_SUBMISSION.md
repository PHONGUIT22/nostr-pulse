# ⚡ NostrPulse: Devfolio Project Submission Copy
**Track:** Track 2: Freedom Stack (BOSS Battle - Bitshala)  
**Project URL:** [nostrpulse.vercel.app](https://nostrpulse.vercel.app)  
**Repository:** [github.com/PHONGUIT22/nostr-pulse](https://github.com/PHONGUIT22/nostr-pulse)  

---

## 📌 Field 1: The problem NostrPulse solves

Open protocols like Nostr eliminate centralized deplatforming, but introduce two critical structural challenges for creators and ecosystem builders:

### 1. The Sybil & Impersonation Crisis on Nostr
Generating Nostr keypairs (`npub`) is computationally free. Bot farms and malicious actors can spin up thousands of disposable identities to impersonate creators, conduct social phishing, and spam relays. Traditional solutions rely on invasive KYC, directly violating cypherpunk ethos.

### 2. Lightning Payment Fragility & The "1-Way eCash" Dead End
Standard Lightning Zaps (NIP-57) require synchronous coordination: micro-tips fail if the recipient's Lightning node is offline, runs out of inbound liquidity, or suffers routing timeouts. Meanwhile, existing NIP-61 Cashu implementations are strictly **one-way broadcast tools**—tippers can blast tokens onto relays, but recipients have no native web interface to discover, decrypt, or redeem those tokens into fresh proofs, stranding bearer assets across open relays.

---

### How NostrPulse Solves This:

* **5-Pillar Heuristic Anti-Sybil Engine:** Evaluates public key reputation (0–100 pts) at the edge in under 50ms by aggregating NIP-05 DNS signatures, Core Network Proximity, dynamic NIP-65 relay dispersion, account longevity, and profile entropy.
* **Strict Anti-Sybil Damping Guard:** Enforces an algorithmic 42-point ceiling for accounts lacking verified DNS binding and core network proximity, permanently disabling metadata gaming by bot farms.
* **Dual-Rail Micro-Settlement (Lightning + Chaumian eCash):** Integrates asynchronous Cashu NutZaps (NIP-61) alongside NIP-57 Zaps, enabling instant, private micropayments even when creator nodes are completely offline.
* **Full-Cycle NutZap Inbox & 1-Click Proof-Swap (2-Way eCash Flow):** Completes the missing receiver loop through `NutZapInbox`. Logged-in creators discover incoming Kind 9321 events via decentralized `#p` relay filters, decrypt private payloads via NIP-44 v2 (`window.nostr`), and execute an atomic proof-swap at the Mint (`wallet.receive`) to invalidate sender proofs and secure fresh unspent bearer assets.
* **Truncated Keyset Auto-Expansion:** Automatically resolves compact 16-hex Cashu V4 CBOR Keyset IDs against live Mint `/v1/keysets` endpoints into full 66-hex IDs, preventing `Inputs: 0` swap failures and ensuring reliable one-click redemption.
* **Zero-Supply-Chain CBOR Engine:** Implements a hand-crafted RFC 8949 binary CBOR decoder on native `Uint8Array` primitives to parse modern `cashuB` tokens with zero external npm dependencies.
* **Front-Running & Relay MEV Defense:** Seals Cashu bearer proofs inside NIP-44 v2 ChaCha20-Poly1305 authenticated encryption, preventing relay operators and mempool bots from intercepting tokens in flight.
* **Pure P2P vs. Fast Cache Engine:** Provides an instant navbar toggle between accelerated Edge CDN telemetry and 100% direct browser-to-relay WebSocket connections via `SimplePool`, ensuring zero reliance on centralized indexers.

---

## 🛠️ Field 2: Challenges I ran into

Building at the intersection of Nostr, Bitcoin Lightning, and Chaumian eCash presented five major architectural and cryptographic hurdles:

### 1. Zero-Dependency RFC 8949 Binary CBOR Decoding for `cashuB`
* **The Hurdle:** Next-generation Cashu V4 tokens (`cashuB...`) use binary CBOR encoding per NUT-00 specifications to reduce payload sizes by 40%. Standard npm CBOR parsers rely heavily on Node.js `Buffer` runtime globals, which consistently broke client-side builds, inflated bundle sizes, and introduced third-party supply-chain risks.
* **The Solution:** Rather than introducing bulky polyfills or external libraries, I hand-crafted a zero-dependency RFC 8949 CBOR decoder in pure TypeScript. It operates directly on native browser `Uint8Array` primitives, bitwise operations, and major type decoders (`0..7`). It handles 64-bit unsigned integers without BigInt polyfills (`hi * 2**32 + lo`), achieving sub-millisecond parsing across browsers and serverless functions alike.

### 2. Truncated 16-Hex Keyset IDs vs. Mint Keyset Mismatch (`Inputs: 0, Outputs: 0`)
* **The Hurdle:** In the NUT-00 Cashu V4 specification, keyset IDs inside `cashuB` tokens are truncated to 16 hex characters (8 bytes) for compactness. However, standard Cashu Mint nodes and `@cashu/cashu-ts` v4 expect full 66-hex Keyset IDs (e.g., `009a...`). Passing the raw token into `wallet.receive` caused the SDK to filter out valid proofs as unrecognized, sending an empty swap payload to the Mint and triggering `MintOperationError: Inputs: 0, Outputs: 0. Transaction inputs should equal outputs less fee`.
* **The Solution:** Engineered an automated keyset resolution engine. Before swapping proofs, NostrPulse dynamically queries `${mint}/v1/keysets` to fetch all active 66-hex IDs, maps the 16-hex prefix against the live keyset catalog, and auto-expands the proofs to full 66-hex IDs. The proofs are then wrapped into a canonical Cashu V4 flat token object (`{ mint, proofs, unit }`), ensuring 100% proof recognition and atomic swap execution.

### 3. Closing the Full Payment Loop: 2-Way NIP-61 NutZap Lifecycle
* **The Hurdle:** Most NIP-61 implementations are 1-way: they allow tipping via relay broadcast, but leave bearer tokens exposed in plaintext (vulnerable to mempool front-running and relay operator theft) with zero receiver-side claim infrastructure.
* **The Solution:** Implemented a full-cycle payment lifecycle with `NutZapInbox`. Tokens are sealed end-to-end using NIP-44 v2 ChaCha20-Poly1305 Diffie-Hellman encryption so only the recipient can decrypt the payload. In the inbox, logged-in creators query open relays for incoming Kind 9321 events, decrypt them via `window.nostr.nip44.decrypt`, and execute an atomic 1-click proof-swap with the Mint (`wallet.receive`). This permanently marks the sender's proofs as SPENT and issues fresh secret proofs held solely by the recipient.

### 4. Client-Side Sybil Resistance Without Browser-Crashing Graph Traversal
* **The Hurdle:** Nostr keypairs cost $0$ to generate, making bot farms and impersonators ubiquitous. Standard Web-of-Trust (WoT) graph traversal algorithms (e.g., EigenTrust or multi-hop BFS/DFS) require megabytes of relay event gossip, which routinely freezes UI threads and crashes mobile browsers.
* **The Solution:** Developed a 5-Pillar Deterministic Heuristic Matrix that computes an identity trust score (0–100 pts) in under 50ms directly at the edge. It aggregates NIP-05 cryptographic DNS signatures, dynamic NIP-65 relay diversity, Lightning V4V endpoints (`lud16`/`lud06`), and account longevity. To prevent bot farms from gaming cosmetic profile fields, I instituted an algorithmic **Anti-Sybil Damping Guard** that enforces an unbypassable 42-point ceiling for accounts lacking cryptographic DNS binding and network proximity.

### 5. Premature Relay WebSocket Teardown & Event Dropping
* **The Hurdle:** When broadcasting Kind 9321 NutZaps via `SimplePool.publish()`, promise races caused `pool.close()` to fire prematurely before public relays could acknowledge receipt. Furthermore, caching relays (like Primal) silently dropped unindexed custom kinds.
* **The Solution:** Expanded the relay broadcast mesh to open indexing relays (`relay.damus.io`, `nos.lol`, `nostr.band`, `purplerelay.com`, `relay.current.fyi`), handled `pool.publish` with `Promise.any()` alongside a safety timeout guard, and dispatched custom browser events (`nutzap_received`) to trigger instant reactive auto-refresh between the sender card and recipient inbox on the same page.
