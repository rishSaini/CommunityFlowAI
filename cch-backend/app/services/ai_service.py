"""OpenRouter AI gateway and master classification pipeline.

All LLM calls go through call_ai(). The master classification pipeline
(classify_request) is the Phase 4 entry point — called on every submission
after geocoding, before the database write.
"""

import json
import logging
from datetime import date, datetime
from typing import Any

import httpx

from app.config import AI_MODELS, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

logger = logging.getLogger(__name__)

_REFERER = "https://cch-system.vercel.app"
_TITLE   = "CCH Ordering System"


# ── Generic gateway ───────────────────────────────────────────────────────────

async def call_ai(
    system_prompt: str,
    user_message: str,
    model: str = "anthropic/claude-sonnet-4.5",
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> str:
    """POST a chat completion to OpenRouter and return the raw text response."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            OPENROUTER_BASE_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": _REFERER,
                "X-Title": _TITLE,
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_message},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


async def call_ai_json(
    system_prompt: str,
    user_message: str,
    model: str = "anthropic/claude-sonnet-4.5",
) -> dict:
    """Like call_ai but parses and returns the response as a dict.
    Strips markdown code fences if the model wraps its JSON in them.
    The system prompt must instruct the model to return only valid JSON.
    """
    raw = await call_ai(system_prompt, user_message, model)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())


# ── Master classification system prompt ───────────────────────────────────────

_CLASSIFICATION_SYSTEM_PROMPT = """\
You are an AI classification engine for Children's Community Health (CCH), a Utah nonprofit.
Analyze incoming service requests and return a structured JSON classification.

Return ONLY valid JSON — no markdown, no explanations, no preamble.

OUTPUT SCHEMA:
{
  "fulfillment_type": "staff" | "mail" | "pickup",
  "fulfillment_confidence": 0.0–1.0,
  "urgency_level": "low" | "medium" | "high" | "critical",
  "urgency_reasons": ["short reason strings"],
  "auto_escalated": true | false,
  "ai_priority_score": 0–100,
  "priority_justification": "2–3 sentence plain-English explanation of the score",
  "tags": ["lowercase-hyphenated-tags"],
  "summary": "One paragraph summary of the request for internal staff",
  "flags": {
    "incomplete": true | false,
    "inconsistent": true | false,
    "duplicate": false,
    "details": "explanation if any flag is true, otherwise null"
  },
  "nlp_extracted": {
    "topics": ["topics from special_instructions"],
    "age_group": "toddler" | "elementary" | "middle-school" | "high-school" | "adult" | "mixed" | null,
    "special_needs": "description or null"
  }
}

URGENCY RULES:
- critical: event within 24 hours, OR 500+ attendees within 7 days, OR emergency keywords in notes
- high: event within 7 days OR 200+ attendees within 14 days
- medium: event within 30 days
- low: event 30+ days out
Set auto_escalated = true when urgency_level = "critical".

PRIORITY SCORING GUIDANCE (0–100):
- Time urgency (35%): <7d=100, 7–14d=75, 14–30d=50, 30+d=25, past due=100
- Attendance (20%): 500+=100, 200–499=75, 50–199=50, <50=25
- Equity (20%): equity_score <30=100, 30–60=50, 60+=25 (lower equity = more underserved)
- Complexity (10%): staff=100, mail=50, pickup=25
- Flags (5%): emergency keywords=100

Return only the JSON object.\
"""


def _build_classification_message(request_data: dict[str, Any]) -> str:
    event_date = request_data.get("event_date")
    today = date.today()

    if isinstance(event_date, str):
        try:
            event_date_obj = datetime.strptime(event_date, "%Y-%m-%d").date()
            days_until = (event_date_obj - today).days
        except ValueError:
            days_until = None
    elif isinstance(event_date, date):
        days_until = (event_date - today).days
    else:
        days_until = None

    days_str = f"{days_until} days from today" if days_until is not None else "unknown"

    return (
        f"EVENT: {request_data.get('event_name', 'N/A')}\n"
        f"DATE: {event_date} ({days_str})\n"
        f"TIME: {request_data.get('event_time', 'not specified')}\n"
        f"LOCATION: {request_data.get('event_city', 'N/A')}, zip {request_data.get('event_zip', 'N/A')}\n"
        f"ATTENDEES: {request_data.get('estimated_attendees', 'not specified')}\n"
        f"FULFILLMENT (self-reported): {request_data.get('fulfillment_type', 'not specified')}\n"
        f"MATERIALS: {request_data.get('materials_requested', [])}\n"
        f"NOTES: {request_data.get('special_instructions') or 'none'}\n"
        f"REQUESTOR: {request_data.get('requestor_name', 'N/A')} ({request_data.get('requestor_email', 'N/A')})\n"
        f"ZIP EQUITY SCORE: {request_data.get('equity_score', 'unknown')} (0–100, lower = more underserved)\n"
        f"REQUESTOR HISTORY: {request_data.get('requestor_history', 'unknown')}\n"
        "\nClassify this request and return only valid JSON per the schema."
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def classify_request(request_data: dict[str, Any]) -> dict[str, Any]:
    """Run the master classification pipeline on a submission.

    Expects request_data to include the standard request fields plus:
        equity_score      (float) — from service_area_zips by event_zip
        requestor_history (str)   — "first-time" | "returning" | "frequent"

    Returns the full classification dict. Never raises — falls back to
    deterministic scoring on any failure so submission is never blocked.
    """
    model = AI_MODELS.get("classification", "anthropic/claude-sonnet-4.5")

    try:
        result = await call_ai_json(
            _CLASSIFICATION_SYSTEM_PROMPT,
            _build_classification_message(request_data),
            model=model,
        )
        logger.info(
            "classify_request: event='%s' score=%s urgency=%s",
            request_data.get("event_name"),
            result.get("ai_priority_score"),
            result.get("urgency_level"),
        )
        return result
    except (json.JSONDecodeError, KeyError, httpx.HTTPError, Exception) as exc:
        logger.error("classify_request failed (%s), using fallback: %s", type(exc).__name__, exc)
        return _fallback_classification(request_data)


def _fallback_classification(request_data: dict[str, Any]) -> dict[str, Any]:
    """Deterministic fallback when the AI call fails."""
    from app.services.scoring import compute_priority_score  # avoid circular at module level

    score_data = compute_priority_score(request_data)
    return {
        "fulfillment_type": request_data.get("fulfillment_type", "staff"),
        "fulfillment_confidence": 0.5,
        "urgency_level": "medium",
        "urgency_reasons": ["ai_unavailable"],
        "auto_escalated": False,
        "ai_priority_score": score_data["score"],
        "priority_justification": (
            "Priority score calculated by rule-based fallback — "
            "AI classification was unavailable at submission time."
        ),
        "tags": [],
        "summary": "AI classification unavailable. Please review this request manually.",
        "flags": {"incomplete": False, "inconsistent": False, "duplicate": False, "details": None},
        "nlp_extracted": {"topics": [], "age_group": None, "special_needs": None},
    }
