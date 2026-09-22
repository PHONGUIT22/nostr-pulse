"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Key, Scale, Loader2, Zap, Bot, Cpu } from "lucide-react";
import { resolveNostrSearch } from "@/lib/search";
import NostrLoginButton from "@/components/layout/NostrLoginButton";
import ConnectMcpModal from "@/components/mcp/ConnectMcpModal";

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const targetUrl = await resolveNostrSearch(searchTerm);
      router.push(targetUrl);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Left logo: NostrPulse */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900 hidden sm:inline">
            Nostr<span className="text-purple-600">Pulse</span>
          </span>
        </Link>

        {/* THANH SEARCH NPUB */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 sm:mx-6">
          <div className="relative flex items-center">
            <Key className="w-4 h-4 text-purple-600 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search npub1... or hex key"
              className="w-full bg-slate-100/80 focus:bg-white border border-transparent focus:border-purple-600 rounded-full pl-10 pr-10 py-2 text-xs sm:text-sm font-medium focus:outline-none transition-all font-mono"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 p-1.5 bg-slate-900 hover:bg-purple-600 text-white rounded-full transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>
        </form>

        {/* Right navigation links & NIP-07 login */}
        <div className="flex items-center gap-3 shrink-0">
          <nav className="hidden lg:flex items-center gap-6 font-medium text-slate-600 text-sm mr-2">
            <Link href="/agent" className="hover:text-emerald-600 text-emerald-700 font-bold transition-colors flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              Machine Money
            </Link>
            <Link href="/relays" className="hover:text-slate-900 transition-colors">
              Relay Explorer
            </Link>
            <Link href="/bounties" className="hover:text-slate-900 transition-colors">
              Bounties
            </Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">
              Methodology
            </Link>
          </nav>

          {/* Live Relay Health Indicator Pill */}
          <Link
            href="/relays"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300/80 text-emerald-800 text-xs font-semibold transition-all shadow-2xs hover:scale-102 cursor-pointer"
            title="Connected to decentralized Nostr relays (damus, nos.lol, nostr.band, purplerelay, current.fyi)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] sm:text-xs font-bold">5/5 Relays (P2P)</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMcpModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all text-xs sm:text-sm border border-slate-700 shadow-xs cursor-pointer"
            title="Connect MCP to Cursor or Claude Desktop"
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Connect</span> MCP
          </button>

          <Link
            href="/agent"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all text-xs sm:text-sm border border-emerald-200 shadow-xs flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">AI Agent</span>
          </Link>

          <Link
            href="/compare"
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all text-xs sm:text-sm border border-purple-200 shadow-xs flex items-center gap-1.5"
          >
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Compare</span>
          </Link>

          {/* NIP-07 Login button */}
          <NostrLoginButton />
        </div>

      </div>

      <ConnectMcpModal isOpen={isMcpModalOpen} onClose={() => setIsMcpModalOpen(false)} />
    </header>
  );
}