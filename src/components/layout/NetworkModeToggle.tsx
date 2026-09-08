"use client";

import { useState, useEffect } from "react";
import { Zap, Shield, Wifi } from "lucide-react";
import { getNetworkMode, setNetworkMode, type NetworkMode } from "@/lib/network-mode";

export default function NetworkModeToggle() {
  const [mode, setMode] = useState<NetworkMode>("fast");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setMode(getNetworkMode());
  }, []);

  const handleToggle = () => {
    const newMode: NetworkMode = mode === "fast" ? "p2p" : "fast";
    setNetworkMode(newMode);
    setMode(newMode);

    // Show toast notification
    setToastMessage(
      newMode === "p2p"
        ? "Switched to Pure P2P Mode. All data is now queried directly from decentralized Nostr relays."
        : "Switched to Fast Cache Mode. Using accelerated CDN for instant data loading."
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border shadow-sm hover:scale-105"
        style={{
          background: mode === "fast" ? undefined : undefined,
        }}
        title={mode === "fast" ? "Fast Edge Cache (Primal Accelerated)" : "Pure P2P (Direct WebSocket Relays)"}
      >
        {mode === "fast" ? (
          <>
            <span className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-200/80 text-amber-700 px-2.5 py-1 rounded-full border">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>⚡ Fast Cache</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 bg-purple-50 border-purple-300/80 text-purple-700 px-2.5 py-1 rounded-full border relative">
              <Shield className="w-3.5 h-3.5 text-purple-500" />
              <span>🛡️ Pure P2P</span>
              {/* Ping pulse indicator */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
              </span>
            </span>
          </>
        )}
      </button>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold max-w-md ${
            mode === "p2p"
              ? "bg-purple-950 text-purple-100 border-purple-700"
              : "bg-slate-900 text-emerald-100 border-emerald-700"
          }`}>
            {mode === "p2p" ? (
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
