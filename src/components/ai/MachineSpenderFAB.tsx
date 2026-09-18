"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot, Zap, X, ExternalLink, Sparkles } from "lucide-react";
import MachineSpenderBot from "@/components/ai/MachineSpenderBot";

export default function MachineSpenderFAB() {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. FLOATING ACTION BUTTON (FAB) */}
      {/* ------------------------------------------------------------- */}
      {!isOpen && (
        <aside aria-label="AI Agent Assistant" className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Machine Money Agent"
            className="group flex items-center gap-3 bg-slate-900/95 hover:bg-slate-900 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl border border-emerald-500/60 hover:border-emerald-400 transition-all transform hover:scale-105 cursor-pointer backdrop-blur-md"
          >
            {/* Pulsing indicator */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>

            {/* Icon */}
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
              <Bot className="w-4 h-4 fill-slate-950" />
            </div>

            {/* Label */}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                <span>AI Machine Money</span>
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Autonomous NutZap Bot</span>
              </div>
            </div>
          </button>
        </aside>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SLIDE-UP MODAL / POPUP DIALOG */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop click to dismiss */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="w-full sm:max-w-4xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-300">
            {/* Modal Header Bar */}
            <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    NostrPulse Machine Money Agent
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Autonomous eCash (Cashu) &amp; Nostr settlement
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-2">
                <Link
                  href="/agent"
                  target="_blank"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Open Dedicated Full Page (/agent)"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Close Agent Dialog (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
              <MachineSpenderBot />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
