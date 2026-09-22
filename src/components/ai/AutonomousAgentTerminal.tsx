"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal,
  Play,
  RotateCcw,
  Copy,
  Check,
  Bot,
  Cpu,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  ExternalLink,
  Code2,
  Layers,
  Activity,
  AlertCircle
} from "lucide-react";

interface LogEntry {
  id: string;
  step: 1 | 2 | 3 | 4;
  time: string;
  tag: string;
  tagColor: string;
  type: "info" | "success" | "warning" | "rpc";
  message: string;
  payload?: any;
}

const SIMULATION_SCRIPT = [
  // STEP 1: Discovery & Compute Request
  {
    step: 1 as const,
    delay: 400,
    tag: "Agent A (Requester)",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
    type: "info" as const,
    message: "Initializing autonomous task session. Intent: Compute-for-Sats via NIP-90 DVM.",
  },
  {
    step: 1 as const,
    delay: 600,
    tag: "Agent A (Requester)",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
    type: "rpc" as const,
    message: "Invoking MCP tool: request_nip90_job (Prompt: 'Summarize Nostr Note', Bid: 5 sats)",
    payload: {
      jsonrpc: "2.0",
      id: "req_01",
      method: "tools/call",
      params: {
        name: "request_nip90_job",
        arguments: {
          category: "summarization",
          prompt: "Summarize Nostr Note note1z7k982c...",
          bidSats: 5,
          relays: ["wss://relay.damus.io", "wss://nos.lol", "wss://nostr.band"]
        }
      }
    }
  },
  {
    step: 1 as const,
    delay: 700,
    tag: "MCP Stdio",
    tagColor: "text-amber-400 border-amber-500/30 bg-amber-950/40",
    type: "success" as const,
    message: "✔ [NIP-90 Relay Broadcast] Published Kind 5001 compute request to open relays. Event ID: f3a89e1b2c4d9a8e... (Bid: 5 sats, Max Tokens: 120)",
  },

  // STEP 2: Counterparty WoT Audit
  {
    step: 2 as const,
    delay: 800,
    tag: "Agent B (Worker)",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-950/40",
    type: "info" as const,
    message: "Incoming Kind 5001 job request intercepted from relay mesh. Initiating pre-execution security policy...",
  },
  {
    step: 2 as const,
    delay: 650,
    tag: "Agent B (Worker)",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-950/40",
    type: "rpc" as const,
    message: "Invoking MCP tool: check_trust_score (Counterparty Pubkey: 3bf0c63f...)",
    payload: {
      jsonrpc: "2.0",
      id: "req_02",
      method: "tools/call",
      params: {
        name: "check_trust_score",
        arguments: {
          pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"
        }
      }
    }
  },
  {
    step: 2 as const,
    delay: 500,
    tag: "WoT Ring-1 Radar",
    tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40",
    type: "success" as const,
    message: "✔ [WoT Radar Query] Memory lookup: 5,544 Ring-1 nodes evaluated in RAM (Latency: 2.1ms).",
    payload: {
      wotDistance: 1,
      tier: "Verified Builder",
      score: 86,
      rootEndorsements: 8,
      sybilRisk: "Zero (Protected by Ring-1 Anchor Graph)"
    }
  },
  {
    step: 2 as const,
    delay: 600,
    tag: "Agent B (Worker)",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-950/40",
    type: "success" as const,
    message: "✔ [COUNTERPARTY APPROVED] Requester score 86/100 exceeds 40-pt threshold. Agent B executes inference and emits Kind 6001 response.",
  },

  // STEP 3: Pre-Flight Guardrail Check
  {
    step: 3 as const,
    delay: 750,
    tag: "Agent A (Requester)",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
    type: "info" as const,
    message: "Kind 6001 task completion received. Initiating autonomous micro-settlement pipeline...",
  },
  {
    step: 3 as const,
    delay: 600,
    tag: "Agent A (Requester)",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
    type: "rpc" as const,
    message: "Invoking MCP tool: get_spending_guardrails (Verifying rolling 24h budget)",
    payload: {
      jsonrpc: "2.0",
      id: "req_03",
      method: "tools/call",
      params: {
        name: "get_spending_guardrails",
        arguments: {}
      }
    }
  },
  {
    step: 3 as const,
    delay: 550,
    tag: "Guardrail Policy",
    tagColor: "text-blue-400 border-blue-500/30 bg-blue-950/40",
    type: "success" as const,
    message: "✔ [Guardrail Audit Passed] 24h Budget: 500 sats | Spent: 5 sats | Remaining: 495 sats. Requested transaction (5 sats) is within policy limits.",
    payload: {
      dailyLimitSats: 500,
      spentLast24hSats: 5,
      remainingAllowanceSats: 495,
      maxPerTxSats: 50,
      verdict: "APPROVED"
    }
  },

  // STEP 4: Micro-Settlement Execution
  {
    step: 4 as const,
    delay: 800,
    tag: "Agent A (Requester)",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
    type: "rpc" as const,
    message: "Invoking MCP tool: pay_cashu_nutzap (Broadcasting 5 sats Kind 9321 eCash token)",
    payload: {
      jsonrpc: "2.0",
      id: "req_04",
      method: "tools/call",
      params: {
        name: "pay_cashu_nutzap",
        arguments: {
          recipient: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
          amountSats: 5,
          mint: "https://testnut.cashu.space",
          comment: "NIP-90 compute fee settlement"
        }
      }
    }
  },
  {
    step: 4 as const,
    delay: 700,
    tag: "Cashu Mint Engine",
    tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40",
    type: "info" as const,
    message: "Selected Mint: https://testnut.cashu.space (NUT-06 Health: 100%, Latency: 74ms). Minting 5 sats CBOR bearer proofs (NUT-00 CBOR V4)...",
  },
  {
    step: 4 as const,
    delay: 650,
    tag: "Crypto Engine",
    tagColor: "text-teal-400 border-teal-500/30 bg-teal-950/40",
    type: "info" as const,
    message: "Payload encrypted via NIP-44 v2 ephemeral Diffie-Hellman key exchange. Front-running and MEV-immune bearer token sealed.",
  },
  {
    step: 4 as const,
    delay: 800,
    tag: "Nostr Relay Mesh",
    tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40",
    type: "success" as const,
    message: "✔ [Kind 9321 Broadcast Complete] 5 sats eCash NutZap delivered across 5 relays. Agent B confirms proof swap into fresh secret keys.",
    payload: {
      status: "paid",
      rail: "cashu_nutzap",
      amountSats: 5,
      mint: "https://testnut.cashu.space",
      eventKind: 9321,
      executionTimeMs: 98
    }
  },
  {
    step: 4 as const,
    delay: 500,
    tag: "Runtime Summary",
    tagColor: "text-amber-400 border-amber-500/30 bg-amber-950/40",
    type: "success" as const,
    message: "🎉 [4-STEP AUTONOMOUS M2M CYCLE COMPLETE] Zero human intervention. Total lifecycle execution latency: 154ms compute.",
  }
];

export default function AutonomousAgentTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [copiedCli, setCopiedCli] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "rpc" | "errors">("all");
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Auto-scroll inside terminal container only (never hijacks window scroll position)
  const scrollToBottom = useCallback(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, []);

  const handleCopyCli = () => {
    navigator.clipboard.writeText("npx tsx scripts/test-mesh-agent.ts");
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2500);
  };

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setCurrentStep(1);
    abortControllerRef.current = false;

    for (let i = 0; i < SIMULATION_SCRIPT.length; i++) {
      if (abortControllerRef.current) break;
      const item = SIMULATION_SCRIPT[i];
      setCurrentStep(item.step);

      await new Promise((resolve) => setTimeout(resolve, item.delay));
      if (abortControllerRef.current) break;

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${Math.floor(
        now.getMilliseconds() / 100
      )}`;

      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}_${i}`,
          step: item.step,
          time: timeStr,
          tag: item.tag,
          tagColor: item.tagColor,
          type: item.type,
          message: item.message,
          payload: item.payload,
        },
      ]);
    }

    setIsRunning(false);
    setCurrentStep(4);
  };

  const handleReset = () => {
    abortControllerRef.current = true;
    setIsRunning(false);
    setCurrentStep(0);
    setLogs([]);
  };

  useEffect(() => {
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs, scrollToBottom]);

  const filteredLogs = logs.filter((log) => {
    if (filterMode === "rpc") return Boolean(log.payload);
    if (filterMode === "errors") return log.type === "warning";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 4-Step Visual Stepper Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Autonomous M2M Lifecycle Protocol (Rubric Slide 10 &amp; 7)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Stdio JSON-RPC 2.0 • Headless Daemon
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1 */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentStep === 1
                ? "bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10 scale-101"
                : currentStep > 1
                ? "bg-slate-950/60 border-slate-700/60"
                : "bg-slate-950/30 border-slate-800/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Step 1: Compute Bid
              </span>
              {currentStep > 1 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : currentStep === 1 ? (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              ) : (
                <span className="text-[10px] font-mono text-slate-600">01</span>
              )}
            </div>
            <p className="text-xs font-bold text-white">NIP-90 Job Dispatch</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agent A dispatches 5 sats task over relays
            </p>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentStep === 2
                ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/10 scale-101"
                : currentStep > 2
                ? "bg-slate-950/60 border-slate-700/60"
                : "bg-slate-950/30 border-slate-800/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Step 2: Anti-Sybil
              </span>
              {currentStep > 2 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : currentStep === 2 ? (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              ) : (
                <span className="text-[10px] font-mono text-slate-600">02</span>
              )}
            </div>
            <p className="text-xs font-bold text-white">Counterparty WoT Audit</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agent B audits Ring-1 score (86/100 &gt; 40)
            </p>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentStep === 3
                ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10 scale-101"
                : currentStep > 3
                ? "bg-slate-950/60 border-slate-700/60"
                : "bg-slate-950/30 border-slate-800/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Step 3: Guardrail
              </span>
              {currentStep > 3 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : currentStep === 3 ? (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              ) : (
                <span className="text-[10px] font-mono text-slate-600">03</span>
              )}
            </div>
            <p className="text-xs font-bold text-white">Pre-Flight Policy Check</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agent A checks 24h budget (495 sats remaining)
            </p>
          </div>

          {/* Step 4 */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentStep === 4
                ? "bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-101"
                : logs.length > 0 && currentStep === 4
                ? "bg-emerald-950/50 border-emerald-500/60"
                : "bg-slate-950/30 border-slate-800/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Step 4: Settlement
              </span>
              {logs.length > 10 && !isRunning ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : currentStep === 4 ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ) : (
                <span className="text-[10px] font-mono text-slate-600">04</span>
              )}
            </div>
            <p className="text-xs font-bold text-white">Cashu NutZap Settlement</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              5 sats Kind 9321 eCash swapped &amp; secured
            </p>
          </div>
        </div>
      </div>

      {/* Main Terminal Box */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 ml-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>nostrpulse-mcp stdio session (A2A Mesh Protocol)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Command Copy Pill */}
            <button
              type="button"
              onClick={handleCopyCli}
              className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 rounded-xl text-[11px] font-mono text-slate-300 transition-all cursor-pointer shadow-xs hover:border-slate-500"
              title="Copy native CLI command to run test-mesh-agent locally"
            >
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span>npx tsx scripts/test-mesh-agent.ts</span>
              {copiedCli ? (
                <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
              ) : (
                <Copy className="w-3 h-3 text-slate-500 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Action Controls & Filters Bar */}
        <div className="bg-slate-900/60 px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runSimulation}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin text-emerald-300" : "fill-white"}`} />
              <span>{isRunning ? "Running Autonomous A2A Simulation..." : logs.length > 0 ? "▶ Run Again" : "▶ Run Autonomous A2A Simulation"}</span>
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold transition-all cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                filterMode === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Logs ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("rpc")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                filterMode === "rpc" ? "bg-slate-800 text-purple-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              JSON-RPC ({logs.filter((l) => l.payload).length})
            </button>
          </div>
        </div>

        {/* Terminal Screen View */}
        <div 
          ref={terminalContainerRef}
          className="p-4 sm:p-6 font-mono text-xs text-slate-300 min-h-[420px] max-h-[580px] overflow-y-auto space-y-2.5 bg-slate-950/95 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {logs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <p className="font-bold text-white text-sm">
                  Autonomous Headless Machine Money Runtime Ready
                </p>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  This terminal provides real-time visibility into the non-custodial 4-step
                  Machine-to-Machine loop. Click the button below to observe Agent A and Agent B
                  collaborate via Stdio JSON-RPC.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={runSimulation}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer hover:scale-102"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>▶ Run Autonomous A2A Simulation</span>
                </button>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="space-y-1.5 animate-in fade-in duration-200 border-b border-slate-900/60 pb-2.5"
              >
                <div className="flex items-start sm:items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                    [{log.time}]
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${log.tagColor}`}
                  >
                    {log.tag}
                  </span>

                  <span
                    className={`leading-relaxed text-xs break-all sm:break-normal ${
                      log.type === "success"
                        ? "text-emerald-300 font-semibold"
                        : log.type === "warning"
                        ? "text-amber-300"
                        : log.type === "rpc"
                        ? "text-purple-300"
                        : "text-slate-300"
                    }`}
                  >
                    {log.message}
                  </span>
                </div>

                {/* Structured JSON-RPC Inspector Block */}
                {log.payload && (
                  <div className="ml-0 sm:ml-6 mt-1 p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 border-b border-slate-800 pb-1">
                      <span className="font-bold text-purple-400 uppercase tracking-wider">
                        JSON-RPC Stdio Payload
                      </span>
                      <span>RFC 8949 / JSON 2.0</span>
                    </div>
                    <pre className="text-emerald-300 font-mono whitespace-pre-wrap">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Terminal Footer Telemetry */}
        <div className="bg-slate-900/80 px-4 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>M2M Stdio IPC: Operational</span>
            <span className="text-slate-600">•</span>
            <span>WoT Radar: 5,544 Ring-1 In-Memory Nodes</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>Guardrails: 500 sats/24h</span>
            <span>•</span>
            <a
              href="https://github.com/PHONGUIT22/nostr-pulse/blob/main/scripts/test-mesh-agent.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>View Source on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
