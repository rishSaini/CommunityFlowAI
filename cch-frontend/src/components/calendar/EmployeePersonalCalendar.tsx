import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  Users, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { scheduleApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { ShiftAssignment, CalendarTask } from "../../types/index";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const URGENCY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-blue-400",
  low: "bg-emerald-400",
};

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

export default function EmployeePersonalCalendar() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date("2026-03-21")));
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [tasks, setTasks]   = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(false);

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scheduleApi.getMyCalendar(formatDate(weekStart), formatDate(weekEnd));
      setShifts(data.shifts);
      setTasks(data.tasks as CalendarTask[]);
    } catch (err) {
      console.error("Failed to load personal calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="animate-fade-in bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-sand-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={14} className="text-sage-600" />
          <div>
            <h3 className="font-semibold text-ink text-sm">
              {user ? `${user.full_name.split(" ")[0]}'s Schedule` : "My Schedule"}
            </h3>
            <p className="text-[11px] text-ink-muted">
              {user?.classification_display || "Your shifts and assigned tasks"}
              {shifts.length > 0 && ` · ${shifts.length} shifts`}
              {tasks.length > 0 && ` · ${tasks.length} tasks`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1 rounded hover:bg-sand-100">
            <ChevronLeft size={14} className="text-ink-muted" />
          </button>
          <span className="text-xs font-semibold text-ink min-w-[180px] text-center">
            {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </span>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-sand-100">
            <ChevronRight size={14} className="text-ink-muted" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      )}

      {!loading && (
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {weekDays.map((day, i) => {
              const dateStr = formatDate(day);
              const isToday = dateStr === "2026-03-21";
              return (
                <div key={dateStr}
                  className={`text-center py-1.5 rounded-xl text-[11px] font-bold ${
                    isToday ? "bg-indigo-100 text-indigo-700" : "bg-sand-50 text-ink-muted"
                  }`}>
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-[10px] font-medium mt-0.5">{day.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => {
              const dateStr = formatDate(day);
              const isToday = dateStr === "2026-03-21";
              const dayShifts = shifts.filter((s) => s.date === dateStr);
              const dayTasks = tasks.filter((t) => t.event_date === dateStr);
              const hasWork = dayShifts.length > 0 || dayTasks.length > 0;

              return (
                <div key={dateStr}
                  className={`min-h-[120px] rounded-xl border p-2 transition-all ${
                    isToday
                      ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200"
                      : hasWork
                      ? "border-sand-200 bg-white"
                      : "border-dashed border-sand-200 bg-sand-50/30"
                  }`}>

                  {/* Shifts */}
                  {dayShifts.map((s) => (
                    <div key={s.id}
                      className="mb-1.5 rounded-lg border px-2 py-1.5"
                      style={{
                        borderColor: s.color || "#6366f1",
                        borderLeftWidth: 3,
                        backgroundColor: s.color ? `${s.color}10` : "#eef2ff",
                      }}>
                      <div className="flex items-center gap-1">
                        <Clock size={8} className="text-slate-400" />
                        <span className="text-[10px] font-bold" style={{ color: s.color || "#4f46e5" }}>
                          {s.start_time}–{s.end_time}
                        </span>
                      </div>
                      {s.location_name && (
                        <p className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                          <MapPin size={7} />{s.location_name}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Tasks */}
                  {dayTasks.map((t) => (
                    <div key={t.request_id}
                      className="mb-1.5 rounded-lg border border-sage-200 bg-sage-50/50 px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[t.urgency_level] || "bg-slate-300"}`} />
                        <p className="text-[10px] font-bold text-ink truncate">{t.event_name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-ink-muted">
                        {t.event_time && <span className="flex items-center gap-0.5"><Clock size={7} />{t.event_time}</span>}
                        <span className="flex items-center gap-0.5"><MapPin size={7} />{t.event_city}</span>
                      </div>
                    </div>
                  ))}

                  {/* Empty state */}
                  {!hasWork && (
                    <div className="flex flex-col items-center justify-center h-[80px] text-slate-300">
                      <CheckCircle2 size={14} className="mb-1" />
                      <span className="text-[8px]">Free</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-sand-100">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Legend</span>
            <span className="flex items-center gap-1 text-[10px] text-ink-muted">
              <span className="w-4 h-1.5 rounded border-l-[3px] border-indigo-500 bg-indigo-50" /> Shift
            </span>
            <span className="flex items-center gap-1 text-[10px] text-ink-muted">
              <span className="w-4 h-1.5 rounded border border-sage-300 bg-sage-50" /> Task
            </span>
            {Object.entries(URGENCY_DOT).map(([level, color]) => (
              <span key={level} className="flex items-center gap-1 text-[10px] text-ink-muted capitalize">
                <span className={`w-1.5 h-1.5 rounded-full ${color}`} /> {level}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
