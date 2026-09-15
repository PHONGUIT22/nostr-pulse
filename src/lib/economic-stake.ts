// src/lib/economic-stake.ts
import { SimplePool } from "nostr-tools/pool";
import { normalizePubkey, encodeNpub, getWebOfTrustDistance } from "./wot";

/**
 * Parsed representation of a Kind 9735 Zap Receipt event.
 */
export interface ParsedZapReceipt {
  /** Event ID of the Kind 9735 receipt */
  id: string;
  /** Public key of the recipient (target) */
  recipientPubkey: string;
  /** Public key of the sender (extracted from Kind 9734 zap request) */
  senderPubkey: string;
  /** Amount transferred in Satoshis */
  amountSats: number;
  /** Optional payment preimage proving cryptographic settlement */
  preimage?: string;
  /** Optional bolt11 invoice string */
  bolt11?: string;
  /** Comment / message included with the zap */
  comment?: string;
  /** Timestamp when the zap receipt was emitted */
  createdAt: number;
}

/**
 * Individual verified sender contributing to economic stake.
 */
export interface ValidZapSender {
  pubkey: string;
  npub: string;
  totalSats: number;
  zapsCount: number;
  wotDistance: number;
  wotPoints: number;
}

/**
 * Individual filtered sender flagged as Sybil or self-zapping.
 */
export interface FilteredZapSender {
  pubkey: string;
  npub: string;
  totalSats: number;
  zapsCount: number;
  reason: string;
}

/**
 * Result structure returned by Economic Stake calculations.
 */
export interface EconomicStakeResult {
  /** 64-character lowercase hex public key of the target */
  targetPubkey: string;
  /** Total count of all Zap receipts received */
  totalZapsReceived: number;
  /** Count of zaps accepted from senders with WoT > 0 */
  validZapsCount: number;
  /** Count of zaps filtered out (senders with WoT == 0 or self-zaps) */
  filteredSybilZapsCount: number;
  /** Total satoshis received from legitimate Web-of-Trust participants */
  totalValidSats: number;
  /** Total satoshis filtered out from Sybil/clone accounts */
  totalFilteredSats: number;
  /** Multiplier constant K applied to log10 */
  kFactor: number;
  /** Raw Economic Stake Score: log10(totalValidSats + 1) * K */
  zapScore: number;
  /** Normalized points allocated toward Pillar 3 (0 to 10 points ceiling) */
  economicPoints: number;
  /** Aggregated list of valid Web-of-Trust zap senders */
  validSenders: ValidZapSender[];
  /** Aggregated list of filtered Sybil/clone zap senders */
  filteredSenders: FilteredZapSender[];
}

/**
 * Parses a raw Kind 9735 Zap Receipt event into a structured ParsedZapReceipt.
 * Extracts the real sender pubkey and amount from the embedded Kind 9734 Zap Request.
 *
 * @param event - Raw Nostr event (Kind 9735)
 * @returns ParsedZapReceipt or null if malformed
 */
export function parseZapReceipt(event: any): ParsedZapReceipt | null {
  if (!event || event.kind !== 9735 || !Array.isArray(event.tags)) {
    return null;
  }

  // 1. Recipient public key from 'p' tag
  const pTag = event.tags.find((t: any) => t[0] === "p" && t[1]);
  if (!pTag) return null;
  const recipientPubkey = normalizePubkey(pTag[1]);
  if (!recipientPubkey) return null;

  // 2. Preimage and bolt11 invoice
  const preimageTag = event.tags.find((t: any) => t[0] === "preimage" && t[1]);
  const preimage = preimageTag ? preimageTag[1] : undefined;

  const bolt11Tag = event.tags.find((t: any) => t[0] === "bolt11" && t[1]);
  const bolt11 = bolt11Tag ? bolt11Tag[1] : undefined;

  // 3. Sender and Amount from embedded Kind 9734 Zap Request inside 'description' tag
  let senderPubkey = "";
  let amountSats = 0;
  let comment = "";

  const descTag = event.tags.find((t: any) => t[0] === "description" && t[1]);
  if (descTag && typeof descTag[1] === "string") {
    try {
      const zapRequest = JSON.parse(descTag[1]);
      if (zapRequest && typeof zapRequest === "object") {
        if (zapRequest.pubkey && typeof zapRequest.pubkey === "string") {
          senderPubkey = normalizePubkey(zapRequest.pubkey) || "";
        }
        if (typeof zapRequest.content === "string") {
          comment = zapRequest.content;
        }
        if (Array.isArray(zapRequest.tags)) {
          const amtTag = zapRequest.tags.find((t: any) => t[0] === "amount" && t[1]);
          if (amtTag && !isNaN(Number(amtTag[1]))) {
            // NIP-57 amount tag is in millisats
            amountSats = Math.round(Number(amtTag[1]) / 1000);
          }
        }
      }
    } catch {
      // Malformed description JSON
    }
  }

  // Fallback: If description didn't provide sender, check uppercase 'P' tag (NIP-57 sender tag)
  if (!senderPubkey) {
    const uppercasePTag = event.tags.find((t: any) => t[0] === "P" && t[1]);
    if (uppercasePTag) {
      senderPubkey = normalizePubkey(uppercasePTag[1]) || "";
    }
  }

  // If sender could not be resolved, fallback to the receipt's author
  if (!senderPubkey && event.pubkey) {
    senderPubkey = normalizePubkey(event.pubkey) || "";
  }

  // If amount was not in zap request, attempt to estimate from fallback (default 21 sats)
  if (amountSats <= 0) {
    amountSats = 21;
  }

  return {
    id: event.id,
    recipientPubkey,
    senderPubkey,
    amountSats,
    preimage,
    bolt11,
    comment,
    createdAt: event.created_at || Math.floor(Date.now() / 1000),
  };
}

/**
 * Calculates the Sats-Weighted In-Degree Economic Stake score for a target pubkey.
 *
 * Formula:
 *   Score_Zap = log10(Total Valid Sats + 1) * K
 *
 * Enforces strict Sybil resistance:
 * - Senders with WoT score == 0 (distance > 2) are filtered out as Sybil clones.
 * - Self-zapping (sender === target) is completely discarded.
 * - Only sats from senders with proven WoT score > 0 contribute to the score.
 *
 * @param targetPubkey - Target public key (hex or npub)
 * @param receipts - Array of raw or parsed zap receipt events
 * @param options - Optional calculation parameters (kFactor, maxPoints)
 * @returns EconomicStakeResult
 */
export function calculateEconomicStake(
  targetPubkey: string,
  receipts: (ParsedZapReceipt | any)[],
  options?: { kFactor?: number; maxPoints?: number }
): EconomicStakeResult {
  const targetHex = normalizePubkey(targetPubkey) || "";
  const kFactor = options?.kFactor ?? 2.0;
  const maxPoints = options?.maxPoints ?? 10;

  if (!targetHex || !Array.isArray(receipts) || receipts.length === 0) {
    return {
      targetPubkey: targetHex,
      totalZapsReceived: 0,
      validZapsCount: 0,
      filteredSybilZapsCount: 0,
      totalValidSats: 0,
      totalFilteredSats: 0,
      kFactor,
      zapScore: 0,
      economicPoints: 0,
      validSenders: [],
      filteredSenders: [],
    };
  }

  // Map to aggregate sats per sender
  const validSendersMap = new Map<string, { totalSats: number; count: number; wotDistance: number; wotPoints: number }>();
  const filteredSendersMap = new Map<string, { totalSats: number; count: number; reason: string }>();

  let totalValidSats = 0;
  let totalFilteredSats = 0;
  let validZapsCount = 0;
  let filteredSybilZapsCount = 0;

  for (const raw of receipts) {
    const zap = raw.recipientPubkey && raw.amountSats ? (raw as ParsedZapReceipt) : parseZapReceipt(raw);
    if (!zap) continue;

    const senderHex = zap.senderPubkey;
    const sats = zap.amountSats;

    // Edge Case 1: Self-zapping wash trade
    if (senderHex === targetHex) {
      filteredSybilZapsCount++;
      totalFilteredSats += sats;
      const existing = filteredSendersMap.get(senderHex) || { totalSats: 0, count: 0, reason: "Self-zap loop detected" };
      existing.totalSats += sats;
      existing.count += 1;
      filteredSendersMap.set(senderHex, existing);
      continue;
    }

    // Edge Case 2: Evaluate sender Web-of-Trust score
    const senderWot = getWebOfTrustDistance(senderHex);
    const hasValidWot = senderWot.wotPoints > 0;

    if (hasValidWot) {
      // Legitimate economic stake from a verified WoT participant
      validZapsCount++;
      totalValidSats += sats;

      const existing = validSendersMap.get(senderHex) || {
        totalSats: 0,
        count: 0,
        wotDistance: senderWot.distance,
        wotPoints: senderWot.wotPoints,
      };
      existing.totalSats += sats;
      existing.count += 1;
      validSendersMap.set(senderHex, existing);
    } else {
      // Filtered out: Sybil clone or isolated account with WoT == 0
      filteredSybilZapsCount++;
      totalFilteredSats += sats;

      const existing = filteredSendersMap.get(senderHex) || {
        totalSats: 0,
        count: 0,
        reason: "Sender has WoT score of 0 (Isolated / Sybil risk)",
      };
      existing.totalSats += sats;
      existing.count += 1;
      filteredSendersMap.set(senderHex, existing);
    }
  }

  // Formula: Score_Zap = log10(Total Valid Sats + 1) * K
  const rawZapScore = Math.log10(totalValidSats + 1) * kFactor;
  const zapScore = Math.round(rawZapScore * 100) / 100;

  // Normalized economic points for TrustScore Pillar 3 (ceiling at maxPoints, default 10)
  const economicPoints = Math.min(maxPoints, Math.round(zapScore));

  // Convert sender maps to sorted arrays
  const validSenders: ValidZapSender[] = Array.from(validSendersMap.entries())
    .map(([pubkey, data]) => ({
      pubkey,
      npub: encodeNpub(pubkey),
      totalSats: data.totalSats,
      zapsCount: data.count,
      wotDistance: data.wotDistance,
      wotPoints: data.wotPoints,
    }))
    .sort((a, b) => b.totalSats - a.totalSats);

  const filteredSenders: FilteredZapSender[] = Array.from(filteredSendersMap.entries())
    .map(([pubkey, data]) => ({
      pubkey,
      npub: encodeNpub(pubkey),
      totalSats: data.totalSats,
      zapsCount: data.count,
      reason: data.reason,
    }))
    .sort((a, b) => b.totalSats - a.totalSats);

  return {
    targetPubkey: targetHex,
    totalZapsReceived: validZapsCount + filteredSybilZapsCount,
    validZapsCount,
    filteredSybilZapsCount,
    totalValidSats,
    totalFilteredSats,
    kFactor,
    zapScore,
    economicPoints,
    validSenders,
    filteredSenders,
  };
}

/**
 * Queries Kind 9735 Zap Receipts for a target public key from relay pool.
 * Enforces strict performance timeout <= 3000ms using Promise.race.
 *
 * @param targetPubkey - Target public key in hex or npub
 * @param relays - Array of Nostr relay URLs
 * @param limit - Maximum number of receipts to query (default: 60)
 * @param timeoutMs - Maximum timeout in milliseconds (capped at 3000ms)
 * @returns Promise<ParsedZapReceipt[]>
 */
export async function queryZapReceipts(
  targetPubkey: string,
  relays: string[] = ["wss://relay.primal.net", "wss://nos.lol", "wss://relay.damus.io"],
  limit = 60,
  timeoutMs = 3000
): Promise<ParsedZapReceipt[]> {
  const hex = normalizePubkey(targetPubkey);
  if (!hex) return [];

  const effectiveTimeout = Math.min(3000, Math.max(500, timeoutMs));
  const pool = new SimplePool();

  try {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), effectiveTimeout)
    );

    const queryPromise = pool.querySync(
      relays,
      { kinds: [9735], "#p": [hex], limit },
      { maxWait: effectiveTimeout }
    );

    const events = await Promise.race([queryPromise, timeoutPromise]);

    if (Array.isArray(events)) {
      const parsedList: ParsedZapReceipt[] = [];
      for (const ev of events) {
        const parsed = parseZapReceipt(ev);
        if (parsed) {
          parsedList.push(parsed);
        }
      }
      return parsedList;
    }
    return [];
  } catch (err) {
    console.warn(`[EconomicStake] queryZapReceipts failed for ${hex}:`, err);
    return [];
  } finally {
    try {
      pool.close(relays);
    } catch {
      // Ignore pool close errors
    }
  }
}

/**
 * Asynchronously fetches and computes the complete Economic Stake metrics for a target public key.
 *
 * @param targetPubkey - Target public key
 * @param options - Relays, timeout, and calculation options
 * @returns Promise<EconomicStakeResult>
 */
export async function fetchEconomicStake(
  targetPubkey: string,
  options?: { relays?: string[]; limit?: number; timeoutMs?: number; kFactor?: number }
): Promise<EconomicStakeResult> {
  const hex = normalizePubkey(targetPubkey);
  if (!hex) {
    return calculateEconomicStake("", []);
  }

  const receipts = await queryZapReceipts(
    hex,
    options?.relays,
    options?.limit ?? 60,
    options?.timeoutMs ?? 3000
  );

  // If relay WebSocket returned no receipts (timeout/disconnected), fallback to SQLite DB cache
  // to prevent trust scores from dropping to 0 for well-known anchors
  if (receipts.length === 0) {
    try {
      const { getZapTotalsFromDb } = await import("@/lib/db");
      const dbRow = await getZapTotalsFromDb(hex);
      if (dbRow && (dbRow.total_sats > 0 || dbRow.valid_sender_sats > 0)) {
        const kFactor = options?.kFactor ?? 2.0;
        const validSats = dbRow.valid_sender_sats || 0;
        const filteredSats = Math.max(0, (dbRow.total_sats || 0) - validSats);
        const zapScore = validSats > 0 ? Math.log10(validSats + 1) * kFactor : 0;
        const economicPoints = Math.min(Math.round(zapScore * 10) / 10, 10);

        return {
          targetPubkey: hex,
          totalZapsReceived: 1, // DB aggregate, exact count unavailable
          validZapsCount: validSats > 0 ? 1 : 0,
          filteredSybilZapsCount: filteredSats > 0 ? 1 : 0,
          totalValidSats: validSats,
          totalFilteredSats: filteredSats,
          kFactor,
          zapScore,
          economicPoints,
          validSenders: [],
          filteredSenders: [],
        };
      }
    } catch (dbErr) {
      console.debug("[EconomicStake] SQLite fallback unavailable:", dbErr);
    }
  }

  return calculateEconomicStake(hex, receipts, { kFactor: options?.kFactor });
}