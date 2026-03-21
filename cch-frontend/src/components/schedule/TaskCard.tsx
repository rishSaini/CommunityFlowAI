import { useState } from "react";
import {
  MapPin, Calendar, Users, Clock, ChevronDown, ChevronUp,
  CheckCircle2, Play, AlertCircle, Loader2, Circle,
} from "lucide-react";
import type { StaffTask, TaskStatus } from "../../types/index";

interface Props {
  task: StaffTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  textColor: string;
  bg: string;
  border: string;
}> = {
  pending:     { label: "Pending",     textColor: "text-clay-700",  bg: "bg-clay-50",  border: "border-clay-200"  },
  accepted:    { label: "Accepted",    textColor: "text-sage-700",  bg: "bg-sage-50",  border: "border-sage-200"  },
  in_progress: { label: "In Progress", textColor: "text-ink",       bg: "bg-sand-50",  border: "border-sand-300"  },
  complete:    { label: "Complete",    textColor: "text-sage-800",  bg: "bg-sage-50",  border: "border-sage-300"  },
  conflict:    { label: "Conflict",    textColor: "text-red-700",   bg: "bg-red-50",   border: "border-red-200"   },
};

const PRIORITY_STRIPE: Record<string, string> = {
  High:   "bg-clay-600",
  Medium: "bg-clay-400",
  Low:    "bg-sand-300",
};

const PRIORITY_LABEL: Record<string, string> = {
  High:   "text-clay-700 bg-clay-50 border-clay-200",
  Medium: "text-clay-600 bg-clay-50 border-clay-100",
  Low:    "text-ink-muted bg-sand-50 border-sand-200",
};

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "complete")    return <CheckCircle2 size={12} />;
  if (status === "in_progress") return <Loader2 size={12} className="animate-spin" />;
  if (status === "accepted")    return <Play size={12} />;
  if (status === "conflict")    return <AlertCircle size={12} />;
  return <Circle size={12} />;
}

export default function TaskCard({ task, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const cfg = STATUS_CONFIG[task.status];
  const date = new Date(task.eventDate + "T12:00:00");
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const nextAction: { label: string; to: TaskStatus } | null =
    task.status === "pending"     ? { label: "Accept Task",   to: "accepted"    } :
    task.status === "accepted"    ? { label: "Start Task",    to: "in_progress" } :
    task.status === "in_progress" ? { label: "Mark Complete", to: "complete"    } :
    null;

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden transition-all duration-200 hover:border-sand-300 hover:shadow-md">
      {/* Left priority stripe via flex row */}
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${PRIORITY_STRIPE[task.priority]}`} />
        <div className="flex-1 p-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink text-sm leading-tight truncate"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "16px" }}>
                {task.partnerName}
              </p>
              <p className="text-xs text-ink-muted mt-0.5 truncate">{task.location}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 border ${PRIORITY_LABEL[task.priority]}`}>
                {task.priority}
              </span>
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
                <StatusIcon status={task.status} />
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} className="text-ink-faint" /> {dateStr}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} className="text-ink-faint" /> {task.eventTime}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={11} className="text-ink-faint" /> {task.attendeeCount.toLocaleString()} attendees
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={11} className="text-ink-faint" /> {task.city}, {task.county}
            </span>
            {task.travelMinutes > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock size={11} className="text-clay-400" />
                <span className="text-clay-600">{task.travelMinutes} min drive</span>
              </span>
            )}
          </div>

          {/* Needs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.needs.map((n) => (
              <span key={n} className="text-[10px] bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 font-medium">
                {n}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {task.status !== "complete" && nextAction && (
              <button
                onClick={() => onStatusChange(task.id, nextAction.to)}
                className={`flex-1 py-2 text-xs font-semibold transition-all duration-150 ${
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
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sage-50 border border-sage-200 text-sage-700 text-xs font-semibold">
                <CheckCircle2 size={12} /> Completed
              </div>
            )}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="p-2 border border-sand-200 bg-paper hover:bg-sand-50 text-ink-muted transition-colors flex-shrink-0"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Notes */}
          {expanded && task.notes && (
            <div className="mt-3 pt-3 border-t border-sand-100 animate-fade-in">
              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1.5">Field Notes</p>
              <p className="text-xs text-ink-muted leading-relaxed">{task.notes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
