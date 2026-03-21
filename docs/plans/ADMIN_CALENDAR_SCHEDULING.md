# Admin Calendar, Scheduling & Multi-Staff Assignment — Implementation Plan

**Status:** Draft
**Created:** 2026-03-21
**Scope:** New tables, 1 new router, 2 updated routers, 1 new service, 3 new pages/components, updated dispatch flow

---

## Executive Summary

Transform the admin dashboard from a basic staff list into a full scheduling command center with:
- **Hourly drag-and-drop team calendar** (admin assigns shifts visually)
- **Multi-staff assignment** (assign 1+ employees to any request with one click)
- **Employee personal calendar** (read-only personal schedule + tasks)
- **Auto-generate schedule** from weekly patterns
- **Coverage heatmap** (see understaffed days/regions at a glance)
- **AI schedule suggestions** (OpenRouter identifies gaps and recommends assignments)
- **Shift templates** (Morning / Afternoon / Full Day presets for fast scheduling)
- **Drag request → calendar** (drag a pending request onto an employee's time slot to dispatch + schedule in one gesture)

---

## Architecture Decisions

### Decision 1: Additive `shift_assignments` table (not replacing JSON)
**Why:** The existing `User.schedule` JSON field drives `schedule_service.is_on_shift_now()`, which is called by the dispatch algorithm (Step 2), Twilio notification gate (`should_notify()`), and on-call rotation checks. Replacing it would break 3 critical services. Instead, we ADD a `shift_assignments` table for per-date concrete shifts and update `is_on_shift_now()` to check it FIRST, falling back to the weekly JSON pattern.

### Decision 2: `request_assignments` join table for multi-staff
**Why:** Currently `requests.assigned_staff_id` is a single FK. For multi-staff we need a many-to-many. We KEEP `assigned_staff_id` as the "primary" assignee (backwards compatible with briefs, Twilio, status tracker) and ADD a `request_assignments` table that lists ALL team members including the primary. The dispatch panel, calendar, and brief system all read from this table.

### Decision 3: `@dnd-kit` for drag-and-drop
**Why:** HTML5 drag API works but looks janky. `@dnd-kit` provides smooth animations, collision detection, touch support, and keyboard accessibility — all of which make the demo look polished. It's ~15KB gzipped.

---

## Integration Map

```
                    ┌─────────────────────────┐
                    │   shift_assignments      │ NEW TABLE
                    │   (per-date shifts)      │
                    └──────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│schedule_service│   │ dispatch_service │   │ twilio_service   │
│is_on_shift_now│   │ Step 2: filter   │   │ should_notify()  │
│  UPDATED:     │   │ by availability  │   │ checks shift     │
│  checks table │   │ NOW checks table │   │ assignments too  │
│  first, then  │   │ first            │   │                  │
│  JSON fallback│   │                  │   │                  │
└───────────────┘   └──────────────────┘   └──────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │ request_assignments  │ NEW TABLE
                    │ (multi-staff per     │
                    │  request)            │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
     │ brief_service │  │ WebSocket   │  │ Twilio       │
     │ generates     │  │ broadcasts  │  │ notifies ALL │
     │ brief per     │  │ team assign │  │ team members │
     │ team member   │  │ event       │  │ on-shift     │
     └──────────────┘  └─────────────┘  └──────────────┘
```

---

## STEP 1: Database — New Tables

### Files to modify:
- `cch-backend/app/models/tables.py` — add 3 new ORM models
- `cch-backend/app/models/schemas.py` — add Pydantic schemas

### 1A. `shift_assignments` table

```python
class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id            = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id       = Column(String, ForeignKey("users.id"), nullable=False)
    date          = Column(Date, nullable=False)
    start_time    = Column(String, nullable=False)          # "HH:MM" (e.g. "09:00")
    end_time      = Column(String, nullable=False)          # "HH:MM" (e.g. "17:00")
    location_id   = Column(String, ForeignKey("locations.id"), nullable=True)
    shift_type    = Column(String, default="regular")       # regular | on_call | overtime | cover | training
    status        = Column(String, default="scheduled")     # scheduled | confirmed | completed | cancelled
    request_id    = Column(String, ForeignKey("requests.id"), nullable=True)  # if shift is for a specific request
    color         = Column(String, nullable=True)           # hex color override for calendar display
    notes         = Column(Text, nullable=True)
    created_by    = Column(String, ForeignKey("users.id"), nullable=True)
    created_at    = Column(DateTime, default=func.now())
    updated_at    = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_shift_user_date", "user_id", "date"),
        Index("idx_shift_date", "date"),
        Index("idx_shift_status", "status"),
    )
```

**Why `request_id` on shifts:** When admin drags a request onto the calendar, we create a shift tied to that request. This lets the calendar show "Shift: 9am-5pm (includes: Heart Health Fair)" — the shift block visually contains the task.

### 1B. `request_assignments` table (multi-staff)

```python
class RequestAssignment(Base):
    __tablename__ = "request_assignments"

    id            = Column(String, primary_key=True, default=lambda: str(uuid4()))
    request_id    = Column(String, ForeignKey("requests.id"), nullable=False)
    user_id       = Column(String, ForeignKey("users.id"), nullable=False)
    role          = Column(String, default="primary")       # primary | support | observer
    assigned_at   = Column(DateTime, default=func.now())
    assigned_by   = Column(String, ForeignKey("users.id"), nullable=True)
    notes         = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_ra_request", "request_id"),
        Index("idx_ra_user", "user_id"),
    )
```

### 1C. `shift_templates` table

```python
class ShiftTemplate(Base):
    __tablename__ = "shift_templates"

    id         = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name       = Column(String, nullable=False)             # "Morning", "Afternoon", "Full Day"
    start_time = Column(String, nullable=False)             # "HH:MM"
    end_time   = Column(String, nullable=False)             # "HH:MM"
    color      = Column(String, default="#6366f1")          # indigo default
    is_default = Column(Boolean, default=False)             # system templates can't be deleted
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
```

---

## STEP 2: Pydantic Schemas

### File: `cch-backend/app/models/schemas.py`

```python
# ── Shift Assignments ──────────────────────────────────────

class ShiftCreate(BaseModel):
    user_id: str
    date: str                    # YYYY-MM-DD
    start_time: str              # HH:MM
    end_time: str                # HH:MM
    location_id: str | None = None
    shift_type: str = "regular"
    request_id: str | None = None
    color: str | None = None
    notes: str | None = None

class ShiftUpdate(BaseModel):
    """For drag-and-drop moves — any field can change."""
    user_id: str | None = None
    date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    location_id: str | None = None
    shift_type: str | None = None
    status: str | None = None
    request_id: str | None = None
    notes: str | None = None

class ShiftBulkCreate(BaseModel):
    shifts: list[ShiftCreate]

class ShiftResponse(BaseModel):
    id: str
    user_id: str
    user_name: str              # denormalized for calendar display
    user_classification: str | None
    date: str
    start_time: str
    end_time: str
    location_id: str | None
    location_name: str | None   # denormalized
    shift_type: str
    status: str
    request_id: str | None
    request_name: str | None    # denormalized — event name if tied to a request
    color: str | None
    notes: str | None

class GenerateScheduleRequest(BaseModel):
    start_date: str              # YYYY-MM-DD
    end_date: str                # YYYY-MM-DD
    user_ids: list[str] | None = None  # None = all staff
    overwrite: bool = False      # if True, delete existing shifts in range first

# ── Multi-Staff Assignment ─────────────────────────────────

class TeamAssignRequest(BaseModel):
    staff_ids: list[str]                    # 1 or more user IDs
    roles: dict[str, str] | None = None     # {user_id: "primary"|"support"|"observer"}
    notes: str | None = None

class RequestAssignmentResponse(BaseModel):
    id: str
    request_id: str
    user_id: str
    user_name: str
    user_classification: str | None
    role: str
    assigned_at: str
    notes: str | None

# ── Coverage & AI ──────────────────────────────────────────

class CoverageCell(BaseModel):
    date: str
    hour: int                    # 0-23
    location_id: str | None
    scheduled_count: int         # staff with shifts covering this hour
    task_count: int              # requests with events in this hour
    coverage_ratio: float        # scheduled/max(task, 1)
    level: str                   # "over" | "balanced" | "under" | "critical"

class CoverageResponse(BaseModel):
    cells: list[CoverageCell]
    summary: dict                # {total_gaps, worst_day, suggestion_count}

class AIScheduleSuggestion(BaseModel):
    user_id: str
    user_name: str
    date: str
    start_time: str
    end_time: str
    reason: str                  # "Maria Santos is available and closest to the Ogden event"
    confidence: float            # 0-1
    fills_gap: bool              # True if this fills a coverage gap

class AIScheduleResponse(BaseModel):
    suggestions: list[AIScheduleSuggestion]
    narrative: str               # AI-generated paragraph explaining the suggestions

# ── Shift Templates ────────────────────────────────────────

class ShiftTemplateCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    color: str = "#6366f1"

class ShiftTemplateResponse(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    color: str
    is_default: bool

# ── Team Calendar (combined response for admin view) ───────

class TeamCalendarResponse(BaseModel):
    shifts: list[ShiftResponse]
    tasks: list[dict]            # request assignments with event details
    employees: list[dict]        # minimal employee info for swimlane headers
```

---

## STEP 3: Backend Service — `schedule_management_service.py`

### File: `cch-backend/app/services/schedule_management_service.py` (NEW)

### 3A. Generate shifts from weekly patterns

```python
def generate_shifts_from_patterns(
    db: Session,
    start_date: date,
    end_date: date,
    user_ids: list[str] | None = None,
    created_by: str | None = None,
    overwrite: bool = False,
) -> list[ShiftAssignment]:
    """
    Reads User.schedule JSON for each user and stamps out
    concrete ShiftAssignment rows for every day in [start_date, end_date].

    If overwrite=True, deletes existing non-cancelled shifts in range first.
    Skips days where user has a schedule_exception of type="off".
    """
```

**Logic:**
1. Query users (filtered by user_ids or all staff)
2. For each user, iterate each day in range
3. Check `user.schedule` for matching day-of-week entry
4. Check `user.schedule_exceptions` for "off" on that date — skip if found
5. Create `ShiftAssignment(user_id, date, start, end, location_id, shift_type="regular")`
6. Conflict check: skip if shift already exists for user+date+overlapping time
7. Bulk insert, return created shifts

### 3B. Conflict detection

```python
def detect_conflicts(
    db: Session,
    user_id: str,
    date: date,
    start_time: str,
    end_time: str,
    exclude_shift_id: str | None = None,
) -> list[ShiftAssignment]:
    """
    Returns existing shifts that overlap with the proposed time slot.
    Used by drag-and-drop to show conflict warnings.
    """
```

### 3C. Coverage analysis

```python
def get_coverage_analysis(
    db: Session,
    start_date: date,
    end_date: date,
    location_id: str | None = None,
) -> list[CoverageCell]:
    """
    For each day×hour cell in the range:
    - Count scheduled staff (shifts covering that hour)
    - Count tasks (requests with event_date on that day, event_time in that hour)
    - Compute ratio and level (critical < 0.5, under < 1.0, balanced < 2.0, over >= 2.0)
    """
```

### 3D. AI schedule suggestions

```python
async def ai_suggest_schedule(
    db: Session,
    start_date: date,
    end_date: date,
) -> AIScheduleResponse:
    """
    Calls OpenRouter to suggest optimal shift assignments.

    Prompt includes:
    - Current shifts in date range
    - Unassigned/pending requests with event dates in range
    - Staff availability patterns (weekly JSON)
    - Coverage gaps from get_coverage_analysis()
    - Employee classifications + workload + location assignments

    Returns structured suggestions + narrative explanation.
    """
```

**System prompt for AI:**
```
You are a workforce scheduling assistant for CCH (Children's Community Health) in Utah.
Given the current schedule, pending requests, and staff availability, suggest optimal
shift assignments to maximize coverage and minimize travel time.

Rules:
- NEVER schedule OUTSIDE_HELP
- Prefer FT_W2 for critical/high requests
- Consider travel distance (staff should be near their assigned locations)
- Flag coverage gaps where no staff is scheduled but requests exist
- Respect max_workload limits
- Consider equity: prioritize underserved zip codes

Return JSON: { "suggestions": [...], "narrative": "..." }
```

---

## STEP 4: Update `schedule_service.py`

### File: `cch-backend/app/services/schedule_service.py` (MODIFY)

**Critical change:** `is_on_shift_now()` must check `shift_assignments` table FIRST, then fall back to weekly pattern.

```python
def is_on_shift_now(
    user: User,
    db: Session | None = None,      # NEW parameter
    check_date: date | None = None,
    check_time: time | None = None,
) -> bool:
    """
    UPDATED: Checks shift_assignments table first (if db provided),
    then falls back to weekly schedule JSON pattern.
    """
    now = datetime.now()
    if check_date is None:
        check_date = now.date()
    if check_time is None:
        check_time = now.time()

    # ── Priority 1: Check concrete shift_assignments ──
    if db is not None:
        from app.models.tables import ShiftAssignment
        concrete_shift = db.query(ShiftAssignment).filter(
            ShiftAssignment.user_id == user.id,
            ShiftAssignment.date == check_date,
            ShiftAssignment.status.in_(["scheduled", "confirmed"]),
        ).all()

        for shift in concrete_shift:
            start = _parse_hhmm(shift.start_time)
            end = _parse_hhmm(shift.end_time)
            if start and end and start <= check_time <= end:
                return True

        # If there ARE concrete shifts for this date but none cover now → off shift
        if concrete_shift:
            return False

    # ── Priority 2: Fall back to weekly JSON pattern ──
    # (existing logic unchanged)
    ...
```

**Why this approach:** If the admin has generated concrete shifts, those take precedence. If no concrete shifts exist for that date, the system falls back to the weekly pattern — so existing behavior is preserved for unscheduled dates.

**Also update:** All callers of `is_on_shift_now()` need to pass `db` when available:
- `dispatch_service.py` — already has `db` in scope
- `twilio_service.py` — already has `db` in scope

---

## STEP 5: Backend Router — `schedule.py`

### File: `cch-backend/app/routers/schedule.py` (NEW)

```
GET    /api/schedule/team          Admin: all shifts + tasks for date range
GET    /api/schedule/me            Staff: own shifts + tasks
POST   /api/schedule/shifts        Admin: create single shift
POST   /api/schedule/shifts/bulk   Admin: create multiple shifts
PATCH  /api/schedule/shifts/{id}   Admin: update shift (drag-drop move)
DELETE /api/schedule/shifts/{id}   Admin: cancel shift
POST   /api/schedule/generate      Admin: auto-fill from weekly patterns
GET    /api/schedule/coverage      Admin: coverage analysis
POST   /api/schedule/ai-suggest    Admin: AI scheduling suggestions
GET    /api/schedule/templates     All: list shift templates
POST   /api/schedule/templates     Admin: create shift template
DELETE /api/schedule/templates/{id} Admin: delete custom template
```

### Key endpoint details:

**GET /api/schedule/team?start=YYYY-MM-DD&end=YYYY-MM-DD**
Returns `TeamCalendarResponse`:
```json
{
  "shifts": [
    {
      "id": "...", "user_id": "...", "user_name": "Emily Rodriguez",
      "user_classification": "FT_W2",
      "date": "2026-03-23", "start_time": "09:00", "end_time": "17:00",
      "location_name": "Salt Lake City Office",
      "shift_type": "regular", "status": "scheduled",
      "request_id": null, "request_name": null,
      "color": "#3b82f6"
    }
  ],
  "tasks": [
    {
      "request_id": "...", "event_name": "Heart Health Fair",
      "event_date": "2026-03-23", "event_time": "10:00",
      "assigned_users": [
        {"user_id": "...", "user_name": "Emily Rodriguez", "role": "primary"},
        {"user_id": "...", "user_name": "James Park", "role": "support"}
      ],
      "urgency_level": "high", "priority_score": 84,
      "event_city": "Salt Lake City"
    }
  ],
  "employees": [
    {
      "id": "...", "full_name": "Emily Rodriguez",
      "classification": "FT_W2", "classification_display": "Full-Time (W-2)",
      "is_on_duty": true, "current_workload": 3, "max_workload": 8
    }
  ]
}
```

**PATCH /api/schedule/shifts/{id}** (drag-drop)
- Accepts partial update: any combination of `user_id`, `date`, `start_time`, `end_time`
- Runs conflict detection before applying
- Returns updated shift + any conflicts found
- If conflict: returns 409 with conflict details, does NOT apply the change

**POST /api/schedule/generate**
- Accepts `GenerateScheduleRequest(start_date, end_date, user_ids?, overwrite?)`
- Calls `generate_shifts_from_patterns()`
- Returns count of shifts created + any skipped (conflicts, exceptions)

---

## STEP 6: Update Dispatch Router for Multi-Staff

### File: `cch-backend/app/routers/dispatch.py` (MODIFY)

### 6A. Update `POST /api/dispatch/{request_id}/assign`

Currently accepts `{ "staff_id": "..." }`. Update to also accept team assignment:

```python
class DispatchAssignRequest(BaseModel):
    staff_id: str                          # primary assignee (backwards compatible)
    additional_staff_ids: list[str] = []   # support team members
    roles: dict[str, str] | None = None    # optional: {user_id: role}
```

**Updated logic:**
1. Assign primary staff (existing flow — set `assigned_staff_id`, increment workload, brief, Twilio)
2. For each additional staff ID:
   - Create `RequestAssignment(request_id, user_id, role="support")`
   - Increment their `current_workload`
   - Generate brief for them
   - Send Twilio notification (if on-shift)
3. Also create `RequestAssignment` for the primary staff with role="primary"
4. WebSocket broadcast includes full team list

### 6B. New endpoint: `POST /api/dispatch/{request_id}/team/add`

Add more staff to an already-dispatched request:

```python
@router.post("/api/dispatch/{request_id}/team/add")
async def add_team_member(request_id: str, body: TeamAddRequest, ...):
    """Add one or more staff members to an already-dispatched request."""
```

### 6C. New endpoint: `DELETE /api/dispatch/{request_id}/team/{user_id}`

Remove a team member from a request (not the primary):

```python
@router.delete("/api/dispatch/{request_id}/team/{user_id}")
async def remove_team_member(request_id: str, user_id: str, ...):
    """Remove a support team member. Cannot remove the primary assignee."""
```

---

## STEP 7: Seed Data — Demo Shifts & Templates

### File: `cch-backend/seed.py` (MODIFY)

### 7A. Default shift templates

```python
templates = [
    ShiftTemplate(name="Morning",    start_time="08:00", end_time="13:00", color="#3b82f6", is_default=True),
    ShiftTemplate(name="Afternoon",  start_time="13:00", end_time="18:00", color="#8b5cf6", is_default=True),
    ShiftTemplate(name="Full Day",   start_time="08:00", end_time="17:00", color="#059669", is_default=True),
    ShiftTemplate(name="Evening",    start_time="17:00", end_time="22:00", color="#d97706", is_default=True),
    ShiftTemplate(name="On-Call",    start_time="18:00", end_time="06:00", color="#dc2626", is_default=True),
]
```

### 7B. Generate 2 weeks of shifts for demo employees

Using `generate_shifts_from_patterns()` for March 21 – April 4, 2026, so the calendar has data on first load.

### 7C. Multi-staff assignments for some dispatched requests

Create `RequestAssignment` rows for the 7 dispatched + 5 in_progress seed requests, with some having 2-3 team members.

---

## STEP 8: Frontend Dependencies

### File: `cch-frontend/package.json` (MODIFY)

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

These are the only new dependencies needed. Everything else (calendar grid, time slots, heatmap) is custom-built with Tailwind.

---

## STEP 9: Frontend Types

### File: `cch-frontend/src/types/index.ts` (MODIFY)

Add:

```typescript
// ── Shift Assignments ──────────────────────────────────────
export interface ShiftAssignment {
  id: string;
  user_id: string;
  user_name: string;
  user_classification: string | null;
  date: string;            // YYYY-MM-DD
  start_time: string;      // HH:MM
  end_time: string;        // HH:MM
  location_id: string | null;
  location_name: string | null;
  shift_type: "regular" | "on_call" | "overtime" | "cover" | "training";
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  request_id: string | null;
  request_name: string | null;
  color: string | null;
  notes: string | null;
}

// ── Multi-Staff Assignment ─────────────────────────────────
export interface RequestAssignment {
  id: string;
  request_id: string;
  user_id: string;
  user_name: string;
  user_classification: string | null;
  role: "primary" | "support" | "observer";
  assigned_at: string;
  notes: string | null;
}

// ── Shift Templates ────────────────────────────────────────
export interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  is_default: boolean;
}

// ── Coverage ───────────────────────────────────────────────
export interface CoverageCell {
  date: string;
  hour: number;
  scheduled_count: number;
  task_count: number;
  coverage_ratio: float;
  level: "over" | "balanced" | "under" | "critical";
}

// ── AI Suggestions ─────────────────────────────────────────
export interface AIScheduleSuggestion {
  user_id: string;
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  confidence: number;
  fills_gap: boolean;
}

// ── Calendar Employee (swimlane header) ────────────────────
export interface CalendarEmployee {
  id: string;
  full_name: string;
  classification: string | null;
  classification_display: string | null;
  is_on_duty: boolean;
  current_workload: number;
  max_workload: number;
}
```

---

## STEP 10: Frontend API Functions

### File: `cch-frontend/src/lib/api.ts` (MODIFY)

Add `scheduleApi` module:

```typescript
export const scheduleApi = {
  // Team calendar (admin)
  getTeamCalendar: (start: string, end: string) =>
    fetchJson<TeamCalendarResponse>(`/schedule/team?start=${start}&end=${end}`),

  // Personal calendar (staff)
  getMyCalendar: (start: string, end: string) =>
    fetchJson<MyCalendarResponse>(`/schedule/me?start=${start}&end=${end}`),

  // Shift CRUD
  createShift: (data: ShiftCreateInput) =>
    fetchJson<ShiftAssignment>("/schedule/shifts", { method: "POST", body: data }),

  createShiftsBulk: (shifts: ShiftCreateInput[]) =>
    fetchJson<{ created: number }>("/schedule/shifts/bulk", { method: "POST", body: { shifts } }),

  updateShift: (id: string, data: Partial<ShiftCreateInput>) =>
    fetchJson<ShiftAssignment>(`/schedule/shifts/${id}`, { method: "PATCH", body: data }),

  deleteShift: (id: string) =>
    fetchJson<void>(`/schedule/shifts/${id}`, { method: "DELETE" }),

  // Generate from patterns
  generateSchedule: (start: string, end: string, userIds?: string[], overwrite?: boolean) =>
    fetchJson<{ created: number; skipped: number }>(
      "/schedule/generate", { method: "POST", body: { start_date: start, end_date: end, user_ids: userIds, overwrite } }
    ),

  // Coverage
  getCoverage: (start: string, end: string) =>
    fetchJson<CoverageResponse>(`/schedule/coverage?start=${start}&end=${end}`),

  // AI suggestions
  getAISuggestions: (start: string, end: string) =>
    fetchJson<AIScheduleResponse>(
      "/schedule/ai-suggest", { method: "POST", body: { start_date: start, end_date: end } }
    ),

  // Templates
  getTemplates: () => fetchJson<ShiftTemplate[]>("/schedule/templates"),
  createTemplate: (data: ShiftTemplateInput) =>
    fetchJson<ShiftTemplate>("/schedule/templates", { method: "POST", body: data }),
  deleteTemplate: (id: string) =>
    fetchJson<void>(`/schedule/templates/${id}`, { method: "DELETE" }),
};

// Updated dispatch API for multi-staff
export const dispatchApi = {
  ...existingDispatchApi,

  // Multi-staff dispatch
  assignTeam: (requestId: string, staffIds: string[], roles?: Record<string, string>) =>
    fetchJson(`/dispatch/${requestId}/assign`, {
      method: "POST",
      body: {
        staff_id: staffIds[0],
        additional_staff_ids: staffIds.slice(1),
        roles,
      },
    }),

  addTeamMember: (requestId: string, staffIds: string[]) =>
    fetchJson(`/dispatch/${requestId}/team/add`, {
      method: "POST", body: { staff_ids: staffIds },
    }),

  removeTeamMember: (requestId: string, userId: string) =>
    fetchJson(`/dispatch/${requestId}/team/${userId}`, { method: "DELETE" }),

  getTeam: (requestId: string) =>
    fetchJson<RequestAssignment[]>(`/dispatch/${requestId}/team`),
};
```

---

## STEP 11: Frontend Components

### 11A. `AdminTeamCalendar.tsx` — Main drag-and-drop calendar

**Location:** `cch-frontend/src/components/calendar/AdminTeamCalendar.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────────────────────┐
│ ◄ Week ►   March 23–29, 2026   [Month] [Week]  [Generate] [AI ✨]│
├────────┬────────┬────────┬────────┬────────┬────────┬─────────────┤
│        │  Mon   │  Tue   │  Wed   │  Thu   │  Fri   │  Sat  Sun  │
│        │ Mar 23 │ Mar 24 │ Mar 25 │ Mar 26 │ Mar 27 │ Mar 28  29 │
├────────┼────────┼────────┼────────┼────────┼────────┼─────────────┤
│ Emily  │████████│████████│████████│████████│████████│             │
│ FT_W2  │ 9-5    │ 9-5    │ 9-5    │ 9-5    │ 9-5    │             │
│ 3/8    │  ┌───┐ │        │  ┌───┐ │        │        │             │
│        │  │♥  │ │        │  │📦 │ │        │        │             │
│        │  └───┘ │        │  └───┘ │        │        │             │
├────────┼────────┼────────┼────────┼────────┼────────┼─────────────┤
│ James  │████████│        │████████│        │████████│             │
│ PT_W2  │ 9-2    │        │ 9-2    │        │ 9-2    │             │
│ 1/5    │        │        │        │        │        │             │
├────────┼────────┼────────┼────────┼────────┼────────┼─────────────┤
│ Maria  │        │        │        │        │        │             │
│ON_CALL │  (on-call rotation: 6pm-6am)                            │
│ 0/3    │        │        │        │        │        │             │
├────────┼────────┼────────┼────────┼────────┼────────┼─────────────┤
│Coverage│ ■■■    │ ■      │ ■■■    │ ■      │ ■■■    │             │
│Heatmap │ green  │  red   │ green  │  red   │ green  │  gray       │
└────────┴────────┴────────┴────────┴────────┴────────┴─────────────┘

┌─ Right sidebar: Pending Requests (draggable) ─┐
│ ┌─────────────────────────────────────────┐    │
│ │ 🔴 Heart Health Fair                    │    │
│ │    Mar 25 · SLC · 350 ppl · Score: 84  │    │
│ │    Drag onto calendar to dispatch       │    │
│ └─────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────┐    │
│ │ 🟡 Nutrition Workshop                   │    │
│ │    Apr 2 · Provo · 80 ppl · Score: 56  │    │
│ └─────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘

┌─ Bottom: Shift Template Palette ──────────────┐
│ [Morning 8-1] [Afternoon 1-6] [Full Day 8-5]  │
│ [Evening 5-10] [On-Call 6p-6a] [+ Custom]     │
│ Drag a template onto any employee's day to     │
│ create a shift                                 │
└────────────────────────────────────────────────┘
```

**Interactions:**
1. **Drag shift block** between employees (reassign) or between days (reschedule)
2. **Drag shift template** from palette onto employee×day cell → creates new shift
3. **Drag request card** from sidebar onto employee×day cell → dispatches + creates shift
4. **Click shift block** → edit modal (change times, type, notes)
5. **Click request task** → request detail flyout
6. **Resize shift block** vertically → change start/end time
7. **Right-click shift** → context menu (delete, duplicate, convert to template)
8. **Toggle coverage heatmap** → bottom row shows red/yellow/green per day

**Hourly grid detail:**
- Hours 6:00 AM through 10:00 PM displayed as rows
- Each cell = 1 employee × 1 hour
- Shift blocks span multiple hour rows
- Task events shown as pins/badges within shift blocks

### 11B. `EmployeePersonalCalendar.tsx` — Staff's own calendar

**Location:** `cch-frontend/src/components/calendar/EmployeePersonalCalendar.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ My Schedule    ◄ Week ►   March 23–29, 2026       │
├────────┬───────┬───────┬───────┬───────┬───────────┤
│  Mon   │  Tue  │  Wed  │  Thu  │  Fri  │  Sat  Sun │
│ Mar 23 │Mar 24 │Mar 25 │Mar 26 │Mar 27 │ Mar28  29 │
├────────┼───────┼───────┼───────┼───────┼───────────┤
│ 8:00   │       │       │       │       │           │
│ ┌────┐ │       │ ┌────┐│       │ ┌────┐│           │
│ │SHFT│ │       │ │SHFT││       │ │SHFT││           │
│ │9-5 │ │       │ │9-5 ││       │ │9-5 ││           │
│ │    │ │       │ │    ││       │ │    ││           │
│ │ ♥  │ │       │ │ 📦 ││       │ │    ││           │
│ │HHF │ │       │ │NW  ││       │ │    ││           │
│ │10am│ │       │ │2pm ││       │ │    ││           │
│ └────┘ │       │ └────┘│       │ └────┘│           │
│ 5:00   │       │       │       │       │           │
└────────┴───────┴───────┴───────┴───────┴───────────┘
│ ♥ Heart Health Fair (10:00 AM, SLC, 350 ppl)       │
│ 📦 Nutrition Workshop (2:00 PM, Provo, 80 ppl)     │
└────────────────────────────────────────────────────┘
```

- Read-only (no drag-drop)
- Shows own shifts from `shift_assignments` + weekly pattern defaults
- Tasks from `request_assignments` overlaid as colored badges
- Click task → view Job Brief
- Time-off days shown as gray strikethrough

### 11C. `MultiStaffAssignModal.tsx` — Team assignment

**Location:** `cch-frontend/src/components/dispatch/MultiStaffAssignModal.tsx`

Modal that appears when admin clicks "Assign Team" on any request:

```
┌─────────────────────────────────────────────────┐
│ Assign Team to: Heart Health Fair               │
│ March 25, 2026 · Salt Lake City · 350 attendees │
├─────────────────────────────────────────────────┤
│                                                 │
│ Search staff...  [________________]             │
│                                                 │
│ ┌─ Available Staff ───────────────────────────┐ │
│ │ ☑ Emily Rodriguez  FT_W2  3/8  12 mi  ⭐   │ │
│ │   Role: [Primary ▼]                        │ │
│ │ ☑ James Park       PT_W2  1/5  18 mi       │ │
│ │   Role: [Support ▼]                        │ │
│ │ ☐ Maria Santos     ON_CALL 0/3  45 mi      │ │
│ │ ☐ David Kim        1099   2/4  180 mi      │ │
│ │ ☐ Ashley Johnson   VOL    0/2  95 mi       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Selected: 2 staff members                       │
│                                                 │
│ Notes: [________________________________]       │
│                                                 │
│           [Cancel]  [Assign 2 Staff Members]    │
└─────────────────────────────────────────────────┘
```

**Features:**
- Checkbox selection for each employee
- Shows dispatch ranking info (distance, workload, on-shift status)
- Role dropdown per selected member (primary/support/observer)
- Star icon on AI-recommended candidate
- Search/filter by name
- Filter by classification, on-duty, on-shift
- "Assign" button dispatches all selected at once
- Available from: dispatch panel, request detail, AND the calendar (right-click request)

### 11D. `CoverageHeatmap.tsx` — Coverage visualization

**Location:** `cch-frontend/src/components/calendar/CoverageHeatmap.tsx`

A row at the bottom of the team calendar showing coverage per day:

```
┌─────────────────────────────────────────────────┐
│ Coverage  Mon    Tue    Wed    Thu    Fri    Sat │
│           ■■■■   ■      ■■■■   ■■     ■■■   ·  │
│           3/2    1/3    3/1    2/2    3/1    0/0 │
│           +1     -2     +2     0      +2     -   │
│           green  red    green  yellow green gray │
└─────────────────────────────────────────────────┘
```

- Each cell: `scheduled_staff / tasks_requiring_staff`
- Color: green (surplus), yellow (balanced), red (gap), gray (no tasks)
- Click a red cell → AI suggestion popover for that gap
- Toggleable overlay on the main calendar

### 11E. `AISchedulePanel.tsx` — AI suggestion sidebar

**Location:** `cch-frontend/src/components/calendar/AISchedulePanel.tsx`

Slide-out panel triggered by the sparkle button:

```
┌─────────────────────────────────────────────┐
│ ✨ AI Schedule Suggestions                   │
│                                             │
│ Based on coverage analysis for Mar 23–29:   │
│                                             │
│ "You have 2 coverage gaps this week.        │
│  Tuesday has 3 pending requests but only    │
│  1 staff member scheduled. Thursday has     │
│  2 requests with no coverage."              │
│                                             │
│ ┌─ Suggestion 1 ─────────────────────────┐  │
│ │ 📌 Schedule James Park on Tuesday      │  │
│ │    9:00 AM – 2:00 PM                   │  │
│ │    "James is available Tue per his      │  │
│ │     weekly pattern and is 18mi from     │  │
│ │     the Provo Nutrition Workshop"       │  │
│ │    Confidence: 92%  [Accept] [Dismiss]  │  │
│ └─────────────────────────────────────────┘  │
│ ┌─ Suggestion 2 ─────────────────────────┐  │
│ │ 📌 Schedule Maria Santos on Thursday   │  │
│ │    6:00 PM – 10:00 PM (on-call)        │  │
│ │    "Maria is in her on-call rotation   │  │
│ │     and closest to the Ogden event"    │  │
│ │    Confidence: 78%  [Accept] [Dismiss]  │  │
│ └─────────────────────────────────────────┘  │
│                                             │
│            [Accept All] [Refresh]           │
└─────────────────────────────────────────────┘
```

- "Accept" → creates shift assignment via API, refreshes calendar
- "Accept All" → bulk creates all suggestions
- "Dismiss" → removes suggestion from list
- "Refresh" → re-runs AI analysis

### 11F. `ShiftTemplatePalette.tsx` — Quick-add templates

**Location:** `cch-frontend/src/components/calendar/ShiftTemplatePalette.tsx`

Horizontal bar below the calendar header:

```
┌─────────────────────────────────────────────────────────────┐
│ Templates:  [Morning 8-1] [Afternoon 1-6] [Full Day 8-5]   │
│             [Evening 5-10] [On-Call 6p-6a] [+ Add Custom]   │
└─────────────────────────────────────────────────────────────┘
```

- Each template is a draggable chip
- Drag onto employee×day cell → creates shift with template's times + color
- "+ Add Custom" → small modal: name, start time, end time, color picker
- Templates persist via API (admin can create/delete)

---

## STEP 12: Page Integration

### 12A. New admin view: `calendar`

**File:** `cch-frontend/src/App.tsx` (MODIFY)

Add `"calendar"` to admin view options. Add nav tab for calendar.

The admin dashboard gets a new tab/view called "Calendar" that renders `AdminTeamCalendar` with all sub-components:
- Template palette (top)
- Team calendar with hourly grid (center)
- Coverage heatmap (bottom row of calendar)
- Pending requests sidebar (right)
- AI suggestions panel (slide-out)

### 12B. Update staff dashboard schedule tab

**File:** `cch-frontend/src/pages/StaffDashboard.tsx` (MODIFY)

Replace the existing `WeeklySchedule` component in the "schedule" tab with the new `EmployeePersonalCalendar` that shows:
- Real shifts from API (not just mock data)
- Hourly slot view (matching admin calendar)
- Tasks overlaid from `request_assignments`

### 12C. Update `AdminProfiles.tsx` — add team assignment

**File:** `cch-frontend/src/pages/AdminProfiles.tsx` (MODIFY)

In the partner request detail (expanded row), add:
- "Assign Team" button → opens `MultiStaffAssignModal`
- Show assigned team members with role badges
- Quick-remove team members (X button)

---

## STEP 13: Register New Router in `main.py`

### File: `cch-backend/app/main.py` (MODIFY)

```python
from app.routers import schedule
app.include_router(schedule.router, prefix="/api")
```

---

## Implementation Order

| #  | Task | Dependencies | Est. Size |
|----|------|-------------|-----------|
| 1  | Add 3 new tables to `tables.py` | None | Small |
| 2  | Add Pydantic schemas to `schemas.py` | Step 1 | Medium |
| 3  | Create `schedule_management_service.py` | Steps 1-2 | Large |
| 4  | Update `schedule_service.py` (shift_assignments priority) | Step 1 | Small |
| 5  | Create `schedule.py` router | Steps 1-4 | Large |
| 6  | Update `dispatch.py` for multi-staff | Steps 1-2 | Medium |
| 7  | Update `seed.py` with demo shifts + templates | Steps 1-6 | Medium |
| 8  | Register router in `main.py` | Step 5 | Tiny |
| 9  | Install `@dnd-kit` packages | None | Tiny |
| 10 | Add TypeScript types | None | Small |
| 11 | Add API functions to `api.ts` | Step 10 | Small |
| 12 | Build `AdminTeamCalendar.tsx` (core grid + shifts) | Steps 9-11 | XL |
| 13 | Add drag-and-drop to calendar (shift moves) | Step 12 | Large |
| 14 | Build `ShiftTemplatePalette.tsx` (drag templates to create) | Step 13 | Medium |
| 15 | Build `CoverageHeatmap.tsx` | Step 12 | Medium |
| 16 | Build `AISchedulePanel.tsx` | Step 12 | Medium |
| 17 | Build `MultiStaffAssignModal.tsx` | Step 11 | Medium |
| 18 | Build request sidebar (drag to dispatch) | Steps 13, 17 | Large |
| 19 | Build `EmployeePersonalCalendar.tsx` | Step 11 | Medium |
| 20 | Integrate into `App.tsx` routing + navigation | Steps 12-19 | Small |
| 21 | Update `StaffDashboard.tsx` schedule tab | Step 19 | Small |
| 22 | Update `AdminProfiles.tsx` with team assignment | Step 17 | Small |
| 23 | Verify dispatch + Twilio + brief integration | Steps 4, 6 | Medium |

**Parallelizable:** Steps 9-11 can run parallel with Steps 3-8. Steps 14-18 can run in parallel once Step 13 is done.

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| `is_on_shift_now()` change breaks dispatch | HIGH | Unit test both paths (concrete shift exists vs. JSON fallback). Always pass `db` param. |
| Drag-and-drop performance with many employees | MEDIUM | Virtualize rows (only render visible swimlanes). Limit to 20 employees per view. |
| Multi-staff brief generation is slow | LOW | Generate briefs async (existing pattern). Show "generating..." state. |
| AI suggestions hallucinate non-existent staff | LOW | Validate all user_ids in suggestions against DB before returning. |
| Conflict detection misses edge cases | MEDIUM | Use strict overlap math: `NOT (end1 <= start2 OR start1 >= end2)`. |
| SQLite concurrent writes during bulk shift creation | LOW | Use single transaction. SQLite handles this fine at our scale. |

---

## Demo Script (for 10-minute presentation)

1. **Open admin calendar** — show generated schedule for the week, color-coded by classification
2. **Toggle coverage heatmap** — "See Tuesday is red? We have 3 requests but only 1 staff member."
3. **Click AI Suggestions** — "The AI recommends scheduling James on Tuesday because he's available and 18 miles from the event."
4. **Accept suggestion** — shift appears on calendar instantly
5. **Drag a shift template** (Morning) onto David Kim's Thursday → shift created
6. **Drag a pending request** from the sidebar onto Emily's Monday → dispatched, shift created, notification sent
7. **Click "Assign Team"** on the Heart Health Fair → select Emily (primary) + James (support) → both assigned
8. **Switch to Employee view** — show Emily's personal calendar with her shifts and tasks
9. **Show the coverage heatmap again** — all green now. "Full coverage achieved."
