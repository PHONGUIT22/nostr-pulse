import HeroSearchSection from "@/components/home/HeroSearchSection";
import TopRankingGrid from "@/components/home/TopRankingGrid";
import RelayDirectory from "@/components/home/RelayDirectory";
import MachineSpenderFAB from "@/components/ai/MachineSpenderFAB";

export default function Home() {
  return (
    <main className="min-h-screen bg-white relative">
      {/* 1. Hero Search */}
      <HeroSearchSection />

      {/* 2. Top Zapped Creators Leaderboard */}
      <TopRankingGrid />

      {/* 3. Decentralized Relay Explorer */}
      <RelayDirectory />

      {/* 4. AI Machine Money Floating Action Button (FAB) */}
      <MachineSpenderFAB />
    </main>
  );
}