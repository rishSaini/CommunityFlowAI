# Phase 9: Analytics, Settings & Polish

> **Source of truth:** [core.md](core.md) | Sections 2.4, 15, 19
> This is a living document. Update it as the project evolves.

Final phase. Analytics dashboard, admin settings, remaining AI features, mobile responsiveness, and demo preparation.

---

## Prerequisites

- All prior phases (1–8) complete

---

## What Gets Built

### Analytics Dashboard (Admin Only)

Using **Recharts** for all visualizations:

- **Demand trends** — line chart of requests over time, by week/month
- **Urgency distribution** — pie/donut chart of LOW/MEDIUM/HIGH/CRITICAL breakdown
- **Staffing utilization** — bar chart of workload per employee
- **Material usage** — bar chart of most-requested materials
- **Geographic equity heatmap** — map overlay showing underserved areas
- **AI demand forecast** — AI-generated projection narrative + chart
- **Weekly digest** — AI-generated executive summary (Monday cron trigger)

### Settings Page (Admin Only)

- **Materials CRUD** — add/edit/delete materials in catalog
- **Locations CRUD** — add/edit CCH locations with map preview
- **Service area zips** — manage 84xxx zip codes and assignments
- **Urgency thresholds** — configure time/attendance thresholds per level
- **Twilio config** — phone number, enable/disable SMS/voice
- **AI model selection** — dropdown per feature to change OpenRouter model
- **Travel buffer** — configurable buffer minutes (default 15)
- **User creation** — create new staff/admin accounts with classification dropdown

### Remaining AI Features

- **Natural language admin search** — type "show me critical requests in Provo" → filtered results
- **Event invite generation** — admin clicks Generate → AI creates formatted invite
- **Weekly executive digest** — AI-generated summary of past week's activity
- **Intelligent bulk actions** — select 2+ requests, AI suggests batch operations

### Mobile Responsive Pass

- Chatbot: floating button → full-screen overlay on mobile
- Job Brief: stack sections vertically, large tap targets
- Queue: card layout instead of table on narrow screens
- Map: full-width, simplified controls
- Navigation: bottom tab bar instead of sidebar on mobile

### Demo Data Polish

- Ensure 50+ requests span all statuses, urgencies, fulfillment types
- Requests with realistic Utah addresses and dates
- Some requests with AI data pre-populated for instant demo
- Staff with realistic schedules and locations
- At least one active cluster opportunity

---

## Files to Create / Modify

| File Path | Action |
|-----------|--------|
| `cch-frontend/src/pages/Analytics.tsx` | Create — charts dashboard |
| `cch-frontend/src/pages/Settings.tsx` | Create — all admin config |
| `cch-frontend/src/components/analytics/*` | Create — chart components |
| `cch-frontend/src/lib/openrouterModels.ts` | Create — model list for dropdown |
| `cch-backend/app/services/invite_service.py` | Create — event invite generation |
| `cch-backend/app/services/equity_service.py` | Create — equity scoring |
| `cch-backend/seed.py` | Modify — polish demo data |
| All components | Modify — mobile responsive styles |

---

## Demo Preparation Checklist

- [ ] All 3 interfaces accessible: `/request`, `/admin`, `/staff`
- [ ] Chatbot auto-fills a request live during demo
- [ ] Priority score + justification visible in queue
- [ ] One-click dispatch works end-to-end
- [ ] Job Brief loads with departure countdown
- [ ] Google Map shows Utah with markers and route
- [ ] At least one CRITICAL request triggers notification flow
- [ ] Analytics charts render with real data
- [ ] 9 connector cards visible in Integrations
- [ ] Mobile layout works (show on phone during presentation)

---

## Success Criteria

- [ ] Analytics page renders all 6+ chart types with seeded data
- [ ] Settings page saves and applies changes (materials, locations, models)
- [ ] NL search returns relevant results ("critical requests this week")
- [ ] Mobile layouts work for all key pages
- [ ] Demo flow takes < 10 minutes to walk through
- [ ] No console errors during demo path
- [ ] All seeded data creates a compelling demo narrative

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
