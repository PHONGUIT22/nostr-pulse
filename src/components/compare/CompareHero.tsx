"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, ArrowRightLeft, Search, Key, Loader2 } from "lucide-react";

interface Props {
  locA: string;
  locB: string;
  dataA: any;
  dataB: any;
}

export default function CompareHero({ locA, locB }: Props) {
  const [inputA, setInputA] = useState(locA);
  const [inputB, setInputB] = useState(locB);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanA = inputA.trim();
    const cleanB = inputB.trim();

    if (!cleanA || !cleanB || isSubmitting) return;

    setIsSubmitting(true);
    router.push(`/compare/${encodeURIComponent(cleanA)}-vs-${encodeURIComponent(cleanB)}`);
  };

  const handleSwap = () => {
    if (isSubmitting) return;

    const nextA = inputB;
    const nextB = inputA;
    setInputA(nextA);
    setInputB(nextB);

    if (nextA.trim() && nextB.trim()) {
      setIsSubmitting(true);
      router.push(`/compare/${encodeURIComponent(nextA.trim())}-vs-${encodeURIComponent(nextB.trim())}`);
    }
  };

  return (
    <section className="bg-slate-900 text-white pt-12 pb-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        
        <div className="inline-flex items-center gap-2 bg-slate-800 text-purple-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold mb-6">
          <Scale className="w-4 h-4 text-purple-400" /> Nostr Creator Versus Engine
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase mb-4">
          Compare Nostr Profiles
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-10">
          Compare NIP-05 verification, Lightning Zaps capability, metadata setups, and protocol identity between two Nostr users.
        </p>

        {/* Dual npub inputs & swap button */}
        <form onSubmit={handleCompare} className="max-w-3xl mx-auto bg-slate-800/90 p-4 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-3">
          
          <div className="relative w-full">
            <Key className="w-5 h-5 text-purple-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="Enter npub1... for Creator A"
              className="w-full bg-slate-900/80 text-white placeholder-slate-500 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Swap Creators"
            disabled={isSubmitting}
            className="p-3 bg-slate-700 hover:bg-purple-600 text-white rounded-2xl transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>

          <div className="relative w-full">
            <Key className="w-5 h-5 text-amber-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="Enter npub1... for Creator B"
              className="w-full bg-slate-900/80 text-white placeholder-slate-500 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Compare</span>
          </button>
        </form>

      </div>
    </section>
  );
}