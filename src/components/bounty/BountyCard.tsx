// src/components/bounty/BountyCard.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Clock, ShieldCheck, ExternalLink, User, Check, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import UserAvatar from "@/components/ui/UserAvatar";
import TrustScoreBadge from "@/components/detail/TrustScoreBadge";
import TaskResultView from "@/components/bounty/TaskResultView";
import { OpenBountyTask } from "@/lib/nip90";
import { fetchNostrProfile, calculateTrustScore, TrustScoreResult, NostrProfile } from "@/lib/trust-score";
import { nip19 } from "nostr-tools";

interface BountyCardProps {
  task: OpenBountyTask;
  cachedProfile?: NostrProfile | null;
  cachedTrustScore?: TrustScoreResult | null;
}

export default function BountyCard({ task, cachedProfile, cachedTrustScore }: BountyCardProps) {
  const [profile, setProfile] = useState<NostrProfile | null>(cachedProfile || null);
  const [trustScore, setTrustScore] = useState<TrustScoreResult | null>(cachedTrustScore || null);
  const [isLoadingScore, setIsLoadingScore] = useState(!cachedTrustScore);
  const [copiedId, setCopiedId] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Encode pubkey to npub for display and routing
  let npub = "";
  try {
    npub = nip19.npubEncode(task.pubkey);
  } catch {
    npub = task.pubkey;
  }

  // Load creator profile and trust score if not already provided
  useEffect(() => {
    if (cachedTrustScore) {
      setTrustScore(cachedTrustScore);
      setIsLoadingScore(false);
      return;
    }

    let isMounted = true;
    setIsLoadingScore(true);

    fetchNostrProfile(task.pubkey)
      .then((prof) => {
        if (!isMounted) return;
        setProfile(prof);
        const score = calculateTrustScore(prof);
        setTrustScore(score);
        setIsLoadingScore(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setTrustScore(calculateTrustScore(null));
        setIsLoadingScore(false);
      });

    return () => {
      isMounted = false;
    };
  }, [task.pubkey, cachedTrustScore]);

  // Relative timestamp formatting
  const timeAgo = (timestamp: number) => {
    const elapsed = Math.floor(Date.now() / 1000) - timestamp;
    if (elapsed < 60) return `${elapsed}s ago`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
    return `${Math.floor(elapsed / 86400)}d ago`;
  };

  const handleCopyJobId = () => {
    navigator.clipboard.writeText(task.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const displayName = profile?.displayName || profile?.name || `${npub.slice(0, 10)}...${npub.slice(-4)}`;

  return (
    <Card className="border border-slate-200/80 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
      <div>
        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Creator Information */}
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar
                src={profile?.picture}
                name={displayName}
                npub={npub}
                size="md"
              />
              <div className="min-w-0">
                <Link
                  href={`/p/${npub}`}
                  className="font-bold text-slate-900 hover:text-purple-600 transition-colors truncate block text-sm flex items-center gap-1.5"
                >
                  <span className="truncate">{displayName}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>{npub.slice(0, 8)}...</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-sans text-[11px]">
                    <Clock className="w-3 h-3" />
                    {timeAgo(task.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sats Reward Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-black text-xs shrink-0 shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{task.bidSats > 0 ? `${task.bidSats.toLocaleString()} Sats` : "Free Bounty"}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {/* Category Tag */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              #{task.category}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-mono text-slate-500">
              Kind 5000
            </Badge>
          </div>

          {/* Task Prompt / Description */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 text-xs sm:text-sm leading-relaxed font-medium">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Task Prompt / Input
            </span>
            <p className="break-words line-clamp-3 select-text">
              {task.prompt || "No prompt description provided."}
            </p>
          </div>

          {/* Embedded Trust Score Badge of Task Creator */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Creator Reputation & Sybil Risk
              </span>
              {trustScore && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${trustScore.tierBg} ${trustScore.tierColor}`}>
                  {trustScore.tier}
                </span>
              )}
            </div>

            {isLoadingScore ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-xs animate-pulse">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Computing Nostr Web-of-Trust score...</span>
              </div>
            ) : trustScore ? (
              <div className="transform scale-90 origin-top -mb-4">
                <TrustScoreBadge score={trustScore.score} tier={trustScore.tier} />
              </div>
            ) : null}
          </div>
        </CardContent>
      </div>

      <CardFooter className="p-5 pt-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyJobId}
          className="text-xs text-slate-600 hover:text-slate-900 border-slate-200"
        >
          {copiedId ? (
            <>
              <Check className="w-3 h-3 text-emerald-600 mr-1" />
              Copied ID
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Job ID
            </>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Link href={`/p/${npub}`}>
            <Button variant="ghost" size="sm" className="text-xs text-purple-700 hover:bg-purple-50">
              <User className="w-3 h-3 mr-1" />
              Inspect
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => setIsResultModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Review &amp; Pay</span>
          </Button>
        </div>
      </CardFooter>

      {/* Task Delivery & 1-Tap Cashu Settlement Modal */}
      {isResultModalOpen && (
        <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
          <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <TaskResultView
              jobId={task.id}
              demandedAmountSats={task.bidSats > 0 ? task.bidSats : 5}
              taskPrompt={task.prompt}
              workerPubkey=""
              onClose={() => setIsResultModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
