# Changelog

## 2026-03-21

### Phase 4 — AI Integration + Priority Scoring (Backend)

#### Added
- **`cch-backend/app/services/ai_service.py`** — OpenRouter AI gateway and master classification pipeline
  - `call_ai()` — generic async LLM call via OpenRouter (httpx, 30s timeout)
  - `call_ai_json()` — wraps `call_ai`, strips markdown fences, returns parsed dict
  - `classify_request()` — master classification pipeline; called on submission with request data + `equity_score` + `requestor_history`; returns full classification JSON (fulfillment type, urgency, priority score, justification, tags, summary, flags, NLP extraction)
  - `_fallback_classification()` — deterministic fallback if AI call fails; submission never blocked

- **`cch-backend/app/services/scoring.py`** — Deterministic priority scoring algorithm
  - `compute_priority_score()` — weighted formula: time_urgency (35%) + attendance (20%) + equity (20%) + complexity (10%) + history (10%) + flags (5%)
  - Returns `{"score": int, "factors": {...breakdown...}}`
  - No external dependencies — fully testable standalone

#### Modified
- **`cch-backend/app/config.py`**
  - Switched `load_dotenv()` → `load_dotenv(find_dotenv())` so the `.env` at project root is found regardless of where the server is launched from
  - Updated all AI model strings to verified OpenRouter IDs (`anthropic/claude-sonnet-4.5`)

#### Infrastructure
- **`.env`** — created at project root with `OPENROUTER_API_KEY` and `GOOGLE_MAPS_API_KEY`
- **`.gitignore`** — pulled from remote; `.claude/` added to keep Claude Code config out of version control
- **`cch-frontend/`** — removed (frontend is handled by a separate teammate)

---

### Pending (blocked on Phase 2)
- Wire `classify_request()` into `cch-backend/app/routers/requests.py` submission endpoint — needs Phase 2 router scaffold from teammate
