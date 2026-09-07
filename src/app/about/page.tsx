import Link from "next/link";
import { 
  ShieldCheck, 
  Database, 
  Award, 
  ArrowLeft, 
  CheckCircle2, 
  UserCircle,
  Zap,
  Radio,
  Key,
  Globe
} from "lucide-react";

export const metadata = {
  title: "About Us - NostrPulse Protocol Analytics & Lightning Intelligence",
  description: "Learn about NostrPulse, our mission to advance decentralized social graph analytics, NIP-05 creator verification, and Bitcoin Lightning Value-4-Value integration.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-purple-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Hero Header */}
        <div className="mb-12 border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full text-xs font-bold text-purple-800 mb-4">
            <ShieldCheck className="w-4 h-4 text-purple-600" /> Transparency & Open Source First
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase mb-4">
            About Nostr<span className="text-purple-600">Pulse</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            NostrPulse is an analytics dashboard dedicated to tracking the decentralized social graph, NIP-05 verified creators, public WebSocket relays, and Bitcoin Lightning Value-4-Value microtransactions.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Award className="w-6 h-6 text-purple-600" /> Our Mission
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Traditional social media platforms trap user data inside closed corporate gardens, sell attention to advertisers, and arbitrarily censor content. The Nostr protocol shifts this paradigm by enabling cryptographic ownership of identities, social graphs, and instant monetization.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Our mission is to empower builders, creators, and enthusiasts with transparent network telemetry, real-time creator rankings, Lightning Zap visibility, and reliable public relay discovery across the entire censorship-resistant ecosystem.
          </p>
        </div>

        {/* Data Methodology */}
        <div className="space-y-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-600" /> Protocol Methodology & Core Standards
            </h2>
            <p className="text-slate-600 text-sm">
              We aggregate and index real-time telemetry from public WebSocket relays compliant with Nostr Implementation Possibilities (NIPs):
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600" /> Nostr Protocol (NIP-01)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Raw event indexing & WebSocket stream aggregation across global public relay nodes for real-time social telemetry.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Lightning Zaps (NIP-57)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Value-4-Value tipping analytics via LNURL/lud16, tracking micro-payments and rewards delivered over the Bitcoin Lightning Network.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-600" /> NIP-05 Identifiers
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                DNS-based internet identifier mapping and verification ensuring cryptographic authenticity of creator public keys.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" /> Public Relays
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Decentralized network telemetry, health checks, and latency profiling across geographically distributed WebSocket nodes.
              </p>
            </div>

          </div>
        </div>

        {/* AUTHOR & FOUNDER SECTION (EEAT BOOST) */}
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-lg mb-12 border border-slate-800">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <UserCircle className="w-6 h-6 text-purple-400" /> Meet the Founder
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center text-3xl font-black shrink-0 border-4 border-slate-800 text-white">
              NP
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-1">Nguyễn Hạc Phong</h3>
              <p className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-wider">Founder & Data Engineer</p>
              <p className="text-slate-300 leading-relaxed text-sm mb-5">
                NostrPulse was built to provide transparent, real-time analytics for the growing decentralized social media ecosystem and Bitcoin Lightning economy. As a software and data engineer passionate about permissionless protocols and open-source infrastructure, I developed NostrPulse to empower creators with verifiable social metrics, relay monitoring, and seamless Value-4-Value Lightning tipping.
              </p>
              
              {/* EEAT social links */}
              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                <a 
                  href="https://github.com/KoVN-s" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-purple-400 transition-colors"
                >
                  GitHub
                </a>
                <span className="text-slate-700">•</span>
                <a 
                  href="https://www.linkedin.com/in/nguy%E1%BB%85n-phong-a673681b5/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-purple-400 transition-colors"
                >
                  LinkedIn
                </a>
                <span className="text-slate-700">•</span>
                <a 
                  href="https://www.facebook.com/phong.nguyen.916206/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-purple-400 transition-colors"
                >
                  Facebook
                </a>
                <span className="text-slate-700">•</span>
                <a 
                  href="https://gravatar.com/quicklyimpossible45dfc1b37d" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-purple-400 transition-colors"
                >
                  Gravatar
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* PROTOCOL DISCLAIMER */}
        <div className="bg-slate-100 border border-slate-200 p-6 rounded-2xl text-xs text-slate-600 leading-relaxed">
          <strong>Protocol Disclaimer:</strong> NostrPulse is an independent open analytics explorer. We do not provide financial advice, operate custodial wallet services, or store user private keys. All Nostr events, public keys, and Lightning microtransactions are broadcasted directly via peer-to-peer WebSocket relays and the decentralized Bitcoin Lightning Network.
        </div>

      </div>
    </div>
  );
}