// src/components/bounty/CreateBountyModal.tsx
"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Loader2, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { publishJobRequest, parseJobRequestEvent, OpenBountyTask } from "@/lib/nip90";

interface CreateBountyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBountyCreated?: (bounty: OpenBountyTask) => void;
}

export default function CreateBountyModal({
  open,
  onOpenChange,
  onBountyCreated,
}: CreateBountyModalProps) {
  const [prompt, setPrompt] = useState("");
  const [bidSats, setBidSats] = useState("21");
  const [category, setCategory] = useState("nostrpulse-task");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setErrorMsg("Please enter a task description or target pubkey.");
      return;
    }

    const parsedBid = parseInt(bidSats, 10);
    if (isNaN(parsedBid) || parsedBid < 0) {
      setErrorMsg("Please enter a valid amount of Sats for the bounty.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Publish Kind 5000 Job Request via NIP-90 module
      // If window.nostr is present (Alby / nos2x), publishJobRequest signs using it.
      const signedEvent = await publishJobRequest({
        prompt: prompt.trim(),
        bidSats: parsedBid,
        category: category.trim() || "nostrpulse-task",
      });

      setSuccessMsg("Task published to Nostr relays successfully!");

      // 2. Parse into OpenBountyTask and notify parent
      const newTask = parseJobRequestEvent(signedEvent);
      if (onBountyCreated) {
        onBountyCreated(newTask);
      }

      // 3. Reset and close modal after brief delay
      setTimeout(() => {
        setPrompt("");
        setBidSats("21");
        setSuccessMsg(null);
        setIsSubmitting(false);
        onOpenChange(false);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to publish bounty:", err);
      setErrorMsg(err?.message || "Failed to sign or publish task. Please check your Nostr extension.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>NIP-90 Job Request</span>
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">
            Post a New Bounty
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Publish an open task to the Nostr network. Workers or AI DVMs will compute results and claim your Sats reward.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Task Description / Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Task Prompt / Target *</span>
              <span className="text-[10px] text-slate-400 font-normal">npub, hex, or description</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Calculate trust score for npub1... or Review pull request #42"
              rows={3}
              required
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-none bg-slate-50 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Sats Reward (Bid) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Bounty Reward (Sats) *</span>
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={bidSats}
                onChange={(e) => setBidSats(e.target.value)}
                placeholder="21"
                required
                className="h-10 text-sm font-bold font-mono bg-slate-50 border-slate-200 focus:border-purple-600"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Category Tag
              </label>
              <Input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="nostrpulse-task"
                className="h-10 text-xs sm:text-sm bg-slate-50 border-slate-200 focus:border-purple-600 font-mono"
              />
            </div>
          </div>

          {/* Quick Sats Presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Quick presets:</span>
            {["5", "21", "50", "100", "500"].map((sats) => (
              <button
                type="button"
                key={sats}
                onClick={() => setBidSats(sats)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  bidSats === sats
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {sats}s
              </button>
            ))}
          </div>

          {/* Signer Notice */}
          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
            <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="leading-tight">
              Event Kind 5000 will be signed with your Nostr extension (<span className="font-bold">Alby</span> or <span className="font-bold">nos2x</span>). If no extension is active, a temporary test keypair is used.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing via Alby...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Publish Bounty ({bidSats} Sats)</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
