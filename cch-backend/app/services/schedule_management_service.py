"""Schedule management service — shift generation, conflict detection, coverage analysis.

Handles concrete shift assignments for the admin calendar, auto-generation
from weekly patterns, and AI-powered scheduling suggestions via OpenRouter.
"""

import logging
from datetime import date, datetime, timedelta, time

from sqlalchemy.orm import Session

from app.models.tables import (
    ShiftAssignment, User, Request, RequestAssignment, Location,
)

logger = logging.getLogger(__name__)


# ── Classification colors for calendar display ────────────────────────────

CLASSIFICATION_COLORS = {
    "FT_W2": "#3b82f6",            # blue
    "PT_W2": "#06b6d4",            # cyan
    "ON_CALL": "#8b5cf6",          # purple
    "CONTRACTOR_1099": "#f59e0b",  # amber
    "VOLUNTEER": "#10b981",        # emerald
    "OUTSIDE_HELP": "#94a3b8",     # slate
}


# ── Generate shifts from weekly patterns ──────────────────────────────────

def generate_shifts_from_patterns(
    db: Session,
    start_date: date,
    end_date: date,
    user_ids: list[str] | None = None,
    created_by: str | None = None,
    overwrite: bool = False,
) -> dict:
    """Stamp weekly schedule patterns into concrete ShiftAssignment rows.

    Returns ``{"created": N, "skipped": N}``.
    """
    query = db.query(User).filter(
        User.role == "staff",
        User.is_active.is_(True),
    )
    if user_ids:
        query = query.filter(User.id.in_(user_ids))
    users = query.all()

    if overwrite:
        del_q = db.query(ShiftAssignment).filter(
            ShiftAssignment.date >= start_date,
            ShiftAssignment.date <= end_date,
            ShiftAssignment.status != "cancelled",
        )
        if user_ids:
            del_q = del_q.filter(ShiftAssignment.user_id.in_(user_ids))
        del_q.delete(synchronize_session=False)

    created = 0
    skipped = 0
    current = start_date

    while current <= end_date:
        day_name = current.strftime("%A").lower()

        for user in users:
            schedule: list[dict] = user.schedule or []
            exceptions: list[dict] = user.schedule_exceptions or []

            # Check for "off" exception on this date
            has_off = False
            for exc in exceptions:
                exc_date_str = exc.get("date", "")
                if exc_date_str:
                    try:
                        exc_date = datetime.strptime(exc_date_str, "%Y-%m-%d").date()
                        if exc_date == current and exc.get("type", "").lower() == "off":
                            has_off = True
                            break
                    except (ValueError, TypeError):
                        pass
            if has_off:
                skipped += 1
                continue

            for entry in schedule:
                if entry.get("day", "").lower() != day_name:
                    continue

                start_t = entry.get("start", "")
                end_t = entry.get("end", "")
                if not start_t or not end_t:
                    continue

                # Check for existing non-cancelled shift overlap
                existing = db.query(ShiftAssignment).filter(
                    ShiftAssignment.user_id == user.id,
                    ShiftAssignment.date == current,
                    ShiftAssignment.status != "cancelled",
                ).first()

                if existing:
                    skipped += 1
                    continue

                classification = user.classification or ""
                color = CLASSIFICATION_COLORS.get(classification, "#6366f1")

                db.add(ShiftAssignment(
                    user_id=user.id,
                    date=current,
                    start_time=start_t,
                    end_time=end_t,
                    location_id=entry.get("location_id"),
                    shift_type="regular",
                    status="scheduled",
                    color=color,
                    created_by=created_by,
                ))
                created += 1

        current += timedelta(days=1)

    db.flush()
    return {"created": created, "skipped": skipped}


# ── Conflict detection ────────────────────────────────────────────────────

def detect_conflicts(
    db: Session,
    user_id: str,
    check_date: date,
    start_time: str,
    end_time: str,
    exclude_shift_id: str | None = None,
) -> list[ShiftAssignment]:
    """Return existing shifts that overlap with the proposed time slot."""
    query = db.query(ShiftAssignment).filter(
        ShiftAssignment.user_id == user_id,
        ShiftAssignment.date == check_date,
        ShiftAssignment.status.in_(["scheduled", "confirmed"]),
    )
    if exclude_shift_id:
        query = query.filter(ShiftAssignment.id != exclude_shift_id)

    existing = query.all()
    conflicts = []

    try:
        new_start = datetime.strptime(start_time, "%H:%M").time()
        new_end = datetime.strptime(end_time, "%H:%M").time()
    except (ValueError, TypeError):
        return []

    for shift in existing:
        try:
            s_start = datetime.strptime(shift.start_time, "%H:%M").time()
            s_end = datetime.strptime(shift.end_time, "%H:%M").time()
        except (ValueError, TypeError):
            continue

        # Overlap: NOT (end1 <= start2 OR start1 >= end2)
        if not (new_end <= s_start or new_start >= s_end):
            conflicts.append(shift)

    return conflicts


# ── Coverage analysis ─────────────────────────────────────────────────────

def get_coverage_analysis(
    db: Session,
    start_date: date,
    end_date: date,
    location_id: str | None = None,
) -> dict:
    """Compute coverage cells for the date range.

    Returns ``{"cells": [...], "summary": {...}}``.
    """
    # Get all shifts in range
    shift_query = db.query(ShiftAssignment).filter(
        ShiftAssignment.date >= start_date,
        ShiftAssignment.date <= end_date,
        ShiftAssignment.status.in_(["scheduled", "confirmed"]),
    )
    if location_id:
        shift_query = shift_query.filter(ShiftAssignment.location_id == location_id)
    shifts = shift_query.all()

    # Get all requests (tasks) in range
    task_query = db.query(Request).filter(
        Request.event_date >= start_date,
        Request.event_date <= end_date,
        Request.fulfillment_type == "staff",
        Request.status.in_(["submitted", "in_review", "approved", "dispatched", "in_progress"]),
    )
    tasks = task_query.all()

    # Build hourly coverage map
    cells = []
    total_gaps = 0
    worst_day = None
    worst_gap_count = 0
    current = start_date

    while current <= end_date:
        day_gap_count = 0

        for hour in range(6, 22):  # 6 AM to 10 PM
            check_time = time(hour, 0)

            # Count staff covering this hour
            scheduled = 0
            for s in shifts:
                if s.date != current:
                    continue
                try:
                    s_start = datetime.strptime(s.start_time, "%H:%M").time()
                    s_end = datetime.strptime(s.end_time, "%H:%M").time()
                    if s_start <= check_time < s_end:
                        scheduled += 1
                except (ValueError, TypeError):
                    pass

            # Count tasks in this hour
            task_count = 0
            for t in tasks:
                if t.event_date != current:
                    continue
                if t.event_time:
                    try:
                        t_time = datetime.strptime(t.event_time, "%H:%M").time()
                        if t_time.hour == hour:
                            task_count += 1
                    except (ValueError, TypeError):
                        pass

            denom = max(task_count, 1)
            ratio = scheduled / denom
            if task_count == 0 and scheduled == 0:
                level = "balanced"
            elif ratio < 0.5:
                level = "critical"
            elif ratio < 1.0:
                level = "under"
            elif ratio < 2.0:
                level = "balanced"
            else:
                level = "over"

            if level in ("critical", "under") and task_count > 0:
                total_gaps += 1
                day_gap_count += 1

            cells.append({
                "date": current.isoformat(),
                "hour": hour,
                "scheduled_count": scheduled,
                "task_count": task_count,
                "coverage_ratio": round(ratio, 2),
                "level": level,
            })

        if day_gap_count > worst_gap_count:
            worst_gap_count = day_gap_count
            worst_day = current.isoformat()

        current += timedelta(days=1)

    return {
        "cells": cells,
        "summary": {
            "total_gaps": total_gaps,
            "worst_day": worst_day,
            "suggestion_count": min(total_gaps, 5),
        },
    }


# ── AI schedule suggestions ──────────────────────────────────────────────

async def ai_suggest_schedule(
    db: Session,
    start_date: date,
    end_date: date,
) -> dict:
    """Call OpenRouter to suggest optimal shift assignments.

    Falls back to rule-based suggestions if AI is unavailable.
    """
    # Gather context
    coverage = get_coverage_analysis(db, start_date, end_date)
    gap_cells = [c for c in coverage["cells"] if c["level"] in ("critical", "under") and c["task_count"] > 0]

    staff = db.query(User).filter(
        User.role == "staff",
        User.is_active.is_(True),
        User.classification != "OUTSIDE_HELP",
    ).all()

    existing_shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.date >= start_date,
        ShiftAssignment.date <= end_date,
        ShiftAssignment.status.in_(["scheduled", "confirmed"]),
    ).all()

    # Build rule-based suggestions for gaps
    suggestions = []
    used_slots: set[tuple[str, str]] = set()  # (user_id, date_str)

    # Track which users already have shifts on which dates
    for s in existing_shifts:
        used_slots.add((s.user_id, s.date.isoformat()))

    for gap in gap_cells[:5]:  # Top 5 gaps
        gap_date_str = gap["date"]
        gap_date = datetime.strptime(gap_date_str, "%Y-%m-%d").date()
        day_name = gap_date.strftime("%A").lower()

        best_candidate = None
        best_reason = ""

        for user in staff:
            # Skip if already scheduled that day
            if (user.id, gap_date_str) in used_slots:
                continue

            # Skip if at max workload
            if (user.current_workload or 0) >= (user.max_workload or 5):
                continue

            # Check if user's weekly pattern includes this day
            schedule: list[dict] = user.schedule or []
            for entry in schedule:
                if entry.get("day", "").lower() == day_name:
                    best_candidate = user
                    best_reason = (
                        f"{user.full_name} is available {day_name.title()}s per their "
                        f"weekly pattern ({entry.get('start', '?')}–{entry.get('end', '?')}) "
                        f"and has capacity ({user.current_workload or 0}/{user.max_workload or 5} workload)."
                    )
                    break

            if best_candidate:
                break

        if best_candidate:
            # Find their shift times for that day
            shift_entry = None
            for entry in (best_candidate.schedule or []):
                if entry.get("day", "").lower() == day_name:
                    shift_entry = entry
                    break

            if shift_entry:
                suggestions.append({
                    "user_id": best_candidate.id,
                    "user_name": best_candidate.full_name,
                    "date": gap_date_str,
                    "start_time": shift_entry.get("start", "09:00"),
                    "end_time": shift_entry.get("end", "17:00"),
                    "reason": best_reason,
                    "confidence": 0.85,
                    "fills_gap": True,
                })
                used_slots.add((best_candidate.id, gap_date_str))

    # Try AI for narrative
    narrative = _build_narrative(coverage, suggestions)

    # Attempt OpenRouter call for enhanced suggestions
    try:
        from app.services.ai_service import call_ai_json
        from app.config import AI_MODELS

        context = _build_ai_context(coverage, staff, existing_shifts, start_date, end_date)
        ai_result = await call_ai_json(
            system_prompt=_AI_SCHEDULE_PROMPT,
            user_message=context,
            model=AI_MODELS.get("scheduling", AI_MODELS.get("classification", "anthropic/claude-sonnet-4")),
        )
        if ai_result and isinstance(ai_result, dict):
            if "narrative" in ai_result:
                narrative = ai_result["narrative"]
            if "suggestions" in ai_result and isinstance(ai_result["suggestions"], list):
                # Validate AI suggestions — only keep ones with valid user IDs
                valid_ids = {u.id for u in staff}
                for s in ai_result["suggestions"]:
                    if isinstance(s, dict) and s.get("user_id") in valid_ids:
                        # Don't duplicate existing suggestions
                        existing_key = (s["user_id"], s.get("date", ""))
                        if existing_key not in used_slots:
                            suggestions.append({
                                "user_id": s["user_id"],
                                "user_name": next(
                                    (u.full_name for u in staff if u.id == s["user_id"]),
                                    "Unknown",
                                ),
                                "date": s.get("date", ""),
                                "start_time": s.get("start_time", "09:00"),
                                "end_time": s.get("end_time", "17:00"),
                                "reason": s.get("reason", "AI-suggested assignment"),
                                "confidence": float(s.get("confidence", 0.7)),
                                "fills_gap": bool(s.get("fills_gap", True)),
                            })
    except Exception as exc:
        logger.warning("AI schedule suggestion failed, using rule-based: %s", exc)

    return {
        "suggestions": suggestions[:8],
        "narrative": narrative,
    }


def _build_narrative(coverage: dict, suggestions: list[dict]) -> str:
    """Build a human-readable narrative from coverage data."""
    total_gaps = coverage["summary"]["total_gaps"]
    worst_day = coverage["summary"]["worst_day"]

    if total_gaps == 0:
        return "Full coverage achieved for the selected date range. All scheduled tasks have adequate staffing."

    parts = [f"Found {total_gaps} coverage gap{'s' if total_gaps != 1 else ''} in the selected range."]
    if worst_day:
        parts.append(f"The most understaffed day is {worst_day}.")
    if suggestions:
        parts.append(
            f"Generated {len(suggestions)} suggestion{'s' if len(suggestions) != 1 else ''} "
            f"to improve coverage."
        )
    else:
        parts.append("No available staff found to fill the gaps — consider adjusting schedules or adding staff.")

    return " ".join(parts)


_AI_SCHEDULE_PROMPT = """You are a workforce scheduling assistant for CCH (Children's Community Health) in Utah.
Given the current schedule, pending requests, and staff availability, suggest optimal
shift assignments to maximize coverage and minimize travel time.

Rules:
- NEVER schedule OUTSIDE_HELP classification
- Prefer FT_W2 for critical/high priority requests
- Consider employee workload limits (current_workload < max_workload)
- Respect weekly availability patterns
- Flag coverage gaps where no staff is scheduled but requests exist
- Consider equity: prioritize underserved zip codes

Return JSON only:
{
  "suggestions": [
    {
      "user_id": "...",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "reason": "explanation",
      "confidence": 0.0-1.0,
      "fills_gap": true
    }
  ],
  "narrative": "2-3 sentence summary of schedule health and recommendations"
}"""


def _build_ai_context(
    coverage: dict,
    staff: list[User],
    shifts: list[ShiftAssignment],
    start_date: date,
    end_date: date,
) -> str:
    """Build context string for AI schedule suggestion prompt."""
    lines = [f"Date range: {start_date.isoformat()} to {end_date.isoformat()}"]
    lines.append(f"Coverage gaps: {coverage['summary']['total_gaps']}")

    lines.append("\nStaff:")
    for u in staff:
        sched = u.schedule or []
        days = [e.get("day", "?") for e in sched]
        lines.append(
            f"  - {u.full_name} ({u.classification}): "
            f"workload {u.current_workload or 0}/{u.max_workload or 5}, "
            f"days: {', '.join(days) if days else 'none'}, "
            f"id: {u.id}"
        )

    lines.append(f"\nExisting shifts: {len(shifts)}")

    gap_cells = [c for c in coverage["cells"] if c["level"] in ("critical", "under") and c["task_count"] > 0]
    if gap_cells:
        lines.append("\nGap hours (date, hour, tasks, staff):")
        for g in gap_cells[:10]:
            lines.append(f"  - {g['date']} {g['hour']}:00 — {g['task_count']} tasks, {g['scheduled_count']} staff")

    return "\n".join(lines)


# ── Helpers for building shift responses ──────────────────────────────────

def shift_to_response(shift: ShiftAssignment, db: Session) -> dict:
    """Convert a ShiftAssignment ORM object to a response dict."""
    user = db.query(User).filter(User.id == shift.user_id).first()
    location = (
        db.query(Location).filter(Location.id == shift.location_id).first()
        if shift.location_id else None
    )
    request = (
        db.query(Request).filter(Request.id == shift.request_id).first()
        if shift.request_id else None
    )

    return {
        "id": shift.id,
        "user_id": shift.user_id,
        "user_name": user.full_name if user else "",
        "user_classification": user.classification if user else None,
        "date": shift.date.isoformat() if isinstance(shift.date, date) else str(shift.date),
        "start_time": shift.start_time,
        "end_time": shift.end_time,
        "location_id": shift.location_id,
        "location_name": location.name if location else None,
        "shift_type": shift.shift_type or "regular",
        "status": shift.status or "scheduled",
        "request_id": shift.request_id,
        "request_name": request.event_name if request else None,
        "color": shift.color,
        "notes": shift.notes,
    }
