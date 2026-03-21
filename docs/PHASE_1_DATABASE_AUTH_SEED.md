# Phase 1: Database, Auth & Seed Data

> **Source of truth:** [core.md](core.md) | Sections 14, 18.2, 18.3, 18.4, 19
> This is a living document. Update it as the project evolves.

Foundation phase. Everything else depends on this.

---

## Prerequisites

None — this is the first phase.

---

## What Gets Built

### Backend

- **SQLAlchemy 2.0 models** for all 6 tables (users, requests, locations, materials_catalog, service_area_zips, notification_log)
- **Database engine** with SQLite, `check_same_thread=False`
- **JWT authentication** — login endpoint, token creation/validation, `get_current_user` dependency
- **bcrypt password hashing** via passlib
- **Pydantic schemas** for request/response validation
- **Enums** for Status, FulfillmentType, UrgencyLevel, Classification
- **Seed script** with comprehensive demo data
- **FastAPI app entry point** with CORS, basic health check
- **Config** with environment variable loading
- **requirements.txt** with all Python dependencies

### Frontend

None in this phase.

---

## Files to Create

| File Path | Purpose |
|-----------|---------|
| `cch-backend/app/__init__.py` | Package marker |
| `cch-backend/app/main.py` | FastAPI app, CORS, router registration |
| `cch-backend/app/config.py` | Settings, env loading, AI model defaults |
| `cch-backend/app/auth.py` | JWT + bcrypt, login, get_current_user |
| `cch-backend/app/models/__init__.py` | Package marker |
| `cch-backend/app/models/database.py` | Engine, SessionLocal, Base |
| `cch-backend/app/models/tables.py` | All 6 ORM models |
| `cch-backend/app/models/schemas.py` | Pydantic models |
| `cch-backend/app/models/enums.py` | Status, FulfillmentType, UrgencyLevel, Classification enums |
| `cch-backend/app/routers/__init__.py` | Package marker |
| `cch-backend/app/routers/auth_routes.py` | POST /login, GET /me |
| `cch-backend/app/services/__init__.py` | Package marker |
| `cch-backend/app/utils/__init__.py` | Package marker |
| `cch-backend/seed.py` | Demo data population |
| `cch-backend/requirements.txt` | Python dependencies |

---

## Seed Data Spec

| Entity | Count | Details |
|--------|-------|---------|
| Locations | 7 | Real Utah cities: Salt Lake City, Provo, Ogden, St. George, Logan, Park City, Cedar City. Real 84xxx zips. Real lat/lng. |
| Materials | 20 | Across categories: Health Education, Behavioral Tools, Programming Resources, Event Supplies |
| Service Area Zips | 15 | Distributed across Utah. Vary equity_score (some underserved). |
| Admins | 2 | admin@cch.org, manager@cch.org |
| Staff | 6 | One of each classification: FT_W2, PT_W2, ON_CALL, CONTRACTOR_1099, VOLUNTEER, OUTSIDE_HELP |
| Requests | 50+ | Mix of all statuses, fulfillment types, urgency levels. Some with AI data pre-populated. Various dates (past, near-future, far-future). |

### Seed Staff Details

Each staff member should have:
- Realistic Utah-based name
- Valid schedule JSON
- Assigned to 1–3 locations
- Current lat/lng near their assigned location
- Classification-appropriate workload

---

## Dependencies (External)

- Python 3.11+
- pip packages from requirements.txt

---

## Success Criteria

- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] `python seed.py` populates all 6 tables with demo data
- [ ] POST `/api/login` with seeded admin credentials returns JWT token
- [ ] GET `/api/me` with valid JWT returns user data
- [ ] All 6 employee classifications present in database
- [ ] 50+ requests seeded across all statuses and urgency levels
- [ ] Database file `cch.db` created in project root

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
