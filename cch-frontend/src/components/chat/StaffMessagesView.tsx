import { useState, useEffect } from "react";
import {
  MessageCircle, Search, Loader2, Calendar, MapPin, User,
} from "lucide-react";
import ChatChannel from "./ChatChannel";
import { messagesApi } from "../../lib/api";
import type { ChannelResponse } from "../../lib/api";

const URGENCY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-blue-400",
  low: "bg-emerald-400",
};

export default function StaffMessagesView() {
  const [channels, setChannels]     = useState<ChannelResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<ChannelResponse | null>(null);
  const [search, setSearch]         = useState("");

  useEffect(() => {
    messagesApi.getChannels().then((ch) => {
      setChannels(ch);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Only show channels that have messages or are dispatched (active conversations)
  const activeChannels = channels.filter((ch) =>
    ch.last_message || ch.status === "dispatched" || ch.status === "in_progress"
  );

  const filtered = activeChannels.filter((ch) =>
    ch.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    ch.event_name.toLowerCase().includes(search.toLowerCase()) ||
    ch.event_city.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: unread first, then by last message time
  const sorted = [...filtered].sort((a, b) => {
    if (a.unread_count > 0 && b.unread_count === 0) return -1;
    if (a.unread_count === 0 && b.unread_count > 0) return 1;
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2.5 mb-4">
        <MessageCircle size={20} className="text-sage-600" />
        <div>
          <h2 className="text-2xl font-semibold text-ink"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            Messages
          </h2>
          <p className="text-sm text-ink-muted">Direct conversations with community partners</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 240px)" }}>
        {/* Channel list */}
        <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border border-sand-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-sand-100">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-sand-200 bg-sand-50 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-sage-500 transition"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={16} className="animate-spin text-ink-muted" />
              </div>
            )}

            {!loading && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-faint">
                <MessageCircle size={24} className="mb-2 opacity-30" />
                <p className="text-xs">No active conversations</p>
              </div>
            )}

            {sorted.map((ch) => (
              <button
                key={ch.request_id}
                onClick={() => setSelected(ch)}
                className={`w-full text-left px-3 py-3 border-b border-sand-100 hover:bg-sand-50/50 transition-colors ${
                  selected?.request_id === ch.request_id ? "bg-sage-50/50 border-l-2 border-l-sage-500" : ""
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-sage-100 border border-sage-200 flex items-center justify-center text-[10px] font-bold text-sage-700 flex-shrink-0 mt-0.5">
                    {ch.partner_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-ink truncate">{ch.partner_name}</p>
                      {ch.unread_count > 0 && (
                        <span className="w-4 h-4 rounded-full bg-sage-600 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0">
                          {ch.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-muted truncate mt-0.5">{ch.event_name}</p>
                    {ch.last_message && (
                      <p className="text-[10px] text-ink-faint truncate mt-0.5">{ch.last_message}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-sand-200 rounded-2xl overflow-hidden shadow-sm">
          {selected ? (
            <ChatChannel channel={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-ink-faint">
              <MessageCircle size={32} className="mb-3 opacity-20" />
              <p className="text-sm font-medium text-ink-muted">Select a conversation</p>
              <p className="text-xs mt-1">Click a partner from the list to open their chat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
