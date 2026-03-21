# Phase 5: Dispatch Engine + Job Briefs

> **Source of truth:** [core.md](core.md) | Sections 10, 11, 19
> This is a living document. Update it as the project evolves.

Smart dispatch with geo-clustering and comprehensive Job Briefs with all 7 sections.

---

## Prerequisites

- Phase 4 complete (AI scoring exists, requests have priority data)

---

## What Gets Built

### Backend

- **dispatch_service.py** — 8-step dispatch algorithm:
  1. Get active, on-duty staff
  2. Filter by schedule availability for event date/time
  3. Filter by classification task restrictions
  4. Filter by workload < max_workload
  5. Haversine for initial distance ranking, Google Directions for top 5
  6. Rank: classification_priority → travel_time → workload → equity_bonus
  7. Cluster check: pending STAFF requests within 10 miles, multi-stop plan
  8. Return ranked candidates + cluster opportunities

- **brief_service.py** — Job Brief generation with all 7 sections:
  1. Priority Header (urgency color, score, justification)
  2. Travel Card (Google Maps route, travel time, departure countdown)
  3. Event Details (name, date, venue, requestor contact, attendees)
  4. Materials Checklist (interactive checkboxes)
  5. AI Briefing (2–3 paragraph mission brief via OpenRouter)
  6. Weather & Conditions (can be hardcoded for prototype)
  7. Quick Actions (navigate, call, mark arrived/complete)

### Frontend

- **DispatchPanel** — candidate ranking with travel times, classification badges, schedule status, cluster opportunities
- **JobBriefView** (`/staff/brief/:id`) — full brief with all 7 sections
- **One-click dispatch** — admin selects candidate, generates brief, notifies staff
- **Cluster visualization** — shows nearby grouped requests

---

## Files to Create / Modify

| File Path | Action |
|-----------|--------|
| `cch-backend/app/services/dispatch_service.py` | Create — 8-step algorithm |
| `cch-backend/app/services/brief_service.py` | Create — Job Brief generation |
| `cch-frontend/src/components/dispatch/*` | Create — DispatchPanel, CandidateList, ClusterView |
| `cch-frontend/src/components/brief/*` | Create — JobBrief, TravelCard, MaterialsChecklist, PriorityHeader |
| `cch-frontend/src/pages/JobBriefView.tsx` | Create — full brief page |
| `cch-frontend/src/hooks/useDispatch.ts` | Create — dispatch data |
| `cch-frontend/src/hooks/useBrief.ts` | Create — brief data + checklist state |

---

## Dispatch Candidate Ranking Display

```
#1  Sarah Chen (FT_W2)    ■ On-shift    22 min drive    Workload: 2/5
#2  Mike Torres (PT_W2)   ■ On-shift    35 min drive    Workload: 1/5
#3  David Kim (ON_CALL)   ■ On-call     28 min drive    Workload: 0/5
    ⊕ Cluster: 2 more requests within 8 miles — create multi-stop?
```

---

## Success Criteria

- [ ] Dispatch endpoint returns ranked candidates with travel times
- [ ] Classification restrictions correctly filter candidates
- [ ] Schedule check excludes off-shift staff
- [ ] Cluster detection finds nearby pending requests (10-mile radius)
- [ ] Admin can one-click dispatch from candidate list
- [ ] Job Brief page renders all 7 sections
- [ ] Travel card shows departure countdown (event_time - travel - buffer)
- [ ] Materials checklist is interactive (checkboxes)
- [ ] "Open in Google Maps" deep link works
- [ ] Brief data stored in request's `job_brief` JSON column

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
