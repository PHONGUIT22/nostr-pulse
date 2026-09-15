"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Activity, Code, Users, ShieldAlert } from "lucide-react";
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
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Reputation Assessment:
                </span>
                {trustData.wotDistance !== undefined && (
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    trustData.wotDistance === 0
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                      : trustData.wotDistance === 1
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : trustData.wotDistance === 2
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-slate-800/80 text-slate-400 border-slate-700"
                  }`}>
                    {trustData.wotDistance === 0 && "Hop 0 • Core Anchor"}
                    {trustData.wotDistance === 1 && "Hop 1 • Ring-1 Verified"}
                    {trustData.wotDistance === 2 && "Hop 2 • Transitive Trust"}
                    {trustData.wotDistance === 3 && "Hop > 2 • Isolated Key"}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {summary}
              </p>
            </div>

            {/* Endorsed By Root Anchors */}
            {trustData.wotDetails?.endorsers && trustData.wotDetails.endorsers.length > 0 && (
              <div className="p-4 bg-purple-950/30 rounded-2xl border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2.5">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    Endorsed By ({trustData.wotDetails.endorsedByCount} Root Anchors)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trustData.wotDetails.endorsers.map((endorserName) => (
                    <span
                      key={endorserName}
                      className="inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full"
                    >
                      <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                      {endorserName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Anti-Sybil Economic Stake Dual Progress Bar */}
            {trustData.economicStake && (trustData.economicStake.totalValidSats > 0 || trustData.economicStake.totalFilteredSats > 0) && (() => {
              const verified = trustData.economicStake!.totalValidSats;
              const filtered = trustData.economicStake!.totalFilteredSats;
              const total = verified + filtered;
              const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
              const filteredPct = total > 0 ? Math.round((filtered / total) * 100) : 0;

              return (
                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Anti-Sybil Economic Stake Analysis
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {total.toLocaleString()} Total Sats
                    </span>
                  </div>

                  {/* Dual progress bar */}
                  <div className="w-full h-5 rounded-full overflow-hidden bg-slate-800 flex">
                    {verifiedPct > 0 && (
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out flex items-center justify-center"
                        style={{ width: `${Math.max(verifiedPct, 3)}%` }}
                      >
                        {verifiedPct >= 15 && (
                          <span className="text-[10px] font-black text-slate-950 px-1">
                            {verifiedPct}%
                          </span>
                        )}
                      </div>
                    )}
                    {filteredPct > 0 && (
                      <div
                        className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-700 ease-out flex items-center justify-center"
                        style={{ width: `${Math.max(filteredPct, 3)}%` }}
                      >
                        {filteredPct >= 15 && (
                          <span className="text-[10px] font-black text-white/90 px-1">
                            {filteredPct}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-between gap-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-emerald-300 font-bold">
                        Verified WoT Sats:
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {verified.toLocaleString()}
                      </span>
                      <span className="text-slate-500">
                        ({trustData.economicStake!.validZapsCount} zaps)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-rose-300 font-bold">
                        Sybil Filtered:
                      </span>
                      <span className="font-mono font-bold text-rose-400">
                        {filtered.toLocaleString()}
                      </span>
                      <span className="text-slate-500">
                        ({trustData.economicStake!.filteredSybilZapsCount} zaps)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

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