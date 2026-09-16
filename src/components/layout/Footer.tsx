import Link from "next/link";
import { ShieldCheck, Droplet } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: Brand info and overview */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white tracking-tight inline-block">
          <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-black">⚡</div>
          <span>
            Nostr<span className="text-purple-400">Pulse</span>
          </span>
        </Link>
        <p className="mt-4 text-xs leading-relaxed max-w-sm text-slate-400">
          NostrPulse is an analytics and discovery platform for the Nostr protocol, featuring real-time creator leaderboards, Lightning Zap tracking, and WebSocket relay telemetry.
        </p>

          {/* Column 2: Legal & Trust (AdSense & E-E-A-T) */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Legal & Trust</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us & Methodology</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Column 3: Internal links & resources */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Ecosystem</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/relays" className="hover:text-white transition-colors">Relay Explorer</Link></li>
              <li><Link href="/compare" className="hover:text-white transition-colors">Compare Nostr Profiles</Link></li>
              <li><Link href="/p/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6" className="hover:text-white transition-colors">fiatjaf Profile</Link></li>
              <li><Link href="/p/npub1sg6plzptd64u62a978hep2k2u72xqvvd5299cvfd0rrxn5z5avqss2ydmd" className="hover:text-white transition-colors">Jack Dorsey Profile</Link></li>
            </ul>
          </div>

        </div>

        {/* Protocol disclaimer & data sources */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 mb-8 leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong>Disclaimer:</strong>NostrPulse is an independent explorer built on open Nostr protocols (NIPs) and the Bitcoin Lightning Network. We do not hold private keys or custody user funds.
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()}  NostrPulse. Open Source & Value-4-Value.</p>
          <p className="mt-2 sm:mt-0">Updated for 2026 Data Cycle</p>
        </div>

      </div>
    </footer>
  );
}