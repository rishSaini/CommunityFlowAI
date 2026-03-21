"""Pydantic request/response schemas.

Source of truth: core.md §14 (field types), PHASE_1 (auth endpoints)
"""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Auth ────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    classification: Optional[str] = None
    classification_display: Optional[str] = None
    phone: Optional[str] = None
    assigned_location_ids: Optional[list] = None
    is_on_duty: bool
    is_active: bool
    current_workload: int
    max_workload: int
    hire_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Requests ───────────────────────────────────────────────

class RequestCreate(BaseModel):
    fulfillment_type: str  # "staff" | "mail" | "pickup"
    requestor_name: str
    requestor_email: str
    requestor_phone: str
    event_name: str
    event_date: date
    event_time: Optional[str] = None
    event_city: str
    event_zip: str
    mailing_address: Optional[str] = None
    estimated_attendees: Optional[int] = None
    materials_requested: Optional[list] = None
    special_instructions: Optional[str] = None
    alt_contact: Optional[str] = None


class RequestResponse(BaseModel):
    id: str
    status: str
    fulfillment_type: str
    urgency_level: str
    requestor_name: str
    requestor_email: str
    requestor_phone: str
    event_name: str
    event_date: date
    event_time: Optional[str] = None
    event_city: str
    event_zip: str
    event_lat: Optional[float] = None
    event_lng: Optional[float] = None
    mailing_address: Optional[str] = None
    estimated_attendees: Optional[int] = None
    materials_requested: Optional[list] = None
    special_instructions: Optional[str] = None
    alt_contact: Optional[str] = None
    assigned_location_id: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    ai_classification: Optional[dict] = None
    ai_priority_score: Optional[float] = None
    priority_justification: Optional[str] = None
    ai_urgency: Optional[dict] = None
    ai_summary: Optional[str] = None
    ai_tags: Optional[list] = None
    ai_flags: Optional[dict] = None
    dispatch_recommendation: Optional[dict] = None
    travel_info: Optional[dict] = None
    job_brief: Optional[dict] = None
    status_tracker_token: Optional[str] = None
    chatbot_used: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RequestListResponse(BaseModel):
    requests: list[RequestResponse]
    total: int
    page: int
    per_page: int


class StatusUpdateRequest(BaseModel):
    status: str


class ShareRequest(BaseModel):
    email: str


# ── Partner Messages (Direct Chat) ────────────────────────

class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    request_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelResponse(BaseModel):
    request_id: str
    event_name: str
    event_date: date
    event_city: str
    partner_name: str
    partner_id: str
    staff_name: Optional[str] = None
    staff_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    status: str
    # Enriched request details
    event_time: Optional[str] = None
    event_zip: Optional[str] = None
    estimated_attendees: Optional[int] = None
    materials_requested: Optional[list] = None
    special_instructions: Optional[str] = None
    fulfillment_type: Optional[str] = None
    urgency_level: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_priority_score: Optional[float] = None


# ── Chatbot ────────────────────────────────────────────────

class ChatbotMessage(BaseModel):
    role: str
    content: str


class ChatbotRequest(BaseModel):
    messages: list[ChatbotMessage]
    current_form_state: dict


class ChatbotResponse(BaseModel):
    reply: str
    field_updates: dict


# ── Locations ──────────────────────────────────────────────

class LocationResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    city: str
    state: str = "UT"
    zip_code: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    service_radius_miles: float
    is_active: bool
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: str
    zip_code: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    service_radius_miles: float = 25.0
    phone: Optional[str] = None
    on_duty_admin_phone: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    service_radius_miles: Optional[float] = None
    phone: Optional[str] = None
    on_duty_admin_phone: Optional[str] = None


# ── Materials ──────────────────────────────────────────────

class MaterialResponse(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None
    in_stock: bool

    model_config = ConfigDict(from_attributes=True)


class MaterialCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    in_stock: bool = True


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    in_stock: Optional[bool] = None


# ── Dispatch ───────────────────────────────────────────────

class DispatchCandidateResponse(BaseModel):
    user_id: str
    full_name: str
    classification: str
    classification_display: Optional[str] = None
    travel_time_minutes: Optional[float] = None
    distance_miles: Optional[float] = None
    current_workload: int
    max_workload: int
    is_on_shift: bool
    score: Optional[float] = None


class DispatchAssignRequest(BaseModel):
    staff_id: str


class ClusterOpportunity(BaseModel):
    """A nearby pending request that could be co-dispatched."""
    request_id: str
    event_name: str
    distance_miles: float


class DispatchResponse(BaseModel):
    """Full dispatch response with ranked candidates and cluster opportunities."""
    candidates: list[DispatchCandidateResponse]
    cluster_opportunities: list[ClusterOpportunity] = []


# ── Employees ──────────────────────────────────────────────

class EmployeeCheckinRequest(BaseModel):
    lat: float
    lng: float


class EmployeeCheckinResponse(BaseModel):
    message: str
    lat: float
    lng: float
    checkin_time: datetime


class EmployeeUpdateRequest(BaseModel):
    is_on_duty: Optional[bool] = None
    is_active: Optional[bool] = None
    schedule: Optional[list] = None
    schedule_exceptions: Optional[list] = None
    on_call_schedule: Optional[list] = None
    assigned_location_ids: Optional[list] = None
    max_workload: Optional[int] = None
    certifications: Optional[list] = None
    phone: Optional[str] = None


# ── Briefs ─────────────────────────────────────────────────

class BriefResponse(BaseModel):
    request_id: str
    status: str
    event_name: str
    event_date: date
    urgency_level: str
    priority_score: Optional[float] = None
    priority_justification: Optional[str] = None
    job_brief: Optional[dict] = None
    travel_info: Optional[dict] = None
    assigned_staff_name: Optional[str] = None


# ── Analytics ──────────────────────────────────────────────

class AnalyticsSummaryResponse(BaseModel):
    total_requests: int
    by_status: dict
    by_urgency: dict
    by_fulfillment_type: dict
    avg_priority_score: Optional[float] = None
    requests_this_week: int
    requests_this_month: int


# ── Search ─────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    results: list[RequestResponse]
    total: int
    query_interpretation: Optional[str] = None


# ── Status Tracker (public) ───────────────────────────────

class StatusTrackerResponse(BaseModel):
    status: str
    event_name: str
    event_date: date
    urgency_color: str
    assigned_staff_first_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Shift Assignments (Calendar Scheduling) ──────────────

class ShiftCreate(BaseModel):
    user_id: str
    date: str                                     # YYYY-MM-DD
    start_time: str                               # HH:MM
    end_time: str                                 # HH:MM
    location_id: Optional[str] = None
    shift_type: str = "regular"
    request_id: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None


class ShiftUpdate(BaseModel):
    user_id: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location_id: Optional[str] = None
    shift_type: Optional[str] = None
    status: Optional[str] = None
    request_id: Optional[str] = None
    notes: Optional[str] = None


class ShiftBulkCreate(BaseModel):
    shifts: list[ShiftCreate]


class ShiftResponse(BaseModel):
    id: str
    user_id: str
    user_name: str = ""
    user_classification: Optional[str] = None
    date: str
    start_time: str
    end_time: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    shift_type: str
    status: str
    request_id: Optional[str] = None
    request_name: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None


class GenerateScheduleRequest(BaseModel):
    start_date: str                               # YYYY-MM-DD
    end_date: str                                 # YYYY-MM-DD
    user_ids: Optional[list[str]] = None
    overwrite: bool = False


class GenerateScheduleResponse(BaseModel):
    created: int
    skipped: int
    details: Optional[str] = None


# ── Multi-Staff Assignment ─────────────────────────────────

class TeamAssignRequest(BaseModel):
    staff_ids: list[str]
    roles: Optional[dict[str, str]] = None        # {user_id: "primary"|"support"|"observer"}
    notes: Optional[str] = None


class TeamAddRequest(BaseModel):
    staff_ids: list[str]
    roles: Optional[dict[str, str]] = None
    notes: Optional[str] = None


class RequestAssignmentResponse(BaseModel):
    id: str
    request_id: str
    user_id: str
    user_name: str = ""
    user_classification: Optional[str] = None
    role: str
    assigned_at: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Coverage & AI Schedule ──────────────────────────────────

class CoverageCell(BaseModel):
    date: str
    hour: int
    scheduled_count: int
    task_count: int
    coverage_ratio: float
    level: str                                    # over | balanced | under | critical


class CoverageResponse(BaseModel):
    cells: list[CoverageCell]
    summary: dict


class AIScheduleSuggestion(BaseModel):
    user_id: str
    user_name: str
    date: str
    start_time: str
    end_time: str
    reason: str
    confidence: float
    fills_gap: bool


class AIScheduleResponse(BaseModel):
    suggestions: list[AIScheduleSuggestion]
    narrative: str


class AIScheduleRequest(BaseModel):
    start_date: str
    end_date: str


# ── Shift Templates ─────────────────────────────────────────

class ShiftTemplateCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    color: str = "#6366f1"


class ShiftTemplateResponse(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    color: str
    is_default: bool

    model_config = ConfigDict(from_attributes=True)


# ── Team Calendar (combined admin response) ─────────────────

class CalendarEmployeeInfo(BaseModel):
    id: str
    full_name: str
    classification: Optional[str] = None
    classification_display: Optional[str] = None
    is_on_duty: bool
    current_workload: int
    max_workload: int

    model_config = ConfigDict(from_attributes=True)


class TeamCalendarResponse(BaseModel):
    shifts: list[ShiftResponse]
    tasks: list[dict]
    employees: list[CalendarEmployeeInfo]


# ── Updated Dispatch (multi-staff) ──────────────────────────

class DispatchAssignTeamRequest(BaseModel):
    staff_id: str                                 # primary assignee
    additional_staff_ids: list[str] = []          # support team
    roles: Optional[dict[str, str]] = None
    notes: Optional[str] = None


# ── Urgency Override ──────────────────────────────────────

class UrgencyOverrideRequest(BaseModel):
    urgency_level: str  # "low" | "medium" | "high" | "critical"


# ── Notification Log ──────────────────────────────────────

class NotificationLogResponse(BaseModel):
    id: str
    request_id: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_name: Optional[str] = None
    channel: Optional[str] = None
    urgency_level: Optional[str] = None
    message_body: Optional[str] = None
    sent_at: Optional[datetime] = None
    status: str
    queued_until: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
