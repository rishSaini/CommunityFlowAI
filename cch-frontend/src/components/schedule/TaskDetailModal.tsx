import { useState, useEffect } from "react";
import {
  X, Calendar, Clock, MapPin, Users, Mail,
  Phone, Sparkles, Shield, Send, CheckCircle2,
  AlertCircle, UserPlus,
} from "lucide-react";
import { requestsApi, dispatchApi } from "../../lib/api";
import type { RequestResponse } from "../../lib/api";
import type { RequestAssignmentInfo } from "../../types/index";
import MaterialBadge from "../ui/MaterialBadge";

interface Props {
  requestId: string;
  onClose: () => void;
}

const ROLE_STYLE: Record<string, string> = {
  primary:  "bg-sage-100 text-sage-800 border-sage-200",
  support:  "bg-sky-50 text-sky-700 border-sky-200",
  observer: "bg-sand-100 text-ink-muted border-sand-200",
};

const STATUS_STYLE: Record<string, string> = {
  submitted:   "bg-sand-100 text-ink-muted",
  in_review:   "bg-clay-50 text-clay-700",
  dispatched:  "bg-sky-50 text-sky-700",
  in_progress: "bg-sage-50 text-sage-700",
  fulfilled:   "bg-sage-100 text-sage-800",
  cancelled:   "bg-red-50 text-red-700",
};

export default function TaskDetailModal({ requestId, onClose }: Props) {
  const [request, setRequest] = useState<RequestResponse | null>(null);
  const [team, setTeam] = useState<RequestAssignmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      requestsApi.get(requestId),
      dispatchApi.getTeam(requestId).catch(() => [] as RequestAssignmentInfo[]),
    ]).then(([req, teamData]) => {
      setRequest(req);
      setTeam(teamData);
    }).catch(() => {
      // leave null — will show error state
    }).finally(() => setLoading(false));
  }, [requestId]);

  const handleShare = async () => {
    if (!shareEmail.trim()) return;
    setSharing(true);
    setShareStatus(null);
    try {
      await requestsApi.share(requestId, shareEmail.trim());
      setShareStatus({ type: "success", msg: `Shared with ${shareEmail.trim()}` });
      setShareEmail("");
      // Refresh team list
      const updated = await dispatchApi.getTeam(requestId).catch(() => team);
      setTeam(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to share";
      setShareStatus({ type: "error", msg });
    } finally {
      setSharing(false);
    }
  };

  const materials = (request?.materials_requested ?? []).map((m) =>
    typeof m === "string" ? m : (m as { material_id: string }).material_id
  );

  const dateStr = request?.event_date
    ? new Date(request.event_date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-paper rounded-3xl shadow-2xl border border-sand-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-sand-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-2xl bg-sage-600 flex items-center justify-center">
            <Shield size={14} className="text-paper" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-ink text-base leading-tight truncate"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {loading ? "Loading..." : request?.event_name ?? "Task Details"}
            </h2>
            {request && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[request.status] ?? "bg-sand-100 text-ink-muted"}`}>
                  {request.status.replace("_", " ")}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  request.urgency_level === "critical" || request.urgency_level === "high"
                    ? "bg-clay-50 text-clay-700"
                    : request.urgency_level === "medium"
                    ? "bg-clay-50/60 text-clay-600"
                    : "bg-sand-100 text-ink-muted"
                }`}>
                  {request.urgency_level} priority
                </span>
                {request.ai_priority_score != null && (
                  <span className="text-[10px] text-ink-muted">
                    Score: {Math.round(request.ai_priority_score)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-sand-100 flex items-center justify-center text-ink-muted hover:text-ink transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-ink-muted text-sm">
              Loading task details...
            </div>
          ) : !request ? (
            <div className="flex flex-col items-center justify-center py-12 text-ink-muted text-sm gap-2">
              <p>Could not load full details from server.</p>
              <p className="text-[11px] text-ink-faint">The backend may be starting up — try again in a moment.</p>
              <button
                onClick={() => {
                  setLoading(true);
                  Promise.all([
                    requestsApi.get(requestId),
                    dispatchApi.getTeam(requestId).catch(() => [] as RequestAssignmentInfo[]),
                  ]).then(([req, teamData]) => {
                    setRequest(req);
                    setTeam(teamData);
                  }).catch(() => {}).finally(() => setLoading(false));
                }}
                className="mt-2 text-xs font-semibold text-sage-700 hover:text-sage-800 border border-sage-300 px-4 py-1.5 rounded-xl hover:border-sage-400 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Event Info */}
              <section>
                <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2">Event Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <Calendar size={12} className="text-ink-faint flex-shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                  {request.event_time && (
                    <div className="flex items-center gap-2 text-sm text-ink">
                      <Clock size={12} className="text-ink-faint flex-shrink-0" />
                      <span>{request.event_time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <MapPin size={12} className="text-ink-faint flex-shrink-0" />
                    <span>{request.event_city}, UT {request.event_zip}</span>
                  </div>
                  {request.estimated_attendees != null && (
                    <div className="flex items-center gap-2 text-sm text-ink">
                      <Users size={12} className="text-ink-faint flex-shrink-0" />
                      <span>{request.estimated_attendees} attendees</span>
                    </div>
                  )}
                </div>
                {request.travel_info?.duration_text && (
                  <p className="text-xs text-ink-muted mt-2">
                    Travel: {request.travel_info.duration_text} · {request.travel_info.distance_text}
                  </p>
                )}
              </section>

              {/* Requestor */}
              <section>
                <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2">Requestor</h3>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-ink">{request.requestor_name}</p>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Mail size={11} className="text-ink-faint" />
                    <span>{request.requestor_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Phone size={11} className="text-ink-faint" />
                    <span>{request.requestor_phone}</span>
                  </div>
                </div>
              </section>

              {/* AI Summary */}
              {request.ai_summary && (
                <section>
                  <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Sparkles size={10} className="text-sage-500" /> AI Summary
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{request.ai_summary}</p>
                  {request.ai_tags && request.ai_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {request.ai_tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {request.priority_justification && (
                    <p className="text-[11px] text-ink-faint mt-2 italic">{request.priority_justification}</p>
                  )}
                </section>
              )}

              {/* Materials */}
              {materials.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2">Materials Requested</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {materials.map((m) => (
                      <MaterialBadge key={m} name={m} size="md" />
                    ))}
                  </div>
                </section>
              )}

              {/* Special Instructions */}
              {request.special_instructions && (
                <section>
                  <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2">Special Instructions</h3>
                  <p className="text-xs text-ink-muted leading-relaxed bg-sand-50 border border-sand-200 rounded-xl px-3 py-2">
                    {request.special_instructions}
                  </p>
                </section>
              )}

              {/* Team Members */}
              <section>
                <h3 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Users size={10} /> Team Members
                  {team.length > 0 && (
                    <span className="text-[10px] bg-sand-100 text-ink-muted px-1.5 py-0.5 rounded-full">
                      {team.length}
                    </span>
                  )}
                </h3>
                {team.length === 0 ? (
                  <p className="text-xs text-ink-faint">No team members assigned yet</p>
                ) : (
                  <div className="space-y-2">
                    {team.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 bg-sand-50/80 border border-sand-200 rounded-xl px-3 py-2.5">
                        <div className="w-8 h-8 bg-sage-100 border border-sage-200 rounded-lg flex items-center justify-center text-xs font-bold text-sage-700"
                          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                          {member.user_name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{member.user_name}</p>
                          {member.user_classification && (
                            <p className="text-[10px] text-ink-muted">{member.user_classification}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_STYLE[member.role] ?? ROLE_STYLE.support}`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Share Section */}
                <div className="mt-3 pt-3 border-t border-sand-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <UserPlus size={11} className="text-ink-muted" />
                    <p className="text-[11px] font-semibold text-ink-muted">Share with a team member</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="staff@cch.org"
                      value={shareEmail}
                      onChange={(e) => { setShareEmail(e.target.value); setShareStatus(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleShare()}
                      className="flex-1 text-xs border border-sand-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-sage-400 focus:border-sage-400 placeholder:text-ink-faint"
                    />
                    <button
                      onClick={handleShare}
                      disabled={sharing || !shareEmail.trim()}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-sage-600 hover:bg-sage-700 text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={10} />
                      {sharing ? "Sharing..." : "Share"}
                    </button>
                  </div>
                  {shareStatus && (
                    <div className={`flex items-center gap-1.5 mt-2 text-[11px] font-medium ${
                      shareStatus.type === "success" ? "text-sage-700" : "text-clay-600"
                    }`}>
                      {shareStatus.type === "success"
                        ? <CheckCircle2 size={11} />
                        : <AlertCircle size={11} />
                      }
                      {shareStatus.msg}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-sand-100 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-ink-muted hover:text-ink border border-sand-200 px-4 py-1.5 rounded-xl hover:border-sand-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
