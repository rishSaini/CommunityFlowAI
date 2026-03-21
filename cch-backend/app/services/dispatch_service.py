"""Smart staff dispatch engine — 8-step candidate ranking algorithm.

Source of truth: core.md §11
"""

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.tables import Request, User
from app.models.enums import CLASSIFICATION_DISPLAY
from app.services.schedule_service import is_on_shift_now, is_in_on_call_rotation
from app.services.directions_service import get_travel_time
from app.utils.geo import haversine_distance

logger = logging.getLogger(__name__)


# ── Constants ────────────────────────────────────────────────────────────────

CLASSIFICATION_PRIORITY = {
    "FT_W2": 100,
    "PT_W2": 80,
    "ON_CALL": 90,
    "CONTRACTOR_1099": 60,
    "VOLUNTEER": 40,
    "OUTSIDE_HELP": 0,
}

_CLUSTER_RADIUS_MILES = 10
_TOP_N_DIRECTIONS = 5
_FALLBACK_MPH_FACTOR = 2  # minutes per mile for fallback travel estimate


# ── Main dispatch function ───────────────────────────────────────────────────

def get_dispatch_candidates(request_id: str, db: Session) -> dict:
    """Run the 8-step dispatch algorithm and return ranked candidates.

    Args:
        request_id: UUID of the request to dispatch.
        db: SQLAlchemy session.

    Returns:
        ``{"candidates": [...], "cluster_opportunities": [...]}``

    Raises:
        ValueError: If the request is not found.
    """

    # ── Step 1: Load request & all eligible staff ────────────────────────

    request = db.query(Request).filter(Request.id == request_id).first()
    if request is None:
        raise ValueError("Request not found")

    candidates = (
        db.query(User)
        .filter(
            User.role == "staff",
            User.is_active.is_(True),
            User.is_on_duty.is_(True),
        )
        .all()
    )
    logger.info("Step 1: %d candidates loaded", len(candidates))

    # ── Step 2: Schedule filtering ───────────────────────────────────────

    event_date = request.event_date  # already a date object
    event_time_obj = None
    if request.event_time:
        try:
            event_time_obj = datetime.strptime(request.event_time, "%H:%M").time()
        except (ValueError, TypeError):
            logger.warning(
                "Could not parse event_time '%s' — skipping time-based filtering",
                request.event_time,
            )

    shift_status: dict[str, bool] = {}  # user_id → True if matched via shift
    filtered: list[User] = []

    for user in candidates:
        on_shift = is_on_shift_now(
            user, check_date=event_date, check_time=event_time_obj
        )
        on_call = is_in_on_call_rotation(
            user, check_date=event_date, check_time=event_time_obj
        )
        if on_shift or on_call:
            filtered.append(user)
            shift_status[user.id] = on_shift  # True = shift, False = on-call only

    candidates = filtered
    logger.info("Step 2: %d candidates remain after schedule filtering", len(candidates))

    # ── Step 3: Classification restrictions ──────────────────────────────

    restricted: list[User] = []
    for user in candidates:
        classification = user.classification or ""
        if classification == "OUTSIDE_HELP":
            continue
        if classification == "VOLUNTEER" and request.fulfillment_type == "staff":
            continue
        restricted.append(user)

    candidates = restricted
    logger.info("Step 3: %d candidates remain after classification restrictions", len(candidates))

    # ── Step 4: Workload filter ──────────────────────────────────────────

    candidates = [
        u for u in candidates
        if (u.current_workload or 0) < (u.max_workload or 5)
    ]
    logger.info("Step 4: %d candidates remain after workload filter", len(candidates))

    # ── Step 5: Distance ranking + Google Directions for top 5 ───────────

    has_event_coords = (
        request.event_lat is not None and request.event_lng is not None
    )

    # Attach distance_miles to each candidate
    distance_map: dict[str, float | None] = {}
    for user in candidates:
        if (
            has_event_coords
            and user.current_lat is not None
            and user.current_lng is not None
        ):
            distance_map[user.id] = haversine_distance(
                user.current_lat,
                user.current_lng,
                request.event_lat,
                request.event_lng,
            )
        else:
            distance_map[user.id] = None

    # Sort: valid distances ascending, None at end
    candidates.sort(
        key=lambda u: (
            distance_map[u.id] is None,
            distance_map[u.id] if distance_map[u.id] is not None else float("inf"),
        )
    )

    # Google Directions for top N; fallback for the rest
    travel_time_map: dict[str, float | None] = {}
    for idx, user in enumerate(candidates):
        dist = distance_map[user.id]
        if idx < _TOP_N_DIRECTIONS and has_event_coords and dist is not None:
            try:
                result = get_travel_time(
                    user.current_lat,
                    user.current_lng,
                    request.event_lat,
                    request.event_lng,
                )
                if result and isinstance(result, dict) and "duration_sec" in result:
                    travel_time_map[user.id] = result["duration_sec"] / 60
                else:
                    # Directions API returned nothing — use fallback
                    travel_time_map[user.id] = (
                        dist * _FALLBACK_MPH_FACTOR if dist is not None else None
                    )
            except Exception:
                logger.exception(
                    "Google Directions failed for user %s — using fallback",
                    user.id,
                )
                travel_time_map[user.id] = (
                    dist * _FALLBACK_MPH_FACTOR if dist is not None else None
                )
        else:
            # Beyond top N or missing coords — use fallback
            travel_time_map[user.id] = (
                dist * _FALLBACK_MPH_FACTOR if dist is not None else None
            )

    logger.info("Step 5: distance + travel time computed for %d candidates", len(candidates))

    # ── Step 6: Scoring ──────────────────────────────────────────────────

    scored: list[tuple[User, float]] = []
    for user in candidates:
        classification = user.classification or ""
        travel_time = travel_time_map.get(user.id)
        workload = user.current_workload or 0

        # Equity bonus: +15 if user is assigned to the request's location
        equity_bonus = 0
        assigned_ids = user.assigned_location_ids or []
        if request.assigned_location_id and request.assigned_location_id in assigned_ids:
            equity_bonus = 15

        travel_component = (
            max(0, 100 - travel_time) if travel_time is not None else 50
        )
        score = (
            CLASSIFICATION_PRIORITY.get(classification, 0)
            + travel_component
            - (workload * 10)
            + equity_bonus
        )
        scored.append((user, score))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    logger.info("Step 6: scoring complete for %d candidates", len(scored))

    # ── Step 7: Cluster detection ────────────────────────────────────────

    cluster_opportunities: list[dict] = []
    if has_event_coords:
        nearby_requests = (
            db.query(Request)
            .filter(
                Request.status.in_(["submitted", "in_review", "approved"]),
                Request.fulfillment_type == "staff",
                Request.id != request_id,
                Request.event_lat.isnot(None),
                Request.event_lng.isnot(None),
            )
            .all()
        )

        for r in nearby_requests:
            dist = haversine_distance(
                request.event_lat,
                request.event_lng,
                r.event_lat,
                r.event_lng,
            )
            if dist <= _CLUSTER_RADIUS_MILES:
                cluster_opportunities.append({
                    "request_id": r.id,
                    "event_name": r.event_name,
                    "distance_miles": round(dist, 1),
                })

        cluster_opportunities.sort(key=lambda c: c["distance_miles"])

    logger.info("Step 7: %d cluster opportunities found", len(cluster_opportunities))

    # ── Step 8: Build return payload ─────────────────────────────────────

    candidate_dicts: list[dict] = []
    for user, score in scored:
        classification = user.classification or ""
        dist = distance_map.get(user.id)
        travel = travel_time_map.get(user.id)

        candidate_dicts.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "classification": classification,
            "classification_display": CLASSIFICATION_DISPLAY.get(
                classification, classification
            ),
            "travel_time_minutes": round(travel, 1) if travel is not None else None,
            "distance_miles": round(dist, 1) if dist is not None else None,
            "current_workload": user.current_workload or 0,
            "max_workload": user.max_workload or 5,
            "is_on_shift": shift_status.get(user.id, False),
            "score": round(score, 1),
        })

    logger.info("Step 8: returning %d candidates", len(candidate_dicts))

    return {
        "candidates": candidate_dicts,
        "cluster_opportunities": cluster_opportunities,
    }
