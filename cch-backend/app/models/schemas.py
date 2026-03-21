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
