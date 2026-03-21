# CCH — Children's Community Health Ordering & Dispatch System

AI-powered platform for managing health education material requests, staff dispatch, and community outreach across Utah. Built for a university hackathon (10-minute presentation).

---

## THE SOURCE OF TRUTH

**[docs/core.md](docs/core.md)** is the V5 Build Spec — the single source of truth for this entire project. Every design decision, schema definition, role permission, and feature spec lives there. When in doubt, read core.md.

---

## Quick Stack Reference

| Layer | Technology | Directory |
|-------|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui | `cch-frontend/` |
| Backend | FastAPI + SQLAlchemy 2.0 + SQLite | `cch-backend/` |
| AI Gateway | OpenRouter (multi-model: Claude, GPT, Gemini, etc.) | `cch-backend/app/services/ai_service.py` |
| Maps | Google Maps JavaScript API (Utah region-locked) | `cch-frontend/src/components/map/` |
| Notifications | Twilio SMS + Voice (schedule-aware) | `cch-backend/app/services/twilio_service.py` |
| Auth | JWT + bcrypt (staff / admin roles) | `cch-backend/app/auth.py` |

## Documentation Index

All docs are **living documents** — update them as code evolves. Each has a changelog at the bottom.

### Core

| Doc | Purpose |
|-----|---------|
| [core.md](docs/core.md) | **V5 Build Spec — single source of truth.** All 19 sections. |
| [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | System description, 3 roles, 3 interfaces, design principles |
| [TECH_STACK.md](docs/TECH_STACK.md) | Full stack table, packages, versions, env vars |
| [FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) | Complete directory tree for frontend + backend |

### Reference

| Doc | Purpose |
|-----|---------|
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | All 6 tables — users, requests, locations, materials, zips, notifications |
| [AI_FEATURES.md](docs/AI_FEATURES.md) | OpenRouter gateway, 18 AI features, model config, system prompts |
| [ROLE_PERMISSIONS.md](docs/ROLE_PERMISSIONS.md) | 3 roles, feature-view matrix, access control |

### Build Phases

| Doc | Phase | Key Deliverables |
|-----|-------|-----------------|
| [PHASE_1](docs/PHASE_1_DATABASE_AUTH_SEED.md) | DB, Auth, Seed | SQLAlchemy models, JWT auth, seed data |
| [PHASE_2](docs/PHASE_2_BACKEND_CORE.md) | Backend Core | Routers, services, validators, WebSocket |
| [PHASE_3](docs/PHASE_3_FRONTEND_CHATBOT.md) | Frontend + Chatbot | React scaffold, request form, AI chatbot |
| [PHASE_4](docs/PHASE_4_AI_PRIORITY.md) | AI + Priority | OpenRouter integration, scoring, classification |
| [PHASE_5](docs/PHASE_5_DISPATCH_BRIEFS.md) | Dispatch + Briefs | Dispatch engine, Job Brief (7 sections) |
| [PHASE_6](docs/PHASE_6_GOOGLE_MAPS.md) | Google Maps | Utah-locked map, markers, routes, custom skin |
| [PHASE_7](docs/PHASE_7_TWILIO_SCHEDULES.md) | Twilio + Schedules | SMS/voice, schedule-aware, escalation chain |
| [PHASE_8](docs/PHASE_8_EMPLOYEE_MGMT_CONNECTORS.md) | Employee Mgmt + Connectors | Staff table, schedule manager, 9 fake connectors |
| [CALENDAR_PLAN](docs/plans/ADMIN_CALENDAR_SCHEDULING.md) | Admin Calendar & Scheduling | Drag-drop calendar, multi-staff, AI suggestions, coverage heatmap |
| [PHASE_9](docs/PHASE_9_ANALYTICS_POLISH.md) | Analytics + Polish | Charts, NL search, settings, mobile, demo prep |

## Demo Logins

| Role | Email | Password | Schedule |
|------|-------|----------|----------|
| Admin | `admin@cch.org` | `password123` | Mon-Fri 8-5 |
| Dev | `dev@dev.com` | `1234` | All days |
| Emily (FT_W2) | `emily@cch.org` | `emily` | Mon-Fri 8-5, SLC |
| James (PT_W2) | `james@cch.org` | `james` | Mon/Wed/Fri 9-2, Provo |
| Maria (ON_CALL) | `maria@cch.org` | `maria` | Tue/Thu 10-4, Ogden |
| David (1099) | `david@cch.org` | `david` | Mon/Tue/Wed 8-4, St. George |
| Ashley (VOL) | `ashley@cch.org` | `ashley` | Saturday 9-1, Logan |
| Ryan (OUTSIDE) | `ryan@cch.org` | `ryan` | No schedule, Park City |

Each employee sees only their own shifts + assigned tasks in the Staff Portal calendar.

## Development Commands

```bash
# Backend
cd cch-backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend
cd cch-frontend && npm install && npm run dev
```

## Workflow Commands

Claude Code commands are in `.claude/commands/parsa/`. Key commands:
- `/parsa:simple-plan` — Create an implementation plan
- `/parsa:implement-plan` — Execute a plan with parallel agents
- `/parsa:fix-bug` — Investigate and fix bugs
- `/parsa:review:all` — Run all 11 review principles in parallel
- `/parsa:linter:local-changes` — Validate local changes

## Architecture Principles

- **Dispatch-first**: This is a routing/operations platform, not a chatbot. Build dispatch and job briefs first, layer AI on top.
- **Utah region-locked**: All geographic features bounded to Utah. Zips must be 84xxx.
- **Role-defined features**: Every feature specifies what Partner, Employee, and Admin see. If it doesn't, it's incomplete.
- **AI via gateway**: All AI goes through OpenRouter. Model is configurable per feature.
- **Schedule-aware notifications**: Never notify off-shift employees. Queue for next shift.
