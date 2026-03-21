"""Dispatch candidate ranking and staff assignment.

Source of truth: core.md §11
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import (
    DispatchAssignRequest,
    DispatchAssignTeamRequest,
    DispatchResponse,
    RequestResponse,
)
from app.models.tables import Request, RequestAssignment, User
from app.services.brief_service import generate_job_brief
from app.services.dispatch_service import get_dispatch_candidates
from app.services.twilio_service import notify_dispatch
from app.services.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dispatch"])


@router.get(
    "/dispatch/{request_id}/candidates",
    response_model=DispatchResponse,
)
def list_dispatch_candidates(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Return ranked dispatch candidates for a request.

    Uses the 8-step dispatch algorithm from dispatch_service, which includes
    schedule filtering, classification restrictions, workload limits,
    distance + Google Directions ranking, composite scoring, and cluster
    detection.
    """
    try:
        result = get_dispatch_candidates(request_id, db)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    return DispatchResponse(
        candidates=result["candidates"],
        cluster_opportunities=result["cluster_opportunities"],
    )


@router.post(
    "/dispatch/{request_id}/assign",
    response_model=RequestResponse,
)
async def assign_dispatch(
    request_id: str,
    body: DispatchAssignTeamRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Assign staff to a request with optional team members. Broadcasts via WebSocket."""
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

    # ── Primary assignment ──
    request.assigned_staff_id = body.staff_id
    request.status = "dispatched"
    staff_user.current_workload = (staff_user.current_workload or 0) + 1

    # Create RequestAssignment for primary
    primary_role = (body.roles or {}).get(body.staff_id, "primary")
    db.add(RequestAssignment(
        request_id=request_id,
        user_id=body.staff_id,
        role=primary_role,
        assigned_by=current_user.id,
        notes=body.notes,
    ))

    # ── Additional team members ──
    additional_users = []
    for extra_id in body.additional_staff_ids:
        extra_user = db.query(User).filter(User.id == extra_id, User.is_active.is_(True)).first()
        if not extra_user or extra_id == body.staff_id:
            continue

        role = (body.roles or {}).get(extra_id, "support")
        db.add(RequestAssignment(
            request_id=request_id,
            user_id=extra_id,
            role=role,
            assigned_by=current_user.id,
            notes=body.notes,
        ))
        extra_user.current_workload = (extra_user.current_workload or 0) + 1
        additional_users.append(extra_user)

    db.commit()
    db.refresh(request)

    # ── WebSocket broadcast with full team ──
    team_ids = [body.staff_id] + [u.id for u in additional_users]
    await manager.broadcast(
        {
            "type": "dispatch",
            "request_id": request_id,
            "staff_id": body.staff_id,
            "team": team_ids,
        }
    )

    # ── Twilio + Brief for primary ──
    try:
        await notify_dispatch(request, staff_user, db)
    except Exception as exc:
        logger.warning("Twilio notification failed for request %s: %s", request_id, exc)

    try:
        await generate_job_brief(request, staff_user, db)
    except Exception as exc:
        logger.warning("Brief generation failed for request %s: %s", request_id, exc)

    # ── Twilio + Brief for additional team members ──
    for extra_user in additional_users:
        try:
            await notify_dispatch(request, extra_user, db)
        except Exception as exc:
            logger.warning("Twilio failed for team member %s: %s", extra_user.id, exc)
        try:
            await generate_job_brief(request, extra_user, db)
        except Exception as exc:
            logger.warning("Brief failed for team member %s: %s", extra_user.id, exc)

    return request
