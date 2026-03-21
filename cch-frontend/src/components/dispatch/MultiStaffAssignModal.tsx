import { useState, useEffect } from "react";
import {
  X, Search, Users, Star, MapPin, CheckCircle2,
  Loader2, UserPlus,
} from "lucide-react";
import { employeesApi, dispatchApi } from "../../lib/api";
import type { UserResponse, RequestResponse } from "../../lib/api";

interface Props {
  request: RequestResponse;
  onClose: () => void;
  onAssigned: () => void;
  mode?: "dispatch" | "add"; // "dispatch" = full dispatch, "add" = add to existing team
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  FT_W2: "bg-blue-50 text-blue-700 border-blue-200",
  PT_W2: "bg-cyan-50 text-cyan-700 border-cyan-200",
  ON_CALL: "bg-purple-50 text-purple-700 border-purple-200",
  CONTRACTOR_1099: "bg-amber-50 text-amber-700 border-amber-200",
  VOLUNTEER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OUTSIDE_HELP: "bg-slate-50 text-slate-500 border-slate-200",
};

type Role = "primary" | "support" | "observer";

export default function MultiStaffAssignModal({ request, onClose, onAssigned, mode = "dispatch" }: Props) {
  const [employees, setEmployees] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, Role>>(new Map());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    employeesApi.list().then((data) => {
      const list = Array.isArray(data) ? data : (data as { employees: UserResponse[] }).employees || [];
      setEmployees(list.filter((e) => e.is_active && e.classification !== "OUTSIDE_HELP"));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleEmployee = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // First selected is primary, rest are support
        next.set(id, next.size === 0 ? "primary" : "support");
      }
      return next;
    });
  };

  const setRole = (id: string, role: Role) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(id, role);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);

    const ids = Array.from(selected.keys());
    const roles: Record<string, string> = {};
    selected.forEach((role, id) => { roles[id] = role; });

    try {
      if (mode === "dispatch") {
        // Find the primary or use first
        const primaryId = ids.find((id) => selected.get(id) === "primary") || ids[0];
        const additionalIds = ids.filter((id) => id !== primaryId);
        await dispatchApi.assignTeam(request.id, primaryId, additionalIds, roles);
      } else {
        await dispatchApi.addTeamMembers(request.id, ids, roles);
      }
      onAssigned();
      onClose();
    } catch (err) {
      console.error("Assignment failed:", err);
      alert("Assignment failed. The request may already be dispatched.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.classification_display || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-sand-200 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-sand-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink text-sm flex items-center gap-2">
              <UserPlus size={14} className="text-sage-600" />
              {mode === "dispatch" ? "Assign Team" : "Add Team Members"}
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5 max-w-[300px] truncate">
              {request.event_name} · {request.event_date} · {request.event_city}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors">
            <X size={14} className="text-ink-muted" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-sand-100">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name or classification..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-sand-200 bg-sand-50 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-sage-600 transition"
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-ink-muted" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-ink-faint text-xs">No staff members found</div>
          )}

          {!loading && filtered.map((emp) => {
            const isSelected = selected.has(emp.id);
            const role = selected.get(emp.id);
            const classColor = CLASSIFICATION_COLORS[emp.classification || ""] || "bg-slate-50 text-slate-600 border-slate-200";

            return (
              <div key={emp.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-1 ${
                  isSelected
                    ? "bg-sage-50 border border-sage-200 ring-1 ring-sage-100"
                    : "hover:bg-sand-50 border border-transparent"
                }`}
                onClick={() => toggleEmployee(emp.id)}>

                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? "bg-sage-600 border-sage-600" : "border-sand-300"
                }`}>
                  {isSelected && <CheckCircle2 size={11} className="text-white" />}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-sage-50 border border-sage-100 flex items-center justify-center text-[10px] font-bold text-sage-700 flex-shrink-0"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                  {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-ink truncate">{emp.full_name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${classColor}`}>
                      {emp.classification_display || emp.classification}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-muted">
                    <span>{emp.is_on_duty ? "On Duty" : "Off Duty"}</span>
                  </div>
                </div>

                {/* Role selector (when selected) */}
                {isSelected && (
                  <select
                    value={role}
                    onChange={(e) => { e.stopPropagation(); setRole(emp.id, e.target.value as Role); }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-sage-200 bg-white text-sage-700 focus:outline-none"
                  >
                    <option value="primary">Primary</option>
                    <option value="support">Support</option>
                    <option value="observer">Observer</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes + Submit */}
        <div className="px-6 py-4 border-t border-sand-100 space-y-3">
          {selected.size > 0 && (
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the team..."
              className="w-full px-3 py-2 rounded-xl border border-sand-200 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-sage-600 transition"
            />
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              {selected.size === 0
                ? "Select staff members to assign"
                : `${selected.size} staff member${selected.size !== 1 ? "s" : ""} selected`}
            </p>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-sand-200 text-ink-muted hover:bg-sand-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={selected.size === 0 || submitting}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-sage-700 text-white hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                {submitting && <Loader2 size={11} className="animate-spin" />}
                <Users size={11} />
                {mode === "dispatch" ? `Assign ${selected.size} Staff` : `Add ${selected.size} Members`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
