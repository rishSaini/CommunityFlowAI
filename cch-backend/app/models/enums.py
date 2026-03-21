"""Enum definitions for the CCH Ordering & Dispatch System.

Source of truth: core.md Sections 8.1, 12, 14
"""
import enum


class Role(str, enum.Enum):
    """User roles. core.md §2.1 — Partners never have accounts."""
    STAFF = "staff"
    ADMIN = "admin"


class Classification(str, enum.Enum):
    """Employee classification types. core.md §8.1"""
    FT_W2 = "FT_W2"
    PT_W2 = "PT_W2"
    ON_CALL = "ON_CALL"
    CONTRACTOR_1099 = "CONTRACTOR_1099"
    VOLUNTEER = "VOLUNTEER"
    OUTSIDE_HELP = "OUTSIDE_HELP"


CLASSIFICATION_DISPLAY = {
    Classification.FT_W2: "Full-Time W-2",
    Classification.PT_W2: "Part-Time W-2",
    Classification.ON_CALL: "On-Call",
    Classification.CONTRACTOR_1099: "Contractor (1099)",
    Classification.VOLUNTEER: "Volunteer",
    Classification.OUTSIDE_HELP: "Outside Help",
}


class Status(str, enum.Enum):
    """Request status pipeline. core.md §14.2"""
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    DISPATCHED = "dispatched"
    IN_PROGRESS = "in_progress"
    FULFILLED = "fulfilled"
    SENT_TO_QUALTRICS = "sent_to_qualtrics"
    CANCELLED = "cancelled"


class FulfillmentType(str, enum.Enum):
    """Request fulfillment types. core.md §6.1"""
    STAFF = "staff"
    MAIL = "mail"
    PICKUP = "pickup"


class UrgencyLevel(str, enum.Enum):
    """Urgency levels with SLA. core.md §12"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


URGENCY_COLORS = {
    UrgencyLevel.LOW: "#27AE60",
    UrgencyLevel.MEDIUM: "#2E86C1",
    UrgencyLevel.HIGH: "#E67E22",
    UrgencyLevel.CRITICAL: "#C0392B",
}


class NotificationChannel(str, enum.Enum):
    """Twilio notification channels. DATABASE_SCHEMA.md notification_log"""
    SMS = "sms"
    VOICE = "voice"


class NotificationStatus(str, enum.Enum):
    """Notification delivery status. DATABASE_SCHEMA.md notification_log"""
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
