"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  Loader2, 
  QrCode,
  Coins,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowDownCircle,
  ClipboardPaste,
  Server,
  Settings2,
  ChevronDown
} from "lucide-react";
import { generateSecretKey, finalizeEvent } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
import ZapQrModal from "@/components/detail/ZapQrModal";
import { 
  parseCashuToken, 
  verifyTokenWithMint, 
  sendCashuNutZap, 
  createCashuMintQuote,
  pollMintAndClaimToken,
  RECOMMENDED_MINTS,
  DEFAULT_CASHU_MINT,
  isValidMintUrl
} from "@/lib/cashu";

interface ZapCardProps {
  npub: string;
  lud16?: string;
  name?: string;
  pubkey?: string;
}

const PRESET_AMOUNTS = [21, 100, 500, 1000, 5000, 21000];

function resolveCandidateEndpoints(lud16: string | undefined, defaultHandle: string): { endpoint: string; rawAddress: string }[] {
  const list: { endpoint: string; rawAddress: string }[] = [];
  const cleanUser = defaultHandle.toLowerCase().replace(/[^a-z0-9_]/g, "") || "creator";

  if (lud16 && lud16.includes("@")) {
    const parts = lud16.split("@");
    const u = parts[0].trim();
    const d = parts[1].trim();
    if (u && d) {
      list.push({
        endpoint: `https://${d}/.well-known/lnurlp/${encodeURIComponent(u)}`,
        rawAddress: lud16,
      });
    }
  }

  list.push({
    endpoint: `https://getalby.com/.well-known/lnurlp/${cleanUser}`,
    rawAddress: `${cleanUser}@getalby.com`,
  });

  return list;
}

export default function LightningZapCard({
  npub,
  lud16,
  name = "Creator",
  pubkey
}: ZapCardProps) {
  // Tabs: Lightning vs Cashu
  const [activeTab, setActiveTab] = useState<"lightning" | "cashu">("lightning");
  
  // Cashu sub-mode: "mint" (In-app minting) vs "paste" (Paste existing token)
  const [cashuMode, setCashuMode] = useState<"mint" | "paste">("mint");

  // Dynamic Cashu Mint Selector
  const [selectedMintUrl, setSelectedMintUrl] = useState<string>(DEFAULT_CASHU_MINT);
  const [isCustomMintInput, setIsCustomMintInput] = useState<boolean>(false);
  const [customMintUrl, setCustomMintUrl] = useState<string>("");
  const [isMintSettingsOpen, setIsMintSettingsOpen] = useState<boolean>(false);

  // Common States
  const [sats, setSats] = useState<number>(100);
  const [comment, setComment] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Lightning QR State
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [invoicePr, setInvoicePr] = useState("");
  const [zapEventPayload, setZapEventPayload] = useState<any>(null);

  // Cashu Paste State
  const [cashuTokenInput, setCashuTokenInput] = useState<string>("");
  const [verifiedCashuAmount, setVerifiedCashuAmount] = useState<number | null>(null);
  const [verifiedMintUrl, setVerifiedMintUrl] = useState<string>("");

  const cleanHandle = name.toLowerCase().replace(/[^a-z0-9_]/g, "") || "creator";
  const recipientPubkey = pubkey || npub;

  // Restore saved Mint from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMint = localStorage.getItem("nostrpulse_selected_mint");
      if (savedMint && isValidMintUrl(savedMint)) {
        setSelectedMintUrl(savedMint);
        if (!RECOMMENDED_MINTS.some(m => m.url === savedMint)) {
          setIsCustomMintInput(true);
          setCustomMintUrl(savedMint);
        }
      }
    }
  }, []);

  // Update and persist selected Mint
  const handleMintChange = (url: string) => {
    setSelectedMintUrl(url);
    if (typeof window !== "undefined") {
      localStorage.setItem("nostrpulse_selected_mint", url);
    }
  };

  // ----------------------------------------------------
  // 1. LIGHTNING ZAP (NIP-57)
  // ----------------------------------------------------
  const handleLightningZap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sats <= 0) return;

    setIsProcessing(true);
    setStatus("idle");
    setStatusMessage("");
    setIsQrOpen(false);

    try {
      const amountMsats = sats * 1000;
      const candidates = resolveCandidateEndpoints(lud16, name);

      let lnurlData: any = null;

      for (const item of candidates) {
        try {
          const res = await fetch(item.endpoint, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(6000), 
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.callback) {
              lnurlData = data;
              break;
            }
          }
        } catch {}
      }

      if (!lnurlData?.callback) {
        throw new Error("Unable to connect to the creator's Lightning provider.");
      }

      let signedZapEvent: any = null;
      let hexPubkey = pubkey || "";
      if (hexPubkey.startsWith("npub1")) {
        try {
          const decoded = nip19.decode(hexPubkey);
          if (decoded.type === "npub") hexPubkey = decoded.data as string;
        } catch {}
      }

      if (hexPubkey && /^[0-9a-fA-F]{64}$/.test(hexPubkey)) {
        const zapEventTemplate = {
          kind: 9734,
          content: comment.trim() || "Value-4-Value Lightning Zap ⚡",
          tags: [
            ["p", hexPubkey],
            ["relays", "wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"],
            ["amount", amountMsats.toString()],
          ],
          created_at: Math.floor(Date.now() / 1000),
        };

        if (typeof window !== "undefined" && (window as any).nostr?.signEvent) {
          try {
            signedZapEvent = await (window as any).nostr.signEvent(zapEventTemplate);
          } catch {}
        }

        if (!signedZapEvent) {
          const ephemeralSk = generateSecretKey();
          signedZapEvent = finalizeEvent(zapEventTemplate, ephemeralSk);
        }
      }

      let generatedPr = "";
      const callbackUrl = new URL(lnurlData.callback);
      callbackUrl.searchParams.append("amount", amountMsats.toString());

      try {
        const fetchUrl1 = new URL(callbackUrl.toString());
        if (signedZapEvent) {
          fetchUrl1.searchParams.append("nostr", JSON.stringify(signedZapEvent));
        }
        
        const res1 = await fetch(fetchUrl1.toString(), { signal: AbortSignal.timeout(6000) });
        if (res1.ok) {
          const json1 = await res1.json();
          if (json1.pr && json1.pr.toLowerCase().startsWith("lnbc")) {
            generatedPr = json1.pr;
          }
        }
      } catch {}

      if (!generatedPr) {
        const fetchUrl2 = new URL(callbackUrl.toString());
        if (comment.trim() && lnurlData.commentAllowed > 0) {
          fetchUrl2.searchParams.append("comment", comment.trim().substring(0, lnurlData.commentAllowed));
        }

        const res2 = await fetch(fetchUrl2.toString(), { signal: AbortSignal.timeout(6000) });
        const json2 = await res2.json();

        if (json2.pr && json2.pr.toLowerCase().startsWith("lnbc")) {
          generatedPr = json2.pr;
        } else {
          throw new Error(json2.reason || "The Lightning node refused to generate an invoice.");
        }
      }

      setInvoicePr(generatedPr);
      setZapEventPayload(signedZapEvent);

      if (typeof window !== "undefined" && (window as any).webln) {
        try {
          const webln = (window as any).webln;
          await webln.enable();
          await webln.sendPayment(generatedPr);
          setStatus("success");
          setStatusMessage(`⚡ Zap Completed! ${sats.toLocaleString()} Sats sent to ${name}.`);
          setComment("");
          return;
        } catch {
          setIsQrOpen(true);
          setStatus("success");
          setStatusMessage(`⚡ Payment ready! Scan QR code to complete.`);
        }
      } else {
        setIsQrOpen(true);
        setStatus("success");
        setStatusMessage(`⚡ Payment ready! Scan QR code with any Lightning wallet.`);
      }

    } catch (err: any) {
      console.error("Zap error:", err);
      setStatus("error");
      setStatusMessage(err.message || "Failed to initiate Lightning Zap.");
      setIsQrOpen(false);
      setInvoicePr("");
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // 2. CASHU: 1-Click in-app minting
  // ----------------------------------------------------
  const handleInAppMintAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sats <= 0) return;

    setIsProcessing(true);
    setStatus("idle");
    setStatusMessage("Requesting Lightning invoice from Cashu Mint...");

    try {
      const activeMint = isCustomMintInput && isValidMintUrl(customMintUrl)
        ? customMintUrl.trim()
        : selectedMintUrl;

      // 1. Generate Lightning Invoice from selected Mint
      const { invoice, quoteId, mintUrl } = await createCashuMintQuote(sats, activeMint);
      
      setInvoicePr(invoice);

      // 2. Trigger WebLN or display QR for payment
      if (typeof window !== "undefined" && (window as any).webln) {
        try {
          const webln = (window as any).webln;
          await webln.enable();
          setStatusMessage("Awaiting WebLN payment confirmation...");
          await webln.sendPayment(invoice);
        } catch {
          setIsQrOpen(true);
        }
      } else {
        setIsQrOpen(true);
      }

      setStatusMessage("⏳ Awaiting Lightning invoice payment (Scan QR or approve in wallet)...");

      // 3. Poll Mint to claim minted tokens
      const mintedToken = await pollMintAndClaimToken(sats, quoteId, mintUrl);

      setIsQrOpen(false);
      setStatusMessage("🔒 Encrypting NutZap and broadcasting to Nostr...");

      // 4. Encrypt via NIP-44 and broadcast NutZap to relays
      await sendCashuNutZap({
        recipientPubkey,
        cashuToken: mintedToken,
        amountSats: sats,
        comment: comment.trim(),
        mintUrl,
      });

      setStatus("success");
      setStatusMessage(`🥜 Success! Minted & delivered ${sats.toLocaleString()} Sats eCash NutZap to ${name}!`);
      setComment("");
    } catch (err: any) {
      console.error("In-app minting error:", err);
      setStatus("error");
      setStatusMessage(err.message || "Failed to mint and send eCash.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // 3. CASHU: Paste existing token
  // ----------------------------------------------------
  const handleVerifyCashuToken = async () => {
    if (!cashuTokenInput.trim()) return;

    setIsProcessing(true);
    setStatus("idle");
    setStatusMessage("");

    try {
      const parsed = parseCashuToken(cashuTokenInput);
      const mintVerification = await verifyTokenWithMint(cashuTokenInput);

      if (!mintVerification.isValid) {
        throw new Error(mintVerification.reason || "Token is already spent or invalid.");
      }

      setVerifiedCashuAmount(parsed.totalAmountSats);
      setVerifiedMintUrl(parsed.mint);
      setStatus("success");
      setStatusMessage(` Verified Token: ${parsed.totalAmountSats.toLocaleString()} Sats on ${new URL(parsed.mint).hostname}`);
    } catch (err: any) {
      setVerifiedCashuAmount(null);
      setVerifiedMintUrl("");
      setStatus("error");
      setStatusMessage(err.message || "Invalid Cashu Token format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendPastedCashuNutZap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashuTokenInput.trim()) return;

    if (!verifiedCashuAmount) {
      await handleVerifyCashuToken();
      return;
    }

    setIsProcessing(true);
    setStatus("idle");
    setStatusMessage("");

    try {
      await sendCashuNutZap({
        recipientPubkey,
        cashuToken: cashuTokenInput.trim(),
        amountSats: verifiedCashuAmount,
        comment: comment.trim(),
        mintUrl: verifiedMintUrl || selectedMintUrl,
      });

      setStatus("success");
      setStatusMessage(`🥜 NutZap Sent! Delivered ${verifiedCashuAmount.toLocaleString()} Sats in eCash to ${name}.`);
      setCashuTokenInput("");
      setVerifiedCashuAmount(null);
      setComment("");
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(err.message || "Failed to broadcast Cashu NutZap.");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeMintName = RECOMMENDED_MINTS.find(m => m.url === selectedMintUrl)?.name || "Custom Mint";
  const displayTarget = activeTab === "lightning"
    ? (lud16 ? (lud16.startsWith("@") ? `${name.toLowerCase()}${lud16}` : lud16) : `${cleanHandle}@getalby.com (Guess)`)
    : `Nostr Identity (${recipientPubkey.slice(0, 10)}...)`;

  return (
    <>
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-black">Support {name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Value-4-Value Instant Settlement</p>
          </div>

          {/* Main Tab Selector */}
          <div className="bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab("lightning"); setStatus("idle"); setStatusMessage(""); }}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "lightning"
                  ? "bg-amber-500 text-slate-950 shadow-md scale-102"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Lightning (NIP-57)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("cashu"); setStatus("idle"); setStatusMessage(""); }}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "cashu"
                  ? "bg-emerald-500 text-slate-950 shadow-md scale-102"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Cashu eCash (NIP-61)</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: LIGHTNING NETWORK */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "lightning" && (
          <form onSubmit={handleLightningZap} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Select Amount (Satoshis)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setSats(amt)}
                    className={`py-3 rounded-2xl font-black text-xs transition-all border cursor-pointer ${
                      sats === amt
                        ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg scale-102"
                        : "bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    ⚡ {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Custom Amount (Sats)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-amber-400 font-bold text-sm">⚡</span>
                  <input
                    type="number"
                    min="1"
                    value={sats}
                    onChange={(e) => setSats(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Zap Note / Message (Kind 9734)
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Keep building on Nostr! 🚀"
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                />
              </div>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-2.5 border ${
                status === "success" 
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/60 border-rose-800 text-rose-300"
              }`}>
                <div className="flex items-center gap-2">
                  {status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{statusMessage}</span>
                </div>

                {invoicePr && (
                  <button
                    type="button"
                    onClick={() => setIsQrOpen(true)}
                    className="underline font-bold text-amber-400 hover:text-amber-300 text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Show QR
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-base disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Broadcasting NIP-57 Zap...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-slate-950" />
                  <span>Zap {sats.toLocaleString()} Sats with Lightning</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CASHU eCASH (NUTZAP) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "cashu" && (
          <div className="space-y-6">
            
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={() => { setCashuMode("mint"); setStatus("idle"); setStatusMessage(""); }}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cashuMode === "mint"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>1-Click Mint & Send</span>
              </button>

              <button
                type="button"
                onClick={() => { setCashuMode("paste"); setStatus("idle"); setStatusMessage(""); }}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cashuMode === "paste"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste Token</span>
              </button>
            </div>

            {/* 🔥 DYNAMIC CASHU MINT SELECTOR 🔥 */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/90 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Cashu Mint:</span>
                  <span className="text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-900/50">
                    {activeMintName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMintSettingsOpen(!isMintSettingsOpen)}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{isMintSettingsOpen ? "Close" : "Change"}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMintSettingsOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Mint Dropdown / Custom Config */}
              {isMintSettingsOpen && (
                <div className="mt-2 pt-2 border-t border-slate-800 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Choose from Recommended Mints:
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RECOMMENDED_MINTS.map((mint) => (
                      <button
                        type="button"
                        key={mint.url}
                        onClick={() => {
                          setIsCustomMintInput(false);
                          handleMintChange(mint.url);
                          setIsMintSettingsOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          selectedMintUrl === mint.url && !isCustomMintInput
                            ? "bg-emerald-950/60 border-emerald-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <div className="font-bold text-slate-200 flex items-center justify-between">
                          <span>{mint.name}</span>
                          {mint.recommended && (
                            <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{mint.url}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Mint Input */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Or use a Custom Mint URL:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customMintUrl}
                        onChange={(e) => setCustomMintUrl(e.target.value)}
                        placeholder="https://my-private-mint.com"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (isValidMintUrl(customMintUrl)) {
                            setIsCustomMintInput(true);
                            handleMintChange(customMintUrl.trim());
                            setIsMintSettingsOpen(false);
                          }
                        }}
                        disabled={!isValidMintUrl(customMintUrl)}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Banner */}
            <div className="bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-emerald-400">Untraceable Chaumian eCash:</span> Encrypted end-to-end with NIP-44. Token is delivered privately via Nostr, even if the creator&apos;s Lightning node is offline.
              </div>
            </div>

            {/* SUBMODE 1: IN-APP MINT */}
            {cashuMode === "mint" && (
              <form onSubmit={handleInAppMintAndSend} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    Select Sats to Mint & Tip
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setSats(amt)}
                        className={`py-3 rounded-2xl font-black text-xs transition-all border cursor-pointer ${
                          sats === amt
                            ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg scale-102"
                            : "bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                        }`}
                      >
                        🥜 {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Custom Amount (Sats)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-emerald-400 font-bold text-sm">🥜</span>
                      <input
                        type="number"
                        min="1"
                        value={sats}
                        onChange={(e) => setSats(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white font-bold focus:outline-none focus:border-emerald-400 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Encrypted Memo (NIP-44)
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Private eCash tip! 🥜"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors text-sm"
                    />
                  </div>
                </div>

                {statusMessage && (
                  <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-2.5 border ${
                    status === "success" 
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                      : "bg-rose-950/60 border-rose-800 text-rose-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      {status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{statusMessage}</span>
                    </div>

                    {invoicePr && isQrOpen && (
                      <button
                        type="button"
                        onClick={() => setIsQrOpen(true)}
                        className="underline font-bold text-emerald-400 hover:text-emerald-300 text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Pay Invoice
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-base disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing eCash Mint & NutZap...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 fill-slate-950" />
                      <span>Mint & Send {sats.toLocaleString()} Sats NutZap</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* SUBMODE 2: PASTE EXISTING TOKEN */}
            {cashuMode === "paste" && (
              <form onSubmit={handleSendPastedCashuNutZap} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Paste Cashu Token (cashuA... or cashuB...)
                    </label>
                    {verifiedCashuAmount && (
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {verifiedCashuAmount.toLocaleString()} Sats Verified
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={cashuTokenInput}
                    onChange={(e) => {
                      setCashuTokenInput(e.target.value);
                      setVerifiedCashuAmount(null);
                    }}
                    placeholder="cashuAeyJ0b2tlbiI6W3sibWludCI6Imh0dHBzOi8vbWludC5taW5pYml0cy5jYXNoL0JpdGNvaW4iLCJwcm9vZnMiOlt7ImFtb3VudCI6MTAwLCJpZCI6... "
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors text-xs font-mono break-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Optional Encrypted Memo (NIP-44)
                  </label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Private eCash tip! 🥜"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors text-sm"
                  />
                </div>

                {statusMessage && (
                  <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-2.5 border ${
                    status === "success" 
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                      : "bg-rose-950/60 border-rose-800 text-rose-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      {status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{statusMessage}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {!verifiedCashuAmount ? (
                    <button
                      type="button"
                      onClick={handleVerifyCashuToken}
                      disabled={isProcessing || !cashuTokenInput.trim()}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>Verify eCash Token</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-base disabled:opacity-50 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Broadcasting NutZap to Nostr...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-5 h-5 fill-slate-950" />
                          <span>Send {verifiedCashuAmount.toLocaleString()} Sats (NutZap)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            )}

          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            {activeTab === "lightning" ? (
              <>
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>NIP-57 Verified • Lightning Network Enabled</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>NIP-61 Encrypted • Chaumian eCash Offline Token</span>
              </>
            )}
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Target: {displayTarget}
          </span>
        </div>
      </div>

      {/* POPUP MODAL QR CODE */}
      <ZapQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        invoicePr={invoicePr}
        amountSats={sats}
        recipientName={activeTab === "lightning" ? name : activeMintName}
        zapEvent={zapEventPayload}
      />
    </>
  );
}