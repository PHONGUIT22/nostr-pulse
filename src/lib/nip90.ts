import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { Event, EventTemplate, VerifiedEvent } from "nostr-tools";
import { getNostrPool, DEFAULT_RELAYS, mergeRelays, normalizeRelayUrl, normalizeToHex } from "@/lib/nostr";

// Verified responsive relays allowlist to prevent connection timeouts from unreachable/dead relays
const RESPONSIVE_RELAYS_ALLOWLIST = new Set<string>([
  "wss://relay.primal.net",
  "wss://nos.lol",
]);

export { DEFAULT_RELAYS };

/**
 * Filters requested relays against the responsive allowlist.
 * If empty or contains no responsive relays, falls back directly to DEFAULT_RELAYS.
 */
export function sanitizeRelays(relays: string[] = []): string[] {
  if (!Array.isArray(relays) || relays.length === 0) {
    return DEFAULT_RELAYS;
  }

  const filtered = relays
    .map((r) => {
      try {
        return normalizeRelayUrl(r);
      } catch (err) {
        console.debug("[NIP-90] Failed to normalize relay URL:", r, err);
        return "";
      }
    })
    .filter((r) => r && RESPONSIVE_RELAYS_ALLOWLIST.has(r));

  return filtered.length > 0 ? Array.from(new Set(filtered)) : DEFAULT_RELAYS;
}

export interface PublishJobRequestParams {
  prompt: string;
  bidSats?: number;
  category?: string;
  relays?: string[];
  secretKey?: Uint8Array | string;
  customSigner?: (draft: EventTemplate) => Promise<Event | VerifiedEvent> | Event | VerifiedEvent;
}

export interface OpenBountyTask {
  id: string;
  pubkey: string;
  created_at: number;
  prompt: string;
  targetPubkey?: string;
  bidSats: number;
  category: string;
  relays: string[];
  rawEvent: Event;
}

export interface JobFeedback {
  id: string;
  workerPubkey: string;
  jobId: string;
  status: "processing" | "payment-required" | "success" | "error" | string;
  message: string;
  bolt11?: string;
  amountMsats?: number;
  rawEvent: Event;
}

export interface JobResult {
  id: string;
  workerPubkey: string;
  jobId: string;
  amountMsats?: number;
  amountSats?: number;
  content: string;
  resultData?: any;
  rawEvent: Event;
}

export interface Nip90Subscription {
  close: () => void;
}

/**
 * Resolves or generates a secret key for signing
 */
function resolveSecretKey(key?: Uint8Array | string): Uint8Array {
  if (key instanceof Uint8Array) return key;
  if (typeof key === "string" && key.trim()) {
    const trimmed = key.trim();
    if (trimmed.startsWith("nsec1")) {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === "nsec") return decoded.data as Uint8Array;
    }
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Uint8Array.from(Buffer.from(trimmed, "hex"));
    }
  }
  return generateSecretKey();
}

/**
 * Parses a Kind 5000 Nostr Event into a structured OpenBountyTask object
 */
export function parseJobRequestEvent(event: Event): OpenBountyTask {
  const inputTag = event.tags.find((t) => t[0] === "i");
  const prompt = inputTag ? inputTag[1] : event.content || "";
  const { hex: targetPubkey } = normalizeToHex(prompt);

  const bidTag = event.tags.find((t) => t[0] === "bid");
  const bidMsats = bidTag ? parseInt(bidTag[1], 10) : 0;
  const bidSats = !isNaN(bidMsats) ? Math.round(bidMsats / 1000) : 0;

  const tTags = event.tags.filter((t) => t[0] === "t").map((t) => t[1]);
  const specificCategory = tTags.find((t) => t && t.toLowerCase() !== "nostrpulse-task");
  const category = specificCategory || tTags[0] || "nostrpulse-task";

  const relaysTag = event.tags.find((t) => t[0] === "relays");
  const rawRelays = relaysTag ? relaysTag.slice(1).filter((r) => typeof r === "string") : [];
  const relays = sanitizeRelays(rawRelays);

  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    prompt,
    targetPubkey: targetPubkey || undefined,
    bidSats,
    category,
    relays,
    rawEvent: event,
  };
}

export function getNip90Pool(): SimplePool {
  return getNostrPool();
}

/**
 * Packages and signs a Kind 5000 NIP-90 Job Request and publishes across relays.
 */
export async function publishJobRequest({
  prompt,
  bidSats = 5,
  category = "trust-score",
  relays = [],
  secretKey,
  customSigner,
}: PublishJobRequestParams): Promise<Event | VerifiedEvent> {
  const targetRelays = sanitizeRelays(relays);
  const { hex: normalizedInput } = normalizeToHex(prompt);

  // Construct NIP-90 Job Request tags
  const tags: string[][] = [
    ["i", normalizedInput || prompt, "text"],
    ["output", "application/json"],
    ["relays", ...targetRelays],
  ];

  if (bidSats > 0) {
    tags.push(["bid", String(bidSats * 1000)]); // NIP-90 bid in millisats
  }

  const cleanCategory = category.trim() || "trust-score";
  tags.push(["t", cleanCategory]);
  if (cleanCategory.toLowerCase() !== "nostrpulse-task") {
    tags.push(["t", "nostrpulse-task"]);
  }

  const template: EventTemplate = {
    kind: 5000,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: prompt,
  };

  let signedEvent: Event | VerifiedEvent;

  if (customSigner) {
    signedEvent = await customSigner(template);
  } else if (
    typeof window !== "undefined" &&
    (window as any).nostr &&
    typeof (window as any).nostr.signEvent === "function" &&
    !secretKey
  ) {
    signedEvent = await (window as any).nostr.signEvent(template);
  } else {
    const sk = resolveSecretKey(secretKey);
    signedEvent = finalizeEvent(template, sk);
  }

  const pool = getNip90Pool();
  const pubs = pool.publish(targetRelays, signedEvent);
  await Promise.allSettled(pubs).then((results) => {
    results.forEach((res, i) => {
      if (res.status === "rejected") {
        console.debug(`[NIP-90] Publish rejected on ${targetRelays[i]}:`, res.reason);
      }
    });
  });

  return signedEvent;
}

/**
 * Retrieves active Kind 5000 open bounty tasks published within the last 24 hours.
 */
export async function fetchOpenBounties(relays: string[] = []): Promise<OpenBountyTask[]> {
  const targetRelays = sanitizeRelays(relays);
  const pool = getNip90Pool();

  const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const filter = {
    kinds: [5000],
    "#t": ["nostrpulse-task"],
    since: oneDayAgo,
  };

  try {
    const events = await pool.querySync(targetRelays, filter, { maxWait: 2500 }).catch((err) => {
      console.debug("[NIP-90] querySync error in fetchOpenBounties:", err);
      return [];
    });

    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    // Deduplicate by event ID and sort descending by created_at
    const seen = new Set<string>();
    const tasks: OpenBountyTask[] = [];

    for (const ev of events) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        tasks.push(parseJobRequestEvent(ev));
      }
    }

    return tasks.sort((a, b) => b.created_at - a.created_at);
  } catch (err) {
    console.debug("[NIP-90] Failed to fetch open bounties:", err);
    return [];
  }
}

/**
 * Subscribes via WebSocket to live Kind 7000 feedback and Kind 6000 result events for a specific job ID.
 */
export function subscribeJobFeedbackAndResult(
  jobId: string,
  onFeedback: (feedback: JobFeedback) => void,
  onResult: (result: JobResult) => void,
  relays: string[] = []
): Nip90Subscription {
  const targetRelays = sanitizeRelays(relays);
  const pool = getNip90Pool();

  const filter = {
    kinds: [6000, 7000],
    "#e": [jobId],
  };

  const sub = pool.subscribeMany(targetRelays, filter, {
    onevent(event: Event) {
      if (event.kind === 7000) {
        const statusTag = event.tags.find((t) => t[0] === "status");
        const amountTag = event.tags.find((t) => t[0] === "amount");
        const bolt11Tag = event.tags.find((t) => t[0] === "bolt11" || t[0] === "invoice");

        const feedback: JobFeedback = {
          id: event.id,
          workerPubkey: event.pubkey,
          jobId,
          status: statusTag ? statusTag[1] : "processing",
          message: event.content || "",
          bolt11: bolt11Tag ? bolt11Tag[1] : undefined,
          amountMsats: amountTag ? parseInt(amountTag[1], 10) : undefined,
          rawEvent: event,
        };

        onFeedback(feedback);
      } else if (event.kind === 6000) {
        const amountTag = event.tags.find((t) => t[0] === "amount");
        const amountMsats = amountTag ? parseInt(amountTag[1], 10) : undefined;
        const amountSats = amountMsats !== undefined ? Math.round(amountMsats / 1000) : undefined;

        let resultData: any = undefined;
        try {
          resultData = JSON.parse(event.content);
        } catch (parseErr) {
          console.debug("[NIP-90] Non-JSON Kind 6000 result payload, using raw text:", parseErr);
          resultData = event.content;
        }

        const result: JobResult = {
          id: event.id,
          workerPubkey: event.pubkey,
          jobId,
          amountMsats,
          amountSats,
          content: event.content,
          resultData,
          rawEvent: event,
        };

        onResult(result);
      }
    },
  });

  return {
    close: () => {
      try {
        sub.close();
      } catch (err) {
        console.debug("[NIP-90] Subscription close warning:", err);
      }
    },
  };
}
