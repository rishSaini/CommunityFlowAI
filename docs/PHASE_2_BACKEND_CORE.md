# Phase 2: Backend Core

> **Source of truth:** [core.md](core.md) | Sections 6, 8, 9, 18.2, 19
> This is a living document. Update it as the project evolves.

All core backend services, routers, and utilities. After this phase, the API is fully functional.

---

## Prerequisites

- Phase 1 complete (database, auth, seed data)

---

## What Gets Built

### Routers (API Endpoints)

- **requests.py** — CRUD for requests, status transitions, submission pipeline (validate → geocode → assign location)
- **chatbot.py** — POST `/api/chatbot` (public, no auth) — receives conversation + form state, returns reply + field_updates
- **locations.py** — CRUD for CCH locations (admin only for write)
- **materials.py** — CRUD for materials catalog (admin only for write)
- **dispatch.py** — GET candidates for a request, POST assign staff
- **employees.py** — Staff management, schedule updates, check-in endpoint
- **briefs.py** — GET/POST Job Briefs
- **analytics.py** — Aggregated stats, demand data
- **search.py** — Natural language search endpoint
- **admin.py** — Admin-only operations, settings, overrides

### Services (Business Logic)

- **geo_service.py** — Google Geocoding (Utah-bounded), Haversine distance, nearest location assignment
- **schedule_service.py** — `is_on_shift_now()`, `has_exception_today()`, `is_in_on_call_rotation()`, shift overlap checks
- **directions_service.py** — Google Directions API wrapper, travel time with traffic, departure calculation
- **chatbot_service.py** — Conversation management, OpenRouter call formatting, field extraction
- **ws_manager.py** — WebSocket connection manager, broadcast to connected dashboards

### Utilities

- **geo.py** — Haversine formula, distance calculations
- **tokens.py** — Status tracker token generation (unique, URL-safe)
- **utah_validator.py** — Zip code 84xxx validation, Utah bounds check for lat/lng

---

## Files to Create

| File Path | Purpose |
|-----------|---------|
| `cch-backend/app/routers/requests.py` | Request CRUD + submission pipeline |
| `cch-backend/app/routers/chatbot.py` | AI chatbot endpoint |
| `cch-backend/app/routers/locations.py` | Location CRUD |
| `cch-backend/app/routers/materials.py` | Materials catalog CRUD |
| `cch-backend/app/routers/dispatch.py` | Dispatch candidates + assignment |
| `cch-backend/app/routers/employees.py` | Staff management + check-in |
| `cch-backend/app/routers/briefs.py` | Job Brief endpoints |
| `cch-backend/app/routers/analytics.py` | Analytics data |
| `cch-backend/app/routers/search.py` | NL search |
| `cch-backend/app/routers/admin.py` | Admin operations |
| `cch-backend/app/services/geo_service.py` | Geocoding + distance |
| `cch-backend/app/services/schedule_service.py` | Schedule checks |
| `cch-backend/app/services/directions_service.py` | Google Directions |
| `cch-backend/app/services/chatbot_service.py` | Chatbot logic |
| `cch-backend/app/services/ws_manager.py` | WebSocket manager |
| `cch-backend/app/utils/geo.py` | Haversine math |
| `cch-backend/app/utils/tokens.py` | Token generation |
| `cch-backend/app/utils/utah_validator.py` | Utah validation |

---

## Key Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/requests` | None | Submit new request (public) |
| GET | `/api/requests` | Staff/Admin | List requests (filtered by role) |
| GET | `/api/requests/:id` | Staff/Admin | Request detail |
| PATCH | `/api/requests/:id/status` | Staff/Admin | Update status |
| GET | `/api/requests/status/:token` | None | Public status tracker |
| POST | `/api/chatbot` | None | AI chatbot conversation |
| GET | `/api/locations` | None | List locations |
| GET | `/api/materials` | None | List materials catalog |
| GET | `/api/dispatch/:request_id/candidates` | Admin | Ranked staff candidates |
| POST | `/api/dispatch/:request_id/assign` | Admin | Dispatch staff |
| POST | `/api/staff/checkin` | Staff | Update location |
| GET | `/api/briefs/:request_id` | Staff/Admin | Get Job Brief |
| WS | `/ws` | Staff/Admin | Real-time updates |

---

## Success Criteria

- [ ] POST `/api/requests` validates Utah zip, geocodes, assigns nearest location
- [ ] GET `/api/requests` returns filtered list based on user role
- [ ] POST `/api/chatbot` returns AI reply + field_updates JSON
- [ ] POST `/api/staff/checkin` validates Utah coordinates, updates user record
- [ ] Schedule service correctly identifies on-shift vs off-shift employees
- [ ] WebSocket connects and receives broadcast messages
- [ ] Utah validator rejects non-84xxx zips and out-of-bounds coordinates

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
