"""Schedule-aware Twilio SMS/Voice notification service.

Source of truth: core.md §8, §12 — PHASE_7

Entry point: notify_dispatch(request, staff_user, db)
  Called from dispatch.py after a successful assignment.

Notification rules by urgency:
  low/medium  → in-app only (no Twilio)
  high        → SMS if on-shift, queue otherwise
  critical    → SMS + Voice if on-shift, queue otherwise
  OUTSIDE_HELP → never notified
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Callable
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


# ── Schedule gate ─────────────────────────────────────────────────────────────

def should_notify(user: User, urgency_level: str) -> bool:
    """Return True if this user should receive an immediate Twilio notification.

    Returns False (queue) if the user is off-shift. Returns False (never) if
    the user is OUTSIDE_HELP or not on duty.
    """
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
    return False  # off-shift → caller should queue instead


# ── Notification log ──────────────────────────────────────────────────────────

def _log_notification(
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
    """Write one row to notification_log."""
    entry = NotificationLog(
        id=str(uuid4()),
        request_id=request_id,
        recipient_phone=user.phone,
        recipient_name=user.full_name,
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


# ── SMS ───────────────────────────────────────────────────────────────────────

def _send_sms_sync(user: User, request: Request, db: Session) -> bool:
    """Send an SMS via Twilio (blocking). Returns True on success."""
    if not _twilio_client:
        logger.warning("Twilio not configured — skipping SMS to %s", user.phone)
        return False

    if not user.phone:
        logger.warning("Staff %s has no phone number — skipping SMS", user.id)
        return False

    message_body = (
        f"CCH Dispatch: You have been assigned to '{request.event_name}' "
        f"on {request.event_date}. "
        f"Check your Job Brief for full details and travel info."
    )

    try:
        msg = _twilio_client.messages.create(
            to=user.phone,
            from_=TWILIO_PHONE_NUMBER,
            body=message_body,
        )
        _log_notification(
            db, request.id, user, "sms", message_body,
            msg.sid, "sent", request.urgency_level or "low",
        )
        logger.info("SMS sent to %s (SID %s)", user.phone, msg.sid)
        return True
    except TwilioRestException as exc:
        _log_notification(
            db, request.id, user, "sms", message_body,
            None, "failed", request.urgency_level or "low",
        )
        logger.error("SMS failed for %s: %s", user.phone, exc)
        return False


# ── Voice ─────────────────────────────────────────────────────────────────────

def _send_voice_sync(user: User, request: Request, db: Session) -> bool:
    """Place a voice call via Twilio TwiML (blocking). Returns True on success."""
    if not _twilio_client:
        logger.warning("Twilio not configured — skipping voice call to %s", user.phone)
        return False

    if not user.phone:
        logger.warning("Staff %s has no phone number — skipping voice", user.id)
        return False

    twiml = (
        "<Response>"
        "<Say voice='alice'>"
        f"This is an urgent message from Children's Community Health. "
        f"You have a critical dispatch assignment for {request.event_name} "
        f"on {request.event_date}. "
        f"Please check your job brief immediately."
        "</Say>"
        "</Response>"
    )

    try:
        call = _twilio_client.calls.create(
            to=user.phone,
            from_=TWILIO_PHONE_NUMBER,
            twiml=twiml,
        )
        _log_notification(
            db, request.id, user, "voice", twiml,
            call.sid, "sent", request.urgency_level or "critical",
        )
        logger.info("Voice call placed to %s (SID %s)", user.phone, call.sid)
        return True
    except TwilioRestException as exc:
        _log_notification(
            db, request.id, user, "voice", twiml,
            None, "failed", request.urgency_level or "critical",
        )
        logger.error("Voice call failed for %s: %s", user.phone, exc)
        return False


# ── Queue ─────────────────────────────────────────────────────────────────────

def _queue_notification(user: User, request: Request, db: Session) -> None:
    """Store a queued notification for off-shift delivery."""
    message_body = (
        f"CCH Dispatch (queued): You have been assigned to '{request.event_name}' "
        f"on {request.event_date}. Check your Job Brief for details."
    )

    _log_notification(
        db, request.id, user, "sms", message_body,
        None, "queued", request.urgency_level or "low",
    )

    # Append to user.notification_queue so the frontend can surface it
    queue = list(user.notification_queue or [])
    queue.append({
        "request_id": request.id,
        "message": message_body,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    })
    user.notification_queue = queue
    db.commit()

    logger.info(
        "Notification queued for off-shift user %s (request %s)",
        user.id, request.id,
    )


# ── Escalation chain ──────────────────────────────────────────────────────────

async def schedule_escalation_chain(
    request_id: str,
    staff_id: str,
    session_factory: Callable,
) -> None:
    """Background task: T+15min voice to staff, T+30min SMS to all on-shift admins.

    Uses a fresh DB session (the original request-scoped session is closed by
    the time the sleeps complete).  Aborts early if the request is resolved or
    urgency is no longer critical.
    """
    _ABORT_STATUSES = {"fulfilled", "cancelled"}

    # ── T+15min: voice call to assigned staff ─────────────────────────────────
    await asyncio.sleep(900)
    try:
        db = session_factory()
        try:
            req = db.query(Request).filter(Request.id == request_id).first()
            if not req or req.status in _ABORT_STATUSES:
                logger.info("Escalation chain aborted at T+15 (request %s resolved)", request_id)
                return
            if (req.urgency_level or "low").lower() != "critical":
                logger.info("Escalation chain aborted at T+15 (urgency changed for %s)", request_id)
                return

            staff = db.query(User).filter(User.id == staff_id).first()
            if staff:
                _send_voice_sync(staff, req, db)
        finally:
            db.close()
    except Exception as exc:
        logger.error("Escalation chain T+15 error for request %s: %s", request_id, exc)

    # ── T+30min: SMS to all on-shift admins ───────────────────────────────────
    await asyncio.sleep(900)  # another 15 min (total 30 from dispatch)
    try:
        db = session_factory()
        try:
            req = db.query(Request).filter(Request.id == request_id).first()
            if not req or req.status in _ABORT_STATUSES:
                logger.info("Escalation chain aborted at T+30 (request %s resolved)", request_id)
                return
            if (req.urgency_level or "low").lower() != "critical":
                logger.info("Escalation chain aborted at T+30 (urgency changed for %s)", request_id)
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

    CRITICAL urgency launches a background escalation chain:
      T+0   SMS to staff (here)
      T+15m voice call to staff
      T+30m SMS to all on-shift admins
    """
    from app.models.database import SessionLocal  # local import avoids circular dep

    urgency = (request.urgency_level or "low").lower()

    # LOW and MEDIUM are in-app only — no Twilio
    if urgency not in ("high", "critical"):
        return

    if not staff_user.phone:
        logger.warning(
            "No phone for staff %s — skipping notification (request %s)",
            staff_user.id, request.id,
        )
        return

    try:
        if should_notify(staff_user, urgency):
            # Send SMS for HIGH and CRITICAL
            await asyncio.to_thread(_send_sms_sync, staff_user, request, db)

            # CRITICAL: launch time-based escalation chain (voice at T+15, admin SMS at T+30)
            if urgency == "critical":
                asyncio.create_task(
                    schedule_escalation_chain(request.id, staff_user.id, SessionLocal)
                )
        else:
            # Off-shift → queue for next shift start
            _queue_notification(staff_user, request, db)

        # Mark request as Twilio-notified (or queued)
        request.twilio_notified = True
        db.commit()

    except Exception as exc:
        logger.error(
            "notify_dispatch error for request %s: %s", request.id, exc
        )
