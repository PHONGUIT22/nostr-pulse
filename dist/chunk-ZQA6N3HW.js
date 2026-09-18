#!/usr/bin/env node
import {
  normalizeRelayUrl
} from "./chunk-ATKN57WH.js";

// src/lib/nwc.ts
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nip04, nip44 } from "nostr-tools";
function hexToBytes(hex) {
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
function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function parseNWCUri(uri) {
  if (!uri || typeof uri !== "string") {
    throw new Error("NWC connection URI must be a non-empty string");
  }
  const trimmed = uri.trim();
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
  const relayParams = searchParams.getAll("relay");
  const relayUrls = [];
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
  const rawSecret = searchParams.get("secret") || searchParams.get("secretKey") || searchParams.get("client_secret");
  let secret;
  if (rawSecret && rawSecret.trim()) {
    const cleanSecret = rawSecret.trim().toLowerCase();
    if (!/^[0-9a-fA-F]{64}$/.test(cleanSecret)) {
      throw new Error("Invalid client secret in NWC URI. Expected 64-char hexadecimal string.");
    }
    secret = cleanSecret;
  }
  const lud16 = searchParams.get("lud16")?.trim() || void 0;
  const encParam = searchParams.get("encryption")?.toLowerCase();
  const nip44Param = searchParams.get("nip44")?.toLowerCase();
  const encryption = encParam === "nip44" || nip44Param === "true" || nip44Param === "1" ? "nip44" : "nip04";
  return {
    walletPubkey,
    relayUrls,
    secret,
    lud16,
    encryption,
    rawUri: trimmed
  };
}
function formatNWCUri(config) {
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
function isNWCConfigured(nwcUri) {
  const uri = nwcUri?.trim() || process.env.NWC_CONNECTION_URI?.trim();
  if (!uri) return false;
  try {
    parseNWCUri(uri);
    return true;
  } catch {
    return false;
  }
}
function encryptNWCPayload(payload, clientSk, walletPubkey, scheme) {
  if (scheme === "nip44") {
    const conversationKey = nip44.v2.utils.getConversationKey(clientSk, walletPubkey);
    return nip44.v2.encrypt(payload, conversationKey);
  }
  return nip04.encrypt(clientSk, walletPubkey, payload);
}
function decryptNWCPayload(encryptedContent, clientSk, senderPubkey, preferredScheme) {
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
async function executeNWCRequest(options) {
  const uri = options.nwcUri?.trim() || process.env.NWC_CONNECTION_URI?.trim();
  if (!uri) {
    throw new Error(
      "NWC connection URI is required. Neither nwcUri parameter nor NWC_CONNECTION_URI environment variable was provided."
    );
  }
  const config = parseNWCUri(uri);
  const clientSk = config.secret ? hexToBytes(config.secret) : generateSecretKey();
  const clientPubkey = getPublicKey(clientSk);
  const requestPayload = {
    method: options.method,
    params: options.params || {}
  };
  const rawPayload = JSON.stringify(requestPayload);
  const encryptedContent = encryptNWCPayload(
    rawPayload,
    clientSk,
    config.walletPubkey,
    config.encryption
  );
  const tags = [["p", config.walletPubkey]];
  if (config.encryption === "nip44") {
    tags.push(["encryption", "nip44"]);
  }
  const template = {
    kind: 23194,
    created_at: Math.floor(Date.now() / 1e3),
    tags,
    content: encryptedContent
  };
  const requestEvent = finalizeEvent(template, clientSk);
  const pool = new SimplePool();
  const timeoutMs = options.timeoutMs ?? 15e3;
  let timeoutTimer = null;
  let isCleanedUp = false;
  let sub = null;
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
  return new Promise((resolve) => {
    timeoutTimer = setTimeout(() => {
      cleanup();
      resolve({
        status: "timeout",
        error: `NWC request '${options.method}' timed out after ${timeoutMs}ms without response from wallet.`,
        errorCode: "TIMEOUT"
      });
    }, timeoutMs);
    try {
      sub = pool.subscribeMany(
        config.relayUrls,
        {
          kinds: [23195],
          "#e": [requestEvent.id]
        },
        {
          onevent(event) {
            try {
              if (event.pubkey.toLowerCase() !== config.walletPubkey.toLowerCase()) {
                console.debug(
                  "[NWC] Ignoring Kind 23195 from unexpected pubkey:",
                  event.pubkey
                );
                return;
              }
              const eventEncTag = event.tags.find((t) => t[0] === "encryption")?.[1];
              const preferredScheme = eventEncTag === "nip44" || config.encryption === "nip44" ? "nip44" : "nip04";
              const decrypted = decryptNWCPayload(
                event.content,
                clientSk,
                event.pubkey,
                preferredScheme
              );
              let parsed;
              try {
                parsed = JSON.parse(decrypted);
              } catch (parseErr) {
                console.debug("[NWC] Failed to parse decrypted JSON:", parseErr);
                cleanup();
                resolve({
                  status: "error",
                  error: "Failed to parse decrypted response payload from NWC wallet.",
                  errorCode: "PARSE_ERROR",
                  responseEventId: event.id
                });
                return;
              }
              cleanup();
              if (parsed.error) {
                resolve({
                  status: "error",
                  error: parsed.error.message || parsed.error.code || "NWC wallet returned an error",
                  errorCode: parsed.error.code,
                  responseEventId: event.id,
                  rawResponse: parsed
                });
                return;
              }
              resolve({
                status: "success",
                result: parsed.result,
                responseEventId: event.id,
                rawResponse: parsed
              });
            } catch (handleErr) {
              console.debug("[NWC] Error handling incoming Kind 23195 event:", handleErr);
            }
          },
          onclose() {
          }
        }
      );
      Promise.allSettled(pool.publish(config.relayUrls, requestEvent)).catch((pubErr) => {
        console.debug("[NWC] Publish warning:", pubErr);
      });
    } catch (dispatchErr) {
      cleanup();
      resolve({
        status: "error",
        error: `Failed to dispatch NWC request: ${dispatchErr?.message || String(dispatchErr)}`,
        errorCode: "DISPATCH_FAILED"
      });
    }
  });
}
async function payWithNWC({
  invoice,
  nwcUri,
  timeoutMs = 15e3,
  amountMsat
}) {
  if (!invoice || typeof invoice !== "string" || !invoice.trim()) {
    return {
      status: "error",
      error: "Invoice parameter is required and must be a non-empty string.",
      errorCode: "INVALID_INVOICE"
    };
  }
  const cleanInvoice = invoice.trim();
  const response = await executeNWCRequest({
    method: "pay_invoice",
    params: {
      invoice: cleanInvoice,
      ...amountMsat && amountMsat > 0 ? { amount: amountMsat } : {}
    },
    nwcUri,
    timeoutMs
  });
  if (response.status === "success") {
    return {
      status: "success",
      preimage: response.result?.preimage,
      fees_paid: response.result?.fees_paid ?? 0,
      responseEventId: response.responseEventId,
      rawResponse: response.rawResponse
    };
  }
  return {
    status: response.status,
    error: response.error || "Payment failed",
    errorCode: response.errorCode,
    responseEventId: response.responseEventId,
    rawResponse: response.rawResponse
  };
}
async function getNWCInfo(options = {}) {
  return executeNWCRequest({
    method: "get_info",
    params: {},
    nwcUri: options.nwcUri,
    timeoutMs: options.timeoutMs ?? 1e4
  });
}
async function getNWCBalance(options = {}) {
  const response = await executeNWCRequest({
    method: "get_balance",
    params: {},
    nwcUri: options.nwcUri,
    timeoutMs: options.timeoutMs ?? 1e4
  });
  if (response.status === "success" && response.result) {
    const balanceMsat = Number(response.result.balance ?? 0);
    return {
      status: "success",
      balanceMsat,
      balanceSats: Math.floor(balanceMsat / 1e3)
    };
  }
  return {
    status: response.status,
    error: response.error || "Failed to retrieve balance",
    errorCode: response.errorCode
  };
}
async function makeNWCInvoice({
  amountMsat,
  description,
  nwcUri,
  timeoutMs = 1e4
}) {
  const response = await executeNWCRequest({
    method: "make_invoice",
    params: {
      amount: amountMsat,
      ...description ? { description } : {}
    },
    nwcUri,
    timeoutMs
  });
  if (response.status === "success" && response.result) {
    return {
      status: "success",
      invoice: response.result.invoice,
      paymentHash: response.result.payment_hash
    };
  }
  return {
    status: response.status,
    error: response.error || "Failed to create invoice via NWC",
    errorCode: response.errorCode
  };
}

export {
  hexToBytes,
  bytesToHex,
  parseNWCUri,
  formatNWCUri,
  isNWCConfigured,
  encryptNWCPayload,
  decryptNWCPayload,
  executeNWCRequest,
  payWithNWC,
  getNWCInfo,
  getNWCBalance,
  makeNWCInvoice
};
