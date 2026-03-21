# Phase 8: Employee Management + Workforce Connectors

> **Source of truth:** [core.md](core.md) | Sections 8, 13, 19
> This is a living document. Update it as the project evolves.

Staff management UI, schedule editing, on-call rotation management, and 9 simulated enterprise connectors.

---

## Prerequisites

- Phase 1 complete (user model with classifications)
- Phase 7 complete (schedule service, notification rules)

---

## What Gets Built

### Staff Management (Admin Only)

- **Employee table** — sortable/filterable list showing:
  - Name, classification badge, schedule summary
  - On-duty toggle, current workload / max
  - Check-in freshness (last check-in time + staleness indicator)
  - On-call indicator (if ON_CALL and in rotation)
  - Click row → edit full profile

- **Employee detail/edit** — full profile with:
  - Personal info (name, email, phone, hire date)
  - Classification dropdown (all 6 types)
  - Assigned locations (multi-select)
  - Certifications
  - Max workload setting

### Schedule Manager (Admin Only)

- **Calendar grid** — week view of all staff schedules, color-coded by classification
- **Drag-to-edit** — adjust shift times by dragging
- **On-call rotation editor** — define rotation periods for ON_CALL staff
- **Exception manager** — add/remove schedule exceptions (time off, special shifts)
- **Import buttons** — fake "Import from ADP", "Import from Kronos" buttons (tie into connectors)

### 9 Workforce Connectors (Admin Only, All Simulated)

Frontend-only mocks. Each connector card shows:
- Logo/icon, name, description
- Connected / Not Connected status pill
- "Configure" button → fake modal with API key field and sync options
- "Sync Now" button → fake loading animation → fake success message with "12 records imported"

| # | Connector | Category |
|---|-----------|----------|
| 1 | ADP Workforce Now | Payroll / HR |
| 2 | QuickBooks | Accounting |
| 3 | Kronos (UKG) | Time & Attendance |
| 4 | Workday | HCM |
| 5 | Paychex | Payroll |
| 6 | Symplr | Healthcare Workforce |
| 7 | QGenda | Provider Scheduling |
| 8 | ShiftMed | Staffing |
| 9 | Qualtrics | Survey / Feedback |

---

## Files to Create

| File Path | Purpose |
|-----------|---------|
| `cch-frontend/src/components/employees/EmployeeTable.tsx` | Staff list with badges |
| `cch-frontend/src/components/employees/EmployeeDetail.tsx` | Edit profile modal/page |
| `cch-frontend/src/components/employees/ClassificationBadge.tsx` | Colored classification pill |
| `cch-frontend/src/components/schedule/ScheduleGrid.tsx` | Calendar view |
| `cch-frontend/src/components/schedule/OnCallEditor.tsx` | Rotation management |
| `cch-frontend/src/components/schedule/ExceptionManager.tsx` | Time-off / exceptions |
| `cch-frontend/src/components/connectors/ConnectorCard.tsx` | Single connector card |
| `cch-frontend/src/components/connectors/SyncModal.tsx` | Fake configure/sync modal |
| `cch-frontend/src/pages/StaffManagement.tsx` | Admin staff page |
| `cch-frontend/src/pages/ScheduleManager.tsx` | Admin schedule page |
| `cch-frontend/src/pages/Integrations.tsx` | 9 connector cards grid |
| `cch-frontend/src/lib/connectorMocks.ts` | Fake data for all 9 connectors |

---

## Success Criteria

- [ ] Employee table renders all seeded staff with correct classification badges
- [ ] On-duty toggle updates in real-time
- [ ] Check-in freshness shows time since last check-in
- [ ] Admin can edit employee profile (classification, locations, workload)
- [ ] Schedule grid shows weekly view of all staff
- [ ] On-call rotation editor saves rotation periods
- [ ] All 9 connector cards render with logos and descriptions
- [ ] "Configure" opens modal, "Sync Now" shows fake loading + success
- [ ] Connected/Not Connected pills toggle correctly
- [ ] All connector features are admin-only (hidden from staff)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
| 2026-03-21 | Claude | **Admin Calendar & Scheduling implemented.** Added: `shift_assignments` table (per-date shifts), `request_assignments` table (multi-staff), `shift_templates` table (presets), `schedule.py` router (14 endpoints), `schedule_management_service.py` (shift generation, conflict detection, coverage analysis, AI suggestions). Updated `dispatch.py` for multi-staff assignment. Frontend: `AdminTeamCalendar` (drag-and-drop with @dnd-kit), `EmployeePersonalCalendar`, `MultiStaffAssignModal`. New "Calendar" tab in admin nav. Staff schedule tab now shows API-driven personal calendar. Seed data includes 5 templates, 28 shifts, 18 request assignments. |
| 2026-03-21 | Claude | **Employee-specific logins & demo data.** Each employee now has a unique simple login (first name as password). 18 hand-crafted tasks assigned to specific employees matching their work schedules. Emily (5 tasks, Mon-Fri SLC), James (4 tasks, Mon/Wed/Fri Provo), Maria (3 tasks, Tue/Thu Ogden), David (3 tasks, Mon-Wed St. George), Ashley (2 tasks, Sat Logan), Ryan (1 task, Park City). Multi-staff cross-assignments: Emily appears as support on James's and Maria's tasks. Admin team calendar shows all employee data synced. |
