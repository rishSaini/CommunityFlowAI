import {
  ClipboardList, AlertCircle, Users, Zap,
  MapPin, UserCheck, Package, Sparkles,
} from "lucide-react";
import type { ResourceRequest } from "../../types/index";

interface Props { requests: ResourceRequest[]; }

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: "sage" | "clay" | "default";
}

function StatCard({ label, value, sub, icon, accent = "default" }: StatCardProps) {
  const iconBg =
    accent === "sage"  ? "bg-sage-50 border-sage-200 text-sage-700"  :
    accent === "clay"  ? "bg-clay-50 border-clay-200 text-clay-700"  :
    "bg-sand-50 border-sand-200 text-ink-muted";

  return (
    <div className="bg-white border border-sand-200 p-5 hover:border-sand-300 hover:shadow-sm transition-all duration-150">
      <div className="mb-3">
        <div className={`w-9 h-9 border flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-ink leading-none"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>{value}</p>
      <p className="text-[11px] font-semibold text-ink-muted mt-1 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[10px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StatsPanel({ requests }: Props) {
  const total        = requests.length;
  const high         = requests.filter((r) => r.impactLevel === "High").length;
  const staffed      = requests.filter((r) => r.fulfillmentMethod === "Staffed").length;
  const mailed       = requests.filter((r) => r.fulfillmentMethod === "Mailed").length;
  const totalAttend  = requests.reduce((s, r) => s + (r.attendeeCount || 0), 0);
  const avgScore     = total ? Math.round(requests.reduce((s, r) => s + r.priorityScore, 0) / total) : 0;
  const underserved  = requests.filter((r) => r.tags?.some((t) => t.includes("Underserved") || t === "Rural")).length;
  const equityScore  = total ? Math.round((underserved / total) * 100 * 0.6 + avgScore * 0.4) : 0;

  const stats: StatCardProps[] = [
    { label: "Total Requests",      value: total,                        sub: "this period",                                              icon: <ClipboardList size={16} />, accent: "default" },
    { label: "High Priority",       value: high,                         sub: `${total ? Math.round((high/total)*100) : 0}% of requests`, icon: <AlertCircle   size={16} />, accent: "clay"    },
    { label: "Total Reach",         value: totalAttend.toLocaleString(), sub: "estimated attendees",                                      icon: <Users         size={16} />, accent: "sage"    },
    { label: "Avg Priority Score",  value: avgScore,                     sub: "out of 100",                                               icon: <Zap           size={16} />, accent: "default" },
    { label: "Rural / Underserved", value: underserved,                  sub: `${total ? Math.round((underserved/total)*100) : 0}% share`,icon: <MapPin        size={16} />, accent: "clay"    },
    { label: "Staffed Events",      value: staffed,                      sub: "require on-site team",                                     icon: <UserCheck     size={16} />, accent: "sage"    },
    { label: "Mailed Packages",     value: mailed,                       sub: "materials only",                                           icon: <Package       size={16} />, accent: "default" },
    { label: "Equity Impact Score", value: equityScore,                  sub: "AI-computed metric",                                       icon: <Sparkles      size={16} />, accent: "sage"    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <StatCard key={i} {...s} />
      ))}
    </div>
  );
}
