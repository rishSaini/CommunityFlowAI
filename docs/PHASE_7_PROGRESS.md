# Changelog

## 2026-03-21

### Phase 7 — Twilio Notifications + Escalation Chain (Backend)

#### Added

- **`cch-backend/app/services/twilio_service.py`** — Schedule-aware Twilio SMS/voice notification service
  - `should_notify(user, urgency_level)` — schedule gate; returns False for OUTSIDE_HELP, off-duty, or off-shift users; returns True for on-shift staff and ON_CALL users in their rotation
  - `_log_notification(...)` — writes one row to `notification_log` for every send/fail/queue attempt
  - `_send_sms_sync(user, request, db)` — blocking Twilio SMS via `messages.create()`; logs result; returns True on success
  - `_send_voice_sync(user, request, db)` — blocking TwiML voice call via `calls.create()` with `alice` voice; logs result; returns True on success
  - `_queue_notification(user, request, db)` — stores off-shift notification in `notification_log` (status=queued) and appends to `user.notification_queue` JSON column for frontend surfacing
  - `schedule_escalation_chain(request_id, staff_id, session_factory)` — async background coroutine launched via `asyncio.create_task()`; opens its own `SessionLocal()` session (independent of the request lifecycle):
    - T+15min: re-queries DB, aborts if request is fulfilled/cancelled or urgency changed away from critical; sends voice call to assigned staff
    - T+30min: same abort checks; queries all on-shift admins (`role="admin"`, `is_on_duty=True`, `is_active=True`) and sends SMS to each
  - `notify_dispatch(request, staff_user, db)` — async entry point called from `dispatch.py` after assignment commit:
    - LOW/MEDIUM: in-app only, returns immediately
    - HIGH: SMS if on-shift, queue otherwise
    - CRITICAL: SMS at T+0, then `asyncio.create_task(schedule_escalation_chain(...))` for T+15 voice + T+30 admin SMS
    - OUTSIDE_HELP: never notified
    - Never raises — all errors logged, dispatch is never blocked

- **`.env`** — added Twilio credentials:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER=+18019538037`

- **`cch-backend/requirements.txt`** — added `twilio>=8.0.0`

#### Modified

- **`cch-backend/app/routers/dispatch.py`**
  - Imported `notify_dispatch` from `twilio_service`
  - After `manager.broadcast(...)` in `assign_dispatch`, calls `await notify_dispatch(request, staff_user, db)` wrapped in try/except so Twilio failure never blocks assignment response
  - After Twilio, calls `await generate_job_brief(request, staff_user, db)` (same non-blocking pattern)

- **`cch-backend/app/config.py`**
  - Added `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` reads from environment

#### Escalation Chain + Urgency Override (Phase 7 extension)

- **`cch-backend/app/services/twilio_service.py`** *(updated)*
  - `schedule_escalation_chain()` replaces the previous immediate voice call for CRITICAL dispatches; voice is now delivered at T+15min, not T+0

- **`cch-backend/app/models/schemas.py`**
  - Added `UrgencyOverrideRequest(urgency_level: str)` schema

- **`cch-backend/app/routers/admin.py`**
  - Added `PATCH /admin/requests/{request_id}/urgency` endpoint (`override_urgency`)
  - Validates `urgency_level` is one of `low | medium | high | critical`
  - Persists change; if escalated TO critical and a staff member is already assigned, calls `await notify_dispatch()` to trigger the full SMS + escalation chain
  - Mirrors existing `override_priority` pattern; added `logging`, `User` import, `notify_dispatch` import

---

### Notification Rules Implemented

| Urgency | On-Shift | Off-Shift | OUTSIDE_HELP |
|---------|----------|-----------|--------------|
| low | in-app only | in-app only | never |
| medium | in-app only | in-app only | never |
| high | SMS | queued | never |
| critical | SMS → T+15 voice → T+30 admin SMS | queued | never |

### Escalation Chain Timeline (CRITICAL, on-shift staff)

| Time | Action |
|------|--------|
| T+0 | SMS sent to assigned staff member |
| T+15min | Voice call to assigned staff (via TwiML, `alice` voice) |
| T+30min | SMS to every on-shift admin |
| Any point | Chain aborts if request status becomes `fulfilled` or `cancelled`, or urgency_level changes away from `critical` |

---

### Endpoints Added

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/admin/requests/{request_id}/urgency` | admin | Override urgency level; re-triggers Twilio if escalated to critical |

### Pending (spec items not yet built)

- Queued notification delivery at next shift start (currently stored but not auto-sent)
- Frontend: notification log viewer, escalation status panel, Twilio settings panel (Phase 8/9 scope)
