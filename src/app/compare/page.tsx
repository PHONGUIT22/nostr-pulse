"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FEATURED_CREATORS, Creator } from "@/lib/creators";
import { 
  Scale, 
  ArrowRightLeft, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Award, 
  ArrowRight, 
  UserCheck, 
  Flame,
  Swords,
  Key
} from "lucide-react";

export default function CompareHubPage() {
  const router = useRouter();
  const creators = FEATURED_CREATORS;

  // Selected creators A & B (defaults to first two)
  const [selectedNpubA, setSelectedNpubA] = useState<string>(creators[0]?.npub || "");
  const [selectedNpubB, setSelectedNpubB] = useState<string>(creators[1]?.npub || "");

  // Find creator object for avatar preview
  const creatorA = creators.find((c) => c.npub === selectedNpubA) || creators[0];
  const creatorB = creators.find((c) => c.npub === selectedNpubB) || creators[1];

  // Handle comparison navigation
  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNpubA || !selectedNpubB) return;
    router.push(`/compare/${encodeURIComponent(selectedNpubA)}-vs-${encodeURIComponent(selectedNpubB)}`);
  };

  // Swap creators handler
  const handleSwap = () => {
    const temp = selectedNpubA;
    setSelectedNpubA(selectedNpubB);
    setSelectedNpubB(temp);
  };

  // Featured comparison pairs
  const POPULAR_MATCHUPS = [
    {
      c1: creators[0] || { name: "fiatjaf", handle: "fiatjaf", npub: "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6" },
      c2: creators[1] || { name: "Jack Dorsey", handle: "jack", npub: "npub1sg6plzptd64u62a978hep2k2u72xqvvd5299cvfd0rrxn5z5avqssae6r6m" },
      tag: "Protocol Founders",
    },
    {
      c1: creators[2] || { name: "jb55", handle: "jb55", npub: "npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s" },
      c2: creators[3] || { name: "ODELL", handle: "ODELL", npub: "npub1qfl2942sp4775d862800sv8aev2u6v4p84y2a506etp0a5t43d2s250d4w" },
      tag: "Builders & Podcasters",
    },
    {
      c1: creators[4] || { name: "NVK", handle: "nvk", npub: "npub1qny3tkh0xuz24ldrzct50hn5fhqr5t0m8w27j2pn4nqvmmv030eqtz4040z" },
      c2: creators[5] || { name: "Lyn Alden", handle: "lynalden", npub: "npub1a2cww4kn9wqte4pw70vjdjzhctrnvkfdln9ecc5422kqaeayikrqqf2la6" },
      tag: "Hardware & Macro",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* HERO SECTION */}
      <section className="bg-slate-900 text-white pt-16 pb-20 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 bg-slate-800 text-purple-400 border border-slate-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Swords className="w-4 h-4 text-purple-400" /> Head-to-Head Comparison Arena
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase mb-4">
            Compare Nostr <span className="text-purple-400">Profiles</span>
          </h1>
          
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Select two Nostr creators to evaluate their <strong>Identity Trust Scores</strong>, NIP-05 DNS verifications, Lightning Zap addresses, and network reputations side-by-side.
          </p>

          {/* Dual-side creator selector */}
          <form onSubmit={handleCompare} className="bg-slate-800/90 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl max-w-4xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              
              {/* Creator A selector */}
              <div className="md:col-span-2 bg-slate-900 p-4 rounded-2xl border border-slate-700 text-left space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Select Creator A
                </span>
                
                <div className="flex items-center gap-3">
                  {creatorA?.picture ? (
                    <img src={creatorA.picture} alt={creatorA.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-500 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                      {creatorA?.name?.charAt(0) || "A"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-white block truncate">{creatorA?.name}</span>
                    <span className="text-xs text-slate-400 block truncate">@{creatorA?.handle}</span>
                  </div>
                </div>

                <select
                  value={selectedNpubA}
                  onChange={(e) => setSelectedNpubA(e.target.value)}
                  className="w-full bg-slate-800 text-xs font-semibold text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                >
                  {creators.map((c) => (
                    <option key={c.npub} value={c.npub}>
                      {c.name} (@{c.handle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Middle swap button */}
              <div className="flex justify-center md:col-span-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap Creators"
                  className="w-12 h-12 bg-slate-700 hover:bg-purple-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg cursor-pointer hover:scale-105"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Creator B selector */}
              <div className="md:col-span-2 bg-slate-900 p-4 rounded-2xl border border-slate-700 text-left space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Select Creator B
                </span>
                
                <div className="flex items-center gap-3">
                  {creatorB?.picture ? (
                    <img src={creatorB.picture} alt={creatorB.name} className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
                      {creatorB?.name?.charAt(0) || "B"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-white block truncate">{creatorB?.name}</span>
                    <span className="text-xs text-slate-400 block truncate">@{creatorB?.handle}</span>
                  </div>
                </div>

                <select
                  value={selectedNpubB}
                  onChange={(e) => setSelectedNpubB(e.target.value)}
                  className="w-full bg-slate-800 text-xs font-semibold text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  {creators.map((c) => (
                    <option key={c.npub} value={c.npub}>
                      {c.name} (@{c.handle})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Compare action button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <Scale className="w-5 h-5 fill-slate-950" />
              <span>Launch Versus Comparison</span>
            </button>

          </form>

        </div>
      </section>

      {/* Classic comparison pairs */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-20">
        
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-12">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 text-purple-600" /> Featured Matchups
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-6">
            Popular Head-to-Head Comparisons
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {POPULAR_MATCHUPS.map((pair, idx) => (
              <Link
                key={idx}
                href={`/compare/${pair.c1.npub}-vs-${pair.c2.npub}`}
                className="p-5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 w-fit block mb-3">
                    {pair.tag}
                  </span>

                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {pair.c1.name.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-slate-900 truncate">{pair.c1.name}</span>
                    </div>

                    <span className="text-xs font-black text-slate-400">VS</span>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-xs text-slate-900 truncate">{pair.c2.name}</span>
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {pair.c2.name.charAt(0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs font-bold text-purple-600 group-hover:underline">
                  <span>Compare Metrics</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Core comparison criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Anti-Spam Trust Score</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Calculates a 0-100 point confidence score to identify verified protocol builders vs newly created bot accounts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Lightning Zaps Readiness</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verifies LNURL-pay endpoints (<code>lud16</code>) to ensure creators can receive instantaneous NIP-57 Bitcoin micro-tips.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">NIP-05 DNS Signatures</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Validates human-readable domain identifiers to prevent impersonation and verify real-world digital identity.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}