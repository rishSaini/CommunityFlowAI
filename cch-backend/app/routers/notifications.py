"""Notification management endpoints — SMS sending, templates, log.

Provides admin-facing SMS tools and the notification audit trail.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import NotificationLogResponse
from app.models.tables import NotificationLog
from app.services.twilio_service import (
    get_templates,
    render_template,
    send_sms_direct,
    send_partner_reminder,
    send_partner_status_update,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])


# ── Schemas ──────────────────────────────────────────────────

class SendSMSRequest(BaseModel):
    to_phone: str
    message: str
    recipient_name: str = "Manual"
    request_id: Optional[str] = None


class TestSMSRequest(BaseModel):
    to_phone: str


class SendSMSResponse(BaseModel):
    success: bool
    sid: Optional[str] = None
    error: Optional[str] = None
    message_preview: str = ""


class TemplateResponse(BaseModel):
    key: str
    template: str
    description: str


# ── Send ad-hoc SMS (admin) ──────────────────────────────────

@router.post("/notifications/send-sms", response_model=SendSMSResponse)
def admin_send_sms(
    body: SendSMSRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Send an ad-hoc SMS to any phone number (admin only)."""
    result = send_sms_direct(
        to_phone=body.to_phone,
        message_body=body.message,
        db=db,
        request_id=body.request_id,
        recipient_name=body.recipient_name,
    )
    return SendSMSResponse(
        success=result["success"],
        sid=result.get("sid"),
        error=result.get("error"),
        message_preview=body.message[:100],
    )


# ── Send test SMS (admin) ────────────────────────────────────

@router.post("/notifications/test", response_model=SendSMSResponse)
def admin_send_test(
    body: TestSMSRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Send a test confirmation SMS to verify Twilio integration."""
    test_message = (
        "CCH Test: Twilio integration is working! "
        "This is a test message from the CCH Ordering & Dispatch System. "
        "SMS notifications are active."
    )
    result = send_sms_direct(
        to_phone=body.to_phone,
        message_body=test_message,
        db=db,
        recipient_name="Test",
    )
    return SendSMSResponse(
        success=result["success"],
        sid=result.get("sid"),
        error=result.get("error"),
        message_preview=test_message,
    )


# ── Get message templates ────────────────────────────────────

TEMPLATE_DESCRIPTIONS = {
    "staff_dispatch": "Sent to staff when assigned to a request (HIGH/CRITICAL urgency)",
    "staff_dispatch_queued": "Queued for off-shift staff — delivered at next shift start",
    "staff_dispatch_voice": "TwiML voice call for CRITICAL urgency assignments",
    "partner_confirmation": "Sent to partner immediately after form submission",
    "partner_reminder": "Sent to partner 3 days and 1 day before their event",
    "partner_status_update": "Sent to partner when request status changes",
}


@router.get("/notifications/templates")
def list_templates(
    _admin=Depends(get_current_admin),
):
    """Return all default message templates with descriptions."""
    templates = get_templates()
    return [
        TemplateResponse(
            key=key,
            template=tpl,
            description=TEMPLATE_DESCRIPTIONS.get(key, ""),
        )
        for key, tpl in templates.items()
    ]


# ── Notification log (with enhanced filters) ─────────────────

@router.get("/notifications/log")
def get_notification_log(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    request_id: Optional[str] = None,
    notification_status: Optional[str] = None,
    channel: Optional[str] = None,
    urgency_level: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Return paginated notification log with filters (admin only)."""
    query = db.query(NotificationLog)

    if request_id:
        query = query.filter(NotificationLog.request_id == request_id)
    if notification_status:
        query = query.filter(NotificationLog.status == notification_status)
    if channel:
        query = query.filter(NotificationLog.channel == channel)
    if urgency_level:
        query = query.filter(NotificationLog.urgency_level == urgency_level)
    if search:
        query = query.filter(
            NotificationLog.recipient_name.ilike(f"%{search}%")
            | NotificationLog.recipient_phone.ilike(f"%{search}%")
            | NotificationLog.message_body.ilike(f"%{search}%")
        )

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
