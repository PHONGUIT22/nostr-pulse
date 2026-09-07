import HeroSearchSection from "@/components/home/HeroSearchSection";
import TopRankingGrid from "@/components/home/TopRankingGrid";
import RelayDirectory  from "@/components/home/RelayDirectory";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Search */}
      <HeroSearchSection />

      {/* 2. Top Zapped Creators Leaderboard */}
      <TopRankingGrid />

      {/* 3. Decentralized Relay Explorer */}
      <RelayDirectory />
    </main>
  );
}