"""Deterministic priority scoring algorithm.

Used as the fallback when AI classification fails, and as a cross-check
against the AI score.

Formula (core.md §7.1):
    score = (time_urgency * 0.35) + (attendance * 0.20) + (equity * 0.20)
          + (complexity * 0.10) + (history * 0.10) + (flags * 0.05)

Each factor returns 0–100 before weighting.
"""

from datetime import date, datetime
from typing import Any


# ── Factor calculators ────────────────────────────────────────────────────────

def _time_urgency_factor(event_date: Any) -> float:
    today = date.today()

    if isinstance(event_date, str):
        try:
            event_date = datetime.strptime(event_date, "%Y-%m-%d").date()
        except ValueError:
            return 50.0  # unparseable → neutral

    if isinstance(event_date, date):
        days = (event_date - today).days
        if days < 0:   return 100.0  # past due
        if days < 7:   return 100.0
        if days < 14:  return 75.0
        if days < 30:  return 50.0
        return 25.0

    return 50.0  # unknown


def _attendance_factor(estimated_attendees: Any) -> float:
    if estimated_attendees is None:
        return 25.0
    try:
        n = int(estimated_attendees)
    except (TypeError, ValueError):
        return 25.0

    if n >= 500: return 100.0
    if n >= 200: return 75.0
    if n >= 50:  return 50.0
    return 25.0


def _equity_factor(equity_score: Any) -> float:
    """Lower equity_score = more underserved = higher priority."""
    if equity_score is None:
        return 50.0
    try:
        eq = float(equity_score)
    except (TypeError, ValueError):
        return 50.0

    if eq < 30:  return 100.0
    if eq < 60:  return 50.0
    return 25.0


def _complexity_factor(fulfillment_type: Any) -> float:
    return {"staff": 100.0, "mail": 50.0, "pickup": 25.0}.get(
        str(fulfillment_type).lower(), 50.0
    )


def _history_factor(requestor_history: Any) -> float:
    """First-time requestors need more attention → higher score."""
    return {"first-time": 75.0, "returning": 50.0, "frequent": 25.0}.get(
        str(requestor_history).lower(), 50.0
    )


_EMERGENCY_KEYWORDS = frozenset({
    "emergency", "urgent", "asap", "immediately", "crisis",
    "critical", "life-threatening", "danger", "outbreak",
})


def _flags_factor(request_data: dict[str, Any]) -> float:
    instructions = str(request_data.get("special_instructions") or "").lower()
    if any(kw in instructions for kw in _EMERGENCY_KEYWORDS):
        return 100.0
    return 0.0


# ── Public API ────────────────────────────────────────────────────────────────

def compute_priority_score(request_data: dict[str, Any]) -> dict[str, Any]:
    """Compute the deterministic priority score for a request dict.

    Expected keys (all optional — defaults apply if missing):
        event_date, estimated_attendees, equity_score,
        fulfillment_type, requestor_history, special_instructions

    Returns:
        {"score": int (0–100), "factors": {name: {raw, weight, contribution}}}
    """
    time_urgency = _time_urgency_factor(request_data.get("event_date"))
    attendance   = _attendance_factor(request_data.get("estimated_attendees"))
    equity       = _equity_factor(request_data.get("equity_score"))
    complexity   = _complexity_factor(request_data.get("fulfillment_type"))
    history      = _history_factor(request_data.get("requestor_history"))
    flags        = _flags_factor(request_data)

    raw = (
        time_urgency * 0.35
        + attendance * 0.20
        + equity     * 0.20
        + complexity * 0.10
        + history    * 0.10
        + flags      * 0.05
    )
    score = max(0, min(100, round(raw)))

    return {
        "score": score,
        "factors": {
            "time_urgency": {"raw": time_urgency, "weight": 0.35, "contribution": round(time_urgency * 0.35, 1)},
            "attendance":   {"raw": attendance,   "weight": 0.20, "contribution": round(attendance   * 0.20, 1)},
            "equity":       {"raw": equity,       "weight": 0.20, "contribution": round(equity       * 0.20, 1)},
            "complexity":   {"raw": complexity,   "weight": 0.10, "contribution": round(complexity   * 0.10, 1)},
            "history":      {"raw": history,      "weight": 0.10, "contribution": round(history      * 0.10, 1)},
            "flags":        {"raw": flags,        "weight": 0.05, "contribution": round(flags        * 0.05, 1)},
        },
    }
