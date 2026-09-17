// scripts/test-nip59-encryption.ts
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import {
  EncryptionManager,
  EncryptionMode,
  GIFT_WRAP_KIND,
  NOTIFICATION_KIND,
} from "../src/lib/encryption";

async function main() {
  console.log("=== Testing NIP-59 / NIP-17 Gift Wrap Encryption (EncryptionManager) ===\n");

  // 1. Generate test sender and recipient keypairs
  const senderSk = generateSecretKey();
  const senderPk = getPublicKey(senderSk);
  const senderPrivHex = Buffer.from(senderSk).toString("hex");

  const recipientSk = generateSecretKey();
  const recipientPk = getPublicKey(recipientSk);
  const recipientPrivHex = Buffer.from(recipientSk).toString("hex");

  console.log("Sender pubkey   :", senderPk);
  console.log("Recipient pubkey:", recipientPk);

  // 2. Instantiate EncryptionManager
  const encManager = new EncryptionManager({ mode: EncryptionMode.REQUIRED });
  console.log("\n[Test 1] EncryptionManager mode:", encManager.getEncryptionMode());
  console.log("Is encryption enabled :", encManager.isEncryptionEnabled());
  console.log("Is encryption required:", encManager.isEncryptionRequired());

  // 3. Encrypt message (Rumor -> Seal Kind 13 -> Gift Wrap Kind 1059)
  console.log("\n[Test 2] Encrypting message using 3-layer NIP-59 Gift Wrap...");
  const secretContent = JSON.stringify({
    action: "compute_task",
    payload: { task: "wot_analytics", target: "fiatjaf" },
    timestamp: Date.now(),
  });

  const eventTemplate = {
    kind: 14, // Private Direct Message
    content: secretContent,
    tags: [["p", recipientPk]],
    created_at: Math.floor(Date.now() / 1000),
  };

  const giftWrapped = await encManager.encryptMessage(
    senderPrivHex,
    recipientPk,
    eventTemplate
  );

  if (!giftWrapped) {
    throw new Error("Failed to encrypt message: giftWrapped is null");
  }

  console.log("Outer Gift Wrap Event ID:", giftWrapped.id);
  console.log("Outer Event Kind        :", giftWrapped.kind, `(Expected: ${GIFT_WRAP_KIND})`);
  console.log("Outer Pubkey (Ephemeral):", giftWrapped.pubkey);
  console.log("Outer Tags              :", giftWrapped.tags);

  if (giftWrapped.kind !== GIFT_WRAP_KIND) {
    throw new Error(`Expected kind ${GIFT_WRAP_KIND}, but got ${giftWrapped.kind}`);
  }

  // Check that outer pubkey is NOT the sender pubkey (metadata leak protection)
  if (giftWrapped.pubkey === senderPk) {
    throw new Error("Ephemeral pubkey leaked sender identity on outer gift wrap!");
  }
  console.log("--> Metadata privacy verified: outer pubkey is ephemeral and decoupled from sender!");

  // 4. Decrypt message using recipient private key
  console.log("\n[Test 3] Decrypting Gift Wrap using recipient private key...");
  const decrypted = await encManager.decryptMessage(giftWrapped, recipientPrivHex);

  if (!decrypted) {
    throw new Error("Failed to decrypt message: decrypted is null");
  }

  console.log("Decrypted Sender Pubkey:", decrypted.sender);
  console.log("Decrypted Content      :", decrypted.content);

  if (decrypted.sender !== senderPk) {
    throw new Error(`Expected sender ${senderPk}, but got ${decrypted.sender}`);
  }

  if (decrypted.content.action !== "compute_task") {
    throw new Error("Decrypted payload content does not match original message!");
  }
  console.log("--> 3-layer NIP-59 Decryption successfully verified!");

  // 5. Test encryptNotification
  console.log("\n[Test 4] Testing encryptNotification...");
  const notifEvent = await encManager.encryptNotification(
    senderPrivHex,
    recipientPk,
    "Payment settled: 21 sats eCash delivered"
  );

  if (!notifEvent) {
    throw new Error("encryptNotification failed");
  }

  const decryptedNotif = await encManager.decryptEventAndExtractSender(
    notifEvent,
    recipientPrivHex
  );

  if (!decryptedNotif) {
    throw new Error("Failed to decrypt notification");
  }

  console.log("Decrypted Notification Content:", decryptedNotif.decryptedEvent.content);
  console.log("Notification Sender:", decryptedNotif.sender);
  console.log("--> encryptNotification verified!");

  console.log("\n=== ALL NIP-59 EncryptionManager tests PASSED! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
