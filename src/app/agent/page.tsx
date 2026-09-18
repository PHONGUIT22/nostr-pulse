import type { Metadata } from "next";
import MachineSpenderBot from "@/components/ai/MachineSpenderBot";
import ConnectMcpCard from "@/components/mcp/ConnectMcpCard";
import { Sparkles, Coins, Zap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Machine Money Agent | NostrPulse",
  description:
    "Autonomous AI Agent that holds real Chaumian eCash (Cashu) and settles Value-4-Value payments (NutZaps NIP-61) to Nostr creators.",
};

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Machine Money &amp; Nostr Settlement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            AI <span className="text-emerald-400">Machine Spender</span> Agent
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Machine Money Interface: Fund the AI Agent with Chaumian eCash (
            <code className="text-emerald-400">cashuA...</code> /{" "}
            <code className="text-emerald-400">cashuB...</code>) to enable
            autonomous Value-4-Value NutZaps (Kind 9321) to Nostr creators.
          </p>

          {/* Quick Feature Pills */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 flex-wrap pt-2">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-400" />
              Cashu NUTs V4 Support
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              NIP-61 Instant Micro-Settlements
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              NIP-44 End-to-End Encryption
            </span>
          </div>
        </div>

        {/* Connect MCP Server Banner/Card */}
        <ConnectMcpCard />

        {/* Machine Spender Bot Component */}
        <MachineSpenderBot />
      </div>
    </main>
  );
}
