"use client";

import { useState, useEffect } from "react";
import { Zap, Radio, Sparkles, Clock, MessageSquare, ShieldCheck, Activity } from "lucide-react";
import { nip19 } from "nostr-tools";
import { fetchUserRelays, mergeRelays, DEFAULT_RELAYS } from "@/lib/nostr";

interface ZapReceipt {
  id: string;
  senderPubkey: string;
  senderName: string;
  amountSats: number;
  comment: string;
  timestamp: number;
  relaySource?: string;
}

interface Props {
  pubkey: string;
  name: string;
}

export default function LiveZapFeed({ pubkey, name }: Props) {
  const [zaps, setZaps] = useState<ZapReceipt[]>([]);
  const [connectedCount, setConnectedCount] = useState<number>(0);
  const [totalRelaysCount, setTotalRelaysCount] = useState<number>(4);
  const [hasNewFlash, setHasNewFlash] = useState(false);

  useEffect(() => {
    if (!pubkey) return;

    let isMounted = true;
    const sockets: WebSocket[] = [];
    const subId = `zap_pool_${pubkey.slice(0, 8)}_${Math.floor(Math.random() * 1000)}`;
    let activeSockets = 0;

    const connectToDynamicRelays = async () => {
      // 1. Fetch creator's NIP-65 relay list
      const creatorRelays = await fetchUserRelays(pubkey);
      
      // 2. Append logged-in user's relays if available
      let loggedUserRelays: string[] = [];
      try {
        const saved = localStorage.getItem("nostr_user_relays");
        if (saved) loggedUserRelays = JSON.parse(saved);
      } catch {}

      // 3. Deduplicate and select optimal 4-6 relays
      const mergedList = mergeRelays([...creatorRelays, ...loggedUserRelays], DEFAULT_RELAYS).slice(0, 6);
      
      if (!isMounted) return;
      setTotalRelaysCount(mergedList.length);

      // 4. Open WebSocket connections to consolidated relays
      mergedList.forEach((relayUrl) => {
        try {
          const ws = new WebSocket(relayUrl);
          sockets.push(ws);

          ws.onopen = () => {
            if (!isMounted) return;
            activeSockets += 1;
            setConnectedCount(activeSockets);

            const req = [
              "REQ",
              subId,
              {
                kinds: [9735],
                "#p": [pubkey],
                limit: 10,
              },
            ];
            ws.send(JSON.stringify(req));
          };

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg[0] === "EVENT" && msg[2]?.kind === 9735) {
                const zapEvent = msg[2];

                let amountSats = 21;
                let comment = "Value-4-Value Zap ⚡";
                let sender = "Anonymous";

                if (zapEvent.pubkey) {
                  try {
                    const encodedNpub = nip19.npubEncode(zapEvent.pubkey);
                    sender = `${encodedNpub.slice(0, 10)}...${encodedNpub.slice(-4)}`;
                  } catch {
                    sender = `anon_${zapEvent.pubkey.slice(0, 6)}`;
                  }
                }

                const descTag = zapEvent.tags?.find((t: any) => t[0] === "description");
                if (descTag && descTag[1]) {
                  try {
                    const zapRequest = JSON.parse(descTag[1]);
                    if (zapRequest.content) comment = zapRequest.content;
                    const amtTag = zapRequest.tags?.find((t: any) => t[0] === "amount");
                    if (amtTag && amtTag[1]) {
                      amountSats = Math.round(Number(amtTag[1]) / 1000);
                    }
                    if (zapRequest.pubkey) {
                      try {
                        const senderNpub = nip19.npubEncode(zapRequest.pubkey);
                        sender = `${senderNpub.slice(0, 10)}...${senderNpub.slice(-4)}`;
                      } catch {
                        sender = `anon_${zapRequest.pubkey.slice(0, 6)}`;
                      }
                    }
                  } catch {}
                }

                const newZap: ZapReceipt = {
                  id: zapEvent.id,
                  senderPubkey: zapEvent.pubkey,
                  senderName: sender,
                  amountSats: amountSats || 21,
                  comment: comment,
                  timestamp: zapEvent.created_at || Math.floor(Date.now() / 1000),
                  relaySource: relayUrl.replace("wss://", "").replace("ws://", ""),
                };

                setZaps((prev) => {
                  if (prev.some((z) => z.id === newZap.id)) return prev;
                  setHasNewFlash(true);
                  setTimeout(() => setHasNewFlash(false), 2500);

                  return [newZap, ...prev]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 8);
                });
              }
            } catch {}
          };

          ws.onerror = () => {
            if (!isMounted) return;
            activeSockets = Math.max(0, activeSockets - 1);
            setConnectedCount(activeSockets);
          };

          ws.onclose = () => {
            if (!isMounted) return;
            activeSockets = Math.max(0, activeSockets - 1);
            setConnectedCount(activeSockets);
          };
        } catch {}
      });
    };

    connectToDynamicRelays();

    return () => {
      isMounted = false;
      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(["CLOSE", subId]));
            ws.close();
          } catch {}
        }
      });
    };
  }, [pubkey]);

  const timeAgo = (unix: number) => {
    const diff = Math.floor(Date.now() / 1000) - unix;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={`bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border transition-all duration-700 shadow-xl space-y-6 ${
      hasNewFlash ? "border-amber-400 shadow-amber-500/20 scale-[1.01]" : "border-slate-800"
    }`}>
      
      {/* HEADER LIVE FEED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <span>Live Zap Activity</span>
              {hasNewFlash && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                  ⚡ NEW ZAP!
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Kind 9735 Receipts multi-cast via dynamic NIP-65 relays
            </p>
          </div>
        </div>

        {/* Dynamic relay connection status */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 text-xs w-fit">
          <span className={`w-2 h-2 rounded-full ${
            connectedCount > 0 ? "bg-emerald-500 animate-ping" : "bg-amber-400 animate-pulse"
          }`} />
          <span className="text-[11px] font-mono text-slate-300 font-bold">
            {connectedCount > 0 ? `🟢 ${connectedCount}/${totalRelaysCount} Relays Synced` : "🟡 Syncing Relays..."}
          </span>
        </div>
      </div>

      {/* Zap feed list */}
      <div className="space-y-3">
        {zaps.length > 0 ? (
          zaps.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs shrink-0 mt-0.5">
                  ⚡
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-200 truncate font-mono">
                      {item.senderName}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {timeAgo(item.timestamp)}
                    </span>
                    {item.relaySource && (
                      <span className="text-[9px] text-purple-400/80 bg-purple-950/50 px-2 py-0.5 rounded-md font-mono border border-purple-900/50">
                        via {item.relaySource}
                      </span>
                    )}
                  </div>
                  {item.comment && (
                    <p className="text-xs text-slate-300 mt-1 flex items-start gap-1.5 italic font-sans leading-relaxed">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5 not-italic" />
                      &ldquo;{item.comment}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Zapped sat amount */}
              <div className="text-right shrink-0 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl w-fit sm:w-auto">
                <span className="font-black text-amber-400 text-sm flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  +{item.amountSats.toLocaleString()} Sats
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 space-y-2">
            <Radio className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />
            <h4 className="text-sm font-bold text-slate-300">
              Listening across {totalRelaysCount} Nostr Relays for {name}...
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scan the QR code above or send a Lightning Zap to trigger live on-chain event stream!
            </p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cryptographic Kind 9735 Proof
        </span>
        <span>NIP-65 Dynamic Relay Mesh</span>
      </div>

    </div>
  );
}