# NostrPulse: Decentralized Reputation Engine & Cashu eCash NutZaps

**Track:** Freedom Stack (BOSS Battle - Bitshala)  
**Live App:** [https://nostrpulse.vercel.app](https://nostrpulse.vercel.app)  
**Repository:** [https://github.com/PHONGUIT22/nostr-pulse](https://github.com/PHONGUIT22/nostr-pulse)  

---

### The problem NostrPulse solves

Twitter charges $8 a month to slap a blue checkmark on an account, backed by a corporate database that can ban you tomorrow. Nostr fixes the deplatforming problem by turning identity into cryptographic keypairs. 

That fix created two massive bottlenecks:

1. **Identity is computationally free.** Anyone can spin up 10,000 keys (`npub`) in two seconds for zero satoshis. Scammers clone creator bios, scrape avatars, and spam public relays with fake profiles. On-chain KYC destroys privacy; traditional Web-of-Trust graph algorithms require computing multi-hop connections client-side, which locks up mobile browser tabs.
2. **Lightning tipping is fragile.** Standard Zaps (NIP-57) require synchronous coordination. If a creator’s phone goes to sleep, their node loses power, or their routing channels run out of inbound liquidity, the tip fails immediately. Fans want to send 100 sats; instead, they get a routing timeout.

NostrPulse tackles both problems through local cryptographic validation and asynchronous eCash:

- **Local Anti-Sybil Scoring (< 50ms):** No remote servers, no KYC, and no heavy graph traversals. The browser scores any key (0–100) using NIP-05 DNS signatures, relay gossip diversity (NIP-65), LNURL endpoints, and key age.
- **The 42-Point Anti-Sybil Damping Guard:** Botnets bypass naive reputation engines by filling out extensive bios, avatars, and links. NostrPulse enforces a strict rule: if an identity lacks verified DNS ownership and core network proximity, its score is mathematically clamped at 42 points. Sybil accounts cannot game their way into the "Verified Builder" tier.
- **Two-Way Cashu NutZaps (NIP-61):** Creators do not need to keep a node online 24/7. NostrPulse implements asynchronous Chaumian eCash tips. Sats are wrapped into encrypted Kind 9321 events. The creator can stay offline for weeks; when they log in, they decrypt their inbox with their browser extension and swap the proofs with the mint in one click.
- **Zero-Dependency Core:** Everything runs client-side. Users can toggle between accelerated edge caching and pure P2P WebSocket mode directly to open relays via `SimplePool`.

---

### Challenges I ran into

The hardest bugs did not come from the UI—they came from broken assumptions at the protocol boundary between Nostr, Cashu, and the browser runtime.

#### 1. The 16-Hex vs 66-Hex Keyset ID Mismatch (`Inputs: 0` bug)
This was the most brutal bug in the Cashu redemption flow. 

When claiming an incoming NutZap token, the mint kept throwing `MintOperationError: Inputs: 0, Outputs: 0`. The proofs were valid and unspent, but the swap kept failing silently inside the Cashu SDK.

The bug was an encoding mismatch between specifications:
- Cashu V4 binary tokens (`cashuB`) truncate keyset IDs to 16 hex characters to save space in QR codes and message payloads.
- Mint nodes and `@cashu/cashu-ts` v4 evaluate keysets using full 66-hex character IDs.

Because the IDs did not match, `wallet.receive()` dropped all decoded proofs as invalid before sending the payload to the mint, resulting in an empty proof array. 

Instead of waiting for an upstream SDK patch, I wrote an auto-expansion step inside `claimNutZapToken()`:
Before submitting the swap, the client queries `/v1/keysets` directly from the mint, matches the truncated 16-hex prefix against active 66-hex keysets, normalizes the proofs with the full ID, and feeds a canonical token object into the wallet. Swaps went from 100% failure to settling in under 800ms.

#### 2. Binary CBOR in the Browser Without Supply-Chain Baggage
Next-gen Cashu tokens (`cashuB...`) use binary CBOR encoding (NUT-00). 

Every standard CBOR decoder on npm pulled in Node.js `Buffer` shims, inflating the client bundle by hundreds of kilobytes and throwing `ReferenceError: Buffer is not defined` inside browser web workers. Bringing in heavy polyfills on a page handling cryptographic bearer cash introduced unnecessary supply-chain attack vectors.

I deleted the third-party parsers and built an RFC 8949 binary CBOR decoder from scratch in pure TypeScript (`decodeCbor()`). It runs directly on native `Uint8Array` primitives, decoding unsigned integers, byte arrays, text strings, arrays, and maps using raw bitwise shifts (`initialByte >> 5`). It weighs 80 lines of code, has zero npm dependencies, and parses V4 tokens in sub-milliseconds.

#### 3. Relay Front-Running on Bearer Assets
Cashu proofs are bearer assets. Whoever knows the secret string owns the sats.

Broadcasting raw Cashu tokens over Nostr relays meant malicious relay operators or mempool scrapers could steal the proofs and redeem them at the mint before the recipient even received the WebSocket event.

I enforced mandatory NIP-44 v2 payload encryption for all Kind 9321 NutZaps. The sender generates an ephemeral keypair and computes a Diffie-Hellman shared secret with the recipient's public key. The raw Cashu token never touches relay memory in plaintext. Only the recipient holding the corresponding private key can decrypt the payload and trigger the proof swap.

#### 4. Handling Stale Proofs and Double-Spend Protection
If a user tries to claim an eCash token that was already redeemed, mints return an error. Early implementations showed a generic red error message, which made the app look broken.

I reworked `verifyTokenWithMint()` and `NutZapInbox` to follow a fail-closed model. If proof verification returns `SPENT`, the UI doesn't crash or show a cryptic trace. It converts the state into an educational security indicator: `Double-Spend Protection Active (NUT-07 SPENT)`. It proves to the judge that the Chaumian mint successfully prevented duplicate redemption without compromising the creator's session.
