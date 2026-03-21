# Phase 6: Google Maps Integration

> **Source of truth:** [core.md](core.md) | Section 9, 19
> This is a living document. Update it as the project evolves.

Custom-skinned, Utah-locked Google Maps across all three interfaces.

---

## Prerequisites

- Phase 3 complete (frontend exists)
- Phase 5 complete (dispatch data exists for map markers)

---

## What Gets Built

### Map Instances

1. **Form Mini-Map** — shows nearest CCH location when partner enters zip (public)
2. **Staff Check-In Map** — staff position + nearby pending requests (staff)
3. **Staff Regional Map** — assigned locations + own requests only (staff)
4. **Job Brief Route Map** — embedded route for specific assignment (staff)
5. **Admin Dispatch Map** — all staff, all requests, clusters, routes (admin)
6. **Admin Analytics Map** — equity heatmap, demand density (admin)

### Map Configuration

- **Library:** `@vis.gl/react-google-maps` (NOT react-leaflet)
- **Center:** 39.3210, -111.0937
- **Default zoom:** 7
- **Max bounds:** SW (36.99, -114.05) to NE (42.00, -109.04)
- **Custom skin:** muted grayscale base, branded blue water, reduced labels, Utah boundary stroke

### Markers (Custom SVG)

- **Location markers** — CCH office pins
- **Staff markers** — colored by classification (FT=blue, PT=green, ON_CALL=orange, etc.)
- **Request markers** — colored by urgency (LOW=green, MEDIUM=blue, HIGH=orange, CRITICAL=red), show priority score
- **Service radii** — circles around locations showing coverage area

### Route Rendering

- Google Directions polylines with animated rendering
- Multi-stop route optimization for clusters (`optimize_waypoints`)
- Traffic-aware coloring

---

## Files to Create

| File Path | Purpose |
|-----------|---------|
| `cch-frontend/src/components/map/MapContainer.tsx` | Base map with Utah bounds + custom skin |
| `cch-frontend/src/components/map/StaffMarker.tsx` | Classification-colored staff pins |
| `cch-frontend/src/components/map/RequestMarker.tsx` | Urgency-colored request pins with score |
| `cch-frontend/src/components/map/RouteOverlay.tsx` | Directions polyline rendering |
| `cch-frontend/src/components/map/ServiceRadius.tsx` | Circle overlay for coverage areas |
| `cch-frontend/src/components/map/MiniMap.tsx` | Simplified map for form + check-in |
| `cch-frontend/src/hooks/useMap.ts` | Map initialization, marker management |
| `cch-frontend/src/lib/mapStyles.ts` | Custom skin JSON |

---

## Utah Bounds Constants

```typescript
const UTAH_CENTER = { lat: 39.3210, lng: -111.0937 };
const UTAH_ZOOM = 7;
const UTAH_BOUNDS = {
  sw: { lat: 36.99, lng: -114.05 },
  ne: { lat: 42.00, lng: -109.04 }
};
```

---

## Success Criteria

- [ ] Map renders with custom grayscale skin
- [ ] Map is bounded to Utah — cannot pan outside state
- [ ] Form mini-map shows nearest CCH location on zip entry
- [ ] Staff markers colored by classification
- [ ] Request markers colored by urgency with priority score labels
- [ ] Route polylines render between staff position and event location
- [ ] Service radius circles visible around CCH locations
- [ ] "Open in Google Maps" deep link opens native directions
- [ ] Map performs well with 50+ markers

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
