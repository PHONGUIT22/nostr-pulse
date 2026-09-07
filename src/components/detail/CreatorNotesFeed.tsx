"use client";

import { NostrNote } from "@/lib/nostr";
import { MessageSquare, ExternalLink, Clock, Sparkles, Share2 } from "lucide-react";
import { nip19 } from "nostr-tools";

interface CreatorNotesFeedProps {
  notes: NostrNote[];
  creatorName?: string;
}

// Relative time formatting helper (e.g. 5m ago, 2h ago)
function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(1, now - timestamp);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export default function CreatorNotesFeed({
  notes,
  creatorName = "Creator",
}: CreatorNotesFeedProps) {
  if (!notes || notes.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center text-slate-400">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-semibold">No recent posts found</p>
        <p className="text-xs text-slate-500 mt-1">This creator hasn't broadcasted public notes on open relays recently.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Nostr Feed (Kind 1)
          </div>
          <h3 className="text-xl font-black">Latest Notes by {creatorName}</h3>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 font-mono px-3 py-1 rounded-full border border-slate-700">
          {notes.length} recent notes
        </span>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {notes.map((note) => {
          let noteIdEncoded = note.id;
          try {
            noteIdEncoded = nip19.noteEncode(note.id);
          } catch {}

          const primalUrl = `https://primal.net/e/${noteIdEncoded}`;

          return (
            <div
              key={note.id}
              className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all rounded-2xl p-4 sm:p-5 flex flex-col justify-between group"
            >
              {/* Note Content */}
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
                {note.content}
              </p>

              {/* Note Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/40 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTimeAgo(note.created_at)}</span>
                </div>

                <a
                  href={primalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold transition-colors group-hover:translate-x-0.5"
                >
                  <span>View on Primal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}