# Build Log

Running record of what was built, when, and verification results for each phase.

---

## Phase 1: Database, Auth & Seed Data

**Date:** 2026-03-21
**Commit:** `32854d6`
**Status:** COMPLETE

### Files Created (15)

| File | Purpose |
|------|---------|
| `cch-backend/app/__init__.py` | Package marker |
| `cch-backend/app/main.py` | FastAPI app, CORS, lifespan, health check |
| `cch-backend/app/config.py` | Env vars: JWT, OpenRouter, Google Maps, Twilio, Utah bounds |
| `cch-backend/app/auth.py` | JWT creation/validation, bcrypt hashing, get_current_user/get_current_admin |
| `cch-backend/app/models/__init__.py` | Package marker |
| `cch-backend/app/models/database.py` | SQLAlchemy engine, SessionLocal, Base, get_db() |
| `cch-backend/app/models/tables.py` | 6 ORM models: User, Request, Location, MaterialsCatalog, ServiceAreaZip, NotificationLog |
| `cch-backend/app/models/schemas.py` | Pydantic schemas: LoginRequest, TokenResponse, UserResponse |
| `cch-backend/app/models/enums.py` | Enums: Role, Classification, Status, FulfillmentType, UrgencyLevel, NotificationChannel/Status |
| `cch-backend/app/routers/__init__.py` | Package marker |
| `cch-backend/app/routers/auth_routes.py` | POST /api/login, GET /api/me |
| `cch-backend/app/services/__init__.py` | Package marker |
| `cch-backend/app/utils/__init__.py` | Package marker |
| `cch-backend/seed.py` | Seed script: 7 locations, 20 materials, 15 zips, 2 admins, 6 staff, 55 requests |
| `cch-backend/requirements.txt` | fastapi, uvicorn, sqlalchemy, PyJWT, bcrypt, python-dotenv, pydantic, python-multipart, httpx |

### Seed Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| Locations | 7 | SLC, Provo, Ogden, St. George, Logan, Park City, Cedar City |
| Materials | 20 | Across 4 categories |
| Service Area Zips | 15 | Varying equity_score |
| Admins | 2 | admin@cch.org, manager@cch.org |
| Staff | 6 | One per classification: FT_W2, PT_W2, ON_CALL, CONTRACTOR_1099, VOLUNTEER, OUTSIDE_HELP |
| Requests | 55 | Mix of all statuses, fulfillment types, urgency levels |

### Verification Results

| Test | Result |
|------|--------|
| `uvicorn app.main:app --reload` starts | PASS |
| `python seed.py` populates all 6 tables | PASS |
| POST `/api/login` with admin creds returns JWT | PASS |
| GET `/api/me` with valid JWT returns user data | PASS |
| All 6 employee classifications in DB | PASS |
| 55 requests seeded across all statuses/urgencies | PASS |
| `cch.db` created in project root | PASS |

### Key Decisions

1. **SQLite over PostgreSQL** — Simplicity for hackathon. `check_same_thread=False` for concurrent FastAPI access. Single-file DB at `cch.db`.
2. **PyJWT + bcrypt directly** — Chose raw PyJWT + bcrypt instead of python-jose or passlib for Python 3.14 compatibility (passlib has deprecation warnings).
3. **UUID string primary keys** — All tables use `str(uuid4())` instead of auto-increment integers. Prevents ID enumeration and works across distributed systems.
4. **JSON columns for complex data** — Schedule, schedule_exceptions, on_call_schedule, materials_requested, certifications all stored as JSON columns instead of separate relational tables. Simpler for a hackathon prototype.
5. **6 employee classifications** — FT_W2, PT_W2, ON_CALL, CONTRACTOR_1099, VOLUNTEER, OUTSIDE_HELP — each with distinct dispatch priority and task restrictions per core.md §8.1.
6. **Single password for all seed users** — `password123` across all 8 users for easy demo/testing.
7. **55 seeded requests** — Spread across all statuses, fulfillment types, and urgency levels to ensure every UI view has data on first load.

### Credentials

- Admin: `admin@cch.org` / `password123`
- Staff: `emily.r@cch.org` / `password123`

---

## Phase 2: Backend Core

**Date:** 2026-03-21
**Status:** COMPLETE

### Files Created (18 new)

| File | Purpose |
|------|---------|
| **Utilities** | |
| `cch-backend/app/utils/geo.py` | Haversine distance formula (miles) |
| `cch-backend/app/utils/tokens.py` | URL-safe status tracker token generation |
| `cch-backend/app/utils/utah_validator.py` | Zip (84xxx) + coordinate (Utah bounds) validation |
| **Services** | |
| `cch-backend/app/services/ws_manager.py` | WebSocket ConnectionManager singleton for real-time broadcasts |
| `cch-backend/app/services/schedule_service.py` | is_on_shift_now(), has_exception_today(), is_in_on_call_rotation() |
| `cch-backend/app/services/geo_service.py` | Google Geocoding (Utah-bounded) + assign_nearest_location (Haversine) |
| `cch-backend/app/services/directions_service.py` | Google Directions API: travel time, distance, polyline, departure calc |
| `cch-backend/app/services/chatbot_service.py` | OpenRouter chatbot: conversation processing, field extraction, JSON parsing |
| **Routers** | |
| `cch-backend/app/routers/requests.py` | POST submit (public), GET list (filtered by role), GET detail, PATCH status, GET status tracker (public) |
| `cch-backend/app/routers/chatbot.py` | POST /chatbot (public) — AI form auto-fill |
| `cch-backend/app/routers/locations.py` | CRUD for CCH locations (public read, admin write) |
| `cch-backend/app/routers/materials.py` | CRUD for materials catalog (public read, admin write) |
| `cch-backend/app/routers/dispatch.py` | GET candidates (schedule-aware ranking), POST assign (status + workload update) |
| `cch-backend/app/routers/employees.py` | GET/PATCH employees (admin), POST /staff/checkin (staff, Utah-validated) |
| `cch-backend/app/routers/briefs.py` | GET brief (staff own / admin all), POST regenerate (stub for Phase 5) |
| `cch-backend/app/routers/analytics.py` | GET /analytics/summary — SQL aggregation: by status, urgency, fulfillment, avg priority |
| `cch-backend/app/routers/search.py` | POST /search — basic LIKE text search (full NL/AI search stubbed for Phase 4) |
| `cch-backend/app/routers/admin.py` | PATCH priority override, GET notification log |

### Files Modified (2)

| File | Changes |
|------|---------|
| `cch-backend/app/models/schemas.py` | Added 25 Pydantic schemas across 11 sections (requests, chatbot, locations, materials, dispatch, employees, briefs, analytics, search, status tracker, notification log) |
| `cch-backend/app/main.py` | Registered all 10 new routers + WebSocket endpoint at /ws |

### Dependencies Added

| Package | Purpose |
|---------|---------|
| `googlemaps>=4.10.0` | Google Geocoding + Directions + Distance Matrix API client |
| `websockets` | FastAPI WebSocket support |

### API Endpoints (35 total)

| Method | Path | Auth | Phase 2 Status |
|--------|------|------|----------------|
| POST | `/api/login` | None | Phase 1 |
| GET | `/api/me` | JWT | Phase 1 |
| GET | `/api/health` | None | Phase 1 |
| GET | `/api/requests/status/{token}` | None | Full |
| POST | `/api/requests` | None | Full (minus AI classification — Phase 4) |
| GET | `/api/requests` | Staff/Admin | Full |
| GET | `/api/requests/{id}` | Staff/Admin | Full |
| PATCH | `/api/requests/{id}/status` | Staff/Admin | Full |
| POST | `/api/chatbot` | None | Full (OpenRouter AI connected) |
| GET | `/api/locations` | None | Full |
| GET | `/api/locations/{id}` | None | Full |
| POST | `/api/locations` | Admin | Full |
| PATCH | `/api/locations/{id}` | Admin | Full |
| DELETE | `/api/locations/{id}` | Admin | Full |
| GET | `/api/materials` | None | Full |
| GET | `/api/materials/{id}` | None | Full |
| POST | `/api/materials` | Admin | Full |
| PATCH | `/api/materials/{id}` | Admin | Full |
| DELETE | `/api/materials/{id}` | Admin | Full |
| GET | `/api/dispatch/{id}/candidates` | Admin | Basic (schedule + Haversine). Full 8-step in Phase 5 |
| POST | `/api/dispatch/{id}/assign` | Admin | Full |
| GET | `/api/employees` | Admin | Full |
| GET | `/api/employees/{id}` | Admin | Full |
| PATCH | `/api/employees/{id}` | Admin | Full |
| POST | `/api/staff/checkin` | Staff | Full |
| GET | `/api/briefs/{id}` | Staff/Admin | Data pass-through. AI generation in Phase 5 |
| POST | `/api/briefs/{id}/regenerate` | Admin | Stub (Phase 5) |
| GET | `/api/analytics/summary` | Admin | Full |
| POST | `/api/search` | Admin | Basic LIKE search. NL/AI in Phase 4 |
| PATCH | `/api/admin/requests/{id}/priority` | Admin | Full |
| GET | `/api/admin/notifications/log` | Admin | Full |
| WS | `/ws` | None | Full |

### External APIs Connected

| API | Status | Key |
|-----|--------|-----|
| Google Maps Geocoding | Working | `GOOGLE_MAPS_API_KEY` in .env |
| Google Maps Directions | Working | Same key |
| OpenRouter (Claude Sonnet) | Working | `OPENROUTER_API_KEY` in .env |

### Verification Results

| Test | Result |
|------|--------|
| Server starts (`uvicorn app.main:app --reload`) | PASS |
| `GET /api/health` | PASS |
| `GET /api/locations` (public, 7 seeded) | PASS |
| `GET /api/materials` (public, 20 seeded) | PASS |
| `POST /api/requests` — geocodes, assigns nearest location | PASS |
| `POST /api/requests` — rejects non-84xxx zip with 400 | PASS |
| `GET /api/requests/status/{token}` — correct urgency color | PASS |
| `POST /api/chatbot` — OpenRouter AI replies, extracts fields | PASS |
| `GET /api/requests` (admin) — 56 requests, paginated | PASS |
| `GET /api/employees` (admin) — 6 staff, correct classifications | PASS |
| `GET /api/analytics/summary` — all aggregations correct | PASS |
| `POST /api/search` — finds results for "Salt Lake" | PASS |
| `GET /api/dispatch/{id}/candidates` — schedule-aware filtering | PASS |
| `POST /api/dispatch/{id}/assign` — status→dispatched, workload++ | PASS |
| `GET /api/briefs/{id}` — returns assigned staff name | PASS |
| `POST /api/staff/checkin` — Utah coords accepted | PASS |
| `POST /api/staff/checkin` — non-Utah coords rejected (400) | PASS |
| Unauthenticated `GET /api/requests` → 401 | PASS |
| `WS /ws` — connection accepted | PASS |

### Key Decisions

1. **`googlemaps` Python package (legacy APIs) over Routes API** — The newer Google Routes API has better performance, but the `googlemaps` package doesn't support it. Using the legacy Geocoding + Directions + Distance Matrix APIs via one package is simpler and well-documented for a hackathon.
2. **Graceful degradation for all external APIs** — If `GOOGLE_MAPS_API_KEY` or `OPENROUTER_API_KEY` is empty, services return None/fallback instead of crashing. Allows development without API keys.
3. **Sync endpoints + async only where needed** — Most endpoints are sync `def` (SQLAlchemy sync sessions). Only chatbot (httpx async), request submission, and dispatch assign are `async def` (for WebSocket broadcasts).
4. **Route ordering for `/requests/status/{token}`** — Defined BEFORE `/requests/{request_id}` to prevent FastAPI from matching "status" as a request_id parameter.
5. **Employee router serves two path prefixes** — Both `/employees/*` (admin CRUD) and `/staff/checkin` (staff self-service) live in one router with explicit path decorators rather than a router-level prefix.
6. **Stub dispatch + briefs + search** — Endpoints exist with basic functionality (Haversine ranking, data pass-through, LIKE search) but full algorithms are deferred: 8-step dispatch to Phase 5, Job Brief AI generation to Phase 5, NL search to Phase 4.
7. **Chatbot system prompt embedded as constant** — The full chatbot system prompt from core.md §5.3 is a module-level string in `chatbot_service.py` rather than loaded from a file, for simplicity and zero I/O.
8. **WebSocket singleton pattern** — `ConnectionManager` instantiated as module-level `manager` in `ws_manager.py`, imported wherever broadcasts are needed. No auth on WebSocket for hackathon simplicity.
9. **Soft deletes for locations and materials** — DELETE endpoints set `is_active=False` / `in_stock=False` instead of hard deleting rows, preserving referential integrity with existing requests.
10. **OpenRouter model selection per feature** — `AI_MODELS` dict in `config.py` maps feature names to model strings (e.g., `"chatbot": "anthropic/claude-sonnet-4"`). Admin can override without code changes in Phase 9.

### Stubs for Later Phases

| Stub | Full Implementation |
|------|-------------------|
| AI master classification on submission | Phase 4 |
| Priority scoring formula (weighted) | Phase 4 |
| Full 8-step dispatch algorithm | Phase 5 |
| Job Brief AI generation (7 sections) | Phase 5 |
| Brief regenerate endpoint | Phase 5 |
| NL search via AI | Phase 4 |
| Twilio SMS/voice sending | Phase 7 |

---

## Phase 3–9: Pending

_Build logs will be added as phases are completed._
