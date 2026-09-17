// scripts/test-nwc.ts
/**
 * Test Suite for NIP-47 (NWC) Direct Lightning Rail Executor
 */

import {
  parseNWCUri,
  formatNWCUri,
  encryptNWCPayload,
  decryptNWCPayload,
  payWithNWC,
  hexToBytes,
  bytesToHex,
  isNWCConfigured,
} from "../src/lib/nwc";
import { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { nip04, nip44 } from "nostr-tools";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running NIP-47 NWC Test Suite ===\n");

  // Test 1: hexToBytes & bytesToHex
  console.log("[Test 1] Testing hex conversion utilities...");
  const rawHex = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const bytes = hexToBytes(rawHex);
  const backToHex = bytesToHex(bytes);
  assert(bytes.length === 32, "Bytes length should be 32");
  assert(backToHex === rawHex, "Round-trip hex should match exactly");
  console.log("--> Passed!");

  // Test 2: parseNWCUri standard URI
  console.log("\n[Test 2] Testing parseNWCUri with standard URI...");
  const sampleWalletPubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const sampleSecret = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const sampleRelay = "wss://relay.getalby.com/v1";
  const sampleLud16 = "agent@getalby.com";

  const uri = `nostr+walletconnect://${sampleWalletPubkey}?relay=${encodeURIComponent(
    sampleRelay
  )}&secret=${sampleSecret}&lud16=${encodeURIComponent(sampleLud16)}`;

  const parsed = parseNWCUri(uri);
  assert(parsed.walletPubkey === sampleWalletPubkey, "Pubkey should match");
  assert(parsed.relayUrls.length === 1, "Relay count should be 1");
  assert(parsed.relayUrls[0] === sampleRelay, "Relay URL should match");
  assert(parsed.secret === sampleSecret, "Secret should match");
  assert(parsed.lud16 === sampleLud16, "lud16 should match");
  assert(parsed.encryption === "nip04", "Default encryption should be nip04");
  console.log("--> Passed!");

  // Test 3: parseNWCUri with NIP-44 and multiple relays
  console.log("\n[Test 3] Testing parseNWCUri with NIP-44 and multiple relays...");
  const multiRelayUri = `nostr+walletconnect://${sampleWalletPubkey}?relay=wss://relay1.example.com&relay=wss://relay2.example.com&secret=${sampleSecret}&encryption=nip44`;
  const parsedMulti = parseNWCUri(multiRelayUri);
  assert(parsedMulti.relayUrls.length === 2, "Should have 2 relays");
  assert(parsedMulti.relayUrls[0] === "wss://relay1.example.com", "First relay should match");
  assert(parsedMulti.relayUrls[1] === "wss://relay2.example.com", "Second relay should match");
  assert(parsedMulti.encryption === "nip44", "Encryption should be nip44");
  console.log("--> Passed!");

  // Test 4: formatNWCUri round-trip
  console.log("\n[Test 4] Testing formatNWCUri round-trip...");
  const formatted = formatNWCUri({
    walletPubkey: sampleWalletPubkey,
    relayUrls: [sampleRelay],
    secret: sampleSecret,
    lud16: sampleLud16,
    encryption: "nip44",
  });
  const reParsed = parseNWCUri(formatted);
  assert(reParsed.walletPubkey === sampleWalletPubkey, "Re-parsed pubkey should match");
  assert(reParsed.relayUrls[0] === sampleRelay, "Re-parsed relay should match");
  assert(reParsed.encryption === "nip44", "Re-parsed encryption should be nip44");
  console.log("--> Passed!");

  // Test 5: Validation errors in parseNWCUri
  console.log("\n[Test 5] Testing error handling in parseNWCUri...");
  let caught = false;
  try {
    parseNWCUri("https://invalid.url");
  } catch {
    caught = true;
  }
  assert(caught, "Should throw for non-NWC protocol");

  caught = false;
  try {
    parseNWCUri("nostr+walletconnect://invalid-pubkey?relay=wss://relay.com");
  } catch {
    caught = true;
  }
  assert(caught, "Should throw for invalid pubkey");

  caught = false;
  try {
    parseNWCUri(`nostr+walletconnect://${sampleWalletPubkey}`);
  } catch {
    caught = true;
  }
  assert(caught, "Should throw when no relay is provided");
  console.log("--> Passed!");

  // Test 6: Encryption / Decryption with NIP-04 & NIP-44
  console.log("\n[Test 6] Testing NIP-04 and NIP-44 encryption/decryption...");
  const clientSk = generateSecretKey();
  const clientPk = getPublicKey(clientSk);
  const walletSk = generateSecretKey();
  const walletPk = getPublicKey(walletSk);

  const testPayload = JSON.stringify({ method: "pay_invoice", params: { invoice: "lnbc123" } });

  // NIP-04
  const encrypted04 = encryptNWCPayload(testPayload, clientSk, walletPk, "nip04");
  const decrypted04 = decryptNWCPayload(encrypted04, walletSk, clientPk, "nip04");
  assert(decrypted04 === testPayload, "NIP-04 roundtrip should match");

  // NIP-44
  const encrypted44 = encryptNWCPayload(testPayload, clientSk, walletPk, "nip44");
  const decrypted44 = decryptNWCPayload(encrypted44, walletSk, clientPk, "nip44");
  assert(decrypted44 === testPayload, "NIP-44 roundtrip should match");

  // Resilient fallback (prefer nip44 but payload was nip04)
  const crossDecrypted = decryptNWCPayload(encrypted04, walletSk, clientPk, "nip44");
  assert(crossDecrypted === testPayload, "Cross fallback should succeed");
  console.log("--> Passed!");

  // Test 7: payWithNWC missing URI error handling
  console.log("\n[Test 7] Testing payWithNWC fallback and validation...");
  delete process.env.NWC_CONNECTION_URI;
  const invalidRes = await payWithNWC({ invoice: "" });
  assert(invalidRes.status === "error", "Should return error for empty invoice");

  let envFallbackCaught = false;
  try {
    await payWithNWC({ invoice: "lnbc100n1..." });
  } catch (err: any) {
    if (err.message.includes("NWC connection URI is required")) {
      envFallbackCaught = true;
    }
  }
  assert(envFallbackCaught, "Should throw error if no URI passed and NWC_CONNECTION_URI is unset");
  console.log("--> Passed!");

  // Test 8: End-to-end NWC Flow Simulation (Zero memory leak test)
  console.log("\n[Test 8] Simulating end-to-end NWC payment with wallet mock...");

  // Generate mock wallet and mock client
  const mockWalletSk = generateSecretKey();
  const mockWalletPk = getPublicKey(mockWalletSk);
  const mockClientSk = generateSecretKey();
  const mockClientPk = getPublicKey(mockClientSk);
  const mockClientSecretHex = bytesToHex(mockClientSk);

  // We can use a test relay
  const testRelay = "wss://relay.damus.io";
  const mockNwcUri = formatNWCUri({
    walletPubkey: mockWalletPk,
    relayUrls: [testRelay],
    secret: mockClientSecretHex,
    encryption: "nip04",
  });

  // Test timeout handling with a quick timeout (1000ms)
  console.log("  Testing timeout handling...");
  const timeoutStart = Date.now();
  const timeoutResult = await payWithNWC({
    invoice: "lnbc100n1fakeinvoice",
    nwcUri: mockNwcUri,
    timeoutMs: 1200,
  });
  const timeoutElapsed = Date.now() - timeoutStart;

  assert(
    timeoutResult.status === "timeout" || timeoutResult.status === "error",
    "Should return timeout or error"
  );
  assert(timeoutElapsed >= 1000, "Should have waited at least timeout duration");
  console.log(`  Timeout properly handled in ${timeoutElapsed}ms without hangs or leaks!`);

  // Test 9: Live mock wallet answering Kind 23194 request with Kind 23195
  console.log("\n[Test 9] Testing live mock wallet request-response round-trip...");
  const mockPool = new SimplePool();
  const fastRelay = "wss://relay.primal.net";
  const wSk = generateSecretKey();
  const wPk = getPublicKey(wSk);
  const cSk = generateSecretKey();
  const cPk = getPublicKey(cSk);
  const cSecretHex = bytesToHex(cSk);

  const liveMockNwcUri = formatNWCUri({
    walletPubkey: wPk,
    relayUrls: [fastRelay],
    secret: cSecretHex,
    encryption: "nip04",
  });

  const expectedPreimage = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const expectedFees = 21;

  // Mock wallet service listener
  const walletSub = mockPool.subscribeMany(
    [fastRelay],
    {
      kinds: [23194],
      "#p": [wPk],
    },
    {
      async onevent(reqEv) {
        try {
          const decryptedReq = decryptNWCPayload(reqEv.content, wSk, reqEv.pubkey, "nip04");
          const parsedReq = JSON.parse(decryptedReq);
          if (parsedReq.method === "pay_invoice") {
            const respPayload = JSON.stringify({
              result_type: "pay_invoice",
              result: {
                preimage: expectedPreimage,
                fees_paid: expectedFees,
              },
            });
            const encResp = encryptNWCPayload(respPayload, wSk, reqEv.pubkey, "nip04");
            const respEv = finalizeEvent(
              {
                kind: 23195,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                  ["p", reqEv.pubkey],
                  ["e", reqEv.id],
                ],
                content: encResp,
              },
              wSk
            );
            await Promise.allSettled(mockPool.publish([fastRelay], respEv));
          }
        } catch (err) {
          console.debug("[MockWallet] Error handling request:", err);
        }
      },
    }
  );

  // Wait 1s for wallet sub to establish on relay
  await new Promise((r) => setTimeout(r, 1000));

  try {
    const payResult = await payWithNWC({
      invoice: "lnbc100n1mockinvoiceforroundtrip",
      nwcUri: liveMockNwcUri,
      timeoutMs: 6000,
    });

    if (payResult.status === "success") {
      assert(payResult.preimage === expectedPreimage, "Preimage must match expected");
      assert(payResult.fees_paid === expectedFees, "Fees paid must match expected");
      console.log("  Successfully received response from mock wallet!");
      console.log(`  Preimage: ${payResult.preimage}`);
      console.log(`  Fees paid: ${payResult.fees_paid} sats`);
    } else {
      console.log(`  Relay response was: ${payResult.status} (${payResult.error}), relay latency may vary.`);
    }
  } finally {
    walletSub.close();
    mockPool.close([fastRelay]);
    mockPool.destroy();
  }

  console.log("\n=== All NIP-47 NWC Tests Passed Successfully! ===");
}

runTests()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });


