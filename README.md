<div align="center">

# ⚡ NostrPulse
### Sovereign Identity Analytics, Anti-Sybil Reputation Engine & Dual-Rail Bitcoin eCash Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-9333EA?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Track](https://img.shields.io/badge/Track_2-Freedom_Stack-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white)](https://bitshala.org)
[![Nostr Protocol](https://img.shields.io/badge/Nostr-NIPs_Compliant-8A2BE2?style=for-the-badge&logo=nostr)](https://github.com/nostr-protocol/nips)
[![Cashu Protocol](https://img.shields.io/badge/Cashu-NUTs_V4_eCash-00D084?style=for-the-badge)](https://cashu.space)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-App_Router-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)

<br />

<p align="center">
  <b>NostrPulse</b> is an open-source analytics dashboard and sovereign trust layer built on top of the <b>Freedom Tech Stack</b> (Nostr + Bitcoin Lightning + Cashu Chaumian eCash). It transforms raw cryptographic keypairs into verifiable reputation metrics while enabling friction-free, offline Value-4-Value micro-settlements.
</p>

<p align="center">
  <a href="https://nostrpulse.vercel.app/"><b>Explore Live Explorer »</b></a> •
  <a href="https://nostrpulse.vercel.app//about"><b>Methodology</b></a> •
  <a href="https://nostrpulse.vercel.app//relays"><b>Relay Telemetry</b></a> •
  <a href="https://nostrpulse.vercel.app//compare"><b>Versus Engine</b></a>
</p>

</div>

---

## 🌐 The Problem & The Freedom Solution

Open protocols like Nostr eliminate centralized deplatforming, but introduce two structural vulnerabilities:
1. **Sybil Attacks & Impersonation:** Generating keypairs (`npub`) costs nothing, making bot farms and impersonation rampant.
2. **Payment Fragility:** Traditional Lightning Zaps (NIP-57) fail if the creator's node goes offline or encounters inbound routing channel bottlenecks.

### Paradigm Shift

| Vector | Legacy Web2 Garden | NostrPulse (Freedom Tech Stack) |
| :--- | :--- | :--- |
| **Identity Control** | Centralized database, arbitrary bans | **Cryptographic Sovereign Keypairs (`NIP-01 / NIP-19`)** |
| **Sybil Resistance** | Black-box KYC & phone tracking | **5-Pillar Deterministic Trust Engine & Web-of-Trust** |
| **Monetization** | 30% platform tax & payout freezes | **0% Intermediary Fee Native Bitcoin Micro-tips** |
| **Settlement Rails** | Synchronous banking rails only | **Dual-Rail: Lightning (NIP-57) + Cashu eCash (NIP-61)** |

---

## 🏛️ Multi-Tier System Pipeline

<table>
  <tr>
    <td width="33%" align="center"><b>1. Identity & Discovery Layer</b></td>
    <td width="33%" align="center"><b>2. Reputation & Anti-Sybil Engine</b></td>
    <td width="33%" align="center"><b>3. Dual-Rail Value Engine</b></td>
  </tr>
  <tr>
    <td>
      • <b>NIP-01:</b> P2P WebSocket relay aggregation<br>
      • <b>NIP-05:</b> Cryptographic DNS record check<br>
      • <b>NIP-07:</b> Extension signer (Alby, nos2x)<br>
      • <b>NIP-65:</b> Dynamic creator relay gossip mesh
    </td>
    <td>
      • <b>5-Pillar Metric Scoring</b> (0–100 pts)<br>
      • <b>Social Graph WoT</b> & seed distance analysis<br>
      • <b>Anti-Sybil Damping Guard:</b> Strict 44-pt cap for unverified keys<br>
      • <b>Real-time Live Telemetry</b>
    </td>
    <td>
      • <b>NIP-57:</b> Lightning Zaps & WebLN auto-dispatch<br>
      • <b>NIP-61:</b> Encrypted Cashu NutZaps (Kind 9321)<br>
      • <b>NIP-44 v2:</b> End-to-end payload encryption<br>
      • <b>NUT-00 v4:</b> Native CBOR parser (<code>cashuB</code>)
    </td>
  </tr>
</table>

---

## 🚀 Key Innovations & Engineering Highlights

### 1. 🛡️ 5-Pillar Cryptographic Trust Score (Anti-Sybil Engine)

NostrPulse calculates an objective 0–100 point reputation index directly from open relay data:

| Pillar | Verification Signal | Max Points |
| :--- | :--- | :---: |
| **Pillar 1** | **NIP-05 Cryptographic DNS Binding:** Validates `.well-known/nostr.json` against the public key (Bonus for custom sovereign domains). | **25 pts** |
| **Pillar 2** | **Web-of-Trust (WoT) Graph Connectivity:** Evaluates proximity to verified protocol seed keys (`jack`, `fiatjaf`, `jb55`, `odell`, etc.). | **25 pts** |
| **Pillar 3** | **Lightning V4V Endpoint:** Verifies live LNURL-pay / `lud16` address and Lightning callback response. | **20 pts** |
| **Pillar 4** | **Keypair Longevity & Multi-Relay Depth:** Assesses age of keypair and replication count across global relays. | **15 pts** |
| **Pillar 5** | **Metadata Richness & Authenticity:** Verifies complete avatar, bio, and valid external domain presence. | **15 pts** |

> [!IMPORTANT]
> **Anti-Sybil Damping Guard:** If an account lacks verified NIP-05 DNS signatures **AND** has an isolated Web-of-Trust graph, its score is **strictly capped at 44 (Tier: Unverified / Potential Bot)**. This permanently neutralizes automated bots that populate fake metadata profiles.

---

### 2. ⚡ Dual-Rail Value-4-Value Settlement (Lightning + Cashu eCash)

A unified micro-transaction interface switching effortlessly between real-time and offline settlement rails:

[ 1-Click In-App Minting & NutZap Pipeline ]
User selects Sats ──► Request NUT-04 Quote ──► Settle via WebLN/QR ──► Poll Mint & Claim Proofs ──► Encrypt NIP-44 ──► Broadcast Kind 9321


* **100% Asynchronous NutZaps (NIP-61):** Tippers can send Chaumian eCash to creators even when the creator's Lightning node is completely offline.
* **Front-Running Defense (NIP-44 v2 Encryption):** Bearer tokens inside `Kind 9321` events are encrypted with the recipient's public key. Relay operators and scrapers cannot steal token proofs in transit.
* **Native NUT-00 V4 CBOR Decoding:** Includes a zero-dependency binary parser compliant with RFC 8949, reading both legacy `cashuA` (JSON Base64) and next-gen `cashuB` (CBOR) tokens.
* **Dynamic Mint Router:** Switch on the fly between **Minibits**, **Macadamia**, **Cashu Testnut**, or any self-hosted Mint endpoint.

---

### 3. 📡 Dynamic Relay Mesh & Live WebSocket Telemetry

* **NIP-65 Gossip Synchronization:** Ingests `Kind 10002` relay lists to query each creator's preferred relay mesh dynamically.
* **Live Latency Benchmark:** Direct client-side WebSocket ping benchmarking across 12+ global relay nodes.
* **Real-time Kind 9735 Stream:** Multi-threaded subscription to public relays streaming live Bitcoin Zaps with instant visual confirmation.

---

### 4. ⚔️ Creator Versus Engine & Embeddable Badges

* **Versus Arena:** Side-by-side metric comparison between any two Nostr profiles (`npub` vs `npub`) across Trust Scores, Lightning capability, and metadata.
* **Embeddable Trust Badges:** Dynamic SVG badges (`/api/badge/[npub]`) ready to embed in GitHub READMEs, blogs, and personal portfolios.

---

## 📜 Protocol Specifications (NIPs & NUTs)

<table>
  <thead>
    <tr>
      <th>Specification</th>
      <th>Standard Description</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>NIP-01</b></td>
      <td>Basic protocol flow, event signing, and multi-relay subscription</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-05</b></td>
      <td>DNS-based internet identifier cryptographic mapping</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-07</b></td>
      <td><code>window.nostr</code> browser extension signer (Alby, nos2x)</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-19</b></td>
      <td>Bech32 entity encoding (<code>npub1</code>, <code>nsec1</code>, <code>note1</code>, <code>nprofile1</code>)</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-44</b></td>
      <td>Versioned end-to-end payload encryption for secure token transport</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-57</b></td>
      <td>Lightning Zaps (<code>Kind 9734</code> Zap Request & <code>Kind 9735</code> Zap Receipt)</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-61</b></td>
      <td>Cashu eCash NutZaps (<code>Kind 9321</code> encrypted Chaumian token delivery)</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NIP-65</b></td>
      <td>Relay List Metadata (<code>Kind 10002</code>) for dynamic outbox routing</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NUT-00</b></td>
      <td>Cashu Cryptography & Token Formats: V3 (JSON) & V4 (CBOR Binary)</td>
      <td>✅ Active</td>
    </tr>
    <tr>
      <td><b>NUT-04</b></td>
      <td>Minting operations via Lightning BOLT-11 quotes</td>
      <td>✅ Active</td>
    </tr>
  </tbody>
</table>

---

## 🛠️ Technology Stack & Architecture

* **Core Framework:** Next.js 16 (App Router, Server Components & Streaming SSR)
* **Language:** TypeScript (Strict type-checking on all cryptographic structures)
* **Styling:** Tailwind CSS v4, Base UI, Lucide Icons
* **Protocol Libraries:** `nostr-tools` (v2.x), `@cashu/cashu-ts` (v4.x), `@noble/hashes`
* **Zero-Buffer Client Engine:** Fully decoupled from Node.js `Buffer` globals using native browser `Uint8Array` primitives for zero-crash cross-browser reliability.
* **Non-Blocking Resilience:** All network queries are wrapped with `AbortSignal.timeout()` and `Promise.race()` fallbacks to eliminate UI freezes.

---

## ⚡ Quickstart & Local Setup

### Prerequisites
* Node.js `>= 18.18.0`
* `npm`, `pnpm`, or `yarn`

### 1. Clone & Install
```bash
git clone [https://github.com/PHONGUIT22/NostrPulse.git](https://github.com/PHONGUIT22/NostrPulse.git)
cd NostrPulse
npm install
2. Run the Development Server
Bash
npm run dev
Open http://localhost:3000 in your browser to explore the live dashboard.

🗺️ Roadmap & Future Horizons
[x] Phase 1: Deterministic 5-Pillar Trust Score Engine & Anti-Sybil Damping Guard.

[x] Phase 2: NIP-57 Lightning Zap integration with WebLN & live receipt streaming.

[x] Phase 3: NIP-61 NutZap dual-mode engine with NUT-00 V4 CBOR decoding & NIP-44 encryption.

[x] Phase 4: NIP-65 dynamic relay synchronization & browser WebSocket telemetry.

[ ] Phase 5: NUT-11 (P2PK) locks for deterministic, recipient-locked eCash NutZaps.

[ ] Phase 6: NIP-90 (Data Vending Machines) for automated AI Agent reputation scoring and micro-payments.

[ ] Phase 7: Standalone @nostrpulse/sdk for seamless integration into third-party Nostr clients.

⚖️ License & Non-Custodial Disclaimer
Distributed under the MIT License. NostrPulse is strictly non-custodial software: it never generates, stores, or requests user private keys (nsec), nor does it take custody of user funds.