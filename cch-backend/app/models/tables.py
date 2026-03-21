"""SQLAlchemy ORM models for all 6 database tables.

Source of truth: core.md §14.1–14.3, DATABASE_SCHEMA.md
"""
from uuid import uuid4

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Index, Integer, String, Text,
)
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from app.models.database import Base


# ── Table 1: users (22 columns) ─────────────────────────────
# core.md §14.1 — Employees and admins. Partners never have accounts.

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)                    # staff | admin
    classification = Column(String, nullable=True)           # FT_W2 | PT_W2 | ON_CALL | CONTRACTOR_1099 | VOLUNTEER | OUTSIDE_HELP
    classification_display = Column(String, nullable=True)   # Human-readable label
    phone = Column(String, nullable=True)
    assigned_location_ids = Column(JSON, default=list)       # List of location UUIDs
    schedule = Column(JSON, default=list)                    # [{day, start, end, location_id}]
    schedule_exceptions = Column(JSON, default=list)         # [{date, type, reason?, start?, end?}]
    on_call_schedule = Column(JSON, default=list)            # [{start_date, end_date, start_time, end_time}] — ON_CALL only
    current_lat = Column(Float, nullable=True)               # Last check-in latitude (Utah)
    current_lng = Column(Float, nullable=True)               # Last check-in longitude
    last_checkin_at = Column(DateTime, nullable=True)
    current_workload = Column(Integer, default=0)
    max_workload = Column(Integer, default=5)
    is_on_duty = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    hire_date = Column(Date, nullable=True)
    certifications = Column(JSON, default=list)              # List of cert strings
    notification_queue = Column(JSON, default=list)          # [{request_id, message, queued_at}]
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index("idx_users_role", "role"),
        Index("idx_users_classification", "classification"),
    )


# ── Table 2: requests (35 columns) ──────────────────────────
# core.md §14.2 — Central table with all AI-generated data.

class Request(Base):
    __tablename__ = "requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))

    # Status & type
    status = Column(String, nullable=False, default="submitted")
    fulfillment_type = Column(String, nullable=False)        # staff | mail | pickup
    urgency_level = Column(String, default="low")            # low | medium | high | critical

    # Requestor info
    requestor_name = Column(String, nullable=False)
    requestor_email = Column(String, nullable=False)
    requestor_phone = Column(String, nullable=False)

    # Event details
    event_name = Column(String, nullable=False)
    event_date = Column(Date, nullable=False)
    event_time = Column(String, nullable=True)               # HH:MM, optional
    event_city = Column(String, nullable=False)              # Must be in Utah
    event_zip = Column(String, nullable=False)               # Must be 84xxx
    event_lat = Column(Float, nullable=True)                 # Geocoded, Utah bounds
    event_lng = Column(Float, nullable=True)

    # Conditional fields
    mailing_address = Column(String, nullable=True)          # MAIL type only
    estimated_attendees = Column(Integer, nullable=True)
    materials_requested = Column(JSON, default=list)         # [{material_id, quantity}]
    special_instructions = Column(Text, nullable=True)       # NLP processed by AI
    alt_contact = Column(String, nullable=True)

    # Assignment
    assigned_location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    assigned_staff_id = Column(String, ForeignKey("users.id"), nullable=True)
    cluster_id = Column(String, nullable=True)               # Co-dispatched group

    # AI-generated data
    ai_classification = Column(JSON, nullable=True)          # Full AI classification output
    ai_tags = Column(JSON, nullable=True)                    # List of tags
    ai_priority_score = Column(Float, nullable=True)         # 0–100
    priority_justification = Column(Text, nullable=True)     # AI 2–3 sentence explanation
    ai_urgency = Column(JSON, nullable=True)                 # {level, reasons[], auto_escalated}
    ai_flags = Column(JSON, nullable=True)                   # {incomplete, inconsistent, duplicate, details}
    ai_summary = Column(Text, nullable=True)                 # One-paragraph summary

    # Dispatch & brief
    dispatch_recommendation = Column(JSON, nullable=True)    # {staff_id, travel_time, distance, ...}
    job_brief = Column(JSON, nullable=True)                  # {urgency_sentence, briefing, ...}
    travel_info = Column(JSON, nullable=True)                # {duration_sec, duration_text, ...}

    # Meta
    admin_notes = Column(Text, nullable=True)
    twilio_notified = Column(Boolean, default=False)
    chatbot_used = Column(Boolean, default=False)
    status_tracker_token = Column(String, unique=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_requests_status", "status"),
        Index("idx_requests_urgency", "urgency_level"),
        Index("idx_requests_assigned_staff", "assigned_staff_id"),
        Index("idx_requests_event_date", "event_date"),
        Index("idx_requests_event_zip", "event_zip"),
        Index("idx_requests_tracker_token", "status_tracker_token"),
    )


# ── Table 3: locations (13 columns) ─────────────────────────
# core.md §14.3 — CCH office locations across Utah.

class Location(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, nullable=False)                    # Must be in Utah
    state = Column(String, default="UT")
    zip_code = Column(String, nullable=False)                # Must be 84xxx
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    service_radius_miles = Column(Float, default=25.0)
    is_active = Column(Boolean, default=True)
    phone = Column(String, nullable=True)
    on_duty_admin_phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())


# ── Table 4: materials_catalog (5 columns) ───────────────────
# core.md §14.3

class MaterialsCatalog(Base):
    __tablename__ = "materials_catalog"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    in_stock = Column(Boolean, default=True)


# ── Table 5: service_area_zips (7 columns) ───────────────────
# core.md §14.3 — Utah zip codes with equity scoring.

class ServiceAreaZip(Base):
    __tablename__ = "service_area_zips"

    zip_code = Column(String, primary_key=True)              # 84xxx
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    region_name = Column(String, nullable=True)
    is_staffable = Column(Boolean, default=True)
    equity_score = Column(Float, default=50.0)               # 0–100, lower = more underserved
    total_requests = Column(Integer, default=0)
    total_staff_visits = Column(Integer, default=0)


# ── Table 6: notification_log (11 columns) ───────────────────
# core.md §14.3 — Audit trail for all Twilio notifications.

class NotificationLog(Base):
    __tablename__ = "notification_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    request_id = Column(String, ForeignKey("requests.id"), nullable=True)
    recipient_phone = Column(String, nullable=True)
    recipient_name = Column(String, nullable=True)
    channel = Column(String, nullable=True)                  # sms | voice
    urgency_level = Column(String, nullable=True)
    message_body = Column(Text, nullable=True)
    twilio_sid = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    status = Column(String, default="queued")                # queued | sent | delivered | failed
    queued_until = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_notification_log_request", "request_id"),
    )


# ── Table 7: shift_assignments ────────────────────────────
# Per-date concrete shifts for calendar scheduling.

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)              # HH:MM
    end_time = Column(String, nullable=False)                # HH:MM
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    shift_type = Column(String, default="regular")           # regular | on_call | overtime | cover | training
    status = Column(String, default="scheduled")             # scheduled | confirmed | completed | cancelled
    request_id = Column(String, ForeignKey("requests.id"), nullable=True)
    color = Column(String, nullable=True)                    # hex color override
    notes = Column(Text, nullable=True)
    created_by = Column(String, nullable=True)               # admin user ID who created
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_shift_user_date", "user_id", "date"),
        Index("idx_shift_date", "date"),
        Index("idx_shift_status", "status"),
    )


# ── Table 8: request_assignments (multi-staff) ────────────
# Many-to-many: multiple staff can be assigned to one request.

class RequestAssignment(Base):
    __tablename__ = "request_assignments"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    request_id = Column(String, ForeignKey("requests.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="primary")                 # primary | support | observer
    assigned_at = Column(DateTime, default=func.now())
    assigned_by = Column(String, nullable=True)              # admin user ID
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_ra_request", "request_id"),
        Index("idx_ra_user", "user_id"),
    )


# ── Table 9: shift_templates ──────────────────────────────
# Reusable shift presets for quick calendar scheduling.

# ── Table 10: partner_messages ────────────────────────────
# Direct messaging between community partners and their assigned staff.

class PartnerMessage(Base):
    __tablename__ = "partner_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    request_id = Column(String, ForeignKey("requests.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    sender_name = Column(String, nullable=False)
    sender_role = Column(String, nullable=False)             # partner | staff | admin
    content = Column(Text, nullable=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index("idx_pm_request", "request_id"),
        Index("idx_pm_sender", "sender_id"),
    )


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    start_time = Column(String, nullable=False)              # HH:MM
    end_time = Column(String, nullable=False)                # HH:MM
    color = Column(String, default="#6366f1")
    is_default = Column(Boolean, default=False)
    created_by = Column(String, nullable=True)
