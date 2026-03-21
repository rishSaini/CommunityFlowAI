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
