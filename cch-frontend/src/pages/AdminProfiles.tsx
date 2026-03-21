import { useState, useEffect } from "react";
import {
  Users, UserCheck, Search, Loader2, RefreshCw,
  Mail, Phone, Shield, Stethoscope, Calendar,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { employeesApi, requestsApi } from "../lib/api";
import type { UserResponse, RequestResponse } from "../lib/api";

type Tab = "partners" | "staff";

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

function StaffCard({ employee }: { employee: UserResponse }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-sand-50/50 transition-colors">
      <div className="w-10 h-10 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center text-sm font-bold text-sage-700 flex-shrink-0"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
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
            <Mail size={9} />{employee.email}
          </span>
          {employee.phone && (
            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Phone size={9} />{employee.phone}
            </span>
          )}
        </div>
        {employee.classification_display && (
          <p className="text-[10px] text-ink-faint mt-0.5">{employee.classification_display}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${
          employee.is_on_duty ? "text-sage-700" : "text-ink-faint"
        }`}>
          {employee.is_on_duty
            ? <><ToggleRight size={14} className="text-sage-600" />On Duty</>
            : <><ToggleLeft size={14} />Off Duty</>}
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  accepted:    "bg-sky-50 text-sky-700 border-sky-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  complete:    "bg-sage-50 text-sage-700 border-sage-200",
  cancelled:   "bg-sand-100 text-ink-muted border-sand-200",
};

function PartnerRow({ request, onStatusChange }: { request: RequestResponse; onStatusChange: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const statuses = ["pending", "accepted", "in_progress", "complete", "cancelled"];

  return (
    <div className="border-b border-sand-100 last:border-0">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-sand-50/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink truncate">{request.requestor_name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[request.status] ?? "bg-sand-100 text-ink-muted border-sand-200"}`}>
              {request.status.replace("_", " ")}
            </span>
            {request.urgency_level === "high" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                High Urgency
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Mail size={9} />{request.requestor_email}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Calendar size={9} />{new Date(request.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-[11px] text-ink-muted">{request.event_city}</span>
          </div>
        </div>
        {request.priority_score != null && (
          <div className="flex-shrink-0 text-right">
            <p className="text-lg font-bold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {request.priority_score}
            </p>
            <p className="text-[9px] text-ink-faint uppercase tracking-wide">Priority</p>
          </div>
        )}
      </div>

      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4 space-y-3">
            {request.ai_summary && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1">AI Summary</p>
                <p className="text-xs text-ink-muted leading-relaxed">{request.ai_summary}</p>
              </div>
            )}
            {request.materials_requested && request.materials_requested.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Materials Requested</p>
                <div className="flex flex-wrap gap-1">
                  {request.materials_requested.map((m) => (
                    <span key={m} className="text-[10px] bg-white border border-sand-200 text-ink-muted px-2 py-0.5 rounded-full">{m}</span>
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
                    onClick={() => onStatusChange(request.id, s)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                      request.status === s
                        ? (STATUS_COLORS[s] ?? "bg-sand-100 text-ink-muted border-sand-200")
                        : "bg-white text-ink-muted border-sand-200 hover:border-sand-300"
                    }`}
                  >
                    {s === request.status ? <><CheckCircle2 size={9} className="inline mr-0.5" />{s.replace("_", " ")}</> : s.replace("_", " ")}
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

export default function AdminProfiles() {
  const [tab, setTab]           = useState<Tab>("partners");
  const [employees, setEmployees] = useState<UserResponse[]>([]);
  const [requests, setRequests]  = useState<RequestResponse[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [error, setError]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "staff") {
        const res = await employeesApi.list();
        setEmployees(res.employees);
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

  useEffect(() => { load(); }, [tab]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await requestsApi.updateStatus(id, status);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch {
      // Status update failed silently — UI remains unchanged
    }
  };

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRequests = requests.filter((r) =>
    r.requestor_name.toLowerCase().includes(search.toLowerCase()) ||
    r.requestor_email.toLowerCase().includes(search.toLowerCase()) ||
    r.event_city?.toLowerCase().includes(search.toLowerCase())
  );

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
              : `${requests.length} partner requests`}
          </p>
        </div>
        <button
          onClick={load}
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
          <UserCheck size={13} /> Community Partners
        </button>
        <button
          onClick={() => { setTab("staff"); setSearch(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "staff" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Users size={13} /> Staff Members
        </button>
      </div>

      {/* Search */}
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
                <StaffCard key={e.id} employee={e} />
              ))}
            </div>
          )
        )}

        {!loading && !error && tab === "partners" && (
          filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-ink-faint">
              <UserCheck size={28} className="mb-2 opacity-30" />
              <p className="text-sm">No requests found</p>
            </div>
          ) : (
            <div>
              {filteredRequests.map((r) => (
                <PartnerRow key={r.id} request={r} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
