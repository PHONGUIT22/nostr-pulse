import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-purple-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500">Last Updated: January 1, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-slate-600 space-y-6 leading-relaxed">
          <p>
            At <strong>NostrPulse</strong> (https://nostrpulse.com), we respect your digital privacy. Because Nostr is built on decentralized cryptographic principles, we do not require users to register accounts or provide personal identifiable information to browse public telemetry.
          </p>

          <h2 className="text-lg font-bold text-slate-900 uppercase">1. Public Blockchain & Relay Data</h2>
          <p>
            Public keys (npub), NIP-05 identifiers, and Zaps are public cryptographic broadcasts sent across independent relays and the Bitcoin Lightning Network.
          </p>

          <h2 className="text-lg font-bold text-slate-900 uppercase">2. Contact Us</h2>
          <p>
            For privacy-related inquiries, contact us at: <strong>support@nostrpulse.com</strong>.
          </p>
        </div>

      </div>
    </div>
  );
}