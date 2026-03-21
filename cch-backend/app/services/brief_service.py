"""Job Brief generation service — builds comprehensive dispatch briefs.

Source of truth: core.md §10
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import AI_MODELS
from app.models.enums import UrgencyLevel, URGENCY_COLORS
from app.models.tables import Request, User, MaterialsCatalog
from app.services.ai_service import call_ai
from app.services.directions_service import get_travel_time, calculate_departure_time

logger = logging.getLogger(__name__)

# ── System prompt for AI briefing (Section 5) ────────────────────────────────

JOB_BRIEF_SYSTEM_PROMPT = """\
You are a dispatch briefing officer for Children's Community Health (CCH), a Utah nonprofit.
Write a 2-3 paragraph mission brief for a staff member being dispatched to a community health event.

Tone: professional, supportive, action-oriented.

Include:
- What to expect at the event (audience type, size, setting)
- Key talking points or focus areas based on the materials and special instructions
- Any special considerations (equity context, first-time requestor, etc.)

Do NOT include travel directions, materials lists, or weather — those are in separate sections.
Keep it concise and actionable.\
"""


# ── Main brief generator ─────────────────────────────────────────────────────

async def generate_job_brief(request: Request, staff: User, db: Session) -> dict:
    """Build a complete 7-section Job Brief for a dispatched request.

    Sections:
        1. Priority Header
        2. Travel Card
        3. Event Details
        4. Materials Checklist
        5. AI Briefing
        6. Weather (hardcoded prototype)
        7. Quick Actions

    Persists the brief and raw travel info on the request row before returning.
    """

    # ── Section 1: Priority Header ───────────────────────────────────────────
    try:
        urgency_enum = UrgencyLevel(request.urgency_level)
        urgency_color = URGENCY_COLORS.get(urgency_enum, "#2E86C1")
    except ValueError:
        urgency_color = "#2E86C1"

    priority_header = {
        "urgency_level": request.urgency_level,
        "urgency_color": urgency_color,
        "priority_score": request.ai_priority_score,
        "priority_justification": request.priority_justification,
    }

    # ── Section 2: Travel Card ───────────────────────────────────────────────
    travel_info = None
    maps_link = None

    has_staff_coords = staff.current_lat is not None and staff.current_lng is not None
    has_event_coords = request.event_lat is not None and request.event_lng is not None

    if has_staff_coords and has_event_coords:
        try:
            travel_info = await asyncio.to_thread(
                get_travel_time,
                staff.current_lat,
                staff.current_lng,
                request.event_lat,
                request.event_lng,
            )
        except Exception:
            logger.exception(
                "Travel time lookup failed for request %s (staff %s)",
                request.id,
                staff.id,
            )
            travel_info = None

        maps_link = (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={staff.current_lat},{staff.current_lng}"
            f"&destination={request.event_lat},{request.event_lng}"
        )

    if travel_info:
        departure_time = None
        if request.event_time:
            try:
                departure_time = calculate_departure_time(
                    request.event_time,
                    travel_info["duration_sec"],
                )
            except Exception:
                logger.exception(
                    "Departure time calculation failed for request %s",
                    request.id,
                )

        travel_card = {
            "duration_sec": travel_info["duration_sec"],
            "duration_text": travel_info["duration_text"],
            "distance_text": travel_info["distance_text"],
            "departure_time": departure_time,
            "maps_link": maps_link,
            "polyline": travel_info.get("polyline"),
        }
    else:
        travel_card = {
            "duration_sec": None,
            "duration_text": "Unavailable",
            "distance_text": "Unavailable",
            "departure_time": None,
            "maps_link": maps_link,
            "polyline": None,
        }

    # ── Section 3: Event Details ─────────────────────────────────────────────
    event_details = {
        "event_name": request.event_name,
        "event_date": str(request.event_date),
        "event_time": request.event_time,
        "event_city": request.event_city,
        "event_zip": request.event_zip,
        "requestor_name": request.requestor_name,
        "requestor_phone": request.requestor_phone,
        "requestor_email": request.requestor_email,
        "estimated_attendees": request.estimated_attendees,
        "fulfillment_type": request.fulfillment_type,
        "special_instructions": request.special_instructions,
        "cluster_context": None,
    }

    if request.cluster_id:
        event_details["cluster_context"] = f"Part of cluster {request.cluster_id}"

    # ── Section 4: Materials Checklist ────────────────────────────────────────
    materials_checklist: list[dict] = []

    if request.materials_requested:
        for item in request.materials_requested:
            if isinstance(item, dict) and "material_id" in item:
                catalog_entry = (
                    db.query(MaterialsCatalog)
                    .filter(MaterialsCatalog.id == item["material_id"])
                    .first()
                )
                materials_checklist.append({
                    "material_id": item["material_id"],
                    "name": catalog_entry.name if catalog_entry else item.get("name", "Unknown"),
                    "category": catalog_entry.category if catalog_entry else "General",
                    "quantity": item.get("quantity", 1),
                    "checked": False,
                })
            elif isinstance(item, str):
                materials_checklist.append({
                    "material_id": None,
                    "name": item,
                    "category": "General",
                    "quantity": 1,
                    "checked": False,
                })

    # ── Section 5: AI Briefing ───────────────────────────────────────────────
    user_message = (
        f"Event: {request.event_name}\n"
        f"Date: {request.event_date}, Time: {request.event_time or 'TBD'}\n"
        f"Location: {request.event_city}, UT {request.event_zip}\n"
        f"Attendees: {request.estimated_attendees or 'Unknown'}\n"
        f"Fulfillment: {request.fulfillment_type}\n"
        f"Materials: {request.materials_requested or 'None specified'}\n"
        f"Special Instructions: {request.special_instructions or 'None'}\n"
        f"AI Summary: {request.ai_summary or 'Not available'}\n"
        f"Assigned Staff: {staff.full_name} ({staff.classification})\n"
    )

    try:
        briefing_text = await call_ai(
            JOB_BRIEF_SYSTEM_PROMPT,
            user_message,
            model=AI_MODELS.get("job_brief", "anthropic/claude-sonnet-4.5"),
        )
    except Exception:
        logger.exception("AI briefing generation failed for request %s", request.id)
        briefing_text = (
            "AI briefing unavailable. Please review event details "
            "and special instructions above."
        )

    # ── Section 6: Weather (hardcoded for prototype) ─────────────────────────
    weather = {
        "temp_f": 72,
        "condition": "Clear",
        "outdoor_event": False,
        "recommendation": "Good conditions for event",
    }

    # ── Section 7: Quick Actions ─────────────────────────────────────────────
    quick_actions = {
        "navigate_url": maps_link,
        "call_requestor": f"tel:{request.requestor_phone}" if request.requestor_phone else None,
        "mark_arrived_endpoint": f"/api/requests/{request.id}/status",
        "mark_complete_endpoint": f"/api/requests/{request.id}/status",
    }

    # ── Assemble full brief ──────────────────────────────────────────────────
    job_brief = {
        "priority_header": priority_header,
        "travel_card": travel_card,
        "event_details": event_details,
        "materials_checklist": materials_checklist,
        "ai_briefing": briefing_text,
        "weather": weather,
        "quick_actions": quick_actions,
        "generated_at": datetime.utcnow().isoformat(),
    }

    # ── Persist to DB ────────────────────────────────────────────────────────
    request.job_brief = job_brief
    request.travel_info = travel_info
    db.commit()
    db.refresh(request)

    return job_brief


# ── Regeneration helper ──────────────────────────────────────────────────────

async def regenerate_brief(request_id: str, db: Session) -> dict:
    """Re-generate a Job Brief for an existing request.

    Loads the request and assigned staff, then delegates to
    generate_job_brief(). Raises ValueError if the request is not
    found or has no staff assigned.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise ValueError("Request not found")

    if request.assigned_staff_id is None:
        raise ValueError("No staff assigned")

    staff = db.query(User).filter(User.id == request.assigned_staff_id).first()
    if not staff:
        raise ValueError("Assigned staff not found")

    return await generate_job_brief(request, staff, db)
