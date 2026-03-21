# CLAUDE CODE BUILD SPEC — V5

## Children's Community Health Ordering & Dispatch System

**Smart Dispatch · AI Chatbot Auto-Fill · Google Maps Travel · Job Briefs**
**OpenRouter Multi-Model AI · Employee Classification · Utah Region-Locked**

> This is the **single source of truth** for the entire project.
> Every design decision, schema definition, role permission, and feature spec lives here.
> All other docs extract from this file and link back to it.
> If this file and another doc conflict, **this file wins**.
>
> This is a living document. Update it as the project evolves.

**Stack:** React · FastAPI · SQLite · SQLAlchemy · OpenRouter · Twilio · Google Maps

---

## 1. Project Context

Children's Community Health manages educational materials, behavioral reinforcement tools, and programming resources for community events and partner organizations across Utah. Partners may request that Community Health staff attend events to provide in-person education and distribute materials, or they may request that materials and toolkits be mailed for self-facilitated events. Currently, all requests go through a Microsoft Form that routes to email. This system replaces that workflow with intelligent routing, automated dispatch, and AI-powered operations.

### UTAH REGION LOCK

Every geographic feature is bounded to Utah. Map initializes at 39.3210, -111.0937 (zoom 7). Max bounds: SW (36.99, -114.05) to NE (42.00, -109.04). Zip codes must be 84xxx. Geocoding bounded to Utah. Staff can only check in from Utah.

### What You Are Building

- A public request form with an AI chatbot that conversationally extracts information and auto-fills the form in real time while the partner watches.
- The form explicitly supports two request pathways: (A) Staff attend event to provide in-person education and distribute materials, or (B) Materials/toolkits mailed to requestor for self-facilitated events.
- A role-based admin dashboard for dispatch, analytics, employee management, and workforce connectors.
- A staff dashboard with Job Briefs, travel planning, schedule management, and regional maps.
- A Smart Dispatch System with geo-clustering, schedule-aware assignment, and Google Maps travel time.
- An AI backend (via OpenRouter — any model) that classifies, scores with justification, summarizes, and generates Job Briefs.
- A Twilio notification system that strictly respects employee schedules and on-call rotations.

### Core Design Principle

This is NOT a chatbot with forecasting. It is a real-time dispatch and operations platform. The AI chatbot on the form is a guided intake assistant that feeds structured data into the routing engine. The dispatch engine routes. The Job Brief system informs. The map visualizes. Build routing and job briefs first. Layer AI on top.

---

## 2. Three User Roles — Master View Definition

Every feature in this system is defined through three lenses. If a feature does not specify what each role sees, it is incomplete. This section is the master reference for role definitions. Every subsequent section references these roles.

### 2.1 Role Overview

| Role | Login | Primary Interface | Purpose |
|------|-------|-------------------|---------|
| Partner (Community) | None — public | Request Form + Status Tracker | Submit requests for staffed events or mailed materials |
| Employee (Staff) | JWT (role=staff) | Staff Dashboard + Job Briefs | Execute assignments, check in, manage schedule, view briefs |
| Admin | JWT (role=admin) | Admin Dashboard | Dispatch, approve, manage employees, analytics, settings |

### 2.2 Partner (Community Partner) View

Partners are external organizations, schools, nonprofits, and community groups. They NEVER log in. They interact with the system through two public interfaces:

**What Partners See:**
- **Request Form** (`/request`): the intake form with the AI chatbot. Partners can fill the form manually OR have the chatbot guide them through it conversationally.
- **Status Tracker** (`/request/status/:token`): after submission, a unique URL shows real-time status. Pipeline: Submitted → In Review → Approved → Dispatched → In Progress → Fulfilled.
- **Mini-Map on Form**: when they enter a zip code, a Google Map shows the nearest CCH location and whether staffing is available in their area.

**What Partners CANNOT See:**
- Any admin or employee interface.
- Other partners' requests.
- Internal notes, AI classifications, priority scores, staff assignments, dispatch data.
- Employee names, schedules, or contact info (they only see "Staff assigned — [First Name]" on the status tracker after dispatch).

### 2.3 Employee (Staff) View

Employees are Community Health team members of any classification (FT, PT, On-Call, Contractor, Volunteer, Outside Help). They log in with JWT auth.

**What Employees See:**
- **My Queue**: their assigned requests, sorted by priority score. Each item shows event name, date, urgency badge, priority score with AI justification, classification badge of assigned staff, AI summary preview.
- **Job Briefs** (`/staff/brief/:id`): full brief for each assignment. Priority header, travel card with departure countdown, event details, materials checklist, AI briefing, weather, quick actions.
- **My Briefs**: quick links to all active Job Briefs. Today's assignments highlighted with departure countdowns.
- **Fulfillment Workspace**: approved/dispatched requests with packing lists (MAIL), event details (STAFF), pickup info.
- **My Calendar**: week/month view of staffed events with travel time blocked.
- **My Schedule**: view own weekly schedule, on-call rotation (if ON_CALL), request time-off.
- **Staff Check-In** (`/staff/checkin`): zip code input to update their real-time location. Google Map showing check-in pin + nearby pending requests.
- **Regional Map**: Google Map scoped to their assigned locations and requests only.

**What Employees CANNOT See:**
- Other employees' assignments (only their own).
- Organization-wide analytics or demand trends.
- The dispatch panel or candidate ranking.
- Approval authority — they can move Submitted → In Review but cannot approve.
- Workforce connectors or integrations.
- System settings, urgency thresholds, or location management.
- Other employees' schedules or personal data (only their own).

### 2.4 Admin View

Admins are senior staff and managers with full system access. They see everything employees see PLUS strategic and oversight layers.

**What Admins See (In Addition to Employee View):**
- **Master Queue**: ALL requests across all locations. Priority scores with AI justifications. All AI fields. Natural language search. Bulk actions with AI suggestions.
- **Dispatch Panel** (inside request detail): candidate ranking with travel times, classification badges, schedule status, cluster opportunities, one-click dispatch.
- **Dispatch Map**: full Google Map with all staff pins (classification-colored), all request pins (urgency-colored with priority score), service radii, cluster regions, route overlays.
- **Analytics Dashboard**: demand trends, urgency distribution, staffing utilization, material usage, geographic equity heatmap, AI demand forecast, weekly digest.
- **Staff Management**: employee table with classification badges, schedule summary, on-duty toggle, workload, check-in freshness, on-call indicator. Click to edit full profile + schedule.
- **Schedule Manager**: calendar view of ALL staff schedules. Drag-to-edit. On-call rotation editor. Exception manager. Import buttons (fake connectors).
- **Integrations**: 9 workforce connector cards (ADP, QuickBooks, Kronos, Workday, Paychex, Symplr, QGenda, ShiftMed, Qualtrics). Admin only. All simulated.
- **Settings**: materials CRUD, locations CRUD (map preview), service area zips, urgency thresholds, Twilio config, user creation with classification dropdown, travel buffer config, OpenRouter model selection.
- **Notification Log**: audit trail of all Twilio notifications, including queued-then-delivered items.

**Admin-Only Actions:**
- Approve or reject requests (move to "approved" status).
- Dispatch staff to requests (assign + generate Job Brief).
- Override urgency level (triggers Twilio if escalated to CRITICAL).
- Override priority score and justification.
- Create and manage employee accounts with classification.
- Configure system settings.
- Access workforce connectors.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | SPA: /request, /admin, /staff/checkin, /staff/brief/:id |
| Styling | Tailwind CSS + shadcn/ui | Utility-first with accessible components |
| Backend | FastAPI (Python 3.11+) | API, dispatch, AI orchestration, Twilio, WebSocket |
| Database | SQLite 3 + SQLAlchemy 2.0 | Single file DB. Zero config. |
| Auth | FastAPI + python-jose + passlib | JWT tokens, bcrypt |
| Real-time | FastAPI WebSockets | Push updates to all connected dashboards |
| AI Gateway | OpenRouter API | Multi-model access. Any model on OpenRouter. Single API key. |
| Maps | Google Maps JavaScript API (custom skin) | Interactive map, markers, routes, Utah-locked |
| Directions | Google Maps Directions API | Travel time, ETA, routes, traffic |
| Geocoding | Google Maps Geocoding API | Zip to lat/lng (Utah-bounded) |
| Notifications | Twilio SMS + Voice | Schedule-aware critical alerts |
| Charts | Recharts | Analytics dashboards |
| Hosting FE | Vercel | Auto-deploy |
| Hosting BE | Hetzner / Railway / Fly.io | Single uvicorn process |

---

## 4. OpenRouter AI Gateway

All AI features in this system use OpenRouter (https://openrouter.ai) as the API gateway. OpenRouter provides a single API endpoint that routes to any LLM — Anthropic Claude, OpenAI GPT, Google Gemini, Meta Llama, Mistral, and hundreds more. This means we are not locked to a single provider and can select the best model for each task.

### 4.1 Why OpenRouter

- Single API key for all models. One integration, access to everything.
- Model flexibility: use Claude for complex classification, a faster/cheaper model for simple tagging, a specialized model for NLP extraction.
- Easy A/B testing: swap models per feature without code changes, just update the model string.
- OpenAI-compatible API format: standard messages array, same request/response shape.
- Rate limiting, fallbacks, and load balancing built in.

### 4.2 Integration Pattern

```python
# app/services/ai_service.py
import httpx
import os

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

async def call_ai(system_prompt: str, user_message: str, model: str = "anthropic/claude-sonnet-4") -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENROUTER_BASE_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cch-system.vercel.app",
                "X-Title": "CCH Ordering System"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]
```

### 4.3 Model Selection Per Feature

Each AI feature can use a different model. Store model strings in `config.py` so they can be changed without code edits. Recommended defaults:

| Feature | Recommended Model | Why |
|---------|------------------|-----|
| Master classification (submission) | anthropic/claude-sonnet-4 | Best structured output, JSON reliability |
| Chatbot (form auto-fill) | anthropic/claude-sonnet-4 | Conversational + structured extraction |
| Job Brief generation | anthropic/claude-sonnet-4 | Nuanced writing, mission briefing tone |
| NL search query parsing | openai/gpt-4o-mini | Fast, cheap, great at structured output |
| Tagging / simple classification | openai/gpt-4o-mini | Overkill to use a big model for tags |
| Weekly digest generation | anthropic/claude-sonnet-4 | Long-form writing quality |
| Dispatch recommendation | openai/gpt-4o-mini | Structured ranking, fast response |
| Priority justification | openai/gpt-4o-mini | Short generation, low latency |

Admin Settings page includes a Model Configuration panel where admins can change the model string for each feature via dropdown. Changes take effect immediately — no restart needed.

### 4.4 Environment Variable

```
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

One key. All models. Set it and forget it.

---

## 5. AI Chatbot — Form Auto-Fill Assistant

The public request form includes an AI-powered chatbot panel that conversationally guides partners through the request process. As the partner chats, the chatbot extracts structured data and auto-fills the form fields in real time — the partner watches the fields populate as they speak.

### 5.1 How It Works

- The chatbot appears as a collapsible panel on the right side of the request form (desktop) or a floating button that expands to a full-screen overlay (mobile).
- The partner can choose to: (A) fill the form manually (traditional), (B) chat with the assistant to have it fill the form, or (C) do both — start chatting, then manually edit any field.
- The chatbot opens with a greeting and immediately asks the first question. Questions are dynamic — the chatbot adapts based on answers.
- As the partner provides information, the chatbot extracts structured data and programmatically fills the corresponding form fields. The form fields visually animate (brief highlight/glow) when auto-filled so the partner sees it happening.
- The form and chatbot are bidirectional: if the partner manually edits a field that the chatbot filled, the chatbot acknowledges the change and moves on.
- At any point, the partner can switch between chat and manual entry seamlessly.

### 5.2 Chatbot Conversation Flow

The chatbot asks questions dynamically. It does not use a fixed script. Instead, it tracks which form fields are still empty and asks the most natural next question. Here is the general flow:

1. **Opening**: "Hi! I'm here to help you request materials or event support from Community Health. I'll ask a few questions and fill out the form for you. Let's start — what's your name?"
2. **After name**: "Thanks, {name}! What's the best email and phone number to reach you?"
3. **After contact**: "Great. Are you looking for Community Health staff to attend your event and provide in-person education, or would you prefer we mail materials for you to run the event yourself?"
   - This is the KEY question that routes the request. The chatbot uses the answer to set fulfillment type (STAFF vs MAIL) and adjusts subsequent questions accordingly.
4. **If STAFF**: "Tell me about your event — what's it called, when is it, and where will it be held?" then "About how many people do you expect?" then "Any specific topics or materials you'd like our staff to cover?"
5. **If MAIL**: "Where should we mail the materials? What's the event or program name?" then "What types of materials are you looking for?" (presents categories with descriptions).
6. **If PICKUP**: "Which of our locations would you like to pick up from?" (shows nearest based on their zip).
7. **Throughout**: the chatbot validates as it goes. If a date is in the past: "That date has already passed — did you mean {suggested future date}?" If a zip is non-Utah: "We currently serve Utah locations only. Is there a Utah address for this event?"
8. **Final**: "I've filled out everything. Take a look at the form and make any changes you'd like, then hit Submit when ready!"

### 5.3 Chatbot Technical Implementation

**Frontend:**
- React component: `ChatbotPanel.tsx` with a message list, text input, and send button.
- State: maintains a `messages[]` array (role + content) for the conversation history.
- On each user message: POST to `/api/chatbot` with `{messages[], current_form_state}`.
- Backend returns: `{reply: string, field_updates: {field_name: value, ...}}`.
- Frontend applies `field_updates` to the form state. Each updated field gets a CSS transition (0.3s background-color highlight, then fade).
- The form is a React controlled component. The chatbot writes to the same state as manual entry.

**Backend:**
- Endpoint: `POST /api/chatbot` (public, no auth required).
- Receives: full conversation history + current form state (which fields are filled, which are empty).
- Sends to OpenRouter: system prompt (below) + conversation messages.
- Parses response: extracts both the conversational reply and any structured `field_updates` JSON.
- Returns: `{reply, field_updates}` to the frontend.

**System Prompt for Chatbot:**

```
You are a friendly intake assistant for Children's Community Health in Utah.
Your job is to conversationally collect information to fill out a request form.

FORM FIELDS (extract these from the conversation):
- requestor_name (string, required)
- requestor_email (string, required)
- requestor_phone (string, required)
- event_name (string, required)
- event_date (YYYY-MM-DD, required, must be future)
- event_time (HH:MM, optional)
- event_city (string, required, must be in Utah)
- event_zip (string, required, must be 84xxx)
- fulfillment_type ("staff" | "mail" | "pickup", required)
- estimated_attendees (integer, optional)
- materials_requested (list of material names, optional)
- special_instructions (string, optional)
- alt_contact (string, optional)

RULES:
- Ask one question at a time. Be conversational and warm.
- After each user reply, extract any field values mentioned.
- CRITICAL: Early in the conversation, ask whether they want STAFF to attend
  their event for in-person education, or prefer materials MAILED to them.
- Validate as you go: dates must be future, zips must be Utah (84xxx).
- Track which fields are still empty from the current_form_state.
- Ask about empty required fields next. Skip already-filled fields.
- When all required fields are filled, confirm and tell them to review + submit.

RESPONSE FORMAT (return ONLY valid JSON):
{
  "reply": "Your conversational message to the partner",
  "field_updates": {"field_name": "value", ...}  // only fields extracted this turn
}
```

### 5.4 View Definitions for Chatbot

| Role | Sees | Experience |
|------|------|-----------|
| Partner | Chatbot panel on request form. Real-time auto-fill with field highlights. | Guided, conversational. Can switch to manual entry at any time. |
| Employee | Nothing — chatbot is on the public form only. | N/A |
| Admin | Chatbot model config in Settings. Usage analytics (how many partners used chatbot vs manual). | Can change the AI model powering the chatbot. See completion rates. |

---

## 6. Request Form — Partner Interface

The request form is the primary partner-facing interface. It explicitly supports two request pathways as stated in the business case: (A) Staff attend event to provide in-person education and distribute materials, or (B) Materials/toolkits mailed for self-facilitated events. A third option, Pickup, is also available.

### 6.1 Fulfillment Type Selection (Prominent)

This is NOT buried in a dropdown. It is the FIRST major decision on the form, displayed as three large, visually distinct cards that the partner selects:

**Card A: "Request Staff at Our Event"**
- Icon: people with a presentation.
- Description: "Community Health staff will attend your event to provide in-person health education and distribute materials to attendees."
- When selected: form reveals event-specific fields (event name, date, time, city, zip, estimated attendees, materials selection).

**Card B: "Mail Materials to Us"**
- Icon: package with an arrow.
- Description: "We'll mail educational materials and toolkits to your address so you can facilitate the event yourself."
- When selected: form reveals mailing fields (event/program name, date needed by, mailing address, city, zip, materials selection). Hides attendee count and event time.

**Card C: "Pick Up Materials"**
- Icon: hand receiving a box.
- Description: "Pick up materials from one of our Utah locations."
- When selected: shows a location selector (dropdown or mini-map of CCH locations) plus materials selection and preferred pickup date.

### 6.2 Form Fields

**Required Fields (All Types):**
- Requestor name, email, phone.
- Event or program name.
- Event date (or "needed by" date for MAIL).
- City + zip (Utah only, 84xxx validated).
- Fulfillment type (selected via cards above).

**Conditional Fields (Staff Events):**
- Event time (HH:MM).
- Estimated attendees.
- Event venue / location name.

**Conditional Fields (Mail):**
- Mailing address (full street address).
- Date needed by (instead of event date).

**Optional Fields (All Types):**
- Materials requested (multi-select from catalog, grouped by category).
- Special instructions / notes (textarea — NLP processed).
- Alternate contact.

### 6.3 Smart Features on Form

- AI Chatbot: collapsible panel that auto-fills (see Section 5).
- Utah zip validation with error message.
- Mini-map: on zip blur, shows nearest CCH location + staffing availability.
- Materials dropdown: grouped by category with search/filter.
- Date picker: future dates only with calendar UI.
- Inline validation: real-time as user types.

### 6.4 View Definitions for Request Form

| Role | Sees | Notes |
|------|------|-------|
| Partner | The form + chatbot + mini-map + confirmation + status tracker. | Public. No login. Full experience. |
| Employee | Nothing — employees do not submit requests. | N/A |
| Admin | Can view submitted form data in the request detail panel (read-only copy of what partner entered). Can see chatbot usage stats in analytics. | Admin sees the DATA, not the form itself. |

---

## 7. Priority Scoring with AI Justification

Every request gets a Priority Score from 0 to 100 AND a human-readable AI justification explaining WHY it received that score. The justification is 2–3 sentences generated by the AI during the master classification call. It is visible to employees and admins on every queue item, request detail, and Job Brief.

### 7.1 Scoring Factors

| Factor | Weight | Logic |
|--------|--------|-------|
| Time urgency | 35% | <7 days = 100pts. 7–14 = 75. 14–30 = 50. 30+ = 25. Past due = 100. |
| Estimated attendance | 20% | 500+ = 100. 200–499 = 75. 50–199 = 50. <50 = 25. |
| Equity factor | 20% | equity_score < 30 = 100pts. 30–60 = 50. 60+ = 25. |
| Fulfillment complexity | 10% | STAFF = 100. MAIL = 50. PICKUP = 25. |
| Requestor history | 10% | First-time = 75. Returning = 50. Frequent = 25. |
| Special flags | 5% | Emergency keywords = 100. Incomplete = +25. |

### 7.2 AI Justification

The master classification AI call returns a `priority_justification` field: 2–3 sentences explaining the score in plain English. Examples:

**Score: 84/100**
> "This request scores high because the event is only 5 days away with 350 expected attendees in zip code 84119, which is flagged as an underserved area. The combination of time urgency, large audience, and equity priority drives the elevated score."

**Score: 31/100**
> "Standard priority. The event is 6 weeks out with approximately 40 attendees in a well-served area. No urgency flags detected. Mail fulfillment reduces complexity."

**Score: 92/100**
> "Critical priority. Event is tomorrow with 500+ expected attendees. The requestor's notes contain emergency language ('last minute', 'urgent need'). This zip code has received 72% fewer staff visits than the regional average. Immediate attention required."

### 7.3 Priority Justification in the AI Output Schema

Add to the master classification output:
```json
"ai_priority_score": 84,
"priority_justification": "This request scores high because..."
```
Stored in a new column on the requests table: `priority_justification` (Text).

### 7.4 View Definitions for Priority

| Role | What They See | Where |
|------|--------------|-------|
| Partner | Nothing — priority score is internal only. | N/A |
| Employee | Priority score (large number) + justification (2–3 sentences) on every queue item and Job Brief. | My Queue, Job Brief priority header |
| Admin | Same as employee + ability to override both score and justification. Override logged. | Master Queue, Request Detail, Dispatch Panel |

---

## 8. Employee Classification & Scheduling

### 8.1 Six Classification Types

| Classification | Code | Tax | Dispatch Priority | Task Restrictions | Notification Window |
|---------------|------|-----|-------------------|-------------------|-------------------|
| Full-Time | FT_W2 | W-2 | 1 (highest) | None | Scheduled hours only |
| Part-Time | PT_W2 | W-2 | 2 | All tasks, limited hours | Scheduled hours only |
| On-Call | ON_CALL | W-2 | 1 for CRITICAL/HIGH | All tasks when activated | 24/7 during rotation |
| Contractor | CONTRACTOR_1099 | 1099 | 3 (overflow) | No patient contact unless credentialed | Scheduled hours only |
| Volunteer | VOLUNTEER | N/A | 4 | Educational materials only. Supervised. | Scheduled hours only |
| Outside Help | OUTSIDE_HELP | Varies | 5 (lowest) | Pre-approved events only | Never automated |

### 8.2 Schedule-Aware Notification Rules

Notifications ONLY go to employees during working hours. ON_CALL in rotation is the only exception. Off-shift messages are queued and batch-delivered at next shift start.

```python
def should_notify(user, urgency_level) -> bool:
    if user.classification == 'OUTSIDE_HELP': return False
    if not user.is_on_duty: return False
    if schedule_service.has_exception_today(user, 'off'): return False
    if schedule_service.is_on_shift_now(user): return True
    if user.classification == 'ON_CALL' and schedule_service.is_in_on_call_rotation(user): return True
    return False  # Queue for next shift
```

### 8.3 Schedule-Aware Request Routing

The dispatch engine filters out off-shift employees before ranking. CRITICAL requests with no on-shift candidates check ON_CALL first, then FT_W2 with "after-hours override — admin confirmation required" flag.

### 8.4 View Definitions for Employee Management

| Role | Sees | Can Do |
|------|------|--------|
| Partner | Nothing. | N/A |
| Employee | Own classification badge everywhere. Own schedule. Own on-call rotation. Time-off request form. | View own schedule, request time-off, check in location |
| Admin | All employees: table with classification badges, schedules, workload, check-in freshness, on-call indicator. Schedule Manager with calendar grid. | Create/edit employees, set classification, edit schedules, manage on-call rotations, toggle on-duty, assign locations |

---

## 9. Google Maps Integration

Custom-skinned Google Maps with Utah bounds lock. Muted grayscale base, branded accents, custom SVG markers for locations/staff/requests. Route rendering via Directions API with animated polylines.

### 9.1 APIs Required

Maps JavaScript API, Directions API, Geocoding API, Distance Matrix API (optional).
Single API key: `GOOGLE_MAPS_API_KEY`. Enable all in Google Cloud Console.
Use `@vis.gl/react-google-maps` for React integration. NOT react-leaflet.

### 9.2 Custom Skin

Muted grayscale base. Branded blue water. Reduced labels. Utah boundary stroke.
Generate style JSON at mapstyle.withgoogle.com. Pass to Map constructor.

### 9.3 Travel Time

Google Directions API with `departure_time=now` for traffic-aware ETA.
Departure calc: `event_time - travel_duration - buffer_minutes` (default 15, configurable).
Cache travel times 15 min to limit API costs. Python: `googlemaps>=4.10.0`.

### 9.4 View Definitions for Maps

| Role | Map Experience |
|------|---------------|
| Partner | Mini-map on form: shows nearest CCH location when zip entered. Status tracker: no map. |
| Employee | Regional Map: only their assigned locations + their requests. Check-in map: their position + nearby requests. Job Brief: embedded route map for their assignment. |
| Admin | Full Dispatch Map: all staff (classification-colored), all requests (urgency-colored + priority), clusters, routes, service radii, equity overlay, traffic toggle. Analytics Map: equity heatmap, demand density. |

---

## 10. Job Brief System

When staff are dispatched, the system generates a comprehensive Job Brief at `/staff/brief/:request_id`.

### 10.1 Brief Sections

1. **Priority Header** — Urgency-colored banner. Priority score large. AI justification (2–3 sentences from Section 7). Urgency label.
2. **Travel Card** — Embedded Google Map route. Traffic-aware travel time. Distance. Recommended departure time with countdown. "Open in Google Maps" deep link. AI traffic tip.
3. **Event Details** — Event name, date, time, venue, address. Requestor name + tap-to-call + email. Attendees. Fulfillment type badge. Cluster context ("Stop 2 of 3").
4. **Materials Checklist** — Interactive checkboxes. Name, quantity, category badge per item. Highlight items mentioned in special instructions.
5. **AI Briefing** — 2–3 paragraph mission brief: what to expect, audience context, talking points, requestor history, equity notes.
6. **Weather & Conditions** — Event-day weather for zip. Outdoor event detection. Road conditions (can be hardcoded for prototype).
7. **Quick Actions** — Navigate (Google Maps), Call Requestor, Message Requestor, Mark Arrived (status → in_progress), Mark Complete (status → fulfilled), Report Issue.

### 10.2 View Definitions for Job Briefs

| Role | Sees | Can Do |
|------|------|--------|
| Partner | Nothing — Job Briefs are internal. | N/A |
| Employee | Own Job Briefs only. Full brief at /staff/brief/:id. Brief links in My Queue and My Briefs. | View brief, use checklist, navigate, mark arrived/complete, report issue |
| Admin | All Job Briefs for all staff. Can view any brief. Can regenerate a brief with updated data. | View all briefs, regenerate briefs, see which staff have viewed their briefs |

---

## 11. Smart Staff Dispatch

Routes to nearest/available/qualified staff. Schedule-aware, classification-priority, geo-clustered, Google Maps travel time.

**Step 1:** Get active, on-duty staff.
**Step 2:** Filter by schedule availability for event date/time.
**Step 3:** Filter by classification task restrictions.
**Step 4:** Filter by workload < max_workload.
**Step 5:** Haversine for initial distance ranking. Google Directions for top 5 travel time.
**Step 6:** Rank: classification_priority → travel_time → workload → equity_bonus.
**Step 7:** Cluster check: pending STAFF requests within 10 miles. Multi-stop plan with Google optimize_waypoints.
**Step 8:** Return ranked candidates + cluster opportunities.

### 11.1 View Definitions for Dispatch

| Role | Sees | Can Do |
|------|------|--------|
| Partner | Status tracker shows "Staff Assigned" with first name only after dispatch. | N/A |
| Employee | Sees assignment in My Queue and Job Brief. Does not see other candidates or the dispatch panel. | Accept assignment (implicit via viewing brief) |
| Admin | Full dispatch panel: candidate ranking with travel times + classification badges + schedule status + cluster opportunities. Dispatch Map with all staff/requests. | One-click dispatch, override recommendation, create cluster plans, reassign |

---

## 12. Urgency & Schedule-Aware Twilio

| Level | Color | Criteria | SLA | Notification |
|-------|-------|----------|-----|-------------|
| LOW | #27AE60 | 30+ days, standard | 5 biz days | In-app only, during hours |
| MEDIUM | #2E86C1 | 14–30d, >50 ppl, first-time | 3 biz days | In-app, during hours |
| HIGH | #E67E22 | 7–14d, >200 ppl, underserved zip | 1 biz day | SMS during hours, in-app |
| CRITICAL | #C0392B | <7d, >500 ppl, emergency, admin escalation | 2 hours | SMS+Voice to on-shift + ON_CALL |

**Escalation:** Min 0 SMS on-shift+OC → Min 15 voice call → Min 30 all on-shift admins.
**NEVER** notify off-shift non-on-call. Queue for next shift.
**OUTSIDE_HELP** never gets automated notifications.

### 12.1 View Definitions for Urgency/Notifications

| Role | Sees |
|------|------|
| Partner | Status tracker shows urgency as a colored badge (no label like "CRITICAL" — just color). |
| Employee | Urgency badge + label on queue items and Job Brief. Receives SMS/voice only during their working hours or on-call rotation. |
| Admin | Full urgency controls: override urgency level (triggers Twilio if escalated). View notification log. Configure thresholds in Settings. See escalation chain status. |

---

## 13. Workforce Connectors (Simulated — Admin Only)

9 connector cards: ADP Workforce Now, QuickBooks, Kronos (UKG), Workday, Paychex, Symplr, QGenda, ShiftMed, Qualtrics. Fake modals, fake sync, fake import results. ADMIN VIEW ONLY. Frontend-only mocks.

| Role | Sees |
|------|------|
| Partner | Nothing. |
| Employee | Nothing. |
| Admin | Full Integrations page with 9 connector cards. Configure modals. Fake sync results. Connected/Not Connected status pills. |

---

## 14. Database Schema

SQLite + SQLAlchemy 2.0. `check_same_thread=False`.

### 14.1 users

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| email | String | UNIQUE, NOT NULL |
| hashed_password | String | bcrypt |
| full_name | String | NOT NULL |
| role | String | staff \| admin |
| classification | String | FT_W2 \| PT_W2 \| ON_CALL \| CONTRACTOR_1099 \| VOLUNTEER \| OUTSIDE_HELP |
| classification_display | String | Human-readable label |
| phone | String | Twilio + dispatch |
| assigned_location_ids | JSON | List of location UUIDs |
| schedule | JSON | [{day, start, end, location_id}] |
| schedule_exceptions | JSON | [{date, type, reason?, start?, end?}] |
| on_call_schedule | JSON | [{start_date, end_date, start_time, end_time}] (ON_CALL only) |
| current_lat | Float | Last check-in (Utah) |
| current_lng | Float | Last check-in |
| last_checkin_at | DateTime | Freshness |
| current_workload | Integer | Default 0 |
| max_workload | Integer | Default 5 |
| is_on_duty | Boolean | Default True |
| is_active | Boolean | Default True |
| hire_date | Date | Display |
| certifications | JSON | Cert strings |
| notification_queue | JSON | [{request_id, message, queued_at}] |
| created_at | DateTime | utcnow() |

### 14.2 requests

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| status | String | submitted \| in_review \| approved \| dispatched \| in_progress \| fulfilled \| sent_to_qualtrics \| cancelled |
| fulfillment_type | String | staff \| mail \| pickup |
| urgency_level | String | low \| medium \| high \| critical |
| requestor_name | String | NOT NULL |
| requestor_email | String | NOT NULL |
| requestor_phone | String | NOT NULL |
| event_name | String | NOT NULL |
| event_date | Date | NOT NULL |
| event_time | String | HH:MM optional |
| event_city | String | NOT NULL, Utah |
| event_zip | String | NOT NULL, 84xxx |
| event_lat | Float | Geocoded, Utah bounds |
| event_lng | Float | Geocoded, Utah bounds |
| mailing_address | String | Full street address (MAIL type only) |
| estimated_attendees | Integer | Optional |
| materials_requested | JSON | [{material_id, quantity}] |
| special_instructions | Text | NLP processed |
| alt_contact | String | Optional |
| assigned_location_id | String FK | Auto by proximity |
| assigned_staff_id | String FK | Dispatch-assigned |
| cluster_id | String | Co-dispatched group |
| ai_classification | JSON | Full AI output |
| ai_tags | JSON | Tag list |
| ai_priority_score | Float | 0–100 |
| priority_justification | Text | AI-generated 2–3 sentence explanation of score |
| ai_urgency | JSON | {level, reasons[], auto_escalated} |
| ai_flags | JSON | {incomplete, inconsistent, duplicate, details} |
| ai_summary | Text | One-paragraph summary |
| dispatch_recommendation | JSON | {staff_id, travel_time, distance, classification, cluster?, rationale} |
| job_brief | JSON | {urgency_sentence, briefing, weather_note, traffic_tip, travel_info} |
| travel_info | JSON | {duration_sec, duration_text, distance_m, distance_text, traffic_text, departure_time, polyline} |
| admin_notes | Text | Internal |
| twilio_notified | Boolean | Default False |
| chatbot_used | Boolean | Default False. Whether partner used chatbot to fill form. |
| status_tracker_token | String | UNIQUE |
| created_at | DateTime | utcnow() |
| updated_at | DateTime | Auto-updated |

### 14.3 Other Tables

**locations:** id, name, address, city (Utah), state ("UT"), zip_code (84xxx), lat, lng, service_radius_miles, is_active, phone, on_duty_admin_phone, created_at.

**materials_catalog:** id, name, category, description, in_stock.

**service_area_zips:** zip_code (84xxx PK), location_id FK, region_name, is_staffable, equity_score, total_requests, total_staff_visits.

**notification_log:** id, request_id FK, recipient_phone, recipient_name, channel, urgency_level, message_body, twilio_sid, sent_at, status, queued_until.

---

## 15. AI Features (via OpenRouter)

All AI calls go through OpenRouter. Model is configurable per feature. Default models in `config.py`, overridable in Admin Settings.

| # | Feature | Trigger | Model Default |
|---|---------|---------|--------------|
| 1 | Master classification + confidence | On submission | anthropic/claude-sonnet-4 |
| 2 | Priority scoring (0–100) + AI justification | On submission | anthropic/claude-sonnet-4 |
| 3 | NLP extraction from notes | On submission | anthropic/claude-sonnet-4 |
| 4 | Automated tagging | On submission | openai/gpt-4o-mini |
| 5 | Urgency classification + Twilio trigger | On submission | anthropic/claude-sonnet-4 |
| 6 | Incomplete/inconsistent flagging | On submission | anthropic/claude-sonnet-4 |
| 7 | Request summary | On submission | anthropic/claude-sonnet-4 |
| 8 | Anomaly & duplicate detection | On submission | anthropic/claude-sonnet-4 |
| 9 | Chatbot form auto-fill | On each chat message | anthropic/claude-sonnet-4 |
| 10 | Job Brief generation | On dispatch | anthropic/claude-sonnet-4 |
| 11 | Dispatch recommendation | Admin views panel | openai/gpt-4o-mini |
| 12 | Geographic routing (Haversine + Google) | On submission | N/A (pure math) |
| 13 | Geographic equity scoring | Nightly batch | N/A (SQL aggregation) |
| 14 | Demand forecasting | Dashboard load | anthropic/claude-sonnet-4 |
| 15 | Natural language admin search | Search input | openai/gpt-4o-mini |
| 16 | Event invite generation | Admin clicks Generate | anthropic/claude-sonnet-4 |
| 17 | Weekly executive digest | Monday cron | anthropic/claude-sonnet-4 |
| 18 | Intelligent bulk actions | Admin selects 2+ | openai/gpt-4o-mini |

### 15.1 View Definitions for AI Features

| Role | AI Visibility |
|------|--------------|
| Partner | Chatbot interaction only. All other AI is invisible. Partner does not see scores, tags, flags, summaries, or justifications. |
| Employee | Sees AI summary, priority score + justification, urgency level, and AI briefing in Job Brief. Does not see raw AI classification data, flags, or confidence scores. |
| Admin | Sees everything: full AI classification JSON, confidence scores, flags, tags, priority score + justification (editable), dispatch recommendation + rationale, NL search, bulk action suggestions, forecasts, digests. Can configure models per feature in Settings. |

---

## 16. End-to-End Data Flow

1. Partner opens `/request`. Chooses to chat with AI assistant or fill form manually.
2. If chatbot: partner chats, chatbot extracts data and auto-fills form fields in real time. Key question: "Do you want staff at your event for in-person education, or materials mailed to you?"
3. Partner reviews auto-filled form (or manually filled), submits.
4. Frontend validates Utah zip (84xxx), required fields, future date. POST to `/api/requests`.
5. Backend validates zip. Geocodes via Google Maps (Utah-bounded). Verifies lat/lng in Utah.
6. Haversine to all locations. Assigns nearest. Checks service radius.
7. OpenRouter AI call (master classification): returns fulfillment type + confidence, urgency + reasons, priority score + AI justification (2–3 sentences), tags, summary, flags.
8. Dispatch service: filters by schedule + classification + workload. Google Directions for top candidates. Cluster check. Stores recommendation.
9. Written to SQLite. `status=submitted`. Token generated.
10. If critical: check on-shift + on-call. Twilio to eligible only. Escalation timer.
11. WebSocket broadcasts to dashboards.
12. Admin reviews. Sees priority 84/100 with justification: "Scores high because event is 5 days away with 350 attendees in underserved zip." Sees dispatch recommendation with travel times.
13. Admin clicks Dispatch. Staff assigned. Google travel info calculated. Job Brief generated (OpenRouter AI + travel + materials + history).
14. If staff on-shift: immediate SMS with brief link. If off-shift: queued for next shift.
15. Staff opens Job Brief. Sees priority header, travel card with departure countdown, materials checklist, AI briefing. Taps Navigate → Google Maps.
16. Staff arrives, marks `in_progress`. Completes event, marks `fulfilled`.
17. Analytics update. Equity scores recalc nightly.

---

## 17. Complete Feature × View Matrix

| Feature | Partner View | Employee View | Admin View |
|---------|-------------|--------------|------------|
| Request Form | Full form + chatbot + mini-map | Not visible | View submitted data in request detail |
| Chatbot Auto-Fill | Interactive chatbot panel. Sees fields auto-fill. | Not visible | Usage analytics. Model config in Settings. |
| Status Tracker | Full pipeline. Urgency color only (no label). Staff first name after dispatch. | Not visible | Not used (admin has queue) |
| Login | Not applicable | Login page | Login page |
| Queue | N/A | My Queue: assigned requests, priority + justification, urgency badge | Master Queue: all requests, all AI data, NL search, bulk actions |
| Request Detail | N/A | Assigned requests only. AI summary, priority, urgency. Can edit notes, move to In Review. | All requests. Full AI data. Dispatch panel. Override priority/urgency. Approve/reject. |
| Dispatch Panel | N/A | Not visible | Candidate ranking, travel times, clusters, one-click dispatch |
| Job Brief | N/A | Own briefs only. Full brief with all 7 sections. | All briefs. Can regenerate. |
| Priority Score | Never visible | Score + justification on queue items and briefs | Score + justification + override capability |
| AI Classification | Never visible | Summary and tags only | Full JSON: confidence, flags, rationale, raw output |
| Map | Mini-map on form (nearest location) | Regional map (own locations/requests). Brief route map. | Full dispatch map + analytics map. All markers, routes, clusters, equity overlay. |
| Calendar | N/A | Own events with travel blocks | All staff calendars |
| Schedule | N/A | Own schedule. Time-off requests. | All schedules. Edit/assign. On-call rotations. Bulk edit. |
| Check-In | N/A | Check-in page. Own position + nearby requests. | See all check-in freshness on staff table and map |
| Employee Mgmt | N/A | Own profile only | Full staff table. CRUD. Classification. Workload. Assignments. |
| Analytics | N/A | Quick stats (own metrics only) | Full dashboard: demand, urgency, utilization, equity, forecast, digest |
| Connectors | N/A | Not visible | 9 connector cards. Fake modals and sync. |
| Settings | N/A | Not visible | All config: materials, locations, zips, urgency, Twilio, AI models, travel buffer |
| Notifications | N/A | Receives SMS/voice during hours only. Queued batch on shift start. | Notification log. Escalation status. Config. |
| Fulfillment | N/A | Workspace: packing lists, event details, pickup info for assigned requests | View all fulfillment status |

---

## 18. Project Structure

### 18.1 Frontend

```
cch-frontend/src/
  components/ → ui/, forms/, dashboard/, dispatch/, brief/, analytics/,
                  map/, employees/, connectors/, calendar/, schedule/,
                  chatbot/ (ChatbotPanel, MessageBubble, TypingIndicator),
                  layout/ (Sidebar, Header, ProtectedRoute, RoleGate)
  pages/ → RequestForm, StatusTracker, Login, StaffCheckin, StaffDashboard,
           JobBriefView, AdminDashboard, DispatchView, Analytics, MapView,
           StaffManagement, ScheduleManager, Integrations, Settings
  hooks/ → useAuth, useRequests, useMap, useRealtime, useDispatch, useBrief, useChatbot
  lib/ → apiClient, constants, wsClient, connectorMocks, mapStyles, openrouterModels
  types/ → TS interfaces
  utils/ → utahZipValidator, urgencyColor, classificationColor
```

### 18.2 Backend

```
cch-backend/app/
  main.py, config.py, auth.py
  models/ → database.py, tables.py, schemas.py, enums.py
  routers/ → requests.py, auth_routes.py, chatbot.py, locations.py, materials.py,
             analytics.py, search.py, dispatch.py, employees.py, briefs.py, admin.py
  services/ → ai_service.py (OpenRouter), dispatch_service.py, directions_service.py,
              twilio_service.py, schedule_service.py, geo_service.py, brief_service.py,
              chatbot_service.py, invite_service.py, equity_service.py, ws_manager.py
  utils/ → geo.py, tokens.py, utah_validator.py
seed.py, requirements.txt, .env, cch.db
```

### 18.3 Environment Variables

```
JWT_SECRET_KEY=openssl_rand_hex_32
OPENROUTER_API_KEY=sk-or-v1-your_key
GOOGLE_MAPS_API_KEY=your_key
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TRAVEL_BUFFER_MINUTES=15
```

### 18.4 requirements.txt

```
fastapi, uvicorn[standard], sqlalchemy, alembic, python-jose[cryptography], passlib[bcrypt],
python-dotenv, httpx, twilio, pydantic, python-multipart, googlemaps, ics, websockets
```

---

## 19. Build Order

**Phase 1: DB, Auth, Seed (Day 1)**
SQLAlchemy models. auth.py (JWT+bcrypt). seed.py: 7 Utah locations, 20 materials, 15 zips, 2 admins, 6 staff (all classifications), 50+ requests.

**Phase 2: Backend Core (Day 1–2)**
Utah validator. geo_service (Google Geocoding). schedule_service. directions_service. Request pipeline. CRUD. WebSocket. Chatbot endpoint.

**Phase 3: Frontend + Chatbot (Day 2)**
React scaffold. Routing. Auth context. Public form with fulfillment type cards (Staff/Mail/Pickup). Chatbot panel with auto-fill animation. Status tracker. Login. Check-in.

**Phase 4: AI + Priority (Day 2–3)**
ai_service.py with OpenRouter. Master classification with priority_score + priority_justification. Wire into submission. Queue with priority badges + justification text.

**Phase 5: Dispatch + Briefs (Day 3)**
dispatch_service. brief_service. Dispatch panel. Job Brief page (all 7 sections). Cluster detection.

**Phase 6: Google Maps (Day 3–4)**
Custom skin. Utah bounds. SVG markers. Route rendering. Dispatch map. Analytics map. Regional map. Form mini-map.

**Phase 7: Twilio + Schedules (Day 4)**
should_notify() with schedule check. Queued notifications. ON_CALL path. Escalation chain. Notification log.

**Phase 8: Employee Mgmt + Connectors (Day 4–5)**
Staff management table. Schedule manager. On-call editor. 9 connector cards (fake). Integrations page.

**Phase 9: Analytics + Polish (Day 5)**
Charts. NL search. Invites. Digest. Bulk actions. Settings (including AI model config). Mobile. Demo data. Smoke test.

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation — V5 Build Spec |
