import { Metadata } from "next";
import Link from "next/link";
import { 
  fetchNostrProfile, 
  normalizeToHex, 
  NostrProfile, 
  fetchRecentNotes 
} from "@/lib/nostr";
import { verifyNip05 } from "@/lib/nip05";
import { calculateTrustScore } from "@/lib/trust-score";
import LightningZapCard from "@/components/detail/LightningZapCard";
import TrustScoreCard from "@/components/detail/TrustScoreCard";
import TrustScoreBadge from "@/components/detail/TrustScoreBadge";
import SuggestedCreators from "@/components/detail/SuggestedCreators";
import LiveZapFeed from "@/components/detail/LiveZapFeed";
import Breadcrumb from "@/components/detail/Breadcrumb";
import UserAvatar from "@/components/ui/UserAvatar";
import CreatorNotesFeed from "@/components/detail/CreatorNotesFeed";
import { 
  Zap, 
  ShieldCheck, 
  Globe, 
  ExternalLink, 
  Key, 
  CheckCircle2, 
  XCircle,
  Sparkles 
} from "lucide-react";

export const revalidate = 3600; // Cache 1 hour on CDN
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ npub: string }> | { npub: string };
}

// 1. Dynamic SEO metadata generator
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const rawNpub = decodeURIComponent(resolvedParams.npub);
  const profile = await fetchNostrProfile(rawNpub);
  
  const name = profile?.displayName || profile?.name || `Nostr User (${rawNpub.slice(0, 8)}...)`;
  const bio = profile?.about || `View ${name}'s Nostr profile, public keys, and inspect Nostr Trust Score.`;

  return {
    title: `${name} | Nostr Trust Score & Live Zaps`,
    description: bio.slice(0, 160),
    openGraph: {
      title: `${name} on NostrPulse`,
      description: bio.slice(0, 160),
      images: profile?.picture ? [{ url: profile.picture }] : [],
    },
  };
}

// 2. MAIN COMPONENT TRANG PROFILE CREATOR
export default async function CreatorProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawNpub = decodeURIComponent(resolvedParams.npub);
  const { hex: hexPubkey, npub: encodedNpub } = normalizeToHex(rawNpub);

  // Fetch profile and latest 4 notes (Kind 1) from relay pool in parallel
  const [rawProfile, recentNotes] = await Promise.all([
    fetchNostrProfile(rawNpub),
    fetchRecentNotes(rawNpub, 4),
  ]);

  // Auto-generate fallback profile for fresh keys
  const profile: NostrProfile = rawProfile || {
    pubkey: hexPubkey,
    npub: encodedNpub,
    name: `anon_${hexPubkey.slice(0, 6)}`,
    displayName: `Nostr User (${encodedNpub.slice(0, 8)}...)`,
    about: "Newly created Nostr identity. No bio or metadata published to relays yet.",
    picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedNpub}`,
    created_at: Math.floor(Date.now() / 1000),
    relays_connected: 0,
  };

  const displayName = profile.displayName || profile.name || "Anonymous Nostr User";
  const handle = profile.name ? `@${profile.name}` : "";
  const lud16 = profile.lud16 || profile.lud06 || "";
  const npubShort = `${encodedNpub.slice(0, 10)}...${encodedNpub.slice(-6)}`;

  // 1. Cryptographic NIP-05 DNS verification
  const nip05Result = await verifyNip05(profile.nip05, profile.pubkey);

  // 2. Calculate Trust Score from verified data
  const trustData = calculateTrustScore(profile, nip05Result);
  
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* Profile banner */}
      <div className="w-full h-48 sm:h-64 bg-slate-900 relative overflow-hidden">
        {profile.banner ? (
          <img
            src={profile.banner}
            alt={`${displayName} banner`}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-900 via-slate-900 to-amber-900 opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        
        {/* THANH BREADCRUMB */}
        <div className="mb-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-xs inline-block">
          <Breadcrumb name={displayName} npub={encodedNpub} />
        </div>

        {/* Profile header card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            
            {/* Left column: Avatar and Name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                <UserAvatar
                  src={profile.picture}
                  name={displayName}
                  npub={encodedNpub}
                  size="xl"
                />
                {nip05Result.isVerified && (
                  <div 
                    className="absolute bottom-1 right-1 bg-purple-600 text-white p-1 rounded-full border-2 border-white shadow-xs z-10"
                    title="DNS Cryptographically Verified"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {displayName}
                  </h1>
                  
                  {/* NIP-05 badge: verified vs unverified */}
                  {profile.nip05 && (
                    nip05Result.isVerified ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {profile.nip05}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        <XCircle className="w-3.5 h-3.5" />
                        Unverified NIP-05
                      </span>
                    )
                  )}
                </div>

                {handle && (
                  <p className="text-slate-500 font-medium text-sm mt-0.5">{handle}</p>
                )}
                
                <div className="flex items-center gap-2 mt-2 font-mono text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-fit">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>{npubShort}</span>
                </div>
              </div>
            </div>
            
            {/* Right column: Trust Score badge + Lightning address */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0">
              <TrustScoreBadge score={trustData.score} tier={trustData.tier} />
              
              {lud16 && (
                <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-3xl shrink-0 flex items-center gap-3 w-full sm:w-auto h-full">
                  <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xs">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                      Lightning Address (LNURL)
                    </span>
                    <span className="font-bold text-slate-900 text-xs font-mono block truncate max-w-[160px]">
                      {lud16}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ABOUT BIO */}
          {profile.about && (
            <div className="pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Creator</h3>
              <p className="text-slate-700 leading-relaxed text-sm sm:text-base whitespace-pre-line max-w-4xl">
                {profile.about}
              </p>
            </div>
          )}

          {/* WEBSITE LINK */}
          {profile.website && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs">
              <Globe className="w-4 h-4 text-slate-400" />
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-purple-600 font-bold hover:underline flex items-center gap-1"
              >
                {profile.website}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Main content (2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Trust Score assessment breakdown */}
            <TrustScoreCard trustData={trustData} name={displayName} npub={encodedNpub} />
            
            {/* 2. Lightning & Cashu eCash payment card */}
            <LightningZapCard
              npub={encodedNpub}
              lud16={lud16}
              name={displayName}
              pubkey={profile.pubkey}
            />

            {/* 3. Latest Nostr notes feed (Kind 1) */}
            <CreatorNotesFeed 
              notes={recentNotes} 
              creatorName={displayName} 
            />

            {/* 4. Live zaps feed */}
            <LiveZapFeed 
              pubkey={profile.pubkey} 
              name={displayName} 
            />
          </div>

          {/* Sidebar column */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4" /> Protocol Info
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-3">Nostr Public Identity</h4>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Bech32 Encoded (npub):</span>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-mono text-[11px] text-slate-600 break-all mt-1 select-all">
                    {encodedNpub}
                  </div>
                </div>

                {profile.pubkey && (
                  <div>
                    <span className="text-slate-400 block font-medium">Hex Pubkey:</span>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-mono text-[11px] text-slate-600 break-all mt-1 select-all">
                      {profile.pubkey}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <SuggestedCreators currentNpub={encodedNpub} />
          </div>

        </div>

      </div>
    </div>
  );
}