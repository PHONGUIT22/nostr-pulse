// src/components/bounty/SpotlightBountyCard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Bot, 
  Sparkles, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ShieldAlert,
  Coins
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SpotlightBountyCard() {
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const mockJobId = "5000:nostrpulse:ai-inference:summary-sentiment-v1";

  const handleCopySpec = () => {
    const spec = JSON.stringify({
      kind: 5000,
      tags: [
        ["i", "Decentralized AI inference benchmark on Nostr freedom stack", "text"],
        ["output", "application/json"],
        ["bid", "5000"],
        ["t", "ai-inference"],
        ["t", "text-generation"],
        ["p", "npub1nostrpulse90dvmworker000000000000000000000000000000000000000"],
        ["param", "model", "llama-3-8b-instruct"]
      ],
      content: "AI Model Inference: Open-Source LLM Note Summary & Sentiment",
      payout: "5 Sats via NIP-61 Chaumian eCash NutZap"
    }, null, 2);

    navigator.clipboard.writeText(spec);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-purple-300 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/40 p-6 sm:p-7 shadow-lg ring-1 ring-purple-400/20 transition-all hover:shadow-xl">
      {/* Background ambient decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Top Badges Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs px-3 py-1 shadow-sm flex items-center gap-1.5 hover:from-purple-700 hover:to-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>🎯 Bitshala Problem Board: Democratizing AI Usage (Slide 7)</span>
            </Badge>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300">
              📌 Pinned Spotlight Task
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200">
              NIP-90 Kind 5000
            </span>
          </div>

          {/* Reward Pill */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3.5 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-md">
            <Zap className="w-4 h-4 fill-white text-white" />
            <span>5 Sats</span>
            <span className="text-[10px] font-medium bg-black/20 px-2 py-0.5 rounded-full">
              NIP-61 eCash NutZap
            </span>
          </div>
        </div>

        {/* Task Title & Tags */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6 text-purple-600 shrink-0" />
              <span>AI Model Inference: Open-Source LLM Note Summary & Sentiment</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-bold">
              #ai-inference
            </Badge>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-bold">
              #text-generation
            </Badge>
            <Badge variant="outline" className="text-slate-600 border-slate-200 text-xs font-mono">
              model: llama-3-8b-instruct
            </Badge>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              2-Sided Cypherpunk Privacy (Zero KYC)
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white/90 backdrop-blur-xs border border-purple-100 rounded-2xl p-4 sm:p-5 text-slate-700 text-sm leading-relaxed shadow-xs space-y-3">
          <p className="font-medium text-slate-800">
            Dispatches compute to decentralized NIP-90 DVM workers. The requester pays anonymously in Chaumian eCash upon receipt of Kind 6000 result, guaranteeing financial and data privacy on both sides of the trade.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
            <div className="flex items-start gap-2 text-slate-600">
              <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                1
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Requester Privacy:</span>
                Payload is end-to-end encrypted with NIP-44 v2. Payment delivered via Chaumian eCash without disclosing node IP or LN invoices.
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                2
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Worker Privacy:</span>
                Open-source DVM nodes compute inference independently and receive bearer eCash proofs, completely free of corporate SaaS tracking.
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Protocol Spec Toggle */}
        {showPrivacyDetails && (
          <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 text-xs font-mono space-y-3 border border-slate-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-purple-400 font-bold">
              <span>NIP-90 + NIP-61 Two-Sided Trade Execution Flow</span>
              <span className="text-[10px] text-slate-500">Kind 5000 ➔ Kind 6000 ➔ Kind 9321</span>
            </div>
            
            <div className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">Step 1: Broadcast Kind 5000 Job Request</span>
                <code>["i", "Analyze note sentiment", "text"], ["param", "model", "llama-3-8b"], ["bid", "5000"]</code>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">Step 2: DVM Worker Publishes Kind 6000 Result</span>
                <code>content: &#123;&quot;sentiment&quot;: &quot;bullish&quot;, &quot;summary&quot;: &quot;Sovereign tech verified&quot;&#125;</code>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-purple-400 font-bold block mb-1">Step 3: Chaumian eCash NutZap Settlement (Kind 9321)</span>
                <code>cashuB... (5 sats bearer proofs, NIP-44 encrypted, validated via NUT-07)</code>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Link href="/agent">
              <Button 
                size="sm"
                className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>Run with Autonomous Agent</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
              className="h-10 px-3.5 rounded-xl border-slate-300 text-slate-700 hover:text-purple-600 hover:bg-purple-50 font-bold text-xs cursor-pointer"
            >
              {showPrivacyDetails ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1" />
                  <span>Hide Spec</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  <span>View 2-Sided Privacy Spec</span>
                </>
              )}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySpec}
            className="h-10 px-3 rounded-xl text-slate-600 hover:text-slate-900 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {copiedSpec ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Job Spec Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Job Spec</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
