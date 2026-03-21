import { useState, useEffect } from "react";
import {
  MessageCircle, ClipboardList, Calendar, MapPin,
  Users, Loader2, ChevronRight, Clock,
} from "lucide-react";
import ChatChannel from "../components/chat/ChatChannel";
import { messagesApi } from "../lib/api";
import type { ChannelResponse } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const URGENCY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-blue-400",
  low: "bg-emerald-400",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  submitted:   { label: "Submitted",   color: "bg-sand-100 text-ink-muted border-sand-200" },
  in_review:   { label: "In Review",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:    { label: "Approved",    color: "bg-blue-50 text-blue-700 border-blue-200" },
  dispatched:  { label: "Staff Assigned", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  in_progress: { label: "In Progress", color: "bg-sage-50 text-sage-700 border-sage-200" },
  fulfilled:   { label: "Complete",    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [channels, setChannels]           = useState<ChannelResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<ChannelResponse | null>(null);

  useEffect(() => {
    messagesApi.getChannels().then((ch) => {
      setChannels(ch);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const firstName = user?.full_name.split(" ")[0] || "Partner";

  // Mobile: show either list or chat
  if (selectedChannel) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm" style={{ height: "calc(100vh - 200px)" }}>
          <ChatChannel channel={selectedChannel} onBack={() => setSelectedChannel(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-ink"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
          Welcome back, {firstName}.
        </h2>
        <p className="text-sm text-ink-muted mt-0.5">
          {channels.length === 0
            ? "You don't have any active requests yet."
            : `You have ${channels.length} request${channels.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      )}

      {!loading && channels.length === 0 && (
        <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl p-12 text-center shadow-sm">
          <ClipboardList size={32} className="mx-auto mb-3 text-ink-faint opacity-40" />
          <p className="text-sm font-semibold text-ink-muted">No requests yet</p>
          <p className="text-xs text-ink-faint mt-1">Submit a request to get started — your assigned representative will appear here.</p>
        </div>
      )}

      {!loading && channels.length > 0 && (
        <div className="space-y-3">
          {channels.map((ch) => {
            const statusInfo = STATUS_LABEL[ch.status] || STATUS_LABEL.submitted;
            const hasRep = !!ch.staff_name;

            return (
              <div key={ch.request_id}
                className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedChannel(ch)}>
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-ink truncate">{ch.event_name}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-muted">
                        <span className="flex items-center gap-1"><Calendar size={9} />{new Date(ch.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="flex items-center gap-1"><MapPin size={9} />{ch.event_city}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink-faint mt-1 flex-shrink-0" />
                  </div>

                  {/* Representative + Chat preview */}
                  <div className="mt-3 pt-3 border-t border-sand-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage-100 border border-sage-200 flex items-center justify-center flex-shrink-0">
                      {hasRep
                        ? <span className="text-[10px] font-bold text-sage-700">{ch.staff_name!.split(" ").map(n => n[0]).join("")}</span>
                        : <Users size={11} className="text-sage-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink">
                        {hasRep ? ch.staff_name : "Awaiting assignment"}
                      </p>
                      {ch.last_message ? (
                        <p className="text-[11px] text-ink-muted truncate mt-0.5">{ch.last_message}</p>
                      ) : (
                        <p className="text-[11px] text-ink-faint mt-0.5 italic">
                          {hasRep ? "Send a message to your representative" : "A team member will be assigned soon"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ch.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-sage-600 text-white text-[9px] font-black flex items-center justify-center">
                          {ch.unread_count}
                        </span>
                      )}
                      <MessageCircle size={14} className="text-sage-500" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
