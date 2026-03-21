"""Employee management and staff check-in endpoints.

Source of truth: core.md §8, §2.3
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.models.database import get_db
from app.models.tables import User
from app.models.schemas import (
    UserResponse,
    EmployeeCheckinRequest,
    EmployeeCheckinResponse,
    EmployeeUpdateRequest,
)
from app.utils.utah_validator import validate_coordinates

router = APIRouter(tags=["employees"])


@router.get("/employees", response_model=list[UserResponse])
def list_employees(
    classification: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_on_duty: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """List all staff users with optional filters (admin only)."""
    query = db.query(User).filter(User.role == "staff")
    if classification is not None:
        query = query.filter(User.classification == classification)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_on_duty is not None:
        query = query.filter(User.is_on_duty == is_on_duty)
    return query.all()


@router.get("/employees/{user_id}", response_model=UserResponse)
def get_employee(
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Return a single employee by ID (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    return user


@router.patch("/employees/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: str,
    body: EmployeeUpdateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Update employee fields (admin only).

    Only non-None fields from the request body are applied.
    Role, email, and password cannot be changed via this endpoint.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/staff/checkin", response_model=EmployeeCheckinResponse)
def staff_checkin(
    body: EmployeeCheckinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a staff GPS check-in (authenticated staff)."""
    if not validate_coordinates(body.lat, body.lng):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in location must be within Utah bounds.",
        )
    current_user.current_lat = body.lat
    current_user.current_lng = body.lng
    current_user.last_checkin_at = datetime.utcnow()
    db.commit()
    return EmployeeCheckinResponse(
        message="Check-in successful",
        lat=body.lat,
        lng=body.lng,
        checkin_time=current_user.last_checkin_at,
    )
