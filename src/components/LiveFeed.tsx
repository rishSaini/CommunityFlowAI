import { useState } from "react";
import {
  Sparkles, MapPin, Users, Calendar,
  Package, UserCheck, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import type { ResourceRequest, ImpactLevel } from "../types";

const IMPACT: Record<ImpactLevel, { ring: string; badge: string; bar: string }> = {
  High:   { ring: "border-rose-200   bg-rose-50/60",   badge: "bg-rose-100   text-rose-700",   bar: "#f43f5e" },
  Medium: { ring: "border-amber-200  bg-amber-50/60",  badge: "bg-amber-100  text-amber-700",  bar: "#f59e0b" },
  Low:    { ring: "border-emerald-200 bg-emerald-50/60", badge: "bg-emerald-100 text-emerald-700", bar: "#10b981" },
};

const TAG_COLOR: Record<string, string> = {
  "Critical Need":          "bg-rose-100   text-rose-700",
  "Critically Underserved": "bg-rose-100   text-rose-700",
  "High Priority":          "bg-orange-100 text-orange-700",
  "Rural":                  "bg-amber-100  text-amber-700",
  "Underserved":            "bg-orange-50  text-orange-600",
  "Urban":                  "bg-sky-100    text-sky-700",
  "Over-served Area":       "bg-teal-100   text-teal-700",
  "Large Event":            "bg-indigo-100 text-indigo-700",
  "Balanced Area":          "bg-slate-100  text-slate-600",
  "Staff Request":          "bg-violet-100 text-violet-700",
  "Indigenous Community":   "bg-amber-100  text-amber-800",
  "Youth Focus":            "bg-purple-100 text-purple-700",
  "Suburban":               "bg-blue-50    text-blue-600",
  "Moderate Need":          "bg-yellow-50  text-yellow-700",
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-800">{score}</span>
      </div>
    </div>
  );
}

function RequestCard({ request, rank }: { request: ResourceRequest; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = IMPACT[request.impactLevel];

  const eventDate = new Date(request.eventDate).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const submitted = new Date(request.submittedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  const rankStyle =
    rank === 1 ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-200" :
    rank === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-orange-100" :
    rank === 3 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-100" :
    "bg-slate-100 text-slate-500";

  return (
    <div className={`rounded-2xl border ${cfg.ring} p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-start gap-3">
        {/* Score ring */}
        <ScoreRing score={request.priorityScore} color={cfg.bar} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm ${rankStyle}`}>
                  {rank}
                </span>
                <p className="font-semibold text-slate-800 text-sm truncate">{request.name}</p>
              </div>
              <div className="flex items-center gap-1 mt-0.5 ml-7">
                <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                <p className="text-xs text-slate-500 truncate">{request.city}, {request.county} Co.</p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
              {request.impactLevel}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar size={10} />{eventDate}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Users size={10} />{request.attendeeCount.toLocaleString()}
            </span>
            <span className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
              request.fulfillmentMethod === "Staffed"
                ? "bg-violet-100 text-violet-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {request.fulfillmentMethod === "Staffed"
                ? <><UserCheck size={9} />Staffed</>
                : <><Package size={9} />Mailed</>}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-2.5">
        {request.tags.map((tag) => (
          <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${TAG_COLOR[tag] ?? "bg-slate-100 text-slate-500"}`}>
            {tag}
          </span>
        ))}
      </div>

      {/* AI Reasoning toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-2.5 w-full flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 transition-colors group"
      >
        <Sparkles size={11} className="group-hover:rotate-12 transition-transform" />
        AI Reasoning
        {expanded ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-1.5 bg-indigo-50/70 rounded-xl p-2.5 border border-indigo-100 animate-fade-in">
          <p className="text-[11px] text-slate-600 leading-relaxed">{request.aiReasoning}</p>
        </div>
      )}

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100/80">
        <Clock size={9} className="text-slate-300" />
        <p className="text-[10px] text-slate-400">Submitted {submitted}</p>
      </div>
    </div>
  );
}

interface Props { requests: ResourceRequest[]; }

export default function LiveFeed({ requests }: Props) {
  const sorted = [...requests].sort((a, b) => b.priorityScore - a.priorityScore);
  const high   = sorted.filter((r) => r.impactLevel === "High").length;
  const med    = sorted.filter((r) => r.impactLevel === "Medium").length;
  const low    = sorted.filter((r) => r.impactLevel === "Low").length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-500" />
            AI Sorted Feed
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{sorted.length} requests · by priority</p>
        </div>
        <div className="flex gap-1">
          <span className="text-[10px] bg-rose-100   text-rose-700   font-bold px-2 py-1 rounded-full">{high} High</span>
          <span className="text-[10px] bg-amber-100  text-amber-700  font-bold px-2 py-1 rounded-full">{med} Med</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-full">{low} Low</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 custom-scroll min-h-0">
        {sorted.map((req, i) => (
          <RequestCard key={req.id} request={req} rank={i + 1} />
        ))}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Package size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
