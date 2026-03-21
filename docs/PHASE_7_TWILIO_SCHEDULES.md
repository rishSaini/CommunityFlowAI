# Phase 7: Twilio Notifications + Schedule Management

> **Source of truth:** [core.md](core.md) | Sections 8, 12, 19
> This is a living document. Update it as the project evolves.

Schedule-aware SMS/voice notifications with escalation chain. Never notify off-shift employees.

---

## Prerequisites

- Phase 5 complete (dispatch triggers notification needs)

---

## What Gets Built

### Backend

- **twilio_service.py** — SMS and voice calls via Twilio API
- **should_notify()** — schedule-aware notification gate (core.md Section 8.2)
- **Queued notifications** — off-shift messages stored, batch-delivered at next shift start
- **Escalation chain** for CRITICAL:
  - Minute 0: SMS to on-shift + ON_CALL staff
  - Minute 15: Voice call if no response
  - Minute 30: All on-shift admins notified
- **Notification log** — every notification attempt recorded in `notification_log` table

### Notification Rules by Classification

| Classification | Can Receive | Window |
|---------------|-------------|--------|
| FT_W2 | SMS + Voice | Scheduled hours only |
| PT_W2 | SMS + Voice | Scheduled hours only |
| ON_CALL | SMS + Voice | 24/7 during rotation |
| CONTRACTOR_1099 | SMS + Voice | Scheduled hours only |
| VOLUNTEER | SMS + Voice | Scheduled hours only |
| OUTSIDE_HELP | Never | Never automated |

### Urgency → Notification Mapping

| Level | Color | Notification |
|-------|-------|-------------|
| LOW (#27AE60) | In-app only during hours |
| MEDIUM (#2E86C1) | In-app during hours |
| HIGH (#E67E22) | SMS during hours + in-app |
| CRITICAL (#C0392B) | SMS + Voice to on-shift + ON_CALL, escalation chain |

### Frontend

- **Notification log viewer** (admin) — audit trail of all notifications
- **Escalation status panel** (admin) — see active escalation chains
- **Notification preferences** (admin settings) — Twilio config, thresholds

---

## Files to Create / Modify

| File Path | Action |
|-----------|--------|
| `cch-backend/app/services/twilio_service.py` | Create — SMS/voice, should_notify(), queue, escalation |
| `cch-backend/app/services/schedule_service.py` | Modify — ensure all checks work with notification flow |
| Admin dashboard components | Modify — add notification log, escalation status |
| Admin settings | Modify — add Twilio configuration panel |

---

## should_notify() Logic

```python
def should_notify(user, urgency_level) -> bool:
    if user.classification == 'OUTSIDE_HELP': return False
    if not user.is_on_duty: return False
    if schedule_service.has_exception_today(user, 'off'): return False
    if schedule_service.is_on_shift_now(user): return True
    if user.classification == 'ON_CALL' and schedule_service.is_in_on_call_rotation(user): return True
    return False  # Queue for next shift
```

---

## Success Criteria

- [ ] SMS sends only to on-shift employees (verify with Twilio test credentials)
- [ ] ON_CALL employees receive notifications 24/7 during their rotation
- [ ] OUTSIDE_HELP never receives automated notifications
- [ ] Off-shift notifications are queued and delivered at next shift start
- [ ] CRITICAL escalation fires at 0/15/30 minute intervals
- [ ] Every notification attempt logged in `notification_log` table
- [ ] Admin can view notification log with timestamp, channel, status
- [ ] Admin can configure Twilio settings (phone number, thresholds)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
