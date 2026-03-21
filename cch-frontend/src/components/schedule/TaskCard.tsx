import { useState } from "react";
import {
  MapPin, Calendar, Users, Clock,
  CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import type { StaffTask, TaskStatus } from "../../types/index";

interface Props {
  task: StaffTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const STATUS_DOT: Record<TaskStatus, string> = {
  pending:     "bg-clay-400",
  accepted:    "bg-sage-500",
  in_progress: "bg-sky-500",
  complete:    "bg-sage-600",
  conflict:    "bg-red-500",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending:     "Pending",
  accepted:    "Accepted",
  in_progress: "In Progress",
  complete:    "Complete",
  conflict:    "Conflict",
};

const PRIORITY_STRIPE: Record<string, string> = {
  High:   "bg-clay-500",
  Medium: "bg-clay-300",
  Low:    "bg-sand-300",
};

const ACTION: Record<string, { label: string; to: TaskStatus; style: string } | null> = {
  pending:     { label: "Accept",         to: "accepted",    style: "bg-sage-600 hover:bg-sage-700 text-paper"  },
  accepted:    { label: "Start",          to: "in_progress", style: "bg-ink hover:bg-sage-900 text-paper"       },
  in_progress: { label: "Mark Complete",  to: "complete",    style: "bg-sage-800 hover:bg-sage-900 text-paper"  },
  complete:    null,
  conflict:    null,
};

export default function TaskCard({ task, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const date    = new Date(task.eventDate + "T12:00:00");
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const action  = ACTION[task.status];

  return (
    <div className={`bg-white border border-sand-200 rounded-xl overflow-hidden transition-all duration-150 hover:border-sand-300 ${task.status === "complete" ? "opacity-55" : ""}`}>
      <div className="flex">
        <div className={`w-[3px] flex-shrink-0 ${PRIORITY_STRIPE[task.priority]}`} />

        <div className="flex-1 px-3.5 py-2.5">

          {/* Single dense row */}
          <div className="flex items-center gap-2 min-w-0">

            {/* Status dot */}
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[task.status]}`} />

            {/* Name */}
            <p className="font-semibold text-ink text-sm truncate flex-1 min-w-0"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {task.partnerName}
            </p>

            {/* Compact meta chips */}
            <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] text-ink-muted">
              <span className="flex items-center gap-0.5">
                <Calendar size={9} className="text-ink-faint" />{dateStr}
              </span>
              {task.eventTime && (
                <span className="flex items-center gap-0.5">
                  <Clock size={9} className="text-ink-faint" />{task.eventTime}
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <MapPin size={9} className="text-ink-faint" />{task.city}
              </span>
              <span className="flex items-center gap-0.5">
                <Users size={9} className="text-ink-faint" />{task.attendeeCount}
              </span>
              {task.travelMinutes > 0 && (
                <span className="text-clay-400">{task.travelMinutes}m</span>
              )}
            </div>

            {/* Action button */}
            {action ? (
              <button
                onClick={() => onStatusChange(task.id, action.to)}
                className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors ${action.style}`}
              >
                {action.label}
              </button>
            ) : (
              <span className="flex-shrink-0 flex items-center gap-1 text-[11px] text-sage-700 font-semibold px-2 py-1 bg-sage-50 rounded-lg">
                <CheckCircle2 size={10} /> Done
              </span>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="flex-shrink-0 text-ink-faint hover:text-ink transition-colors p-1"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-2.5 pt-2.5 border-t border-sand-100 animate-fade-in space-y-2">
              <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  task.status === "pending" ? "bg-clay-50 text-clay-700" :
                  task.status === "accepted" ? "bg-sage-50 text-sage-700" :
                  task.status === "in_progress" ? "bg-sky-50 text-sky-700" :
                  "bg-sage-50 text-sage-700"
                }`}>
                  {STATUS_LABEL[task.status]}
                </span>
                {task.location && <span className="text-ink-muted">{task.location}</span>}
              </div>
              {task.needs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.needs.map((n) => (
                    <span key={n} className="text-[10px] bg-sage-50 text-sage-700 border border-sage-200 px-2 py-0.5 rounded-full font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              )}
              {task.notes && (
                <p className="text-[11px] text-ink-muted leading-relaxed">{task.notes}</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
