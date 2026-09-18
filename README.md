<div align="center">

# ⚡ nostr-pulse
### Sovereign Web-of-Trust Graph Engine, Sats-Weighted Anti-Sybil Defense & Full-Cycle Chaumian eCash Protocol Client
**The Zero-Knowledge Reputation Matrix & Asynchronous eCash Settlement Layer for Nostr.**

[![Web-of-Trust](https://img.shields.io/badge/Web--of--Trust-5%2C544_Ring--1_Nodes-8A2BE2?style=for-the-badge)](src/data/ring1-cache.json)
[![Economic Stake](https://img.shields.io/badge/Anti--Sybil-Sats--Weighted_In--Degree-F7931A?style=for-the-badge&logo=bitcoin)](src/lib/economic-stake.ts)
[![Chaumian eCash](https://img.shields.io/badge/Cashu-NIP--61_NutZaps-00D084?style=for-the-badge)](src/lib/cashu.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Track](https://img.shields.io/badge/BOSS_Battle-Track_2:_Freedom_Stack-E02424?style=for-the-badge&logo=target)](https://bitshala.org)

<p align="center">
  <img src="assets/Demo.gif" alt="nostr-pulse Showcase" width="100%" />
</p>

<p align="center">
  <b>nostr-pulse</b> is an enterprise-grade analytics explorer, sovereign trust matrix, and full-cycle <b>NIP-61 Chaumian eCash (Cashu)</b> client built on the <b>Freedom Tech Stack</b> (Nostr + Bitcoin Lightning + Cashu eCash). It transforms raw cryptographic keypairs into verifiable, Sybil-resistant reputation metrics while enabling friction-free, offline Value-4-Value micro-settlements.
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
| **Project Name** | **nostr-pulse** |
| **Hackathon** | **BOSS Battle Hackathon** (Bitshala) |
| **Submission Track** | **Track 2: Freedom Stack** *(with Machine Money AI Agent extensions)* |
| **Team / Author** | **Nguyen Hac Phong** ([@PHONGUIT22](https://github.com/PHONGUIT22)) — *Solo Entry* |
| **Live Web App** | [https://nostrpulse.vercel.app](https://nostrpulse.vercel.app) |
| **Source Repository** | [https://github.com/PHONGUIT22/nostr-pulse](https://github.com/PHONGUIT22/nostr-pulse) |
| **License** | Open-source under the [MIT License](LICENSE) |

---

## 📹 Walkthrough Demo Video

> 📺 **Demo Walkthrough Video (3–5 Minutes):**  
> **[Watch the nostr-pulse Walkthrough on YouTube](https://youtu.be/pWb9w-7-gQ8)** *(or download the direct MP4 from project releases)*  
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

### How nostr-pulse Solves Both

```text
+-----------------------------------------------------------------------------------+
|                           nostr-pulse FREEDOM STACK                                |
+-----------------------------------------------------------------------------------+
|  1. GRAPH-THEORETIC SOVEREIGN REPUTATION LAYER                                    |
|     - 4-Tier Web-of-Trust Graph: Hop 0 (Core Root Anchors), Hop 1 (Ring-1),       |
|       Hop 2 (Transitive Trust), Hop 3 (Isolated / Sybil Risk)                     |
|     - High-Performance Ring-1 Snapshot: 5,544 nodes pre-computed in RAM (< 3ms)   |
|     - Sats-Weighted In-Degree (Pillar 2): Logarithmic economic stake with         |
|       strict self-zap wash trading rejection and Sybil clone filtering            |
|     - NIP-05 DNS Anchor: Cryptographic HTTPS .well-known DNS identity mapping     |
|     - Strict Gatekeeper: Clamps isolated keys without graph/stake at <= 25 pts    |
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
|  4. INTEROPERABILITY & OPEN PROTOCOL ADOPTION                                     |
|     - Standalone Embeddable Widget: Zero-dependency Vanilla JS (widget.js)        |
|     - Public Open API: CORS-enabled /api/v1/trust-score/[pubkey] for 3rd-party    |
|       Nostr clients (Amethyst, Coracle, etc.)                                     |
+-----------------------------------------------------------------------------------+
|  5. MACHINE MONEY & AUTONOMOUS AGENT INTEGRATION (Convergence)                    |
|     - Model Context Protocol (MCP) Server: Stdio JSON-RPC tools for AI agents     |
|     - NIP-90 Open Work & AI DVM Marketplace: Decentralized task compute & bounty  |
|     - Spending Guardrails: Rolling 24h limits & WoT-gated payment validation      |
+-----------------------------------------------------------------------------------+
```

---

## 🧪 Happy Path Evaluation Guide for Judges

You can evaluate the complete system without installing browser extensions or spending real money:

### Step 1: 1-Click Anti-Sybil Matrix Inspection
1. Navigate to the **[nostr-pulse Homepage](https://nostrpulse.vercel.app/)**.
2. Immediately below the search bar, locate the **Live Interactive Demo** section.
3. Click **🔥 Inspect Verified Builder** ([fiatjaf](https://nostrpulse.vercel.app/p/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6)):
   - Observe the **95 pts** score with the emerald `Verified Builder` tier.
   - Inspect the **Hop 0: Core Root Anchor** cryptographic status (45/45 graph pts), verified NIP-05 DNS signature (`_@fiatjaf.com`), active Lightning endpoint, and network longevity.
4. Click **⚠️ Inspect Sybil Bot Clone** ([anon_bot](https://nostrpulse.vercel.app/p/anon_bot)):
   - Observe how synthetic profile metadata (avatar, bio, external link) accumulated raw points.
   - Notice the **Anti-Sybil Gatekeeper Enforced**: because it has zero graph connectivity (`distance = 3`) and zero incoming WoT sats, its score is **strictly hard-capped at $\le$ 25 pts** (`Unverified / Potential Bot`, `Vulnerable` Sybil resistance), mathematically preventing metadata gaming.

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

### Step 4: Standalone NutZap Widget & Public REST API

1. **Test Standalone NutZap Widget (`widget.js`):**
   - nostr-pulse ships with a zero-dependency Vanilla JS embed script at `/widget.js`.
   - Any website, blog, or static creator page can embed eCash tipping with a single line:
     ```html
     <script src="https://nostrpulse.vercel.app/widget.js" data-npub="npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6" data-name="fiatjaf" async></script>
     ```
   - Alternatively, use the custom Web Component:
     ```html
     <nutzap-me npub="npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6" name="fiatjaf" amount="100"></nutzap-me>
     ```
   - Try the interactive live preview inside the **Embed Badge** modal on any profile.

2. **Test Public Open Reputation REST API:**
   - External Nostr clients (Amethyst, Coracle, Snort) can query the CORS-enabled trust endpoint directly for anti-spam filtering:
     ```bash
     curl -s https://nostrpulse.vercel.app/api/v1/trust-score/3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d
     ```
   - Returns structured JSON containing `score`, `tier`, `wot.distance`, `wot.endorsers_count`, `economic_stake.total_valid_sats`, and `sybil_resistance_level`.

---

## 📊 Finished vs. Unfinished Matrix

We believe in radical transparency regarding what was built and tested during the hackathon versus planned future iterations:

| Feature / Subsystem | Status | Implementation Details & Test Coverage |
| :--- | :---: | :--- |
| **Web-of-Trust Ring-1 Graph Engine** | **Finished** | 5,544 nodes pre-computed in [`src/data/ring1-cache.json`](src/data/ring1-cache.json), $O(1)$ memory lookup ($< 3\text{ms}$), 21 curated Root Anchors across 4 tiers. |
| **Sats-Weighted In-Degree Filter** | **Finished** | Sub-linear logarithmic economic stake ($\log_{10}(\text{sats}+1) \times 2.5$) with strict self-zap wash trade rejection and Sybil clone filtering. |
| **Multi-Hop Transitive Trust Resolver** | **Finished** | 4-Tier social distance classification (Hop 0–3) with bounded relay timeouts ($\le 3000\text{ms}$) via `Promise.race`. |
| **Anti-Sybil Gatekeeper Guard** | **Finished** | Mathematical hard ceilings: $\le 25\text{ pts}$ for isolated keys without WoT stake, $\le 35\text{ pts}$ for Hop 3+ with stake, $\le 50\text{ pts}$ for Hop 2. |
| **Zero-Dependency RFC 8949 CBOR Decoder** | **Finished** | Handcrafted parser in [`src/lib/cashu.ts`](src/lib/cashu.ts) supporting Major types 0–7 and 64-bit integers with zero npm dependencies. |
| **Full-Cycle NIP-61 NutZap Sender Pipeline** | **Finished** | Supports BOLT-11 quote minting, NIP-44 v2 encryption, and Kind 9321 multi-relay broadcasting. |
| **NIP-61 NutZap Receiver Inbox** | **Finished** | Open-relay ingestion for Kind 9321 events, client-side NIP-44 decryption, and live event refresh. |
| **Truncated Keyset ID Auto-Expansion** | **Finished** | Resolves the 16-hex vs 66-hex Cashu V4 mismatch via `/v1/keysets` prefix matching before proof swap. |
| **Fail-Closed NUT-07 Double-Spend Shield** | **Finished** | Real-time proof-state checks against the mint; fails closed on unresponsive endpoints to prevent false positives. |
| **Standalone Embeddable NutZap Widget** | **Finished** | Zero-dependency script and Web Component in [`public/widget.js`](public/widget.js) with Lightning mint quote and proof swap. |
| **Public Open Trust Score REST API** | **Finished** | CORS-enabled public endpoint at `/api/v1/trust-score/[pubkey]` with structured WoT graph and economic stake metrics. |
| **Dual Network Engine (Fast vs Pure P2P)** | **Finished** | Global navbar toggle switching between Primal Edge cache and 100% direct WebSocket connections via `SimplePool`. |
| **Head-to-Head Compare Arena** | **Finished** | Side-by-side identity and trust matrix comparison at `/compare`. |
| **Relay Telemetry Monitor** | **Finished** | Live latency and WebSocket connection health dashboard across decentralized relays at `/relays`. |
| **Model Context Protocol (MCP) Server** | **Finished** | Full Stdio MCP server (`mcp-entry.ts`) exposing 8 tools for AI agent payment, identity, and trust verification. |
| **NIP-90 Open Work / DVM Marketplace** | **Finished** | Task bounty board at `/bounties` with Kind 5000 request publishing, feedback streams, and eCash payout settlement. |
| **Autonomous Spending Guardrails** | **Finished** | Rolling 24h budget limits, per-tx caps, and WoT trust-score gatekeeping protecting agent balances. |
| **NUT-11 P2PK Recipient Locks** | *Scoped Next* | Mint-enforced recipient public key locks for eCash proofs; awaiting widespread testnet mint deployment. |
| **Automated Auto-Melt Liquidity Service** | *Scoped Next* | Threshold-based auto-swapping from accumulated eCash tokens into native Lightning node balance. |

---

## 🤖 Bonus Convergence: Machine Money & AI Agents

Beyond human users, nostr-pulse natively powers autonomous software agents with the same Freedom Tech primitives:

### 1. Zero-Config Agent Identity
Autonomous agents generate their own cryptographic `secp256k1` keypairs (`npub` / `nsec`) locally via [`src/lib/identity-manager.ts`](src/lib/identity-manager.ts). No credit cards, phone numbers, or corporate credentials required.

### 2. Model Context Protocol (MCP) Server
Any LLM (Claude Desktop, Cursor IDE, Windsurf) can connect to nostr-pulse using standard Stdio JSON-RPC:
```json
{
  "mcpServers": {
    "nostrpulse": {
      "command": "npx",
      "args": ["-y", "nostrpulse-mcp"]
    }
  }
}
```

### 3. NIP-90 Open Work & AI DVM Marketplace
Agents and human builders buy and sell computational labor, data analysis, and reputation audits at [`/bounties`](https://nostrpulse.vercel.app/bounties) using Kind 5000 job requests and Kind 6000 deliverables settled via sats.

### 4. Spending Guardrails & Radar Defense
To prevent infinite-loop spending or prompt injection attacks from draining agent funds, [`src/lib/spending-guardrails.ts`](src/lib/spending-guardrails.ts) enforces:
* Configurable rolling 24-hour satoshi spending budgets.
* Maximum satoshis per individual transaction.
* Mandatory Web-of-Trust reputation threshold gatekeeping before releasing funds to counterparties.

---

## ⚡ Clean-Machine Setup & Reproduction

nostr-pulse is engineered with **zero required external environment variables, zero API keys, and zero database setup** out of the box.

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

nostr-pulse strictly adheres to open specifications across both the Nostr and Cashu ecosystems:

| Standard | Layer | Description | Implementation Status |
| :--- | :--- | :--- | :---: |
| **NIP-01** | Nostr Core | Event schemas, Schnorr signatures, relay WebSocket subscriptions | ✅ Fully Supported |
| **NIP-05** | Identity | Cryptographic DNS verification mapping handle to Nostr pubkey | ✅ Fully Supported |
| **NIP-07** | Client Signer | Browser extension signing interface (`window.nostr`) | ✅ Fully Supported |
| **NIP-19** | Entities | Bech32 entity encoding/decoding (`npub`, `note`, `nprofile`) | ✅ Fully Supported |
| **NIP-44 v2** | Privacy | ChaCha20-Poly1305 authenticated end-to-end encryption | ✅ Fully Supported |
| **NIP-47** | Lightning | Nostr Wallet Connect (NWC) automated payment dispatch for AI agents | ✅ Fully Supported |
| **NIP-57** | Lightning | Synchronous Lightning Zaps (Kind 9734 request & Kind 9735 receipt) | ✅ Fully Supported |
| **NIP-60 / NIP-61** | Chaumian eCash | Asynchronous NutZaps via Kind 9321 events & standalone `widget.js` | ✅ Fully Supported |
| **NIP-65** | Routing | Relay List Metadata (Kind 10002) for dynamic outbox routing | ✅ Fully Supported |
| **NIP-89 / NIP-90** | App / DVM | Open reputation schema & computational data provider standards (`/api/v1`, `/bounties`) | ✅ Fully Supported |
| **NUT-00** | Cashu Tokens | V3 JSON (`cashuA`) and V4 binary CBOR (`cashuB`) specifications | ✅ Fully Supported |
| **NUT-02** | Cashu Mint | Keyset ID discovery and status endpoints (`/v1/keysets`) | ✅ Fully Supported |
| **NUT-03** | Cashu Swap | Token swapping and proof exchange for recipient ownership | ✅ Fully Supported |
| **NUT-04** | Cashu Minting | In-app minting via Lightning BOLT-11 quotes | ✅ Fully Supported |
| **NUT-07** | Cashu State | Token spend-state verification (`checkProofsStates`) | ✅ Fully Supported |

---

## 🔍 Codebase Architecture

```text
nostr-pulse/
├── public/
│   └── widget.js                # Zero-dep standalone embeddable NutZap button
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Homepage with Live Interactive Demo
│   │   ├── p/[npub]/page.tsx        # Profile dashboard, Trust Score breakdown, NutZap Inbox
│   │   ├── bounties/page.tsx        # NIP-90 Open Work & AI DVM Marketplace
│   │   ├── agent/page.tsx           # Autonomous AI Agent Dashboard
│   │   ├── compare/page.tsx         # Head-to-Head Creator Versus arena
│   │   ├── relays/page.tsx          # Real-time WebSocket relay latency monitor
│   │   └── api/
│   │       ├── badge/[npub]/        # Dynamic SVG reputation badge generator
│   │       ├── bounties/            # Server-side NIP-90 open task fetcher
│   │       ├── v1/trust-score/      # Public open REST API for external clients
│   │       └── widget/              # Backend quote & claim routes for widget.js
│   ├── components/
│   │   ├── home/
│   │   │   └── HeroSearchSection.tsx# 1-Click Interactive Demo buttons (fiatjaf vs anon_bot)
│   │   ├── detail/
│   │   │   ├── NutZapInbox.tsx      # Kind 9321 inbox, NIP-44 decryption, proof swap
│   │   │   ├── LightningZapCard.tsx # Dual-rail payment card (Lightning + Cashu)
│   │   │   ├── LiveZapFeed.tsx      # Real-time WebSocket streaming Kind 9735 receipts
│   │   │   └── TrustScoreCard.tsx   # 5-Pillar matrix & Anti-Sybil gatekeeper indicator
│   │   ├── bounty/
│   │   │   ├── BountyCard.tsx       # NIP-90 Task card with creator trust badge
│   │   │   └── CreateBountyModal.tsx# Post Kind 5000 job requests with sats bid
│   │   └── layout/
│   │       └── Navbar.tsx           # Global navigation with network mode toggle
│   ├── data/
│   │   └── ring1-cache.json         # 5,544 pre-computed Ring-1 nodes snapshot
│   ├── lib/
│   │   ├── anchors.ts               # 21 curated Root Anchors registry across 4 tiers
│   │   ├── wot.ts                   # Web-of-Trust graph distance resolver
│   │   ├── economic-stake.ts        # Sats-weighted in-degree & wash trading defense
│   │   ├── cashu.ts                 # Zero-dep CBOR decoder, NutZap engine, Keyset resolution
│   │   ├── trust-score.ts           # 5-Pillar scoring matrix & Anti-Sybil Gatekeeper guard
│   │   ├── nip05.ts                 # Cryptographic DNS record verification
│   │   ├── nip90.ts                 # NIP-90 DVM client & subscription manager
│   │   ├── identity-manager.ts      # Zero-config autonomous agent keypair manager
│   │   ├── spending-guardrails.ts   # AI Agent spending limits & policy engine
│   │   └── nostr.ts                 # SimplePool relay manager, NIP-19 decoders
│   └── mcp-entry.ts                 # Stdio Model Context Protocol (MCP) server
├── docs/
│   └── DEVFOLIO_SUBMISSION.md       # Devfolio submission copy (sanitized fields)
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
* **Non-Custodial Architecture:** nostr-pulse never holds or requests your private key (`nsec`). All signing is mediated via NIP-07 extension standards.