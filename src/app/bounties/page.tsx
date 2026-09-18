// src/app/bounties/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Zap, 
  Plus, 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  Filter, 
  Coins, 
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import BountyCard from "@/components/bounty/BountyCard";
import CreateBountyModal from "@/components/bounty/CreateBountyModal";
import { fetchOpenBounties, OpenBountyTask } from "@/lib/nip90";
import { fetchNostrProfile, calculateTrustScore, TrustScoreResult, NostrProfile } from "@/lib/trust-score";

type TrustFilterMode = "all" | "anti-spam" | "active" | "verified";

export default function BountiesPage() {
  const [tasks, setTasks] = useState<OpenBountyTask[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, NostrProfile | null>>({});
  const [creatorScores, setCreatorScores] = useState<Record<string, TrustScoreResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trustFilter, setTrustFilter] = useState<TrustFilterMode>("all");
  const [minBid, setMinBid] = useState<number>(0);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Load open bounties from API endpoint or Nostr relays
  const loadBounties = async () => {
    try {
      let openTasks: OpenBountyTask[] = [];
      try {
        const res = await fetch("/api/bounties");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tasks) && data.tasks.length > 0) {
            openTasks = data.tasks;
          }
        }
      } catch {
        // Fallback to direct client-side Nostr relay pool
      }

      if (openTasks.length === 0) {
        openTasks = await fetchOpenBounties();
      }
      setTasks(openTasks);

      // Extract unique creator pubkeys to resolve profiles and Trust Scores
      const uniquePubkeys = Array.from(new Set(openTasks.map((t) => t.pubkey)));

      uniquePubkeys.forEach(async (pubkey) => {
        try {
          const profile = await fetchNostrProfile(pubkey);
          setCreatorProfiles((prev) => ({ ...prev, [pubkey]: profile }));

          const scoreResult = calculateTrustScore(profile);
          setCreatorScores((prev) => ({ ...prev, [pubkey]: scoreResult }));
        } catch {
          const defaultScore = calculateTrustScore(null);
          setCreatorScores((prev) => ({ ...prev, [pubkey]: defaultScore }));
        }
      });
    } catch (err) {
      console.error("Error loading open bounties:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBounties();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBounties();
  };

  // Prepend newly created bounty to list
  const handleBountyCreated = (newTask: OpenBountyTask) => {
    setTasks((prev) => [newTask, ...prev]);
    setRecentlyAddedId(newTask.id);

    // Compute score for current creator if not already present
    if (!creatorScores[newTask.pubkey]) {
      fetchNostrProfile(newTask.pubkey).then((prof) => {
        setCreatorProfiles((prev) => ({ ...prev, [newTask.pubkey]: prof }));
        setCreatorScores((prev) => ({ ...prev, [newTask.pubkey]: calculateTrustScore(prof) }));
      });
    }

    setTimeout(() => {
      setRecentlyAddedId(null);
    }, 5000);
  };

  // Filter tasks based on Search query, Trust Score, and Min Sats Bid
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPrompt = task.prompt?.toLowerCase().includes(q);
        const matchesCategory = task.category?.toLowerCase().includes(q);
        const matchesPubkey = task.pubkey.toLowerCase().includes(q);
        if (!matchesPrompt && !matchesCategory && !matchesPubkey) {
          return false;
        }
      }

      // 2. Minimum Bid Filter
      if (minBid > 0 && task.bidSats < minBid) {
        return false;
      }

      // 3. Trust Score Anti-Spam Filter
      const scoreObj = creatorScores[task.pubkey];
      const score = scoreObj ? scoreObj.score : 5; // Default unverified score

      if (trustFilter === "verified") {
        return score >= 80;
      }
      if (trustFilter === "active") {
        return score >= 50;
      }
      if (trustFilter === "anti-spam") {
        return score >= 20;
      }

      return true;
    });
  }, [tasks, searchQuery, trustFilter, minBid, creatorScores]);

  // Aggregate statistics
  const totalSatsPool = tasks.reduce((acc, t) => acc + (t.bidSats || 0), 0);
  const verifiedTasksCount = tasks.filter((t) => (creatorScores[t.pubkey]?.score ?? 0) >= 50).length;

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NIP-90 Open Work & AI DVM Marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Bounty <span className="text-purple-600">Board</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Discover open computational bounties, trust score verifications, and decentralized tasks. Filter out Sybil spam using Nostr Web-of-Trust reputation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 px-4 rounded-xl text-slate-700 hover:text-purple-600 border-slate-200 font-bold"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
              Refresh
            </Button>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Post Bounty</span>
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Open Bounties</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{tasks.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Sats Pool</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-2xl font-black text-amber-600">{totalSatsPool.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Verified Creators</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{verifiedTasksCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Spam Filter</span>
            <span className="text-2xl font-black text-purple-600 mt-1 block">Active (WoT)</span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by task prompt, category, or pubkey..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-xs sm:text-sm"
              />
            </div>

            {/* Minimum Sats Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                Min Sats:
              </span>
              {[0, 10, 21, 50, 100].map((sats) => (
                <button
                  key={sats}
                  onClick={() => setMinBid(sats)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    minBid === sats
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {sats === 0 ? "All" : `${sats}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Score Anti-Spam Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Reputation Filter:
            </span>

            <button
              onClick={() => setTrustFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trustFilter === "all"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              All Tasks ({tasks.length})
            </button>

            <button
              onClick={() => setTrustFilter("anti-spam")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                trustFilter === "anti-spam"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <span>Anti-Spam Filter (Score ≥ 20)</span>
            </button>

            <button
              onClick={() => setTrustFilter("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                trustFilter === "active"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <span>Active Contributors (≥ 50)</span>
            </button>

            <button
              onClick={() => setTrustFilter("verified")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                trustFilter === "verified"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              <span>Verified Builders (≥ 80)</span>
            </button>
          </div>
        </div>

        {/* Recently Added Banner */}
        {recentlyAddedId && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Your new bounty has been broadcasted to the Nostr network!</span>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              Live on Relay Pool
            </Badge>
          </div>
        )}

        {/* Bounties Grid List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-white border border-slate-200/80 p-6 animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="h-24 bg-slate-900/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <BountyCard
                key={task.id}
                task={task}
                cachedProfile={creatorProfiles[task.pubkey]}
                cachedTrustScore={creatorScores[task.pubkey]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white border border-slate-200/80 rounded-3xl p-8 space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Bounties Matched Your Filter</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Try adjusting your Trust Score reputation threshold or search criteria, or post the first task yourself!
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Post New Bounty
              </Button>
            </div>
          </div>
        )}

        {/* Modal for creating a new bounty */}
        <CreateBountyModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onBountyCreated={handleBountyCreated}
        />
      </div>
    </div>
  );
}
