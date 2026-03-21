import type { ResourceRequest } from "../../types/index";

interface Props { requests: ResourceRequest[]; }

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  icon: string;
}

function StatCard({ label, value, sub, gradient, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
          style={{ background: gradient }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800 tracking-tight leading-none">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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
    { label: "Total Requests",      value: total,                    sub: "this period",               gradient: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", icon: "📋" },
    { label: "High Priority",       value: high,                     sub: `${total ? Math.round((high/total)*100) : 0}% of requests`,  gradient: "linear-gradient(135deg,#ffe4e6,#fecdd3)", icon: "🔴" },
    { label: "Total Reach",         value: totalAttend.toLocaleString(), sub: "estimated attendees",   gradient: "linear-gradient(135deg,#d1fae5,#a7f3d0)", icon: "👥" },
    { label: "Avg Priority Score",  value: avgScore,                 sub: "out of 100",                gradient: "linear-gradient(135deg,#fef3c7,#fde68a)", icon: "⚡" },
    { label: "Rural / Underserved", value: underserved,              sub: `${total ? Math.round((underserved/total)*100) : 0}% share`, gradient: "linear-gradient(135deg,#fef9c3,#fef08a)", icon: "📍" },
    { label: "Staffed Events",      value: staffed,                  sub: "require on-site team",      gradient: "linear-gradient(135deg,#ede9fe,#ddd6fe)", icon: "🧑‍⚕️" },
    { label: "Mailed Packages",     value: mailed,                   sub: "materials only",            gradient: "linear-gradient(135deg,#e0f2fe,#bae6fd)", icon: "📦" },
    { label: "Equity Impact Score", value: equityScore,              sub: "AI-computed metric",        gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)", icon: "✨" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <StatCard key={i} {...s} />
      ))}
    </div>
  );
}
