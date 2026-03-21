# Phase 1: Database, Auth & Seed Data — Implementation Plan

## Overview

Build the foundation layer that every subsequent phase depends on: SQLAlchemy 2.0 ORM models for all 6 tables, JWT authentication with bcrypt, Pydantic validation schemas, and a seed script that populates the database with realistic Utah-based demo data. No frontend work. No AI. No external APIs except JWT.

**Source of truth:** `docs/core.md` — Sections 2, 3, 8.1, 14, 18.2, 18.3, 18.4, 19

## Current State

- Empty directory scaffolding exists: `cch-backend/app/` with subdirs `models/`, `routers/`, `services/`, `utils/` — all containing only `.gitkeep` files
- No `__init__.py`, no `requirements.txt`, no Python files
- `.env` exists at project root with placeholder values (no real keys)
- Python 3.14.2 available on system
- No virtual environment created yet

## Desired End State

A running FastAPI backend on port **8001** with:
- All 6 database tables created in `cch.db`
- JWT login/me endpoints working
- 100+ rows of seed data across all tables
- All success criteria from `PHASE_1_DATABASE_AUTH_SEED.md` passing

### Verification:
```bash
cd cch-backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001          # starts clean
python seed.py                                      # populates all tables
curl -X POST http://localhost:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cch.org","password":"password123"}'  # returns JWT
# Use returned token:
curl http://localhost:8001/api/me \
  -H "Authorization: Bearer <token>"                # returns user data
```

## What We're NOT Doing

- No frontend (Phase 3)
- No OpenRouter/AI integration (Phase 4)
- No Google Maps/geocoding (Phase 6)
- No Twilio notifications (Phase 7)
- No Alembic migrations — direct `create_all()` is fine for hackathon SQLite
- No CRUD routers beyond auth (Phase 2)
- No WebSocket setup (Phase 2)

---

## Implementation Approach

Build bottom-up in dependency order:
1. **Enums** — no dependencies, everything else references them
2. **Database engine** — needed by models
3. **ORM models** — depend on enums + engine
4. **Config** — env loading, constants
5. **Auth** — depends on models + config
6. **Pydantic schemas** — depend on enums
7. **Auth router** — depends on auth + schemas
8. **FastAPI app** — wires everything together
9. **Seed script** — depends on all models
10. **requirements.txt** — declares all dependencies

---

## Phase 1.1: Project Dependencies

### Overview
Create `requirements.txt` and set up virtual environment.

### Changes Required:

#### 1.1.1 requirements.txt

**File:** `cch-backend/requirements.txt`

**Traced from:** `core.md` Section 18.4, `TECH_STACK.md` "Backend Packages"

```
fastapi
uvicorn[standard]
sqlalchemy>=2.0
python-jose[cryptography]
passlib[bcrypt]
python-dotenv
pydantic>=2.0
python-multipart
httpx
```

**Why these packages only:**
- `fastapi` + `uvicorn[standard]` — web framework + ASGI server (core.md §3)
- `sqlalchemy>=2.0` — ORM, must be 2.0+ per spec (core.md §3, §14)
- `python-jose[cryptography]` — JWT token creation/validation (core.md §3)
- `passlib[bcrypt]` — password hashing (core.md §3)
- `python-dotenv` — `.env` file loading (TECH_STACK.md)
- `pydantic>=2.0` — request/response validation (comes with FastAPI but pin explicitly)
- `python-multipart` — form data parsing for login (TECH_STACK.md)
- `httpx` — will be needed in Phase 2+, but cheap to install now

**Excluded from Phase 1** (install later when needed):
- `alembic` — no migrations for SQLite hackathon
- `twilio` — Phase 7
- `googlemaps` — Phase 6
- `ics` — Phase 8
- `websockets` — Phase 2

### Success Criteria:

#### Automated Verification:
- [ ] `pip install -r requirements.txt` completes without errors
- [ ] `python -c "import fastapi, sqlalchemy, jose, passlib"` succeeds

---

## Phase 1.2: Enums

### Overview
Define all enum values used across the database and API. These are referenced by every other module.

### Changes Required:

#### 1.2.1 Enums Module

**File:** `cch-backend/app/models/enums.py`

**Traced from:** `core.md` Section 14.1 (users.role, users.classification), Section 14.2 (requests.status, requests.fulfillment_type, requests.urgency_level), Section 8.1 (classification details), Section 12 (urgency criteria)

```python
import enum

class Role(str, enum.Enum):
    STAFF = "staff"
    ADMIN = "admin"

class Classification(str, enum.Enum):
    FT_W2 = "FT_W2"
    PT_W2 = "PT_W2"
    ON_CALL = "ON_CALL"
    CONTRACTOR_1099 = "CONTRACTOR_1099"
    VOLUNTEER = "VOLUNTEER"
    OUTSIDE_HELP = "OUTSIDE_HELP"

class Status(str, enum.Enum):
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    DISPATCHED = "dispatched"
    IN_PROGRESS = "in_progress"
    FULFILLED = "fulfilled"
    SENT_TO_QUALTRICS = "sent_to_qualtrics"
    CANCELLED = "cancelled"

class FulfillmentType(str, enum.Enum):
    STAFF = "staff"
    MAIL = "mail"
    PICKUP = "pickup"

class UrgencyLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class NotificationChannel(str, enum.Enum):
    SMS = "sms"
    VOICE = "voice"

class NotificationStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
```

**Decision trace:**
- `Role`: core.md §14.1 — `staff | admin`. Partners never have accounts (core.md §2.2).
- `Classification`: core.md §8.1 — 6 types. Values must match exactly: `FT_W2`, `PT_W2`, `ON_CALL`, `CONTRACTOR_1099`, `VOLUNTEER`, `OUTSIDE_HELP`.
- `Status`: core.md §14.2 — 8 values. Pipeline order: submitted → in_review → approved → dispatched → in_progress → fulfilled. Plus sent_to_qualtrics and cancelled.
- `FulfillmentType`: core.md §6.1 — 3 cards: Staff, Mail, Pickup.
- `UrgencyLevel`: core.md §12 — 4 levels with colors: LOW (#27AE60), MEDIUM (#2E86C1), HIGH (#E67E22), CRITICAL (#C0392B).
- `NotificationChannel`: core.md §14.3 notification_log — `sms | voice`.
- `NotificationStatus`: DATABASE_SCHEMA.md notification_log — `queued | sent | delivered | failed`.

### Success Criteria:

#### Automated Verification:
- [ ] `python -c "from app.models.enums import *; print(list(Classification))"` shows all 6 classifications

---

## Phase 1.3: Database Engine & Base

### Overview
Set up SQLAlchemy engine with SQLite, session factory, and declarative base.

### Changes Required:

#### 1.3.1 Database Module

**File:** `cch-backend/app/models/database.py`

**Traced from:** `core.md` Section 14 — "SQLite + SQLAlchemy 2.0. `check_same_thread=False`."

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./cch.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite + FastAPI (core.md §14)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Decision trace:**
- `check_same_thread=False` — explicitly required by core.md §14, DATABASE_SCHEMA.md header. SQLite is single-threaded by default; FastAPI is async multi-threaded.
- `cch.db` location — core.md §18.2 shows `cch.db` at `cch-backend/` root. Using `./cch.db` which resolves to wherever uvicorn runs from (cch-backend/).
- `get_db` dependency — standard FastAPI pattern for session lifecycle.

---

## Phase 1.4: ORM Table Models

### Overview
Define all 6 SQLAlchemy ORM models matching the schema in core.md §14.

### Changes Required:

#### 1.4.1 All Table Models

**File:** `cch-backend/app/models/tables.py`

**Traced from:** `core.md` Section 14.1–14.3, `DATABASE_SCHEMA.md` (all 6 tables with exact columns/types)

**6 models to define:**

1. **User** (22 columns) — core.md §14.1, DATABASE_SCHEMA.md "Table: users"
   - PK: `id` String UUID
   - Auth: `email` (UNIQUE, NOT NULL), `hashed_password` (bcrypt)
   - Identity: `full_name` (NOT NULL), `role` (staff|admin), `classification`, `classification_display`, `phone`
   - Location: `assigned_location_ids` (JSON list of UUIDs), `current_lat`, `current_lng`, `last_checkin_at`
   - Schedule: `schedule` (JSON), `schedule_exceptions` (JSON), `on_call_schedule` (JSON)
   - Workload: `current_workload` (default 0), `max_workload` (default 5), `is_on_duty` (default True), `is_active` (default True)
   - Meta: `hire_date`, `certifications` (JSON), `notification_queue` (JSON), `created_at`

2. **Request** (35 columns) — core.md §14.2, DATABASE_SCHEMA.md "Table: requests"
   - PK: `id` String UUID
   - Status: `status`, `fulfillment_type`, `urgency_level`
   - Requestor: `requestor_name`, `requestor_email`, `requestor_phone` (all NOT NULL)
   - Event: `event_name` (NOT NULL), `event_date` (NOT NULL), `event_time`, `event_city` (NOT NULL), `event_zip` (NOT NULL), `event_lat`, `event_lng`
   - Details: `mailing_address`, `estimated_attendees`, `materials_requested` (JSON), `special_instructions`, `alt_contact`
   - Assignment: `assigned_location_id` (FK→locations), `assigned_staff_id` (FK→users), `cluster_id`
   - AI: `ai_classification` (JSON), `ai_tags` (JSON), `ai_priority_score` (Float 0-100), `priority_justification`, `ai_urgency` (JSON), `ai_flags` (JSON), `ai_summary`
   - Dispatch: `dispatch_recommendation` (JSON), `job_brief` (JSON), `travel_info` (JSON)
   - Meta: `admin_notes`, `twilio_notified` (default False), `chatbot_used` (default False), `status_tracker_token` (UNIQUE), `created_at`, `updated_at`

3. **Location** (13 columns) — core.md §14.3, DATABASE_SCHEMA.md "Table: locations"
   - PK: `id` String UUID
   - `name`, `address`, `city` (Utah), `state` ("UT"), `zip_code` (84xxx), `lat`, `lng`
   - `service_radius_miles`, `is_active` (default True), `phone`, `on_duty_admin_phone`, `created_at`

4. **MaterialsCatalog** (5 columns) — core.md §14.3, DATABASE_SCHEMA.md "Table: materials_catalog"
   - PK: `id` String UUID
   - `name`, `category`, `description`, `in_stock` (default True)

5. **ServiceAreaZip** (7 columns) — core.md §14.3, DATABASE_SCHEMA.md "Table: service_area_zips"
   - PK: `zip_code` String (84xxx)
   - `location_id` (FK→locations), `region_name`, `is_staffable`, `equity_score` (0-100), `total_requests`, `total_staff_visits`

6. **NotificationLog** (11 columns) — core.md §14.3, DATABASE_SCHEMA.md "Table: notification_log"
   - PK: `id` String UUID
   - `request_id` (FK→requests), `recipient_phone`, `recipient_name`, `channel`, `urgency_level`, `message_body`, `twilio_sid`, `sent_at`, `status`, `queued_until`

**Indexes** (from DATABASE_SCHEMA.md "Recommended Indexes"):
- `requests.status`, `requests.urgency_level`, `requests.assigned_staff_id`, `requests.event_date`, `requests.event_zip`, `requests.status_tracker_token`
- `users.role`, `users.classification`
- `notification_log.request_id`

**Decision trace:**
- UUID strings (not integer PKs) — core.md §14.1 specifies `String (UUID)` for all PKs. Use `uuid.uuid4()` for defaults.
- JSON columns — SQLAlchemy `JSON` type. SQLite stores as text, SQLAlchemy handles serialization.
- Float for lat/lng — core.md §14.1 specifies `Float` type.
- `updated_at` on requests only — core.md §14.2 says "Auto-updated on change". Use `onupdate=func.now()`.
- FK relationships — `requests.assigned_location_id → locations.id`, `requests.assigned_staff_id → users.id`, `service_area_zips.location_id → locations.id`, `notification_log.request_id → requests.id`.

### Success Criteria:

#### Automated Verification:
- [ ] `python -c "from app.models.tables import *; print('OK')"` succeeds
- [ ] All 6 model classes importable

---

## Phase 1.5: Config

### Overview
Environment variable loading and application constants.

### Changes Required:

#### 1.5.1 Config Module

**File:** `cch-backend/app/config.py`

**Traced from:** `core.md` Section 18.3 (env vars), Section 4.3 (model defaults), `TECH_STACK.md` "Environment Variables"

```python
import os
import secrets
from dotenv import load_dotenv

load_dotenv()

# JWT — core.md §18.3. Auto-generate fallback for dev.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24  # Hackathon default

# OpenRouter — core.md §4. Not needed until Phase 4.
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

# AI Model defaults per feature — core.md §4.3
AI_MODELS = {
    "classification": "anthropic/claude-sonnet-4",
    "chatbot": "anthropic/claude-sonnet-4",
    "job_brief": "anthropic/claude-sonnet-4",
    "search": "openai/gpt-4o-mini",
    "tagging": "openai/gpt-4o-mini",
    "digest": "anthropic/claude-sonnet-4",
    "dispatch": "openai/gpt-4o-mini",
    "priority": "openai/gpt-4o-mini",
}

# Google Maps — core.md §9.1. Not needed until Phase 6.
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Twilio — core.md §12. Not needed until Phase 7.
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Travel — core.md §9.3
TRAVEL_BUFFER_MINUTES = int(os.getenv("TRAVEL_BUFFER_MINUTES", "15"))

# Utah bounds — core.md §1 "UTAH REGION LOCK"
UTAH_CENTER = (39.3210, -111.0937)
UTAH_ZOOM = 7
UTAH_SW = (36.99, -114.05)
UTAH_NE = (42.00, -109.04)
```

**Decision trace:**
- `JWT_SECRET_KEY` fallback — user confirmed no real key needed for Phase 1. Auto-generate so dev works out of the box.
- `JWT_EXPIRATION_HOURS = 24` — agreed with user. Standard for hackathon.
- AI model defaults — core.md §4.3 table. Store now so they're ready for Phase 4.
- Utah bounds — core.md §1 "UTAH REGION LOCK" paragraph. Exact values specified.

---

## Phase 1.6: Authentication

### Overview
JWT token creation/validation, bcrypt password hashing, and `get_current_user` FastAPI dependency.

### Changes Required:

#### 1.6.1 Auth Module

**File:** `cch-backend/app/auth.py`

**Traced from:** `core.md` Section 3 — "FastAPI + python-jose + passlib. JWT tokens, bcrypt."

**Functions to implement:**
1. `hash_password(password: str) -> str` — bcrypt via passlib CryptContext
2. `verify_password(plain: str, hashed: str) -> bool` — bcrypt verify
3. `create_access_token(data: dict) -> str` — JWT encode with expiration (24h)
4. `get_current_user(token, db) -> User` — FastAPI Depends. Decodes JWT, looks up user by email/id, returns User ORM object. Raises 401 if invalid.
5. `get_current_admin(user) -> User` — Depends on `get_current_user`. Raises 403 if role != admin.

**Decision trace:**
- `passlib[bcrypt]` CryptContext — core.md §3 specifies passlib+bcrypt. Standard pattern: `CryptContext(schemes=["bcrypt"], deprecated="auto")`.
- JWT payload — store `sub` (user id or email) and `exp` (expiration). Standard JWT claims.
- Token extraction — `OAuth2PasswordBearer(tokenUrl="/api/login")`. Auto-integrates with FastAPI's OpenAPI docs.
- Two auth levels — `get_current_user` for any authenticated user (staff or admin), `get_current_admin` adds role check. Traced from core.md §2: admin has superset of employee permissions.

---

## Phase 1.7: Pydantic Schemas

### Overview
Request/response validation models for the auth endpoints and future CRUD operations.

### Changes Required:

#### 1.7.1 Schemas Module

**File:** `cch-backend/app/models/schemas.py`

**Traced from:** `core.md` Section 14 (field types/constraints), PHASE_1 doc (auth endpoints)

**Schemas needed for Phase 1:**

```python
# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    classification: Optional[str]
    classification_display: Optional[str]
    phone: Optional[str]
    assigned_location_ids: Optional[list]
    is_on_duty: bool
    is_active: bool
    current_workload: int
    max_workload: int
    hire_date: Optional[date]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

**Decision trace:**
- `LoginRequest` — simple email + password. core.md §2.1: JWT auth for staff/admin only.
- `TokenResponse` — standard OAuth2 format, FastAPI convention.
- `UserResponse` — excludes `hashed_password`, `notification_queue` (internal), and lat/lng (for security). Includes everything an employee/admin needs to see about themselves via GET /me.
- `from_attributes=True` — Pydantic v2 config for ORM model compatibility (replaces v1's `orm_mode`).

---

## Phase 1.8: Auth Router

### Overview
Two endpoints: POST `/api/login` and GET `/api/me`.

### Changes Required:

#### 1.8.1 Auth Routes

**File:** `cch-backend/app/routers/auth_routes.py`

**Traced from:** PHASE_1 doc — "POST /login, GET /me", core.md §2.1 — JWT auth for staff/admin

**Endpoints:**

1. `POST /api/login`
   - Accepts: `LoginRequest` (email + password) as JSON body
   - Logic: look up user by email → verify bcrypt password → create JWT → return token
   - Returns: `TokenResponse` with JWT
   - Errors: 401 if email not found or password wrong
   - Public (no auth required)

2. `GET /api/me`
   - Accepts: JWT in Authorization header
   - Logic: decode token → fetch user → return profile
   - Returns: `UserResponse`
   - Protected: requires valid JWT (any role)

**Decision trace:**
- Route prefix `/api` — PHASE_1 success criteria: "POST `/api/login`", "GET `/api/me`".
- Login accepts JSON, not form data — simpler for frontend integration. But also accept form data via `OAuth2PasswordRequestForm` for Swagger UI compatibility.
- No `/register` endpoint in Phase 1 — users created via seed script. Registration is admin-only (core.md §2.4 "Create and manage employee accounts").

---

## Phase 1.9: FastAPI Application

### Overview
Wire everything together: create app, configure CORS, register routers, create tables on startup.

### Changes Required:

#### 1.9.1 Main Application

**File:** `cch-backend/app/main.py`

**Traced from:** PHASE_1 doc — "FastAPI app, CORS, router registration", FILE_STRUCTURE.md, TECH_STACK.md "Dev Commands"

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import engine, Base
from app.routers import auth_routes

app = FastAPI(title="CCH Ordering & Dispatch System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],  # Agreed port for frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "cch-backend"}
```

**Decision trace:**
- CORS origin `localhost:5174` — agreed with user (free port for Vite frontend).
- Router prefix `/api` — matches success criteria paths: `/api/login`, `/api/me`.
- `create_all` on startup — creates tables if they don't exist. No Alembic needed for hackathon SQLite.
- Health check — PHASE_1 doc mentions "basic health check".

#### 1.9.2 Package Init Files

**Files:**
- `cch-backend/app/__init__.py` — empty
- `cch-backend/app/models/__init__.py` — empty
- `cch-backend/app/routers/__init__.py` — empty
- `cch-backend/app/services/__init__.py` — empty
- `cch-backend/app/utils/__init__.py` — empty

---

## Phase 1.10: Seed Script

### Overview
Populate the database with realistic demo data matching the seed spec in PHASE_1.

### Changes Required:

#### 1.10.1 Seed Script

**File:** `cch-backend/seed.py`

**Traced from:** PHASE_1 doc "Seed Data Spec", core.md §14, §8.1, §12

**Seed order** (respects FK dependencies):
1. Locations (7) — no FKs
2. Materials (20) — no FKs
3. Service Area Zips (15) — FK→locations
4. Users/Admins (2) + Staff (6) — references locations by ID
5. Requests (50+) — FK→locations, FK→users

**Seed Data Details:**

**Locations (7)** — core.md §1: "Utah region lock". PHASE_1: "Real Utah cities"
| City | Zip | Lat | Lng |
|------|-----|-----|-----|
| Salt Lake City | 84101 | 40.7608 | -111.8910 |
| Provo | 84601 | 40.2338 | -111.6585 |
| Ogden | 84401 | 41.2230 | -111.9738 |
| St. George | 84770 | 37.0965 | -113.5684 |
| Logan | 84321 | 41.7370 | -111.8338 |
| Park City | 84060 | 40.6461 | -111.4980 |
| Cedar City | 84720 | 37.6775 | -113.0619 |

**Materials (20)** — PHASE_1: "Across categories: Health Education, Behavioral Tools, Programming Resources, Event Supplies"
- Health Education (5): Nutrition Guide Kit, Oral Health Toolkit, Mental Health Awareness Pack, Physical Activity Program, Substance Prevention Materials
- Behavioral Tools (5): Positive Reinforcement Cards, Emotion Regulation Toolkit, Social Skills Board Game, Mindfulness Activity Set, Conflict Resolution Guide
- Programming Resources (5): STEM Activity Kit, Reading Program Bundle, Art Therapy Supplies, Music Education Pack, Digital Literacy Toolkit
- Event Supplies (5): Event Banner Set, Registration Table Kit, Promotional Materials Pack, Feedback Survey Bundle, First Aid Supply Kit

**Service Area Zips (15)** — PHASE_1: "Distributed across Utah. Vary equity_score"
- Mix of high equity (well-served, score 60-90) and low equity (underserved, score 10-40)
- Distributed across all 7 locations
- Some staffable, some not

**Admins (2)** — PHASE_1: "admin@cch.org, manager@cch.org"
- admin@cch.org — "Sarah Chen", role=admin
- manager@cch.org — "Michael Torres", role=admin
- Password: `password123` (agreed with user for dev)

**Staff (6)** — PHASE_1: "One of each classification". core.md §8.1 for classification details.
| Name | Email | Classification | Location |
|------|-------|---------------|----------|
| Emily Rodriguez | emily.r@cch.org | FT_W2 | Salt Lake City |
| James Park | james.p@cch.org | PT_W2 | Provo |
| Maria Santos | maria.s@cch.org | ON_CALL | Ogden |
| David Kim | david.k@cch.org | CONTRACTOR_1099 | St. George |
| Ashley Johnson | ashley.j@cch.org | VOLUNTEER | Logan |
| Ryan Mitchell | ryan.m@cch.org | OUTSIDE_HELP | Park City |

Each staff member gets:
- Realistic Utah phone number (801-xxx-xxxx or 435-xxx-xxxx)
- Schedule JSON: `[{day: "Monday", start: "08:00", end: "17:00", location_id: "..."}, ...]`
  - FT_W2: Mon-Fri 8-5
  - PT_W2: Mon/Wed/Fri 9-2
  - ON_CALL: Tue/Thu 10-4 + on_call_schedule
  - CONTRACTOR_1099: Mon/Tue/Wed 8-4
  - VOLUNTEER: Sat 9-1
  - OUTSIDE_HELP: by appointment (empty schedule)
- `current_lat`/`current_lng` near their assigned location
- `max_workload`: FT_W2=8, PT_W2=4, ON_CALL=6, CONTRACTOR_1099=5, VOLUNTEER=2, OUTSIDE_HELP=1
- Password: `password123`

**Requests (50+)** — PHASE_1: "Mix of all statuses, fulfillment types, urgency levels"
- Distribution:
  - Status: ~15 submitted, ~10 in_review, ~8 approved, ~6 dispatched, ~5 in_progress, ~5 fulfilled, ~2 cancelled
  - Fulfillment: ~60% staff, ~30% mail, ~10% pickup
  - Urgency: ~30% low, ~30% medium, ~25% high, ~15% critical
  - Dates: ~20% past (fulfilled), ~40% next 2 weeks, ~40% 2-8 weeks out
- Some requests with AI data pre-populated (for demo):
  - `ai_priority_score`, `priority_justification`, `ai_tags`, `ai_summary`
  - Dispatched/in_progress requests have `assigned_staff_id` and `assigned_location_id`
- Each request gets a unique `status_tracker_token` (uuid4 or short random string)
- `chatbot_used`: randomly True for ~40% of requests
- Realistic Utah event names: "Health Fair at Mountain View Elementary", "Community Wellness Night — West Valley", etc.

**Seed script behavior:**
- Drops and recreates all tables (clean slate for dev)
- Prints count of created records per table
- Runs as: `cd cch-backend && python seed.py`

### Success Criteria:

#### Automated Verification:
- [ ] `python seed.py` runs without errors
- [ ] Prints: "Seeded: 7 locations, 20 materials, 15 zips, 8 users, 50+ requests"
- [ ] `cch.db` file created in cch-backend/
- [ ] All 6 staff classifications present: `SELECT DISTINCT classification FROM users WHERE role='staff'` returns 6 rows
- [ ] Request count >= 50: `SELECT COUNT(*) FROM requests` >= 50
- [ ] All 8 statuses present: `SELECT DISTINCT status FROM requests` returns at least 6 distinct values

---

## Phase 1.11: Integration Verification

### Overview
Verify the complete Phase 1 works end-to-end.

### Success Criteria:

#### Automated Verification:
- [ ] `cd cch-backend && pip install -r requirements.txt` completes
- [ ] `python seed.py` populates all tables
- [ ] `uvicorn app.main:app --reload --port 8001` starts without errors
- [ ] `GET /api/health` returns `{"status": "ok"}`
- [ ] `POST /api/login` with `{"email": "admin@cch.org", "password": "password123"}` returns JWT
- [ ] `GET /api/me` with valid JWT returns user data with role="admin"
- [ ] `POST /api/login` with `{"email": "emily.r@cch.org", "password": "password123"}` returns JWT
- [ ] `GET /api/me` with that token returns user data with role="staff", classification="FT_W2"
- [ ] `POST /api/login` with wrong password returns 401
- [ ] Database has: 7 locations, 20 materials, 15 zips, 8 users, 50+ requests

#### Manual Verification:
- [ ] Open `http://localhost:8001/docs` — Swagger UI loads with login and me endpoints
- [ ] Can login via Swagger UI "Authorize" button

---

## Summary of Files Created

| # | File | Lines (est.) | Purpose |
|---|------|-------------|---------|
| 1 | `requirements.txt` | 9 | Python dependencies |
| 2 | `app/__init__.py` | 0 | Package marker |
| 3 | `app/main.py` | ~30 | FastAPI app, CORS, startup |
| 4 | `app/config.py` | ~40 | Env vars, constants |
| 5 | `app/auth.py` | ~60 | JWT + bcrypt + dependencies |
| 6 | `app/models/__init__.py` | 0 | Package marker |
| 7 | `app/models/enums.py` | ~45 | All enum definitions |
| 8 | `app/models/database.py` | ~20 | Engine, session, Base |
| 9 | `app/models/tables.py` | ~180 | 6 ORM models + indexes |
| 10 | `app/models/schemas.py` | ~40 | Pydantic models |
| 11 | `app/routers/__init__.py` | 0 | Package marker |
| 12 | `app/routers/auth_routes.py` | ~40 | Login + me endpoints |
| 13 | `app/services/__init__.py` | 0 | Package marker |
| 14 | `app/utils/__init__.py` | 0 | Package marker |
| 15 | `seed.py` | ~300 | Demo data population |

**Total: ~15 files, ~764 lines estimated**

---

## Decision Log

| Decision | Value | Source | Rationale |
|----------|-------|--------|-----------|
| Backend port | 8001 | User agreement | Port 8000 conventional but user wanted to find free port |
| Frontend port | 5174 | User agreement | For CORS config |
| Dev passwords | `password123` | User agreement | Hackathon, no real auth needed |
| JWT expiry | 24 hours | User agreement | Long enough for hackathon demo |
| JWT secret fallback | Auto-generate | User agreement | No real key needed for Phase 1 |
| No Alembic | Direct create_all | Scope decision | SQLite hackathon, no migrations needed |
| UUID string PKs | `str(uuid4())` | core.md §14.1 | Spec says "String (UUID)" |
| SQLite path | `./cch.db` | core.md §18.2 | At cch-backend root |
| Seed drops tables | Yes | Dev convenience | Clean slate on each seed run |
| Excluded packages | twilio, googlemaps, etc. | Phase scoping | Install when needed in later phases |

---

## References

- **Source of truth:** `docs/core.md` — V5 Build Spec
- **Phase spec:** `docs/PHASE_1_DATABASE_AUTH_SEED.md`
- **Schema detail:** `docs/DATABASE_SCHEMA.md`
- **Tech stack:** `docs/TECH_STACK.md`
- **File structure:** `docs/FILE_STRUCTURE.md`
- **Roles:** `docs/ROLE_PERMISSIONS.md`
