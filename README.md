<div align="center">

# ⚡ NostrPulse
### Sovereign Identity Analytics, Anti-Sybil Reputation Engine & Full-Cycle Chaumian eCash Protocol Client

[![License: MIT](https://img.shields.io/badge/License-MIT-9333EA?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Track](https://img.shields.io/badge/Track_2-Freedom_Stack-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white)](https://bitshala.org)
[![Nostr Protocol](https://img.shields.io/badge/Nostr-NIPs_Compliant-8A2BE2?style=for-the-badge&logo=nostr)](https://github.com/nostr-protocol/nips)
[![Cashu Protocol](https://img.shields.io/badge/Cashu-NUTs_V4_eCash-00D084?style=for-the-badge)](https://cashu.space)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-App_Router-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)

<br />

<p align="center">
  <b>NostrPulse</b> is an enterprise-grade analytics explorer, sovereign trust matrix, and full-cycle <b>NIP-61 Chaumian eCash (Cashu)</b> client built on the <b>Freedom Tech Stack</b> (Nostr + Bitcoin Lightning + Cashu eCash). It transforms raw cryptographic keypairs into verifiable, Sybil-resistant reputation metrics while enabling friction-free, offline Value-4-Value micro-settlements.
</p>

<p align="center">
  <a href="https://nostrpulse.vercel.app/"><b>🚀 Launch Live Explorer »</b></a> •
  <a href="#-happy-path-evaluation-guide-for-judges"><b>Evaluation Guide</b></a> •
  <a href="#-finished-vs-unfinished-matrix"><b>Finished vs. Unfinished</b></a> •
  <a href="#-clean-machine-setup--reproduction"><b>Local Setup</b></a> •
  <a href="https://nostrpulse.vercel.app/compare"><b>Versus Engine</b></a>
</p>

</div>

---

## 📋 Hackathon Submission Details

| Field | Detail |
| :--- | :--- |
| **Project Name** | **NostrPulse** |
| **Hackathon** | **BOSS Battle Hackathon** (Bitshala) |
| **Submission Track** | **Track 2: Freedom Stack** |
| **Team / Author** | **Nguyen Hac Phong** ([@PHONGUIT22](https://github.com/PHONGUIT22)) — *Solo Entry* |
| **Live Web App** | [https://nostrpulse.vercel.app](https://nostrpulse.vercel.app) |
| **Source Repository** | [https://github.com/PHONGUIT22/nostr-pulse](https://github.com/PHONGUIT22/nostr-pulse) |
| **License** | Open-source under the [MIT License](LICENSE) |

---

## 📹 Walkthrough Demo Video

> 📺 **Demo Walkthrough Video (3–5 Minutes):**  
> **[Watch the NostrPulse Walkthrough on YouTube](https://youtu.be/pWb9w-7-gQ8)** *(or download the direct MP4 from project releases)*  
> *A concise walkthrough demonstrating: 1-click Anti-Sybil inspection, NIP-05 DNS cryptographic verification, in-app testnet eCash minting, and the complete 2-way NIP-61 NutZap receiver inbox proof-swap.*

---

## 🌐 The Problem & The Freedom Tech Approach

Decentralized social protocols like Nostr eliminate centralized deplatforming, but introduce two structural vulnerabilities for developers and users:

### 1. Identity is Computationally Free (The Sybil Flood)
Anyone can spin up 10,000 Nostr keypairs (`npub`) in two seconds for zero satoshis. Scammers clone creator bios, scrape avatars, and spam open relays with synthetic identities.
* **Why centralized KYC fails:** Uploading passports or phone numbers destroys cypherpunk privacy and introduces centralized honeypots.
* **Why heavy graph math fails:** Full Web-of-Trust graph traversals (like EigenTrust) sound elegant on paper, but computing multi-hop graph matrices client-side freezes mobile browsers and crashes tabs.

### 2. Lightning Tipping is Synchronous and Fragile
Standard Lightning Zaps (NIP-57) require real-time coordination. If a creator's phone goes to sleep, their node loses power, or their routing channels run out of inbound liquidity, payments fail immediately. Fans want to tip 100 sats; instead, they receive a routing timeout.

---

### How NostrPulse Solves Both

```text
+-----------------------------------------------------------------------------------+
|                           NOSTRPULSE FREEDOM STACK                                |
+-----------------------------------------------------------------------------------+
|  1. SOVEREIGN REPUTATION LAYER (Sub-50ms Heuristic Matrix)                        |
|     - NIP-05 DNS Cryptographic Verification (Domain ownership anchor)             |
|     - Core Network Seed Proximity & NIP-65 dynamic relay diversity                 |
|     - Anti-Sybil Damping Guard: Clamps unverified identities strictly at 42 pts   |
+-----------------------------------------------------------------------------------+
|  2. ASYNCHRONOUS VALUE SETTLEMENT LAYER (Dual-Rail Micro-Payments)                |
|     - Synchronous Rail: NIP-57 Lightning Zaps with WebLN auto-dispatch            |
|     - Asynchronous Rail: NIP-61 Cashu NutZaps (Kind 9321 bearer eCash delivery)   |
|     - NIP-44 v2 E2E Encryption: Front-running and MEV-immune bearer token payload |
|     - Native RFC 8949 Binary CBOR Decoder: Sub-millisecond parsing, zero-npm deps |
+-----------------------------------------------------------------------------------+
|  3. DUAL NETWORK TRANSPORT ENGINE                                                 |
|     - Fast Edge Cache: Accelerated metadata telemetry via Primal edge             |
|     - Pure P2P Mode: 100% direct browser-to-relay WebSockets via SimplePool       |
+-----------------------------------------------------------------------------------+
```

---

## 🧪 Happy Path Evaluation Guide for Judges

You can evaluate the complete system without installing browser extensions or spending real money:

### Step 1: 1-Click Anti-Sybil Matrix Inspection
1. Navigate to the **[NostrPulse Homepage](https://nostrpulse.vercel.app/)**.
2. Immediately below the search bar, locate the **Live Interactive Demo** section.
3. Click **🔥 Inspect Verified Builder** ([fiatjaf](https://nostrpulse.vercel.app/p/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6)):
   - Observe the **88 pts** score with the emerald `Verified Builder` tier.
   - Inspect the verified NIP-05 DNS signature (`_@fiatjaf.com`) and core seed node network proximity (25/25 pts).
4. Click **⚠️ Inspect Sybil Bot Clone** ([anon_bot](https://nostrpulse.vercel.app/p/anon_bot)):
   - Observe how synthetic profile metadata (avatar, bio, external link) accumulated 45+ raw points.
   - Notice the **Anti-Sybil Guard Enforced** banner: because it lacks verified DNS and core network proximity, its score is **clamped at 42 pts** (`Unverified / Potential Bot`).

---

### Step 2: Send a NIP-61 NutZap (Sender Pipeline)
1. On any creator profile (e.g., [Jack](https://nostrpulse.vercel.app/p/npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m)), scroll to the **Support Creator** card.
2. Switch payment tab to **Cashu eCash (NIP-61)**.
3. Obtain a testnet Cashu token via either method:
   - **Method A (In-App 1-Click Mint):** Switch to **1-Click Mint**, select a satoshi amount (e.g. 21 Sats), and settle the testnet invoice.
   - **Method B (Free External Testnet Sats):** Visit [cashu.me](https://cashu.me), set your mint to `https://testnut.cashu.space`, claim free testnet sats, and copy the `cashuB...` or `cashuA...` token.
4. Paste the token into the input box and click **Verify eCash Token**.
   - Watch our zero-dependency RFC 8949 binary CBOR decoder unpack the proofs and verify spend-state directly against the mint (`https://testnut.cashu.space`).
5. Click **Send Sats (NutZap)**:
   - The token is sealed via **NIP-44 v2 ChaCha20-Poly1305 authenticated encryption** using a Diffie-Hellman shared secret derived from the recipient's public key.
   - The encrypted payload is broadcasted concurrently across 5+ public Nostr relays as a **Kind 9321** event.

---

### Step 3: Decrypt & Claim to Mint in NutZap Inbox (Receiver Pipeline)
1. Connect with your Nostr extension (Alby, nos2x) using the **Connect** button in the header, or visit your own profile.
2. Scroll to the **Incoming eCash NutZaps (Kind 9321)** inbox.
3. Observe the relay query fetching incoming Kind 9321 events tagged with `#p: [<your_pubkey>]`.
4. Click **🔓 Decrypt & View Token**:
   - Triggers `window.nostr.nip44.decrypt` to unveil the private memo and bearer token.
5. Click **⚡ Claim to Mint (Swap Proofs)**:
   - **Keyset Auto-Expansion:** Automatically queries mint keysets, expanding truncated 16-hex CBOR keyset IDs to full 66-hex IDs to prevent `MintOperationError: Inputs: 0`.
   - **Atomic Proof Swap:** Executes `wallet.receive()`, instructing the mint to invalidate the sender's secrets and issue fresh, blinded proofs held exclusively by you.
   - **NUT-07 Double-Spend Verification:** The token status updates live to `🟢 Claimed & Swapped`. Attempting to reclaim marks it as `🔴 SPENT`.

---

## 📊 Finished vs. Unfinished Matrix

We believe in radical transparency regarding what was built and tested during the hackathon versus planned future iterations:

| Feature / Subsystem | Status | Implementation Details & Test Coverage |
| :--- | :---: | :--- |
| **5-Pillar Heuristic Anti-Sybil Matrix** | **Finished** | 100% client-side deterministic scoring (< 50ms) across DNS, graph proximity, V4V readiness, longevity, and entropy. |
| **The 42-Point Anti-Sybil Damping Guard** | **Finished** | Algorithmic ceiling strictly clamping unverified accounts with isolated network presence to 42 points max. |
| **Zero-Dependency RFC 8949 CBOR Decoder** | **Finished** | Handcrafted parser in [`src/lib/cashu.ts`](src/lib/cashu.ts) supporting Major types 0–7 and 64-bit integers with zero npm dependencies. |
| **Full-Cycle NIP-61 NutZap Sender Pipeline** | **Finished** | Supports BOLT-11 quote minting, NIP-44 v2 encryption, and Kind 9321 multi-relay broadcasting. |
| **NIP-61 NutZap Receiver Inbox** | **Finished** | Open-relay ingestion for Kind 9321 events, client-side NIP-44 decryption, and live event refresh. |
| **Truncated Keyset ID Auto-Expansion** | **Finished** | Resolves the 16-hex vs 66-hex Cashu V4 mismatch via `/v1/keysets` prefix matching before proof swap. |
| **Fail-Closed NUT-07 Double-Spend Shield** | **Finished** | Real-time proof-state checks against the mint; fails closed on unresponsive endpoints to prevent false positives. |
| **Dual Network Engine (Fast vs Pure P2P)** | **Finished** | Global navbar toggle switching between Primal Edge cache and 100% direct WebSocket connections via `SimplePool`. |
| **Head-to-Head Compare Arena** | **Finished** | Side-by-side identity and trust matrix comparison at `/compare`. |
| **Relay Telemetry Monitor** | **Finished** | Live latency and WebSocket connection health dashboard across decentralized relays at `/relays`. |
| **NUT-11 P2PK Recipient Locks** | *Scoped Next* | Mint-enforced recipient public key locks for eCash proofs; awaiting widespread testnet mint deployment. |
| **Automated Auto-Melt Liquidity Service** | *Scoped Next* | Threshold-based auto-swapping from accumulated eCash tokens into native Lightning node balance. |
| **NIP-90 Data Vending Machine Agent Settlement** | *Scoped Next* | Autonomous machine-to-machine reputation verifications and micro-settlements. |

---

## ⚡ Clean-Machine Setup & Reproduction

NostrPulse is engineered with **zero required external environment variables, zero API keys, and zero database setup** out of the box.

### Prerequisites
* **Node.js:** `>= 18.18.0` (LTS recommended)
* **Package Manager:** `npm`, `pnpm`, or `yarn`
* **Browser:** Any modern Chromium, Firefox, or Safari browser

### 1. Clone the Repository
```bash
git clone https://github.com/PHONGUIT22/nostr-pulse.git
cd nostr-pulse
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

### 4. Build for Production
To verify production bundle compilation and type integrity:
```bash
npm run build
npm run start
```

---

## 🛡️ Protocol Specifications & NIP Compliance

NostrPulse strictly adheres to open specifications across both the Nostr and Cashu ecosystems:

| Standard | Layer | Description | Implementation Status |
| :--- | :--- | :--- | :---: |
| **NIP-01** | Nostr Core | Event schemas, Schnorr signatures, relay WebSocket subscriptions | ✅ Fully Supported |
| **NIP-05** | Identity | Cryptographic DNS verification mapping handle to Nostr pubkey | ✅ Fully Supported |
| **NIP-07** | Client Signer | Browser extension signing interface (`window.nostr`) | ✅ Fully Supported |
| **NIP-19** | Entities | Bech32 entity encoding/decoding (`npub`, `note`, `nprofile`) | ✅ Fully Supported |
| **NIP-44 v2** | Privacy | ChaCha20-Poly1305 authenticated end-to-end encryption | ✅ Fully Supported |
| **NIP-57** | Lightning | Synchronous Lightning Zaps (Kind 9734 request & Kind 9735 receipt) | ✅ Fully Supported |
| **NIP-61** | Chaumian eCash | Asynchronous NutZaps via Kind 9321 events | ✅ Fully Supported |
| **NIP-65** | Routing | Relay List Metadata (Kind 10002) for dynamic outbox routing | ✅ Fully Supported |
| **NUT-00** | Cashu Tokens | V3 JSON (`cashuA`) and V4 binary CBOR (`cashuB`) specifications | ✅ Fully Supported |
| **NUT-02** | Cashu Mint | Keyset ID discovery and status endpoints (`/v1/keysets`) | ✅ Fully Supported |
| **NUT-03** | Cashu Swap | Token swapping and proof exchange for recipient ownership | ✅ Fully Supported |
| **NUT-04** | Cashu Minting | In-app minting via Lightning BOLT-11 quotes | ✅ Fully Supported |
| **NUT-07** | Cashu State | Token spend-state verification (`checkProofsStates`) | ✅ Fully Supported |

---

## 🔍 Codebase Architecture

```text
nostr-pulse/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Homepage with Live Interactive Demo
│   │   ├── p/[npub]/page.tsx        # Profile dashboard, Trust Score breakdown, NutZap Inbox
│   │   ├── compare/page.tsx         # Head-to-Head Creator Versus arena
│   │   ├── relays/page.tsx          # Real-time WebSocket relay latency monitor
│   │   └── api/badge/[npub]/        # Dynamic SVG reputation badge generator
│   ├── components/
│   │   ├── home/
│   │   │   └── HeroSearchSection.tsx# 1-Click Interactive Demo buttons (fiatjaf vs anon_bot)
│   │   ├── detail/
│   │   │   ├── NutZapInbox.tsx      # Kind 9321 inbox, NIP-44 decryption, proof swap
│   │   │   ├── LightningZapCard.tsx # Dual-rail payment card (Lightning + Cashu)
│   │   │   ├── LiveZapFeed.tsx      # Real-time WebSocket streaming Kind 9735 receipts
│   │   │   └── TrustScoreCard.tsx   # 5-Pillar matrix & Anti-Sybil damping indicator
│   │   └── layout/
│   │       └── Navbar.tsx           # Global navigation with network mode toggle
│   └── lib/
│       ├── cashu.ts                 # Zero-dep CBOR decoder, NutZap engine, Keyset resolution
│       ├── trust-score.ts           # 5-Pillar scoring matrix & Anti-Sybil damping guard
│       ├── nip05.ts                 # Cryptographic DNS record verification
│       ├── network-mode.ts          # State manager: Fast Cache vs. Pure P2P
│       └── nostr.ts                 # SimplePool relay manager, NIP-19 decoders
├── docs/
│   └── DEVFOLIO_SUBMISSION.md       # Hackathon narrative copy
└── PRODUCT.md                       # Impeccable durable product register
```

---

## ⚠️ Honest Technical Limitations & What's Next

1. **Decentralized Relay Propagation Jitter:** Public Nostr relays operate asynchronously. When publishing Kind 9321 events, occasional WebSocket connection timeouts can occur if a specific relay is rate-limited. We mitigate this by publishing concurrently across a resilient mesh of 5+ indexing relays with local browser cache reconciliation.
2. **Dependence on Testnet Mint Availability:** The live demo defaults to `https://testnut.cashu.space`. If this public testnet mint experiences temporary node maintenance, proof verification and swaps will fail closed to protect user funds.
3. **Absence of NUT-11 P2PK Locks in Current Mints:** Until public mints widely deploy NUT-11 (Pay-to-Public-Key) locks, eCash proofs remain bearer secrets before redemption. We enforce mandatory NIP-44 v2 encryption during transmission to prevent mempool front-running, but recipient-locked proofs remain our top roadmap priority for post-hackathon mainnet release.

---

## ⚖️ License & Cypherpunk Statement

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

* **No Surveillance:** Zero tracking scripts, zero Google Analytics, zero session cookies.
* **100% Client-Side Execution:** Cryptographic hashing, CBOR decoding, NIP-44 encryption, and proof swaps occur locally in your browser.
* **Non-Custodial Architecture:** NostrPulse never holds or requests your private key (`nsec`). All signing is mediated via NIP-07 extension standards.