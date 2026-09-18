#!/usr/bin/env node
import {
  verifyNip05
} from "./chunk-CDTDPUJF.js";
import {
  calculateTrustScore
} from "./chunk-TEBCT7SR.js";
import {
  encodeNpub,
  getWebOfTrustDistance,
  normalizePubkey
} from "./chunk-RI52V5BR.js";
import {
  getCreatorFromDb,
  getZapTotalsFromDb
} from "./chunk-JHYB5MLN.js";
import {
  fetchNostrProfile
} from "./chunk-ATKN57WH.js";

// src/lib/cashu.ts
import { getDecodedToken, getEncodedToken, Wallet } from "@cashu/cashu-ts";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { nip19, nip04, nip44 } from "nostr-tools";
var RECOMMENDED_MINTS = [
  {
    name: "Cashu Testnut (Demo / Test Sats)",
    url: "https://testnut.cashu.space",
    description: "Official Cashu core testnet mint (Recommended for live demos)",
    recommended: true
  },
  {
    name: "Minibits Mint",
    url: "https://mint.minibits.cash/Bitcoin",
    description: "High-uptime trusted node with instant Lightning routing"
  },
  {
    name: "Macadamia Mint",
    url: "https://mint.macadamia.cash",
    description: "Reliable community-driven mint with high uptime"
  }
];
var DEFAULT_CASHU_MINT = "https://testnut.cashu.space";
var RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol"
];
function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function base64UrlToBytes(base64Url) {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  if (typeof window !== "undefined" && typeof atob === "function") {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}
function decodeCbor(bytes) {
  let offset = 0;
  function decodeItem() {
    if (offset >= bytes.length) {
      throw new Error("Unexpected end of CBOR data");
    }
    const initialByte = bytes[offset++];
    const majorType = initialByte >> 5;
    const additionalInfo = initialByte & 31;
    let length = 0;
    if (additionalInfo < 24) {
      length = additionalInfo;
    } else if (additionalInfo === 24) {
      length = bytes[offset++];
    } else if (additionalInfo === 25) {
      length = bytes[offset++] << 8 | bytes[offset++];
    } else if (additionalInfo === 26) {
      length = (bytes[offset++] << 24 | bytes[offset++] << 16 | bytes[offset++] << 8 | bytes[offset++]) >>> 0;
    } else if (additionalInfo === 27) {
      const hi = (bytes[offset++] << 24 | bytes[offset++] << 16 | bytes[offset++] << 8 | bytes[offset++]) >>> 0;
      const lo = (bytes[offset++] << 24 | bytes[offset++] << 16 | bytes[offset++] << 8 | bytes[offset++]) >>> 0;
      length = hi * 2 ** 32 + lo;
    } else {
      length = 0;
    }
    if (majorType === 0) return length;
    if (majorType === 1) return -1 - length;
    if (majorType === 2) {
      const res = bytes.slice(offset, offset + length);
      offset += length;
      return res;
    }
    if (majorType === 3) {
      const strBytes = bytes.slice(offset, offset + length);
      offset += length;
      return new TextDecoder("utf-8").decode(strBytes);
    }
    if (majorType === 4) {
      const arr = [];
      for (let i = 0; i < length; i++) {
        arr.push(decodeItem());
      }
      return arr;
    }
    if (majorType === 5) {
      const obj = {};
      for (let i = 0; i < length; i++) {
        const key = decodeItem();
        const val = decodeItem();
        obj[String(key)] = val;
      }
      return obj;
    }
    if (majorType === 7) {
      if (additionalInfo === 20) return false;
      if (additionalInfo === 21) return true;
      if (additionalInfo === 22) return null;
      return void 0;
    }
    return null;
  }
  return decodeItem();
}
function encodeCashuToken(mintUrl, proofs, unit = "sat") {
  const cleanMint = mintUrl.trim().replace(/\/+$/, "");
  try {
    if (typeof getEncodedToken === "function") {
      return getEncodedToken({ mint: cleanMint, proofs, unit });
    }
  } catch (err) {
    console.debug("[Cashu] getEncodedToken fallback to manual encoding:", err);
  }
  const v3Payload = {
    token: [{ mint: cleanMint, proofs }],
    unit
  };
  const jsonStr = JSON.stringify(v3Payload);
  const base64 = typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(jsonStr))) : Buffer.from(jsonStr, "utf-8").toString("base64");
  return `cashuA${base64.replace(/\+/g, "-").replace(/\//g, "_")}`;
}
function decodeCashuString(tokenString) {
  const trimmed = tokenString.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("cashub")) {
    try {
      const rawCbor = trimmed.slice(6);
      const bytes = base64UrlToBytes(rawCbor);
      return decodeCbor(bytes);
    } catch (err) {
      console.warn("CBOR decode error for cashuB token:", err);
    }
  }
  if (lower.startsWith("cashua")) {
    try {
      const base64Data = trimmed.slice(6).replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = typeof window !== "undefined" ? decodeURIComponent(escape(atob(base64Data))) : Buffer.from(base64Data, "base64").toString("utf-8");
      return JSON.parse(jsonStr);
    } catch (err) {
      throw new Error("Failed to parse cashuA base64 payload.");
    }
  }
  throw new Error("Invalid token format. Cashu tokens must start with 'cashuA' or 'cashuB'.");
}
function parseCashuToken(tokenString) {
  const trimmed = tokenString.trim();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("cashua") && !lower.startsWith("cashub")) {
    throw new Error("Invalid token format. Cashu tokens must start with 'cashuA' or 'cashuB'.");
  }
  let mint = "";
  let proofs = [];
  let unit = "sat";
  try {
    let decoded = null;
    try {
      decoded = getDecodedToken(trimmed, []);
    } catch {
      decoded = getDecodedToken(trimmed);
    }
    if (decoded) {
      if (decoded.mint) {
        mint = decoded.mint;
      } else if (Array.isArray(decoded.token) && decoded.token.length > 0) {
        mint = decoded.token[0].mint;
      }
      if (Array.isArray(decoded.proofs)) {
        proofs = decoded.proofs.map((p) => ({
          ...p,
          amount: typeof p.amount?.toNumber === "function" ? p.amount.toNumber() : Number(p.amount || 0)
        }));
      } else if (Array.isArray(decoded.token) && decoded.token.length > 0) {
        proofs = decoded.token.flatMap(
          (t) => (t.proofs || []).map((p) => ({
            ...p,
            amount: typeof p.amount?.toNumber === "function" ? p.amount.toNumber() : Number(p.amount || 0)
          }))
        );
      }
      if (decoded.unit) unit = decoded.unit;
    }
  } catch (decErr) {
    console.debug("[Cashu] getDecodedToken fallback to manual parsing:", decErr);
  }
  if (proofs.length === 0) {
    const decoded = decodeCashuString(trimmed);
    if (decoded) {
      if (Array.isArray(decoded.t)) {
        mint = decoded.m || mint;
        for (const group of decoded.t) {
          const keysetIdHex = group.i instanceof Uint8Array ? bytesToHex(group.i) : String(group.i || "");
          if (Array.isArray(group.p)) {
            for (const p of group.p) {
              const cHex = p.c instanceof Uint8Array ? bytesToHex(p.c) : String(p.c || p.C || "");
              proofs.push({
                id: keysetIdHex,
                amount: Number(p.a || p.amount || 0),
                secret: String(p.s || p.secret || ""),
                C: cHex
              });
            }
          }
        }
      } else if (Array.isArray(decoded.proofs)) {
        mint = decoded.mint || mint;
        proofs = decoded.proofs;
      } else if (Array.isArray(decoded.token) && decoded.token.length > 0) {
        mint = decoded.token[0].mint || mint;
        for (const entry of decoded.token) {
          if (entry.unit) unit = entry.unit;
          if (Array.isArray(entry.proofs)) proofs.push(...entry.proofs);
        }
      }
    }
  }
  if (proofs.length === 0) {
    throw new Error("No cryptographic proofs found inside the token.");
  }
  unit = (unit || "sat").toLowerCase().trim();
  if (mint) {
    mint = mint.trim().replace(/\/+$/, "");
    if (!mint.startsWith("http://") && !mint.startsWith("https://")) {
      mint = `https://${mint}`;
    }
  } else {
    mint = DEFAULT_CASHU_MINT;
  }
  const totalAmountSats = proofs.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return {
    mint,
    totalAmountSats,
    unit,
    proofs
  };
}
async function splitCashuToken(tokenString, amountToSend, overrideMintUrl) {
  const info = parseCashuToken(tokenString);
  if (info.totalAmountSats < amountToSend) {
    throw new Error(`Insufficient funds: token has ${info.totalAmountSats} sats, but ${amountToSend} sats required.`);
  }
  if (info.totalAmountSats === amountToSend) {
    return { sendToken: tokenString, changeToken: null };
  }
  const normalizedUnit = (info.unit || "sat").toLowerCase().trim();
  let targetMint = info.mint || overrideMintUrl || DEFAULT_CASHU_MINT;
  let cleanMint = targetMint.trim().replace(/\/+$/, "");
  if (!cleanMint.startsWith("http://") && !cleanMint.startsWith("https://")) {
    cleanMint = `https://${cleanMint}`;
  }
  console.log(`[splitCashuToken] Connecting to Mint: "${cleanMint}", Unit: "${normalizedUnit}"`);
  const wallet = new Wallet(cleanMint, { unit: normalizedUnit });
  await wallet.loadMint(true);
  let mintKeysetIds = [];
  try {
    const res = await fetch(`${cleanMint}/v1/keysets`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.keysets)) {
        mintKeysetIds = data.keysets.map((k) => k.id);
      }
    }
  } catch (err) {
    console.warn("[splitCashuToken] Could not fetch keysets directly, falling back to cache:", err);
    mintKeysetIds = wallet.keyChain?.cache?.keysets?.map((k) => k.id) || [];
  }
  console.log(`[splitCashuToken] Full Mint Keysets available:`, mintKeysetIds);
  const normalizedProofs = info.proofs.map((proof) => {
    const rawId = String(proof.id);
    const fullMatch = mintKeysetIds.find((fullId) => fullId === rawId || fullId.startsWith(rawId));
    if (fullMatch && fullMatch !== rawId) {
      console.log(`[splitCashuToken] Auto-expanded truncated keyset: ${rawId} -> ${fullMatch}`);
      return { ...proof, id: fullMatch };
    }
    return proof;
  });
  try {
    if (typeof wallet.ensureOperableKeysets === "function") {
      const keysetIds = Array.from(new Set(normalizedProofs.map((p) => p.id)));
      await wallet.ensureOperableKeysets(keysetIds);
    }
    let sendResult;
    if (wallet.ops && typeof wallet.ops.send === "function") {
      sendResult = await wallet.ops.send(amountToSend, normalizedProofs).run();
    } else {
      sendResult = await wallet.send(amountToSend, normalizedProofs);
    }
    const returnChange = sendResult.keep || sendResult.returnChange;
    const send = sendResult.send;
    const sendToken = encodeCashuToken(cleanMint, send, normalizedUnit);
    const changeToken = returnChange && returnChange.length > 0 ? encodeCashuToken(cleanMint, returnChange, normalizedUnit) : null;
    return { sendToken, changeToken };
  } catch (error) {
    if (error.name === "UnknownKeysetError" || error.message && error.message.includes("not a keyset of this mint")) {
      console.error(`[splitCashuToken] Keyset Error: Token does not belong to Mint ${cleanMint}`);
      throw new Error(`Invalid eCash token or keyset does not belong to active Mint (${cleanMint}). Please check your token.`);
    }
    throw error;
  }
}
async function createCashuMintQuote(amountSats, mintUrl = DEFAULT_CASHU_MINT) {
  const cleanMint = mintUrl.trim().replace(/\/+$/, "");
  try {
    const wallet = new Wallet(cleanMint);
    if (typeof wallet.loadMint === "function") {
      try {
        await wallet.loadMint();
      } catch (loadErr) {
        console.debug("[Cashu] loadMint warning during quote creation:", loadErr);
      }
    }
    if (typeof wallet.createMintQuoteBolt11 === "function") {
      try {
        const quote = await wallet.createMintQuoteBolt11(amountSats);
        return {
          invoice: quote.request || quote.pr,
          quoteId: quote.quote || quote.hash || quote.id,
          mintUrl: cleanMint
        };
      } catch (bolt11Err) {
        console.debug("[Cashu] createMintQuoteBolt11 fallback:", bolt11Err);
      }
    }
    if (typeof wallet.createMintQuote === "function") {
      try {
        const quote = await wallet.createMintQuote("bolt11", amountSats);
        return {
          invoice: quote.request || quote.pr,
          quoteId: quote.quote || quote.hash || quote.id,
          mintUrl: cleanMint
        };
      } catch (createErr) {
        console.debug("[Cashu] createMintQuote('bolt11') failed, trying default arg:", createErr);
        try {
          const quote = await wallet.createMintQuote(amountSats);
          return {
            invoice: quote.request || quote.pr,
            quoteId: quote.quote || quote.hash || quote.id,
            mintUrl: cleanMint
          };
        } catch (quoteErr) {
          console.debug("[Cashu] createMintQuote fallback failed:", quoteErr);
        }
      }
    }
  } catch (walletErr) {
    console.debug("[Cashu] Wallet instance mint quote failed, attempting direct REST fallback:", walletErr);
  }
  try {
    const res = await fetch(`${cleanMint}/v1/mint/quote/bolt11`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountSats, unit: "sat" })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.request && data.quote) {
        return {
          invoice: data.request,
          quoteId: data.quote,
          mintUrl: cleanMint
        };
      }
    }
  } catch (err) {
    console.debug("[Cashu] Direct NUT-04 REST Mint request failed:", err);
  }
  throw new Error(`Could not request Mint invoice from ${cleanMint}.`);
}
async function encryptCashuPayload(recipientHexPubkey, rawPayload, ephemeralSk) {
  if (typeof window !== "undefined" && window.nostr?.nip44?.encrypt) {
    try {
      const encrypted2 = await window.nostr.nip44.encrypt(recipientHexPubkey, rawPayload);
      if (encrypted2) return { encryptedContent: encrypted2, encryptionScheme: "nip44" };
    } catch (err) {
      console.debug("[Cashu] Window nostr NIP-44 encryption failed, falling back:", err);
    }
  }
  if (typeof window !== "undefined" && window.nostr?.nip04?.encrypt) {
    try {
      const encrypted2 = await window.nostr.nip04.encrypt(recipientHexPubkey, rawPayload);
      if (encrypted2) return { encryptedContent: encrypted2, encryptionScheme: "nip04" };
    } catch (err) {
      console.debug("[Cashu] Window nostr NIP-04 encryption failed, falling back:", err);
    }
  }
  try {
    if (nip44 && nip44.v2) {
      const conversationKey = nip44.v2.utils.getConversationKey(ephemeralSk, recipientHexPubkey);
      const encrypted2 = nip44.v2.encrypt(rawPayload, conversationKey);
      return { encryptedContent: encrypted2, encryptionScheme: "nip44" };
    }
  } catch (err) {
    console.debug("[Cashu] Local nostr-tools NIP-44 v2 encryption failed, falling back to NIP-04:", err);
  }
  const encrypted = await nip04.encrypt(ephemeralSk, recipientHexPubkey, rawPayload);
  return { encryptedContent: encrypted, encryptionScheme: "nip04" };
}
async function sendCashuNutZap({
  recipientPubkey,
  cashuToken,
  amountSats,
  comment,
  mintUrl
}) {
  let hexPubkey = recipientPubkey;
  if (hexPubkey.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(hexPubkey);
      if (decoded.type === "npub") hexPubkey = decoded.data;
    } catch (err) {
      console.debug("[Cashu] Recipient npub decoding fallback:", err);
    }
  }
  if (!hexPubkey || !/^[0-9a-fA-F]{64}$/.test(hexPubkey)) {
    throw new Error("Invalid recipient pubkey format.");
  }
  let cleanMint = (mintUrl || DEFAULT_CASHU_MINT).trim().replace(/\/+$/, "");
  if (!cleanMint.startsWith("http://") && !cleanMint.startsWith("https://")) {
    cleanMint = `https://${cleanMint}`;
  }
  const ephemeralSk = generateSecretKey();
  const { sendToken, changeToken } = await splitCashuToken(cashuToken, amountSats, cleanMint);
  const secretNutZapPayload = JSON.stringify({
    token: sendToken.trim(),
    memo: comment?.trim() || "Value-4-Value eCash NutZap \u{1F95C}",
    amount: amountSats,
    mint: cleanMint,
    created_at: Math.floor(Date.now() / 1e3)
  });
  const { encryptedContent, encryptionScheme } = await encryptCashuPayload(
    hexPubkey,
    secretNutZapPayload,
    ephemeralSk
  );
  const eventTemplate = {
    kind: 9321,
    content: encryptedContent,
    tags: [
      ["p", hexPubkey],
      ["amount", (amountSats * 1e3).toString()],
      ["u", cleanMint],
      ["encryption", encryptionScheme],
      ["alt", `Encrypted NutZap: ${amountSats} Sats in Chaumian eCash`]
    ],
    created_at: Math.floor(Date.now() / 1e3)
  };
  let signedEvent = null;
  if (typeof window !== "undefined" && window.nostr?.signEvent) {
    try {
      signedEvent = await window.nostr.signEvent(eventTemplate);
    } catch (err) {
      console.debug("[Cashu] Window nostr.signEvent failed, using ephemeral key:", err);
    }
  }
  if (!signedEvent) {
    signedEvent = finalizeEvent(eventTemplate, ephemeralSk);
  }
  const pool = new SimplePool();
  try {
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    const publishPromises = RELAYS.map(async (relayUrl) => {
      try {
        const pub = pool.publish([relayUrl], signedEvent);
        await Promise.race([pub, timeoutPromise]);
      } catch (err) {
        console.debug(`[Cashu] Failed to publish NutZap to ${relayUrl}:`, err);
      }
    });
    await Promise.race([
      Promise.allSettled(publishPromises),
      new Promise((resolve) => setTimeout(resolve, 2e3))
    ]);
  } catch (err) {
    console.debug("[Cashu] Relay pool broadcast finished with warnings:", err);
  } finally {
    try {
      pool.close(RELAYS);
    } catch (err) {
      console.debug("[Cashu] Pool close warning:", err);
    }
  }
  return {
    signedEvent,
    changeToken,
    id: signedEvent.id,
    kind: signedEvent.kind,
    ...signedEvent
  };
}

// src/lib/mint-mesh.ts
var DEFAULT_MINT_MESH_URLS = [
  "https://testnut.cashu.space",
  "https://mint.minibits.cash/Bitcoin",
  "https://mint.macadamia.cash",
  "https://legend.lnbits.com/cashu/api/v1/4gr9xm9YVgah95qcqzQgeh"
];
var auditCache = /* @__PURE__ */ new Map();
var AUDIT_CACHE_TTL_MS = 60 * 1e3;
var KNOWN_MINT_OPERATORS = {
  "https://testnut.cashu.space": {
    pubkey: "140e4e08e6e5898867f5dbffec52eed1f92e394e432c2536c93437e584285b7b",
    nip05: "calle@cashu.space"
  },
  "https://mint.minibits.cash/bitcoin": {
    pubkey: "140e4e08e6e5898867f5dbffec52eed1f92e394e432c2536c93437e584285b7b",
    nip05: "calle@minibits.cash"
  },
  "https://mint.macadamia.cash": {
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    nip05: "admin@macadamia.cash"
  }
};
async function fetchMintInfo(mintUrl, timeoutMs = 3500) {
  const cleanUrl = mintUrl.trim().replace(/\/+$/, "");
  const infoEndpoint = `${cleanUrl}/v1/info`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(infoEndpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const legacyEndpoint = `${cleanUrl}/info`;
      const legacyController = new AbortController();
      const legacyTimer = setTimeout(() => legacyController.abort(), 2e3);
      try {
        const legacyRes = await fetch(legacyEndpoint, {
          signal: legacyController.signal,
          headers: { Accept: "application/json" }
        });
        clearTimeout(legacyTimer);
        if (legacyRes.ok) {
          const data2 = await legacyRes.json();
          return { info: data2, latencyMs: Date.now() - startTime, isOnline: true };
        }
      } catch {
      }
      return { info: null, latencyMs, isOnline: false };
    }
    const data = await res.json();
    return { info: data, latencyMs, isOnline: true };
  } catch {
    clearTimeout(timer);
    return { info: null, latencyMs: Date.now() - startTime, isOnline: false };
  }
}
function extractAdminContact(info) {
  if (!info) return { pubkey: null, nip05: null };
  let foundPubkey = null;
  let foundNip05 = null;
  if (Array.isArray(info.contact)) {
    for (const item of info.contact) {
      if (Array.isArray(item) && item.length >= 2) {
        const type = String(item[0]).toLowerCase();
        const val = String(item[1]).trim();
        if (type === "nostr" || type === "npub" || type === "nip05") {
          const cleanVal = val.replace(/^nostr:\/?\/?/i, "").trim();
          if (cleanVal.includes("@")) {
            foundNip05 = foundNip05 || cleanVal;
          } else {
            const norm = normalizePubkey(cleanVal);
            if (norm) foundPubkey = foundPubkey || norm;
          }
        }
      } else if (typeof item === "object" && item !== null) {
        const method = String(item.method || "").toLowerCase();
        const val = String(item.info || "").trim();
        if (method === "nostr" || method === "npub" || method === "nip05") {
          const cleanVal = val.replace(/^nostr:\/?\/?/i, "").trim();
          if (cleanVal.includes("@")) {
            foundNip05 = foundNip05 || cleanVal;
          } else {
            const norm = normalizePubkey(cleanVal);
            if (norm) foundPubkey = foundPubkey || norm;
          }
        }
      }
    }
  } else if (typeof info.contact === "object" && info.contact !== null) {
    for (const [key, value] of Object.entries(info.contact)) {
      const type = key.toLowerCase();
      const val = String(value).trim();
      if (type === "nostr" || type === "npub" || type === "nip05") {
        const cleanVal = val.replace(/^nostr:\/?\/?/i, "").trim();
        if (cleanVal.includes("@")) {
          foundNip05 = foundNip05 || cleanVal;
        } else {
          const norm = normalizePubkey(cleanVal);
          if (norm) foundPubkey = foundPubkey || norm;
        }
      }
    }
  }
  if (!foundPubkey && info.pubkey && typeof info.pubkey === "string") {
    let clean = info.pubkey.trim();
    if (clean.length === 66 && (clean.startsWith("02") || clean.startsWith("03"))) {
      clean = clean.slice(2);
    }
    const norm = normalizePubkey(clean);
    if (norm) foundPubkey = norm;
  }
  return {
    pubkey: foundPubkey,
    nip05: foundNip05
  };
}
async function resolveNip05ToPubkey(nip05) {
  try {
    const clean = nip05.trim().toLowerCase();
    const parts = clean.split("@");
    if (parts.length !== 2) return null;
    const [name, domain] = parts;
    const res = await fetch(
      `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`,
      {
        signal: AbortSignal.timeout(2e3),
        headers: { Accept: "application/json" }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pk = data?.names?.[name];
    if (pk && typeof pk === "string") {
      return normalizePubkey(pk);
    }
  } catch {
  }
  return null;
}
function extractSupportedNuts(info) {
  if (!info || !info.nuts || typeof info.nuts !== "object") return [];
  const list = [];
  for (const key of Object.keys(info.nuts)) {
    const num = parseInt(key.replace(/^nut-?/i, ""), 10);
    if (!isNaN(num)) {
      const formatted = `NUT-${num < 10 ? "0" + num : num}`;
      if (!list.includes(formatted)) {
        list.push(formatted);
      }
    } else {
      const upper = key.toUpperCase();
      if (!list.includes(upper)) list.push(upper);
    }
  }
  return list.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
}
function extractCompliance(info) {
  const nuts = info?.nuts || {};
  const hasNut = (num) => Boolean(nuts[num] || nuts[String(num)]);
  return {
    nut04Mint: hasNut(4),
    nut05Melt: hasNut(5),
    nut07StateCheck: hasNut(7),
    nut08FeeReturn: hasNut(8),
    nut10Dleq: hasNut(10),
    nut11P2pk: hasNut(11),
    rawNuts: nuts
  };
}
async function auditCashuMint(mintUrl, forceRefresh = false) {
  const cleanUrl = mintUrl.trim().replace(/\/+$/, "");
  const cached = auditCache.get(cleanUrl);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }
  const { info, latencyMs, isOnline } = await fetchMintInfo(cleanUrl);
  const breakdown = [];
  if (!isOnline || !info) {
    const offlineResult = {
      mintUrl: cleanUrl,
      trustScore: 0,
      riskLevel: "HIGH_RISK",
      adminPubkey: null,
      supportedNuts: [],
      recommendation: "AVOID",
      isOnline: false,
      latencyMs,
      name: cleanUrl.replace(/^https?:\/\//, ""),
      wotDistance: 3,
      wotEndorsersCount: 0,
      tier: "Offline",
      isGated: true,
      gateReason: "Mint is unreachable or returned non-200 response on NUT-06 info probe.",
      compliance: {
        nut04Mint: false,
        nut05Melt: false,
        nut07StateCheck: false,
        nut08FeeReturn: false,
        nut10Dleq: false
      },
      breakdown: [
        {
          label: "Pillar 1: Operator WoT Graph Connectivity",
          points: 0,
          maxPoints: 35,
          passed: false,
          description: "Mint endpoint is offline."
        },
        {
          label: "Pillar 2: Economic Proof-of-Trust (Zaps)",
          points: 0,
          maxPoints: 20,
          passed: false,
          description: "Mint endpoint is offline."
        },
        {
          label: "Pillar 3: Cryptographic Identity & Transport Security",
          points: 0,
          maxPoints: 15,
          passed: false,
          description: "Mint endpoint is offline."
        },
        {
          label: "Pillar 4: Operational Health & Latency",
          points: 0,
          maxPoints: 15,
          passed: false,
          description: "Probe timed out or connection failed."
        },
        {
          label: "Pillar 5: NUT Protocol Compliance",
          points: 0,
          maxPoints: 15,
          passed: false,
          description: "No NUT capabilities detected."
        }
      ],
      auditedAt: Date.now()
    };
    auditCache.set(cleanUrl, { result: offlineResult, expiresAt: Date.now() + 15e3 });
    return offlineResult;
  }
  const compliance = extractCompliance(info);
  const supportedNuts = extractSupportedNuts(info);
  const contact = extractAdminContact(info);
  let adminPubkey = contact.pubkey;
  let adminNip05 = contact.nip05;
  if (!adminPubkey && adminNip05) {
    adminPubkey = await resolveNip05ToPubkey(adminNip05);
  }
  if (!adminPubkey && KNOWN_MINT_OPERATORS[cleanUrl.toLowerCase()]) {
    adminPubkey = KNOWN_MINT_OPERATORS[cleanUrl.toLowerCase()].pubkey;
    if (!adminNip05) {
      adminNip05 = KNOWN_MINT_OPERATORS[cleanUrl.toLowerCase()].nip05 || null;
    }
  }
  const operatorNpub = adminPubkey ? encodeNpub(adminPubkey) : void 0;
  let profile = null;
  let nip05Result = void 0;
  let wotResult = null;
  let creatorDb = null;
  let zapRow = null;
  let isVerifiableAdmin = false;
  if (adminPubkey) {
    try {
      [profile, creatorDb, zapRow] = await Promise.all([
        fetchNostrProfile(adminPubkey).catch(() => null),
        getCreatorFromDb(adminPubkey).catch(() => null),
        getZapTotalsFromDb(adminPubkey).catch(() => null)
      ]);
      const targetNip05 = adminNip05 || profile?.nip05 || creatorDb?.nip05;
      if (targetNip05) {
        nip05Result = await verifyNip05(targetNip05, adminPubkey).catch(() => void 0);
      }
      wotResult = getWebOfTrustDistance(adminPubkey);
      const effectiveProfile = profile || {
        pubkey: adminPubkey,
        npub: operatorNpub || "",
        name: creatorDb?.name || "",
        nip05: targetNip05 || ""
      };
      const calculatedAdminScore = calculateTrustScore(
        effectiveProfile,
        nip05Result,
        wotResult
      );
      isVerifiableAdmin = Boolean(
        wotResult.distance <= 2 || nip05Result?.isVerified || profile?.name || creatorDb || calculatedAdminScore.score >= 20
      );
    } catch (err) {
      console.debug("[MintMesh] Admin reputation resolution warning:", err);
    }
  }
  const wotDistance = wotResult ? wotResult.distance : 3;
  const wotEndorsersCount = wotResult ? wotResult.endorsedByCount : 0;
  let p1Points = 0;
  let p1Desc = "";
  if (wotResult && adminPubkey) {
    if (wotResult.distance === 0) {
      p1Points = 35;
      p1Desc = `Root Seed Anchor: Mint operated directly by Nostr core anchor (${wotResult.tier || "Core Protocol"})`;
    } else if (wotResult.distance === 1) {
      const endorsers = wotResult.endorsers || [];
      const sample = endorsers.slice(0, 2).join(", ");
      p1Points = Math.min(30, 20 + wotResult.endorsedByCount * 2);
      p1Desc = `Hop 1: Operator endorsed by ${wotResult.endorsedByCount} Anchors${sample ? ` (${sample})` : ""}`;
    } else if (wotResult.distance === 2) {
      p1Points = Math.min(20, 10 + wotResult.endorsedByCount * 2);
      p1Desc = `Hop 2: Operator verified via transitive trust graph (${wotResult.endorsedByCount} Ring-1 endorsers)`;
    } else {
      p1Points = 8;
      p1Desc = "Hop > 2: Operator pubkey present but outside Ring-2 trust graph";
    }
  } else {
    const isRecommended = RECOMMENDED_MINTS.some(
      (m) => m.url.toLowerCase() === cleanUrl.toLowerCase()
    );
    if (isRecommended) {
      p1Points = 25;
      p1Desc = "Ecosystem Benchmark: Recognized community mint in NostrPulse trusted index";
    } else {
      p1Points = 10;
      p1Desc = "Autonomous Mint: No verifiable Nostr operator identity in NUT-06 contacts";
    }
  }
  breakdown.push({
    label: "Pillar 1: Operator WoT Graph Connectivity",
    points: p1Points,
    maxPoints: 35,
    passed: p1Points >= 15,
    description: `${p1Desc} \u2022 ${p1Points}/35 pts`
  });
  let p2Points = 0;
  let p2Desc = "";
  const validZapsSats = zapRow?.valid_sender_sats ?? 0;
  if (validZapsSats > 0) {
    const satsPoints = Math.min(20, Math.round(Math.log10(validZapsSats + 1) * 4));
    p2Points = Math.max(8, satsPoints);
    p2Desc = `Operator received ${validZapsSats.toLocaleString()} Sats in verified WoT Zaps`;
  } else if (adminPubkey) {
    p2Points = 5;
    p2Desc = "Active Nostr keypair, no verified incoming WoT Zaps recorded";
  } else {
    p2Points = 5;
    p2Desc = "Pseudonymous mint operator, economic stake signal neutral";
  }
  breakdown.push({
    label: "Pillar 2: Economic Proof-of-Trust (Zaps)",
    points: p2Points,
    maxPoints: 20,
    passed: p2Points >= 8,
    description: `${p2Desc} \u2022 ${p2Points}/20 pts`
  });
  let p3Points = 0;
  let p3Desc = "";
  const isHttps = cleanUrl.startsWith("https://");
  if (isHttps) {
    p3Points += 8;
    p3Desc = "Encrypted HTTPS transport";
  } else {
    p3Desc = "Insecure HTTP transport (security risk)";
  }
  const isNip05Verified = Boolean(nip05Result?.isVerified);
  if (isNip05Verified) {
    p3Points += 7;
    p3Desc += ` \u2022 Verified NIP-05 (${nip05Result?.nip05})`;
  } else if (info.name && info.pubkey) {
    p3Points += 4;
    p3Desc += " \u2022 Valid NUT-06 public keyset signature";
  }
  p3Points = Math.min(15, p3Points);
  breakdown.push({
    label: "Pillar 3: Cryptographic Identity & Transport Security",
    points: p3Points,
    maxPoints: 15,
    passed: isHttps,
    description: `${p3Desc} \u2022 ${p3Points}/15 pts`
  });
  let p4Points = 0;
  let p4Desc = "";
  if (latencyMs < 300) {
    p4Points = 15;
    p4Desc = `Ultra-fast response (${latencyMs}ms)`;
  } else if (latencyMs < 800) {
    p4Points = 12;
    p4Desc = `Good responsiveness (${latencyMs}ms)`;
  } else if (latencyMs < 1500) {
    p4Points = 8;
    p4Desc = `Moderate latency (${latencyMs}ms)`;
  } else if (latencyMs < 3e3) {
    p4Points = 4;
    p4Desc = `High latency (${latencyMs}ms)`;
  } else {
    p4Points = 1;
    p4Desc = `Degraded responsiveness (${latencyMs}ms)`;
  }
  breakdown.push({
    label: "Pillar 4: Operational Health & Latency",
    points: p4Points,
    maxPoints: 15,
    passed: latencyMs < 1500,
    description: `${p4Desc} \u2022 ${p4Points}/15 pts`
  });
  let p5Points = 0;
  if (compliance.nut04Mint) p5Points += 3;
  if (compliance.nut05Melt) p5Points += 4;
  if (compliance.nut07StateCheck) p5Points += 3;
  if (compliance.nut08FeeReturn) p5Points += 3;
  if (compliance.nut10Dleq) p5Points += 2;
  if (compliance.nut11P2pk) p5Points += 2;
  p5Points = Math.min(15, p5Points);
  const p5Desc = supportedNuts.length > 0 ? `Supported capabilities: ${supportedNuts.join(", ")}` : "Basic Cashu V3 compatibility";
  breakdown.push({
    label: "Pillar 5: NUT Protocol Compliance",
    points: p5Points,
    maxPoints: 15,
    passed: compliance.nut04Mint && compliance.nut05Melt,
    description: `${p5Desc} \u2022 ${p5Points}/15 pts`
  });
  let rawScore = p1Points + p2Points + p3Points + p4Points + p5Points;
  let isGated = false;
  let gateReason;
  if (!isHttps) {
    rawScore = Math.min(rawScore, 25);
    isGated = true;
    gateReason = "Insecure HTTP: Transport encryption is mandatory for production mint routing.";
  }
  if (latencyMs > 3500) {
    rawScore = Math.min(rawScore, 35);
    isGated = true;
    gateReason = "Extreme latency: Mint latency exceeded 3500ms threshold.";
  }
  if (!adminPubkey) {
    rawScore = Math.min(rawScore, 40);
    isGated = true;
    if (!gateReason) {
      gateReason = "No verifiable Nostr admin contact in mint metadata.";
    }
  }
  const finalTrustScore = Math.round(rawScore);
  let riskLevel;
  if (!adminPubkey || finalTrustScore < 45) {
    riskLevel = "HIGH_RISK";
  } else if (finalTrustScore >= 75) {
    riskLevel = "LOW";
  } else {
    riskLevel = "MODERATE";
  }
  let recommendation;
  if (riskLevel === "LOW") {
    recommendation = "TRUSTED";
  } else if (riskLevel === "MODERATE") {
    recommendation = "USE_WITH_CAP";
  } else {
    recommendation = "AVOID";
  }
  let tier;
  if (finalTrustScore >= 65) {
    tier = "Tier 1: High-Trust Verified Mint";
  } else if (finalTrustScore >= 45) {
    tier = "Tier 2: Community Mint";
  } else {
    tier = "Tier 3: Unverified / High-Risk Mint";
    isGated = true;
    if (!gateReason) {
      gateReason = "Trust score is below the WoT security threshold (< 45/100).";
    }
  }
  const result = {
    mintUrl: cleanUrl,
    trustScore: finalTrustScore,
    riskLevel,
    adminPubkey: adminPubkey || null,
    supportedNuts,
    recommendation,
    name: info.name || cleanUrl.replace(/^https?:\/\//, ""),
    version: info.version,
    description: info.description,
    isOnline: true,
    latencyMs,
    operatorNpub,
    operatorName: profile?.name || creatorDb?.name || void 0,
    wotDistance,
    wotEndorsersCount,
    nip05Verified: isNip05Verified,
    tier,
    isGated,
    gateReason,
    compliance,
    breakdown,
    auditedAt: Date.now()
  };
  auditCache.set(cleanUrl, { result, expiresAt: Date.now() + AUDIT_CACHE_TTL_MS });
  return result;
}
async function selectBestMint(mintCandidates) {
  if (!mintCandidates || mintCandidates.length === 0) {
    return null;
  }
  const audits = await Promise.all(
    mintCandidates.map(
      (url) => auditCashuMint(url).catch(() => ({
        mintUrl: url,
        trustScore: 0,
        riskLevel: "HIGH_RISK",
        adminPubkey: null,
        supportedNuts: [],
        recommendation: "AVOID",
        isOnline: false,
        latencyMs: 9999,
        wotDistance: 3,
        wotEndorsersCount: 0,
        tier: "Offline",
        isGated: true,
        gateReason: "Audit execution failure",
        compliance: {
          nut04Mint: false,
          nut05Melt: false,
          nut07StateCheck: false,
          nut08FeeReturn: false,
          nut10Dleq: false
        },
        breakdown: [],
        auditedAt: Date.now()
      }))
    )
  );
  const sorted = audits.sort((a, b) => {
    if (b.trustScore !== a.trustScore) {
      return b.trustScore - a.trustScore;
    }
    return (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999);
  });
  return sorted[0] || null;
}
async function routeCashuMint(options = {}) {
  const minScore = options.minTrustScore ?? 45;
  const candidates = options.candidateMints?.length ? options.candidateMints : DEFAULT_MINT_MESH_URLS;
  const audits = await Promise.all(
    candidates.map(
      (url) => auditCashuMint(url).catch((err) => {
        console.debug(`[MintMesh] Failed auditing ${url}:`, err);
        return {
          mintUrl: url,
          trustScore: 0,
          riskLevel: "HIGH_RISK",
          adminPubkey: null,
          supportedNuts: [],
          recommendation: "AVOID",
          isOnline: false,
          latencyMs: 9999,
          name: url,
          wotDistance: 3,
          wotEndorsersCount: 0,
          tier: "Offline",
          isGated: true,
          gateReason: "Audit execution error",
          compliance: {
            nut04Mint: false,
            nut05Melt: false,
            nut07StateCheck: false,
            nut08FeeReturn: false,
            nut10Dleq: false
          },
          breakdown: [],
          auditedAt: Date.now()
        };
      })
    )
  );
  const qualifiedMints = audits.filter(
    (a) => a.isOnline && a.trustScore >= minScore
  );
  const gatedOutMints = audits.filter(
    (a) => !a.isOnline || a.trustScore < minScore
  );
  const calculateRoutingScore = (a) => {
    const latencyScore = Math.max(0, 100 - Math.min(100, (a.latencyMs ?? 9999) / 20));
    const isPreferred = options.preferredMint && a.mintUrl.toLowerCase() === options.preferredMint.toLowerCase();
    const preferredBoost = isPreferred ? 15 : 0;
    return a.trustScore * 0.65 + latencyScore * 0.35 + preferredBoost;
  };
  const rankedMesh = (qualifiedMints.length > 0 ? qualifiedMints : audits).sort(
    (a, b) => calculateRoutingScore(b) - calculateRoutingScore(a)
  );
  const selectedMint = rankedMesh[0];
  return {
    selectedMint,
    rankedMesh,
    gatedOutMints,
    totalCandidateCount: audits.length,
    activeMeshCount: qualifiedMints.length,
    meshHealthy: qualifiedMints.length > 0
  };
}

export {
  DEFAULT_MINT_MESH_URLS,
  auditCashuMint,
  selectBestMint,
  routeCashuMint,
  DEFAULT_CASHU_MINT,
  parseCashuToken,
  createCashuMintQuote,
  sendCashuNutZap
};
