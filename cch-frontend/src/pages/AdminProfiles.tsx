import { useState, useEffect, useMemo } from "react";
import {
  Users, UserCheck, Search, Loader2, RefreshCw,
  Mail, Phone, Shield, Stethoscope, Calendar,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  MapPin, Package, ArrowLeft, Briefcase, Clock,
  TrendingUp, BarChart3, FileText, ChevronRight,
  Activity, AlertTriangle,
} from "lucide-react";
import { employeesApi, requestsApi } from "../lib/api";
import MaterialBadge from "../components/ui/MaterialBadge";
import type { UserResponse, RequestResponse } from "../lib/api";
import NotificationCenter from "../components/notifications/NotificationCenter";

type Tab = "partners" | "staff" | "notifications";

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                   */
/* ────────────────────────────────────────────────────────── */

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-sage-500" : "bg-sand-300"}`} />
  );
}

function RoleBadge({ role }: { role: UserResponse["role"] }) {
  if (role === "admin") return (
    <span className="flex items-center gap-1 text-[10px] font-bold bg-clay-50 text-clay-700 border border-clay-200 px-2 py-0.5 rounded-full">
      <Shield size={9} /> Admin
    </span>
  );
  if (role === "staff") return (
    <span className="flex items-center gap-1 text-[10px] font-bold bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 rounded-full">
      <Stethoscope size={9} /> Staff
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
      <UserCheck size={9} /> Partner
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  submitted:     "bg-amber-50 text-amber-700 border-amber-200",
  pending:       "bg-amber-50 text-amber-700 border-amber-200",
  in_review:     "bg-sky-50 text-sky-700 border-sky-200",
  approved:      "bg-indigo-50 text-indigo-700 border-indigo-200",
  dispatched:    "bg-violet-50 text-violet-700 border-violet-200",
  in_progress:   "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled:     "bg-sage-50 text-sage-700 border-sage-200",
  complete:      "bg-sage-50 text-sage-700 border-sage-200",
  cancelled:     "bg-sand-100 text-ink-muted border-sand-200",
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high:     "bg-rose-50 text-rose-700 border-rose-200",
  medium:   "bg-amber-50 text-amber-700 border-amber-200",
  low:      "bg-sage-50 text-sage-700 border-sage-200",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ────────────────────────────────────────────────────────── */
/*  Partner aggregated profile                                */
/* ────────────────────────────────────────────────────────── */

interface PartnerProfile {
  name: string;
  email: string;
  phone: string;
  requests: RequestResponse[];
  totalAttendees: number;
  avgPriority: number;
  cities: string[];
  statusBreakdown: Record<string, number>;
  firstRequest: string;
  latestRequest: string;
}

function buildPartnerProfiles(requests: RequestResponse[]): PartnerProfile[] {
  const map = new Map<string, RequestResponse[]>();
  for (const r of requests) {
    const key = r.requestor_email?.toLowerCase() ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  const profiles: PartnerProfile[] = [];
  for (const [, reqs] of map) {
    const sorted = [...reqs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const statusBreakdown: Record<string, number> = {};
    let totalAttendees = 0;
    let totalPriority = 0;
    let priorityCount = 0;
    const citySet = new Set<string>();
    for (const r of reqs) {
      statusBreakdown[r.status] = (statusBreakdown[r.status] ?? 0) + 1;
      totalAttendees += r.estimated_attendees ?? 0;
      if (r.ai_priority_score != null) {
        totalPriority += r.ai_priority_score;
        priorityCount++;
      }
      if (r.event_city) citySet.add(r.event_city);
    }
    profiles.push({
      name: sorted[0].requestor_name,
      email: sorted[0].requestor_email,
      phone: sorted[0].requestor_phone,
      requests: sorted,
      totalAttendees,
      avgPriority: priorityCount > 0 ? Math.round(totalPriority / priorityCount) : 0,
      cities: [...citySet],
      statusBreakdown,
      firstRequest: sorted[sorted.length - 1]?.created_at ?? "",
      latestRequest: sorted[0]?.created_at ?? "",
    });
  }
  return profiles.sort((a, b) => b.requests.length - a.requests.length);
}

/* ────────────────────────────────────────────────────────── */
/*  Partner Profile Detail View                               */
/* ────────────────────────────────────────────────────────── */

function PartnerProfileDetail({
  partner,
  onBack,
  onStatusChange,
}: {
  partner: PartnerProfile;
  onBack: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const statuses = ["submitted", "in_review", "approved", "dispatched", "in_progress", "fulfilled", "cancelled"];

  return (
    <div className="animate-fade-in space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Back to list
      </button>

      {/* Profile Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-sand-100">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg font-bold text-sky-700 flex-shrink-0"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              {partner.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-xl font-semibold text-ink"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                >
                  {partner.name}
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                  <UserCheck size={9} /> Community Partner
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Mail size={11} /> {partner.email}
                </span>
                {partner.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Phone size={11} /> {partner.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin size={11} /> {partner.cities.join(", ") || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-sand-100">
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {partner.requests.length}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Total Requests</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {partner.totalAttendees.toLocaleString()}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Total Attendees</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {partner.avgPriority || "—"}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Avg Priority</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {formatDate(partner.firstRequest)}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">First Request</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-sand-100 flex items-center gap-2">
          <BarChart3 size={13} className="text-sage-600" />
          <p className="text-xs font-semibold text-ink">Status Breakdown</p>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {Object.entries(partner.statusBreakdown).map(([s, count]) => (
            <div
              key={s}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${STATUS_COLORS[s] ?? "bg-sand-100 text-ink-muted border-sand-200"}`}
            >
              {s.replace(/_/g, " ")}
              <span className="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request History */}
      <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-sand-100 flex items-center gap-2">
          <FileText size={13} className="text-sage-600" />
          <p className="text-xs font-semibold text-ink">Request History</p>
        </div>
        <div className="divide-y divide-sand-100">
          {partner.requests.map((r) => (
            <PartnerRequestRow key={r.id} request={r} onStatusChange={onStatusChange} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Individual Request Row (inside partner profile)           */
/* ────────────────────────────────────────────────────────── */

function PartnerRequestRow({
  request,
  onStatusChange,
}: {
  request: RequestResponse;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const statuses = ["submitted", "in_review", "approved", "dispatched", "in_progress", "fulfilled", "cancelled"];

  return (
    <div>
      <div
        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-sand-50/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink truncate">{request.event_name || "Untitled Event"}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[request.status] ?? "bg-sand-100 text-ink-muted border-sand-200"}`}>
              {request.status.replace(/_/g, " ")}
            </span>
            {(request.urgency_level === "high" || request.urgency_level === "critical") && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${URGENCY_COLORS[request.urgency_level]}`}>
                {request.urgency_level === "critical" ? "Critical" : "High"} Urgency
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Calendar size={9} /> {formatDate(request.event_date)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
              <MapPin size={9} /> {request.event_city}
            </span>
            {request.estimated_attendees != null && (
              <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                <Users size={9} /> {request.estimated_attendees} attendees
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {request.ai_priority_score != null && (
            <div className="text-right">
              <p className="text-lg font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                {Math.round(request.ai_priority_score)}
              </p>
              <p className="text-[9px] text-ink-faint uppercase tracking-wide">Priority</p>
            </div>
          )}
          <ChevronRight size={14} className={`text-ink-faint transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4 space-y-3">
            {/* Request details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Fulfillment</p>
                <p className="text-xs text-ink mt-0.5">{request.fulfillment_type === "staff" ? "Staffed" : request.fulfillment_type === "mail" ? "Mailed" : "Pickup"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">ZIP Code</p>
                <p className="text-xs text-ink mt-0.5">{request.event_zip}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Submitted</p>
                <p className="text-xs text-ink mt-0.5">{formatDate(request.created_at)}</p>
              </div>
            </div>

            {request.ai_summary && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1">AI Summary</p>
                <p className="text-xs text-ink-muted leading-relaxed">{request.ai_summary}</p>
              </div>
            )}
            {request.priority_justification && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1">Priority Justification</p>
                <p className="text-xs text-ink-muted leading-relaxed">{request.priority_justification}</p>
              </div>
            )}
            {request.ai_tags && request.ai_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">AI Tags</p>
                <div className="flex flex-wrap gap-1">
                  {request.ai_tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {request.materials_requested && request.materials_requested.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Materials Requested</p>
                <div className="flex flex-wrap gap-1">
                  {request.materials_requested.map((m) => (
                    <MaterialBadge key={typeof m === "string" ? m : m.material_id} name={typeof m === "string" ? m : m.material_id} size="sm" />
                  ))}
                </div>
              </div>
            )}
            {request.special_instructions && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1">Special Instructions</p>
                <p className="text-xs text-ink-muted">{request.special_instructions}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Update Status</p>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); onStatusChange(request.id, s); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                      request.status === s
                        ? (STATUS_COLORS[s] ?? "bg-sand-100 text-ink-muted border-sand-200")
                        : "bg-white text-ink-muted border-sand-200 hover:border-sand-300"
                    }`}
                  >
                    {s === request.status ? <><CheckCircle2 size={9} className="inline mr-0.5" />{s.replace(/_/g, " ")}</> : s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Staff Profile Detail View                                 */
/* ────────────────────────────────────────────────────────── */

function StaffProfileDetail({
  employee,
  requests,
  onBack,
}: {
  employee: UserResponse;
  requests: RequestResponse[];
  onBack: () => void;
}) {
  const assignedRequests = requests.filter((r) => r.assigned_staff_id === employee.id);
  const activeRequests = assignedRequests.filter((r) => !["fulfilled", "complete", "cancelled"].includes(r.status));
  const completedRequests = assignedRequests.filter((r) => ["fulfilled", "complete"].includes(r.status));
  const workloadPct = employee.max_workload > 0 ? Math.round((employee.current_workload / employee.max_workload) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Back to list
      </button>

      {/* Profile Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-sand-100">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center text-lg font-bold text-sage-700 flex-shrink-0"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              {employee.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-xl font-semibold text-ink"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                >
                  {employee.full_name}
                </h3>
                <RoleBadge role={employee.role} />
                {employee.is_active ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={9} /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-sand-100 text-ink-muted border border-sand-200 px-2 py-0.5 rounded-full">
                    <XCircle size={9} /> Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Mail size={11} /> {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Phone size={11} /> {employee.phone}
                  </span>
                )}
                {employee.classification_display && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Briefcase size={11} /> {employee.classification_display}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                employee.is_on_duty
                  ? "bg-sage-50 text-sage-700 border border-sage-200"
                  : "bg-sand-100 text-ink-faint border border-sand-200"
              }`}>
                {employee.is_on_duty
                  ? <><ToggleRight size={14} className="text-sage-600" /> On Duty</>
                  : <><ToggleLeft size={14} /> Off Duty</>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-sand-100">
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {employee.current_workload}/{employee.max_workload}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Workload</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {activeRequests.length}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Active Tasks</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {completedRequests.length}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Completed</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {assignedRequests.length}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Total Assigned</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xl font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {employee.hire_date ? formatDate(employee.hire_date) : "—"}
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-wide mt-0.5">Hire Date</p>
          </div>
        </div>
      </div>

      {/* Workload Bar */}
      <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-sand-100 flex items-center gap-2">
          <Activity size={13} className="text-sage-600" />
          <p className="text-xs font-semibold text-ink">Capacity</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">
              {employee.current_workload} of {employee.max_workload} task slots used
            </span>
            <span className={`text-xs font-bold ${
              workloadPct >= 90 ? "text-rose-600" : workloadPct >= 60 ? "text-amber-600" : "text-sage-700"
            }`}>
              {workloadPct}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-sand-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                workloadPct >= 90 ? "bg-rose-500" : workloadPct >= 60 ? "bg-amber-500" : "bg-sage-500"
              }`}
              style={{ width: `${Math.min(workloadPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assigned Requests */}
      <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-sand-100 flex items-center gap-2">
          <FileText size={13} className="text-sage-600" />
          <p className="text-xs font-semibold text-ink">Assigned Requests ({assignedRequests.length})</p>
        </div>
        {assignedRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-ink-faint">
            <Package size={24} className="mb-2 opacity-30" />
            <p className="text-xs">No requests assigned yet</p>
          </div>
        ) : (
          <div className="divide-y divide-sand-100">
            {assignedRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink truncate">{r.event_name || r.requestor_name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] ?? "bg-sand-100 text-ink-muted border-sand-200"}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-ink-muted flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={9} /> {formatDate(r.event_date)}</span>
                    <span className="flex items-center gap-1"><MapPin size={9} /> {r.event_city}</span>
                    <span>{r.requestor_name}</span>
                  </div>
                </div>
                {r.ai_priority_score != null && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                      {Math.round(r.ai_priority_score)}
                    </p>
                    <p className="text-[9px] text-ink-faint uppercase tracking-wide">Priority</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Partner List Card (clickable)                             */
/* ────────────────────────────────────────────────────────── */

function PartnerCard({
  partner,
  onClick,
}: {
  partner: PartnerProfile;
  onClick: () => void;
}) {
  const latestStatus = partner.requests[0]?.status;
  const latestUrgency = partner.requests[0]?.urgency_level;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-sand-50/50 transition-colors"
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm font-bold text-sky-700 flex-shrink-0"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        {partner.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-ink truncate">{partner.name}</p>
          {latestStatus && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[latestStatus] ?? "bg-sand-100 text-ink-muted border-sand-200"}`}>
              {latestStatus.replace(/_/g, " ")}
            </span>
          )}
          {(latestUrgency === "high" || latestUrgency === "critical") && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${URGENCY_COLORS[latestUrgency]}`}>
              <AlertTriangle size={8} className="inline mr-0.5" />
              {latestUrgency === "critical" ? "Critical" : "High"} Urgency
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-ink-muted">
            <Mail size={9} /> {partner.email}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-ink-muted">
            <Calendar size={9} /> {formatDate(partner.latestRequest)}
          </span>
          <span className="text-[11px] text-ink-muted">{partner.cities.join(", ")}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className="text-lg font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            {partner.requests.length}
          </p>
          <p className="text-[9px] text-ink-faint uppercase tracking-wide">Requests</p>
        </div>
        <ChevronRight size={14} className="text-ink-faint" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Staff List Card (clickable)                               */
/* ────────────────────────────────────────────────────────── */

function StaffCard({
  employee,
  onClick,
}: {
  employee: UserResponse;
  onClick: () => void;
}) {
  const workloadPct = employee.max_workload > 0 ? Math.round((employee.current_workload / employee.max_workload) * 100) : 0;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-sand-50/50 transition-colors"
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center text-sm font-bold text-sage-700 flex-shrink-0"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        {employee.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink truncate">{employee.full_name}</p>
          <RoleBadge role={employee.role} />
          <StatusDot active={employee.is_active} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-ink-muted">
            <Mail size={9} /> {employee.email}
          </span>
          {employee.classification_display && (
            <span className="text-[11px] text-ink-faint">{employee.classification_display}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Workload mini bar */}
        <div className="w-16">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-ink-faint">{employee.current_workload}/{employee.max_workload}</span>
          </div>
          <div className="w-full h-1.5 bg-sand-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                workloadPct >= 90 ? "bg-rose-500" : workloadPct >= 60 ? "bg-amber-500" : "bg-sage-500"
              }`}
              style={{ width: `${Math.min(workloadPct, 100)}%` }}
            />
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${
          employee.is_on_duty ? "text-sage-700" : "text-ink-faint"
        }`}>
          {employee.is_on_duty
            ? <><ToggleRight size={14} className="text-sage-600" /> On Duty</>
            : <><ToggleLeft size={14} /> Off Duty</>}
        </div>
        <ChevronRight size={14} className="text-ink-faint" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Main Component                                            */
/* ────────────────────────────────────────────────────────── */

export default function AdminProfiles() {
  const [tab, setTab]           = useState<Tab>("partners");
  const [employees, setEmployees] = useState<UserResponse[]>([]);
  const [requests, setRequests]  = useState<RequestResponse[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [error, setError]       = useState<string | null>(null);

  // Detail views
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<UserResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "staff") {
        const res = await employeesApi.list();
        setEmployees(res);
      } else {
        const res = await requestsApi.list(1, 100);
        setRequests(res.requests);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Load both tabs' data for cross-referencing
  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, reqRes] = await Promise.all([
        employeesApi.list().catch(() => [] as UserResponse[]),
        requestsApi.list(1, 100).catch(() => ({ requests: [] as RequestResponse[], total: 0, page: 1, per_page: 100 })),
      ]);
      setEmployees(empRes);
      setRequests(reqRes.requests);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await requestsApi.updateStatus(id, status);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch {
      // Silently handled
    }
  };

  // Partner profiles aggregated by email
  const partnerProfiles = useMemo(() => buildPartnerProfiles(requests), [requests]);

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPartners = partnerProfiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.cities.some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  // If a detail view is selected, render that instead
  if (selectedPartner) {
    return (
      <PartnerProfileDetail
        partner={selectedPartner}
        onBack={() => setSelectedPartner(null)}
        onStatusChange={handleStatusChange}
      />
    );
  }

  if (selectedEmployee) {
    return (
      <StaffProfileDetail
        employee={selectedEmployee}
        requests={requests}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            Profile Management
          </h2>
          <p className="text-sm text-ink-muted mt-0.5">
            {tab === "staff"
              ? `${employees.length} staff members`
              : tab === "notifications"
              ? "SMS & voice notification management"
              : `${partnerProfiles.length} community partners · ${requests.length} requests`}
          </p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink border border-sand-200 px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-sand-100/70 rounded-2xl p-1">
        <button
          onClick={() => { setTab("partners"); setSearch(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "partners" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          <UserCheck size={13} /> Partners
        </button>
        <button
          onClick={() => { setTab("staff"); setSearch(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "staff" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Users size={13} /> Staff
        </button>
        <button
          onClick={() => { setTab("notifications"); setSearch(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "notifications" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Phone size={13} /> Notifications
        </button>
      </div>

      {/* Notifications tab */}
      {tab === "notifications" && (
        <NotificationCenter />
      )}

      {/* Search — only for partners/staff tabs */}
      {tab !== "notifications" && (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "staff" ? "Search by name or email…" : "Search by org, email, or city…"}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sand-200 bg-white text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage-600 transition-all"
            />
          </div>

          {/* Content */}
          <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={20} className="animate-spin text-ink-muted" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <XCircle size={12} />
                {error}
              </div>
            )}

            {!loading && !error && tab === "staff" && (
              filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-ink-faint">
                  <Users size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">No staff members found</p>
                </div>
              ) : (
                <div className="divide-y divide-sand-100">
                  {filteredEmployees.map((e) => (
                    <StaffCard key={e.id} employee={e} onClick={() => setSelectedEmployee(e)} />
                  ))}
                </div>
              )
            )}

            {!loading && !error && tab === "partners" && (
              filteredPartners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-ink-faint">
                  <UserCheck size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">No partners found</p>
                </div>
              ) : (
                <div className="divide-y divide-sand-100">
                  {filteredPartners.map((p) => (
                    <PartnerCard key={p.email} partner={p} onClick={() => setSelectedPartner(p)} />
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
