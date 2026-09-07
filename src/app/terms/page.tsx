import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Terms of Service - NostrPulse",
  description: "Terms and conditions for using NostrPulse analytics, relay discovery, and Lightning Zaps.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-purple-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500">Effective Date: January 1, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-slate-600 space-y-6 leading-relaxed">
          
          <p>
            Welcome to <strong>NostrPulse</strong> (https://nostrpulse.com). By accessing or using our protocol analytics platform, relay directories, and profile comparison tools, you agree to comply with and be bound by the following Terms of Service.
          </p>

          {/* Protocol disclaimer block */}
          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 text-purple-950">
            <h2 className="text-base font-bold uppercase mb-2 flex items-center gap-2 text-purple-900">
              <Shield className="w-5 h-5 text-purple-600" /> 1. Non-Custodial & Open Protocol Disclaimer
            </h2>
            <p className="text-xs text-purple-900 leading-relaxed">
              <strong>Disclaimer:</strong> NostrPulse is a non-custodial intelligence dashboard for the decentralized Nostr protocol and Bitcoin Lightning Network. We never request, store, or hold user private keys (<code>nsec</code>). We do not custody user funds. All Value-4-Value Lightning micro-tips (Zaps) are executed peer-to-peer via external browser extensions or third-party Lightning wallets.
            </p>
          </div>

          <h2 className="text-lg font-bold text-slate-900 uppercase">2. Use of Telemetry Data & Nostr Relays</h2>
          <p>
            All profile information, public keys (<code>npub</code>), NIP-05 identifiers, and social notes displayed on NostrPulse are public cryptographic data aggregated directly from decentralized WebSocket relays. NostrPulse does not edit, censor, or alter event payloads published to open relays.
          </p>

          <h2 className="text-lg font-bold text-slate-900 uppercase">3. Lightning Zaps & Value-4-Value Transactions</h2>
          <p>
            Payments triggered via WebLN or LNURL-pay endpoints (<code>lud16</code>) are final, irreversible cryptocurrency microtransactions broadcasted on the Bitcoin Lightning Network. NostrPulse charges 0% platform fees and is not responsible for misdirected payments or third-party node routing failures.
          </p>

          <h2 className="text-lg font-bold text-slate-900 uppercase">4. Limitation of Liability</h2>
          <p>
            In no event shall NostrPulse or its contributors be liable for any direct or indirect damages, network downtime, relay connection drops, or loss of digital assets arising from the use of our explorer or third-party Nostr client integrations.
          </p>

          <h2 className="text-lg font-bold text-slate-900 uppercase">5. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms as the open Nostr protocol evolves (NIP updates). Your continued use of the platform constitutes acceptance of any modifications.
          </p>

          <h2 className="text-lg font-bold text-slate-900 uppercase">6. Contact Information</h2>
          <p>
            For inquiries regarding these Terms, contact us at <strong>support@nostrpulse.com</strong>.
          </p>

        </div>

      </div>
    </div>
  );
}