#!/usr/bin/env node

// src/lib/identity-manager.ts
import fs from "fs";
import path from "path";
import os from "os";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
var cachedIdentity = null;
function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  if (clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) {
    throw new Error(`Invalid hexadecimal private key: "${hex}"`);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function parsePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;
  const trimmed = rawKey.trim();
  if (trimmed.startsWith("nsec1")) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === "nsec" && decoded.data instanceof Uint8Array) {
        return decoded.data;
      }
    } catch {
      return null;
    }
  }
  const cleanHex = trimmed.replace(/^0x/i, "");
  if (/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    try {
      return hexToBytes(cleanHex);
    } catch {
      return null;
    }
  }
  return null;
}
function getStorageDirectory(customCwd) {
  const primaryRoot = customCwd || process.cwd();
  return path.join(primaryRoot, ".nostrpulse");
}
function getIdentityFilePaths(customCwd) {
  const localDir = getStorageDirectory(customCwd);
  const homeDir = path.join(os.homedir(), ".nostrpulse");
  return {
    primary: path.join(localDir, "agent-identity.json"),
    fallback: path.join(homeDir, "agent-identity.json")
  };
}
function buildAgentIdentity(secretKey, source, isEphemeral, storagePath, existingTimestamp) {
  const privHex = bytesToHex(secretKey);
  const pubkey = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(pubkey);
  return {
    secretKey,
    privHex,
    nsec,
    pubkey,
    npub,
    isEphemeral,
    source,
    storagePath,
    createdAt: existingTimestamp || Date.now()
  };
}
function getOrInitAgentIdentity(options = {}) {
  if (cachedIdentity && !options.forceRefresh && !options.forceEphemeral) {
    return cachedIdentity;
  }
  const envKeyRaw = process.env.NOSTR_SECRET_KEY || process.env.AGENT_NSEC || process.env.AGENT_SECRET_KEY || process.env.DVM_SECRET_KEY;
  if (envKeyRaw && envKeyRaw.trim()) {
    const parsedSk = parsePrivateKey(envKeyRaw.trim());
    if (parsedSk) {
      const identity2 = buildAgentIdentity(parsedSk, "env", false);
      if (!options.forceEphemeral) {
        cachedIdentity = identity2;
      }
      return identity2;
    }
  }
  if (options.forceEphemeral) {
    const sk = generateSecretKey();
    return buildAgentIdentity(sk, "generated", true);
  }
  const filePaths = getIdentityFilePaths(options.cwd);
  for (const filePath of [filePaths.primary, filePaths.fallback]) {
    try {
      if (fs.existsSync(
        /*turbopackIgnore: true*/
        filePath
      )) {
        const fileContent = fs.readFileSync(
          /*turbopackIgnore: true*/
          filePath,
          "utf-8"
        );
        const parsed = JSON.parse(fileContent);
        if (parsed && (parsed.privHex || parsed.nsec)) {
          const sk = parsePrivateKey(parsed.privHex || parsed.nsec);
          if (sk) {
            const identity2 = buildAgentIdentity(
              sk,
              "file",
              false,
              filePath,
              parsed.createdAt
            );
            cachedIdentity = identity2;
            return identity2;
          }
        }
      }
    } catch {
    }
  }
  const newSecretKey = generateSecretKey();
  const identity = buildAgentIdentity(
    newSecretKey,
    "generated",
    false,
    filePaths.primary
  );
  try {
    const targetDir = path.dirname(filePaths.primary);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 448 });
    }
    const filePayload = {
      privHex: identity.privHex,
      nsec: identity.nsec,
      pubkey: identity.pubkey,
      npub: identity.npub,
      createdAt: identity.createdAt,
      label: "Auto-generated NostrPulse Agent Identity"
    };
    fs.writeFileSync(filePaths.primary, JSON.stringify(filePayload, null, 2), {
      encoding: "utf-8",
      mode: 384
    });
  } catch (err) {
    console.warn(
      "[IdentityManager] Notice: Could not persist agent identity to disk. Running in ephemeral mode:",
      err
    );
    identity.isEphemeral = true;
  }
  cachedIdentity = identity;
  return identity;
}
function getAgentPubkey() {
  return getOrInitAgentIdentity().pubkey;
}
function getAgentNpub() {
  return getOrInitAgentIdentity().npub;
}
function clearAgentIdentityCache() {
  cachedIdentity = null;
}

export {
  parsePrivateKey,
  getOrInitAgentIdentity,
  getAgentPubkey,
  getAgentNpub,
  clearAgentIdentityCache
};
