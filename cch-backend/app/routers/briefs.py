"""Job Brief endpoints.

Source of truth: core.md §10
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user
from app.models.database import get_db
from app.models.schemas import BriefResponse
from app.models.tables import Request, User
from app.services.brief_service import generate_job_brief, regenerate_brief

logger = logging.getLogger(__name__)

router = APIRouter(tags=["briefs"])


@router.get("/briefs/{request_id}", response_model=BriefResponse)
async def get_brief(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the Job Brief for a request.

    Staff can only view briefs for requests assigned to them.
    Admins can view any brief.

    If the request has an assigned staff member but no brief yet
    (e.g. dispatched before Phase 5 or brief generation failed),
    a brief is lazily generated on first access.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Staff: must be assigned to this request
    if current_user.role != "admin":
        if request.assigned_staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not assigned to this request",
            )

    # Lazy/auto generation: if dispatched but no brief exists yet
    if request.job_brief is None and request.assigned_staff_id is not None:
        staff_user = db.query(User).filter(User.id == request.assigned_staff_id).first()
        if staff_user:
            try:
                await generate_job_brief(request, staff_user, db)
                logger.info(
                    "Lazily generated job brief for request %s", request.id
                )
            except Exception:
                logger.exception(
                    "Lazy brief generation failed for request %s", request.id
                )

    # Resolve assigned staff name
    assigned_staff_name: str | None = None
    if request.assigned_staff_id:
        staff_user = db.query(User).filter(User.id == request.assigned_staff_id).first()
        if staff_user:
            assigned_staff_name = staff_user.full_name

    return BriefResponse(
        request_id=request.id,
        status=request.status,
        event_name=request.event_name,
        event_date=request.event_date,
        urgency_level=request.urgency_level,
        priority_score=request.ai_priority_score,
        priority_justification=request.priority_justification,
        job_brief=request.job_brief,
        travel_info=request.travel_info,
        assigned_staff_name=assigned_staff_name,
    )


@router.post("/briefs/{request_id}/regenerate", response_model=BriefResponse)
async def regenerate_brief_endpoint(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Regenerate the Job Brief for a request.

    Admin-only. Calls the AI brief service to rebuild all 7 sections.
    """
    try:
        await regenerate_brief(request_id, db)
    except ValueError as exc:
        msg = str(exc)
        if "No staff assigned" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            )
        if "not found" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # Reload the request after regeneration
    request = db.query(Request).filter(Request.id == request_id).first()

    # Resolve assigned staff name
    assigned_staff_name: str | None = None
    if request.assigned_staff_id:
        staff_user = db.query(User).filter(User.id == request.assigned_staff_id).first()
        if staff_user:
            assigned_staff_name = staff_user.full_name

    return BriefResponse(
        request_id=request.id,
        status=request.status,
        event_name=request.event_name,
        event_date=request.event_date,
        urgency_level=request.urgency_level,
        priority_score=request.ai_priority_score,
        priority_justification=request.priority_justification,
        job_brief=request.job_brief,
        travel_info=request.travel_info,
        assigned_staff_name=assigned_staff_name,
    )
