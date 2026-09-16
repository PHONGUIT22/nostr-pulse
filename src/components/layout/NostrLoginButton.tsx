"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import { 
  Key, 
  Loader2, 
  User, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  X, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { fetchUserRelays, mergeRelays } from "@/lib/nostr";

export default function NostrLoginButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("nostr_connected_npub");
    if (saved) {
      setUserNpub(saved);
    }
  }, []);

  // NIP-07 Login & NIP-65 relay synchronization
  const handleNip07Login = async () => {
    setIsConnecting(true);

    try {
      if (typeof window !== "undefined" && !(window as any).nostr) {
        setShowInstallModal(true);
        setIsConnecting(false);
        return;
      }

      const nostr = (window as any).nostr;
      const hexPubkey = await nostr.getPublicKey();

      if (!hexPubkey) {
        throw new Error("No public key returned from Nostr extension");
      }

      const npub = nip19.npubEncode(hexPubkey.toLowerCase());

      // 1. Fetch relays from browser extension (NIP-07 getRelays)
      let extensionRelays: string[] = [];
      if (typeof nostr.getRelays === "function") {
        try {
          const rawRelaysObj = await nostr.getRelays();
          if (rawRelaysObj && typeof rawRelaysObj === "object") {
            extensionRelays = Object.keys(rawRelaysObj);
          }
        } catch {}
      }

      // 2. Query NIP-65 relay list on network for this pubkey
      const nip65Relays = await fetchUserRelays(hexPubkey);
      const userAllRelays = mergeRelays(extensionRelays, nip65Relays);

      // 3. Persist login session and relay list to LocalStorage
      localStorage.setItem("nostr_connected_npub", npub);
      localStorage.setItem("nostr_user_relays", JSON.stringify(userAllRelays));
      setUserNpub(npub);

      router.push(`/p/${npub}`);
    } catch (err: any) {
      console.warn("NIP-07 Login error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem("nostr_connected_npub");
    localStorage.removeItem("nostr_user_relays");
    setUserNpub(null);
  };

  return (
    <>
      {userNpub ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/p/${userNpub}`)}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="View My Trust Score & Live Zaps"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>My Trust Score ({userNpub.slice(0, 8)}...)</span>
          </button>

          <button
            onClick={handleDisconnect}
            title="Disconnect Extension"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-full hover:bg-slate-100 transition-colors text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleNip07Login}
          disabled={isConnecting}
          className="bg-slate-900 hover:bg-purple-600 text-white font-bold px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full transition-all text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="hidden sm:inline">Connecting...</span>
            </>
          ) : (
            <>
              <Key className="w-4 h-4 text-purple-400" />
              <span>Login with Nostr</span>
            </>
          )}
        </button>
      )}

      {/* Extension installation modal */}
      {showInstallModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowInstallModal(false)}
        >
          <div 
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-white space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> NIP-07 Signer Required
              </div>
              <button 
                onClick={() => setShowInstallModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">No Nostr Extension Detected</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                To sign in with your cryptographic keypair and inspect your Reputation Score, install a browser extension:
              </p>
            </div>

            <div className="space-y-3">
              <a
                href="https://getalby.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">
                    ⚡
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block group-hover:text-amber-400 transition-colors">
                      Alby Extension (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Lightning Wallet & NIP-07 Nostr Signer
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
              </a>

              <a
                href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black text-xs">
                    🔑
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block group-hover:text-purple-400 transition-colors">
                      nos2x Signer
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Lightweight open-source Chrome extension
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
              </a>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-colors"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
}