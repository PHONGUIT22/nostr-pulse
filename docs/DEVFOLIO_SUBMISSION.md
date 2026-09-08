# ⚡ NostrPulse: Devfolio Project Submission Copy
**Track:** Track 2: Freedom Stack (BOSS Battle - Bitshala)  
**Project URL:** [nostrpulse.vercel.app](https://nostrpulse.vercel.app)  
**Repository:** [github.com/PHONGUIT22/nostr-pulse](https://github.com/PHONGUIT22/nostr-pulse)  

---

## 📌 Field 1: The problem NostrPulse solves

Decentralized social protocols like Nostr fix censorship, but they come with two real-world headaches for anyone trying to build actual products:

1. **Identity spam & fake accounts:** Anyone can spin up 10,000 Nostr keys (`npub`) in seconds for zero cost. Bots and scammers easily impersonate creators, spam public relays, and trick followers. Traditional Web-of-Trust graph traversals sound great on paper, but in practice, doing multi-hop graph math client-side freezes mobile browsers and crashes tabs.
2. **Broken micro-tipping flows:** Standard Lightning Zaps (NIP-57) require the creator's Lightning node to be online with open inbound channels. If their routing node drops or runs out of liquidity, tips just fail. On the other hand, newer Cashu eCash proposals (NIP-61 NutZaps) have mostly been built as one-way broadcasts: tippers blast ecash onto relays, but there was no actual inbox or web interface for the recipient to decrypt, view, and claim those tokens into their own wallet.

### What NostrPulse does:
- **Fast, local trust scoring (< 50ms):** Instead of heavy graph calculations that kill performance, NostrPulse runs a rule-based engine directly in the browser. It scores keys (0–100) using cryptographic DNS checks (NIP-05), relay diversity (NIP-65), wallet endpoints (`lud16`), and key age. If an account has no verified domain and zero network proximity, its score is strictly capped at 42 to stop bot farms from faking a high rank through surface-level profile info.
- **Full-cycle 2-way eCash NutZaps (NIP-61):** Creators don't need an online Lightning node to receive money. NostrPulse supports both sending and receiving Cashu eCash. In the NutZap Inbox, creators see incoming Kind 9321 events, decrypt them locally with their Nostr extension (NIP-44 v2), and swap proofs directly with the Mint in 1 click so the sender can't double-spend the token later.
- **Pure P2P fallback:** A simple toggle in the header lets users switch from the fast edge cache to 100% direct WebSocket connections to relays (`SimplePool`), ensuring the app still works even if third-party indexers go down.

---

## 🛠️ Field 2: Challenges I ran into

Building at the intersection of Nostr, Lightning, and Cashu meant dealing with breaking spec changes and undocumented edge cases:

1. **Parsing Cashu V4 binary CBOR (`cashuB`) without bloating the client:**
Cashu V4 tokens use CBOR encoding instead of Base64 JSON to keep payloads compact. Most existing npm CBOR packages depend on Node's `Buffer` or heavy polyfills that blew up the client bundle and threw runtime errors in browser environments. To keep the app fast and dependency-free, I wrote a lightweight RFC 8949 binary CBOR decoder in pure TypeScript using native `Uint8Array` and bitwise operations. It parses nested maps, byte arrays, and 64-bit integers without external libraries.

2. **The 16-hex vs 66-hex Keyset ID mismatch (`Inputs: 0` error):**
This was the nastiest bug during eCash claiming. Cashu V4 CBOR tokens truncate keyset IDs to 16 hex characters to save space, but Mint nodes and `@cashu/cashu-ts` v4 expect the full 66-hex ID. When passing the decoded token into `wallet.receive()`, the SDK failed to match the keyset, stripped all proofs as invalid, and sent an empty payload to the Mint, throwing `MintOperationError: Inputs: 0, Outputs: 0`. To fix this, I added an auto-resolution step before claiming: the app fetches `/v1/keysets` from the mint, matches the 16-hex prefix to the full 66-hex keyset ID, and wraps it into a clean flat token structure before swapping.

3. **Completing the receiver flow for NIP-61:**
Most existing NutZap experiments only handle sending tokens. Making the receiving side work reliably took significant effort: querying open relays for Kind 9321 events tagged with the creator's pubkey, hooking into `window.nostr.nip44.decrypt` for client-side decryption, and implementing direct mint proof-swapping (`wallet.receive`) to invalidate the sender's secrets and issue fresh proofs to the receiver.

4. **Relay drops and UI synchronization:**
Early tests showed that `pool.publish()` was dropping events because socket connections were getting closed prematurely by promise races before relays acknowledged the write. Additionally, some caching relays simply ignore custom event kinds like 9321. I resolved this by broadcasting to a dedicated set of open indexing relays (`relay.damus.io`, `nos.lol`, `nostr.band`, `purplerelay.com`), handling publish promises with proper timeouts, and dispatching local browser events to auto-refresh the inbox immediately after a zap is sent.

5. **Eliminating false-positive token states:**
Initially, if a mint took too long to verify proof spend states, the UI defaulted to assuming the token was unspent. This led to confusing errors when users tried to claim tokens that were already spent. I refactored the verification logic to fail-closed: if the mint doesn't explicitly confirm the proofs are valid, or if an error is caught during swap, the UI immediately marks it as `SPENT` and disables the claim button.
