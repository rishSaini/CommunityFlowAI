"""Request submission and management routes.

Source of truth: core.md §6, §11, §14.2 — PHASE_2
Public endpoints: POST /requests, GET /requests/status/{token}
Authenticated endpoints: GET /requests, GET /requests/{request_id},
                         PATCH /requests/{request_id}/status
"""
import asyncio
import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.auth import get_current_user
from app.models.database import get_db
from app.models.enums import FulfillmentType, Status, UrgencyLevel, URGENCY_COLORS
from app.models.schemas import (
    RequestCreate,
    RequestListResponse,
    RequestResponse,
    RequestAssignmentResponse,
    ShareRequest,
    StatusTrackerResponse,
    StatusUpdateRequest,
)
from sqlalchemy import or_
from app.models.tables import Request, RequestAssignment, ServiceAreaZip, User
from app.services.ai_service import classify_request
from app.services.geo_service import assign_nearest_location, geocode_address
from app.services.twilio_service import send_partner_confirmation, send_partner_status_update
from app.services.ws_manager import manager
from app.utils.tokens import generate_status_token
from app.utils.utah_validator import validate_coordinates, validate_zip

router = APIRouter(tags=["requests"])


# ── Public: Status Tracker ────────────────────────────────────
# Defined FIRST to avoid route conflict with /requests/{request_id}


@router.get("/requests/status/{token}", response_model=StatusTrackerResponse)
def get_request_status_by_token(token: str, db: Session = Depends(get_db)):
    """Public status lookup by tracker token (no auth required)."""
    request = (
        db.query(Request)
        .filter(Request.status_tracker_token == token)
        .first()
    )
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Resolve assigned staff first name if dispatched
    assigned_staff_first_name: Optional[str] = None
    if request.assigned_staff_id:
        staff = db.query(User).filter(User.id == request.assigned_staff_id).first()
        if staff and staff.full_name:
            assigned_staff_first_name = staff.full_name.split()[0]

    # Map urgency level to colour — fall back to low colour for unknown levels
    urgency_key = request.urgency_level or "low"
    try:
        urgency_enum = UrgencyLevel(urgency_key)
    except ValueError:
        urgency_enum = UrgencyLevel.LOW
    urgency_color = URGENCY_COLORS.get(urgency_enum, URGENCY_COLORS[UrgencyLevel.LOW])

    return StatusTrackerResponse(
        status=request.status,
        event_name=request.event_name,
        event_date=request.event_date,
        urgency_color=urgency_color,
        assigned_staff_first_name=assigned_staff_first_name,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


# ── Public: Submit Request ────────────────────────────────────


@router.post("/requests", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(body: RequestCreate, db: Session = Depends(get_db)):
    """Submit a new community health request (no auth required)."""

    # Validate fulfillment_type
    valid_fulfillment_types = {ft.value for ft in FulfillmentType}
    if body.fulfillment_type not in valid_fulfillment_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid fulfillment_type. Must be one of: {', '.join(valid_fulfillment_types)}",
        )

    # Validate Utah zip code
    if not validate_zip(body.event_zip):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Utah zip code. Must be 84xxx format.",
        )

    # Validate event date is in the future
    if body.event_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event date must be in the future.",
        )

    # Validate mailing address for mail fulfillment
    if body.fulfillment_type == "mail" and body.mailing_address is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mailing address required for mail fulfillment.",
        )

    # Geocode event location
    event_lat: Optional[float] = None
    event_lng: Optional[float] = None
    assigned_location_id: Optional[str] = None

    coords = geocode_address(body.event_city, body.event_zip, body.event_address)
    if coords is not None:
        event_lat, event_lng = coords

        # Validate geocoded coordinates are within Utah
        if not validate_coordinates(event_lat, event_lng):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Geocoded coordinates are outside Utah bounds.",
            )

        # Assign nearest CCH location
        assigned_location_id = assign_nearest_location(event_lat, event_lng, db)

    # ── AI Classification (Phase 4) ─────────────────────────────
    # Lookup equity score for this zip from service_area_zips
    service_zip = db.query(ServiceAreaZip).filter(
        ServiceAreaZip.zip_code == body.event_zip
    ).first()
    equity_score = service_zip.equity_score if service_zip else 50.0

    # Determine requestor history from prior submission count
    prior_count = db.query(Request).filter(
        Request.requestor_email == body.requestor_email
    ).count()
    requestor_history = (
        "first-time" if prior_count == 0
        else "frequent" if prior_count > 3
        else "returning"
    )

    # Run master AI classification (never raises — falls back to deterministic scoring)
    ai_result = await classify_request({
        **body.model_dump(),
        "equity_score": equity_score,
        "requestor_history": requestor_history,
    })

    # Generate status tracker token
    token = generate_status_token()

    # Build ORM object
    new_request = Request(
        status="submitted",
        fulfillment_type=body.fulfillment_type,
        urgency_level=ai_result.get("urgency_level", "low"),
        requestor_name=body.requestor_name,
        requestor_email=body.requestor_email,
        requestor_phone=body.requestor_phone,
        event_name=body.event_name,
        event_date=body.event_date,
        event_time=body.event_time,
        event_address=body.event_address,
        event_city=body.event_city,
        event_zip=body.event_zip,
        event_lat=event_lat,
        event_lng=event_lng,
        mailing_address=body.mailing_address,
        estimated_attendees=body.estimated_attendees,
        materials_requested=body.materials_requested,
        special_instructions=body.special_instructions,
        alt_contact=body.alt_contact,
        assigned_location_id=assigned_location_id,
        status_tracker_token=token,
        ai_classification=ai_result,
        ai_priority_score=ai_result.get("ai_priority_score"),
        priority_justification=ai_result.get("priority_justification"),
        ai_summary=ai_result.get("summary"),
        ai_tags=ai_result.get("tags"),
        ai_flags=ai_result.get("flags"),
        ai_urgency={
            "level": ai_result.get("urgency_level"),
            "reasons": ai_result.get("urgency_reasons", []),
            "auto_escalated": ai_result.get("auto_escalated", False),
        },
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Broadcast new-request event to connected dashboards
    await manager.broadcast({"type": "new_request", "request_id": new_request.id})

    # Send SMS confirmation to the partner (non-blocking — never fails the request)
    try:
        await asyncio.to_thread(send_partner_confirmation, new_request, db)
    except Exception as exc:
        logger.warning("Partner confirmation SMS failed for request %s: %s", new_request.id, exc)

    return new_request


# ── Authenticated: List Requests ──────────────────────────────


@router.get("/requests", response_model=RequestListResponse)
def list_requests(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency_level: Optional[str] = Query(None),
    fulfillment_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List requests with pagination and optional filters.

    Staff see only their assigned requests; admins see all.
    """
    query = db.query(Request)

    # Role-based filtering — staff see primary + shared assignments
    if current_user.role == "staff":
        assigned_via_team = (
            db.query(RequestAssignment.request_id)
            .filter(RequestAssignment.user_id == current_user.id)
            .subquery()
        )
        query = query.filter(
            or_(
                Request.assigned_staff_id == current_user.id,
                Request.id.in_(assigned_via_team),
            )
        )

    # Optional filters
    if status_filter is not None:
        query = query.filter(Request.status == status_filter)
    if urgency_level is not None:
        query = query.filter(Request.urgency_level == urgency_level)
    if fulfillment_type is not None:
        query = query.filter(Request.fulfillment_type == fulfillment_type)

    # Total count before pagination
    total = query.count()

    # Order and paginate
    requests = (
        query.order_by(Request.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return RequestListResponse(
        requests=requests,
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Authenticated: Get Single Request ─────────────────────────


@router.get("/requests/{request_id}", response_model=RequestResponse)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single request by ID.

    Staff can only view their own assigned requests; admins can view any.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Staff may only access their own assigned or shared requests
    if current_user.role == "staff" and request.assigned_staff_id != current_user.id:
        has_assignment = (
            db.query(RequestAssignment)
            .filter(
                RequestAssignment.request_id == request_id,
                RequestAssignment.user_id == current_user.id,
            )
            .first()
        )
        if not has_assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this request",
            )

    # Partners may only access their own requests (matched by email)
    elif current_user.role == "partner":
        if request.requestor_email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this request",
            )

    return request


# ── Authenticated: Update Request Status ──────────────────────


@router.patch("/requests/{request_id}/status", response_model=RequestResponse)
async def update_request_status(
    request_id: str,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the status of a request.

    Staff can only set 'in_review' on their own assigned requests.
    Admins can set any valid status on any request.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Validate the new status value
    valid_statuses = {s.value for s in Status}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    # Staff restrictions
    if current_user.role == "staff":
        if request.assigned_staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this request",
            )
        if body.status != "in_review":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff can only set status to 'in_review'",
            )

    # Apply update
    request.status = body.status
    db.commit()
    db.refresh(request)

    # Broadcast status-update event to connected dashboards
    await manager.broadcast({
        "type": "status_update",
        "request_id": request.id,
        "new_status": request.status,
    })

    # Notify partner of status change via SMS (non-blocking)
    try:
        await asyncio.to_thread(send_partner_status_update, request, body.status, db)
    except Exception as exc:
        logger.warning("Partner status SMS failed for request %s: %s", request.id, exc)

    return request


# ── Staff: Share Request with Another Staff Member ───────────


@router.post("/requests/{request_id}/share", response_model=RequestAssignmentResponse)
def share_request(
    request_id: str,
    body: ShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Share a request with another staff member by email.

    The current user must be assigned to the request (primary or via team).
    The target user must be an active staff member.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Verify current user has access to this request
    is_primary = request.assigned_staff_id == current_user.id
    has_assignment = (
        db.query(RequestAssignment)
        .filter(
            RequestAssignment.request_id == request_id,
            RequestAssignment.user_id == current_user.id,
        )
        .first()
    )
    if current_user.role != "admin" and not is_primary and not has_assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this request",
        )

    # Look up target user by email
    target_user = (
        db.query(User)
        .filter(User.email == body.email, User.role == "staff", User.is_active.is_(True))
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active staff account found for that email",
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot share a request with yourself",
        )

    # Check not already assigned
    existing = (
        db.query(RequestAssignment)
        .filter(
            RequestAssignment.request_id == request_id,
            RequestAssignment.user_id == target_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This staff member is already assigned to this request",
        )

    # Create assignment
    assignment = RequestAssignment(
        request_id=request_id,
        user_id=target_user.id,
        role="support",
        assigned_by=current_user.id,
        notes=f"Shared by {current_user.full_name}",
    )
    db.add(assignment)
    target_user.current_workload = (target_user.current_workload or 0) + 1
    db.commit()
    db.refresh(assignment)

    return RequestAssignmentResponse(
        id=assignment.id,
        request_id=assignment.request_id,
        user_id=assignment.user_id,
        user_name=target_user.full_name,
        user_classification=target_user.classification,
        role=assignment.role,
        assigned_at=assignment.assigned_at,
        notes=assignment.notes,
    )
