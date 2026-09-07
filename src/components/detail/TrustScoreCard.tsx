"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Activity, Code } from "lucide-react";
import { TrustScoreResult } from "@/lib/trust-score";
import TrustScoreBadge from "@/components/detail/TrustScoreBadge";
import EmbedBadgeModal from "@/components/detail/EmbedBadgeModal";

interface Props {
  trustData: TrustScoreResult;
  name: string;
  npub?: string;
}

export default function TrustScoreCard({ trustData, name, npub = "" }: Props) {
  const { score, tier, summary, breakdown } = trustData;
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);

  // Resolve npub from props or NIP-05 payload
  const targetNpub = npub || (trustData as any).npub || "";

  return (
    <>
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        
        {/* Header & embed badge trigger */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Activity className="w-4 h-4" /> Decentralized Reputation & Anti-Spam
            </div>
            <h3 className="text-2xl font-black">Nostr Identity Trust Score</h3>
          </div>

          {/* Embed badge modal button */}
          <button
            type="button"
            onClick={() => setIsEmbedOpen(true)}
            className="inline-flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white font-bold text-xs px-3.5 py-2 rounded-2xl transition-all cursor-pointer shadow-xs hover:scale-102"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Embed Badge</span>
          </button>
        </div>

        {/* Two-column layout: circular badge & risk overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Column 1: Circular badge */}
          <div className="md:col-span-1">
            <TrustScoreBadge score={score} tier={tier} />
          </div>

          {/* Column 2: Risk overview */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Reputation Assessment:
              </span>
              <p className="text-sm text-slate-300 leading-relaxed">
                {summary}
              </p>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
              💡 <strong>Why this matters:</strong> Nostr keypairs are free to generate. This algorithm analyzes NIP-05 DNS signatures, Web-of-Trust graph, and Lightning payment endpoints to prevent Sybil impersonation.
            </div>
          </div>

        </div>

        {/* 5 Detailed evaluation criteria */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verification Signal Checklist
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3"
              >
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-mono font-bold shrink-0 ${
                      item.passed ? "text-emerald-400" : "text-slate-500"
                    }`}>
                      +{item.points}/{item.maxPoints}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Embed badge modal */}
      <EmbedBadgeModal
        isOpen={isEmbedOpen}
        onClose={() => setIsEmbedOpen(false)}
        npub={targetNpub}
        name={name}
      />
    </>
  );
}