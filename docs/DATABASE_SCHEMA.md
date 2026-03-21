# Database Schema — CCH Ordering & Dispatch System

> **Source of truth:** [core.md](core.md) | Section 14
> This is a living document. Update it as the project evolves.

SQLite 3 + SQLAlchemy 2.0. Engine config: `check_same_thread=False`.

---

## Entity Relationship Summary

```
users ──────────────┐
  │                 │
  │ assigned_staff_id    assigned_location_id
  │                 │
  ▼                 ▼
requests ◄────── locations
  │    ▲            │
  │    │            │ location_id
  │    │            ▼
  │    │        service_area_zips
  │    │
  │ request_id ──► request_assignments ◄── users (multi-staff)
  ▼
notification_log

shift_assignments ──► users, locations, requests
shift_templates (standalone)
materials_catalog (standalone — referenced by requests.materials_requested JSON)
```

---

## Table: `users`

22 columns. Stores employees (staff) and admins. Partners never have accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| email | String | UNIQUE, NOT NULL |
| hashed_password | String | bcrypt |
| full_name | String | NOT NULL |
| role | String | `staff` \| `admin` |
| classification | String | `FT_W2` \| `PT_W2` \| `ON_CALL` \| `CONTRACTOR_1099` \| `VOLUNTEER` \| `OUTSIDE_HELP` |
| classification_display | String | Human-readable label (e.g., "Full-Time W-2") |
| phone | String | For Twilio notifications + dispatch |
| assigned_location_ids | JSON | List of location UUIDs |
| schedule | JSON | `[{day, start, end, location_id}]` |
| schedule_exceptions | JSON | `[{date, type, reason?, start?, end?}]` |
| on_call_schedule | JSON | `[{start_date, end_date, start_time, end_time}]` — ON_CALL only |
| current_lat | Float | Last check-in latitude (must be in Utah) |
| current_lng | Float | Last check-in longitude |
| last_checkin_at | DateTime | Check-in freshness |
| current_workload | Integer | Default 0 |
| max_workload | Integer | Default 5 |
| is_on_duty | Boolean | Default True |
| is_active | Boolean | Default True |
| hire_date | Date | Display only |
| certifications | JSON | List of certification strings |
| notification_queue | JSON | `[{request_id, message, queued_at}]` — off-shift queue |
| created_at | DateTime | `utcnow()` |

---

## Table: `requests`

35 columns. Central table — stores partner requests with all AI-generated data.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| status | String | `submitted` \| `in_review` \| `approved` \| `dispatched` \| `in_progress` \| `fulfilled` \| `sent_to_qualtrics` \| `cancelled` |
| fulfillment_type | String | `staff` \| `mail` \| `pickup` |
| urgency_level | String | `low` \| `medium` \| `high` \| `critical` |
| requestor_name | String | NOT NULL |
| requestor_email | String | NOT NULL |
| requestor_phone | String | NOT NULL |
| event_name | String | NOT NULL |
| event_date | Date | NOT NULL |
| event_time | String | HH:MM, optional |
| event_city | String | NOT NULL, must be in Utah |
| event_zip | String | NOT NULL, must be 84xxx |
| event_lat | Float | Geocoded, must be within Utah bounds |
| event_lng | Float | Geocoded, must be within Utah bounds |
| mailing_address | String | Full street address (MAIL type only) |
| estimated_attendees | Integer | Optional |
| materials_requested | JSON | `[{material_id, quantity}]` |
| special_instructions | Text | NLP processed by AI |
| alt_contact | String | Optional alternate contact |
| assigned_location_id | String FK → locations.id | Auto-assigned by proximity |
| assigned_staff_id | String FK → users.id | Set on dispatch |
| cluster_id | String | Co-dispatched group identifier |
| ai_classification | JSON | Full AI classification output |
| ai_tags | JSON | List of AI-generated tags |
| ai_priority_score | Float | 0–100 |
| priority_justification | Text | AI-generated 2–3 sentence explanation |
| ai_urgency | JSON | `{level, reasons[], auto_escalated}` |
| ai_flags | JSON | `{incomplete, inconsistent, duplicate, details}` |
| ai_summary | Text | One-paragraph AI summary |
| dispatch_recommendation | JSON | `{staff_id, travel_time, distance, classification, cluster?, rationale}` |
| job_brief | JSON | `{urgency_sentence, briefing, weather_note, traffic_tip, travel_info}` |
| travel_info | JSON | `{duration_sec, duration_text, distance_m, distance_text, traffic_text, departure_time, polyline}` |
| admin_notes | Text | Internal admin notes |
| twilio_notified | Boolean | Default False |
| chatbot_used | Boolean | Default False — whether partner used chatbot |
| status_tracker_token | String | UNIQUE — for public status tracking URL |
| created_at | DateTime | `utcnow()` |
| updated_at | DateTime | Auto-updated on change |

---

## Table: `locations`

CCH office locations across Utah.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| name | String | Location name |
| address | String | Street address |
| city | String | Must be in Utah |
| state | String | Always "UT" |
| zip_code | String | Must be 84xxx |
| lat | Float | Latitude |
| lng | Float | Longitude |
| service_radius_miles | Float | Coverage area |
| is_active | Boolean | Default True |
| phone | String | Location phone |
| on_duty_admin_phone | String | Admin contact for escalation |
| created_at | DateTime | `utcnow()` |

---

## Table: `materials_catalog`

Available materials and toolkits.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| name | String | Material name |
| category | String | Category for grouping |
| description | Text | Description |
| in_stock | Boolean | Availability flag |

---

## Table: `service_area_zips`

Utah zip codes with service data and equity scoring.

| Column | Type | Notes |
|--------|------|-------|
| zip_code | String | PK (84xxx) |
| location_id | String FK → locations.id | Nearest CCH location |
| region_name | String | Geographic region |
| is_staffable | Boolean | Whether staff events are possible |
| equity_score | Float | 0–100, lower = more underserved |
| total_requests | Integer | Historical request count |
| total_staff_visits | Integer | Historical visit count |

---

## Table: `notification_log`

Audit trail for all Twilio notifications.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| request_id | String FK → requests.id | Related request |
| recipient_phone | String | Phone number contacted |
| recipient_name | String | Staff member name |
| channel | String | `sms` \| `voice` |
| urgency_level | String | `low` \| `medium` \| `high` \| `critical` |
| message_body | Text | Content sent |
| twilio_sid | String | Twilio message SID |
| sent_at | DateTime | When delivered |
| status | String | `queued` \| `sent` \| `delivered` \| `failed` |
| queued_until | DateTime | If queued for next shift |

---

## Table: `shift_assignments`

Per-date concrete shift records for calendar scheduling. Created by admin via drag-and-drop or auto-generation from weekly patterns.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| user_id | String FK → users.id | Staff member |
| date | Date | Specific shift date |
| start_time | String | HH:MM |
| end_time | String | HH:MM |
| location_id | String FK → locations.id | Optional work location |
| shift_type | String | `regular` \| `on_call` \| `overtime` \| `cover` \| `training` |
| status | String | `scheduled` \| `confirmed` \| `completed` \| `cancelled` |
| request_id | String FK → requests.id | If shift is tied to a specific request |
| color | String | Hex color override for calendar display |
| notes | Text | Admin notes |
| created_by | String | Admin user ID who created the shift |
| created_at | DateTime | `utcnow()` |
| updated_at | DateTime | Auto-updated |

---

## Table: `request_assignments`

Many-to-many join table enabling multi-staff assignment to requests.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| request_id | String FK → requests.id | The request |
| user_id | String FK → users.id | Assigned staff member |
| role | String | `primary` \| `support` \| `observer` |
| assigned_at | DateTime | `utcnow()` |
| assigned_by | String | Admin user ID who assigned |
| notes | Text | Optional assignment notes |

---

## Table: `shift_templates`

Reusable shift presets (Morning, Afternoon, Full Day, etc.) for quick calendar scheduling.

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | PK |
| name | String | Template name |
| start_time | String | HH:MM |
| end_time | String | HH:MM |
| color | String | Hex color for display |
| is_default | Boolean | System templates cannot be deleted |
| created_by | String | Admin who created (null for defaults) |

---

## Recommended Indexes

```sql
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_urgency ON requests(urgency_level);
CREATE INDEX idx_requests_assigned_staff ON requests(assigned_staff_id);
CREATE INDEX idx_requests_event_date ON requests(event_date);
CREATE INDEX idx_requests_event_zip ON requests(event_zip);
CREATE INDEX idx_requests_tracker_token ON requests(status_tracker_token);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_classification ON users(classification);
CREATE INDEX idx_notification_log_request ON notification_log(request_id);
CREATE INDEX idx_shift_user_date ON shift_assignments(user_id, date);
CREATE INDEX idx_shift_date ON shift_assignments(date);
CREATE INDEX idx_shift_status ON shift_assignments(status);
CREATE INDEX idx_ra_request ON request_assignments(request_id);
CREATE INDEX idx_ra_user ON request_assignments(user_id);
```

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation — 6 tables |
| 2026-03-21 | Claude | Added `shift_assignments`, `request_assignments`, `shift_templates` tables (9 tables total). Updated ER diagram. Added 5 new indexes. |
