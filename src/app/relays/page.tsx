"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Radio, 
  Server, 
  Activity, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Copy, 
  Check, 
  Zap, 
  Globe, 
  Lock,
  ArrowRight,
  RefreshCw,
  Loader2
} from "lucide-react";

interface RelayNode {
  url: string;
  name: string;
  location: string;
  type: string;
  ping: number | null;
  status: "checking" | "online" | "offline";
}

const INITIAL_RELAYS: RelayNode[] = [
  { url: "wss://relay.damus.io", name: "Damus Global", location: "US / Global", type: "Read & Write", ping: null, status: "checking" },
  { url: "wss://nos.lol", name: "Nos Lol", location: "Germany", type: "High Throughput", ping: null, status: "checking" },
  { url: "wss://relay.primal.net", name: "Primal Fast Cache", location: "Global Anycast", type: "Media & Cache", ping: null, status: "checking" },
  { url: "wss://relay.nostr.band", name: "Nostr Band Indexer", location: "Global CDN", type: "Search & Stats", ping: null, status: "checking" },
  { url: "wss://nostr.wine", name: "Nostr Wine", location: "Europe", type: "Anti-Spam Filtered", ping: null, status: "checking" },
  { url: "wss://relay.snort.social", name: "Snort Social", location: "US East", type: "Web Client Sync", ping: null, status: "checking" },
  { url: "wss://eden.nostr.land", name: "NostrLand Eden", location: "Singapore", type: "Asia-Pacific Hub", ping: null, status: "checking" },
  { url: "wss://purplerelay.com", name: "Purple Relay", location: "Global Cloud", type: "High Availability", ping: null, status: "checking" },
  { url: "wss://relay.plebstr.com", name: "Plebstr Mobile", location: "US West", type: "Mobile Optimized", ping: null, status: "checking" },
  { url: "wss://relay.current.fyi", name: "Current Lightning", location: "Global", type: "Lightning Ready", ping: null, status: "checking" },
  { url: "wss://offchain.pub", name: "Offchain Node", location: "Europe", type: "Decentralized", ping: null, status: "checking" },
  { url: "wss://nostr.mom", name: "Nostr Mom", location: "US Central", type: "Community Hub", ping: null, status: "checking" },
];

export default function RelaysDirectoryPage() {
  const [relays, setRelays] = useState<RelayNode[]>(INITIAL_RELAYS);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // WebSocket ping latency measurement
  const pingAllRelays = () => {
    setIsRefreshing(true);

    relays.forEach((relay, index) => {
      const startTime = performance.now();
      let isDone = false;

      try {
        const ws = new WebSocket(relay.url);

        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            try { ws.close(); } catch {}
            setRelays((prev) =>
              prev.map((r, i) =>
                i === index ? { ...r, status: "offline", ping: null } : r
              )
            );
          }
        }, 3500); // 3.5s timeout

        ws.onopen = () => {
          if (!isDone) {
            isDone = true;
            clearTimeout(timer);
            const latency = Math.round(performance.now() - startTime);
            try { ws.close(); } catch {}
            setRelays((prev) =>
              prev.map((r, i) =>
                i === index ? { ...r, status: "online", ping: latency } : r
              )
            );
          }
        };

        ws.onerror = () => {
          if (!isDone) {
            isDone = true;
            clearTimeout(timer);
            setRelays((prev) =>
              prev.map((r, i) =>
                i === index ? { ...r, status: "offline", ping: null } : r
              )
            );
          }
        };
      } catch (err) {
        setRelays((prev) =>
          prev.map((r, i) =>
            i === index ? { ...r, status: "offline", ping: null } : r
          )
        );
      }
    });

    setTimeout(() => setIsRefreshing(false), 2000);
  };

  useEffect(() => {
    pingAllRelays();
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const onlineCount = relays.filter((r) => r.status === "online").length;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* HERO HEADER */}
      <section className="bg-slate-900 text-white pt-16 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center sm:text-left">
          
          <div className="inline-flex items-center gap-2 bg-slate-800 text-purple-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-purple-400" /> Live WebSocket Telemetry • 2026
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase">
                Nostr <span className="text-purple-400">Relay Explorer</span>
              </h1>
              <p className="text-slate-400 mt-3 text-base sm:text-lg max-w-2xl">
                Real-time WebSocket latency telemetry across decentralized Nostr relays. Click any card to copy its endpoint URL.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700/80 shrink-0 text-center sm:text-right">
              <span className="text-slate-400 text-xs font-medium block uppercase tracking-wider">
                Live Endpoints
              </span>
              <span className="text-4xl sm:text-5xl font-black text-purple-400 block mt-1">
                {onlineCount} / {relays.length}
              </span>
              <span className="text-xs font-bold text-slate-300 block mt-1">
                Active Nodes Online
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* STATS BANNERS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Protocol</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5">NIP-01 WebSocket</span>
              <span className="text-slate-500 text-[11px] block">Live browser handshake</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Real-time Status</span>
              <span className="text-xl font-black text-emerald-600 block mt-0.5">
                {onlineCount > 0 ? "Network Healthy" : "Pinging Nodes..."}
              </span>
              <span className="text-slate-500 text-[11px] block">Dynamic browser telemetry</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Censorship Proof</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5">No Single Point</span>
              <span className="text-slate-500 text-[11px] block">Decentralized synchronization</span>
            </div>
          </div>

        </div>

        {/* RELAYS DIRECTORY GRID */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Server className="w-6 h-6 text-purple-600" /> Live Public Relays ({relays.length} Nodes)
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Real-time WebSocket handshake measurements directly from your browser.
              </p>
            </div>

            <button
              onClick={pingAllRelays}
              disabled={isRefreshing}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-full border border-purple-200 w-fit flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Pinging..." : "Re-ping Relays"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relays.map((relay) => {
              const isCopied = copiedUrl === relay.url;

              return (
                <div
                  key={relay.url}
                  onClick={() => handleCopy(relay.url)}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group select-none ${
                    isCopied
                      ? "bg-emerald-50/80 border-emerald-400 shadow-sm"
                      : "bg-slate-50 hover:bg-purple-50/60 border-slate-200/80 hover:border-purple-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          relay.status === "online" 
                            ? "bg-emerald-500 animate-ping" 
                            : relay.status === "checking" 
                            ? "bg-amber-400 animate-pulse" 
                            : "bg-rose-500"
                        }`} />
                        <span className="font-bold text-slate-900 group-hover:text-purple-600 text-base block truncate transition-colors">
                          {relay.name}
                        </span>
                      </div>

                      {/* Live ping display */}
                      {relay.status === "online" && relay.ping !== null ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                          {relay.ping}ms
                        </span>
                      ) : relay.status === "checking" ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Pinging
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md shrink-0">
                          Offline
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/70 mb-4 group-hover:border-purple-200 transition-colors">
                      <span className="font-mono text-xs text-slate-600 truncate mr-2">
                        {relay.url}
                      </span>
                      <button
                        type="button"
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-purple-600 group-hover:text-white"
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {relay.location}
                    </span>

                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px] border border-purple-200/60">
                      {relay.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documentation & guide */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Zap className="w-4 h-4 fill-amber-400" /> How to use these Relays
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">
              Add Relays to your Nostr Client
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Open your Nostr app (Damus on iOS, Amethyst on Android, or Primal on Web), go to <strong>Settings ➔ Relay Management</strong>, and paste any URL above to sync your social timeline across multiple servers.
            </p>
          </div>

          <Link
            href="/"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all shrink-0 flex items-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <span>Explore Creators</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

    </div>
  );
}