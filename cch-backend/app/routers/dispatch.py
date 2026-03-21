"""Dispatch candidate ranking and staff assignment.

Source of truth: core.md §11
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.enums import CLASSIFICATION_DISPLAY
from app.models.schemas import (
    DispatchAssignRequest,
    DispatchCandidateResponse,
    RequestResponse,
)
from app.models.tables import Request, User
from app.services.schedule_service import is_on_shift_now
from app.services.ws_manager import manager
from app.utils.geo import haversine_distance

router = APIRouter(tags=["dispatch"])


@router.get(
    "/dispatch/{request_id}/candidates",
    response_model=list[DispatchCandidateResponse],
)
def get_dispatch_candidates(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Return ranked dispatch candidates for a request.

    Phase 2 version — basic candidate ranking.  Full 8-step algorithm
    comes in Phase 5.

    Ranking logic:
    1. Get all active, on-duty staff users.
    2. Filter to those currently on shift (schedule_service).
    3. Filter out users at or above max workload.
    4. Compute haversine distance when coordinates are available.
    5. Sort by distance (closest first), then by current_workload (ascending).
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    staff_users = (
        db.query(User)
        .filter(
            User.role == "staff",
            User.is_active.is_(True),
            User.is_on_duty.is_(True),
        )
        .all()
    )

    candidates: list[DispatchCandidateResponse] = []

    for user in staff_users:
        on_shift = is_on_shift_now(user)
        if not on_shift:
            continue

        if user.current_workload >= user.max_workload:
            continue

        distance: float | None = None
        if (
            request.event_lat is not None
            and request.event_lng is not None
            and user.current_lat is not None
            and user.current_lng is not None
        ):
            distance = haversine_distance(
                user.current_lat,
                user.current_lng,
                request.event_lat,
                request.event_lng,
            )

        classification_key = user.classification or ""
        display = CLASSIFICATION_DISPLAY.get(classification_key, user.classification_display)

        candidates.append(
            DispatchCandidateResponse(
                user_id=user.id,
                full_name=user.full_name,
                classification=classification_key,
                classification_display=display,
                distance_miles=distance,
                travel_time_minutes=None,
                current_workload=user.current_workload,
                max_workload=user.max_workload,
                is_on_shift=True,
                score=None,
            )
        )

    # Sort: distance ascending (None → end), then workload ascending
    candidates.sort(
        key=lambda c: (
            c.distance_miles if c.distance_miles is not None else float("inf"),
            c.current_workload,
        )
    )

    return candidates


@router.post(
    "/dispatch/{request_id}/assign",
    response_model=RequestResponse,
)
async def assign_dispatch(
    request_id: str,
    body: DispatchAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Assign a staff member to a request and broadcast via WebSocket."""
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    if request.status in ("dispatched", "in_progress", "fulfilled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request already dispatched",
        )

    staff_user = db.query(User).filter(User.id == body.staff_id).first()
    if not staff_user or not staff_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found or inactive",
        )

    request.assigned_staff_id = body.staff_id
    request.status = "dispatched"
    staff_user.current_workload += 1
    db.commit()
    db.refresh(request)

    await manager.broadcast(
        {
            "type": "dispatch",
            "request_id": request_id,
            "staff_id": body.staff_id,
        }
    )

    return request
