"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Key, Zap, Loader2 } from "lucide-react";
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

      {/* POPULAR CREATORS LINKS */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap">
        <span>Featured Creators:</span>
        <Link href="/p/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6" className="hover:underline font-medium text-purple-700">fiatjaf</Link> •
        <Link href="/p/npub1sg6plzptd64u62a978hep2k2u72xqvvd5299cvfd0rrxn5z5avqssae6r6m" className="hover:underline font-medium text-purple-700">Jack Dorsey</Link> •
        <Link href="/p/npub1qfl2942sp4775d862800sv8aev2u6v4p84y2a506etp0a5t43d2s250d4w" className="hover:underline font-medium text-purple-700">ODELL</Link> •
        <Link href="/p/npub1a2cww4kn9wqte4pw70vjdjzhctrnvkfdln9ecc5422kqaeayikrqqf2la6" className="hover:underline font-medium text-purple-700">Lyn Alden</Link>
      </div>
    </section>
  );
}