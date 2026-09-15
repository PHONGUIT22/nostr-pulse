"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Code, Globe, Sparkles, ExternalLink } from "lucide-react";

interface EmbedBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  npub: string;
  name: string;
}

export default function EmbedBadgeModal({
  isOpen,
  onClose,
  npub,
  name,
}: EmbedBadgeModalProps) {
  const [activeTab, setActiveTab] = useState<"markdown" | "html" | "nutzap" | "url">("nutzap");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://nostrpulse.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      if (!document.getElementById("nostrpulse-widget-script")) {
        const script = document.createElement("script");
        script.id = "nostrpulse-widget-script";
        script.src = `${window.location.origin}/widget.js`;
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, []);

  if (!isOpen) return null;

  const badgeUrl = `${origin}/api/badge/${npub}`;
  const profileUrl = `${origin}/p/${npub}`;
  const widgetUrl = `${origin}/widget.js`;

  const markdownCode = `[![Nostr Trust Score](${badgeUrl})](${profileUrl})`;
  const htmlCode = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer">\n  <img src="${badgeUrl}" alt="${name}'s Nostr Trust Score" />\n</a>`;
  const nutzapCode = `<script src="${widgetUrl}" data-npub="${npub}" data-name="${name}" async></script>`;
  const rawUrl = badgeUrl;

  const currentCode =
    activeTab === "markdown"
      ? markdownCode
      : activeTab === "html"
      ? htmlCode
      : activeTab === "nutzap"
      ? nutzapCode
      : rawUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestNutZap = () => {
    if (typeof window !== "undefined" && (window as any).NutZap) {
      (window as any).NutZap.open({
        npub,
        name,
        amount: 100,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <Code className="w-4 h-4" /> Embeddable Widgets & API
          </div>
          <h3 className="text-xl font-black">Embed {name}&apos;s Badges & Widget</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Showcase your Trust Score on GitHub, or embed a 1-click &quot;NutZap Me&quot; eCash button on static blogs (Hugo, Ghost, WordPress).
          </p>
        </div>

        {/* Format Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab("nutzap")}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "nutzap"
                ? "bg-amber-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🥜 NutZap
          </button>
          <button
            onClick={() => setActiveTab("markdown")}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "markdown"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setActiveTab("html")}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "html"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            HTML
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "url"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Badge URL
          </button>
        </div>

        {/* Live Preview */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {activeTab === "nutzap" ? "Interactive Widget Preview" : "Live Badge Preview (SVG)"}
          </span>
          <div className="flex justify-center items-center py-2">
            {activeTab === "nutzap" ? (
              <button
                type="button"
                onClick={handleTestNutZap}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg shadow-purple-600/30 transition-all hover:scale-105 cursor-pointer"
              >
                <span>🥜</span>
                <span>NutZap Me</span>
              </button>
            ) : (
              <img src={badgeUrl} alt="Badge Preview" className="h-7 shadow-md" />
            )}
          </div>
          {activeTab === "nutzap" && (
            <p className="text-[11px] text-slate-400">
              No wallet extensions needed! Readers scan a Lightning QR to mint eCash proofs and send them directly to your npub.
            </p>
          )}
        </div>

        {/* Code Snippet Box */}
        <div className="relative">
          <textarea
            readOnly
            rows={activeTab === "html" ? 3 : 2}
            value={currentCode}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-slate-300 font-mono text-xs focus:outline-none select-all break-all"
          />
        </div>

        {/* Actions */}
        <button
          onClick={handleCopy}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 text-sm cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Copied Snippet to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Embed Code</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}