"""Admin-only management endpoints.

Source of truth: core.md §2.4
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import NotificationLogResponse, RequestResponse, UrgencyOverrideRequest
from app.models.tables import NotificationLog, Request, User
from app.services.twilio_service import notify_dispatch

router = APIRouter(tags=["admin"])


# ── Inline request models ────────────────────────────────

class PriorityOverrideRequest(BaseModel):
    ai_priority_score: Optional[float] = None
    priority_justification: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────

@router.patch("/admin/requests/{request_id}/priority", response_model=RequestResponse)
def override_priority(
    request_id: str,
    body: PriorityOverrideRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Override AI priority score and/or justification for a request (admin only)."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    if body.ai_priority_score is not None:
        req.ai_priority_score = body.ai_priority_score
    if body.priority_justification is not None:
        req.priority_justification = body.priority_justification

    db.commit()
    db.refresh(req)
    return req


@router.patch("/admin/requests/{request_id}/urgency", response_model=RequestResponse)
async def override_urgency(
    request_id: str,
    body: UrgencyOverrideRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Override urgency level for a request (admin only).

    If escalated TO critical and a staff member is already assigned,
    re-triggers the Twilio notification + escalation chain.
    """
    valid_levels = {"low", "medium", "high", "critical"}
    if body.urgency_level not in valid_levels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid urgency_level. Must be one of: {', '.join(valid_levels)}",
        )

    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    old_urgency = req.urgency_level
    req.urgency_level = body.urgency_level
    db.commit()
    db.refresh(req)

    # Re-trigger Twilio if escalated to critical with an assigned staff member
    if body.urgency_level == "critical" and old_urgency != "critical" and req.assigned_staff_id:
        staff = db.query(User).filter(User.id == req.assigned_staff_id).first()
        if staff:
            try:
                await notify_dispatch(req, staff, db)
            except Exception as exc:
                logger.warning("Twilio re-trigger failed for request %s: %s", request_id, exc)

    return req


@router.get("/admin/notifications/log")
def get_notification_log(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    request_id: Optional[str] = None,
    notification_status: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Return paginated notification log with optional filters (admin only)."""
    query = db.query(NotificationLog)

    if request_id is not None:
        query = query.filter(NotificationLog.request_id == request_id)
    if notification_status is not None:
        query = query.filter(NotificationLog.status == notification_status)

    total = query.count()

    notifications = (
        query
        .order_by(NotificationLog.sent_at.desc().nullslast(), NotificationLog.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "notifications": [NotificationLogResponse.model_validate(n) for n in notifications],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
