// src/components/bounty/TaskResultView.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Coins, 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink, 
  Lock, 
  FileText, 
  Sparkles, 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ClipboardPaste,
  Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  parseCashuToken, 
  verifyTokenWithMint, 
  sendCashuNutZap, 
  DEFAULT_CASHU_MINT, 
  DecodedCashuInfo 
} from "@/lib/cashu";
import { subscribeJobFeedbackAndResult, JobFeedback, JobResult } from "@/lib/nip90";
import { nip19 } from "nostr-tools";

/**
 * Properties for the TaskResultView component.
 */
export interface TaskResultViewProps {
  /** Unique NIP-90 Job Request Event ID */
  jobId: string;
  /** Public key of the worker / DVM claiming or fulfilling the task */
  workerPubkey?: string;
  /** Sats amount requested for the deliverable */
  demandedAmountSats?: number;
  /** Preloaded raw string content of Kind 6000 result */
  initialResultContent?: string;
  /** Preloaded structured payload object (e.g., Trust Score metrics) */
  initialResultData?: any;
  /** Original user prompt associated with the bounty task */
  taskPrompt?: string;
  /** Optional initial Cashu eCash token to fund the settlement */
  initialCashuToken?: string;
  /** Callback fired upon successful NIP-61 NutZap payment broadcast */
  onPaidSuccess?: (txData: {
    eventId: string;
    amountSats: number;
    recipientPubkey: string;
    mintUrl: string;
  }) => void;
  /** Optional callback to close the modal or drawer */
  onClose?: () => void;
}

export default function TaskResultView({
  jobId,
  workerPubkey: initialWorkerPubkey = "",
  demandedAmountSats = 5,
  initialResultContent = "",
  initialResultData = null,
  taskPrompt = "",
  initialCashuToken = "",
  onPaidSuccess,
  onClose,
}: TaskResultViewProps) {
  // Result state
  const [resultText, setResultText] = useState<string>(initialResultContent);
  const [resultData, setResultData] = useState<any>(initialResultData);
  const [workerPubkey, setWorkerPubkey] = useState<string>(initialWorkerPubkey);
  const [amountSats, setAmountSats] = useState<number>(demandedAmountSats);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Cashu payment state
  const [cashuToken, setCashuToken] = useState<string>(initialCashuToken);
  const [showTokenInput, setShowTokenInput] = useState(!initialCashuToken);
  const [isMasked, setIsMasked] = useState(true);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<DecodedCashuInfo | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Payment execution state
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [settledTx, setSettledTx] = useState<{
    eventId: string;
    amountSats: number;
    recipientPubkey: string;
    mintUrl: string;
    changeToken?: string;
  } | null>(null);

  const [copiedTxId, setCopiedTxId] = useState(false);

  // 1. Auto-load Cashu token from ephemeral sessionStorage if available
  // Note: Ephemeral session caching used for MVP interactive demo. Production migration targets NIP-60 wallet isolation.
  useEffect(() => {
    if (!cashuToken && typeof window !== "undefined") {
      const savedToken = sessionStorage.getItem("cashu_token");
      if (savedToken) {
        setCashuToken(savedToken.trim());
      }
    }
  }, [cashuToken]);

  // 2. Validate Cashu Token when modified
  useEffect(() => {
    const trimmed = cashuToken.trim();
    if (!trimmed) {
      setTokenInfo(null);
      setTokenError(null);
      return;
    }

    try {
      const parsed = parseCashuToken(trimmed);
      setTokenInfo(parsed);
      setTokenError(null);

      // Verify unspent status with the mint in background
      setIsVerifyingToken(true);
      verifyTokenWithMint(trimmed)
        .then((verification) => {
          if (!verification.isValid) {
            setTokenError(verification.reason || "Token is already spent or invalid.");
          }
        })
        .catch((err) => {
          setTokenError(err?.message || "Mint verification failed.");
        })
        .finally(() => {
          setIsVerifyingToken(false);
        });
    } catch (err: any) {
      setTokenInfo(null);
      setTokenError(err?.message || "Invalid Cashu token format (must start with cashuA or cashuB).");
    }
  }, [cashuToken]);

  // 3. Listen live to Kind 7000 and Kind 6000 if not already provided
  useEffect(() => {
    if (resultText || resultData) return;

    const sub = subscribeJobFeedbackAndResult(
      jobId,
      (feedback: JobFeedback) => {
        setFeedbackStatus(feedback.status);
        if (feedback.workerPubkey) {
          setWorkerPubkey((prev) => prev || feedback.workerPubkey);
        }
      },
      (result: JobResult) => {
        setResultText(result.content);
        setResultData(result.resultData);
        if (result.workerPubkey) {
          setWorkerPubkey(result.workerPubkey);
        }
        if (result.amountSats) {
          setAmountSats(result.amountSats);
        }
      }
    );

    return () => {
      sub.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Parse JSON if resultText is provided
  useEffect(() => {
    if (resultText && !resultData) {
      try {
        const parsed = JSON.parse(resultText);
        setResultData(parsed);
      } catch {
        // Plain text payload
      }
    }
  }, [resultText, resultData]);

  // Format recipient pubkey to npub for display
  const workerNpub = useMemo(() => {
    if (!workerPubkey) return "Awaiting worker claim...";
    try {
      return nip19.npubEncode(workerPubkey);
    } catch {
      return workerPubkey;
    }
  }, [workerPubkey]);

  // Handle Clipboard Paste
  const handlePasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCashuToken(text.trim());
      }
    } catch (err) {
      console.warn("Clipboard access denied:", err);
    }
  };

  // 4. Accept & Pay with Cashu NutZap (1-Tap Settlement)
  const handleAcceptAndPay = async () => {
    if (!workerPubkey) {
      setPaymentError("Missing recipient worker pubkey for payment.");
      return;
    }

    if (!resultText && !resultData) {
      setPaymentError("Deliverable is still pending. Please wait for Kind 6000 result.");
      return;
    }

    const trimmedToken = cashuToken.trim();
    if (!trimmedToken) {
      setShowTokenInput(true);
      setPaymentError("Please provide a Cashu eCash token to settle payment.");
      return;
    }

    if (tokenError) {
      setPaymentError(tokenError);
      return;
    }

    setIsPaying(true);
    setPaymentError(null);

    try {
      const cleanMint = tokenInfo?.mint || DEFAULT_CASHU_MINT;
      const paymentAmount = amountSats > 0 ? amountSats : 5;

      console.log(`[TaskResultView] Initiating 1-Tap Cashu NutZap to ${workerPubkey}...`);
      console.log(`[TaskResultView] Demanded amount: ${paymentAmount} Sats`);
      console.log(`[TaskResultView] Mint: ${cleanMint}`);

      // Call sendCashuNutZap directly from lib/cashu.ts (Kind 9321 via NIP-44)
      const { signedEvent, changeToken } = await sendCashuNutZap({
        recipientPubkey: workerPubkey,
        cashuToken: trimmedToken,
        amountSats: paymentAmount,
        comment: `Accepted & Settled NIP-90 Job #${jobId.slice(0, 8)} 🥜`,
        mintUrl: cleanMint,
      });

      console.log("[TaskResultView] sendCashuNutZap successful! Event ID:", signedEvent?.id);

      // Handle change token vs fully spent token
      // Note: Ephemeral session caching used for MVP interactive demo. Production migration targets NIP-60 wallet isolation.
      if (typeof window !== "undefined") {
        if (changeToken) {
          sessionStorage.setItem("cashu_token", changeToken);
        } else {
          sessionStorage.removeItem("cashu_token");
        }
      }

      if (changeToken) {
        setCashuToken(changeToken);
      } else {
        setCashuToken("");
      }

      const txResult = {
        eventId: signedEvent?.id || "settled-nutzap-tx",
        amountSats: paymentAmount,
        recipientPubkey: workerPubkey,
        mintUrl: cleanMint,
        changeToken: changeToken || undefined,
      };

      setSettledTx(txResult);

      if (onPaidSuccess) {
        onPaidSuccess(txResult);
      }
    } catch (err: any) {
      console.error("[TaskResultView] Failed to send Cashu NutZap:", err);
      setPaymentError(err?.message || "Failed to execute NutZap payment. Please check your token balance.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleCopyTxId = () => {
    if (!settledTx) return;
    navigator.clipboard.writeText(settledTx.eventId);
    setCopiedTxId(true);
    setTimeout(() => setCopiedTxId(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 max-w-2xl mx-auto">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER & STATUS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              NIP-90 Task Delivery
            </span>
            <Badge variant="outline" className="font-mono text-[11px] text-slate-500">
              Kind 6000
            </Badge>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Review Delivery &amp; Settle Bounty
          </h2>
        </div>

        {/* Worker Info Pill */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <div className={`w-2 h-2 rounded-full ${workerPubkey ? "bg-emerald-500 animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span className="text-xs font-mono text-slate-600 font-bold">
            {workerPubkey ? `Worker: ${workerNpub.slice(0, 10)}...` : workerNpub}
          </span>
        </div>
      </div>

      {/* Task Prompt Reference */}
      {taskPrompt && (
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Original Task Prompt
          </span>
          <p className="text-slate-800 font-medium line-clamp-2">{taskPrompt}</p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. PAYLOAD INSPECTION (RESULT DATA / TRUST SCORE JSON) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-600" />
            Completed Deliverable Payload
          </span>

          {resultData && (
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              {showRawJson ? "Formatted View" : "View Raw JSON"}
            </button>
          )}
        </div>

        {/* Deliverable Content Area */}
        {!resultText && !resultData ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              {feedbackStatus
                ? `Worker status: ${feedbackStatus.toUpperCase()}...`
                : "Waiting for DVM worker to publish Kind 6000 result..."}
            </p>
            <span className="text-[11px] text-slate-400">WebSocket connection listening on relay pool</span>
          </div>
        ) : showRawJson || !resultData || typeof resultData !== "object" ? (
          <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 max-h-72 leading-relaxed">
            {resultText || JSON.stringify(resultData, null, 2)}
          </pre>
        ) : (
          /* Formatted Trust Score Result Card if delivered by Trust Score DVM */
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-4 shadow-inner">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Computed Score
                </span>
                <div className="text-3xl font-black text-white font-mono flex items-center gap-2">
                  <span className="text-emerald-400">{resultData.score || 0}</span>
                  <span className="text-xs font-sans text-slate-400">/ 100</span>
                </div>
              </div>

              {resultData.tier && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Classification
                  </span>
                  <span className="inline-block text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-1">
                    {resultData.tier}
                  </span>
                </div>
              )}
            </div>

            {/* Summary */}
            {resultData.summary && (
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                {resultData.summary}
              </p>
            )}

            {/* Breakdown Pills if available */}
            {Array.isArray(resultData.breakdown) && resultData.breakdown.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Verification Breakdown ({resultData.breakdown.length} Pillars)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {resultData.breakdown.slice(0, 4).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-300 truncate max-w-[160px]">{item.label}</span>
                      <span className={`font-bold font-mono ${item.passed ? "text-emerald-400" : "text-rose-400"}`}>
                        +{item.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CASHU NUTZAP TRANSACTION CARD (COMPLETION SUCCESS)          */}
      {/* MATCHING MachineSpenderBot.tsx STYLE                          */}
      {/* ------------------------------------------------------------- */}
      {settledTx ? (
        <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-emerald-950/60 text-white space-y-4 animate-in fade-in zoom-in-95 duration-300">
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
              <span>Instant Settlement</span>
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
                <span>{settledTx.amountSats.toLocaleString()} Sats</span>
              </div>
              {settledTx.changeToken && (
                <div className="text-[11px] text-emerald-300 font-mono mt-1 font-semibold flex items-center gap-1">
                  <span>🪙</span>
                  <span>Change proofs retained in session</span>
                </div>
              )}
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Recipient Hex Pubkey
              </div>
              <div className="text-xs font-mono text-emerald-300 font-bold">
                {settledTx.recipientPubkey.slice(0, 10)}...{settledTx.recipientPubkey.slice(-8)}
              </div>
            </div>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Nostr Event:</span>
              <button
                onClick={handleCopyTxId}
                className="text-slate-200 font-bold truncate max-w-[160px] hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                title="Click to copy full event ID"
              >
                <span>{settledTx.eventId.slice(0, 16)}...</span>
                {copiedTxId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Cashu Mint:</span>
              <span className="text-emerald-400 font-bold truncate max-w-[160px]">
                {new URL(settledTx.mintUrl).hostname}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between sm:col-span-2">
              <span className="text-slate-400">Protocol Spec:</span>
              <span className="text-slate-200 font-bold">
                NIP-61 NutZap Encrypted via NIP-44 (Kind 9321)
              </span>
            </div>
          </div>

          {/* Closing action */}
          {onClose && (
            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
              >
                Close Delivery View
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 4. CASHU TOKEN INPUT & 1-TAP ACCEPTANCE ACTION                */
        /* ------------------------------------------------------------- */
        <div className="space-y-4 pt-2 border-t border-slate-100">
          {/* Token Source Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Payment Method: Cashu eCash (NutZap)
              </span>
            </div>

            {tokenInfo && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[11px]">
                {tokenInfo.totalAmountSats.toLocaleString()} Sats Ready
              </Badge>
            )}
          </div>

          {/* Token Input Box (expandable or prompted) */}
          {showTokenInput || !tokenInfo ? (
            <div className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type={isMasked ? "password" : "text"}
                  value={cashuToken}
                  onChange={(e) => setCashuToken(e.target.value)}
                  placeholder="Paste Cashu token (cashuA... or cashuB...) to fund settlement"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-600 rounded-2xl pl-3.5 pr-24 py-3 text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                    title={isMasked ? "Reveal Token" : "Mask Token"}
                  >
                    {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handlePasteToken}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Paste from Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isVerifyingToken && (
                <div className="text-[11px] text-purple-600 flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifying cryptographic eCash proofs with Mint...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-900 font-bold">
                  Active Token in Session ({tokenInfo.totalAmountSats.toLocaleString()} Sats)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTokenInput(true)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Change Token
              </button>
            </div>
          )}

          {/* Token Error Notice */}
          {tokenError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{tokenError}</span>
            </div>
          )}

          {/* Payment Execution Error */}
          {paymentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* 1-TAP ACCEPT & PAY BUTTON */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Payment required: <span className="font-bold text-amber-600">{amountSats} Sats</span>
            </div>

            <div className="flex items-center gap-2">
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose} disabled={isPaying}>
                  Cancel
                </Button>
              )}

              <Button
                onClick={handleAcceptAndPay}
                disabled={isPaying || !workerPubkey || isVerifyingToken || (!resultText && !resultData)}
                className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Encrypting NIP-44 NutZap...</span>
                  </>
                ) : !workerPubkey ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-200" />
                    <span>Awaiting worker claim...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>Accept &amp; Pay with Cashu ({amountSats} Sats)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
