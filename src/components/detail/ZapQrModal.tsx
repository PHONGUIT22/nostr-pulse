"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  QrCode 
} from "lucide-react";

interface ZapQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoicePr: string;
  amountSats: number;
  recipientName: string;
  zapEvent?: any;
}

export default function ZapQrModal({
  isOpen,
  onClose,
  invoicePr,
  amountSats,
  recipientName,
  zapEvent,
}: ZapQrModalProps) {
  const [copied, setCopied] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);

  // Close modal on Escape key and lock background scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !invoicePr) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(invoicePr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWallet = () => {
    window.open(`lightning:${invoicePr}`, "_blank");
  };

  return (
    // Backdrop: top-level z-index with centered placement
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Modal card: flex-col with max-h guard */}
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header bar with dismiss button */}
        <div className="shrink-0 px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                Lightning Zap Invoice
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {amountSats.toLocaleString()} Sats to <span className="text-amber-400 font-semibold">{recipientName}</span>
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-full transition-all shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>

        {/* Scrollable body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* QR Code SVG container */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-400/20">
              <QRCodeSVG
                value={`lightning:${invoicePr.toUpperCase()}`}
                size={165}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-slate-400 text-[10px] sm:text-[11px] mt-2 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              Scan with Alby, Phoenix, WoS, Zeus
            </p>
          </div>

          {/* Action utility buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Invoice"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWallet}
              className="py-2 px-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Wallet</span>
            </button>
          </div>

          {/* Truncated invoice payload (lnbc...) container */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 break-all select-all max-h-24 overflow-y-auto">
            <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5 sticky top-0 bg-slate-950">
              Payment Request (pr):
            </span>
            {invoicePr}
          </div>

          {/* SOI NIP-57 PROTOCOL TELEMETRY */}
          {zapEvent && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
              <button
                type="button"
                onClick={() => setShowTelemetry(!showTelemetry)}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-1.5 text-purple-400 text-[10px] sm:text-[11px]">
                  <Terminal className="w-3.5 h-3.5" />
                  NIP-57 Telemetry (Kind 9734)
                </span>
                {showTelemetry ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTelemetry && (
                <div className="p-3 border-t border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto space-y-1.5 bg-slate-950 max-h-36">
                  <div className="flex items-center gap-1 text-slate-400 text-[9px]">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Signed Zap Request Payload:</span>
                  </div>
                  <pre className="text-[9px] leading-relaxed select-all">
                    {JSON.stringify(zapEvent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER MODAL */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-center shrink-0">
          <p className="text-[9px] sm:text-[10px] text-slate-500">
            Settles peer-to-peer on Lightning • Broadcasts Kind 9735 Receipt
          </p>
        </div>

      </div>
    </div>
  );
}