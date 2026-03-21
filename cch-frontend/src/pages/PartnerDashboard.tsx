import { useState, useEffect } from "react";
import {
  MessageCircle, ClipboardList, Calendar, MapPin,
  Users, Loader2, ChevronRight, Clock, Package,
  UserCheck, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import MaterialBadge from "../components/ui/MaterialBadge";
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

function PartnerRequestCard({ ch, onChat }: { ch: ChannelResponse; onChat: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = STATUS_LABEL[ch.status] || STATUS_LABEL.submitted;
  const hasRep = !!ch.staff_name;
  const urgencyDot = ch.urgency_level ? URGENCY_DOT[ch.urgency_level] : null;

  const materials: string[] = (ch.materials_requested ?? []).map((m) =>
    typeof m === "string" ? m : m.material_id
  );

  return (
    <div
      className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onChat}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-ink truncate">{ch.event_name}</h3>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {urgencyDot && (
                <span className={`w-2 h-2 rounded-full ${urgencyDot}`} title={`${ch.urgency_level} urgency`} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-muted flex-wrap">
              <span className="flex items-center gap-1"><Calendar size={9} />{new Date(ch.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              {ch.event_time && <span className="flex items-center gap-1"><Clock size={9} />{ch.event_time}</span>}
              <span className="flex items-center gap-1"><MapPin size={9} />{ch.event_city}{ch.event_zip ? `, ${ch.event_zip}` : ""}</span>
              {ch.estimated_attendees != null && ch.estimated_attendees > 0 && (
                <span className="flex items-center gap-1"><Users size={9} />{ch.estimated_attendees}</span>
              )}
              {ch.fulfillment_type && (
                <span className={`flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-md ${
                  ch.fulfillment_type === "staff" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {ch.fulfillment_type === "staff" ? <><UserCheck size={9} />Staffed</> : <><Package size={9} />Mailed</>}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={14} className="text-ink-faint mt-1 flex-shrink-0" />
        </div>

        {/* Materials */}
        {materials.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {materials.map((n) => (
              <MaterialBadge key={n} name={n} size="sm" />
            ))}
          </div>
        )}

        {/* AI Summary toggle */}
        {ch.ai_summary && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="mt-2 w-full flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 transition-colors group"
            >
              <Sparkles size={11} className="group-hover:rotate-12 transition-transform" />
              AI Triage Summary
              {expanded ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
            </button>
            {expanded && (
              <div className="mt-1.5 bg-indigo-50/70 rounded-xl p-2.5 border border-indigo-100 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <p className="text-[11px] text-slate-600 leading-relaxed">{ch.ai_summary}</p>
                {ch.ai_priority_score != null && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1.5">Priority Score: {ch.ai_priority_score}/100</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Special Instructions */}
        {ch.special_instructions && (
          <p className="text-[11px] text-ink-faint mt-2 italic truncate" onClick={(e) => e.stopPropagation()}>
            Note: {ch.special_instructions}
          </p>
        )}

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
}

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
          {channels.map((ch) => (
            <PartnerRequestCard key={ch.request_id} ch={ch} onChat={() => setSelectedChannel(ch)} />
          ))}
        </div>
      )}
    </div>
  );
}
