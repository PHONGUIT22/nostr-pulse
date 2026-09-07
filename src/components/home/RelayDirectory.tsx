import { Radio, Server, CheckCircle2 } from "lucide-react";
import { DEFAULT_RELAYS } from "@/lib/nostr";

export default function RelayDirectory() {
  const relays = DEFAULT_RELAYS;

  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center justify-center sm:justify-start gap-2">
          <Radio className="w-7 h-7 text-purple-600 animate-pulse" />
          Relay Explorer ({relays.length} Public Relays)
        </h2>
        <p className="text-slate-600 mt-2 text-sm">
          Browse and connect to high-performance decentralized relays powering the Nostr protocol.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {relays.map((relayUrl, index) => {
          const cleanName = relayUrl.replace("wss://", "").replace(/\/$/, "");

          return (
            <div
              key={index}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-500 hover:shadow-md transition-all flex items-center justify-between group cursor-default"
            >
              <div className="truncate pr-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors text-sm truncate block">
                    {cleanName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block truncate">
                  {relayUrl}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                <span>Online</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}