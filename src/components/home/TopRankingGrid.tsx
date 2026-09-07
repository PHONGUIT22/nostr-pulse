import Link from "next/link";
import { Zap, ShieldCheck, Award, ArrowUpRight, Sparkles } from "lucide-react";
import { getLiveTopCreators } from "@/lib/creators";

export default async function TopRankingGrid() {
  // Retrieve curated featured builders
  const creatorList = await getLiveTopCreators(10);

  const topZapped = creatorList.slice(0, 5);
  const trending = creatorList.slice(5, 10).length > 0 
    ? creatorList.slice(5, 10) 
    : creatorList.slice(0, 5);

  return (
    <section className="py-16 bg-slate-50 border-y border-slate-200/60 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Leaderboard title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-purple-600 font-bold text-xs uppercase tracking-wider mb-3 bg-purple-50 border border-purple-200 px-3.5 py-1 rounded-full shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> Curated Ecosystem Showcase
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
            ⚡ Featured Builders & Protocol Leaders
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
            Discover verified developers, cypherpunks, and top-reputation creators driving the decentralized Nostr network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Column 1: Top zapped builders */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Top Zapped Builders</h3>
                  <p className="text-xs text-slate-500">Live Bitcoin Value-4-Value received</p>
                </div>
              </div>
              <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Featured
              </span>
            </div>

            <div className="space-y-4">
              {topZapped.map((creator, idx) => (
                <Link
                  key={creator.npub || idx}
                  href={`/p/${creator.npub}`}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs font-black text-slate-400 group-hover:text-amber-600">
                      #{idx + 1}
                    </span>
                    {creator.picture ? (
                      <img
                        src={creator.picture}
                        alt={creator.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center border border-slate-200 text-sm">
                        {creator.name.charAt(0)}
                      </div>
                    )}
                    <div className="truncate max-w-[140px] sm:max-w-[200px]">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors block truncate">
                        {creator.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {creator.nip05 || `@${creator.handle}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-amber-600 text-xs sm:text-sm flex items-center justify-end gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-500" />
                      {creator.zapsReceived}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Value-4-Value</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Column 2: Ecosystem pioneers */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Ecosystem Pioneers</h3>
                  <p className="text-xs text-slate-500">Core protocol advocates & writers</p>
                </div>
              </div>
              <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
                Verified
              </span>
            </div>

            <div className="space-y-4">
              {trending.map((creator, idx) => (
                <Link
                  key={creator.npub || idx}
                  href={`/p/${creator.npub}`}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs font-black text-slate-400 group-hover:text-purple-600">
                      #{idx + 6}
                    </span>
                    {creator.picture ? (
                      <img
                        src={creator.picture}
                        alt={creator.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 text-sm">
                        {creator.name.charAt(0)}
                      </div>
                    )}
                    <div className="truncate max-w-[140px] sm:max-w-[200px]">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors block truncate">
                        {creator.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {creator.nip05 || `@${creator.handle}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-purple-600 transition-colors">
                    <span className="text-xs font-bold">Inspect Profile</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}