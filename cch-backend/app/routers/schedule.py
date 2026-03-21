"""Schedule management endpoints — shifts, templates, coverage, AI suggestions.

Admin: full CRUD on shifts, generate from patterns, coverage analysis, AI suggestions.
Staff: read-only access to own schedule.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.models.database import get_db
from app.models.tables import (
    ShiftAssignment, ShiftTemplate, User, Request, RequestAssignment, Location,
)
from app.models.schemas import (
    ShiftCreate, ShiftUpdate, ShiftBulkCreate, ShiftResponse,
    GenerateScheduleRequest, GenerateScheduleResponse,
    CoverageResponse, AIScheduleRequest, AIScheduleResponse,
    ShiftTemplateCreate, ShiftTemplateResponse,
    TeamCalendarResponse, CalendarEmployeeInfo,
    TeamAssignRequest, TeamAddRequest, RequestAssignmentResponse,
)
from app.services.schedule_management_service import (
    generate_shifts_from_patterns,
    detect_conflicts,
    get_coverage_analysis,
    ai_suggest_schedule,
    shift_to_response,
    CLASSIFICATION_COLORS,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["schedule"])


# ── Team Calendar (admin) ────────────────────────────────────────────────

@router.get("/schedule/team", response_model=TeamCalendarResponse)
def get_team_calendar(
    start: str,
    end: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Return all shifts, tasks, and employee info for the admin team calendar."""
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d").date()
        end_date = datetime.strptime(end, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Shifts
    shifts = (
        db.query(ShiftAssignment)
        .filter(
            ShiftAssignment.date >= start_date,
            ShiftAssignment.date <= end_date,
            ShiftAssignment.status != "cancelled",
        )
        .all()
    )
    shift_dicts = [shift_to_response(s, db) for s in shifts]

    # Tasks (all requests in date range — admin sees everything)
    requests = (
        db.query(Request)
        .filter(
            Request.event_date >= start_date,
            Request.event_date <= end_date,
            Request.status.in_(["submitted", "in_review", "approved", "dispatched", "in_progress", "fulfilled"]),
        )
        .all()
    )

    task_dicts = []
    for req in requests:
        # Get all team members for this request
        assignments = (
            db.query(RequestAssignment)
            .filter(RequestAssignment.request_id == req.id)
            .all()
        )
        assigned_users = []
        for ra in assignments:
            u = db.query(User).filter(User.id == ra.user_id).first()
            if u:
                assigned_users.append({
                    "user_id": ra.user_id,
                    "user_name": u.full_name,
                    "role": ra.role,
                })

        # If no request_assignments but assigned_staff_id exists (legacy)
        if not assigned_users and req.assigned_staff_id:
            u = db.query(User).filter(User.id == req.assigned_staff_id).first()
            if u:
                assigned_users.append({
                    "user_id": req.assigned_staff_id,
                    "user_name": u.full_name,
                    "role": "primary",
                })

        task_dicts.append({
            "request_id": req.id,
            "event_name": req.event_name,
            "event_date": req.event_date.isoformat() if req.event_date else None,
            "event_time": req.event_time,
            "event_city": req.event_city,
            "assigned_users": assigned_users,
            "urgency_level": req.urgency_level,
            "priority_score": req.ai_priority_score,
            "status": req.status,
            "fulfillment_type": req.fulfillment_type,
        })

    # Employees (staff only)
    employees = (
        db.query(User)
        .filter(User.role == "staff", User.is_active.is_(True))
        .all()
    )
    emp_dicts = [
        CalendarEmployeeInfo(
            id=e.id,
            full_name=e.full_name,
            classification=e.classification,
            classification_display=e.classification_display,
            is_on_duty=e.is_on_duty,
            current_workload=e.current_workload or 0,
            max_workload=e.max_workload or 5,
        )
        for e in employees
    ]

    return TeamCalendarResponse(
        shifts=shift_dicts,
        tasks=task_dicts,
        employees=emp_dicts,
    )


# ── Personal Calendar (staff) ────────────────────────────────────────────

@router.get("/schedule/me")
def get_my_calendar(
    start: str,
    end: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's shifts and assigned tasks."""
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d").date()
        end_date = datetime.strptime(end, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Own shifts
    shifts = (
        db.query(ShiftAssignment)
        .filter(
            ShiftAssignment.user_id == current_user.id,
            ShiftAssignment.date >= start_date,
            ShiftAssignment.date <= end_date,
            ShiftAssignment.status != "cancelled",
        )
        .all()
    )
    shift_dicts = [shift_to_response(s, db) for s in shifts]

    # Own tasks
    assigned_request_ids_q = (
        db.query(RequestAssignment.request_id)
        .filter(RequestAssignment.user_id == current_user.id)
        .scalar_subquery()
    )
    requests = (
        db.query(Request)
        .filter(
            Request.event_date >= start_date,
            Request.event_date <= end_date,
            (
                Request.id.in_(assigned_request_ids_q)
                | (Request.assigned_staff_id == current_user.id)
            ),
        )
        .all()
    )

    task_dicts = []
    for req in requests:
        task_dicts.append({
            "request_id": req.id,
            "event_name": req.event_name,
            "event_date": req.event_date.isoformat() if req.event_date else None,
            "event_time": req.event_time,
            "event_city": req.event_city,
            "urgency_level": req.urgency_level,
            "priority_score": req.ai_priority_score,
            "status": req.status,
        })

    return {"shifts": shift_dicts, "tasks": task_dicts}


# ── Shift CRUD ────────────────────────────────────────────────────────────

@router.post("/schedule/shifts", response_model=ShiftResponse)
def create_shift(
    body: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create a single shift assignment."""
    # Validate user exists
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        shift_date = datetime.strptime(body.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    # Check conflicts
    conflicts = detect_conflicts(db, body.user_id, shift_date, body.start_time, body.end_time)
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail=f"Shift conflicts with {len(conflicts)} existing shift(s) for this employee on {body.date}",
        )

    classification = user.classification or ""
    color = body.color or CLASSIFICATION_COLORS.get(classification, "#6366f1")

    shift = ShiftAssignment(
        user_id=body.user_id,
        date=shift_date,
        start_time=body.start_time,
        end_time=body.end_time,
        location_id=body.location_id,
        shift_type=body.shift_type,
        request_id=body.request_id,
        color=color,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    return shift_to_response(shift, db)


@router.post("/schedule/shifts/bulk")
def create_shifts_bulk(
    body: ShiftBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create multiple shifts at once."""
    created = 0
    skipped = 0
    for sc in body.shifts:
        user = db.query(User).filter(User.id == sc.user_id).first()
        if not user:
            skipped += 1
            continue

        try:
            shift_date = datetime.strptime(sc.date, "%Y-%m-%d").date()
        except ValueError:
            skipped += 1
            continue

        conflicts = detect_conflicts(db, sc.user_id, shift_date, sc.start_time, sc.end_time)
        if conflicts:
            skipped += 1
            continue

        classification = user.classification or ""
        color = sc.color or CLASSIFICATION_COLORS.get(classification, "#6366f1")

        db.add(ShiftAssignment(
            user_id=sc.user_id,
            date=shift_date,
            start_time=sc.start_time,
            end_time=sc.end_time,
            location_id=sc.location_id,
            shift_type=sc.shift_type,
            request_id=sc.request_id,
            color=color,
            notes=sc.notes,
            created_by=current_user.id,
        ))
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped}


@router.patch("/schedule/shifts/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: str,
    body: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Update a shift (drag-and-drop move, edit details)."""
    shift = db.query(ShiftAssignment).filter(ShiftAssignment.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    # Apply updates
    new_user_id = body.user_id or shift.user_id
    new_date_str = body.date
    new_start = body.start_time or shift.start_time
    new_end = body.end_time or shift.end_time

    if new_date_str:
        try:
            new_date = datetime.strptime(new_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        new_date = shift.date

    # Check conflicts for the new position
    if body.user_id or body.date or body.start_time or body.end_time:
        conflicts = detect_conflicts(
            db, new_user_id, new_date, new_start, new_end,
            exclude_shift_id=shift_id,
        )
        if conflicts:
            raise HTTPException(
                status_code=409,
                detail=f"Move conflicts with {len(conflicts)} existing shift(s)",
            )

    if body.user_id is not None:
        shift.user_id = body.user_id
    if body.date is not None:
        shift.date = new_date
    if body.start_time is not None:
        shift.start_time = body.start_time
    if body.end_time is not None:
        shift.end_time = body.end_time
    if body.location_id is not None:
        shift.location_id = body.location_id
    if body.shift_type is not None:
        shift.shift_type = body.shift_type
    if body.status is not None:
        shift.status = body.status
    if body.request_id is not None:
        shift.request_id = body.request_id
    if body.notes is not None:
        shift.notes = body.notes

    db.commit()
    db.refresh(shift)

    return shift_to_response(shift, db)


@router.delete("/schedule/shifts/{shift_id}")
def delete_shift(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Cancel a shift assignment."""
    shift = db.query(ShiftAssignment).filter(ShiftAssignment.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    shift.status = "cancelled"
    db.commit()
    return {"message": "Shift cancelled", "id": shift_id}


# ── Generate Schedule ─────────────────────────────────────────────────────

@router.post("/schedule/generate", response_model=GenerateScheduleResponse)
def generate_schedule(
    body: GenerateScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Auto-generate shifts from weekly patterns for a date range."""
    try:
        start_date = datetime.strptime(body.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(body.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if (end_date - start_date).days > 60:
        raise HTTPException(status_code=400, detail="Maximum range is 60 days")

    result = generate_shifts_from_patterns(
        db=db,
        start_date=start_date,
        end_date=end_date,
        user_ids=body.user_ids,
        created_by=current_user.id,
        overwrite=body.overwrite,
    )
    db.commit()

    return GenerateScheduleResponse(
        created=result["created"],
        skipped=result["skipped"],
        details=f"Generated shifts for {start_date} to {end_date}",
    )


# ── Coverage ──────────────────────────────────────────────────────────────

@router.get("/schedule/coverage", response_model=CoverageResponse)
def get_coverage(
    start: str,
    end: str,
    location_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Return coverage analysis for the date range."""
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d").date()
        end_date = datetime.strptime(end, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    result = get_coverage_analysis(db, start_date, end_date, location_id)
    return CoverageResponse(cells=result["cells"], summary=result["summary"])


# ── AI Schedule Suggestions ──────────────────────────────────────────────

@router.post("/schedule/ai-suggest", response_model=AIScheduleResponse)
async def suggest_schedule(
    body: AIScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get AI-powered schedule optimization suggestions."""
    try:
        start_date = datetime.strptime(body.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(body.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    result = await ai_suggest_schedule(db, start_date, end_date)
    return AIScheduleResponse(
        suggestions=result["suggestions"],
        narrative=result["narrative"],
    )


# ── Shift Templates ──────────────────────────────────────────────────────

@router.get("/schedule/templates", response_model=list[ShiftTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all shift templates."""
    templates = db.query(ShiftTemplate).all()
    return templates


@router.post("/schedule/templates", response_model=ShiftTemplateResponse)
def create_template(
    body: ShiftTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create a custom shift template."""
    template = ShiftTemplate(
        name=body.name,
        start_time=body.start_time,
        end_time=body.end_time,
        color=body.color,
        is_default=False,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/schedule/templates/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete a custom shift template. Cannot delete default templates."""
    template = db.query(ShiftTemplate).filter(ShiftTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default templates")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted", "id": template_id}


# ── Multi-Staff Team Assignment ──────────────────────────────────────────

@router.get("/dispatch/{request_id}/team", response_model=list[RequestAssignmentResponse])
def get_request_team(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all team members assigned to a request."""
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    assignments = (
        db.query(RequestAssignment)
        .filter(RequestAssignment.request_id == request_id)
        .all()
    )

    results = []
    for ra in assignments:
        user = db.query(User).filter(User.id == ra.user_id).first()
        results.append(RequestAssignmentResponse(
            id=ra.id,
            request_id=ra.request_id,
            user_id=ra.user_id,
            user_name=user.full_name if user else "",
            user_classification=user.classification if user else None,
            role=ra.role,
            assigned_at=ra.assigned_at,
            notes=ra.notes,
        ))

    # Include legacy assigned_staff_id if no request_assignments exist
    if not results and request.assigned_staff_id:
        user = db.query(User).filter(User.id == request.assigned_staff_id).first()
        if user:
            results.append(RequestAssignmentResponse(
                id="legacy",
                request_id=request_id,
                user_id=user.id,
                user_name=user.full_name,
                user_classification=user.classification,
                role="primary",
                assigned_at=request.updated_at,
                notes=None,
            ))

    return results


@router.post("/dispatch/{request_id}/team/add")
async def add_team_members(
    request_id: str,
    body: TeamAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Add additional staff members to an already-dispatched request."""
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    added = []
    for staff_id in body.staff_ids:
        user = db.query(User).filter(User.id == staff_id, User.is_active.is_(True)).first()
        if not user:
            continue

        # Check not already assigned
        existing = (
            db.query(RequestAssignment)
            .filter(
                RequestAssignment.request_id == request_id,
                RequestAssignment.user_id == staff_id,
            )
            .first()
        )
        if existing:
            continue

        role = (body.roles or {}).get(staff_id, "support")
        ra = RequestAssignment(
            request_id=request_id,
            user_id=staff_id,
            role=role,
            assigned_by=current_user.id,
            notes=body.notes,
        )
        db.add(ra)

        # Increment workload
        user.current_workload = (user.current_workload or 0) + 1

        added.append({"user_id": staff_id, "user_name": user.full_name, "role": role})

    db.commit()

    # Non-blocking: Twilio + brief for each new team member
    for member in added:
        try:
            staff_user = db.query(User).filter(User.id == member["user_id"]).first()
            if staff_user:
                from app.services.twilio_service import notify_dispatch
                from app.services.brief_service import generate_job_brief
                try:
                    await notify_dispatch(request, staff_user, db)
                except Exception as exc:
                    logger.warning("Twilio failed for team member %s: %s", member["user_id"], exc)
                try:
                    await generate_job_brief(request, staff_user, db)
                except Exception as exc:
                    logger.warning("Brief failed for team member %s: %s", member["user_id"], exc)
        except Exception as exc:
            logger.warning("Post-assignment tasks failed for %s: %s", member["user_id"], exc)

    return {"added": added, "count": len(added)}


@router.delete("/dispatch/{request_id}/team/{user_id}")
def remove_team_member(
    request_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Remove a team member from a request. Cannot remove the primary assignee."""
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Don't allow removing primary assignee
    if request.assigned_staff_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove the primary assignee. Reassign the request instead.",
        )

    ra = (
        db.query(RequestAssignment)
        .filter(
            RequestAssignment.request_id == request_id,
            RequestAssignment.user_id == user_id,
        )
        .first()
    )
    if not ra:
        raise HTTPException(status_code=404, detail="Team member not found on this request")

    # Decrement workload
    user = db.query(User).filter(User.id == user_id).first()
    if user and (user.current_workload or 0) > 0:
        user.current_workload -= 1

    db.delete(ra)
    db.commit()

    return {"message": "Team member removed", "user_id": user_id}
