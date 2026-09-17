// src/lib/identity-manager.ts
/**
 * Zero-Config Identity Bootstrapping for AI Agents & NostrPulse MCP
 *
 * Implements a 3-tier priority resolution flow to eliminate developer friction:
 * 1. Read process.env.NOSTR_SECRET_KEY or process.env.AGENT_NSEC (hex or nsec1...).
 * 2. Read locally persisted identity from .nostrpulse/agent-identity.json.
 * 3. Generate a fresh cryptographically secure secp256k1 keypair and persist it.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";

export interface AgentIdentity {
  /** Raw 32-byte secret key */
  secretKey: Uint8Array;
  /** 64-character lowercase hex private key */
  privHex: string;
  /** Bech32 nsec-encoded private key */
  nsec: string;
  /** 64-character lowercase hex public key */
  pubkey: string;
  /** Bech32 npub-encoded public key */
  npub: string;
  /** True if this identity was dynamically generated in-memory without persistent storage */
  isEphemeral: boolean;
  /** Source of this identity */
  source: "env" | "file" | "generated";
  /** File path where identity is stored (if source !== 'env' and not purely ephemeral) */
  storagePath?: string;
  /** Timestamp when the identity was initialized */
  createdAt: number;
}

export interface StoredIdentityFile {
  privHex: string;
  nsec: string;
  pubkey: string;
  npub: string;
  createdAt: number;
  label?: string;
}

// In-memory singleton cache for fast non-blocking lookups
let cachedIdentity: AgentIdentity | null = null;

/**
 * Converts a Uint8Array into a lowercase hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Converts a hex string into a Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
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

/**
 * Parses a raw private key string (hex or nsec1...) into a 32-byte Uint8Array
 */
export function parsePrivateKey(rawKey: string): Uint8Array | null {
  if (!rawKey || typeof rawKey !== "string") return null;
  const trimmed = rawKey.trim();

  // Case 1: Bech32 nsec1...
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

  // Case 2: 64-character hex string
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

/**
 * Resolves the primary storage directory for .nostrpulse local files
 */
function getStorageDirectory(customCwd?: string): string {
  const primaryRoot = customCwd || process.cwd();
  return path.join(primaryRoot, ".nostrpulse");
}

/**
 * Resolves primary and fallback file paths for agent identity JSON
 */
function getIdentityFilePaths(customCwd?: string): { primary: string; fallback: string } {
  const localDir = getStorageDirectory(customCwd);
  const homeDir = path.join(os.homedir(), ".nostrpulse");

  return {
    primary: path.join(localDir, "agent-identity.json"),
    fallback: path.join(homeDir, "agent-identity.json"),
  };
}

/**
 * Constructs an AgentIdentity structure from a 32-byte secret key
 */
function buildAgentIdentity(
  secretKey: Uint8Array,
  source: AgentIdentity["source"],
  isEphemeral: boolean,
  storagePath?: string,
  existingTimestamp?: number
): AgentIdentity {
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
    createdAt: existingTimestamp || Date.now(),
  };
}

/**
 * Retrieves the current agent identity or initializes a new one based on priority:
 * 1. Environment variables (NOSTR_SECRET_KEY, AGENT_NSEC, or DVM_SECRET_KEY)
 * 2. Local storage (.nostrpulse/agent-identity.json)
 * 3. Fresh auto-generation and persistence
 *
 * @param options.forceRefresh - Bypass in-memory singleton cache
 * @param options.forceEphemeral - Do not read or write from disk, purely in-memory
 * @param options.cwd - Custom working directory for .nostrpulse
 */
export function getOrInitAgentIdentity(options: {
  forceRefresh?: boolean;
  forceEphemeral?: boolean;
  cwd?: string;
} = {}): AgentIdentity {
  if (cachedIdentity && !options.forceRefresh && !options.forceEphemeral) {
    return cachedIdentity;
  }

  // ---------------------------------------------------------------------------
  // Priority 1: Environment Variables
  // ---------------------------------------------------------------------------
  const envKeyRaw =
    process.env.NOSTR_SECRET_KEY ||
    process.env.AGENT_NSEC ||
    process.env.AGENT_SECRET_KEY ||
    process.env.DVM_SECRET_KEY;

  if (envKeyRaw && envKeyRaw.trim()) {
    const parsedSk = parsePrivateKey(envKeyRaw.trim());
    if (parsedSk) {
      const identity = buildAgentIdentity(parsedSk, "env", false);
      if (!options.forceEphemeral) {
        cachedIdentity = identity;
      }
      return identity;
    }
  }

  // If ephemeral mode requested, generate without persisting
  if (options.forceEphemeral) {
    const sk = generateSecretKey();
    return buildAgentIdentity(sk, "generated", true);
  }

  // ---------------------------------------------------------------------------
  // Priority 2: Persistent Local Storage (.nostrpulse/agent-identity.json)
  // ---------------------------------------------------------------------------
  const filePaths = getIdentityFilePaths(options.cwd);

  for (const filePath of [filePaths.primary, filePaths.fallback]) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
        const parsed: StoredIdentityFile = JSON.parse(fileContent);

        if (parsed && (parsed.privHex || parsed.nsec)) {
          const sk = parsePrivateKey(parsed.privHex || parsed.nsec);
          if (sk) {
            const identity = buildAgentIdentity(
              sk,
              "file",
              false,
              filePath,
              parsed.createdAt
            );
            cachedIdentity = identity;
            return identity;
          }
        }
      }
    } catch {
      // Continue to next path if corrupted or unreadable
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 3: Generate Fresh Secp256k1 Keypair and Persist
  // ---------------------------------------------------------------------------
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
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
    }

    const filePayload: StoredIdentityFile = {
      privHex: identity.privHex,
      nsec: identity.nsec,
      pubkey: identity.pubkey,
      npub: identity.npub,
      createdAt: identity.createdAt,
      label: "Auto-generated NostrPulse Agent Identity",
    };

    fs.writeFileSync(filePaths.primary, JSON.stringify(filePayload, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
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

/**
 * Returns the 64-character lowercase hex public key of the active agent identity
 */
export function getAgentPubkey(): string {
  return getOrInitAgentIdentity().pubkey;
}

/**
 * Returns the bech32 npub representation of the active agent identity
 */
export function getAgentNpub(): string {
  return getOrInitAgentIdentity().npub;
}

/**
 * Resets the in-memory cached identity (useful for unit tests or switching keys)
 */
export function clearAgentIdentityCache(): void {
  cachedIdentity = null;
}
