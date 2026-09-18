"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Bot,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
  ShieldCheck,
  Wallet,
  Coins,
  Eye,
  EyeOff,
  ClipboardPaste,
  Trash2,
  ArrowRight,
  User,
  Key,
  ExternalLink,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { parseCashuToken } from "@/lib/cashu";

// Sample test Cashu token from testnut for instant judge demo
const DEMO_TESTNUT_TOKEN =
  "cashuAeyJ0b2tlbiI6W3sibWludCI6Imh0dHBzOi8vdGVzdG51dC5jYXNodS5zcGFjZSIsInByb29mcyI6W3siaWQiOiIwMDlhMmJmNzhmYmNhZDlkIiwiYW1vdW50IjoyMSwic2VjcmV0IjoiMWI5OTRhZmQtMGMwNi00Y2UzLTlmZDYtOGQxZjAwZTRlMmUxIiwiQyI6IjAyMDNmYjg5ZGI3Mjg4MWZjNGQ0N2JjODRlMTExMjdmMDlhY2RjZGE2MjM1YmNhZjY5ZjY1MDVlYWY5ZDJlZjFlYiJ9XX1dfQ==";

export default function MachineSpenderBot() {
  // Budget Input State - kept strictly in component memory state to prevent XSS leakage
  // Note: Ephemeral memory state prevents XSS token theft. Production migration targets NIP-60 wallet isolation.
  const [cashuToken, setCashuToken] = useState<string>("");
  const [showToken, setShowToken] = useState<boolean>(false);

  // Chat Input State
  const [input, setInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  // Vercel AI SDK Transport with dynamic token resolution
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/bot",
        headers: {
          "x-cashu-token": cashuToken.trim(),
        },
        body: {
          cashuToken: cashuToken.trim(),
        },
      }),
    [cashuToken]
  );

  // Vercel AI SDK useChat hook
  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport,
  });

  const isGenerating = status === "submitted" || status === "streaming";

  // Derive Cashu token info and errors directly with useMemo
  const { tokenInfo, tokenError } = useMemo(() => {
    const trimmed = cashuToken.trim();
    if (!trimmed) {
      return { tokenInfo: null, tokenError: null };
    }

    try {
      const parsed = parseCashuToken(trimmed);
      return { tokenInfo: parsed, tokenError: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid Cashu token";
      return { tokenInfo: null, tokenError: msg };
    }
  }, [cashuToken]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Form submission handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isGenerating) return;

    setInput("");
    const activeToken = cashuToken.trim();
    try {
      await sendMessage(
        { text: query },
        {
          headers: {
            "x-cashu-token": activeToken,
          },
          body: {
            cashuToken: activeToken,
          },
        }
      );
    } catch (err: unknown) {
      console.error("Failed to send chat message:", err);
    }
  };

  // Quick prompt chip selection
  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
    startTransition(() => {
      handleSendMessage(promptText);
    });
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCashuToken(text.trim());
      }
    } catch {
      // Clipboard read blocked
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. MACHINE MONEY VAULT (BUDGET INPUT SECTION) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        {/* Header Title */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Machine Money Vault
                </h3>
                {tokenInfo ? (
                  <span className="flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    AUTONOMOUS FUNDED
                  </span>
                ) : (
                  <span className="text-[11px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-full border border-slate-700">
                    UNFUNDED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deposit a Cashu eCash token to authorize the AI Agent for autonomous NutZap settlements
              </p>
            </div>
          </div>

          {/* Quick Balance Counter Pill */}
          <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Agent Budget
              </span>
              <span className="text-lg font-black font-mono text-emerald-400 flex items-center gap-1 justify-end">
                <Coins className="w-4 h-4 text-emerald-400" />
                {tokenInfo
                  ? `${tokenInfo.totalAmountSats.toLocaleString()} Sats`
                  : "0 Sats"}
              </span>
            </div>
          </div>
        </div>

        {/* Token Input Box */}
        <div className="space-y-3">
          <div className="relative flex items-center">
            <input
              type={showToken ? "text" : "password"}
              value={cashuToken}
              onChange={(e) => setCashuToken(e.target.value)}
              placeholder="Paste Cashu Token (cashuA... or cashuB...) to fund the AI Agent"
              className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl pl-4 pr-28 py-3.5 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
            />

            {/* Right Action Icons */}
            <div className="absolute right-2.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "Hide Token" : "Reveal Token"}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste from Clipboard"
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>

              {cashuToken && (
                <button
                  type="button"
                  onClick={() => setCashuToken("")}
                  title="Clear Token"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Validation & Demo Helper */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            {tokenInfo && (
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Decoded:{" "}
                  <strong>{tokenInfo.totalAmountSats.toLocaleString()} Sats</strong>{" "}
                  from Mint{" "}
                  <code className="bg-emerald-950/70 px-1.5 py-0.5 rounded text-[11px] text-emerald-300">
                    {new URL(tokenInfo.mint).hostname}
                  </code>
                </span>
              </div>
            )}

            {tokenError && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{tokenError}</span>
              </div>
            )}

            {!cashuToken && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">
                  Don&apos;t have a token?
                </span>
                <button
                  type="button"
                  onClick={() => setCashuToken(DEMO_TESTNUT_TOKEN)}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Load 21 Sats Demo Token (Testnut)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHAT CONVERSATION LOG */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                NostrPulse Autonomous Agent
                <span className="text-[10px] font-mono bg-purple-950/70 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/60">
                  Gemini 3.8 Flash • NIP-61
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Autonomous Agent: resolves creator pubkeys and signs NIP-44 encrypted eCash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Welcome Placeholder */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-3xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
                <Cpu className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                AI Autonomous Spender is Ready
              </h4>
              <p className="text-xs max-w-md text-slate-400 leading-relaxed mb-6">
                Paste a Cashu eCash token into the vault above, then instruct the AI
                to settle NutZaps to any creator on Nostr.
              </p>

              {/* Suggested Quick Action Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Tip 21 sats to jb55")}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-2xl text-left text-xs transition-all cursor-pointer group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-emerald-400 flex items-center justify-between">
                    <span>⚡ Tip 21 Sats to jb55</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Resolve William Casarin &amp; send eCash NutZap
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Lookup profile for fiatjaf")}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 p-3 rounded-2xl text-left text-xs transition-all cursor-pointer group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-purple-400 flex items-center justify-between">
                    <span>🔍 Lookup fiatjaf profile</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Fetch 64-char Hex Pubkey &amp; profile metadata
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Send 50 sats NutZap to Jack")}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-2xl text-left text-xs transition-all cursor-pointer group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-emerald-400 flex items-center justify-between">
                    <span>🥜 NutZap 50 Sats to Jack</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Autonomous NIP-44 Kind 9321 encryption
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Check your current wallet budget balance"
                    )
                  }
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 p-3 rounded-2xl text-left text-xs transition-all cursor-pointer group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-amber-400 flex items-center justify-between">
                    <span>🛡️ Check Agent Wallet</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Inspect loaded eCash budget and mint status
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Messages Loop */}
          {messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] space-y-3 ${
                    isUser
                      ? "bg-purple-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-md text-sm font-medium"
                      : "space-y-3 w-full"
                  }`}
                >
                  {/* User Text */}
                  {isUser && (
                    <div className="whitespace-pre-wrap">
                      {message.parts
                        ?.filter((p) => p.type === "text")
                        .map((p) => (p as { text: string }).text)
                        .join("") || ""}
                    </div>
                  )}

                  {/* Assistant Content Parts */}
                  {!isUser && (
                    <div className="space-y-3">
                      {/* Render UI Parts (Tools, Text, Reasoning) */}
                      {Array.isArray(message.parts) &&
                        message.parts.map((part, partIdx) => {
                          const partKey = `${message.id}-part-${partIdx}`;

                          // Text Part
                          if (part.type === "text") {
                            const text = (part as { text?: string }).text;
                            if (!text) return null;
                            return (
                              <div
                                key={partKey}
                                className="bg-slate-800/90 text-slate-200 rounded-2xl rounded-tl-xs p-4 border border-slate-700/80 text-sm leading-relaxed whitespace-pre-wrap"
                              >
                                {text}
                              </div>
                            );
                          }

                          // --------------------------------------------------
                          // PART: EXECUTE_NUTZAP TOOL (MATCHING LIGHTNINGZAPCARD STYLE)
                          // --------------------------------------------------
                          const isNutzapTool =
                            part.type === "tool-execute_nutzap" ||
                            (part.type === "dynamic-tool" &&
                              (part as { toolName?: string }).toolName ===
                                "execute_nutzap");

                          if (isNutzapTool) {
                            const p = part as {
                              state?: string;
                              output?: {
                                success: boolean;
                                eventId?: string;
                                recipientPubkey?: string;
                                amountSats?: number;
                                mintUrl?: string;
                                message?: string;
                                error?: string;
                              };
                              input?: {
                                pubkey?: string;
                                amountSats?: number;
                                comment?: string;
                              };
                            };

                            // Success State -> THE GLORIOUS LIGHTNINGZAPCARD STYLE
                            if (p.state === "output-available" && p.output?.success) {
                              const zapData = p.output;
                              return (
                                <div
                                  key={partKey}
                                  className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-emerald-950/60 text-white space-y-4 animate-in fade-in zoom-in-95 duration-300"
                                >
                                  {/* Top Header Badge */}
                                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                                    <div className="flex items-center gap-2">
                                      <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                                        <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span>NIP-61 NUTZAP SETTLED</span>
                                      </div>
                                      <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                                        Chaumian eCash
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                                      <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-900" />
                                      <span>Paid Instant</span>
                                    </div>
                                  </div>

                                  {/* Middle Content: Big Sats Display */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/40 p-4 rounded-2xl border border-emerald-800/40">
                                    <div>
                                      <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-bold">
                                        Settlement Amount
                                      </div>
                                      <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-center gap-2">
                                        <span>🥜</span>
                                        <span>
                                          {zapData.amountSats?.toLocaleString() ||
                                            "0"}{" "}
                                          Sats
                                        </span>
                                      </div>
                                    </div>

                                    {zapData.recipientPubkey && (
                                      <div className="text-left sm:text-right">
                                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                                          Recipient Hex Pubkey
                                        </div>
                                        <div className="text-xs font-mono text-emerald-300 font-bold">
                                          {zapData.recipientPubkey.slice(0, 10)}
                                          ...
                                          {zapData.recipientPubkey.slice(-8)}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Transaction Metadata Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                                    {zapData.eventId && (
                                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <span className="text-slate-400">
                                          Nostr Event:
                                        </span>
                                        <span className="text-slate-200 font-bold truncate max-w-[160px]">
                                          {zapData.eventId.slice(0, 16)}...
                                        </span>
                                      </div>
                                    )}

                                    {zapData.mintUrl && (
                                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <span className="text-slate-400">
                                          Cashu Mint:
                                        </span>
                                        <span className="text-emerald-400 font-bold truncate max-w-[160px]">
                                          {new URL(zapData.mintUrl).hostname}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Footer Verification Tag */}
                                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>
                                        End-to-End Encrypted via NIP-44 • Relays Broadcasted
                                      </span>
                                    </div>
                                    <span className="text-slate-400 font-mono">
                                      Kind 9321
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // Error State
                            if (
                              p.state === "output-error" ||
                              (p.output && !p.output.success)
                            ) {
                              const errorMsg =
                                p.output?.error ||
                                "Failed to complete NutZap transaction.";
                              return (
                                <div
                                  key={partKey}
                                  className="bg-rose-950/40 border border-rose-800 p-4 rounded-2xl text-rose-300 text-xs flex items-start gap-3"
                                >
                                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <div className="font-bold text-rose-200">
                                      NutZap Transaction Failed
                                    </div>
                                    <div className="text-rose-300/90 leading-relaxed font-mono">
                                      {errorMsg}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Processing State
                            return (
                              <div
                                key={partKey}
                                className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl text-xs flex items-center gap-3 text-slate-300 animate-pulse"
                              >
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                                <div>
                                  <span className="font-bold text-white">
                                    Executing Encrypted NutZap...
                                  </span>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    Signing NIP-44 payload and pushing Kind:9321 to Nostr relays
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // --------------------------------------------------
                          // PART: FIND_CREATOR TOOL
                          // --------------------------------------------------
                          const isFindCreatorTool =
                            part.type === "tool-find_creator" ||
                            (part.type === "dynamic-tool" &&
                              (part as { toolName?: string }).toolName ===
                                "find_creator");

                          if (isFindCreatorTool) {
                            const p = part as {
                              state?: string;
                              output?: {
                                query: string;
                                hexPubkey: string;
                                npub: string;
                                isValidHex: boolean;
                                creator?: {
                                  name?: string;
                                  handle?: string;
                                  about?: string;
                                  picture?: string;
                                  lud16?: string;
                                };
                              };
                            };

                            if (p.state === "output-available" && p.output) {
                              const c = p.output;
                              return (
                                <div
                                  key={partKey}
                                  className="bg-slate-900 border border-slate-700/90 rounded-2xl p-4 text-xs space-y-2.5 shadow-lg"
                                >
                                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                                    <span className="font-bold flex items-center gap-1.5 text-purple-400">
                                      <Key className="w-3.5 h-3.5" />
                                      <span>Nostr Identity Resolved</span>
                                    </span>
                                    <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                      {c.query}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {c.creator?.picture ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={c.creator.picture}
                                        alt={c.creator.name || "Creator"}
                                        className="w-10 h-10 rounded-full object-cover border border-purple-500/50"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 font-bold">
                                        {c.creator?.name?.[0] || "?"}
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-white text-sm truncate flex items-center gap-2">
                                        <span>
                                          {c.creator?.name || c.query}
                                        </span>
                                        {c.creator?.handle && (
                                          <span className="text-xs text-purple-400 font-normal">
                                            @{c.creator.handle}
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-mono text-[11px] text-slate-400 truncate">
                                        {c.hexPubkey}
                                      </div>
                                    </div>

                                    {c.npub && (
                                      <a
                                        href={`/p/${c.npub}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
                                        title="View Nostr Profile"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={partKey}
                                className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl text-xs flex items-center gap-2 text-slate-400"
                              >
                                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                                <span>Resolving Nostr creator pubkey...</span>
                              </div>
                            );
                          }

                          return null;
                        })}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Streaming Progress Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3 bg-slate-800/40 rounded-xl w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>AI Agent is deliberating and executing actions...</span>
            </div>
          )}

          {/* Top-level Error Display */}
          {error && (
            <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error.message || "An error occurred in AI Agent route."}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Instruct the Agent (e.g. 'Tip 21 sats to jb55 with a thank you note')..."
              disabled={isGenerating}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors shadow-inner"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={() => stop()}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-3.5 rounded-2xl text-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black px-5 py-3.5 rounded-2xl text-sm transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
