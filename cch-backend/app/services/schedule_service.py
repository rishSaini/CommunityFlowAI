"""Schedule-aware availability checks for dispatch and notifications.

Source of truth: core.md §8.2, §8.3, §11 Step 2
"""

from datetime import date, datetime, time

from app.models.tables import User


def is_on_shift_now(
    user: User,
    check_date: date | None = None,
    check_time: time | None = None,
) -> bool:
    """Return True if *user* is currently on shift.

    Checks:
    1. The user's weekly ``schedule`` for a matching day-of-week entry
       whose start/end window covers *check_time*.
    2. The user's ``schedule_exceptions`` for a same-day "off" entry
       that would override the shift.
    """
    now = datetime.now()
    if check_date is None:
        check_date = now.date()
    if check_time is None:
        check_time = now.time()

    schedule: list[dict] | None = user.schedule
    if not schedule:
        return False

    day_name = check_date.strftime("%A").lower()  # e.g. "monday"

    on_shift = False
    for entry in schedule:
        if entry.get("day", "").lower() != day_name:
            continue
        start = _parse_hhmm(entry.get("start", ""))
        end = _parse_hhmm(entry.get("end", ""))
        if start is None or end is None:
            continue
        if start <= check_time <= end:
            on_shift = True
            break

    if not on_shift:
        return False

    # An "off" exception for today overrides the shift.
    if has_exception_today(user, "off", check_date):
        return False

    return True


def has_exception_today(
    user: User,
    exception_type: str,
    check_date: date | None = None,
) -> bool:
    """Return True if *user* has a schedule exception of *exception_type* on *check_date*."""
    if check_date is None:
        check_date = date.today()

    exceptions: list[dict] | None = user.schedule_exceptions
    if not exceptions:
        return False

    for entry in exceptions:
        entry_date_str = entry.get("date", "")
        if not entry_date_str:
            continue
        try:
            entry_date = datetime.strptime(entry_date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            continue
        if entry_date == check_date and entry.get("type", "").lower() == exception_type.lower():
            return True

    return False


def is_in_on_call_rotation(
    user: User,
    check_date: date | None = None,
    check_time: time | None = None,
) -> bool:
    """Return True if an ON_CALL user is within their on-call rotation window.

    Non-ON_CALL users always return False.
    """
    if getattr(user, "classification", None) != "ON_CALL":
        return False

    now = datetime.now()
    if check_date is None:
        check_date = now.date()
    if check_time is None:
        check_time = now.time()

    on_call_schedule: list[dict] | None = user.on_call_schedule
    if not on_call_schedule:
        return False

    for entry in on_call_schedule:
        start_date = _parse_date(entry.get("start_date", ""))
        end_date = _parse_date(entry.get("end_date", ""))
        if start_date is None or end_date is None:
            continue
        if not (start_date <= check_date <= end_date):
            continue

        # If the entry specifies a time window, enforce it.
        start_time = _parse_hhmm(entry.get("start_time", ""))
        end_time = _parse_hhmm(entry.get("end_time", ""))
        if start_time is not None and end_time is not None:
            if not (start_time <= check_time <= end_time):
                continue

        return True

    return False


# ── Private helpers ──────────────────────────────────────────


def _parse_hhmm(value: str | None) -> time | None:
    """Parse an 'HH:MM' string into a ``time`` object, or return None."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%H:%M").time()
    except (ValueError, TypeError):
        return None


def _parse_date(value: str | None) -> date | None:
    """Parse a 'YYYY-MM-DD' string into a ``date`` object, or return None."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None
