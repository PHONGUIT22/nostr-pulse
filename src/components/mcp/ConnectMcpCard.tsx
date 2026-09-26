"use client";

import { useState } from "react";
import { Cpu, Terminal, Copy, Check, Sparkles, ExternalLink, Bot } from "lucide-react";
import ConnectMcpModal from "./ConnectMcpModal";

export default function ConnectMcpCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const cursorQuickSnippet = JSON.stringify(
    {
      mcpServers: {
        nostrpulse: {
          command: "npx",
          args: ["-y", "nostrpulse-mcp"],
        },
      },
    },
    null,
    2
  );

  const handleCopyQuick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cursorQuickSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/20 shadow-2xl p-6 sm:p-8">
        {/* Glow effect */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>Stdio JSON-RPC MCP Server</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Claude Desktop &amp; Cursor Ready</span>
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Connect NostrPulse to <span className="text-emerald-400">Cursor</span> &amp;{" "}
              <span className="text-purple-400">Claude</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Equip your local AI assistants with Nostr capabilities! Allow Cursor or Claude Desktop to
              autonomously query Web-of-Trust reputations, send micro-settlements (NIP-61 NutZaps), and
              distribute compute tasks through NIP-90 DVMs.
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="font-mono text-emerald-400/90">✓ check_trust_score</span>
              <span className="font-mono text-amber-400/90">✓ pay_cashu_nutzap</span>
              <span className="font-mono text-purple-400/90">✓ request_nip90_job</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer hover:scale-[1.02]"
            >
              <Bot className="w-4 h-4" />
              <span>Connect to Cursor / Claude</span>
            </button>

            <button
              onClick={handleCopyQuick}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold px-4 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Snippet Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>1-Click Copy Cursor JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConnectMcpModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
