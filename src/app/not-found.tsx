"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Key, Home, Radio, Loader2, Scale } from "lucide-react";
import { resolveNostrSearch } from "@/lib/search";

export default function NotFound() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const destination = await resolveNostrSearch(query);
      router.push(destination);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#FDFDFD] text-slate-900 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        
        {/* 404 Trust Badge */}
        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          <Radio className="w-4 h-4 text-purple-600 animate-pulse" /> Error 404 • Identity Not Found
        </div>

        {/* Headline 404 */}
        <div>
          <h1 className="text-7xl sm:text-9xl font-black text-slate-900 tracking-tight leading-none mb-4">
            404<span className="text-purple-600">.</span>
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 uppercase tracking-tight">
            Lost in the Nostr Network?
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base max-w-md mx-auto">
            We couldn&apos;t find the specific Nostr public key (npub), NIP-05 identifier, or relay event you were looking for. Search below.
          </p>
        </div>

        {/* 404 Search bar */}
        <form
          onSubmit={handleSearch}
          className="bg-white p-3 rounded-3xl shadow-lg border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto"
        >
          <div className="flex items-center gap-3 px-4 py-2 w-full">
            <Key className="w-5 h-5 text-purple-600 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter npub1... or hex key"
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none font-medium text-sm sm:text-base font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="w-full sm:w-auto bg-slate-900 hover:bg-purple-600 text-white font-bold px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </form>

        {/* Navigation buttons */}
        <div className="pt-6 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold px-5 py-2.5 rounded-full text-xs transition-colors"
            >
              <Home className="w-4 h-4 text-purple-600" /> Go to Homepage
            </Link>
            <Link
              href="/relays"
              className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-5 py-2.5 rounded-full text-xs transition-colors"
            >
              <Radio className="w-4 h-4 text-purple-600" /> Relay Explorer
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-colors shadow-xs"
            >
              <Scale className="w-4 h-4" /> Compare Profiles
            </Link>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-center gap-2 flex-wrap">
            <span>Or explore top creators:</span>
            <Link href="/p/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6" className="font-semibold text-slate-700 hover:text-purple-600 underline">fiatjaf</Link> •
            <Link href="/p/npub1sg6plzptd64u62a978hep2k2u72xqvvd5299cvfd0rrxn5z5avqss2ydmd" className="font-semibold text-slate-700 hover:text-purple-600 underline">Jack Dorsey</Link> •
            <Link href="/p/npub1qny3tkh0xuz24ldrzct50hn5fhqr5t0m8w27j2pn4nqvmmv030eqtewvm4" className="font-semibold text-slate-700 hover:text-purple-600 underline">NVK</Link> •
            <Link href="/p/npub1a2cww4kn9wqte4pw70vjdjzhctrnvkfdln9ecc5422kqaeayikrqqf2la6" className="font-semibold text-slate-700 hover:text-purple-600 underline">Lyn Alden</Link>
          </div>
        </div>

      </div>
    </div>
  );
}