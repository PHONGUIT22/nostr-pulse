"use client";

import { 
  ShieldCheck, 
  Zap, 
  Globe, 
  Key, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Activity, 
  Award 
} from "lucide-react";
import { calculateTrustScore } from "@/lib/trust-score";
import { NostrProfile } from "@/lib/nostr";

interface Props {
  dataA: NostrProfile;
  dataB: NostrProfile;
}

export default function VersusTable({ dataA, dataB }: Props) {
  const nameA = dataA.displayName || dataA.name || "Creator A";
  const nameB = dataB.displayName || dataB.name || "Creator B";

  // Compute Trust Scores for both profiles
  const trustA = calculateTrustScore(dataA);
  const trustB = calculateTrustScore(dataB);

  const truncateKey = (key: string) =>
    key ? `${key.slice(0, 8)}...${key.slice(-6)}` : "—";

  const diffScore = Math.abs(trustA.score - trustB.score);
  const winnerName = trustA.score >= trustB.score ? nameA : nameB;
  const loserName = trustA.score >= trustB.score ? nameB : nameA;

  return (
    <div className="space-y-8">
      
      {/* Identity verdict summary card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md text-center">
        <div className="inline-flex items-center gap-1.5 text-purple-600 font-bold text-xs uppercase tracking-wider mb-2">
          <Award className="w-4 h-4" /> Reputation Verdict
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          {trustA.score === trustB.score ? (
            <span>Both creators hold equivalent <span className="text-purple-600">Trust Scores ({trustA.score} pts)</span></span>
          ) : (
            <span>
              <span className="text-purple-600">{winnerName}</span> has a{" "}
              <span className="text-emerald-600">+{diffScore} points HIGHER</span> Trust Score than {loserName}
            </span>
          )}
        </h2>
        <p className="text-slate-500 text-sm max-w-xl mx-auto">
          Higher trust scores indicate verified NIP-05 DNS signatures, active Lightning Zap addresses, and robust relay presence.
        </p>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Table header */}
        <div className="grid grid-cols-3 bg-slate-900 text-white p-4 text-sm font-bold text-center items-center">
          <div className="text-left pl-4">Nostr Metric</div>
          <div className="text-purple-400 flex flex-col items-center gap-1">
            {dataA.picture ? (
              <img src={dataA.picture} alt={nameA} className="w-9 h-9 rounded-full object-cover border-2 border-purple-400" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-800 text-white text-xs flex items-center justify-center font-bold">
                {nameA.charAt(0)}
              </div>
            )}
            <span className="truncate max-w-[120px] font-black">{nameA}</span>
          </div>
          <div className="text-amber-400 flex flex-col items-center gap-1">
            {dataB.picture ? (
              <img src={dataB.picture} alt={nameB} className="w-9 h-9 rounded-full object-cover border-2 border-amber-400" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-800 text-white text-xs flex items-center justify-center font-bold">
                {nameB.charAt(0)}
              </div>
            )}
            <span className="truncate max-w-[120px] font-black">{nameB}</span>
          </div>
        </div>

        {/* Metric rows */}
        <div className="divide-y divide-slate-100">
          
          {/* 1. Identity Trust Score row */}
          <div className="grid grid-cols-3 p-4 sm:p-5 items-center text-center bg-purple-50/50 hover:bg-purple-50 transition-colors">
            <div className="flex items-center gap-2 font-black text-purple-950 text-xs sm:text-sm text-left pl-2">
              <Activity className="w-4 h-4 text-purple-600 shrink-0 hidden sm:inline" />
              <span>Identity Trust Score</span>
            </div>
            
            <div>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-xl sm:text-2xl font-black ${
                  trustA.score >= 80 ? "text-emerald-600" : trustA.score >= 50 ? "text-amber-600" : "text-rose-600"
                }`}>
                  {trustA.score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  trustA.score >= 80 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : trustA.score >= 50 
                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {trustA.tier}
                </span>
              </div>
            </div>

            <div>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-xl sm:text-2xl font-black ${
                  trustB.score >= 80 ? "text-emerald-600" : trustB.score >= 50 ? "text-amber-600" : "text-rose-600"
                }`}>
                  {trustB.score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  trustB.score >= 80 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : trustB.score >= 50 
                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {trustB.tier}
                </span>
              </div>
            </div>
          </div>

          {/* 2. NIP-05 Verified Identifier */}
          <div className="grid grid-cols-3 p-4 sm:p-5 items-center text-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm text-left pl-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 hidden sm:inline" />
              <span>NIP-05 Verified</span>
            </div>
            <div>
              {dataA.nip05 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[110px]">{dataA.nip05}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" /> None
                </span>
              )}
            </div>
            <div>
              {dataB.nip05 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[110px]">{dataB.nip05}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" /> None
                </span>
              )}
            </div>
          </div>

          {/* 3. Lightning Address */}
          <div className="grid grid-cols-3 p-4 sm:p-5 items-center text-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm text-left pl-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 hidden sm:inline" />
              <span>Lightning Zaps</span>
            </div>
            <div>
              {dataA.lud16 || dataA.lud06 ? (
                <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 block truncate max-w-[130px] mx-auto">
                  ⚡ {dataA.lud16 || "Configured"}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Not Set</span>
              )}
            </div>
            <div>
              {dataB.lud16 || dataB.lud06 ? (
                <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 block truncate max-w-[130px] mx-auto">
                  ⚡ {dataB.lud16 || "Configured"}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Not Set</span>
              )}
            </div>
          </div>

          {/* 4. Public Key */}
          <div className="grid grid-cols-3 p-4 sm:p-5 items-center text-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm text-left pl-2">
              <Key className="w-4 h-4 text-slate-600 shrink-0 hidden sm:inline" />
              <span>Public Key (npub)</span>
            </div>
            <div className="font-mono text-xs text-slate-600">
              {truncateKey(dataA.npub)}
            </div>
            <div className="font-mono text-xs text-slate-600">
              {truncateKey(dataB.npub)}
            </div>
          </div>

          {/* 5. Website */}
          <div className="grid grid-cols-3 p-4 sm:p-5 items-center text-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm text-left pl-2">
              <Globe className="w-4 h-4 text-purple-600 shrink-0 hidden sm:inline" />
              <span>Website</span>
            </div>
            <div className="text-xs truncate max-w-[120px] mx-auto">
              {dataA.website ? (
                <a href={dataA.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                  {dataA.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <div className="text-xs truncate max-w-[120px] mx-auto">
              {dataB.website ? (
                <a href={dataB.website} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                  {dataB.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>

          {/* 6. Bio Length */}
          <div className="grid grid-cols-3 p-4 sm:p-5 items-center text-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm text-left pl-2">
              <FileText className="w-4 h-4 text-slate-600 shrink-0 hidden sm:inline" />
              <span>Bio Length</span>
            </div>
            <div className="text-xs font-semibold text-slate-700">
              {dataA.about ? `${dataA.about.length} chars` : "Empty"}
            </div>
            <div className="text-xs font-semibold text-slate-700">
              {dataB.about ? `${dataB.about.length} chars` : "Empty"}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}