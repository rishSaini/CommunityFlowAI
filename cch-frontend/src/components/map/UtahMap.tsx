import { useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { utahCountyData, getServiceLabel } from "../../data/mockData";
import type { ResourceRequest, CountyData } from "../../types/index";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

const colorScale = scaleLinear<string>()
  .domain([-100, -50, 0, 50, 100])
  .range(["#9f1239", "#fb7185", "#cbd5e1", "#5eead4", "#0d9488"])
  .clamp(true);

interface Props { requests: ResourceRequest[]; }
interface TooltipData extends CountyData { fips: string; }

export default function UtahMap({ requests }: Props) {
  const [tooltip, setTooltip]   = useState<TooltipData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((geo: { id: string }, evt: React.MouseEvent) => {
    const data = utahCountyData[geo.id];
    if (data) {
      setTooltip({ ...data, fips: geo.id });
      setMousePos({ x: evt.clientX, y: evt.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((evt: React.MouseEvent) => {
    setMousePos({ x: evt.clientX, y: evt.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const getFillColor = (geo: { id: string }) => {
    const data = utahCountyData[geo.id];
    return data ? colorScale(data.serviceIndex) : "#e2e8f0";
  };

  const highImpact = requests.filter((r) => r.impactLevel === "High");
  const stdReqs    = requests.filter((r) => r.impactLevel !== "High");

  return (
    <div
      className="relative w-full h-full bg-slate-50 rounded-b-2xl"
      onMouseMove={handleMouseMove}
    >
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 5800, center: [-111.5, 39.5] }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup center={[-111.5, 39.5]} zoom={1} minZoom={1} maxZoom={5}>
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: Array<{ rsmKey: string; id: string }> }) =>
              geographies
                .filter((geo) => geo.id?.startsWith("49"))
                .map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFillColor(geo)}
                    stroke="#fff"
                    strokeWidth={0.9}
                    onMouseEnter={(evt: React.MouseEvent) => handleMouseEnter(geo, evt)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      default: { outline: "none", cursor: "pointer", transition: "filter 0.15s ease" },
                      hover:   { outline: "none", filter: "brightness(0.78) drop-shadow(0 2px 6px rgba(0,0,0,0.2))", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
            }
          </Geographies>

          {stdReqs.map((req) => (
            <Marker key={req.id} coordinates={req.coordinates}>
              <circle r={5.5} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} opacity={0.9} />
            </Marker>
          ))}

          {highImpact.map((req) => (
            <Marker key={req.id} coordinates={req.coordinates}>
              <circle r={16} fill="#f43f5e" fillOpacity={0.12} />
              <circle r={11} fill="#f43f5e" fillOpacity={0.2}  />
              <circle r={6}  fill="#f43f5e" stroke="#fff" strokeWidth={2} />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Gradient legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-3 border border-white/80">
        <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">Critical</span>
        <div
          className="w-28 h-2.5 rounded-full"
          style={{ background: "linear-gradient(to right,#9f1239,#fb7185,#cbd5e1,#5eead4,#0d9488)" }}
        />
        <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">Over-served</span>
      </div>

      {/* Marker legend */}
      <div className="absolute bottom-4 right-4 glass rounded-xl px-3 py-2.5 shadow-lg border border-white/80">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Requests</p>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-rose-400 opacity-25 scale-150" />
            <div className="w-3 h-3 rounded-full bg-rose-500 z-10" />
          </div>
          <span className="text-[11px] text-slate-600">High Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[11px] text-slate-600">Standard</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="map-tooltip"
          style={{ left: mousePos.x + 18, top: mousePos.y - 12 }}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl px-4 py-3.5 shadow-2xl border border-white/10 min-w-[200px] animate-fade-in">
            <p className="font-bold text-sm">{tooltip.name} County</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: colorScale(tooltip.serviceIndex) }}
              />
              <p className="text-xs text-slate-300">{getServiceLabel(tooltip.serviceIndex)}</p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Service Index</span>
                <span className="text-xs font-bold text-white">
                  {tooltip.serviceIndex > 0 ? "+" : ""}{tooltip.serviceIndex}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Population</span>
                <span className="text-xs font-bold text-white">{tooltip.population.toLocaleString()}</span>
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.abs(tooltip.serviceIndex)}%`,
                    background: colorScale(tooltip.serviceIndex),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
