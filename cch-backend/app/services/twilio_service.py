"""Schedule-aware Twilio SMS/Voice notification service.

Source of truth: core.md §8, §12 — PHASE_7

Entry point: notify_dispatch(request, staff_user, db)
  Called from dispatch.py after a successful assignment.

Partner-facing:
  send_partner_confirmation(request, db) — on form submit
  send_partner_reminder(request, db)     — before event date

Notification rules by urgency:
  low/medium  → in-app only (no Twilio)
  high        → SMS if on-shift, queue otherwise
  critical    → SMS + Voice if on-shift, queue otherwise
  OUTSIDE_HELP → never notified
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Callable, Optional
from uuid import uuid4

from sqlalchemy.orm import Session
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from app.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
from app.models.tables import NotificationLog, Request, User
from app.services.schedule_service import (
    has_exception_today,
    is_in_on_call_rotation,
    is_on_shift_now,
)

logger = logging.getLogger(__name__)

# Initialise Twilio client — None if credentials are missing (dev/test)
_twilio_client: Client | None = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as exc:
        logger.warning("Twilio client init failed: %s", exc)


# ── Message Templates ────────────────────────────────────────────────────────

TEMPLATES = {
    "staff_dispatch": (
        "CCH Dispatch: You've been assigned to '{event_name}' on {event_date}. "
        "Check your Job Brief for full details and travel info."
    ),
    "staff_dispatch_queued": (
        "CCH Dispatch (queued): You've been assigned to '{event_name}' "
        "on {event_date}. Check your Job Brief for details."
    ),
    "staff_dispatch_voice": (
        "<Response><Say voice='alice'>"
        "This is an urgent message from Children's Community Health. "
        "You have a critical dispatch assignment for {event_name} "
        "on {event_date}. "
        "Please check your job brief immediately."
        "</Say></Response>"
    ),
    "partner_confirmation": (
        "CCH: Your request for '{event_name}' on {event_date} in {event_city} "
        "has been received! Priority score: {priority}. "
        "Track status: {tracker_url} — We'll keep you updated via text."
    ),
    "partner_reminder": (
        "CCH Reminder: Your event '{event_name}' is in {days_until} day(s) "
        "({event_date}). {fulfillment_note} "
        "Questions? Reply HELP or call (801) 953-8037."
    ),
    "partner_status_update": (
        "CCH Update: Your request '{event_name}' status changed to: {status}. "
        "{detail}"
    ),
}


def get_templates() -> dict[str, str]:
    """Return all message templates."""
    return dict(TEMPLATES)


def render_template(template_key: str, **kwargs: str) -> str:
    """Render a message template with the given variables."""
    tpl = TEMPLATES.get(template_key, "")
    try:
        return tpl.format(**kwargs)
    except KeyError:
        return tpl


# ── Schedule gate ─────────────────────────────────────────────────────────────

def should_notify(user: User, urgency_level: str) -> bool:
    """Return True if this user should receive an immediate Twilio notification."""
    if user.classification == "OUTSIDE_HELP":
        return False
    if not user.is_on_duty:
        return False
    if has_exception_today(user, "off"):
        return False
    if is_on_shift_now(user):
        return True
    if user.classification == "ON_CALL" and is_in_on_call_rotation(user):
        return True
    return False


# ── Notification log ──────────────────────────────────────────────────────────

def _log_notification(
    db: Session,
    request_id: Optional[str],
    phone: str,
    name: str,
    channel: str,
    message: str,
    twilio_sid: str | None,
    log_status: str,
    urgency_level: str = "low",
    queued_until: datetime | None = None,
) -> None:
    """Write one row to notification_log."""
    entry = NotificationLog(
        id=str(uuid4()),
        request_id=request_id,
        recipient_phone=phone,
        recipient_name=name,
        channel=channel,
        urgency_level=urgency_level,
        message_body=message,
        twilio_sid=twilio_sid,
        sent_at=datetime.now(timezone.utc) if log_status in ("sent", "failed") else None,
        status=log_status,
        queued_until=queued_until,
    )
    db.add(entry)
    db.commit()


def _log_notification_user(
    db: Session,
    request_id: str,
    user: User,
    channel: str,
    message: str,
    twilio_sid: str | None,
    log_status: str,
    urgency_level: str = "low",
    queued_until: datetime | None = None,
) -> None:
    """Convenience wrapper using a User object."""
    _log_notification(
        db, request_id, user.phone or "", user.full_name or "",
        channel, message, twilio_sid, log_status, urgency_level, queued_until,
    )


# ── Generic SMS sender ───────────────────────────────────────────────────────

def send_sms_direct(
    to_phone: str,
    message_body: str,
    db: Session,
    request_id: Optional[str] = None,
    recipient_name: str = "Unknown",
    urgency_level: str = "low",
) -> dict:
    """Send an SMS to any phone number. Returns {success, sid, error}."""
    if not _twilio_client:
        logger.warning("Twilio not configured — skipping SMS to %s", to_phone)
        return {"success": False, "sid": None, "error": "Twilio not configured"}

    if not to_phone:
        return {"success": False, "sid": None, "error": "No phone number provided"}

    try:
        msg = _twilio_client.messages.create(
            to=to_phone,
            from_=TWILIO_PHONE_NUMBER,
            body=message_body,
        )
        _log_notification(
            db, request_id, to_phone, recipient_name,
            "sms", message_body, msg.sid, "sent", urgency_level,
        )
        logger.info("SMS sent to %s (SID %s)", to_phone, msg.sid)
        return {"success": True, "sid": msg.sid, "error": None}
    except TwilioRestException as exc:
        _log_notification(
            db, request_id, to_phone, recipient_name,
            "sms", message_body, None, "failed", urgency_level,
        )
        logger.error("SMS failed for %s: %s", to_phone, exc)
        return {"success": False, "sid": None, "error": str(exc)}


# ── Staff SMS ─────────────────────────────────────────────────────────────────

def _send_sms_sync(user: User, request: Request, db: Session) -> bool:
    """Send dispatch SMS to a staff member. Returns True on success."""
    if not _twilio_client or not user.phone:
        logger.warning("Skipping SMS — client=%s phone=%s", bool(_twilio_client), user.phone)
        return False

    message_body = render_template(
        "staff_dispatch",
        event_name=request.event_name or "Unnamed Event",
        event_date=str(request.event_date or "TBD"),
    )

    result = send_sms_direct(
        to_phone=user.phone,
        message_body=message_body,
        db=db,
        request_id=request.id,
        recipient_name=user.full_name or "Staff",
        urgency_level=request.urgency_level or "low",
    )
    return result["success"]


# ── Staff Voice ───────────────────────────────────────────────────────────────

def _send_voice_sync(user: User, request: Request, db: Session) -> bool:
    """Place a voice call via Twilio TwiML (blocking). Returns True on success."""
    if not _twilio_client or not user.phone:
        return False

    twiml = render_template(
        "staff_dispatch_voice",
        event_name=request.event_name or "Unnamed Event",
        event_date=str(request.event_date or "TBD"),
    )

    try:
        call = _twilio_client.calls.create(
            to=user.phone,
            from_=TWILIO_PHONE_NUMBER,
            twiml=twiml,
        )
        _log_notification_user(
            db, request.id, user, "voice", twiml,
            call.sid, "sent", request.urgency_level or "critical",
        )
        logger.info("Voice call placed to %s (SID %s)", user.phone, call.sid)
        return True
    except TwilioRestException as exc:
        _log_notification_user(
            db, request.id, user, "voice", twiml,
            None, "failed", request.urgency_level or "critical",
        )
        logger.error("Voice call failed for %s: %s", user.phone, exc)
        return False


# ── Queue ─────────────────────────────────────────────────────────────────────

def _queue_notification(user: User, request: Request, db: Session) -> None:
    """Store a queued notification for off-shift delivery."""
    message_body = render_template(
        "staff_dispatch_queued",
        event_name=request.event_name or "Unnamed Event",
        event_date=str(request.event_date or "TBD"),
    )

    _log_notification_user(
        db, request.id, user, "sms", message_body,
        None, "queued", request.urgency_level or "low",
    )

    queue = list(user.notification_queue or [])
    queue.append({
        "request_id": request.id,
        "message": message_body,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    })
    user.notification_queue = queue
    db.commit()

    logger.info("Notification queued for off-shift user %s (request %s)", user.id, request.id)


# ── Partner Confirmation SMS ──────────────────────────────────────────────────

def send_partner_confirmation(request: Request, db: Session) -> dict:
    """Send confirmation SMS to the partner who submitted the request."""
    if not request.requestor_phone:
        logger.info("No partner phone for request %s — skipping confirmation SMS", request.id)
        return {"success": False, "error": "No phone number"}

    tracker_url = f"cch.utah.gov/track/{request.status_tracker_token}" if request.status_tracker_token else "N/A"
    priority = int(request.ai_priority_score) if request.ai_priority_score else "Pending"

    message_body = render_template(
        "partner_confirmation",
        event_name=request.event_name or "your event",
        event_date=str(request.event_date or "TBD"),
        event_city=request.event_city or "Utah",
        priority=str(priority),
        tracker_url=tracker_url,
    )

    return send_sms_direct(
        to_phone=request.requestor_phone,
        message_body=message_body,
        db=db,
        request_id=request.id,
        recipient_name=request.requestor_name or "Partner",
        urgency_level="low",
    )


# ── Partner Reminder SMS ─────────────────────────────────────────────────────

def send_partner_reminder(request: Request, days_until: int, db: Session) -> dict:
    """Send reminder SMS to the partner before their event."""
    if not request.requestor_phone:
        return {"success": False, "error": "No phone number"}

    ft = request.fulfillment_type or "mail"
    fulfillment_notes = {
        "staff": "Our team is confirmed to attend on-site.",
        "mail": "Your materials kit is being prepared for delivery.",
        "pickup": "Your materials will be ready for pickup.",
    }

    message_body = render_template(
        "partner_reminder",
        event_name=request.event_name or "your event",
        days_until=str(days_until),
        event_date=str(request.event_date or "TBD"),
        fulfillment_note=fulfillment_notes.get(ft, ""),
    )

    return send_sms_direct(
        to_phone=request.requestor_phone,
        message_body=message_body,
        db=db,
        request_id=request.id,
        recipient_name=request.requestor_name or "Partner",
        urgency_level="low",
    )


# ── Partner Status Update SMS ────────────────────────────────────────────────

def send_partner_status_update(request: Request, new_status: str, db: Session) -> dict:
    """Notify partner via SMS when their request status changes."""
    if not request.requestor_phone:
        return {"success": False, "error": "No phone number"}

    status_details = {
        "in_review": "An admin is reviewing your submission.",
        "approved": "Your request has been approved and is being scheduled!",
        "dispatched": "A staff member has been assigned to your event.",
        "in_progress": "Your request is actively being fulfilled.",
        "fulfilled": "Your request has been completed. Thank you for partnering with CCH!",
        "cancelled": "Your request has been cancelled. Contact us with questions.",
    }

    message_body = render_template(
        "partner_status_update",
        event_name=request.event_name or "your event",
        status=new_status.replace("_", " ").title(),
        detail=status_details.get(new_status, ""),
    )

    return send_sms_direct(
        to_phone=request.requestor_phone,
        message_body=message_body,
        db=db,
        request_id=request.id,
        recipient_name=request.requestor_name or "Partner",
        urgency_level="low",
    )


# ── Escalation chain ─────────────────────────────────────────────────────────

async def schedule_escalation_chain(
    request_id: str,
    staff_id: str,
    session_factory: Callable,
) -> None:
    """Background task: T+15min voice to staff, T+30min SMS to all on-shift admins."""
    _ABORT_STATUSES = {"fulfilled", "cancelled"}

    await asyncio.sleep(900)
    try:
        db = session_factory()
        try:
            req = db.query(Request).filter(Request.id == request_id).first()
            if not req or req.status in _ABORT_STATUSES:
                return
            if (req.urgency_level or "low").lower() != "critical":
                return
            staff = db.query(User).filter(User.id == staff_id).first()
            if staff:
                _send_voice_sync(staff, req, db)
        finally:
            db.close()
    except Exception as exc:
        logger.error("Escalation chain T+15 error for request %s: %s", request_id, exc)

    await asyncio.sleep(900)
    try:
        db = session_factory()
        try:
            req = db.query(Request).filter(Request.id == request_id).first()
            if not req or req.status in _ABORT_STATUSES:
                return
            if (req.urgency_level or "low").lower() != "critical":
                return
            admins = (
                db.query(User)
                .filter(User.role == "admin", User.is_on_duty.is_(True), User.is_active.is_(True))
                .all()
            )
            for admin in admins:
                if admin.phone:
                    _send_sms_sync(admin, req, db)
        finally:
            db.close()
    except Exception as exc:
        logger.error("Escalation chain T+30 error for request %s: %s", request_id, exc)


# ── Public entry point ────────────────────────────────────────────────────────

async def notify_dispatch(request: Request, staff_user: User, db: Session) -> None:
    """Notify the assigned staff member about their dispatch.

    Called from dispatch.py after a successful assignment + db.commit().
    Never raises — all errors are logged and the dispatch is never blocked.
    """
    from app.models.database import SessionLocal

    urgency = (request.urgency_level or "low").lower()

    if urgency not in ("high", "critical"):
        return

    if not staff_user.phone:
        logger.warning("No phone for staff %s — skipping notification", staff_user.id)
        return

    try:
        if should_notify(staff_user, urgency):
            await asyncio.to_thread(_send_sms_sync, staff_user, request, db)
            if urgency == "critical":
                asyncio.create_task(
                    schedule_escalation_chain(request.id, staff_user.id, SessionLocal)
                )
        else:
            _queue_notification(staff_user, request, db)

        request.twilio_notified = True
        db.commit()

    except Exception as exc:
        logger.error("notify_dispatch error for request %s: %s", request.id, exc)
