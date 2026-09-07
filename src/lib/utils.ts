import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Safely merges Tailwind CSS classes (shadcn/ui standard)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes system-wide URL slugs
 * Strips special characters, diacritics, and redundant whitespace
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Truncates long npub or Hex Pubkey strings
 * Example: "npub1sg6plzptd64u62a978hep2k2u72xqvvd5299cvfd0rrxn5z5avqssae6r6m" -> "npub1sg6p...ae6r6m"
 */
export function truncateKey(key: string, startLen = 8, endLen = 6): string {
  if (!key) return "";
  if (key.length <= startLen + endLen) return key;
  return `${key.slice(0, startLen)}...${key.slice(-endLen)}`;
}

/**
 * Formats Satoshi / Zap amounts with compact notation
 * Example: 1200 -> "1.2k Sats", 4500000 -> "4.5M Sats"
 */
export function formatSats(amount: number): string {
  if (!amount || isNaN(amount)) return "0 Sats";
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M Sats`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}k Sats`;
  }
  return `${amount.toLocaleString()} Sats`;
}