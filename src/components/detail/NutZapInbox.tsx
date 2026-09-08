"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Coins, 
  Lock, 
  Unlock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  Clock, 
  ShieldCheck,
  Zap,
  Sparkles,
  Inbox,
  ArrowDownToLine
} from "lucide-react";
import { nip19 } from "nostr-tools";
import { 
  fetchIncomingNutZaps, 
  decryptNutZap, 
  claimNutZapToken, 
  verifyTokenWithMint,
  NutZapEvent, 
  DecryptedNutZap 
} from "@/lib/cashu";

interface Props {
  recipientPubkey: string;
  recipientNpub: string;
  recipientName: string;
}

export default function NutZapInbox({ recipientPubkey, recipientNpub, recipientName }: Props) {
  const [nutzaps, setNutzaps] = useState<NutZapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserNpub, setCurrentUserNpub] = useState<string | null>(null);
  
  // Decrypted states indexed by event ID
  const [decryptedMap, setDecryptedMap] = useState<Record<string, DecryptedNutZap>>({});
  const [decryptingMap, setDecryptingMap] = useState<Record<string, boolean>>({});
  const [decryptErrorMap, setDecryptErrorMap] = useState<Record<string, string>>({});

  // Proof verification states
  const [tokenStatusMap, setTokenStatusMap] = useState<Record<string, { isValid: boolean; reason?: string }>>({});

  // Claim states indexed by event ID
  const [claimingMap, setClaimingMap] = useState<Record<string, boolean>>({});
  const [claimResultMap, setClaimResultMap] = useState<Record<string, { success: boolean; amount?: number; newToken?: string; error?: string }>>({});

  // Copied token indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nostr_connected_npub");
      if (saved) setCurrentUserNpub(saved);
    }
  }, []);

  const loadNutZaps = useCallback(async () => {
    if (!recipientPubkey) return;
    setIsLoading(true);
    try {
      const events = await fetchIncomingNutZaps(recipientPubkey);
      setNutzaps(events);
    } catch (err) {
      console.warn("Failed to load incoming NutZaps:", err);
    } finally {
      setIsLoading(false);
    }
  }, [recipientPubkey]);

  useEffect(() => {
    loadNutZaps();
  }, [loadNutZaps]);

  // Decrypt single NutZap event
  const handleDecrypt = async (event: NutZapEvent) => {
    setDecryptingMap((prev) => ({ ...prev, [event.id]: true }));
    setDecryptErrorMap((prev) => ({ ...prev, [event.id]: "" }));

    try {
      const decrypted = await decryptNutZap(event);
      setDecryptedMap((prev) => ({ ...prev, [event.id]: decrypted }));

      // Automatically verify token proof state with mint
      if (decrypted.token) {
        verifyTokenWithMint(decrypted.token).then((res) => {
          setTokenStatusMap((prev) => ({ ...prev, [event.id]: res }));
        });
      }
    } catch (err: any) {
      setDecryptErrorMap((prev) => ({ 
        ...prev, 
        [event.id]: err.message || "Decryption failed. Ensure extension is unlocked." 
      }));
    } finally {
      setDecryptingMap((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  // Claim token with Mint
  const handleClaim = async (event: NutZapEvent) => {
    const dec = decryptedMap[event.id];
    if (!dec?.token) return;

    setClaimingMap((prev) => ({ ...prev, [event.id]: true }));

    try {
      const res = await claimNutZapToken(dec.token, dec.mint);
      setClaimResultMap((prev) => ({ ...prev, [event.id]: res }));
      if (res.success) {
        setTokenStatusMap((prev) => ({
          ...prev,
          [event.id]: { isValid: false, reason: "Already claimed & swapped into fresh proofs." },
        }));
      }
    } catch (err: any) {
      setClaimResultMap((prev) => ({
        ...prev,
        [event.id]: { success: false, error: err.message || "Failed to claim token." },
      }));
    } finally {
      setClaimingMap((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const timeAgo = (unix: number) => {
    const diff = Math.floor(Date.now() / 1000) - unix;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatSender = (pubkey: string) => {
    try {
      const npub = nip19.npubEncode(pubkey);
      return `${npub.slice(0, 10)}...${npub.slice(-4)}`;
    } catch {
      return `anon_${pubkey.slice(0, 6)}`;
    }
  };

  // Calculate total decrypted amount
  const totalDecryptedSats = Object.values(decryptedMap).reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div id="nutzap-inbox" className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
            <Coins className="w-5 h-5 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl">Incoming NutZaps Inbox</h3>
              <span className="bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> NIP-61 eCash Receiver
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kind 9321 encrypted Chaumian bearer tokens addressed to {recipientName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalDecryptedSats > 0 && (
            <span className="bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              {totalDecryptedSats.toLocaleString()} Sats Decrypted
            </span>
          )}

          <button
            type="button"
            onClick={loadNutZaps}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh NutZap Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Extension Signer Notice if not logged in */}
      {!currentUserNpub && (
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/60 text-xs text-purple-200 flex items-start gap-3">
          <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Encrypted Bearer Tokens (NIP-44 v2)</p>
            <p className="text-purple-300/80 text-[11px] leading-relaxed">
              NutZap payloads are end-to-end encrypted with the creator&apos;s public key. Log in with your Nostr extension (Alby, nos2x) using the recipient keypair to decrypt secret proofs and redeem Sats.
            </p>
          </div>
        </div>
      )}

      {/* NUTZAPS LIST */}
      <div className="space-y-4">
        {isLoading && nutzaps.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 space-y-2">
            <Loader2 className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
            <p className="text-xs text-slate-400">Scanning Nostr relays for Kind 9321 NutZaps...</p>
          </div>
        ) : nutzaps.length > 0 ? (
          nutzaps.map((event) => {
            const dec = decryptedMap[event.id];
            const isDec = Boolean(dec);
            const isDecrypting = Boolean(decryptingMap[event.id]);
            const decErr = decryptErrorMap[event.id];
            const tokenStatus = tokenStatusMap[event.id];
            const isClaiming = Boolean(claimingMap[event.id]);
            const claimResult = claimResultMap[event.id];

            return (
              <div
                key={event.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                  isDec
                    ? "bg-slate-950/80 border-emerald-500/40 shadow-emerald-500/5 shadow-lg"
                    : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                {/* Item Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDec ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                    }`}>
                      {isDec ? "🥜" : "🔒"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {formatSender(event.pubkey)}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {timeAgo(event.created_at)}
                        </span>
                        <span className="text-[10px] bg-purple-950/60 border border-purple-800/80 text-purple-300 font-mono px-2 py-0.5 rounded-md">
                          {event.encryptionScheme?.toUpperCase() || "NIP-44"}
                        </span>
                      </div>
                      {event.mintUrl && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          Mint: {event.mintUrl.replace(/^https?:\/\//, "")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side: Amount & Decrypt Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    {event.amountSats && !isDec && (
                      <span className="text-xs font-bold font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                        ~{event.amountSats.toLocaleString()} Sats
                      </span>
                    )}

                    {!isDec ? (
                      <button
                        type="button"
                        onClick={() => handleDecrypt(event)}
                        disabled={isDecrypting}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {isDecrypting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Decrypting...</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Decrypt</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-700/80 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        +{dec.amount.toLocaleString()} Sats
                      </span>
                    )}
                  </div>
                </div>

                {/* Decryption Error Notice */}
                {decErr && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{decErr}</span>
                  </div>
                )}

                {/* Decrypted Payload Content */}
                {isDec && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    {/* Memo / message */}
                    {dec.memo && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 italic">
                        &ldquo;{dec.memo}&rdquo;
                      </div>
                    )}

                    {/* Token Status & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        {tokenStatus && (
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            tokenStatus.isValid
                              ? "bg-emerald-950/60 border-emerald-700 text-emerald-400"
                              : "bg-amber-950/60 border-amber-700 text-amber-400"
                          }`}>
                            {tokenStatus.isValid ? "🟢 Unspent (Ready to Claim)" : `🟡 ${tokenStatus.reason || "Spent / Claimed"}`}
                          </span>
                        )}

                        {claimResult?.success && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600 text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Claimed & Swapped!
                          </span>
                        )}
                      </div>

                      {/* Action buttons: Claim & Copy */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(claimResult?.newToken || dec.token, event.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Copy Cashu Bearer Token"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedId === event.id ? "Copied!" : "Copy Token"}</span>
                        </button>

                        {!claimResult?.success && tokenStatus?.isValid !== false && (
                          <button
                            type="button"
                            onClick={() => handleClaim(event)}
                            disabled={isClaiming}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            {isClaiming ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Claiming...</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>Claim eCash</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Claim result error if any */}
                    {claimResult?.error && (
                      <p className="text-xs text-rose-400 font-mono">
                        Error: {claimResult.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 space-y-3">
            <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">
              No NutZaps in Inbox
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              No incoming encrypted NutZaps (Kind 9321) found on open relays for this creator yet. Send a test eCash NutZap above to test the full lifecycle!
            </p>
          </div>
        )}
      </div>

      {/* FOOTER METADATA */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2 border-t border-slate-800/60">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          End-to-End Encrypted via NIP-44 v2 (Chaumian Bearer Assets)
        </span>
        <span>NUT-00 V3 & V4 CBOR Token Support</span>
      </div>

    </div>
  );
}
