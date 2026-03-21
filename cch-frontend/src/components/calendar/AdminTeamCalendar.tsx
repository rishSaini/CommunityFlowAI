import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Calendar, Sparkles, RefreshCw,
  Clock, Users, MapPin, Loader2, AlertTriangle, Check,
  GripVertical, Plus, X, Zap,
} from "lucide-react";
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  type DragStartEvent, type DragEndEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { scheduleApi, requestsApi, dispatchApi } from "../../lib/api";
import type {
  ShiftAssignment, ShiftTemplate, CalendarEmployee, CalendarTask,
  CoverageCell, AIScheduleSuggestion, RequestResponse,
} from "../../types/index";

// ── Constants ────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6AM - 9PM
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const URGENCY_COLORS: Record<string, string> = {
  critical: "bg-red-100 border-red-300 text-red-800",
  high: "bg-orange-100 border-orange-300 text-orange-800",
  medium: "bg-blue-100 border-blue-300 text-blue-800",
  low: "bg-green-100 border-green-300 text-green-800",
};

const COVERAGE_COLORS: Record<string, string> = {
  over: "bg-emerald-200",
  balanced: "bg-emerald-100",
  under: "bg-amber-200",
  critical: "bg-red-200",
};

// ── Helper ───────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function parseHour(hhmm: string): number {
  return parseInt(hhmm.split(":")[0], 10);
}

// ── Draggable shift block ────────────────────────────────────────────────

function ShiftBlock({ shift, compact }: { shift: ShiftAssignment; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: { type: "shift", shift },
  });

  const startH = parseHour(shift.start_time);
  const endH = parseHour(shift.end_time);
  const span = Math.max(endH - startH, 1);

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`text-[9px] px-1.5 py-0.5 rounded-md border truncate cursor-grab ${isDragging ? "opacity-40" : ""}`}
        style={{ backgroundColor: shift.color ? `${shift.color}20` : "#e0e7ff", borderColor: shift.color || "#6366f1" }}
        title={`${shift.user_name}: ${shift.start_time}–${shift.end_time}`}
      >
        <span className="font-semibold">{shift.start_time}–{shift.end_time}</span>
        {shift.request_name && <span className="ml-1 opacity-70">· {shift.request_name}</span>}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute left-0 right-0 mx-0.5 rounded-lg border px-1.5 py-1 cursor-grab overflow-hidden transition-shadow hover:shadow-md ${isDragging ? "opacity-40 ring-2 ring-indigo-400" : ""}`}
      style={{
        top: `${(startH - 6) * 40}px`,
        height: `${span * 40 - 2}px`,
        backgroundColor: shift.color ? `${shift.color}15` : "#eef2ff",
        borderColor: shift.color || "#6366f1",
        borderLeftWidth: 3,
      }}
    >
      <div className="flex items-center gap-1">
        <GripVertical size={8} className="text-slate-400 flex-shrink-0" />
        <span className="text-[9px] font-bold truncate" style={{ color: shift.color || "#4f46e5" }}>
          {shift.start_time}–{shift.end_time}
        </span>
      </div>
      {span >= 2 && shift.shift_type !== "regular" && (
        <span className="text-[8px] px-1 py-0.5 rounded bg-white/60 text-slate-600 mt-0.5 inline-block">
          {shift.shift_type}
        </span>
      )}
      {span >= 3 && shift.request_name && (
        <p className="text-[8px] text-slate-500 mt-0.5 truncate">{shift.request_name}</p>
      )}
      {span >= 3 && shift.location_name && (
        <p className="text-[8px] text-slate-400 truncate flex items-center gap-0.5">
          <MapPin size={7} />{shift.location_name}
        </p>
      )}
    </div>
  );
}

// ── Draggable request card ───────────────────────────────────────────────

function DraggableRequest({ request }: { request: RequestResponse }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `request-${request.id}`,
    data: { type: "request", request },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`border rounded-xl p-2.5 cursor-grab transition-all hover:shadow-md ${isDragging ? "opacity-40 ring-2 ring-sage-400" : "bg-white"} ${URGENCY_COLORS[request.urgency_level] || "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{request.event_name}</p>
        {request.ai_priority_score != null && (
          <span className="text-[9px] font-black bg-white/80 px-1 py-0.5 rounded text-slate-700 flex-shrink-0">
            {Math.round(request.ai_priority_score)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
        <span className="flex items-center gap-0.5"><Calendar size={8} />{request.event_date}</span>
        <span className="flex items-center gap-0.5"><MapPin size={8} />{request.event_city}</span>
      </div>
      {request.estimated_attendees && (
        <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5">
          <Users size={8} />{request.estimated_attendees} attendees
        </span>
      )}
    </div>
  );
}

// ── Draggable template chip ──────────────────────────────────────────────

function DraggableTemplate({ template }: { template: ShiftTemplate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: { type: "template", template },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-grab border transition-all hover:shadow-sm ${isDragging ? "opacity-40" : ""}`}
      style={{ borderColor: template.color, color: template.color, backgroundColor: `${template.color}10` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: template.color }} />
      {template.name}
      <span className="text-[9px] opacity-60">{template.start_time}–{template.end_time}</span>
    </div>
  );
}

// ── Droppable cell ───────────────────────────────────────────────────────

function DroppableCell({ id, children }: { id: string; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[40px] border-b border-r border-slate-100 transition-colors ${isOver ? "bg-indigo-50/60" : ""}`}
    >
      {children}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function AdminTeamCalendar() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date("2026-03-21")));
  const [shifts, setShifts]           = useState<ShiftAssignment[]>([]);
  const [tasks, setTasks]             = useState<CalendarTask[]>([]);
  const [employees, setEmployees]     = useState<CalendarEmployee[]>([]);
  const [templates, setTemplates]     = useState<ShiftTemplate[]>([]);
  const [coverage, setCoverage]       = useState<CoverageCell[]>([]);
  const [pendingReqs, setPendingReqs] = useState<RequestResponse[]>([]);
  const [suggestions, setSuggestions] = useState<AIScheduleSuggestion[]>([]);
  const [aiNarrative, setAiNarrative] = useState("");
  const [loading, setLoading]         = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showAI, setShowAI]           = useState(false);
  const [activeDrag, setActiveDrag]   = useState<DragStartEvent["active"] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ── Data Loading ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const start = formatDate(weekStart);
    const end = formatDate(weekEnd);
    try {
      const [cal, tmpl, cov, reqs] = await Promise.all([
        scheduleApi.getTeamCalendar(start, end),
        scheduleApi.getTemplates(),
        scheduleApi.getCoverage(start, end),
        requestsApi.list(1, 100),
      ]);
      setShifts(cal.shifts);
      setTasks(cal.tasks);
      setEmployees(cal.employees);
      setTemplates(tmpl);
      setCoverage(cov.cells);
      setPendingReqs(reqs.requests.filter((r: RequestResponse) =>
        ["submitted", "in_review", "approved"].includes(r.status)
      ));
    } catch (err) {
      console.error("Calendar load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Week Navigation ──────────────────────────────────────────────────

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(getMonday(new Date("2026-03-21")));

  // ── Generate Schedule ────────────────────────────────────────────────

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await scheduleApi.generate(formatDate(weekStart), formatDate(weekEnd));
      alert(`Generated ${res.created} shifts (${res.skipped} skipped).`);
      loadData();
    } catch (err) {
      console.error("Generate failed:", err);
    }
  };

  // ── AI Suggestions ───────────────────────────────────────────────────

  const handleAISuggest = async () => {
    setShowAI(true);
    try {
      const res = await scheduleApi.getAISuggestions(formatDate(weekStart), formatDate(weekEnd));
      setSuggestions(res.suggestions);
      setAiNarrative(res.narrative);
    } catch (err) {
      console.error("AI suggest failed:", err);
    }
  };

  const acceptSuggestion = async (s: AIScheduleSuggestion) => {
    try {
      await scheduleApi.createShift({
        user_id: s.user_id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
      });
      setSuggestions((prev) => prev.filter((x) => x !== s));
      loadData();
    } catch (err) {
      console.error("Accept suggestion failed:", err);
    }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => setActiveDrag(event.active);
  const handleDragCancel = () => setActiveDrag(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const overParts = (over.id as string).split("-");
    // Cell format: "cell-{employeeId}-{dateStr}"
    if (overParts[0] !== "cell") return;
    const targetEmployeeId = overParts[1];
    const targetDate = overParts.slice(2).join("-"); // handles YYYY-MM-DD

    const dragData = active.data.current;
    if (!dragData) return;

    try {
      if (dragData.type === "shift") {
        // Move existing shift
        const shift = dragData.shift as ShiftAssignment;
        await scheduleApi.updateShift(shift.id, {
          user_id: targetEmployeeId,
          date: targetDate,
        });
        loadData();
      } else if (dragData.type === "template") {
        // Create new shift from template
        const tmpl = dragData.template as ShiftTemplate;
        await scheduleApi.createShift({
          user_id: targetEmployeeId,
          date: targetDate,
          start_time: tmpl.start_time,
          end_time: tmpl.end_time,
          color: tmpl.color,
        });
        loadData();
      } else if (dragData.type === "request") {
        // Dispatch request to employee + create shift
        const request = dragData.request as RequestResponse;
        const eventTime = request.event_time || "09:00";
        const startH = parseInt(eventTime.split(":")[0], 10);
        const endH = Math.min(startH + 4, 22);

        await scheduleApi.createShift({
          user_id: targetEmployeeId,
          date: targetDate,
          start_time: `${String(startH).padStart(2, "0")}:00`,
          end_time: `${String(endH).padStart(2, "0")}:00`,
          request_id: request.id,
        });

        // Also dispatch the request
        try {
          await dispatchApi.assignTeam(request.id, targetEmployeeId);
        } catch {
          // Dispatch might fail if already dispatched — shift was still created
        }

        loadData();
      }
    } catch (err) {
      console.error("Drag-drop action failed:", err);
    }
  };

  // ── Coverage for a specific day ──────────────────────────────────────

  const getDayCoverage = (dateStr: string) => {
    const dayCells = coverage.filter((c) => c.date === dateStr);
    if (dayCells.length === 0) return "balanced";
    const hasGap = dayCells.some((c) => c.level === "critical" || c.level === "under");
    if (hasGap) return "under";
    return "balanced";
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink flex items-center gap-2.5"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            <Calendar size={20} className="text-sage-600" />
            Team Schedule
          </h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Drag shifts, templates, or requests onto the calendar
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleAISuggest}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors">
            <Sparkles size={11} /> AI Suggestions
          </button>
          <button onClick={loadData}
            className="flex items-center gap-1.5 text-[11px] text-ink-muted border border-sand-200 px-3 py-2 rounded-xl hover:bg-sand-50 transition-colors">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Week navigation ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors">
          <ChevronLeft size={16} className="text-ink-muted" />
        </button>
        <button onClick={goToday} className="text-xs font-semibold text-ink-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-sand-100 transition-colors">
          Today
        </button>
        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors">
          <ChevronRight size={16} className="text-ink-muted" />
        </button>
        <h3 className="text-sm font-semibold text-ink ml-1">
          {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </h3>
      </div>

      {/* ── Template palette ───────────────────────────────────────────── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Templates:</span>
          {templates.map((t) => <DraggableTemplate key={t.id} template={t} />)}
        </div>

        {/* ── Main grid + sidebar ────────────────────────────────────── */}
        <div className="flex gap-4">

          {/* Calendar grid */}
          <div className="flex-1 bg-white/80 backdrop-blur-sm border border-sand-200 rounded-2xl overflow-hidden shadow-sm">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={20} className="animate-spin text-ink-muted" />
              </div>
            )}

            {!loading && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-sand-50 border-b border-r border-sand-200 px-3 py-2 text-left text-[10px] font-bold text-ink-muted uppercase tracking-wider w-[140px]">
                        Employee
                      </th>
                      {weekDays.map((day, i) => {
                        const dateStr = formatDate(day);
                        const isToday = dateStr === "2026-03-21";
                        const cov = getDayCoverage(dateStr);
                        return (
                          <th key={dateStr} className={`border-b border-sand-200 px-2 py-2 text-center min-w-[120px] ${isToday ? "bg-indigo-50" : "bg-sand-50"}`}>
                            <div className={`text-[11px] font-bold ${isToday ? "text-indigo-700" : "text-ink"}`}>
                              {DAY_LABELS[i]}
                            </div>
                            <div className={`text-[10px] ${isToday ? "text-indigo-500" : "text-ink-muted"}`}>
                              {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                            {showCoverage && (
                              <div className={`mt-1 h-1.5 rounded-full ${cov === "under" ? "bg-red-300" : "bg-emerald-200"}`} />
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const empShifts = shifts.filter((s) => s.user_id === emp.id);
                      const empTasks = tasks.filter((t) =>
                        t.assigned_users.some((u) => u.user_id === emp.id)
                      );

                      return (
                        <tr key={emp.id} className="border-b border-sand-100 hover:bg-sand-50/30">
                          {/* Employee label */}
                          <td className="sticky left-0 z-10 bg-white border-r border-sand-200 px-3 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-sage-50 border border-sage-100 flex items-center justify-center text-[10px] font-bold text-sage-700 flex-shrink-0"
                                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                                {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold text-ink truncate max-w-[80px]">
                                  {emp.full_name.split(" ")[0]}
                                </p>
                                <p className="text-[9px] text-ink-faint">{emp.classification_display || emp.classification}</p>
                                <p className="text-[9px] text-ink-faint">{emp.current_workload}/{emp.max_workload} load</p>
                              </div>
                            </div>
                          </td>

                          {/* Day cells */}
                          {weekDays.map((day) => {
                            const dateStr = formatDate(day);
                            const dayShifts = empShifts.filter((s) => s.date === dateStr);
                            const dayTasks = empTasks.filter((t) => t.event_date === dateStr);
                            const cellId = `cell-${emp.id}-${dateStr}`;
                            const isToday = dateStr === "2026-03-21";

                            return (
                              <td key={dateStr} className={`border-r border-sand-100 align-top p-0 ${isToday ? "bg-indigo-50/30" : ""}`}>
                                <DroppableCell id={cellId}>
                                  <div className="p-1 space-y-0.5 min-h-[80px]">
                                    {dayShifts.map((s) => (
                                      <ShiftBlock key={s.id} shift={s} compact />
                                    ))}
                                    {dayTasks.map((t) => (
                                      <div key={t.request_id}
                                        className={`text-[9px] px-1.5 py-0.5 rounded-md border truncate ${URGENCY_COLORS[t.urgency_level] || "bg-slate-50 border-slate-200"}`}
                                        title={`${t.event_name} · ${t.event_time || "TBD"} · ${t.event_city}`}
                                      >
                                        <span className="font-bold">{t.event_time || "TBD"}</span>
                                        <span className="ml-1">{t.event_name.length > 20 ? t.event_name.slice(0, 18) + "..." : t.event_name}</span>
                                      </div>
                                    ))}
                                    {dayShifts.length === 0 && dayTasks.length === 0 && (
                                      <div className="flex items-center justify-center h-[70px]">
                                        <Plus size={10} className="text-slate-200" />
                                      </div>
                                    )}
                                  </div>
                                </DroppableCell>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Coverage row */}
                    {showCoverage && (
                      <tr className="bg-sand-50">
                        <td className="sticky left-0 z-10 bg-sand-50 border-r border-sand-200 px-3 py-2 text-[10px] font-bold text-ink-muted uppercase">
                          Coverage
                        </td>
                        {weekDays.map((day) => {
                          const dateStr = formatDate(day);
                          const dayCells = coverage.filter((c) => c.date === dateStr);
                          const totalStaff = dayCells.reduce((s, c) => s + c.scheduled_count, 0);
                          const totalTasks = dayCells.reduce((s, c) => s + c.task_count, 0);
                          const level = getDayCoverage(dateStr);

                          return (
                            <td key={dateStr} className="border-r border-sand-200 px-2 py-2 text-center">
                              <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                level === "under" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {totalStaff}/{totalTasks}
                                <span className="text-[8px] opacity-60">staff/tasks</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Right sidebar: Pending Requests ──────────────────────── */}
          <div className="w-[240px] flex-shrink-0 space-y-3">
            <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-2xl p-3 shadow-sm">
              <h4 className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={10} /> Pending Requests
              </h4>
              <p className="text-[10px] text-ink-faint mb-3">
                Drag onto the calendar to dispatch + schedule
              </p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scroll">
                {pendingReqs.length === 0 && (
                  <p className="text-[10px] text-ink-faint text-center py-4">No pending requests</p>
                )}
                {pendingReqs.slice(0, 15).map((r) => (
                  <DraggableRequest key={r.id} request={r} />
                ))}
              </div>
            </div>

            {/* AI Suggestions panel */}
            {showAI && (
              <div className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={10} /> AI Suggestions
                  </h4>
                  <button onClick={() => setShowAI(false)} className="text-indigo-400 hover:text-indigo-600">
                    <X size={12} />
                  </button>
                </div>
                {aiNarrative && (
                  <p className="text-[10px] text-indigo-600 mb-3 leading-relaxed">{aiNarrative}</p>
                )}
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <div key={i} className="bg-white border border-indigo-100 rounded-xl p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-ink">{s.user_name}</p>
                        <span className="text-[9px] font-bold text-indigo-600">{Math.round(s.confidence * 100)}%</span>
                      </div>
                      <p className="text-[9px] text-ink-muted mt-0.5">{s.date} · {s.start_time}–{s.end_time}</p>
                      <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">{s.reason}</p>
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => acceptSuggestion(s)}
                          className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                          <Check size={8} /> Accept
                        </button>
                        <button onClick={() => setSuggestions((p) => p.filter((x) => x !== s))}
                          className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                  {suggestions.length === 0 && (
                    <p className="text-[10px] text-indigo-500 text-center py-2">
                      {aiNarrative ? "No suggestions needed!" : "Loading..."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDrag?.data.current?.type === "shift" && (
            <div className="bg-white border-2 border-indigo-400 rounded-lg px-3 py-2 shadow-xl text-[10px] font-semibold text-indigo-700">
              {(activeDrag.data.current.shift as ShiftAssignment).user_name}: {(activeDrag.data.current.shift as ShiftAssignment).start_time}–{(activeDrag.data.current.shift as ShiftAssignment).end_time}
            </div>
          )}
          {activeDrag?.data.current?.type === "template" && (
            <div className="bg-white border-2 border-sage-400 rounded-lg px-3 py-2 shadow-xl text-[10px] font-semibold text-sage-700">
              {(activeDrag.data.current.template as ShiftTemplate).name}: {(activeDrag.data.current.template as ShiftTemplate).start_time}–{(activeDrag.data.current.template as ShiftTemplate).end_time}
            </div>
          )}
          {activeDrag?.data.current?.type === "request" && (
            <div className="bg-white border-2 border-clay-400 rounded-lg px-3 py-2 shadow-xl text-[10px] font-semibold text-clay-700 max-w-[200px]">
              {(activeDrag.data.current.request as RequestResponse).event_name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
