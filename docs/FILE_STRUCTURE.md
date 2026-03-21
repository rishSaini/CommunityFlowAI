# File Structure — CCH Ordering & Dispatch System

> **Source of truth:** [core.md](core.md) | Section 18
> This is a living document. Update it as the project evolves.

---

## Frontend — `cch-frontend/`

```
cch-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives (Button, Input, Card, Dialog, Badge, etc.)
│   │   ├── forms/           # RequestForm, LoginForm, CheckinForm
│   │   ├── dashboard/       # DashboardCards, QueueItem, RequestDetail, StatusBadge
│   │   ├── dispatch/        # DispatchPanel, CandidateList, ClusterView
│   │   ├── brief/           # JobBrief, TravelCard, MaterialsChecklist, PriorityHeader
│   │   ├── analytics/       # DemandChart, UrgencyChart, EquityHeatmap, WeeklyDigest
│   │   ├── map/             # MapContainer, StaffMarker, RequestMarker, RouteOverlay
│   │   ├── employees/       # EmployeeTable, EmployeeDetail, ClassificationBadge
│   │   ├── connectors/      # ConnectorCard, SyncModal (9 fake enterprise connectors)
│   │   ├── calendar/        # AdminTeamCalendar (drag-drop), EmployeePersonalCalendar
│   │   ├── dispatch/        # MultiStaffAssignModal (team assignment)
│   │   ├── schedule/        # WeeklySchedule, AvailabilityInput, TaskCard
│   │   ├── chatbot/         # ChatbotPanel, MessageBubble, TypingIndicator
│   │   └── layout/          # Sidebar, Header, ProtectedRoute, RoleGate
│   ├── pages/               # Route-level page components
│   │   ├── RequestForm.tsx        # /request — public partner form
│   │   ├── StatusTracker.tsx      # /request/status/:token — public status page
│   │   ├── Login.tsx              # /login
│   │   ├── StaffCheckin.tsx       # /staff/checkin
│   │   ├── StaffDashboard.tsx     # /staff — My Queue, My Briefs, My Calendar
│   │   ├── JobBriefView.tsx       # /staff/brief/:id — full Job Brief
│   │   ├── AdminDashboard.tsx     # /admin — Master Queue, overview
│   │   ├── DispatchView.tsx       # /admin/dispatch — Dispatch Map + Panel
│   │   ├── Analytics.tsx          # /admin/analytics
│   │   ├── MapView.tsx            # /admin/map — full dispatch map
│   │   ├── StaffManagement.tsx    # /admin/staff — employee table
│   │   ├── ScheduleManager.tsx    # /admin/schedules
│   │   ├── Integrations.tsx       # /admin/integrations — 9 connector cards
│   │   └── Settings.tsx           # /admin/settings
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts             # JWT auth context, login/logout, role checks
│   │   ├── useRequests.ts         # Request CRUD, filtering, status updates
│   │   ├── useMap.ts              # Google Maps initialization, markers, routes
│   │   ├── useRealtime.ts         # WebSocket connection, live updates
│   │   ├── useDispatch.ts         # Dispatch candidates, assignment
│   │   ├── useBrief.ts            # Job Brief data, checklist state
│   │   └── useChatbot.ts          # Chatbot conversation, field updates
│   ├── lib/                  # Shared utilities and config
│   │   ├── apiClient.ts           # Axios/fetch wrapper with JWT headers
│   │   ├── constants.ts           # Utah bounds, urgency colors, classification codes
│   │   ├── wsClient.ts            # WebSocket client
│   │   ├── connectorMocks.ts      # Fake data for 9 enterprise connectors
│   │   ├── mapStyles.ts           # Google Maps custom skin JSON
│   │   └── openrouterModels.ts    # Model name constants for admin config
│   ├── types/                # TypeScript interfaces
│   │   └── index.ts               # Request, User, Location, Material, etc.
│   └── utils/                # Pure utility functions
│       ├── utahZipValidator.ts    # 84xxx validation
│       ├── urgencyColor.ts        # Urgency level → hex color mapping
│       └── classificationColor.ts # Classification code → color mapping
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── postcss.config.js
```

## Backend — `cch-backend/`

```
cch-backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration, startup events
│   ├── config.py            # Settings, env loading, AI model config per feature
│   ├── auth.py              # JWT creation/validation, bcrypt, get_current_user dependency
│   ├── models/
│   │   ├── database.py      # SQLAlchemy engine, SessionLocal, Base
│   │   ├── tables.py        # ORM models: 9 tables (User, Request, Location, Material, ShiftAssignment, etc.)
│   │   ├── schemas.py       # Pydantic models for request/response validation
│   │   └── enums.py         # Enums: Status, FulfillmentType, UrgencyLevel, Classification
│   ├── routers/
│   │   ├── requests.py      # CRUD for requests, status updates, submission pipeline
│   │   ├── auth_routes.py   # /login, /register, /me
│   │   ├── chatbot.py       # POST /api/chatbot — AI form assistant
│   │   ├── locations.py     # CRUD for CCH locations
│   │   ├── materials.py     # CRUD for materials catalog
│   │   ├── analytics.py     # Aggregated stats, demand data, equity scores
│   │   ├── search.py        # Natural language search via AI
│   │   ├── dispatch.py      # Candidate ranking, multi-staff dispatch assignment
│   │   ├── employees.py     # Staff management, schedules, check-in
│   │   ├── briefs.py        # Job Brief generation and retrieval
│   │   ├── admin.py         # Admin-only operations, settings, overrides
│   │   └── schedule.py      # Shift CRUD, templates, coverage, AI suggestions, team assignment
│   ├── services/
│   │   ├── ai_service.py         # OpenRouter gateway — all LLM calls
│   │   ├── dispatch_service.py   # 8-step dispatch algorithm
│   │   ├── directions_service.py # Google Directions API wrapper
│   │   ├── twilio_service.py     # SMS/voice, schedule-aware, escalation
│   │   ├── schedule_service.py   # Shift checks (concrete + pattern), on-call, exceptions
│   │   ├── schedule_management_service.py # Shift generation, conflict detection, coverage, AI suggestions
│   │   ├── geo_service.py        # Geocoding, Haversine, Utah bounds validation
│   │   ├── brief_service.py      # Job Brief composition
│   │   ├── chatbot_service.py    # Chatbot conversation management
│   │   ├── invite_service.py     # Event invite generation
│   │   ├── equity_service.py     # Geographic equity scoring
│   │   └── ws_manager.py         # WebSocket connection manager
│   └── utils/
│       ├── geo.py                # Haversine formula, distance calculations
│       ├── tokens.py             # Status tracker token generation
│       └── utah_validator.py     # Utah zip code and bounds validation
├── seed.py                  # Demo data: locations, materials, zips, users, requests
├── requirements.txt
├── .env
└── cch.db                   # SQLite database file (auto-created, gitignored)
```

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Frontend files | PascalCase for components, camelCase for utils/hooks | `RequestForm.tsx`, `useAuth.ts` |
| Backend files | snake_case | `ai_service.py`, `auth_routes.py` |
| CSS classes | Tailwind utilities | `className="flex items-center gap-2"` |
| Database columns | snake_case | `event_name`, `created_at` |
| API routes | kebab-case | `/api/requests`, `/api/staff/checkin` |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
| 2026-03-21 | Claude | Added `schedule.py` router, `schedule_management_service.py` service, `calendar/` components (AdminTeamCalendar, EmployeePersonalCalendar), `dispatch/MultiStaffAssignModal`. Updated tables.py (3 new tables), dispatch.py (multi-staff). |
