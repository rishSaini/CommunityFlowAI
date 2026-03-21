"""Direct messaging between community partners and assigned staff.

Partners see conversations for their own requests.
Staff see conversations for requests assigned to them.
Admins see all conversations.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.auth import get_current_user
from app.models.database import get_db
from app.models.tables import PartnerMessage, Request, User, RequestAssignment
from app.models.schemas import MessageCreate, MessageResponse, ChannelResponse
from app.services.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["messages"])


# ── List Channels ─────────────────────────────────────────────────────────

@router.get("/messages/channels", response_model=list[ChannelResponse])
def list_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat channels visible to the current user.

    - Partners see channels for requests where they are the requestor.
    - Staff see channels for requests assigned to them.
    - Admins see all channels.
    """
    if current_user.role == "admin":
        # Admin sees all requests that have messages OR are dispatched
        requests = (
            db.query(Request)
            .filter(Request.status.in_([
                "dispatched", "in_progress", "fulfilled", "approved",
            ]))
            .order_by(desc(Request.updated_at))
            .limit(50)
            .all()
        )
    elif current_user.role == "partner":
        # Partner sees requests they submitted (matched by email)
        requests = (
            db.query(Request)
            .filter(Request.requestor_email == current_user.email)
            .order_by(desc(Request.created_at))
            .all()
        )
    else:
        # Staff sees requests assigned to them
        assigned_ids = (
            db.query(RequestAssignment.request_id)
            .filter(RequestAssignment.user_id == current_user.id)
            .scalar_subquery()
        )
        requests = (
            db.query(Request)
            .filter(
                (Request.assigned_staff_id == current_user.id)
                | Request.id.in_(assigned_ids)
            )
            .order_by(desc(Request.updated_at))
            .all()
        )

    channels = []
    for req in requests:
        # Get last message
        last_msg = (
            db.query(PartnerMessage)
            .filter(PartnerMessage.request_id == req.id)
            .order_by(desc(PartnerMessage.created_at))
            .first()
        )

        # Count unread messages (messages not sent by current user, not yet read)
        unread = (
            db.query(PartnerMessage)
            .filter(
                PartnerMessage.request_id == req.id,
                PartnerMessage.sender_id != current_user.id,
                PartnerMessage.read_at.is_(None),
            )
            .count()
        )

        # Get partner user (by email match)
        partner_user = (
            db.query(User)
            .filter(User.email == req.requestor_email, User.role == "partner")
            .first()
        )

        # Get assigned staff
        staff_user = None
        if req.assigned_staff_id:
            staff_user = db.query(User).filter(User.id == req.assigned_staff_id).first()

        channels.append(ChannelResponse(
            request_id=req.id,
            event_name=req.event_name,
            event_date=req.event_date,
            event_city=req.event_city,
            partner_name=req.requestor_name,
            partner_id=partner_user.id if partner_user else "",
            staff_name=staff_user.full_name if staff_user else None,
            staff_id=staff_user.id if staff_user else None,
            last_message=last_msg.content[:100] if last_msg else None,
            last_message_at=last_msg.created_at if last_msg else None,
            unread_count=unread,
            status=req.status,
        ))

    return channels


# ── Get Messages ──────────────────────────────────────────────────────────

@router.get("/messages/{request_id}", response_model=list[MessageResponse])
def get_messages(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages for a request's chat channel."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Authorization check
    if current_user.role == "partner":
        if req.requestor_email != current_user.email:
            raise HTTPException(status_code=403, detail="Not your request")
    elif current_user.role == "staff":
        # Staff can see if assigned
        is_assigned = req.assigned_staff_id == current_user.id
        has_assignment = (
            db.query(RequestAssignment)
            .filter(
                RequestAssignment.request_id == request_id,
                RequestAssignment.user_id == current_user.id,
            )
            .first()
        )
        if not is_assigned and not has_assignment:
            raise HTTPException(status_code=403, detail="Not assigned to this request")

    messages = (
        db.query(PartnerMessage)
        .filter(PartnerMessage.request_id == request_id)
        .order_by(PartnerMessage.created_at)
        .all()
    )

    # Mark messages from others as read
    now = datetime.now(timezone.utc)
    for msg in messages:
        if msg.sender_id != current_user.id and msg.read_at is None:
            msg.read_at = now
    db.commit()

    return messages


# ── Send Message ──────────────────────────────────────────────────────────

@router.post("/messages/{request_id}", response_model=MessageResponse)
async def send_message(
    request_id: str,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message in a request's chat channel."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Authorization
    if current_user.role == "partner":
        if req.requestor_email != current_user.email:
            raise HTTPException(status_code=403, detail="Not your request")
    elif current_user.role == "staff":
        is_assigned = req.assigned_staff_id == current_user.id
        has_assignment = (
            db.query(RequestAssignment)
            .filter(
                RequestAssignment.request_id == request_id,
                RequestAssignment.user_id == current_user.id,
            )
            .first()
        )
        if not is_assigned and not has_assignment:
            raise HTTPException(status_code=403, detail="Not assigned to this request")

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = PartnerMessage(
        request_id=request_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_role=current_user.role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Broadcast to connected WebSocket clients
    await manager.broadcast({
        "type": "new_message",
        "request_id": request_id,
        "sender": current_user.full_name,
    })

    return msg
