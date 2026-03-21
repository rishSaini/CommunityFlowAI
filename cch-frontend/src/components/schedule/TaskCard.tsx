import { useState } from "react";
import {
  MapPin, Calendar, Users, Clock,
  CheckCircle2, Play, AlertCircle, Loader2, Circle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import type { StaffTask, TaskStatus } from "../../types/index";

interface Props {
  task: StaffTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; textColor: string; bg: string; dot: string }> = {
  pending:     { label: "Pending",     textColor: "text-clay-700",  bg: "bg-clay-50",   dot: "bg-clay-500"  },
  accepted:    { label: "Accepted",    textColor: "text-sage-700",  bg: "bg-sage-50",   dot: "bg-sage-500"  },
  in_progress: { label: "In Progress", textColor: "text-sky-700",   bg: "bg-sky-50",    dot: "bg-sky-500"   },
  complete:    { label: "Complete",    textColor: "text-sage-800",  bg: "bg-sage-50",   dot: "bg-sage-600"  },
  conflict:    { label: "Conflict",    textColor: "text-red-700",   bg: "bg-red-50",    dot: "bg-red-500"   },
};

const PRIORITY_LEFT: Record<string, string> = {
  High:   "bg-clay-500",
  Medium: "bg-clay-300",
  Low:    "bg-sand-300",
};

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "complete")    return <CheckCircle2 size={11} />;
  if (status === "in_progress") return <Loader2 size={11} className="animate-spin" />;
  if (status === "accepted")    return <Play size={11} />;
  if (status === "conflict")    return <AlertCircle size={11} />;
  return <Circle size={11} />;
}

export default function TaskCard({ task, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const cfg = STATUS_CONFIG[task.status];
  const date = new Date(task.eventDate + "T12:00:00");
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const nextAction: { label: string; to: TaskStatus } | null =
    task.status === "pending"     ? { label: "Accept",       to: "accepted"    } :
    task.status === "accepted"    ? { label: "Start",        to: "in_progress" } :
    task.status === "in_progress" ? { label: "Mark Complete", to: "complete"   } :
    null;

  return (
    <div className={`bg-white border border-sand-200 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm hover:border-sand-300 ${task.status === "complete" ? "opacity-60" : ""}`}>
      <div className="flex">
        {/* Priority stripe */}
        <div className={`w-[3px] flex-shrink-0 ${PRIORITY_LEFT[task.priority]}`} />

        <div className="flex-1 px-4 py-3">

          {/* Row 1: name + status badge */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="font-semibold text-ink text-sm leading-tight truncate"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "15px" }}>
              {task.partnerName}
            </p>
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.textColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              <StatusIcon status={task.status} />
              {cfg.label}
            </span>
          </div>

          {/* Row 2: compact meta — single line */}
          <div className="flex items-center gap-3 text-[11px] text-ink-muted mb-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={10} className="text-ink-faint" />{dateStr}
            </span>
            {task.eventTime && (
              <span className="flex items-center gap-1">
                <Clock size={10} className="text-ink-faint" />{task.eventTime}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-ink-faint" />{task.city}
            </span>
            <span className="flex items-center gap-1">
              <Users size={10} className="text-ink-faint" />{task.attendeeCount.toLocaleString()}
            </span>
            {task.travelMinutes > 0 && (
              <span className="text-clay-500">{task.travelMinutes} min</span>
            )}
          </div>

          {/* Row 3: action + expand */}
          <div className="flex items-center gap-2">
            {nextAction && task.status !== "complete" && (
              <button
                onClick={() => onStatusChange(task.id, nextAction.to)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  nextAction.to === "complete"
                    ? "bg-sage-800 text-paper hover:bg-sage-900"
                    : nextAction.to === "in_progress"
                    ? "bg-ink text-paper hover:bg-sage-900"
                    : "bg-sage-600 text-paper hover:bg-sage-700"
                }`}
              >
                {nextAction.label}
              </button>
            )}
            {task.status === "complete" && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-sage-50 text-sage-700 text-xs font-semibold">
                <CheckCircle2 size={11} /> Done
              </div>
            )}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="px-3 py-1.5 rounded-xl border border-sand-200 bg-paper hover:bg-sand-50 text-ink-muted transition-colors text-[11px] flex items-center gap-1"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {!expanded && <span className="text-[10px]">Details</span>}
            </button>
          </div>

          {/* Expanded: needs + notes */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-sand-100 animate-fade-in space-y-2.5">
              {task.location && (
                <div>
                  <p className="text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Location</p>
                  <p className="text-xs text-ink-muted">{task.location}</p>
                </div>
              )}
              {task.needs.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1.5">Resources</p>
                  <div className="flex flex-wrap gap-1">
                    {task.needs.map((n) => (
                      <span key={n} className="text-[10px] bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 rounded-full font-medium">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {task.notes && (
                <div>
                  <p className="text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-xs text-ink-muted leading-relaxed">{task.notes}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
