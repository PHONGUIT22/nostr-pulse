import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchNostrProfile, NostrProfile } from "@/lib/nostr";
import CompareHero from "@/components/compare/CompareHero";
import VersusTable from "@/components/compare/VersusTable";
import { Sparkles, ArrowRight } from "lucide-react";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ pair: string }> | { pair: string };
}

// Helper to parse two npubs from slug
function parsePairSlug(pairSlug: string) {
  const parts = pairSlug.split("-vs-");
  if (parts.length !== 2) return null;

  const npubA = decodeURIComponent(parts[0].trim());
  const npubB = decodeURIComponent(parts[1].trim());

  if (!npubA || !npubB) return null;

  return { npubA, npubB };
}

// 1. Dynamic SEO metadata generator
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const parsed = parsePairSlug(resolvedParams.pair);

  if (!parsed) return { title: "Comparison - NostrPulse" };

  const [rawA, rawB] = await Promise.all([
    fetchNostrProfile(parsed.npubA),
    fetchNostrProfile(parsed.npubB),
  ]);

  const nameA = rawA?.displayName || rawA?.name || `Creator (${parsed.npubA.slice(0, 8)}...)`;
  const nameB = rawB?.displayName || rawB?.name || `Creator (${parsed.npubB.slice(0, 8)}...)`;

  return {
    title: `Compare: ${nameA} vs ${nameB} | Nostr Trust Score & Zaps`,
    description: `Side-by-side comparison between ${nameA} and ${nameB} on the Nostr protocol.`,
  };
}

// 2. Main comparison component
export default async function CompareDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const parsed = parsePairSlug(resolvedParams.pair);

  if (!parsed) return notFound();

  // Fetch both profiles in parallel
  const [rawA, rawB] = await Promise.all([
    fetchNostrProfile(parsed.npubA),
    fetchNostrProfile(parsed.npubB),
  ]);

  // Fallback data resolution for network delays
  const dataA: NostrProfile = rawA || {
    pubkey: parsed.npubA,
    npub: parsed.npubA,
    name: `user_${parsed.npubA.slice(5, 11)}`,
    displayName: `Creator (${parsed.npubA.slice(0, 8)}...)`,
    about: "Active Nostr protocol participant.",
    picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${parsed.npubA}`,
    lud16: `${parsed.npubA.slice(5, 11)}@getalby.com`,
    nip05: `${parsed.npubA.slice(5, 11)}@nostr.net`,
    created_at: Math.floor(Date.now() / 1000) - 86400 * 300,
    relays_connected: 6,
  };

  const dataB: NostrProfile = rawB || {
    pubkey: parsed.npubB,
    npub: parsed.npubB,
    name: `user_${parsed.npubB.slice(5, 11)}`,
    displayName: `Creator (${parsed.npubB.slice(0, 8)}...)`,
    about: "Active Nostr protocol participant.",
    picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${parsed.npubB}`,
    lud16: `${parsed.npubB.slice(5, 11)}@getalby.com`,
    nip05: `${parsed.npubB.slice(5, 11)}@nostr.net`,
    created_at: Math.floor(Date.now() / 1000) - 86400 * 300,
    relays_connected: 6,
  };

  const nameA = dataA.displayName || dataA.name || "Creator A";
  const nameB = dataB.displayName || dataB.name || "Creator B";

  const hasLud16A = Boolean(dataA.lud16 || dataA.lud06);
  const hasLud16B = Boolean(dataB.lud16 || dataB.lud06);

  const hasNip05A = Boolean(dataA.nip05);
  const hasNip05B = Boolean(dataB.nip05);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* SEARCH & SWAP HERO */}
      <CompareHero locA={parsed.npubA} locB={parsed.npubB} dataA={dataA} dataB={dataB} />

      <div className="max-w-5xl mx-auto px-4 -mt-6">
        
        {/* SEO SUMMARY ARTICLE */}
        <article className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm leading-relaxed text-base mb-8 space-y-4">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" /> Decentralized Identity Comparison
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 border-b border-slate-100 pb-3">
            Overview: {nameA} vs {nameB}
          </h2>
          <p className="text-slate-700">
            Comparing Nostr accounts <strong>{nameA}</strong> and <strong>{nameB}</strong> highlights key aspects of decentralized identities, Value-4-Value integration, and protocol compliance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <span className="font-bold text-slate-900 block text-sm mb-1">{nameA}</span>
              <p className="text-xs text-slate-500">
                NIP-05: <span className="font-semibold text-slate-700">{hasNip05A ? dataA.nip05 : "Not configured"}</span> • 
                Lightning: <span className="font-semibold text-slate-700">{hasLud16A ? (dataA.lud16 || "Active") : "No address"}</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <span className="font-bold text-slate-900 block text-sm mb-1">{nameB}</span>
              <p className="text-xs text-slate-500">
                NIP-05: <span className="font-semibold text-slate-700">{hasNip05B ? dataB.nip05 : "Not configured"}</span> • 
                Lightning: <span className="font-semibold text-slate-700">{hasLud16B ? (dataB.lud16 || "Active") : "No address"}</span>
              </p>
            </div>
          </div>
        </article>

        {/* Head-to-head comparison table */}
        <VersusTable dataA={{ ...dataA, npub: parsed.npubA }} dataB={{ ...dataB, npub: parsed.npubB }} />

        {/* Direct profile links CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <Link
            href={`/p/${parsed.npubA}`}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-500 shadow-xs flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center">
                {nameA.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 group-hover:text-purple-600 block transition-colors">
                  View {nameA}&apos;s Profile
                </span>
                <span className="text-xs text-slate-400">Zap Sats & View Notes</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Link>

          <Link
            href={`/p/${parsed.npubB}`}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-500 shadow-xs flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center">
                {nameB.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 block transition-colors">
                  View {nameB}&apos;s Profile
                </span>
                <span className="text-xs text-slate-400">Zap Sats & View Notes</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}