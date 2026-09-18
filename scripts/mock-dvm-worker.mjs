// scripts/mock-dvm-worker.mjs
// Mock DVM Worker processing both existing and new bounties with Kind 6000 responses
import { SimplePool, finalizeEvent, generateSecretKey } from "nostr-tools";

const pool = new SimplePool();
const relays = [
  "wss://relay.primal.net",
  "wss://nos.lol",
];
const sk = generateSecretKey();
const processedTasks = new Set();

console.log("Mock DVM Worker is listening for Kind 5000 tasks on relays:", relays.join(", "));

const filter = {
  kinds: [5000],
  limit: 50,
};

pool.subscribeMany(relays, filter, {
  onevent(event) {
    if (processedTasks.has(event.id)) {
      return;
    }
    processedTasks.add(event.id);

    console.log(`[DVM] Captured task: ${event.id} from pubkey: ${event.pubkey}`);

    const resultTemplate = {
      kind: 6000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", event.id],
        ["p", event.pubkey],
        ["amount", "21000"],
      ],
      content: JSON.stringify({
        score: 96,
        tier: "Verified Builder",
        summary: "Task computed and verified by NostrPulse DVM.",
        breakdown: [
          { label: "NIP-05 DNS Identity", points: 25, passed: true },
          { label: "Web-of-Trust Connectivity", points: 25, passed: true },
          { label: "Lightning Value-4-Value", points: 20, passed: true },
          { label: "Relay Propagation", points: 15, passed: true },
        ],
      }),
    };

    const signed = finalizeEvent(resultTemplate, sk);
    const pubs = pool.publish(relays, signed);
    Promise.allSettled(pubs).then(() => {
      console.log(`[DVM] Successfully published Kind 6000 result for task: ${event.id}`);
    });
  },
});
