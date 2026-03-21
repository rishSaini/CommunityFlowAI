import { useState, useEffect } from "react";
import {
  ClipboardList, Calendar, MapPin, Settings,
  CheckCircle2, Clock, Users, ChevronDown,
  Circle, Activity, BarChart3,
} from "lucide-react";
import TaskCard from "../components/schedule/TaskCard";
import TaskDetailModal from "../components/schedule/TaskDetailModal";
import WeeklySchedule from "../components/schedule/WeeklySchedule";
import AvailabilityInput from "../components/schedule/AvailabilityInput";
import EmployeePersonalCalendar from "../components/calendar/EmployeePersonalCalendar";
import StaffTaskMap from "../components/map/StaffTaskMap";
import { mockStaffProfiles, mockStaffTasks } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { requestsApi } from "../lib/api";
import type { RequestResponse } from "../lib/api";
import type { StaffProfile, StaffTask, TaskStatus, StaffStatus } from "../types/index";

type Tab = "tasks" | "schedule" | "map" | "profile";

const STATUS_CONFIG: Record<StaffStatus, {
  label: string;
  textColor: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  available: { label: "Available",  textColor: "text-sage-800",  bg: "bg-sage-50",  border: "border-sage-200",  dot: "bg-sage-500"  },
  busy:      { label: "Busy",       textColor: "text-clay-700",  bg: "bg-clay-50",  border: "border-clay-200",  dot: "bg-clay-600"  },
  off_duty:  { label: "Off Duty",   textColor: "text-ink-muted", bg: "bg-sand-50",  border: "border-sand-300",  dot: "bg-sand-400"  },
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "tasks",    label: "My Tasks",  icon: ClipboardList },
  { id: "schedule", label: "Schedule",  icon: Calendar      },
  { id: "map",      label: "Map",       icon: MapPin        },
  { id: "profile",  label: "Profile",   icon: Settings      },
];

export default function StaffDashboard() {
  const { user } = useAuth();

  // Build a StaffProfile from authenticated user or fall back to mock
  const authProfile: StaffProfile | null = user ? {
    id:            user.id,
    name:          user.full_name,
    role:          user.classification_display ?? user.role,
    email:         user.email,
    phone:         user.phone ?? "",
    address:       "",
    city:          "",
    county:        "",
    coordinates:   [-111.89, 40.76],
    availability:  mockStaffProfiles[0].availability,
    maxTasksPerDay: 3,
    status:        user.is_on_duty ? "available" : "off_duty",
  } : null;

  const [profile, setProfile] = useState<StaffProfile>(authProfile ?? mockStaffProfiles[0]);
  const [tasks, setTasks]     = useState<StaffTask[]>(mockStaffTasks);
  const [tab, setTab]         = useState<Tab>("tasks");
  const [statusOpen, setStatusOpen] = useState(false);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);

  // Load tasks from backend API for the logged-in employee
  useEffect(() => {
    if (!user) return;
    requestsApi.list(1, 100).then((data) => {
      const mapped: StaffTask[] = data.requests
        .filter((r: RequestResponse) =>
          r.assigned_staff_id && r.status !== "cancelled" && r.fulfillment_type === "staff"
        )
        .map((r: RequestResponse) => {
          const urgency = r.urgency_level || "low";
          const priority: StaffTask["priority"] =
            urgency === "critical" || urgency === "high" ? "High"
            : urgency === "medium" ? "Medium" : "Low";

          // Map backend status to task status
          let taskStatus: TaskStatus = "pending";
          if (r.status === "dispatched") taskStatus = "accepted";
          else if (r.status === "in_progress") taskStatus = "in_progress";
          else if (r.status === "fulfilled") taskStatus = "complete";

          // Extract travel minutes from travel_info or dispatch_recommendation
          let travelMins = 0;
          if (r.travel_info?.duration_sec) {
            travelMins = Math.round(r.travel_info.duration_sec / 60);
          } else if (r.dispatch_recommendation?.travel_time) {
            const match = r.dispatch_recommendation.travel_time.match(/(\d+)/);
            if (match) travelMins = parseInt(match[1], 10);
          }

          return {
            id: r.id,
            requestId: r.id,
            partnerName: r.event_name,
            location: `${r.event_city}, UT ${r.event_zip}`,
            city: r.event_city,
            county: "",
            coordinates: [r.event_lng ?? -111.89, r.event_lat ?? 40.76] as [number, number],
            eventDate: r.event_date,
            eventTime: r.event_time ?? "",
            needs: (r.materials_requested ?? []).map((m: string | { material_id: string; quantity: number }) =>
              typeof m === "string" ? m : m.material_id
            ),
            status: taskStatus,
            priority,
            attendeeCount: r.estimated_attendees ?? 0,
            fulfillmentMethod: "Staffed" as const,
            travelMinutes: travelMins,
            notes: r.special_instructions ?? r.ai_summary ?? "",
            isShared: r.assigned_staff_id !== user?.id,
          };
        });
      if (mapped.length > 0) setTasks(mapped);
    }).catch(() => {
      // Keep mock data if backend unavailable
    });
  }, [user]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Update local state immediately
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    // Map task status back to backend request status
    const backendStatus =
      newStatus === "accepted" ? "dispatched"
      : newStatus === "in_progress" ? "in_progress"
      : newStatus === "complete" ? "fulfilled"
      : "submitted";

    try {
      await requestsApi.updateStatus(taskId, backendStatus);
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: t.status } : t));
    }
  };

  const handleStatusToggle = (s: StaffStatus) => {
    setProfile((p) => ({ ...p, status: s }));
    setStatusOpen(false);
  };

  const pending   = tasks.filter((t) => t.status === "pending").length;
  const active    = tasks.filter((t) => t.status === "accepted" || t.status === "in_progress").length;
  const completed = tasks.filter((t) => t.status === "complete").length;
  const reach     = tasks.reduce((s, t) => s + t.attendeeCount, 0);

  const sCfg = STATUS_CONFIG[profile.status];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Personalized greeting ─────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-semibold text-ink" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
          {greeting}, {firstName}.
        </h1>
        <p className="text-sm text-ink-muted">
          {pending > 0
            ? `You have ${pending} pending task${pending !== 1 ? "s" : ""} awaiting review.`
            : active > 0
            ? `${active} active task${active !== 1 ? "s" : ""} in progress.`
            : "All caught up for today."}
        </p>
      </div>

      {/* ── Profile header ─────────────────────────────────────────────── */}
      <div className="bg-sage-900 relative overflow-hidden rounded-3xl shadow-lg">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 19px, #fff 19px, #fff 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #fff 19px, #fff 20px)" }}
        />
        <div className="relative z-10 p-7 flex flex-col sm:flex-row sm:items-start gap-6">

          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 border border-white/15 flex items-center justify-center text-xl font-bold text-paper flex-shrink-0"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
              {profile.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="text-paper font-semibold text-xl leading-tight"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                {profile.name}
              </p>
              <p className="text-paper/60 text-xs mt-0.5 tracking-wide">{profile.role}</p>
              <p className="text-paper/40 text-[11px] mt-0.5">{profile.city}, {profile.county} County</p>
            </div>
          </div>

          {/* Status picker */}
          <div className="sm:ml-auto relative flex-shrink-0">
            <button
              onClick={() => setStatusOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 border border-white/20 bg-white/10 hover:bg-white/15 text-paper text-xs font-medium transition-all"
            >
              <span className={`w-1.5 h-1.5 ${sCfg.dot}`} />
              {sCfg.label}
              <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-sand-200 shadow-lg overflow-hidden z-20 min-w-[130px]">
                {(["available", "busy", "off_duty"] as StaffStatus[]).map((s) => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusToggle(s)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-sand-50 transition-colors ${c.textColor} ${profile.status === s ? "bg-sand-50" : ""}`}
                    >
                      <span className={`w-1.5 h-1.5 ${c.dot}`} /> {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
          {[
            { icon: <Circle      size={13} />, label: "Pending",   value: pending              },
            { icon: <Activity    size={13} />, label: "Active",    value: active               },
            { icon: <CheckCircle2 size={13} />, label: "Complete", value: completed            },
            { icon: <Users       size={13} />, label: "Reach",     value: reach.toLocaleString()},
          ].map(({ icon, label, value }) => (
            <div key={label} className="px-5 py-4 flex flex-col items-start gap-1">
              <div className="text-paper/40">{icon}</div>
              <p className="text-paper font-semibold text-xl leading-none"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>{value}</p>
              <p className="text-paper/40 text-[10px] font-medium uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-sand-100/70 rounded-2xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              tab === id
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── My Tasks ───────────────────────────────────────────────────── */}
      {tab === "tasks" && (
        <div className="animate-fade-in">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-paper border border-sand-200 rounded-3xl text-ink-faint">
              <ClipboardList size={32} className="mb-3 opacity-30" />
              <p className="font-semibold text-ink-muted">No tasks assigned</p>
              <p className="text-sm mt-1 text-ink-faint">Check back after the next triage cycle</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
              {/* Active tasks */}
              {(["High", "Medium", "Low"] as const).map((priority) => {
                const group = tasks.filter((t) => t.priority === priority && t.status !== "complete");
                if (group.length === 0) return null;
                return (
                  <div key={priority}>
                    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${priority === "High" ? "bg-clay-500" : priority === "Medium" ? "bg-clay-300" : "bg-sand-300"}`} />
                      <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest">
                        {priority} · {group.length} task{group.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="px-3 pb-3 space-y-2">
                      {group.map((t) => (
                        <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} onTaskClick={setDetailRequestId} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Completed tasks */}
              {completed > 0 && (
                <div className="border-t border-sand-100">
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                    <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest">
                      Completed · {completed}
                    </p>
                  </div>
                  <div className="px-3 pb-3 space-y-2">
                    {tasks.filter((t) => t.status === "complete").map((t) => (
                      <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Schedule ───────────────────────────────────────────────────── */}
      {tab === "schedule" && (
        <div className="animate-fade-in space-y-5">
          {/* New personal calendar from API */}
          <EmployeePersonalCalendar />

          {/* Legacy 4-week view */}
          <div className="bg-white/80 backdrop-blur-sm border border-sand-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-sand-100 flex items-center gap-3">
              <Calendar size={14} className="text-sage-600" />
              <div>
                <h3 className="font-semibold text-ink text-sm">Availability Overview</h3>
                <p className="text-[11px] text-ink-muted">4-week view · tasks assigned based on your availability</p>
              </div>
            </div>
            <div className="p-5">
              <WeeklySchedule tasks={tasks} availability={profile.availability} />
            </div>
          </div>
        </div>
      )}

      {/* ── Map ────────────────────────────────────────────────────────── */}
      {tab === "map" && (
        <div className="animate-fade-in bg-white border border-sand-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-sand-100 flex items-center gap-3">
            <MapPin size={14} className="text-sage-600" />
            <div>
              <h3 className="font-semibold text-ink text-sm">Task Location Map</h3>
              <p className="text-[11px] text-ink-muted">Home base and all assigned task sites across Utah</p>
            </div>
          </div>
          <div style={{ height: 600 }}>
            <StaffTaskMap staff={profile} tasks={tasks} />
          </div>
        </div>
      )}

      {/* ── Profile ────────────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="animate-fade-in space-y-5">
          <div className="bg-white border border-sand-200">
            <div className="px-5 py-4 border-b border-sand-100 flex items-center gap-3">
              <Settings size={14} className="text-sage-600" />
              <div>
                <h3 className="font-semibold text-ink text-sm">Profile &amp; Availability</h3>
                <p className="text-[11px] text-ink-muted">Used for automatic task scheduling and routing</p>
              </div>
            </div>
            <div className="p-5">
              <AvailabilityInput profile={profile} onSave={(updated) => setProfile(updated)} />
            </div>
          </div>

          {/* Team roster */}
          <div className="bg-white border border-sand-200">
            <div className="px-5 py-4 border-b border-sand-100 flex items-center gap-3">
              <BarChart3 size={14} className="text-sage-600" />
              <h3 className="font-semibold text-ink text-sm">Team Roster</h3>
            </div>
            <div className="divide-y divide-sand-100">
              {mockStaffProfiles.map((s) => {
                const sc = STATUS_CONFIG[s.status];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 bg-sage-50 border border-sage-100 flex items-center justify-center text-sm font-bold text-sage-700 flex-shrink-0"
                      style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
                      {s.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                      <p className="text-[11px] text-ink-muted truncate">{s.role} · {s.county}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 border ${sc.bg} ${sc.textColor} ${sc.border}`}>
                      <span className={`w-1.5 h-1.5 ${sc.dot}`} />{sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {detailRequestId && (
        <TaskDetailModal
          requestId={detailRequestId}
          onClose={() => setDetailRequestId(null)}
        />
      )}
    </div>
  );
}
