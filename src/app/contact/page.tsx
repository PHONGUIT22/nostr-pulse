"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Clock, Send, CheckCircle2, Radio, Zap } from "lucide-react";

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-purple-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Radio className="w-3.5 h-3.5" /> Protocol Support
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase mb-4">
            Contact NostrPulse
          </h1>
          <p className="text-lg text-slate-600">
            Have questions about Nostr analytics, want to submit a new public Relay, or need assistance with NIP-05 verification? We&apos;re here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <Mail className="w-6 h-6 text-purple-600 mb-3" />
              <h3 className="font-bold text-slate-900 text-sm mb-1">Email Us Directly</h3>
              <p className="text-xs text-slate-500 mb-2">For relay submissions & developer inquiries:</p>
              <a href="mailto:support@nostrpulse.com" className="text-sm font-semibold text-purple-600 hover:underline">
                support@nostrpulse.com
              </a>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <Clock className="w-6 h-6 text-amber-500 mb-3" />
              <h3 className="font-bold text-slate-900 text-sm mb-1">Lightning Response</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our protocol telemetry engineers respond to technical inquiries within 24 business hours.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-purple-950 text-white p-6 rounded-3xl shadow-sm">
              <Zap className="w-6 h-6 text-amber-400 mb-3 fill-amber-400" />
              <h3 className="font-bold text-sm mb-1">Decentralized Direct Contact</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You can also message us directly via encrypted Nostr DMs (NIP-04/NIP-17) to our official pubkey.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Send us a message</h2>
            
            {isSubmitted ? (
              <div className="bg-purple-50 border border-purple-200 p-6 rounded-2xl text-purple-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-base text-purple-800">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" /> Message Dispatched!
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">
                  Thank you for reaching out to NostrPulse. Our team has received your message and will follow up shortly at your provided email.
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Your Name / Nostr Handle</label>
                  <input
                    type="text"
                    placeholder="satoshi (or @handle)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Your Email or npub</label>
                  <input
                    type="text"
                    placeholder="user@domain.com or npub1..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Inquiry Type</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-600">
                    <option>Relay Node Submission (wss://...)</option>
                    <option>Creator Verification & NIP-05</option>
                    <option>Lightning Zap Integration Feedback</option>
                    <option>General Protocol Question</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Message</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your inquiry, WebSocket endpoint, or proposal..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-600"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-md shadow-purple-600/20"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}