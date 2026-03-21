"""Admin-only management endpoints.

Source of truth: core.md §2.4
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import NotificationLogResponse, RequestResponse
from app.models.tables import NotificationLog, Request

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
