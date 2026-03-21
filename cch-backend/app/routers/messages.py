"""Partner ↔ Staff direct messaging router.

Source of truth: core.md §16 — partner messages
"""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.models.database import get_db
from app.models.schemas import ChannelResponse, MessageCreate, MessageResponse
from app.models.tables import PartnerMessage, Request, User
from app.services.ws_manager import manager

router = APIRouter(prefix="/messages", tags=["messages"])


# ── Send a message ────────────────────────────────────────────────────────────

@router.post("/{request_id}", response_model=MessageResponse)
async def send_message(
    request_id: str,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message in a request's channel (partner, staff, or admin)."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Partners can only message on their own requests
    if current_user.role == "partner" and req.requestor_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not your request")

    msg = PartnerMessage(
        id=str(uuid4()),
        request_id=request_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name or current_user.email,
        sender_role=current_user.role,
        content=body.content,
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


# ── List messages for a request ───────────────────────────────────────────────

@router.get("/{request_id}", response_model=list[MessageResponse])
def get_messages(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all messages for a request channel."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if current_user.role == "partner" and req.requestor_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not your request")

    msgs = (
        db.query(PartnerMessage)
        .filter(PartnerMessage.request_id == request_id)
        .order_by(PartnerMessage.created_at.asc())
        .all()
    )

    # Mark unread messages as read
    now = datetime.now(timezone.utc)
    for m in msgs:
        if m.read_at is None and m.sender_id != current_user.id:
            m.read_at = now
    db.commit()

    return msgs


# ── List channels (admin / staff) ─────────────────────────────────────────────

@router.get("/channels/list", response_model=list[ChannelResponse])
def list_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all message channels visible to the current user."""
    if current_user.role == "partner":
        reqs = db.query(Request).filter(
            Request.requestor_email == current_user.email
        ).all()
    else:
        reqs = db.query(Request).all()

    channels = []
    for req in reqs:
        last_msg = (
            db.query(PartnerMessage)
            .filter(PartnerMessage.request_id == req.id)
            .order_by(PartnerMessage.created_at.desc())
            .first()
        )
        unread = (
            db.query(PartnerMessage)
            .filter(
                PartnerMessage.request_id == req.id,
                PartnerMessage.read_at.is_(None),
                PartnerMessage.sender_id != current_user.id,
            )
            .count()
        )

        # Resolve assigned staff name
        staff_name = None
        if req.assigned_staff_id:
            staff = db.query(User).filter(User.id == req.assigned_staff_id).first()
            staff_name = staff.full_name if staff else None

        channels.append(
            ChannelResponse(
                request_id=req.id,
                event_name=req.event_name or "",
                event_date=req.event_date,
                event_city=req.event_city or "",
                partner_name=req.requestor_name or "",
                partner_id=req.requestor_email or "",
                staff_name=staff_name,
                staff_id=req.assigned_staff_id,
                last_message=last_msg.content if last_msg else None,
                last_message_at=last_msg.created_at if last_msg else None,
                unread_count=unread,
                status=req.status,
            )
        )

    return channels
