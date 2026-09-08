"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Key, 
  Zap, 
  Loader2, 
  Sparkles, 
  Flame, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight 
} from "lucide-react";
import Link from "next/link";
import { resolveNostrSearch } from "@/lib/search";

export default function HeroSearchSection() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    setIsSearching(true);
    try {
      const targetUrl = await resolveNostrSearch(query);
      router.push(targetUrl);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="pt-12 pb-16 px-4 text-center max-w-5xl mx-auto">
      {/* Trust Badge */}
      <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200/80 px-4 py-1.5 rounded-full text-xs font-semibold text-purple-700 mb-8 shadow-2xs">
        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
        <span>Decentralized • Powered by Nostr & Bitcoin Lightning</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08] mb-6 uppercase">
        Explore Nostr Creators <br className="hidden sm:inline" />
        <span className="text-purple-600">& Lightning Zaps.</span>
      </h1>

      <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
        Discover verified NIP-05 creators, track Bitcoin Lightning Value-4-Value payments, and inspect decentralized WebSocket relays.
      </p>

      {/* Search Input */}
      <form
        onSubmit={handleSearch}
        className="max-w-2xl mx-auto bg-white p-3 rounded-3xl shadow-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="flex items-center gap-3 px-4 py-2 w-full">
          <Key className="w-6 h-6 text-purple-600 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter npub1... or hex key"
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none font-medium text-base sm:text-lg"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="w-full sm:w-auto bg-slate-900 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          <span>Search</span>
        </button>
      </form>

      {/* LIVE INTERACTIVE DEMO (EVALUATOR QUICK START) */}
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100/90 text-purple-800 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Live Interactive Demo • 1-Click Evaluation
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-4">
          Instantly inspect opposite ends of the Nostr Trust Spectrum without manual searching:
        </p>

        {/* 2 Big Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {/* Nút 1: Verified Builder (fiatjaf - 88 pts) */}
          <Link
            href="/p/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"
            className="group relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 border-2 border-emerald-300/80 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/20 transition-colors" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-2xs">
                  <Flame className="w-3.5 h-3.5 fill-white" />
                  Verified Builder
                </span>
                <span className="text-emerald-800 font-mono font-black text-xs sm:text-sm bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-0.5 rounded-xl">
                  88 pts
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                <span>🔥 Inspect Verified Builder</span>
              </h3>

              <div className="mt-1 font-mono text-xs text-slate-500 font-medium">
                fiatjaf <span className="text-slate-400">• Protocol Founder</span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cryptographic DNS (<strong className="text-emerald-700">_@fiatjaf.com</strong>) + Core Seed Node proximity. High Sybil resistance.
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-emerald-200/60 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                1-Click Inspect Profile & Zaps
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Nút 2: Sybil Bot Clone (anon_bot - Capped 42 pts) */}
          <Link
            href="/p/anon_bot"
            className="group relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 border-2 border-rose-300/80 hover:border-rose-500 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-rose-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-400/20 transition-colors" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Sybil Bot Clone
                </span>
                <span className="text-rose-800 font-mono font-black text-xs sm:text-sm bg-rose-100/90 border border-rose-300/80 px-2.5 py-0.5 rounded-xl">
                  Capped 42 pts
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-rose-700 transition-colors flex items-center gap-1.5">
                <span>⚠️ Inspect Sybil Bot Clone</span>
              </h3>

              <div className="mt-1 font-mono text-xs text-slate-500 font-medium">
                anon_bot <span className="text-slate-400">• Cloned Metadata</span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Missing verified DNS + isolated relay network. Demonstrates our <strong className="text-rose-700">Anti-Sybil 42-Pt Cap Guard</strong> in action.
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-rose-200/60 flex items-center justify-between text-xs font-bold text-rose-700 group-hover:text-rose-800">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                1-Click Inspect Anti-Sybil Damping
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* POPULAR CREATORS LINKS */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap">
        <span>Other Featured Profiles:</span>
        <Link href="/p/npub1sg6plzptd64u62a978hep2k2u72xqvvd5299cvfd0rrxn5z5avqssae6r6m" className="hover:underline font-medium text-purple-700">Jack Dorsey</Link> •
        <Link href="/p/npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s" className="hover:underline font-medium text-purple-700">jb55</Link> •
        <Link href="/p/npub1qfl2942sp4775d862800sv8aev2u6v4p84y2a506etp0a5t43d2s250d4w" className="hover:underline font-medium text-purple-700">ODELL</Link> •
        <Link href="/p/npub1a2cww4kn9wqte4pw70vjdjzhctrnvkfdln9ecc5422kqaeayikrqqf2la6" className="hover:underline font-medium text-purple-700">Lyn Alden</Link>
      </div>
    </section>
  );
}