import Link from "next/link";
import { getLiveTopCreators } from "@/lib/creators";
import { Zap, Sparkles, ArrowRight } from "lucide-react";

interface Props {
  currentNpub: string;
}

export default async function RelatedSectors({ currentNpub }: Props) {
  const creatorList = await getLiveTopCreators(10);

  // Exclude currently viewed creator
  const suggestions = creatorList
    .filter((c) => c.npub !== currentNpub)
    .slice(0, 4);

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
      <div className="mb-4">
        <div className="flex items-center gap-1.5 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Discovery
        </div>
        <h3 className="text-base font-black text-slate-900">
          Suggested Creators
        </h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((creator) => (
          <Link
            key={creator.npub}
            href={`/p/${creator.npub}`}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/60 hover:border-purple-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {creator.picture ? (
                <img
                  src={creator.picture}
                  alt={creator.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center border border-slate-200 shrink-0 text-xs">
                  {creator.name.charAt(0)}
                </div>
              )}
              <div className="truncate">
                <span className="font-bold text-slate-900 group-hover:text-purple-600 text-xs block truncate transition-colors">
                  {creator.name}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  @{creator.handle}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-600 flex items-center">
                <Zap className="w-3 h-3 fill-amber-500" />
                {creator.zapsReceived}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-colors ml-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}