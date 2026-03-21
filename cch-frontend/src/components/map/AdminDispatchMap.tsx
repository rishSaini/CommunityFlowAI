import { useState, useCallback } from "react";
import {
  ComposableMap, Geographies, Geography,
  Marker, ZoomableGroup, Line,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { utahCountyData, mockStaffProfiles } from "../../data/mockData";
import type { ResourceRequest } from "../../types/index";
import type { StaffProfile } from "../../types/index";
import { Navigation, User, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

const colorScale = scaleLinear<string>()
  .domain([-100, -50, 0, 50, 100])
  .range(["#9f1239", "#fb7185", "#cbd5e1", "#5eead4", "#0d9488"])
  .clamp(true);

// ── Haversine distance in miles ────────────────────────────────────────────
function haversine([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Is this staff member available on the event date? ─────────────────────
function isAvailableOnDate(staff: StaffProfile, eventDate: string): boolean {
  if (!eventDate) return staff.status === "available";
  const d = new Date(eventDate + "T12:00:00");
  const dayOfWeek = d.getDay(); // 0=Sun ... 6=Sat
  return staff.availability.some((a) => a.day === dayOfWeek) && staff.status !== "off_duty";
}

// ── Travel time estimate (rough: 0.6 mph avg Utah highway + rural) ─────────
function estTravelMinutes(miles: number): number {
  return Math.round(miles / 45 * 60); // assume avg 45 mph
}

interface RankedStaff {
  staff: StaffProfile;
  distanceMiles: number;
  available: boolean;
  travelMinutes: number;
}

interface Props {
  requests: ResourceRequest[];
  onRequestClick?: (requestId: string) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  High:   "#f43f5e",
  Medium: "#f59e0b",
  Low:    "#3b82f6",
};

export default function AdminDispatchMap({ requests, onRequestClick }: Props) {
  const [selectedReq, setSelectedReq]   = useState<ResourceRequest | null>(null);
  const [hoveredId,   setHoveredId]     = useState<string | null>(null);
  const [mousePos,    setMousePos]      = useState({ x: 0, y: 0 });

  const getRankedStaff = useCallback((req: ResourceRequest): RankedStaff[] => {
    return mockStaffProfiles
      .map((staff) => {
        const dist     = haversine(staff.coordinates, req.coordinates);
        const available = isAvailableOnDate(staff, req.eventDate);
        return { staff, distanceMiles: dist, available, travelMinutes: estTravelMinutes(dist) };
      })
      .sort((a, b) => {
        // Available first, then by distance
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.distanceMiles - b.distanceMiles;
      });
  }, []);

  const ranked     = selectedReq ? getRankedStaff(selectedReq) : [];
  const topPick    = ranked[0]?.staff ?? null;
  const hoveredReq = hoveredId ? requests.find((r) => r.id === hoveredId) : null;

  return (
    <div className="flex h-full">

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 relative bg-slate-50"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 5800, center: [-111.5, 39.5] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={[-111.5, 39.5]} zoom={1} minZoom={1} maxZoom={5}>

            {/* County heatmap */}
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: Array<{ rsmKey: string; id: string }> }) =>
                geographies
                  .filter((geo) => geo.id?.startsWith("49"))
                  .map((geo) => {
                    const data = utahCountyData[geo.id];
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={data ? colorScale(data.serviceIndex) : "#e2e8f0"}
                        stroke="#fff"
                        strokeWidth={0.9}
                        style={{
                          default: { outline: "none" },
                          hover:   { outline: "none", filter: "brightness(0.85)" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
              }
            </Geographies>

            {/* Dispatch lines from selected request → each staff (dashed) */}
            {selectedReq && ranked.map(({ staff, available }, i) => (
              <Line
                key={`line-${staff.id}`}
                from={selectedReq.coordinates}
                to={staff.coordinates}
                stroke={i === 0 ? "#16a34a" : available ? "#94a3b8" : "#e2e8f0"}
                strokeWidth={i === 0 ? 2 : 1}
                strokeLinecap="round"
                strokeDasharray={i === 0 ? "0" : "5,4"}
                style={{ opacity: i === 0 ? 0.9 : 0.4 }}
              />
            ))}

            {/* Request event-location markers */}
            {requests.map((req) => {
              const isSelected = selectedReq?.id === req.id;
              const isHovered  = hoveredId === req.id;
              const color      = PRIORITY_COLOR[req.impactLevel] ?? "#3b82f6";
              return (
                <Marker key={req.id} coordinates={req.coordinates}>
                  {req.impactLevel === "High" && (
                    <circle r={16} fill={color} fillOpacity={0.12} />
                  )}
                  <circle
                    r={isSelected ? 9 : isHovered ? 8 : 6.5}
                    fill={color}
                    stroke={isSelected ? "#1e293b" : "#fff"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{ cursor: "pointer", transition: "r 0.15s" }}
                    onClick={() => setSelectedReq(isSelected ? null : req)}
                    onMouseEnter={() => setHoveredId(req.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                </Marker>
              );
            })}

            {/* Staff home-base markers */}
            {mockStaffProfiles.map((staff) => {
              const initials   = staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
              const isTopPick  = topPick?.id === staff.id;
              const isAvailable = staff.status === "available";
              return (
                <Marker key={staff.id} coordinates={staff.coordinates}>
                  {isTopPick && (
                    <circle r={20} fill="#16a34a" fillOpacity={0.18} />
                  )}
                  {isAvailable && !isTopPick && (
                    <circle r={17} fill="#dcfce7" fillOpacity={0.6} />
                  )}
                  <circle
                    r={13}
                    fill={isTopPick ? "#bbf7d0" : isAvailable ? "#f0fdf4" : "#f1f5f9"}
                    stroke={isTopPick ? "#16a34a" : isAvailable ? "#86efac" : "#cbd5e1"}
                    strokeWidth={isTopPick ? 2.5 : 1.5}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 8, fontWeight: 700, fill: "#1e293b", pointerEvents: "none" }}
                  >
                    {initials}
                  </text>
                  {/* Tiny status dot */}
                  <circle
                    cx={9} cy={-9} r={4}
                    fill={isAvailable ? "#22c55e" : staff.status === "busy" ? "#f59e0b" : "#94a3b8"}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                </Marker>
              );
            })}

          </ZoomableGroup>
        </ComposableMap>

        {/* Map legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-sand-200 rounded-xl px-3 py-2.5 shadow-sm text-[10px] space-y-1.5">
          <p className="font-bold text-ink-muted uppercase tracking-wide text-[9px]">Legend</p>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-green-50" />
            <span className="text-ink-muted">Staff (available)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-slate-50" />
            <span className="text-ink-muted">Staff (unavailable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-ink-muted">High priority event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-ink-muted">Medium priority event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-ink-muted">Standard event</span>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredReq && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: mousePos.x + 14, top: mousePos.y - 14 }}
          >
            <div className="bg-slate-900/95 text-white rounded-xl px-3 py-2 shadow-xl text-[11px] max-w-[200px] animate-fade-in">
              <p className="font-semibold leading-snug">{hoveredReq.name}</p>
              <p className="text-slate-400 mt-0.5">{hoveredReq.city} · {hoveredReq.impactLevel} Priority</p>
              <p className="text-slate-300 text-[10px] mt-0.5">{hoveredReq.attendeeCount} attendees · Click to dispatch</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Recommendation sidebar ────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-l border-sand-100 flex flex-col bg-white/60 overflow-hidden">

        {!selectedReq ? (
          /* No selection state */
          <div className="flex flex-col h-full">
            <div className="px-4 py-3.5 border-b border-sand-100">
              <p className="text-xs font-semibold text-ink">Staff On Duty</p>
              <p className="text-[10px] text-ink-muted mt-0.5">Click any event pin to dispatch</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {mockStaffProfiles.map((staff) => {
                const initials = staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                return (
                  <div key={staff.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-sage-50 border border-sage-100 flex items-center justify-center text-[11px] font-bold text-sage-800">
                        {initials}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        staff.status === "available" ? "bg-green-500" :
                        staff.status === "busy"      ? "bg-amber-400" : "bg-slate-300"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-ink truncate">{staff.name}</p>
                      <p className="text-[10px] text-ink-muted truncate">{staff.city}</p>
                      <p className={`text-[9px] font-bold capitalize mt-0.5 ${
                        staff.status === "available" ? "text-green-600" :
                        staff.status === "busy"      ? "text-amber-600" : "text-slate-400"
                      }`}>{staff.status.replace("_", " ")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-sand-100 bg-sage-50/50">
              <p className="text-[10px] text-ink-muted leading-relaxed">
                <span className="font-semibold text-sage-700">Select an event pin</span> on the map to see AI-powered dispatch recommendations based on proximity and schedule.
              </p>
            </div>
          </div>
        ) : (
          /* Request selected — show ranked recommendations */
          <div className="flex flex-col h-full">

            {/* Selected request header */}
            <div className="px-4 py-3.5 border-b border-sand-100 bg-sand-50/60">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_COLOR[selectedReq.impactLevel] }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: PRIORITY_COLOR[selectedReq.impactLevel] }}>
                      {selectedReq.impactLevel} Priority
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-ink leading-snug">{selectedReq.name}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{selectedReq.city}</p>
                  <p className="text-[10px] text-ink-faint mt-0.5">
                    {new Date(selectedReq.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}{selectedReq.attendeeCount} attendees
                  </p>
                  {onRequestClick && (
                    <button
                      onClick={() => onRequestClick(selectedReq.id)}
                      className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <FileText size={10} /> View Full Details
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="flex-shrink-0 text-ink-faint hover:text-ink transition-colors p-0.5"
                >
                  <XCircle size={14} />
                </button>
              </div>
            </div>

            {/* Ranked recommendations */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide px-1 mb-2">
                Recommended Staff
              </p>
              {ranked.map(({ staff, distanceMiles, available, travelMinutes }, i) => {
                const initials = staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                const isTop    = i === 0;
                return (
                  <div
                    key={staff.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isTop
                        ? "bg-green-50 border-green-200 shadow-sm"
                        : "bg-sand-50 border-sand-100"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative flex-shrink-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold ${
                          isTop ? "bg-green-100 text-green-800 border border-green-200" : "bg-sand-100 text-ink-muted border border-sand-200"
                        }`}>
                          {initials}
                        </div>
                        <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white ${
                          isTop ? "bg-green-500 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          {i + 1}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-[11px] font-semibold text-ink truncate">{staff.name}</p>
                          {isTop && <span className="text-[8px] bg-green-500 text-white px-1 py-0.5 rounded font-bold flex-shrink-0">BEST</span>}
                        </div>
                        <p className="text-[10px] text-ink-muted">{staff.city} · {staff.role.split(" ")[0]}</p>

                        {/* Distance + travel */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-0.5 text-[10px] text-ink-muted">
                            <Navigation size={8} className="text-ink-faint" />
                            {Math.round(distanceMiles)} mi
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] text-ink-muted">
                            <Clock size={8} className="text-ink-faint" />
                            ~{travelMinutes}m drive
                          </span>
                        </div>

                        {/* Availability */}
                        <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${
                          available ? "text-green-700" : "text-amber-600"
                        }`}>
                          {available
                            ? <><CheckCircle2 size={9} /> Available on event day</>
                            : <><User size={9} /> Schedule conflict</>}
                        </div>

                        {/* Availability days hint */}
                        <div className="flex gap-0.5 mt-1.5">
                          {["S","M","T","W","T","F","S"].map((d, idx) => {
                            const isAvail = staff.availability.some((a) => a.day === idx);
                            return (
                              <span key={idx} className={`w-4 h-4 rounded text-[7px] flex items-center justify-center font-bold ${
                                isAvail ? "bg-sage-100 text-sage-700" : "bg-sand-100 text-ink-faint"
                              }`}>
                                {d}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dispatch CTA footer */}
            <div className="px-3 py-3 border-t border-sand-100 bg-sand-50/50">
              {ranked[0] && (
                <div className="text-[10px] text-ink-muted leading-relaxed">
                  <span className="font-semibold text-green-700">{ranked[0].staff.name}</span> is the closest available staff member — {Math.round(ranked[0].distanceMiles)} mi away with ~{ranked[0].travelMinutes}m travel.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
