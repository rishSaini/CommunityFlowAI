"""Job Brief endpoints.

Source of truth: core.md §10
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user
from app.models.database import get_db
from app.models.schemas import BriefResponse
from app.models.tables import Request, User

router = APIRouter(tags=["briefs"])


@router.get("/briefs/{request_id}", response_model=BriefResponse)
def get_brief(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the Job Brief for a request.

    Staff can only view briefs for requests assigned to them.
    Admins can view any brief.
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


@router.post("/briefs/{request_id}/regenerate")
def regenerate_brief(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Regenerate the Job Brief for a request.

    Stub for Phase 2 — full Job Brief AI generation comes in Phase 5.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    return {"message": "Brief regeneration queued", "request_id": request_id}
