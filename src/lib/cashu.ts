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
  "wss://nostr.band",
  "wss://purplerelay.com",
  "wss://relay.current.fyi"
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
 * 2. Verifies token validity with the Mint (Enforces Fail-Closed security)
 */
export async function verifyTokenWithMint(tokenString: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const info = parseCashuToken(tokenString);
    const cleanMint = info.mint.replace(/\/+$/, "");

    // Initiate verification check with Mint
    const verifyPromise = (async (): Promise<{ isValid: boolean; reason?: string }> => {
      try {
        const wallet = new Wallet(cleanMint);

        if (typeof (wallet as any).loadMint === "function") {
          try {
            await (wallet as any).loadMint();
          } catch {}
        }

        let spentStates: any[] = [];
        if (typeof (wallet as any).checkProofsStates === "function") {
          spentStates = await (wallet as any).checkProofsStates(info.proofs);
        } else if (typeof (wallet as any).checkProofStates === "function") {
          spentStates = await (wallet as any).checkProofStates(info.proofs);
        } else if (typeof (wallet as any).checkProofsSpent === "function") {
          spentStates = await (wallet as any).checkProofsSpent(info.proofs);
        } else if (typeof (wallet as any).checkProofsState === "function") {
          spentStates = await (wallet as any).checkProofsState(info.proofs);
        }

        if (Array.isArray(spentStates) && spentStates.length > 0) {
          const isSpent = spentStates.some(
            (s: any) =>
              s === true ||
              s?.state === "SPENT" ||
              s?.state === "spent" ||
              s?.spent === true
          );
          if (isSpent) {
            return { isValid: false, reason: "This Cashu eCash token has already been spent/claimed." };
          }
          return { isValid: true };
        }

        // Fail-Closed: If mint returned no proof states, cannot verify
        return { isValid: false, reason: "Unable to verify token state with Mint" };
      } catch (e: any) {
        console.warn("Mint verification check error:", e);
        return { isValid: false, reason: "Unable to verify token state with Mint" };
      }
    })();

    // 4-second timeout: Fail-Closed if Mint server fails or times out
    const timeoutPromise = new Promise<{ isValid: boolean; reason?: string }>((resolve) =>
      setTimeout(() => resolve({ isValid: false, reason: "Unable to verify token state with Mint" }), 4000)
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
    const pubPromises = pool.publish(RELAYS, signedEvent);
    await Promise.race([
      Promise.any(pubPromises),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);
  } catch (err) {
    console.warn("NutZap publish warning:", err);
  }

  return signedEvent;
}

export interface NutZapEvent {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  recipientPubkey: string;
  amountSats?: number;
  mintUrl?: string;
  encryptionScheme?: string;
}

export interface DecryptedNutZap {
  token: string;
  memo: string;
  amount: number;
  mint: string;
}

/**
 * 6. Queries open relays for incoming Kind 9321 NutZaps for a given user pubkey
 */
export async function fetchIncomingNutZaps(
  userHexPubkey: string,
  relays?: string[]
): Promise<NutZapEvent[]> {
  let hex = userHexPubkey.trim();
  if (hex.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(hex);
      if (decoded.type === "npub") hex = decoded.data as string;
    } catch {}
  }

  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    return [];
  }

  const targetRelays = relays && relays.length > 0 ? relays : RELAYS;
  const pool = new SimplePool();

  try {
    const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 4000));

    const queryPromise = pool.querySync(targetRelays, {
      kinds: [9321],
      "#p": [hex.toLowerCase()],
      limit: 50,
    }).catch(() => []);

    const events = await Promise.race([queryPromise, timeoutPromise]);

    if (!Array.isArray(events)) return [];

    return events
      .sort((a, b) => b.created_at - a.created_at)
      .map((e) => {
        const amtTag = e.tags?.find((t: any) => t[0] === "amount");
        const mintTag = e.tags?.find((t: any) => t[0] === "u");
        const encTag = e.tags?.find((t: any) => t[0] === "encryption");
        const amountSats = amtTag && amtTag[1] ? Math.round(Number(amtTag[1]) / 1000) : undefined;
        const mintUrl = mintTag && mintTag[1] ? mintTag[1] : undefined;
        const encryptionScheme = encTag && encTag[1] ? encTag[1] : undefined;

        return {
          id: e.id,
          pubkey: e.pubkey,
          content: e.content,
          created_at: e.created_at,
          tags: e.tags || [],
          recipientPubkey: hex.toLowerCase(),
          amountSats,
          mintUrl,
          encryptionScheme,
        };
      });
  } catch (err) {
    console.warn("Failed to fetch incoming NutZaps:", err);
    return [];
  } finally {
    try {
      pool.close(targetRelays);
    } catch {}
  }
}

/**
 * 7. Decrypts an incoming Kind 9321 NutZap event using NIP-44 (or NIP-04 fallback) via window.nostr
 */
export async function decryptNutZap(
  event: any
): Promise<{ token: string; memo: string; amount: number; mint: string }> {
  if (typeof window === "undefined" || !(window as any).nostr) {
    throw new Error("Nostr browser extension (window.nostr) is required to decrypt private NutZaps.");
  }

  const nostr = (window as any).nostr;
  let decryptedText = "";

  const encTag = event.tags?.find((t: any) => t[0] === "encryption");
  const isNip04 = encTag && encTag[1] === "nip04";

  // Priority 1: NIP-44 Decrypt via window.nostr.nip44
  if (!isNip04 && nostr.nip44?.decrypt) {
    try {
      decryptedText = await nostr.nip44.decrypt(event.pubkey, event.content);
    } catch (nip44Err) {
      console.warn("window.nostr.nip44.decrypt failed, attempting NIP-04 fallback:", nip44Err);
    }
  }

  // Priority 2: Fallback to NIP-04 Decrypt
  if (!decryptedText && nostr.nip04?.decrypt) {
    try {
      decryptedText = await nostr.nip04.decrypt(event.pubkey, event.content);
    } catch (nip04Err) {
      console.warn("window.nostr.nip04.decrypt failed:", nip04Err);
    }
  }

  if (!decryptedText) {
    throw new Error("Could not decrypt NutZap. Ensure your active Nostr extension has the private key for this recipient.");
  }

  // Parse payload (either JSON object or direct cashu token)
  try {
    const data = JSON.parse(decryptedText);
    const token = data.token || "";
    let amount = Number(data.amount || 0);
    let mint = data.mint || "";

    if ((!amount || !mint) && token) {
      try {
        const parsed = parseCashuToken(token);
        if (!amount) amount = parsed.totalAmountSats;
        if (!mint) mint = parsed.mint;
      } catch {}
    }

    return {
      token,
      memo: data.memo || "",
      amount,
      mint,
    };
  } catch {
    const trimmed = decryptedText.trim();
    if (trimmed.startsWith("cashuA") || trimmed.startsWith("cashuB")) {
      const parsed = parseCashuToken(trimmed);
      return {
        token: trimmed,
        memo: "",
        amount: parsed.totalAmountSats,
        mint: parsed.mint,
      };
    }
    throw new Error("Decrypted NutZap content is not a valid JSON or Cashu token.");
  }
}

/**
 * 8. Claims / redeems an incoming Cashu token by swapping proofs at the Mint
 * This invalidates the sender's proofs and gives the recipient fresh secret proofs.
 */
export async function claimNutZapToken(
  tokenString: string,
  mintUrl?: string
): Promise<{
  success: boolean;
  amountSats: number;
  mint: string;
  newToken?: string;
  error?: string;
}> {
  try {
    const parsed = parseCashuToken(tokenString);
    let cleanMint = (mintUrl || parsed.mint || DEFAULT_CASHU_MINT).trim().replace(/\/+$/, "");
    if (!cleanMint.startsWith("http://") && !cleanMint.startsWith("https://")) {
      cleanMint = `https://${cleanMint}`;
    }

    const normalizedUnit = (parsed.unit || "sat").toLowerCase().trim();
    const wallet = new Wallet(cleanMint, { unit: normalizedUnit });

    // 1. Load mint metadata
    try {
      if (typeof (wallet as any).loadMint === "function") {
        await (wallet as any).loadMint(true);
      }
    } catch (loadErr) {
      console.warn("[claimNutZapToken] loadMint warning:", loadErr);
    }

    // 2. Query all active Keyset IDs directly from Mint to resolve truncated IDs
    let mintKeysetIds: string[] = [];
    try {
      const res = await fetch(`${cleanMint}/v1/keysets`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.keysets)) {
          mintKeysetIds = data.keysets.map((k: any) => k.id);
        }
      }
    } catch (err) {
      console.warn("[claimNutZapToken] Direct keysets fetch failed, trying wallet cache:", err);
      mintKeysetIds = (wallet as any).keyChain?.cache?.keysets?.map((k: any) => k.id) || [];
    }

    // 3. Auto-expand truncated 16-hex Keyset ID (NUT-00 CBOR) to full 66-hex Keyset ID
    const normalizedProofs = parsed.proofs.map((proof: any) => {
      const rawId = String(proof.id);
      const fullMatch = mintKeysetIds.find((fullId) => fullId === rawId || fullId.startsWith(rawId));
      if (fullMatch && fullMatch !== rawId) {
        return { ...proof, id: fullMatch };
      }
      return proof;
    });

    // 4. Ensure wallet has loaded the keys for these keysets
    if (typeof (wallet as any).ensureOperableKeysets === "function") {
      const targetKeysets = Array.from(new Set(normalizedProofs.map((p: any) => p.id)));
      await (wallet as any).ensureOperableKeysets(targetKeysets).catch(() => {});
    }

    // 5. Construct canonical flat Token object (Cashu-TS v4 structure)
    const canonicalFlatToken = {
      mint: cleanMint,
      proofs: normalizedProofs,
      unit: normalizedUnit,
    };

    // Also encode a canonical token string containing full keyset IDs as fallback
    const canonicalTokenString = encodeCashuToken(cleanMint, normalizedProofs, normalizedUnit);

    let claimedProofs: any[] = [];

    // Priority 1: wallet.receive(canonicalFlatToken)
    try {
      const res = await (wallet as any).receive(canonicalFlatToken);
      if (Array.isArray(res)) {
        claimedProofs = res;
      } else if (res && Array.isArray(res.proofs)) {
        claimedProofs = res.proofs;
      }
    } catch (flatErr) {
      console.warn("[claimNutZapToken] receive(canonicalFlatToken) failed, trying canonicalTokenString:", flatErr);
      // Priority 2: wallet.receive(canonicalTokenString)
      try {
        const res2 = await (wallet as any).receive(canonicalTokenString);
        if (Array.isArray(res2)) {
          claimedProofs = res2;
        } else if (res2 && Array.isArray(res2.proofs)) {
          claimedProofs = res2.proofs;
        }
      } catch (strErr) {
        // Priority 3: wallet.ops.receive(normalizedProofs).run()
        if ((wallet as any).ops && typeof (wallet as any).ops.receive === "function") {
          claimedProofs = await (wallet as any).ops.receive(normalizedProofs).run();
        } else {
          throw strErr;
        }
      }
    }

    const totalAmount = claimedProofs.length > 0
      ? claimedProofs.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      : parsed.totalAmountSats;

    const newToken = claimedProofs.length > 0
      ? encodeCashuToken(cleanMint, claimedProofs, normalizedUnit)
      : canonicalTokenString;

    return {
      success: true,
      amountSats: totalAmount,
      mint: cleanMint,
      newToken,
    };
  } catch (err: any) {
    console.error("[claimNutZapToken] claim error:", err);
    return {
      success: false,
      amountSats: 0,
      mint: mintUrl || "",
      error: err.message || "Failed to claim eCash token with Mint.",
    };
  }
}