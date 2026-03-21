import { MapPin, Clock, Users } from "lucide-react";
import type { StaffTask } from "../../types/index";

interface Props {
  tasks: StaffTask[];
  availability: { day: number; startTime: string; endTime: string }[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PRIORITY_DOT: Record<string, string> = {
  High:   "bg-rose-500",
  Medium: "bg-amber-400",
  Low:    "bg-slate-400",
};

const STATUS_COLOR: Record<string, string> = {
  pending:     "border-amber-300 bg-amber-50",
  accepted:    "border-indigo-300 bg-indigo-50",
  in_progress: "border-blue-300 bg-blue-50",
  complete:    "border-emerald-300 bg-emerald-50",
  conflict:    "border-rose-300 bg-rose-50",
};

export default function WeeklySchedule({ tasks, availability }: Props) {
  // Build a 4-week window starting from today (March 21, 2026)
  const today = new Date("2026-03-21");
  const startOfWeek = new Date(today);
  // Roll back to Sunday
  startOfWeek.setDate(today.getDate() - today.getDay());

  // Build 4 weeks × 7 days
  const weeks: Date[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }

  const availDays = new Set(availability.map((a) => a.day));
  const todayStr  = today.toISOString().split("T")[0];

  // Map task date → tasks
  const tasksByDate: Record<string, StaffTask[]> = {};
  for (const t of tasks) {
    if (!tasksByDate[t.eventDate]) tasksByDate[t.eventDate] = [];
    tasksByDate[t.eventDate].push(t);
  }

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-bold py-1 rounded-lg ${
              availDays.has(i)
                ? "text-indigo-700 bg-indigo-50"
                : "text-slate-400 bg-slate-50"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((day) => {
            const dateStr  = day.toISOString().split("T")[0];
            const dayTasks = tasksByDate[dateStr] ?? [];
            const isToday  = dateStr === todayStr;
            const isPast   = dateStr < todayStr;
            const isAvail  = availDays.has(day.getDay());

            return (
              <div
                key={dateStr}
                className={`min-h-[72px] rounded-xl border p-1.5 transition-all duration-150 ${
                  isToday
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                    : dayTasks.length > 0
                    ? "border-slate-200 bg-white hover:shadow-sm"
                    : isAvail && !isPast
                    ? "border-dashed border-slate-200 bg-slate-50/50"
                    : "border-transparent bg-slate-50/30"
                }`}
              >
                {/* Date number */}
                <div className={`text-[10px] font-bold mb-1 leading-none ${
                  isToday ? "text-indigo-700" : isPast ? "text-slate-300" : isAvail ? "text-slate-600" : "text-slate-300"
                }`}>
                  {day.getDate()}
                </div>

                {/* Tasks */}
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`mb-1 rounded-lg border px-1.5 py-1 ${STATUS_COLOR[t.status]}`}
                    title={`${t.partnerName} · ${t.eventTime} · ${t.city}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                      <p className="text-[9px] font-bold text-slate-700 truncate leading-tight">{t.partnerName.split(" ")[0]}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      <Clock size={8} />{t.eventTime}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate">
                      <MapPin size={8} />{t.city}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      <Users size={8} />{t.attendeeCount}
                    </div>
                  </div>
                ))}

                {/* Available but empty */}
                {dayTasks.length === 0 && isAvail && !isPast && (
                  <div className="flex items-center justify-center h-8">
                    <span className="text-[8px] text-slate-300 font-medium">available</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend</p>
        {[
          { label: "Pending",     color: "border-amber-300 bg-amber-50"   },
          { label: "Accepted",    color: "border-indigo-300 bg-indigo-50" },
          { label: "In Progress", color: "border-blue-300 bg-blue-50"     },
          { label: "Complete",    color: "border-emerald-300 bg-emerald-50"},
        ].map(({ label, color }) => (
          <span key={label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${color} text-slate-600`}>
            {label}
          </span>
        ))}
        <span className="text-[10px] text-slate-400 ml-auto">
          Showing {DAY_FULL[availability[0]?.day ?? 1]}–{DAY_FULL[availability[availability.length - 1]?.day ?? 5]} availability
        </span>
      </div>
    </div>
  );
}
