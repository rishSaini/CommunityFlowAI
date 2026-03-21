# Role Permissions — CCH Ordering & Dispatch System

> **Source of truth:** [core.md](core.md) | Sections 2, 8.1, 17
> This is a living document. Update it as the project evolves.

---

## Role Definitions

| Role | Login | Auth | Primary Interface | Purpose |
|------|-------|------|-------------------|---------|
| **Partner** | None — public | No auth | Request Form + Status Tracker | Submit requests for staffed events or mailed materials |
| **Employee** | JWT | role=staff | Staff Dashboard + Job Briefs | Execute assignments, check in, manage own schedule |
| **Admin** | JWT | role=admin | Admin Dashboard | Dispatch, approve, manage employees, analytics, settings |

---

## Complete Feature × View Matrix

| Feature | Partner | Employee | Admin |
|---------|---------|----------|-------|
| **Request Form** | Full form + chatbot + mini-map | Not visible | View submitted data in request detail |
| **Chatbot Auto-Fill** | Interactive panel, sees fields auto-fill | Not visible | Usage analytics, model config in Settings |
| **Status Tracker** | Full pipeline, urgency color only (no label), staff first name after dispatch | Not visible | Not used (admin has queue) |
| **Login** | N/A | Login page | Login page |
| **Queue** | N/A | My Queue: own assigned requests, priority + justification, urgency badge | Master Queue: all requests, all AI data, NL search, bulk actions |
| **Request Detail** | N/A | Own assigned only. AI summary, priority, urgency. Can edit notes, move to In Review. | All requests. Full AI data. Dispatch panel. Override priority/urgency. Approve/reject. |
| **Dispatch Panel** | N/A | Not visible | Candidate ranking, travel times, clusters, one-click dispatch |
| **Job Brief** | N/A | Own briefs only, full 7 sections | All briefs, can regenerate |
| **Priority Score** | Never visible | Score + justification on queue items and briefs | Score + justification + override capability |
| **AI Classification** | Never visible | Summary and tags only | Full JSON: confidence, flags, rationale, raw output |
| **Map** | Mini-map on form (nearest location) | Regional map (own locations/requests), brief route map | Full dispatch map + analytics map, all markers, routes, clusters, equity overlay |
| **Calendar** | N/A | Own events with travel blocks | All staff calendars |
| **Schedule** | N/A | Own schedule, time-off requests | All schedules, edit/assign, on-call rotations, bulk edit |
| **Check-In** | N/A | Check-in page, own position + nearby requests | See all check-in freshness on staff table and map |
| **Employee Mgmt** | N/A | Own profile only | Full staff table, CRUD, classification, workload, assignments |
| **Analytics** | N/A | Quick stats (own metrics only) | Full dashboard: demand, urgency, utilization, equity, forecast, digest |
| **Connectors** | N/A | Not visible | 9 connector cards, fake modals and sync |
| **Settings** | N/A | Not visible | All config: materials, locations, zips, urgency, Twilio, AI models, travel buffer |
| **Notifications** | N/A | Receives SMS/voice during hours only, queued batch on shift start | Notification log, escalation status, config |
| **Fulfillment** | N/A | Workspace: packing lists, event details, pickup info for own assignments | View all fulfillment status |

---

## What Partners CANNOT See

- Any admin or employee interface
- Other partners' requests
- Internal notes, AI classifications, priority scores, staff assignments, dispatch data
- Employee names, schedules, or contact info (only "Staff assigned — [First Name]" on status tracker after dispatch)

## What Employees CANNOT See

- Other employees' assignments (only their own)
- Organization-wide analytics or demand trends
- The dispatch panel or candidate ranking
- Approval authority — they can move Submitted → In Review but CANNOT approve
- Workforce connectors or integrations
- System settings, urgency thresholds, or location management
- Other employees' schedules or personal data (only their own)

## Admin-Only Actions

- Approve or reject requests (move to "approved" status)
- Dispatch staff to requests (assign + generate Job Brief)
- Override urgency level (triggers Twilio if escalated to CRITICAL)
- Override priority score and justification
- Create and manage employee accounts with classification
- Configure system settings
- Access workforce connectors

---

## Employee Classification Restrictions

| Classification | Code | Dispatch Priority | Task Restrictions | Notification Window |
|---------------|------|-------------------|-------------------|-------------------|
| Full-Time | FT_W2 | 1 (highest) | None | Scheduled hours only |
| Part-Time | PT_W2 | 2 | All tasks, limited hours | Scheduled hours only |
| On-Call | ON_CALL | 1 for CRITICAL/HIGH | All tasks when activated | 24/7 during rotation |
| Contractor | CONTRACTOR_1099 | 3 (overflow) | No patient contact unless credentialed | Scheduled hours only |
| Volunteer | VOLUNTEER | 4 | Educational materials only, supervised | Scheduled hours only |
| Outside Help | OUTSIDE_HELP | 5 (lowest) | Pre-approved events only | Never automated |

---

## Route-Level Access

| Route | Partner | Employee | Admin |
|-------|---------|----------|-------|
| `/request` | Yes | No | No |
| `/request/status/:token` | Yes | No | No |
| `/login` | No | Yes | Yes |
| `/staff` | No | Yes | Yes |
| `/staff/checkin` | No | Yes | Yes |
| `/staff/brief/:id` | No | Yes (own only) | Yes (all) |
| `/admin` | No | No | Yes |
| `/admin/dispatch` | No | No | Yes |
| `/admin/analytics` | No | No | Yes |
| `/admin/map` | No | No | Yes |
| `/admin/staff` | No | No | Yes |
| `/admin/schedules` | No | No | Yes |
| `/admin/integrations` | No | No | Yes |
| `/admin/settings` | No | No | Yes |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
