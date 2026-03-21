# Tech Stack — CCH Ordering & Dispatch System

> **Source of truth:** [core.md](core.md) | Sections 3, 4, 9.1, 18.3, 18.4
> This is a living document. Update it as the project evolves.

---

## Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | SPA with routes: /request, /admin, /staff |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS with accessible component library |
| Backend | FastAPI (Python 3.11+) | REST API, dispatch logic, AI orchestration, WebSocket |
| Database | SQLite 3 + SQLAlchemy 2.0 | Single-file DB, zero config, `check_same_thread=False` |
| Auth | python-jose + passlib | JWT tokens with bcrypt password hashing |
| Real-time | FastAPI WebSockets | Push status updates to connected dashboards |
| AI Gateway | OpenRouter API | Multi-model LLM access (Claude, GPT, Gemini, etc.) |
| Maps | Google Maps JavaScript API | Interactive map, markers, routes, Utah-locked |
| Directions | Google Maps Directions API | Travel time, ETA, routes with traffic |
| Geocoding | Google Maps Geocoding API | Zip code → lat/lng (Utah-bounded) |
| Notifications | Twilio SMS + Voice | Schedule-aware critical alerts with escalation |
| Charts | Recharts | Analytics dashboard visualizations |

---

## Frontend Packages

```json
{
  "react": "^18",
  "react-dom": "^18",
  "react-router-dom": "^6",
  "typescript": "^5",
  "vite": "^5",
  "tailwindcss": "^3",
  "@vis.gl/react-google-maps": "latest",
  "recharts": "^2",
  "lucide-react": "latest",
  "class-variance-authority": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```

**Important:** Use `@vis.gl/react-google-maps` for Google Maps integration. NOT `react-leaflet`.

shadcn/ui components are copy-pasted into `src/components/ui/` (not installed as a package).

---

## Backend Packages (requirements.txt)

```
fastapi
uvicorn[standard]
sqlalchemy
alembic
python-jose[cryptography]
passlib[bcrypt]
python-dotenv
httpx
twilio
pydantic
python-multipart
googlemaps>=4.10.0
ics
websockets
```

---

## Google Maps APIs

Enable all of the following in Google Cloud Console under a single API key:

1. **Maps JavaScript API** — interactive map rendering
2. **Directions API** — travel time, routes, traffic-aware ETA
3. **Geocoding API** — zip code to lat/lng conversion (Utah-bounded)
4. **Distance Matrix API** (optional) — batch distance calculations

---

## OpenRouter Integration

Single API endpoint for all LLM calls. See [AI_FEATURES.md](AI_FEATURES.md) for the full feature list and model configuration.

```python
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
```

Code pattern in core.md Section 4.2.

---

## Environment Variables

```bash
# JWT — generate: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=

# OpenRouter — https://openrouter.ai/keys
OPENROUTER_API_KEY=

# Google Maps — https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY=

# Twilio — https://console.twilio.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Config
TRAVEL_BUFFER_MINUTES=15
```

See `.env.example` at project root for the full template.

---

## Dev Commands

```bash
# Backend
cd cch-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd cch-frontend
npm install
npm run dev  # default port 5173
```

---

## Hosting (Production)

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | Auto-deploy from git, free tier works |
| Backend | Railway / Fly.io / Hetzner | Single `uvicorn` process |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
