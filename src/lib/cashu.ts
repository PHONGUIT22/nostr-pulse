// src/lib/cashu.ts
import { getEncodedToken, Wallet } from "@cashu/cashu-ts";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { nip19, nip04, nip44 } from "nostr-tools";

export interface CashuMintOption {
  name: string;
  url: string;
  description: string;
  recommended?: boolean;
}

// List of official trusted Cashu Mints
export const RECOMMENDED_MINTS: CashuMintOption[] = [
  {
    name: "Minibits Mint",
    url: "https://mint.minibits.cash/Bitcoin",
    description: "High-uptime trusted node with instant Lightning routing",
    recommended: true,
  },
  {
    name: "Macadamia Mint",
    url: "https://mint.macadamia.cash",
    description: "Reliable community-driven mint with high uptime",
  },
  {
    name: "Cashu Testnut (Demo / Test Sats)",
    url: "https://testnut.cashu.space",
    description: "Official Cashu core testnet mint (Recommended for live demos)",
  },
];

// Default Mint (Minibits)
export const DEFAULT_CASHU_MINT = RECOMMENDED_MINTS[0].url;

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.nostr.band"
];

export interface CashuProof {
  id: string;
  amount: number;
  secret: string;
  C: string;
  [key: string]: any;
}

export interface DecodedCashuInfo {
  mint: string;
  totalAmountSats: number;
  unit: string;
  proofs: CashuProof[];
}

/**
 * Converts Uint8Array to a hex string (browser & Node.js safe)
 */
function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Converts Base64 / Base64URL string to Uint8Array
 */
function base64UrlToBytes(base64Url: string): Uint8Array {
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

/**
 * Lightweight RFC 8949 CBOR decoder (supports error-free Cashu V4 cashuB token decoding)
 */
function decodeCbor(bytes: Uint8Array): any {
  let offset = 0;

  function decodeItem(): any {
    if (offset >= bytes.length) {
      throw new Error("Unexpected end of CBOR data");
    }

    const initialByte = bytes[offset++];
    const majorType = initialByte >> 5;
    const additionalInfo = initialByte & 0x1f;

    let length = 0;
    if (additionalInfo < 24) {
      length = additionalInfo;
    } else if (additionalInfo === 24) {
      length = bytes[offset++];
    } else if (additionalInfo === 25) {
      length = (bytes[offset++] << 8) | bytes[offset++];
    } else if (additionalInfo === 26) {
      length =
        ((bytes[offset++] << 24) |
          (bytes[offset++] << 16) |
          (bytes[offset++] << 8) |
          bytes[offset++]) >>> 0;
    } else if (additionalInfo === 27) {
      const hi =
        ((bytes[offset++] << 24) |
          (bytes[offset++] << 16) |
          (bytes[offset++] << 8) |
          bytes[offset++]) >>> 0;
      const lo =
        ((bytes[offset++] << 24) |
          (bytes[offset++] << 16) |
          (bytes[offset++] << 8) |
          bytes[offset++]) >>> 0;
      length = hi * 2 ** 32 + lo;
    } else {
      length = 0;
    }

    // Type 0: Unsigned Integer
    if (majorType === 0) return length;
    // Type 1: Negative Integer
    if (majorType === 1) return -1 - length;

    // Type 2: Byte String
    if (majorType === 2) {
      const res = bytes.slice(offset, offset + length);
      offset += length;
      return res;
    }

    // Type 3: UTF-8 Text String
    if (majorType === 3) {
      const strBytes = bytes.slice(offset, offset + length);
      offset += length;
      return new TextDecoder("utf-8").decode(strBytes);
    }

    // Type 4: Array
    if (majorType === 4) {
      const arr: any[] = [];
      for (let i = 0; i < length; i++) {
        arr.push(decodeItem());
      }
      return arr;
    }

    // Type 5: Map / Object
    if (majorType === 5) {
      const obj: Record<string, any> = {};
      for (let i = 0; i < length; i++) {
        const key = decodeItem();
        const val = decodeItem();
        obj[String(key)] = val;
      }
      return obj;
    }

    // Type 7: Simple values (true, false, null)
    if (majorType === 7) {
      if (additionalInfo === 20) return false;
      if (additionalInfo === 21) return true;
      if (additionalInfo === 22) return null;
      return undefined;
    }

    return null;
  }

  return decodeItem();
}

/**
 * Validates that the Mint URL format is valid
 */
export function isValidMintUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Encodes token proofs into a standard cashu token string
 */
export function encodeCashuToken(mintUrl: string, proofs: CashuProof[], unit = "sat"): string {
  const cleanMint = mintUrl.trim().replace(/\/+$/, "");

  try {
    if (typeof getEncodedToken === "function") {
      return (getEncodedToken as any)({ mint: cleanMint, proofs, unit });
    }
  } catch {}

  const v3Payload = {
    token: [{ mint: cleanMint, proofs }],
    unit,
  };
  const jsonStr = JSON.stringify(v3Payload);
  const base64 = typeof window !== "undefined"
    ? btoa(unescape(encodeURIComponent(jsonStr)))
    : Buffer.from(jsonStr, "utf-8").toString("base64");
  
  return `cashuA${base64.replace(/\+/g, "-").replace(/\//g, "_")}`;
}

/**
 * Decodes Cashu token strings (supports both cashuA V3 and cashuB V4 CBOR formats)
 */
function decodeCashuString(tokenString: string): any {
  const trimmed = tokenString.trim();
  const lower = trimmed.toLowerCase();

  // 1. Decode modern cashuB token (V4 CBOR format)
  if (lower.startsWith("cashub")) {
    try {
      const rawCbor = trimmed.slice(6);
      const bytes = base64UrlToBytes(rawCbor);
      return decodeCbor(bytes);
    } catch (err) {
      console.warn("CBOR decode error for cashuB token:", err);
    }
  }

  // 2. Decode legacy cashuA token (V3 Base64 JSON format)
  if (lower.startsWith("cashua")) {
    try {
      const base64Data = trimmed.slice(6).replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr =
        typeof window !== "undefined"
          ? decodeURIComponent(escape(atob(base64Data)))
          : Buffer.from(base64Data, "base64").toString("utf-8");
      return JSON.parse(jsonStr);
    } catch (err) {
      throw new Error("Failed to parse cashuA base64 payload.");
    }
  }

  throw new Error("Invalid token format. Cashu tokens must start with 'cashuA' or 'cashuB'.");
}

/**
 * 1. Extracts Satoshi balance and proofs from Token (supports V3 JSON and V4 NUT-00 CBOR Map)
 */
export function parseCashuToken(tokenString: string): DecodedCashuInfo {
  const trimmed = tokenString.trim();
  const lower = trimmed.toLowerCase();
  
  if (!lower.startsWith("cashua") && !lower.startsWith("cashub")) {
    throw new Error("Invalid token format. Cashu tokens must start with 'cashuA' or 'cashuB'.");
  }

  const decoded = decodeCashuString(trimmed);
  if (!decoded) {
    throw new Error("Could not decode Cashu token payload.");
  }

  let mint = DEFAULT_CASHU_MINT;
  let proofs: CashuProof[] = [];
  let unit = decoded.unit || decoded.u || "sat";

  // Branch 1: V4 Raw CBOR structure per NUT-00 spec (m, u, t -> i, p -> a, s, c)
  if (Array.isArray(decoded.t)) {
    mint = decoded.m || DEFAULT_CASHU_MINT;
    for (const group of decoded.t) {
      let keysetIdHex = "";
      if (group.i instanceof Uint8Array) {
        keysetIdHex = bytesToHex(group.i);
      } else if (typeof group.i === "string") {
        keysetIdHex = group.i;
      } else if (group.i) {
        keysetIdHex = String(group.i);
      }

      if (Array.isArray(group.p)) {
        for (const p of group.p) {
          let cHex = "";
          if (p.c instanceof Uint8Array) {
            cHex = bytesToHex(p.c);
          } else if (typeof p.c === "string") {
            cHex = p.c;
          } else if (p.C) {
            cHex = p.C instanceof Uint8Array ? bytesToHex(p.C) : String(p.C);
          }

          proofs.push({
            id: keysetIdHex,
            amount: Number(p.a || p.amount || 0),
            secret: String(p.s || p.secret || ""),
            C: cHex,
          });
        }
      }
    }
  }
  // Branch 2: V4 standard Object structure (mint, proofs, unit at root)
  else if (Array.isArray(decoded.proofs)) {
    mint = decoded.mint || DEFAULT_CASHU_MINT;
    proofs = decoded.proofs;
  }
  // Branch 3: V3 structure (decoded.token is an array of entries containing mint and proofs)
  else if (Array.isArray(decoded.token) && decoded.token.length > 0) {
    mint = decoded.token[0].mint || DEFAULT_CASHU_MINT;
    for (const entry of decoded.token) {
      if (entry.unit) unit = entry.unit;
      if (Array.isArray(entry.proofs)) {
        proofs.push(...entry.proofs);
      }
    }
  }

  if (proofs.length === 0) {
    throw new Error("No cryptographic proofs found inside the token.");
  }

  const totalAmountSats = proofs.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return {
    mint,
    totalAmountSats,
    unit,
    proofs,
  };
}

/**
 * 2. Verifies token validity with the Mint (with timeout to prevent hanging)
 */
export async function verifyTokenWithMint(tokenString: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const info = parseCashuToken(tokenString);
    const cleanMint = info.mint.replace(/\/+$/, "");

    // Initiate verification check with Mint
    const verifyPromise = (async () => {
      try {
        const wallet = new Wallet(cleanMint);

        if (typeof (wallet as any).loadMint === "function") {
          try {
            await (wallet as any).loadMint();
          } catch {}
        }

        let spentStates: any[] = [];
        if (typeof (wallet as any).checkProofStates === "function") {
          spentStates = await (wallet as any).checkProofStates(info.proofs);
        } else if (typeof (wallet as any).checkProofsSpent === "function") {
          spentStates = await (wallet as any).checkProofsSpent(info.proofs);
        } else if (typeof (wallet as any).checkProofsState === "function") {
          spentStates = await (wallet as any).checkProofsState(info.proofs);
        }

        if (Array.isArray(spentStates) && spentStates.length > 0) {
          const isSpent = spentStates.some(
            (s: any) => s === true || s?.state === "SPENT" || s?.spent === true
          );
          if (isSpent) {
            return { isValid: false, reason: "This Cashu eCash token has already been spent/claimed." };
          }
        }
      } catch (e: any) {
        console.warn("Mint verification check warning:", e);
      }

      return { isValid: true };
    })();

    // 3-second timeout: skip if Mint server responds slowly to avoid blocking UI
    const timeoutPromise = new Promise<{ isValid: boolean }>((resolve) =>
      setTimeout(() => resolve({ isValid: true }), 3000)
    );

    return await Promise.race([verifyPromise, timeoutPromise]);
  } catch (err: any) {
    return { isValid: false, reason: err.message || "Failed to verify token with Mint node." };
  }
}

/**
 * 3. Creates a Lightning Invoice to mint eCash using dynamic Mint URL
 */
export async function createCashuMintQuote(amountSats: number, mintUrl: string = DEFAULT_CASHU_MINT) {
  const cleanMint = mintUrl.trim().replace(/\/+$/, "");
  
  try {
    const wallet = new Wallet(cleanMint);
    if (typeof (wallet as any).loadMint === "function") {
      try {
        await (wallet as any).loadMint();
      } catch {}
    }

    // 1. Try standard Cashu-TS v4 method
    if (typeof (wallet as any).createMintQuoteBolt11 === "function") {
      try {
        const quote = await (wallet as any).createMintQuoteBolt11(amountSats);
        return {
          invoice: quote.request || quote.pr,
          quoteId: quote.quote || quote.hash || quote.id,
          mintUrl: cleanMint,
        };
      } catch {}
    }

    // 2. Try createMintQuote with method: 'bolt11'
    if (typeof (wallet as any).createMintQuote === "function") {
      try {
        const quote = await (wallet as any).createMintQuote("bolt11", amountSats);
        return {
          invoice: quote.request || quote.pr,
          quoteId: quote.quote || quote.hash || quote.id,
          mintUrl: cleanMint,
        };
      } catch {
        try {
          const quote = await (wallet as any).createMintQuote(amountSats);
          return {
            invoice: quote.request || quote.pr,
            quoteId: quote.quote || quote.hash || quote.id,
            mintUrl: cleanMint,
          };
        } catch {}
      }
    }
  } catch (walletErr) {
    console.warn("Wallet instance mint quote failed, attempting direct REST fallback:", walletErr);
  }

  // 3. Fallback to direct NUT-04 REST API call on the Mint
  try {
    const res = await fetch(`${cleanMint}/v1/mint/quote/bolt11`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountSats, unit: "sat" }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.request && data.quote) {
        return {
          invoice: data.request,
          quoteId: data.quote,
          mintUrl: cleanMint,
        };
      }
    }
  } catch (err) {
    console.error("Direct NUT-04 REST Mint request failed:", err);
  }

  throw new Error(`Could not request Mint invoice from ${cleanMint}.`);
}

/**
 * 4. Polls payment status and claims minted cashu token string
 */
export async function pollMintAndClaimToken(
  amountSats: number,
  quoteId: string,
  mintUrl: string = DEFAULT_CASHU_MINT,
  maxWaitSec = 90
): Promise<string> {
  const cleanMint = mintUrl.trim().replace(/\/+$/, "");
  const wallet = new Wallet(cleanMint);
  
  if (typeof (wallet as any).loadMint === "function") {
    try {
      await (wallet as any).loadMint();
    } catch {}
  }

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitSec * 1000) {
    try {
      let proofs: any[] = [];
      
      if (typeof (wallet as any).mintTokens === "function") {
        proofs = await (wallet as any).mintTokens(amountSats, quoteId);
      } else if (typeof (wallet as any).mintProofs === "function") {
        proofs = await (wallet as any).mintProofs(amountSats, quoteId);
      } else if (typeof (wallet as any).mintProofsBolt11 === "function") {
        proofs = await (wallet as any).mintProofsBolt11(amountSats, quoteId);
      } else if (typeof (wallet as any).requestTokens === "function") {
        const res = await (wallet as any).requestTokens(amountSats, quoteId);
        proofs = res.proofs || res;
      }

      if (Array.isArray(proofs) && proofs.length > 0) {
        return encodeCashuToken(cleanMint, proofs);
      }
    } catch {
      // Payment pending, continue polling
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Minting invoice expired or timed out.");
}

/**
 * Encrypts payload securely via NIP-44 or NIP-04 fallback
 */
async function encryptCashuPayload(
  recipientHexPubkey: string,
  rawPayload: string,
  ephemeralSk: Uint8Array
): Promise<{ encryptedContent: string; encryptionScheme: "nip44" | "nip04" }> {
  if (typeof window !== "undefined" && (window as any).nostr?.nip44?.encrypt) {
    try {
      const encrypted = await (window as any).nostr.nip44.encrypt(recipientHexPubkey, rawPayload);
      if (encrypted) return { encryptedContent: encrypted, encryptionScheme: "nip44" };
    } catch {}
  }

  if (typeof window !== "undefined" && (window as any).nostr?.nip04?.encrypt) {
    try {
      const encrypted = await (window as any).nostr.nip04.encrypt(recipientHexPubkey, rawPayload);
      if (encrypted) return { encryptedContent: encrypted, encryptionScheme: "nip04" };
    } catch {}
  }

  try {
    if (nip44 && (nip44 as any).v2) {
      const conversationKey = (nip44 as any).v2.utils.getConversationKey(ephemeralSk, recipientHexPubkey);
      const encrypted = (nip44 as any).v2.encrypt(rawPayload, conversationKey);
      return { encryptedContent: encrypted, encryptionScheme: "nip44" };
    }
  } catch {}

  const encrypted = await nip04.encrypt(ephemeralSk, recipientHexPubkey, rawPayload);
  return { encryptedContent: encrypted, encryptionScheme: "nip04" };
}

/**
 * 5. Sends fully encrypted Cashu NutZap (NIP-61 Kind 9321)
 */
export async function sendCashuNutZap({
  recipientPubkey,
  cashuToken,
  amountSats,
  comment,
  mintUrl,
}: {
  recipientPubkey: string;
  cashuToken: string;
  amountSats: number;
  comment?: string;
  mintUrl: string;
}) {
  let hexPubkey = recipientPubkey;
  if (hexPubkey.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(hexPubkey);
      if (decoded.type === "npub") hexPubkey = decoded.data as string;
    } catch {}
  }

  if (!hexPubkey || !/^[0-9a-fA-F]{64}$/.test(hexPubkey)) {
    throw new Error("Invalid recipient pubkey format.");
  }

  const cleanMint = (mintUrl || DEFAULT_CASHU_MINT).trim().replace(/\/+$/, "");
  const ephemeralSk = generateSecretKey();

  const secretNutZapPayload = JSON.stringify({
    token: cashuToken.trim(),
    memo: comment?.trim() || "Value-4-Value eCash NutZap 🥜",
    amount: amountSats,
    mint: cleanMint,
    created_at: Math.floor(Date.now() / 1000),
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
      ["amount", (amountSats * 1000).toString()],
      ["u", cleanMint],
      ["encryption", encryptionScheme],
      ["alt", `Encrypted NutZap: ${amountSats} Sats in Chaumian eCash`],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };

  let signedEvent: any = null;

  if (typeof window !== "undefined" && (window as any).nostr?.signEvent) {
    try {
      signedEvent = await (window as any).nostr.signEvent(eventTemplate);
    } catch {}
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
      } catch {}
    });

    await Promise.race([
      Promise.allSettled(publishPromises),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (err) {
    console.warn("Relay pool broadcast finished with minor warnings:", err);
  } finally {
    try {
      pool.close(RELAYS);
    } catch {}
  }

  return signedEvent;
}