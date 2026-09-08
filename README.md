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
  <a href="https://nostrpulse.vercel.app/about"><b>Methodology</b></a> •
  <a href="https://nostrpulse.vercel.app/relays"><b>Relay Telemetry</b></a> •
  <a href="https://nostrpulse.vercel.app/compare"><b>Versus Engine</b></a> •
  <a href="#-quick-evaluation-guide-for-judges-live-interactive-demo"><b>🧪 Interactive Demo Guide</b></a>
</p>

</div>

---

## 🧪 Quick Evaluation Guide for Judges (Live Interactive Demo)

To evaluate **NostrPulse** without spending real Bitcoin or installing browser extensions, test the full-cycle **NUT-00 V4 CBOR eCash (`cashuB`)** pipeline using our live Testnet mint integration:

### Step 1: Send a NIP-61 NutZap (Sender Pipeline)
1. Visit **[Jack's Profile](https://nostrpulse.vercel.app/p/npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m)** on the live deployment.
2. In the **Support jack** card, switch to **Cashu eCash (NIP-61)** ➔ **Paste Token**.
3. Ensure the target mint is set to **Cashu Testnut (Demo / Test Sats)**.
4. Copy and paste this live **NUT-00 V4 CBOR Token (21 Sats)** into the token box:

```text
cashuBo2FteBtodHRwczovL3Rlc3RudXQuY2FzaHUuc3BhY2VhdWNzYXRhdIGiYWlIAYQjfmPONCNhcIOkYWEQYXN4QDIyZmM3YWNjMDllZWJlOWNiNjRhMDk3MTQ5MTViYTQ0NDExMDZkM2NlNmQ4YjJkM2FhOWIyNjA0ODY4NzdkYzhhY1ghA1CebGtQCkyvj97TNc6SKjnUepmelsxulOTl5LWm795AYWSjYWVYIFyb9BEKNmcAGJPYyEjYpUrPxdOMVtWCEBWbQxQWhRNGYXNYIIf6SixhZJg6h-BzUsLKyO7p18Zh-hEC-me3JwDhwof0YXJYIKMKKQEkzzMqZQ-JiPYo1VNc9N_AtHixGCNUgk1a429dpGFhBGFzeEA3NzU2NTE0Njg1MDliMDAwOWYxZjRmYzJiYTdmMGZkZjU0YTJlMWI0MDdkODA4ZDljOTZjNTUyNzczODkwYjVkYWNYIQOSWDT_Ur5wOlJMruf0RKnjV5MW4pzeDKp6eUkwRCiUeGFko2FlWCDhkwEj3Ck0gHrJ_R9Ur84Wvi-ls5a7aoFmKojvA3n53GFzWCBrhNbOgQV9ZmOhkb-_2m_BF-sYApUqUrLNSskW4aP1LmFyWCBCP8XkPVN6n8VPMU7UYGcqR4n_lzsmui5T6xxyy9RHL6RhYQFhc3hAYTgzZGU5OTUyMjJjNmQwNThjYTY0ZjI0MGQxNzk1ZjRiZmFiYTMzMDQyMzkxN2RhMTZmNTJjZjJjNTNjNDQwN2FjWCED58b_wlPN8ombHrjJ7nBjxDGnBZw95NmoZbv0JGq0qEZhZKNhZVggBG6UlWOjPrz0BD7uKygbu24fJx9l_tNMUERho0yLxYVhc1ggMZfbVxdLa775b3VnME__GN8PGqQbqdoU0Ycm4mdehXlhclggu1x5J55-wpi0LWELGtH5_jIjo2nmLV6_OE2cyTpUqKg
```

5. Click **Verify eCash Token**: Our custom zero-dependency RFC 8949 decoder decodes the binary CBOR map and checks proof states live with the mint.
6. Click **Send Sats (NutZap)**: The token is encrypted end-to-end via NIP-44 v2 and broadcasted directly to 5+ open relays as a **Kind 9321** event.

### Step 2: Receive, Decrypt & 1-Click Claim (Receiver Pipeline)
1. Log in with your NIP-07 browser extension (Alby, nos2x) using the header **Connect** button.
2. Navigate to your own profile or inspect the **Incoming eCash NutZaps (Kind 9321)** inbox.
3. Observe the decentralized relay query polling for incoming Kind 9321 events tagged with `#p: [<your_pubkey>]`.
4. Click **🔓 Decrypt & View Token**: Calls `window.nostr.nip44.decrypt` to reveal the private memo and bearer token.
5. Click **⚡ Claim to Mint (Swap Proofs)**:
   - Auto-expands truncated 16-hex CBOR keyset IDs to full 66-hex mint keyset IDs.
   - Executes an atomic proof swap at the Mint (`wallet.receive`).
   - Generates brand new secret proofs held solely by you, invalidating the sender's original proofs.
   - Updates the live status badge to `🟢 Claimed & Swapped`.

> [!NOTE]
> Cashu proofs are cryptographic bearer assets. If previous evaluators have already claimed the test token above, you can use **1-Click Mint & Send** within the card to mint fresh test tokens via Testnet Lightning quotes.

---

## 🌐 The Problem & The Freedom Stack Solution

Open protocols like Nostr eliminate centralized deplatforming, but introduce two structural vulnerabilities:
1. **Sybil Floods & Impersonation:** Keypair generation (`npub`) costs $0$, making bot farms, clone accounts, and impersonators rampant. Heavy Web-of-Trust graph traversals crash mobile and edge web browsers.
2. **Synchronous Payment Fragility:** Traditional Lightning Zaps (NIP-57) require the recipient's Lightning node to be constantly online and have sufficient inbound liquidity routing channels. If a creator is offline, tips fail.

### The Freedom Tech Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         NOSTRPULSE ARCHITECTURE OVERVIEW                         │
└──────────────────────────────────────────────────────────────────────────────────┘
                 
     [ Sovereign Identity Layer ]             [ Dual-Rail Value Settlement ]
       NIP-01: P2P WebSocket Gossip             NIP-57: Lightning Zaps (WebLN)
       NIP-05: Cryptographic DNS Check          NIP-61: Cashu NutZaps (Kind 9321)
       NIP-65: Dynamic Relay Outbox             NIP-44: E2E DH Payload Encryption
                    │                                         │
                    ▼                                         ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐
│  5-Pillar Anti-Sybil Trust Engine    │   │      Full-Cycle Cashu eCash Engine   │
│  - Multi-Signal Rule-Based Matrix    │   │  - 1-Click BOLT-11 Minting (NUT-04)  │
│  - Edge-Optimized (< 50ms execution) │   │  - RFC 8949 Binary CBOR Parser (V4)  │
│  - Anti-Sybil Damping Guard (42 pt)  │   │  - Truncated Keyset Auto-Expansion   │
│  - Zero Graph Crashes on Mobile      │   │  - Proof-Swap Claiming & NutZap Inbox│
└──────────────────────────────────────┘   └──────────────────────────────────────┘
                    │                                         │
                    ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Dual Network Engine: Pure P2P ⚡ Fast Edge                     │
│    Toggle between 100% Direct Relay WebSockets & Primal Accelerated Edge Cache   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Dimension | Legacy Web2 Platforms | Standard Nostr Clients | NostrPulse (Freedom Stack) |
| :--- | :--- | :--- | :--- |
| **Identity** | Centralized DB, arbitrary bans | Raw, unranked `npub` keypairs | **Cryptographic Sovereign Keys (`NIP-01/19`) + 5-Pillar Trust Matrix** |
| **Sybil Resistance** | Black-box KYC & phone tracking | Expensive client-side graph traversal | **Deterministic Multi-Signal Rule Matrix with Anti-Sybil Guard** |
| **Value Transfer** | 30% platform tax, frozen payouts | Synchronous Lightning only (NIP-57) | **Dual-Rail: Lightning (NIP-57) + Asynchronous Cashu eCash (NIP-61)** |
| **eCash Lifecycle** | None (Custodial fiat) | Broadcast-only (No receiver flow) | **Full-Cycle: 1-Click Mint ➔ Encrypt ➔ Gossip ➔ Decrypt ➔ Proof Swap** |
| **Network Autonomy** | Proprietary corporate servers | Often hardcoded to single indexer | **Dual-Engine: Instant Switch between Fast Cache & Pure P2P Mode** |

---

## 🥜 Full-Cycle NIP-61 NutZap Implementation (2-Way Flow)

NostrPulse completes the entire economic loop of **NIP-61 (NutZaps)**, enabling both sending and receiving privacy-preserving Chaumian eCash.

```text
SENDER PIPELINE:
[Select Sats] ──► [NUT-04 BOLT-11 Quote] ──► [Settle via WebLN] ──► [Mint Proofs]
       │
       ▼
[NIP-44 v2 E2E Encryption] ──► [Kind 9321 Event Finalization] ──► [Broadcast to Relay Mesh]
                                                                            │
────────────────────────────────────────────────────────────────────────────┼──────────
                                                                            │
RECEIVER PIPELINE (NutZap Inbox):                                           ▼
[Relay Mesh Query: #p=userPubkey] ◄─────────────────────────────────────────┘
       │
       ▼
[NIP-07 / window.nostr.nip44.decrypt] ──► [Payload: { token, memo, amount, mint }]
       │
       ▼
[Mint Keyset Expansion: 16-hex ➔ 66-hex] ──► [NUT-03 / wallet.receive Proof Swap]
       │
       ▼
[Sender Proofs Invalidated] ──► [Recipient Holds Fresh Secret Proofs] ──► [Claim Complete]
```

### 1. Sender Pipeline
* **1-Click In-App Minting via BOLT-11 (NUT-04):** Users specify Satoshi amounts; NostrPulse requests a mint quote from the chosen Cashu mint, presents a lightning invoice via WebLN or QR, polls payment status, and mints raw proofs directly inside the browser.
* **Paste Existing Tokens:** Supports both legacy `cashuA` (V3 Base64 JSON) and next-gen `cashuB` (V4 binary CBOR).
* **NIP-44 v2 Payload Encryption (Front-Running & MEV Immunity):** Cashu tokens are cryptographic **bearer assets**. Broadcasting plain tokens across public relays exposes them to immediate theft by malicious relay operators or scrapers. NostrPulse seals the payload using **NIP-44 v2 ChaCha20-Poly1305 Diffie-Hellman encryption** (with NIP-04 fallback):
  ```typescript
  const secretNutZapPayload = JSON.stringify({
    token: cashuToken.trim(),
    memo: comment?.trim() || "Value-4-Value eCash NutZap 🥜",
    amount: amountSats,
    mint: cleanMint,
    created_at: Math.floor(Date.now() / 1000),
  });
  ```
* **Multi-Relay Gossip Broadcast:** Encrypted Kind 9321 events are signed via NIP-07 (`window.nostr`) or ephemeral key and published concurrently to a resilient relay mesh (`relay.damus.io`, `nos.lol`, `nostr.band`, `purplerelay.com`, `relay.current.fyi`).

#### Protocol Specification: Kind 9321 NutZap Event
```json
{
  "kind": 9321,
  "pubkey": "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
  "created_at": 1725782400,
  "tags": [
    ["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
    ["amount", "21000"],
    ["u", "https://testnut.cashu.space"],
    ["encryption", "nip44"],
    ["alt", "Encrypted NutZap: 21 Sats in Chaumian eCash"]
  ],
  "content": "<base64_nip44_chacha20poly1305_ciphertext>",
  "id": "e4f8...",
  "sig": "b1a2..."
}
```

### 2. Receiver Pipeline (NutZap Inbox)
* **Decentralized Relay Ingestion:** The NutZap Inbox queries open relays for `kinds: [9321]` filtered by `#p: [<userHexPubkey>]` with query timeouts.
* **Client-Side Decryption:** The user clicks **🔓 Decrypt & View Token**, invoking `window.nostr.nip44.decrypt(event.pubkey, event.content)`.
* **Private Memo & Bearer Token Extraction:** Safely displays sender note, amount in sats, origin mint, and decrypted token string.

### 3. Breakthrough: Truncated 16-Hex Keyset Auto-Expansion & 1-Click Swap
In the Cashu V4 CBOR specification (NUT-00), keyset IDs are truncated to 16 hex characters to minimize QR code and payload size. However, Cashu Mint nodes and SDKs (`@cashu/cashu-ts` v4) expect full 66-hex Keyset IDs (e.g. `009a...`), causing standard wallets to throw:
```text
MintOperationError: Inputs: 0, Outputs: 0
```
**NostrPulse engineered an intelligent keyset resolution engine:**
1. Dynamically queries `${cleanMint}/v1/keysets` with a 4s timeout (fallback to wallet keychain cache).
2. Auto-expands truncated 16-hex keyset IDs into full 66-hex IDs by matching keyset prefixes:
   ```typescript
   const normalizedProofs = parsed.proofs.map((proof: any) => {
     const rawId = String(proof.id);
     const fullMatch = mintKeysetIds.find((fullId) => fullId === rawId || fullId.startsWith(rawId));
     return fullMatch && fullMatch !== rawId ? { ...proof, id: fullMatch } : proof;
   });
   ```
3. Preloads the mint keys via `wallet.ensureOperableKeysets(targetKeysets)`.
4. Executes a multi-tier proof swap (`wallet.receive(canonicalFlatToken)` ➔ `wallet.receive(canonicalTokenString)` ➔ `wallet.ops.receive(normalizedProofs).run()`).
5. **Security Result:** The recipient receives brand-new, freshly blinded secret proofs from the mint. The sender's old proofs become permanently SPENT, finalizing the settlement.

### 4. Fail-Closed Double-Spend Protection
* Implements NUT-07 proof state verification (`checkProofsStates`).
* **Enforces Fail-Closed Security:** If the mint is unresponsive or returns an error, the verification fails closed rather than displaying a false positive.
* **Auto-Detection of Claimed Tokens:** When an evaluator or user claims a NutZap, the inbox UI immediately switches to `🔴 SPENT (Already claimed)` and disables the claim action.

---

## ⚡ Custom Zero-Dependency RFC 8949 CBOR Decoder

Next-gen Cashu V4 tokens (`cashuB`) use binary Concise Binary Object Representation (CBOR, RFC 8949) to reduce token payload sizes by 40%. 

Rather than importing heavy npm dependencies that inflate bundle size and expose users to supply-chain attack vectors, NostrPulse includes a **hand-crafted, zero-dependency TypeScript CBOR decoder** in [`src/lib/cashu.ts`](file:///D:/UIT/NamBonUIT/NostrPulse/src/lib/cashu.ts):

* **Pure Browser Primitives:** Built entirely with native `Uint8Array`, `DataView`, and bitwise arithmetic.
* **64-Bit Integer Arithmetic:** Handles 64-bit unsigned integers without BigInt polyfills (`hi * 2**32 + lo`).
* **RFC 8949 Major Types Supported:**
  * Major 0: Unsigned Integers (1, 2, 4, 8 byte headers).
  * Major 1: Negative Integers.
  * Major 2: Byte Strings (`bstr` for keyset IDs, secrets, and blinding keys).
  * Major 3: UTF-8 Text Strings (`tstr` for mint URLs and units).
  * Major 4: Arrays (nested proof sets).
  * Major 5: Key-Value Maps (NUT-00 token dictionaries).
  * Major 7: Booleans, Null, and Special Floats.
* **Zero Supply Chain Risk:** 0 third-party npm packages required for CBOR decoding. Works reliably across all modern browsers, serverless functions, and mobile web views.

---

## 🛡️ Deterministic Multi-Signal Reputation & Anti-Sybil Engine

Rather than executing heavy, memory-intensive graph traversal algorithms (e.g. EigenTrust, full Web-of-Trust matrix operations) that freeze browsers and crash mobile clients, NostrPulse employs an **Edge-Optimized Deterministic Multi-Signal Rule-Based Matrix**. 

It evaluates identity signals in under 50ms per keypair, directly against open Nostr relay data:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      5-PILLAR DETERMINISTIC REPUTATION MATRIX                   │
├──────────────────────┬─────────┬────────────────────────────────────────────────┤
│ Pillar               │ Max Pts │ Verification Signal & Heuristic Rationale      │
├──────────────────────┼─────────┼────────────────────────────────────────────────┤
│ 1. NIP-05 DNS Anchor │ 25 pts  │ Cryptographic DNS binding (nostr.json check)   │
│                      │         │ • Custom Domain: 25 pts                        │
│                      │         │ • Established Provider (primal, alby): 20 pts  │
│                      │         │ • Free/Disposable Gateway: 12 pts              │
├──────────────────────┼─────────┼────────────────────────────────────────────────┤
│ 2. Core Proximity    │ 25 pts  │ Network graph topology & dynamic relay sync    │
│    & NIP-65 Relay    │         │ • Direct Core Seed Key: 25 pts                 │
│                      │         │ • Relay Diversity (+3 pts/relay, max 15)       │
│                      │         │ • NIP-65 Relay List presence: +10 pts          │
├──────────────────────┼─────────┼────────────────────────────────────────────────┤
│ 3. Lightning V4V &   │ 20 pts  │ Economic Value-4-Value endpoint readiness      │
│    LNURL Readiness   │         │ • Active Lightning Address (lud16): 15 pts     │
│                      │         │ • Valid LNURL-pay endpoint (lud06): 5 pts      │
├──────────────────────┼─────────┼────────────────────────────────────────────────┤
│ 4. Keypair Longevity │ 15 pts  │ Age of public key and broadcast consistency    │
│    & Activity        │         │ • Account Age > 1 yr: 8 pts (6 mo: 5, 1 mo: 2)│
│                      │         │ • Recent Note Broadcasts: 7 pts                │
│                      │         │ • Core Seed Keys: Full 15 pts                  │
├──────────────────────┼─────────┼────────────────────────────────────────────────┤
│ 5. Identity Complete │ 15 pts  │ Metadata authenticity & profile entropy        │
│    & Anti-Spam       │         │ • Valid Avatar URL: 5 pts                      │
│                      │         │ • Bio length >= 10 chars: 5 pts                │
│                      │         │ • Sovereign Website URL: 5 pts                 │
│                      │         │ • Anti-Spam Penalty (Hex/npub handle): -10 pts │
└──────────────────────┴─────────┴────────────────────────────────────────────────┘
```

### 🔒 The Anti-Sybil Damping Guard (42-Point Ceiling)
Automated bot farms frequently fabricate complete profiles (avatar, bio, external links) to fool heuristic ranking engines. NostrPulse defeats this vector with an algorithmic **Anti-Sybil Damping Guard**:

```typescript
// Anti-Sybil Guard in src/lib/trust-score.ts
if (!isNip05Verified && networkProximityPoints < 10) {
  if (finalScore > 42) {
    finalScore = 42;
    isSybilDamped = true;
  }
}
```

> [!IMPORTANT]
> Any account that lacks **cryptographic DNS verification (NIP-05)** AND exhibits an **isolated network topology (< 10 proximity points)** is strictly capped at **42 / 100 points**, locking it into the `Unverified / Potential Bot` tier regardless of its cosmetic profile richness.

---

## 📡 Dual Network Engine (Pure P2P vs. Fast Edge Cache)

NostrPulse guarantees censorship resistance through an instant, user-controllable network engine:

```text
               ┌────────────────────────────────────────────────────────┐
               │              DUAL NETWORK ENGINE TOGGLE                │
               └────────────────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        [ ⚡ Fast Cache Mode ]                           [ 🛡️ Pure P2P Mode ]
    Primal Edge Acceleration                         100% Direct Relay WebSockets
    • Sub-second response times                      • Zero third-party API dependencies
    • Global edge CDN caching                        • Direct NIP-01 queries via SimplePool
    • Ideal for high-throughput exploration          • Immune to indexer downtime or censorship
```

* **Pure P2P Mode:** Communicates exclusively via raw WebSockets directly to Nostr relay nodes (`wss://relay.damus.io`, `wss://nos.lol`, `wss://relay.primal.net`, etc.) using `nostr-tools/SimplePool`. No centralized API or proxy ever touches the request.
* **Fast Cache Mode:** Utilizes the high-performance Primal edge caching layer for instant telemetry queries, profile metadata indexing, and global zap feed aggregation.
* **Live UI Controller:** Located in the global navigation bar, providing instantaneous mode toggles with live status badges (`⚡ Fast Cache` vs `🛡️ Pure P2P`).

---

## 📜 Protocol Specifications & NIP Compliance Table

NostrPulse strictly adheres to open standards published by the Nostr and Cashu communities:

| Standard | Category | Description | Implementation Status |
| :--- | :--- | :--- | :---: |
| **NIP-01** | Nostr Core | Event structure, Schnorr signatures, relay WebSocket protocol | ✅ Active |
| **NIP-05** | Nostr Identity | DNS-based internet identifier verification (`/.well-known/nostr.json`) | ✅ Active |
| **NIP-07** | Nostr Signer | Browser extension signing interface (`window.nostr`) | ✅ Active |
| **NIP-19** | Nostr Entities | Bech32 entity encoding/decoding (`npub1`, `nsec1`, `note1`, `nprofile1`) | ✅ Active |
| **NIP-44** | Nostr Privacy | Version 2 payload encryption using ChaCha20-Poly1305 & Diffie-Hellman | ✅ Active |
| **NIP-57** | Nostr Value | Lightning Zaps (`Kind 9734` Zap Request & `Kind 9735` Zap Receipt) | ✅ Active |
| **NIP-61** | Nostr eCash | Encrypted Cashu NutZaps (`Kind 9321` Chaumian token delivery) | ✅ Active |
| **NIP-65** | Nostr Routing | Relay List Metadata (`Kind 10002`) for dynamic outbox gossiping | ✅ Active |
| **NUT-00** | Cashu Protocol | Token specifications: V3 JSON (`cashuA`) and V4 binary CBOR (`cashuB`) | ✅ Active |
| **NUT-01** | Cashu Mint | Mint public keys and keyset retrieval | ✅ Active |
| **NUT-02** | Cashu Mint | Keyset ID discovery and keyset status endpoints (`/v1/keysets`) | ✅ Active |
| **NUT-03** | Cashu Swap | Token swapping and proof exchange for recipient ownership | ✅ Active |
| **NUT-04** | Cashu Minting | In-app minting via Lightning BOLT-11 quotes | ✅ Active |
| **NUT-07** | Cashu State | Token proof spend-state verification (`checkProofsStates`) | ✅ Active |

---

## 🛠️ Codebase Architecture & Key Files

```text
nostr-pulse/
├── src/
│   ├── app/
│   │   ├── p/[npub]/page.tsx        # Profile dashboard, Trust Score breakdown, NutZap Inbox
│   │   ├── compare/page.tsx         # Side-by-side Creator Versus engine
│   │   ├── relays/page.tsx          # Real-time WebSocket relay latency telemetry monitor
│   │   └── api/badge/[npub]/        # Dynamic SVG reputation badge generator
│   ├── components/
│   │   ├── detail/
│   │   │   ├── NutZapInbox.tsx      # NIP-61 Kind 9321 inbox, NIP-44 decrypt & 1-click claim
│   │   │   ├── LightningZapCard.tsx # Dual-rail settlement card: Lightning (NIP-57) + Cashu (NIP-61)
│   │   │   ├── LiveZapFeed.tsx      # Real-time WebSocket client streaming Kind 9735 receipts
│   │   │   └── TrustScoreCard.tsx   # Interactive 5-Pillar reputation matrix breakdown UI
│   │   └── layout/
│   │       ├── Header.tsx           # Global navigation with NIP-07 connect & network switch
│   │       └── NetworkModeToggle.tsx# Real-time Fast Cache vs Pure P2P selector
│   └── lib/
│       ├── cashu.ts                 # Zero-dep CBOR decoder, NutZap pipeline, Keyset expansion
│       ├── trust-score.ts           # 5-Pillar scoring matrix & Anti-Sybil damping guard
│       ├── nip05.ts                 # Cryptographic DNS record verification (.well-known/nostr.json)
│       ├── network-mode.ts          # Dual-network state manager (Fast Edge vs. Pure P2P)
│       └── nostr.ts                 # SimplePool relay manager, NIP-19 decoders, timeout wrappers
```

---

## ⚡ Local Development & Testing Guide

### Prerequisites
* Node.js `>= 18.18.0`
* `npm`, `pnpm`, or `yarn`
* A Nostr browser extension (e.g., [Alby](https://getalby.com/) or [nos2x](https://github.com/nostr-protocol/nos2x))

### 1. Clone & Install
```bash
git clone https://github.com/PHONGUIT22/nostr-pulse.git
cd nostr-pulse
npm install
```

### 2. Verify Open Relay Discovery (Reproducibility Script)
Run the automated relay discovery script to confirm that creator profiles, NIP-05 DNS records, and Lightning addresses are live-crawled directly from open Nostr relays:
```bash
node src/scripts/enrich-creators.mjs
```

### 3. Run Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

### 4. End-to-End NutZap Testing with Cashu Testnut
1. Ensure your browser extension is active with a test Nostr keypair.
2. Visit `http://localhost:3000/p/<your_npub>`.
3. In another tab or browser profile, send a NutZap using **Cashu Testnut** (`https://testnut.cashu.space`) to your test profile.
4. Watch the `nutzap_received` event trigger real-time inbox auto-refresh.
5. Click **🔓 Decrypt & View Token**, then **⚡ Claim to Mint (Swap Proofs)**.
6. Verify your updated proof tokens are held locally and marked `🟢 Claimed & Swapped`.

---

## 🗺️ Roadmap & Future Horizons

* [x] **Phase 1:** Deterministic 5-Pillar Reputation Engine & Anti-Sybil Damping Guard.
* [x] **Phase 2:** NIP-57 Lightning Zap integration with WebLN & live receipt streaming.
* [x] **Phase 3:** Custom zero-dependency RFC 8949 CBOR decoder (`cashuB`).
* [x] **Phase 4:** Full-Cycle NIP-61 NutZap engine: Sending + Receiving Inbox + 1-Click Keyset Expansion & Claim.
* [x] **Phase 5:** Dual Network Engine (Instant switch between Fast Edge Cache & Pure P2P).
* [ ] **Phase 6:** NUT-11 (P2PK) locks for deterministic, recipient-locked eCash NutZaps.
* [ ] **Phase 7:** NIP-90 (Data Vending Machines) for automated AI Agent reputation scoring and micro-payments.
* [ ] **Phase 8:** Standalone `@nostrpulse/sdk` npm package for third-party Nostr and WebLN integrations.

---

## 🛡️ Privacy & Cypherpunk Audit

NostrPulse is engineered in strict accordance with Cypherpunk principles:
* **Zero Tracking & Surveillance:** No Google Analytics, no session trackers, no telemetry pixels.
* **100% Client-Side Cryptographic Execution:** Trust calculations, CBOR decoding, NIP-44 decryption, and token proofs are processed locally in your browser.
* **Non-Custodial Bearer Privacy:** NostrPulse **never** asks for, holds, or transmits private keys (`nsec`). All signing is mediated via NIP-07 extension standards.

---

## ⚖️ License & Disclaimer

Distributed under the **MIT License**. NostrPulse is an independent, non-custodial open-source software project. It does not custody funds, provide banking services, or manage private keys. All Lightning and Cashu operations execute peer-to-peer over decentralized protocol layers.