import { HelpCircle } from "lucide-react";

export default function FAQSection() {
  const faqs = [
    {
      q: "What is Nostr and how is it censorship-resistant?",
      a: "Nostr (Notes and Other Stuff Transmitted by Relays) is an open, decentralized protocol. Instead of a central company hosting your account, you own your identity via cryptographic keypairs (public key npub & private key nsec). Your posts are broadcasted across independent relays.",
    },
    {
      q: "What is a Lightning Zap (NIP-57)?",
      a: "A Zap is a cryptographic micro-tip sent directly to a creator over the Bitcoin Lightning Network. Unlike traditional social media tipping, Zaps settle instantly with negligible fees and are verifiable on Nostr relays.",
    },
    {
      q: "What is an npub and how do I share it?",
      a: "An npub is your public Bech32-encoded Nostr address (like npub1...). It is safe to share publicly with anyone so they can find your profile, follow your notes, and send you Zaps.",
    },
    {
      q: "What is NIP-05 verification?",
      a: "NIP-05 allows Nostr users to link their public key to a human-readable internet identifier (like user@domain.com) using standard HTTPS DNS verification, preventing impersonation.",
    },
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-200/60 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-purple-600 font-bold text-xs uppercase tracking-wider mb-2">
            <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            Everything you need to know about Nostr
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
            >
              <h3 className="text-base font-bold text-slate-900">
                {faq.q}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}