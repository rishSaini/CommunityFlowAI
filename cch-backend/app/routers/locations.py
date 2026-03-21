"""CCH location management endpoints.

Source of truth: core.md §2.4, §14.3
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import LocationCreate, LocationResponse, LocationUpdate
from app.models.tables import Location
from app.utils.utah_validator import validate_zip

router = APIRouter(tags=["locations"])


@router.get("/locations", response_model=list[LocationResponse])
def list_locations(db: Session = Depends(get_db)):
    """Return all active locations."""
    locations = db.query(Location).filter(Location.is_active == True).all()
    return locations


@router.get("/locations/{location_id}", response_model=LocationResponse)
def get_location(location_id: str, db: Session = Depends(get_db)):
    """Return a single location by ID."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return location


@router.post("/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(
    body: LocationCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Create a new location (admin only)."""
    if not validate_zip(body.zip_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Utah zip code — must match 84xxx",
        )
    location = Location(
        name=body.name,
        address=body.address,
        city=body.city,
        state="UT",
        zip_code=body.zip_code,
        lat=body.lat,
        lng=body.lng,
        service_radius_miles=body.service_radius_miles,
        phone=body.phone,
        on_duty_admin_phone=body.on_duty_admin_phone,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.patch("/locations/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: str,
    body: LocationUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Update an existing location (admin only)."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    update_data = body.model_dump(exclude_unset=True)
    if "zip_code" in update_data:
        if not validate_zip(update_data["zip_code"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Utah zip code — must match 84xxx",
            )
    for field, value in update_data.items():
        setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/locations/{location_id}")
def delete_location(
    location_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Soft-delete a location by setting is_active=False (admin only)."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    location.is_active = False
    db.commit()
    return {"message": "Location deactivated"}
