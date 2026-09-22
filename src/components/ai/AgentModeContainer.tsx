"use client";

import { useState } from "react";
import MachineSpenderBot from "@/components/ai/MachineSpenderBot";
import AutonomousAgentTerminal from "@/components/ai/AutonomousAgentTerminal";
import GuardrailPlayground from "@/components/ai/GuardrailPlayground";
import ConnectMcpCard from "@/components/mcp/ConnectMcpCard";
import { MessageSquare, Terminal, Cpu, Sparkles, ShieldCheck } from "lucide-react";

type AgentMode = "interactive" | "headless";

export default function AgentModeContainer() {
  const [activeMode, setActiveMode] = useState<AgentMode>("interactive");

  return (
    <div className="space-y-8">
      {/* Prominent Mode Switcher Tab Bar (BOSS Battle Rubric Slide 10 & Slide 7) */}
      <div className="bg-slate-900/90 p-2 rounded-3xl border border-slate-800 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Mode 1: Interactive Demo (Human-in-the-Loop) */}
          <button
            type="button"
            onClick={() => setActiveMode("interactive")}
            className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all cursor-pointer border ${
              activeMode === "interactive"
                ? "bg-gradient-to-r from-emerald-950/70 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10"
                : "bg-transparent border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                activeMode === "interactive"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-800 text-slate-500 border-slate-700"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-black text-sm ${
                    activeMode === "interactive" ? "text-white" : "text-slate-300"
                  }`}
                >
                  💬 Interactive Demo (Human-in-the-Loop)
                </span>
                {activeMode === "interactive" && (
                  <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Chatbot UI with manual eCash funding &amp; prompt testing
              </p>
            </div>
          </button>

          {/* Mode 2: Autonomous Headless Agent (M2M Stdio) */}
          <button
            type="button"
            onClick={() => setActiveMode("headless")}
            className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all cursor-pointer border ${
              activeMode === "headless"
                ? "bg-gradient-to-r from-purple-950/70 via-slate-900 to-emerald-950/40 border-purple-500/80 shadow-lg shadow-purple-500/10"
                : "bg-transparent border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                activeMode === "headless"
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-800 text-slate-500 border-slate-700"
              }`}
            >
              <Terminal className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-black text-sm ${
                    activeMode === "headless" ? "text-white" : "text-slate-300"
                  }`}
                >
                  ⚡ Autonomous Headless Agent (M2M Stdio)
                </span>
                <span className="text-[10px] font-bold bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/60">
                  Slide 10 &amp; 7
                </span>
                {activeMode === "headless" && (
                  <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Headless 4-step A2A loop (NIP-90 + WoT Radar + Cashu Settlement)
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Mode Content Rendering */}
      {activeMode === "interactive" ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Machine Spender Bot Component */}
          <MachineSpenderBot />

          {/* Anti-Prompt Injection & Spend Guardrail Playground (Rubric Slide 10 & 8) */}
          <div id="guardrail-playground" className="pt-2">
            <GuardrailPlayground />
          </div>

          {/* Connect MCP Server Banner */}
          <div className="pt-2">
            <ConnectMcpCard />
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Autonomous Headless Agent Terminal Dashboard */}
          <AutonomousAgentTerminal />

          {/* Anti-Prompt Injection & Spend Guardrail Playground (Rubric Slide 10 & 8) */}
          <div id="guardrail-playground" className="pt-2">
            <GuardrailPlayground />
          </div>

          {/* Connect MCP Server Banner at the bottom */}
          <div className="pt-2">
            <ConnectMcpCard />
          </div>
        </div>
      )}
    </div>
  );
}
