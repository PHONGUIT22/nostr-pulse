# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Purpose
NostrPulse eliminates identity spam, bot farms, and fragile micro-tipping on open decentralized protocols (Freedom Tech Stack: Nostr + Bitcoin Lightning + Cashu Chaumian eCash). It transforms raw cryptographic keypairs into verifiable, Sybil-resistant reputation metrics while enabling asynchronous, offline Value-4-Value eCash settlements without custodial intermediaries.

## Target Users & Jobs-to-be-Done
- **Hackathon Judges & Protocol Evaluators:** Rapidly inspect and stress-test the Freedom Tech stack—evaluating local Anti-Sybil trust scoring (< 50ms) and the full-cycle NIP-61 eCash NutZap flow (minting, zero-dependency CBOR decoding, NIP-44 v2 decryption, and atomic proof-swapping) in under 2 minutes without spending real Bitcoin or installing mandatory extensions.
- **Nostr Creators & Builders:** Inspect their cryptographic identity score (0–100), showcase verified NIP-05 DNS badges, embed portable trust badges on external sites, and receive offline Chaumian eCash tips into a decentralized inbox that they can decrypt and swap when online.
- **Supporters & Tippers:** Support creators frictionlessly without routing failures, node downtime, or channel liquidity bottlenecks common in synchronous Lightning network hops.

## Core Capabilities
- **Local Deterministic Trust Matrix (< 50ms):** Pure client-side rule-based trust calculation across 5 pillars: NIP-05 Cryptographic DNS Verification, Core Network Proximity & Graph Signal, Lightning V4V Readiness, Account Longevity & Broadcast Activity, and Identity Completeness & Profile Entropy.
- **The 42-Point Anti-Sybil Damping Guard:** Prevents botnets and clones from gaming superficial profile metadata. Unverified identities with isolated network proximity are strictly clamped at 42 points, barring them from the "Verified Builder" tier.
- **Full-Cycle NIP-61 eCash NutZaps:** Dual-rail settlement supporting both WebLN Lightning Zaps (NIP-57) and asynchronous Cashu eCash NutZaps (Kind 9321). Features custom zero-dependency RFC 8949 binary CBOR decoding (`cashuB`), NIP-44 v2 E2E encryption, truncated 16-hex keyset ID expansion, and direct mint proof-swapping (`wallet.receive`).
- **Dual Network Transport Engine:** Seamless toggle in the header between Fast Edge Cache (accelerated telemetry via Primal edge) and Pure P2P Mode (100% direct WebSocket connections via `SimplePool` to decentralized relays).
- **Creator Profile, Leaderboard & Compare Arena:** Comprehensive identity inspector (`/p/[npub]`), curated ecosystem leaderboard, head-to-head comparison arena (`/compare`), and live decentralized relay telemetry (`/relays`).

## Operating Context & Product Stage
- **Current Stage:** Live hackathon prototype and production demonstration (Bitshala BOSS Battle - Track 2: Freedom Stack) hosted on Vercel, integrating live open Nostr relays and Cashu Testnut mint, transitioning into a production sovereign identity suite.
- **Operating Environments:** Modern web browsers with support for WebSockets, Web Cryptography API, and optional NIP-07 browser signers (Alby, nos2x).

## Durable Constraints & Commitments
- **Zero-Server Dependency for Core Crypto:** All cryptographic operations (CBOR decoding, NIP-44 v2 encryption/decryption, proof management, trust matrix calculation) execute client-side in the user's browser.
- **Privacy & Sovereign Principles:** Strict zero on-chain KYC or centralized identity databases. Pure cryptographic verification tied to DNS signatures and Nostr relays.
- **Fail-Closed Double-Spend Protection:** Stale or spent eCash proofs fail closed (NUT-07 SPENT) with clear security indicators rather than silent failures.
- **Deterministic Transparency:** Trust score breakdown is fully transparent and explainable with clear point allocations across all 5 verification signals.

## Terminology
- **npub:** Bech32-encoded Nostr public key.
- **NIP-05:** Cryptographic DNS identity verification mapping handle to Nostr public key via `/.well-known/nostr.json`.
- **NIP-44 v2:** ChaCha20-Poly1305 authenticated end-to-end encryption for Nostr.
- **NIP-61 (NutZap):** Asynchronous Chaumian eCash micropayments sent over Nostr relays as Kind 9321 events.
- **Cashu (`cashuB`):** Privacy-preserving Chaumian eCash protocol utilizing blind signatures and binary CBOR serialization.
- **Seed Keys:** Hardcoded reputable Nostr builders and protocol founders used as graph anchor points for network proximity calculations.
