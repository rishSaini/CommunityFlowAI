import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import type { StaffProfile, StaffTask } from "../../types/index";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

interface Props {
  staff: StaffProfile;
  tasks: StaffTask[];
}

const TASK_STATUS_COLOR: Record<string, string> = {
  pending:     "#f59e0b",
  accepted:    "#6366f1",
  in_progress: "#3b82f6",
  complete:    "#10b981",
  conflict:    "#ef4444",
};

const PRIORITY_RING: Record<string, string> = {
  High:   "#fda4af",
  Medium: "#fde68a",
  Low:    "#e2e8f0",
};

interface TooltipData {
  x: number;
  y: number;
  label: string;
  sub: string;
  color: string;
}

export default function StaffTaskMap({ staff, tasks }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoom, setZoom] = useState(1);

  const isUtah = (geo: { id?: string | number }) => String(geo.id ?? "").startsWith("49");

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.4, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.4, 1));

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl overflow-hidden">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 5800 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={[-111.5, 39.5]}
          zoom={zoom}
          onMoveEnd={({ zoom: z }) => setZoom(z)}
          minZoom={1}
          maxZoom={8}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.filter(isUtah).map((geo) => {
                const isStaffCounty = geo.properties?.name === staff.county;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: isStaffCounty ? "#e0e7ff" : "#f1f5f9",
                        stroke: "#cbd5e1",
                        strokeWidth: 0.5,
                        outline: "none",
                        cursor: "grab",
                      },
                      hover: {
                        fill: isStaffCounty ? "#c7d2fe" : "#e2e8f0",
                        outline: "none",
                        cursor: "grab",
                      },
                      pressed: { outline: "none", cursor: "grabbing" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Staff home marker */}
          <Marker coordinates={staff.coordinates}>
            <circle r={14} fill="#6366f1" fillOpacity={0.15} />
            <circle r={10} fill="#6366f1" fillOpacity={0.25} />
            <circle r={6} fill="#4f46e5" stroke="white" strokeWidth={2} />
            <text
              textAnchor="middle"
              y={-14}
              style={{ fontSize: 9, fontWeight: 700, fill: "#4338ca", fontFamily: "Inter, sans-serif" }}
            >
              {staff.name.split(" ")[0]}
            </text>
          </Marker>

          {/* Task markers */}
          {tasks.map((task) => {
            const color = TASK_STATUS_COLOR[task.status] ?? "#94a3b8";
            const ring  = PRIORITY_RING[task.priority] ?? "#e2e8f0";
            return (
              <Marker
                key={task.id}
                coordinates={task.coordinates}
                onMouseEnter={(e) => {
                  const rect = (e.target as Element).closest("svg")?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: (e as MouseEvent).clientX - rect.left,
                      y: (e as MouseEvent).clientY - rect.top,
                      label: task.partnerName,
                      sub: `${task.city} · ${task.eventDate} · ${task.attendeeCount} attendees`,
                      color,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle r={11} fill={ring} stroke={color} strokeWidth={1.5} style={{ cursor: "pointer" }} />
                <circle r={6}  fill={color} stroke="white" strokeWidth={1.5} style={{ cursor: "pointer" }} />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom controls */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-colors text-lg font-medium"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-colors text-lg font-medium"
        >
          −
        </button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs max-w-[200px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <p className="font-bold leading-tight mb-0.5">{tooltip.label}</p>
          <p className="text-slate-300 text-[11px]">{tooltip.sub}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 shadow-sm space-y-1.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
        {[
          { label: "Pending",     color: TASK_STATUS_COLOR.pending     },
          { label: "Accepted",    color: TASK_STATUS_COLOR.accepted    },
          { label: "In Progress", color: TASK_STATUS_COLOR.in_progress },
          { label: "Complete",    color: TASK_STATUS_COLOR.complete    },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-slate-600 font-medium">{label}</span>
          </div>
        ))}
        <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-indigo-500" />
          <span className="text-[10px] text-slate-600 font-medium">Home base</span>
        </div>
      </div>
    </div>
  );
}
