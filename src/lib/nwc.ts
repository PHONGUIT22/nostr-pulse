// src/lib/nwc.ts
/**
 * Nostr Wallet Connect (NWC / NIP-47) Direct Lightning Rail Executor
 *
 * Implements a lightweight, zero-leak client for NIP-47:
 * - Parsing NWC connection URIs (nostr+walletconnect://<pubkey>?relay=...&secret=...)
 * - Encrypting Kind 23194 request events via NIP-04 or NIP-44
 * - Publishing to designated relays and listening for Kind 23195 response events
 * - Returning preimage, fees_paid, and payment status
 * - Strict resource cleanup ensuring subscription and relay connection are destroyed
 */

import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nip04, nip44 } from "nostr-tools";
import type { Event, EventTemplate } from "nostr-tools";
import { normalizeRelayUrl } from "@/lib/nostr";

export interface NWCConnectionConfig {
  walletPubkey: string;
  relayUrls: string[];
  secret?: string;
  lud16?: string;
  encryption: "nip04" | "nip44";
  rawUri: string;
}

export interface PayWithNWCOptions {
  invoice: string;
  nwcUri?: string;
  timeoutMs?: number;
  amountMsat?: number;
}

export interface NWCPaymentResult {
  preimage?: string;
  fees_paid?: number;
  status: "success" | "error" | "timeout";
  error?: string;
  errorCode?: string;
  responseEventId?: string;
  rawResponse?: any;
}

export interface NWCRequestOptions {
  method: string;
  params: Record<string, any>;
  nwcUri?: string;
  timeoutMs?: number;
}

export interface NWCResponseResult {
  status: "success" | "error" | "timeout";
  result?: any;
  error?: string;
  errorCode?: string;
  responseEventId?: string;
  rawResponse?: any;
}

/**
 * Converts a hex string into a Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  if (clean.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Uint8Array into a hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parses an NIP-47 Nostr Wallet Connect (NWC) connection URI.
 *
 * Supported format:
 * nostr+walletconnect://<wallet_pubkey>?relay=<relay_url>&secret=<client_secret>&lud16=<lud16>&encryption=<nip04|nip44>
 */
export function parseNWCUri(uri: string): NWCConnectionConfig {
  if (!uri || typeof uri !== "string") {
    throw new Error("NWC connection URI must be a non-empty string");
  }

  const trimmed = uri.trim();

  // Support both nostr+walletconnect:// and nostrwalletconnect:// (and without //)
  const match = trimmed.match(
    /^(?:nostr\+walletconnect|nostrwalletconnect):\/?\/?([^?#]+)(?:\?(.*))?$/i
  );

  if (!match) {
    throw new Error(
      "Invalid NWC URI format. Expected nostr+walletconnect://<wallet_pubkey>?relay=<relay_url>&secret=<client_secret>"
    );
  }

  const rawPubkey = match[1].trim().replace(/\/+$/, "");
  const queryString = match[2] || "";

  if (!/^[0-9a-fA-F]{64}$/.test(rawPubkey)) {
    throw new Error(
      `Invalid wallet pubkey in NWC URI: '${rawPubkey}'. Expected 64-char hexadecimal pubkey.`
    );
  }
  const walletPubkey = rawPubkey.toLowerCase();

  const searchParams = new URLSearchParams(queryString);

  // Extract relays (support multiple 'relay' params)
  const relayParams = searchParams.getAll("relay");
  const relayUrls: string[] = [];

  for (const r of relayParams) {
    if (r && r.trim()) {
      try {
        relayUrls.push(normalizeRelayUrl(r.trim()));
      } catch {
        relayUrls.push(r.trim());
      }
    }
  }

  if (relayUrls.length === 0) {
    throw new Error("NWC URI must contain at least one valid 'relay' query parameter.");
  }

  // Extract client secret
  const rawSecret =
    searchParams.get("secret") ||
    searchParams.get("secretKey") ||
    searchParams.get("client_secret");

  let secret: string | undefined;
  if (rawSecret && rawSecret.trim()) {
    const cleanSecret = rawSecret.trim().toLowerCase();
    if (!/^[0-9a-fA-F]{64}$/.test(cleanSecret)) {
      throw new Error("Invalid client secret in NWC URI. Expected 64-char hexadecimal string.");
    }
    secret = cleanSecret;
  }

  // Extract optional lud16 lightning address
  const lud16 = searchParams.get("lud16")?.trim() || undefined;

  // Extract encryption mode (NIP-04 default, or NIP-44 if flagged)
  const encParam = searchParams.get("encryption")?.toLowerCase();
  const nip44Param = searchParams.get("nip44")?.toLowerCase();
  const encryption: "nip04" | "nip44" =
    encParam === "nip44" || nip44Param === "true" || nip44Param === "1" ? "nip44" : "nip04";

  return {
    walletPubkey,
    relayUrls,
    secret,
    lud16,
    encryption,
    rawUri: trimmed,
  };
}

/**
 * Formats connection parameters into a valid NIP-47 URI string.
 */
export function formatNWCUri(config: {
  walletPubkey: string;
  relayUrls: string | string[];
  secret?: string;
  lud16?: string;
  encryption?: "nip04" | "nip44";
}): string {
  const relays = Array.isArray(config.relayUrls) ? config.relayUrls : [config.relayUrls];
  const params = new URLSearchParams();

  for (const r of relays) {
    params.append("relay", r);
  }

  if (config.secret) {
    params.set("secret", config.secret);
  }

  if (config.lud16) {
    params.set("lud16", config.lud16);
  }

  if (config.encryption === "nip44") {
    params.set("encryption", "nip44");
  }

  return `nostr+walletconnect://${config.walletPubkey}?${params.toString()}`;
}

/**
 * Checks if NWC is configured either via parameter or environment variable.
 */
export function isNWCConfigured(nwcUri?: string): boolean {
  const uri = nwcUri?.trim() || process.env.NWC_CONNECTION_URI?.trim();
  if (!uri) return false;
  try {
    parseNWCUri(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypts an NWC payload using NIP-04 or NIP-44.
 */
export function encryptNWCPayload(
  payload: string,
  clientSk: Uint8Array,
  walletPubkey: string,
  scheme: "nip04" | "nip44"
): string {
  if (scheme === "nip44") {
    const conversationKey = nip44.v2.utils.getConversationKey(clientSk, walletPubkey);
    return nip44.v2.encrypt(payload, conversationKey);
  }
  return nip04.encrypt(clientSk, walletPubkey, payload);
}

/**
 * Decrypts an NWC payload using NIP-04 or NIP-44, with resilient cross-fallback.
 */
export function decryptNWCPayload(
  encryptedContent: string,
  clientSk: Uint8Array,
  senderPubkey: string,
  preferredScheme: "nip04" | "nip44"
): string {
  const tryNip04 = () => nip04.decrypt(clientSk, senderPubkey, encryptedContent);
  const tryNip44 = () => {
    const conversationKey = nip44.v2.utils.getConversationKey(clientSk, senderPubkey);
    return nip44.v2.decrypt(encryptedContent, conversationKey);
  };

  if (preferredScheme === "nip44") {
    try {
      return tryNip44();
    } catch {
      return tryNip04();
    }
  } else {
    try {
      return tryNip04();
    } catch {
      return tryNip44();
    }
  }
}

/**
 * Executes a generic NIP-47 request over Nostr relays with zero memory leaks.
 *
 * Dispatches Kind 23194 request, listens for Kind 23195 response tagged with ["e", requestEventId],
 * and ensures pool connection and subscriptions are closed promptly upon resolution or timeout.
 */
export async function executeNWCRequest(
  options: NWCRequestOptions
): Promise<NWCResponseResult> {
  const uri = options.nwcUri?.trim() || process.env.NWC_CONNECTION_URI?.trim();
  if (!uri) {
    throw new Error(
      "NWC connection URI is required. Neither nwcUri parameter nor NWC_CONNECTION_URI environment variable was provided."
    );
  }

  const config = parseNWCUri(uri);

  // Derive client private key: either use provided secret or generate ephemeral keypair
  const clientSk = config.secret ? hexToBytes(config.secret) : generateSecretKey();
  const clientPubkey = getPublicKey(clientSk);

  const requestPayload = {
    method: options.method,
    params: options.params || {},
  };
  const rawPayload = JSON.stringify(requestPayload);

  // Encrypt request content
  const encryptedContent = encryptNWCPayload(
    rawPayload,
    clientSk,
    config.walletPubkey,
    config.encryption
  );

  const tags: string[][] = [["p", config.walletPubkey]];
  if (config.encryption === "nip44") {
    tags.push(["encryption", "nip44"]);
  }

  // Kind 23194: NIP-47 Request
  const template: EventTemplate = {
    kind: 23194,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: encryptedContent,
  };

  const requestEvent = finalizeEvent(template, clientSk);

  const pool = new SimplePool();
  const timeoutMs = options.timeoutMs ?? 15000;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let isCleanedUp = false;
  let sub: any = null;

  // Zero memory leak cleanup handler
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    try {
      if (sub && typeof sub.close === "function") {
        sub.close();
      }
    } catch (err) {
      console.debug("[NWC] Error closing subscription:", err);
    }
    sub = null;

    try {
      pool.close(config.relayUrls);
      pool.destroy();
    } catch (err) {
      console.debug("[NWC] Error destroying pool:", err);
    }
  };

  return new Promise<NWCResponseResult>((resolve) => {
    timeoutTimer = setTimeout(() => {
      cleanup();
      resolve({
        status: "timeout",
        error: `NWC request '${options.method}' timed out after ${timeoutMs}ms without response from wallet.`,
        errorCode: "TIMEOUT",
      });
    }, timeoutMs);

    try {
      // Subscribe to Kind 23195 responses referencing our request event ID
      sub = pool.subscribeMany(
        config.relayUrls,
        {
          kinds: [23195],
          "#e": [requestEvent.id],
        },
        {
          onevent(event: Event) {
            try {
              // Verify response sender is the target wallet
              if (event.pubkey.toLowerCase() !== config.walletPubkey.toLowerCase()) {
                console.debug(
                  "[NWC] Ignoring Kind 23195 from unexpected pubkey:",
                  event.pubkey
                );
                return;
              }

              const eventEncTag = event.tags.find((t) => t[0] === "encryption")?.[1];
              const preferredScheme =
                eventEncTag === "nip44" || config.encryption === "nip44" ? "nip44" : "nip04";

              const decrypted = decryptNWCPayload(
                event.content,
                clientSk,
                event.pubkey,
                preferredScheme
              );

              let parsed: any;
              try {
                parsed = JSON.parse(decrypted);
              } catch (parseErr) {
                console.debug("[NWC] Failed to parse decrypted JSON:", parseErr);
                cleanup();
                resolve({
                  status: "error",
                  error: "Failed to parse decrypted response payload from NWC wallet.",
                  errorCode: "PARSE_ERROR",
                  responseEventId: event.id,
                });
                return;
              }

              cleanup();

              if (parsed.error) {
                resolve({
                  status: "error",
                  error:
                    parsed.error.message ||
                    parsed.error.code ||
                    "NWC wallet returned an error",
                  errorCode: parsed.error.code,
                  responseEventId: event.id,
                  rawResponse: parsed,
                });
                return;
              }

              resolve({
                status: "success",
                result: parsed.result,
                responseEventId: event.id,
                rawResponse: parsed,
              });
            } catch (handleErr: any) {
              console.debug("[NWC] Error handling incoming Kind 23195 event:", handleErr);
            }
          },
          onclose() {
            // Relay subscription closed
          },
        }
      );

      // Publish Kind 23194 request to the designated relay(s)
      Promise.allSettled(pool.publish(config.relayUrls, requestEvent)).catch((pubErr) => {
        console.debug("[NWC] Publish warning:", pubErr);
      });
    } catch (dispatchErr: any) {
      cleanup();
      resolve({
        status: "error",
        error: `Failed to dispatch NWC request: ${dispatchErr?.message || String(dispatchErr)}`,
        errorCode: "DISPATCH_FAILED",
      });
    }
  });
}

/**
 * Pays a Bolt11 Lightning invoice via NIP-47 Nostr Wallet Connect.
 *
 * @param invoice - Bolt11 Lightning invoice string
 * @param nwcUri - Optional NWC connection URI (falls back to process.env.NWC_CONNECTION_URI)
 * @param timeoutMs - Max wait time in milliseconds (default: 15000)
 * @param amountMsat - Optional amount in millisatoshis for amountless invoices
 * @returns NWCPaymentResult with preimage, fees_paid, and payment status
 */
export async function payWithNWC({
  invoice,
  nwcUri,
  timeoutMs = 15000,
  amountMsat,
}: PayWithNWCOptions): Promise<NWCPaymentResult> {
  if (!invoice || typeof invoice !== "string" || !invoice.trim()) {
    return {
      status: "error",
      error: "Invoice parameter is required and must be a non-empty string.",
      errorCode: "INVALID_INVOICE",
    };
  }

  const cleanInvoice = invoice.trim();

  const response = await executeNWCRequest({
    method: "pay_invoice",
    params: {
      invoice: cleanInvoice,
      ...(amountMsat && amountMsat > 0 ? { amount: amountMsat } : {}),
    },
    nwcUri,
    timeoutMs,
  });

  if (response.status === "success") {
    return {
      status: "success",
      preimage: response.result?.preimage,
      fees_paid: response.result?.fees_paid ?? 0,
      responseEventId: response.responseEventId,
      rawResponse: response.rawResponse,
    };
  }

  return {
    status: response.status,
    error: response.error || "Payment failed",
    errorCode: response.errorCode,
    responseEventId: response.responseEventId,
    rawResponse: response.rawResponse,
  };
}

/**
 * Retrieves wallet metadata and capabilities via NIP-47 get_info method.
 */
export async function getNWCInfo(options: {
  nwcUri?: string;
  timeoutMs?: number;
} = {}): Promise<NWCResponseResult> {
  return executeNWCRequest({
    method: "get_info",
    params: {},
    nwcUri: options.nwcUri,
    timeoutMs: options.timeoutMs ?? 10000,
  });
}

/**
 * Retrieves current wallet balance via NIP-47 get_balance method.
 */
export async function getNWCBalance(options: {
  nwcUri?: string;
  timeoutMs?: number;
} = {}): Promise<{
  status: "success" | "error" | "timeout";
  balanceMsat?: number;
  balanceSats?: number;
  error?: string;
  errorCode?: string;
}> {
  const response = await executeNWCRequest({
    method: "get_balance",
    params: {},
    nwcUri: options.nwcUri,
    timeoutMs: options.timeoutMs ?? 10000,
  });

  if (response.status === "success" && response.result) {
    const balanceMsat = Number(response.result.balance ?? 0);
    return {
      status: "success",
      balanceMsat,
      balanceSats: Math.floor(balanceMsat / 1000),
    };
  }

  return {
    status: response.status,
    error: response.error || "Failed to retrieve balance",
    errorCode: response.errorCode,
  };
}

/**
 * Creates an incoming Lightning invoice via NIP-47 make_invoice method.
 */
export async function makeNWCInvoice({
  amountMsat,
  description,
  nwcUri,
  timeoutMs = 10000,
}: {
  amountMsat: number;
  description?: string;
  nwcUri?: string;
  timeoutMs?: number;
}): Promise<{
  status: "success" | "error" | "timeout";
  invoice?: string;
  paymentHash?: string;
  error?: string;
  errorCode?: string;
}> {
  const response = await executeNWCRequest({
    method: "make_invoice",
    params: {
      amount: amountMsat,
      ...(description ? { description } : {}),
    },
    nwcUri,
    timeoutMs,
  });

  if (response.status === "success" && response.result) {
    return {
      status: "success",
      invoice: response.result.invoice,
      paymentHash: response.result.payment_hash,
    };
  }

  return {
    status: response.status,
    error: response.error || "Failed to create invoice via NWC",
    errorCode: response.errorCode,
  };
}
