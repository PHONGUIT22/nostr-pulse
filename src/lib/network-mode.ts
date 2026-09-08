// src/lib/network-mode.ts

export type NetworkMode = "fast" | "p2p";

const STORAGE_KEY = "nostrpulse_network_mode";

/**
 * Gets the current network mode from localStorage.
 * Defaults to 'fast' (Primal edge cache accelerated).
 */
export function getNetworkMode(): NetworkMode {
  if (typeof window === "undefined") return "fast";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "p2p") return "p2p";
  } catch {}
  return "fast";
}

/**
 * Sets the network mode in localStorage.
 */
export function setNetworkMode(mode: NetworkMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
}

/**
 * Returns true if currently in Pure P2P mode (bypass all centralized APIs).
 */
export function isPeerToPeerMode(): boolean {
  return getNetworkMode() === "p2p";
}
