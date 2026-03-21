# Phase 4: AI Integration + Priority Scoring

> **Source of truth:** [core.md](core.md) | Sections 4, 7, 15, 19
> This is a living document. Update it as the project evolves.

OpenRouter AI service, master classification pipeline, priority scoring with justification, and queue UI updates.

---

## Prerequisites

- Phase 2 complete (backend API)
- Phase 3 complete (frontend queue UI exists)

---

## What Gets Built

### Backend

- **ai_service.py** — OpenRouter gateway, `call_ai()` function, model-per-feature config
- **Master classification pipeline** — single AI call on submission that returns:
  - Fulfillment type + confidence
  - Urgency level + reasons
  - Priority score (0–100) + AI justification (2–3 sentences)
  - Tags
  - One-paragraph summary
  - Flags (incomplete, inconsistent, duplicate)
  - NLP extraction from special_instructions
- **Priority scoring algorithm** — weighted formula (see core.md Section 7.1)
- **Wire into submission pipeline** — after geocoding, before database write

### Frontend

- **Queue items** — display priority score (large number) + justification text + urgency badge
- **Request detail** — show full AI classification data for admins, summary only for staff
- **Admin priority override** — edit score + justification, log override

---

## Files to Create / Modify

| File Path | Action |
|-----------|--------|
| `cch-backend/app/services/ai_service.py` | Create — OpenRouter gateway |
| `cch-backend/app/config.py` | Modify — add model-per-feature defaults |
| `cch-backend/app/routers/requests.py` | Modify — wire AI into submission |
| Frontend queue components | Modify — add priority score + justification display |
| Frontend request detail | Modify — add AI data display (role-filtered) |

---

## Priority Scoring Formula

```
score = (time_urgency * 0.35) + (attendance * 0.20) + (equity * 0.20) +
        (complexity * 0.10) + (history * 0.10) + (flags * 0.05)
```

Each factor maps to 0–100 points. See [AI_FEATURES.md](AI_FEATURES.md) for full breakdown.

---

## Success Criteria

- [ ] `ai_service.py` successfully calls OpenRouter and parses response
- [ ] Submitting a request triggers master classification
- [ ] Priority score (0–100) stored in `ai_priority_score` column
- [ ] Justification stored in `priority_justification` column
- [ ] Queue items display score + justification
- [ ] Urgency badge shows correct color (GREEN/BLUE/ORANGE/RED)
- [ ] Admin can override score and justification
- [ ] Model strings are configurable in `config.py`

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
