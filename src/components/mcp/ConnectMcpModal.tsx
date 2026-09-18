"use client";

import { useState } from "react";
import {
  X,
  Copy,
  Check,
  Terminal,
  Cpu,
  Bot,
  Zap,
  ShieldCheck,
  FileCode,
  FolderOpen,
} from "lucide-react";

interface ConnectMcpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectMcpModal({ isOpen, onClose }: ConnectMcpModalProps) {
  const [activeTab, setActiveTab] = useState<"claude" | "cursor" | "cli">("cursor");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        nostrpulse: {
          command: "npx",
          args: [
            "-y",
            "tsx",
            "D:\\UIT\\NamBonUIT\\nostrpulse-full\\src\\mcp-entry.ts",
          ],
          env: {
            GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE",
          },
        },
      },
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        nostrpulse: {
          command: "npx",
          args: ["tsx", "src/mcp-entry.ts"],
        },
      },
    },
    null,
    2
  );

  const cliCommand = "npx tsx src/mcp-entry.ts";

  const getActiveCode = () => {
    switch (activeTab) {
      case "claude":
        return claudeConfig;
      case "cursor":
        return cursorConfig;
      case "cli":
        return cliCommand;
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Model Context Protocol (MCP) Server</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Connect to <span className="text-emerald-400">Cursor</span> or{" "}
            <span className="text-purple-400">Claude Desktop</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Expose NostrPulse as a native stdio MCP tool server. External AI agents
            can autonomously query Web-of-Trust reputations, send NutZap micro-settlements,
            and dispatch NIP-90 compute jobs.
          </p>
        </div>

        {/* Client Selection Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("cursor")}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "cursor"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Cursor IDE</span>
          </button>
          <button
            onClick={() => setActiveTab("claude")}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "claude"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Claude Desktop</span>
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "cli"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Stdio CLI</span>
          </button>
        </div>

        {/* Instructions & File Location */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
          {activeTab === "cursor" && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-emerald-400 mb-1">
                <FolderOpen className="w-4 h-4" />
                <span>Cursor Config File: <code>.cursor/mcp.json</code> or Settings &gt; MCP</span>
              </div>
              <p className="text-slate-400">
                Paste the JSON configuration below into your project&apos;s <code>.cursor/mcp.json</code> file, or add a new stdio tool under Cursor Settings.
              </p>
            </div>
          )}

          {activeTab === "claude" && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-purple-400 mb-1">
                <FolderOpen className="w-4 h-4" />
                <span>Claude Desktop Config: <code>claude_desktop_config.json</code></span>
              </div>
              <div className="space-y-1 text-slate-400">
                <p>
                  • <strong>Windows:</strong> <code>%APPDATA%\Claude\claude_desktop_config.json</code>
                </p>
                <p>
                  • <strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
                </p>
              </div>
            </div>
          )}

          {activeTab === "cli" && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-amber-400 mb-1">
                <Terminal className="w-4 h-4" />
                <span>Direct Command-Line Testing</span>
              </div>
              <p className="text-slate-400">
                Run the stdio MCP server directly from your terminal to verify JSON-RPC connectivity.
              </p>
            </div>
          )}
        </div>

        {/* Code Snippet Box with 1-Click Copy */}
        <div className="relative group">
          <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto select-all leading-relaxed">
            {getActiveCode()}
          </pre>
          <button
            onClick={() => handleCopy(getActiveCode(), "config")}
            className="absolute top-3 right-3 bg-slate-800/90 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            {copiedType === "config" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Available MCP Tools Showcase */}
        <div className="space-y-3 pt-1 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Available Tools Registered in MCP:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-mono">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>check_trust_score</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Evaluate Nostr WoT distance, endorsers count, and Sybil-filtered stake.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold font-mono">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>pay_cashu_nutzap</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Autonomous NIP-61 Chaumian eCash micropayments to creators.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold font-mono">
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>request_nip90_job</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Dispatch AI & compute requests across the Nostr DVM network.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => handleCopy(getActiveCode(), "footer")}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 text-sm cursor-pointer"
        >
          {copiedType === "footer" ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>1-Click Configuration Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy {activeTab === "cursor" ? "Cursor" : activeTab === "claude" ? "Claude Desktop" : "CLI"} Config</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
