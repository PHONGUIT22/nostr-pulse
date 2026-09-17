// scripts/test-nwc-pay.ts
/**
 * Test Suite for NIP-47 (NWC) Payment Execution
 * Tests URI parsing, payload encryption/decryption, error guards, and timeout protection.
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
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running NIP-47 NWC Payment & URI Test Suite ===\n");

  // Test 1: URI Parsing (standard NIP-04 URI)
  console.log("[Test 1] Testing parseNWCUri with valid standard URI...");
  const sampleWalletPubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const sampleSecret = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const sampleRelay = "wss://relay.getalby.com/v1";
  const sampleLud16 = "agent@getalby.com";

  const validUri = `nostr+walletconnect://${sampleWalletPubkey}?relay=${encodeURIComponent(
    sampleRelay
  )}&secret=${sampleSecret}&lud16=${encodeURIComponent(sampleLud16)}`;

  const parsed = parseNWCUri(validUri);
  assert(parsed.walletPubkey === sampleWalletPubkey, "Pubkey should match");
  assert(parsed.relayUrls.length === 1 && parsed.relayUrls[0] === sampleRelay, "Relay should match");
  assert(parsed.secret === sampleSecret, "Secret should match");
  assert(parsed.lud16 === sampleLud16, "lud16 should match");
  assert(parsed.encryption === "nip04", "Default encryption should be nip04");
  console.log("--> Passed!");

  // Test 2: URI Parsing with NIP-44 and multiple relays
  console.log("\n[Test 2] Testing parseNWCUri with NIP-44 and multiple relays...");
  const multiRelayUri = `nostr+walletconnect://${sampleWalletPubkey}?relay=wss://relay1.com&relay=wss://relay2.com&secret=${sampleSecret}&encryption=nip44`;
  const parsedMulti = parseNWCUri(multiRelayUri);
  assert(parsedMulti.relayUrls.length === 2, "Should parse 2 relays");
  assert(parsedMulti.encryption === "nip44", "Should parse encryption=nip44");
  console.log("--> Passed!");

  // Test 3: URI format round-trip
  console.log("\n[Test 3] Testing formatNWCUri round-trip...");
  const formatted = formatNWCUri({
    walletPubkey: sampleWalletPubkey,
    relayUrls: [sampleRelay],
    secret: sampleSecret,
    lud16: sampleLud16,
    encryption: "nip44",
  });
  const reParsed = parseNWCUri(formatted);
  assert(reParsed.walletPubkey === sampleWalletPubkey, "Re-parsed pubkey should match");
  assert(reParsed.encryption === "nip44", "Re-parsed encryption should match");
  console.log("--> Passed!");

  // Test 4: Error handling for invalid URIs
  console.log("\n[Test 4] Testing invalid URI error guards...");
  let caught = false;
  try {
    parseNWCUri("https://not-a-nwc-uri.com");
  } catch {
    caught = true;
  }
  assert(caught, "Should reject non-NWC protocol");

  caught = false;
  try {
    parseNWCUri("nostr+walletconnect://invalid-pubkey?relay=wss://relay.com");
  } catch {
    caught = true;
  }
  assert(caught, "Should reject invalid pubkey");

  caught = false;
  try {
    parseNWCUri(`nostr+walletconnect://${sampleWalletPubkey}`);
  } catch {
    caught = true;
  }
  assert(caught, "Should reject URI without relay query parameter");
  console.log("--> Passed!");

  // Test 5: Payload encryption and cross-decryption
  console.log("\n[Test 5] Testing NIP-04 and NIP-44 encryption/decryption...");
  const clientSk = generateSecretKey();
  const clientPk = getPublicKey(clientSk);
  const walletSk = generateSecretKey();
  const walletPk = getPublicKey(walletSk);

  const testPayload = JSON.stringify({ method: "pay_invoice", params: { invoice: "lnbc123" } });

  const enc04 = encryptNWCPayload(testPayload, clientSk, walletPk, "nip04");
  const dec04 = decryptNWCPayload(enc04, walletSk, clientPk, "nip04");
  assert(dec04 === testPayload, "NIP-04 decryption should match");

  const enc44 = encryptNWCPayload(testPayload, clientSk, walletPk, "nip44");
  const dec44 = decryptNWCPayload(enc44, walletSk, clientPk, "nip44");
  assert(dec44 === testPayload, "NIP-44 decryption should match");
  console.log("--> Passed!");

  // Test 6: Input validation on payWithNWC
  console.log("\n[Test 6] Testing payWithNWC input validation...");
  const emptyRes = await payWithNWC({ invoice: "" });
  assert(emptyRes.status === "error", "Empty invoice should return status: 'error'");
  assert(emptyRes.errorCode === "INVALID_INVOICE", "Error code should be 'INVALID_INVOICE'");
  console.log("--> Passed!");

  // Test 7: Timeout guard simulation
  console.log("\n[Test 7] Testing payWithNWC timeout guard (simulated non-responsive wallet)...");
  const mockClientSk = generateSecretKey();
  const mockSecretHex = bytesToHex(mockClientSk);
  const dummyWalletPk = "0000000000000000000000000000000000000000000000000000000000000001";
  const dummyUri = `nostr+walletconnect://${dummyWalletPk}?relay=wss://relay.damus.io&secret=${mockSecretHex}`;

  const startMs = Date.now();
  const timeoutResult = await payWithNWC({
    invoice: "lnbc100n1pj0fakeinvoiceforunresponsivewallet",
    nwcUri: dummyUri,
    timeoutMs: 1200,
  });
  const elapsedMs = Date.now() - startMs;

  assert(
    timeoutResult.status === "timeout" || timeoutResult.status === "error",
    "Should return timeout or error status"
  );
  assert(elapsedMs >= 1000, "Timeout guard should wait for configured timeoutMs");
  console.log(`  Timeout guard fired correctly in ${elapsedMs}ms without hanging!`);
  console.log("--> Passed!");

  console.log("\n=== All NIP-47 NWC Pay Tests Passed Successfully! ===");
}

runTests()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
