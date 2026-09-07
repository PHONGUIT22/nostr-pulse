// src/lib/nip05.ts

export interface Nip05Result {
  isVerified: boolean;
  nip05: string;
  domain?: string;
  name?: string;
  error?: string;
}

/**
 * Cryptographic verification of NIP-05 DNS signature
 * Fetches https://<domain>/.well-known/nostr.json?name=<name>
 */
export async function verifyNip05(
  nip05: string | undefined,
  pubkey: string
): Promise<Nip05Result> {
  if (!nip05 || !nip05.includes("@") || !pubkey) {
    return {
      isVerified: false,
      nip05: nip05 || "",
      error: "No NIP-05 identifier found",
    };
  }

  const clean = nip05.trim().toLowerCase();
  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { isVerified: false, nip05: clean, error: "Invalid format" };
  }

  const [name, domain] = parts;

  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
    
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500), // 2.5s timeout to avoid hanging
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return {
        isVerified: false,
        nip05: clean,
        domain,
        name,
        error: `DNS host returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const matchedPubkey = data?.names?.[name]?.toLowerCase();

    // Match pubkey signature in DNS host record
    if (matchedPubkey && matchedPubkey === pubkey.toLowerCase()) {
      return {
        isVerified: true,
        nip05: clean,
        domain,
        name,
      };
    }

    return {
      isVerified: false,
      nip05: clean,
      domain,
      name,
      error: "Public key mismatch in DNS nostr.json (Potential Impersonator)",
    };
  } catch (err: any) {
    return {
      isVerified: false,
      nip05: clean,
      domain,
      name,
      error: err.message || "DNS verification timed out",
    };
  }
}