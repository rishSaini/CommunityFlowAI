# AI Features — CCH Ordering & Dispatch System

> **Source of truth:** [core.md](core.md) | Sections 4, 5, 7, 10, 15
> This is a living document. Update it as the project evolves.

---

## OpenRouter Gateway Architecture

All AI features use **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`) as the single API gateway. One API key accesses Claude, GPT, Gemini, Llama, Mistral, and hundreds more.

### Why OpenRouter
- Single API key for all models
- Swap models per feature without code changes
- OpenAI-compatible API format
- Built-in rate limiting, fallbacks, load balancing

### Integration Pattern

All LLM calls go through `app/services/ai_service.py`. See core.md Section 4.2 for the full code pattern.

```python
async def call_ai(system_prompt: str, user_message: str, model: str = "anthropic/claude-sonnet-4") -> dict:
    # POST to OPENROUTER_BASE_URL with headers + messages
```

---

## All 18 AI Features

| # | Feature | Trigger | Default Model | Type |
|---|---------|---------|--------------|------|
| 1 | Master classification + confidence | On submission | anthropic/claude-sonnet-4 | Structured JSON |
| 2 | Priority scoring (0–100) + justification | On submission | anthropic/claude-sonnet-4 | Score + text |
| 3 | NLP extraction from notes | On submission | anthropic/claude-sonnet-4 | Structured extraction |
| 4 | Automated tagging | On submission | openai/gpt-4o-mini | Tag list |
| 5 | Urgency classification + Twilio trigger | On submission | anthropic/claude-sonnet-4 | Enum + reasons |
| 6 | Incomplete/inconsistent flagging | On submission | anthropic/claude-sonnet-4 | Flag JSON |
| 7 | Request summary | On submission | anthropic/claude-sonnet-4 | Paragraph text |
| 8 | Anomaly & duplicate detection | On submission | anthropic/claude-sonnet-4 | Boolean + details |
| 9 | Chatbot form auto-fill | On each chat message | anthropic/claude-sonnet-4 | Reply + field updates |
| 10 | Job Brief generation | On dispatch | anthropic/claude-sonnet-4 | Multi-section brief |
| 11 | Dispatch recommendation | Admin views panel | openai/gpt-4o-mini | Ranked list |
| 12 | Geographic routing (Haversine + Google) | On submission | N/A (pure math) | Distance calc |
| 13 | Geographic equity scoring | Nightly batch | N/A (SQL aggregation) | Score update |
| 14 | Demand forecasting | Dashboard load | anthropic/claude-sonnet-4 | Narrative + data |
| 15 | Natural language admin search | Search input | openai/gpt-4o-mini | SQL/filter conversion |
| 16 | Event invite generation | Admin clicks Generate | anthropic/claude-sonnet-4 | Formatted invite |
| 17 | Weekly executive digest | Monday cron | anthropic/claude-sonnet-4 | Long-form report |
| 18 | Intelligent bulk actions | Admin selects 2+ | openai/gpt-4o-mini | Action suggestions |

Model strings are stored in `config.py` and overridable via Admin Settings UI (no restart needed).

---

## Priority Scoring (Feature #2)

### Scoring Factors

| Factor | Weight | Logic |
|--------|--------|-------|
| Time urgency | 35% | <7d = 100pts, 7–14 = 75, 14–30 = 50, 30+ = 25, past due = 100 |
| Estimated attendance | 20% | 500+ = 100, 200–499 = 75, 50–199 = 50, <50 = 25 |
| Equity factor | 20% | equity_score <30 = 100pts, 30–60 = 50, 60+ = 25 |
| Fulfillment complexity | 10% | STAFF = 100, MAIL = 50, PICKUP = 25 |
| Requestor history | 10% | First-time = 75, Returning = 50, Frequent = 25 |
| Special flags | 5% | Emergency keywords = 100, Incomplete = +25 |

### AI Justification Examples

**Score 84/100:** "This request scores high because the event is only 5 days away with 350 expected attendees in zip code 84119, which is flagged as an underserved area."

**Score 31/100:** "Standard priority. The event is 6 weeks out with approximately 40 attendees in a well-served area. No urgency flags detected."

**Score 92/100:** "Critical priority. Event is tomorrow with 500+ expected attendees. The requestor's notes contain emergency language. Immediate attention required."

---

## Chatbot System Prompt (Feature #9)

The full system prompt for the form auto-fill chatbot is in core.md Section 5.3. Key points:
- Extracts 13 form fields from conversation
- Asks one question at a time, warm and conversational
- Early routing question: STAFF vs MAIL vs PICKUP
- Validates dates (future only) and zips (84xxx only)
- Returns JSON: `{reply: string, field_updates: {field: value}}`

---

## Job Brief AI Briefing (Feature #10)

Generated on dispatch. The AI creates:
- **Urgency sentence** — one-line priority context
- **Mission briefing** — 2–3 paragraphs: what to expect, audience context, talking points, requestor history, equity notes
- **Weather note** — event-day weather for zip
- **Traffic tip** — route-specific advice

See core.md Section 10.1 for all 7 Job Brief sections.

---

## Master Classification Output Schema (Features #1–8)

Single AI call on submission returns all of these:

```json
{
  "fulfillment_type": "staff",
  "fulfillment_confidence": 0.95,
  "urgency_level": "high",
  "urgency_reasons": ["event_within_7_days", "large_attendance"],
  "auto_escalated": false,
  "ai_priority_score": 84,
  "priority_justification": "This request scores high because...",
  "tags": ["health-education", "school-event", "large-group"],
  "summary": "One paragraph summary of the request...",
  "flags": {
    "incomplete": false,
    "inconsistent": false,
    "duplicate": false,
    "details": null
  },
  "nlp_extracted": {
    "topics": ["nutrition", "mental-health"],
    "age_group": "elementary",
    "special_needs": null
  }
}
```

---

## Admin Model Configuration

Admin Settings page includes a Model Configuration panel:
- Dropdown per feature to select model
- Shows current model string
- Changes take effect immediately — no restart
- Common options: `anthropic/claude-sonnet-4`, `openai/gpt-4o-mini`, `google/gemini-pro`, `meta-llama/llama-3-70b-instruct`

---

## View Definitions

| Role | AI Visibility |
|------|--------------|
| Partner | Chatbot interaction only. All other AI invisible. |
| Employee | AI summary, priority score + justification, urgency level, AI briefing in Job Brief. No raw classification data. |
| Admin | Everything: full JSON, confidence, flags, tags, score + justification (editable), dispatch recommendation, NL search, forecasts, digests. Model config in Settings. |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
