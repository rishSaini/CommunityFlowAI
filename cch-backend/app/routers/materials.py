"""Materials catalog management endpoints.

Source of truth: core.md §2.4, §14.3
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import MaterialCreate, MaterialResponse, MaterialUpdate
from app.models.tables import MaterialsCatalog

router = APIRouter(tags=["materials"])


@router.get("/materials", response_model=list[MaterialResponse])
def list_materials(
    in_stock: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Return all materials, optionally filtered by stock status."""
    query = db.query(MaterialsCatalog)
    if in_stock is not None:
        query = query.filter(MaterialsCatalog.in_stock == in_stock)
    return query.all()


@router.get("/materials/{material_id}", response_model=MaterialResponse)
def get_material(material_id: str, db: Session = Depends(get_db)):
    """Return a single material by ID."""
    material = db.query(MaterialsCatalog).filter(MaterialsCatalog.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    return material


@router.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    body: MaterialCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Create a new material (admin only)."""
    material = MaterialsCatalog(
        name=body.name,
        category=body.category,
        description=body.description,
        in_stock=body.in_stock,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.patch("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: str,
    body: MaterialUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Update an existing material (admin only)."""
    material = db.query(MaterialsCatalog).filter(MaterialsCatalog.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Soft-delete a material by setting in_stock=False (admin only)."""
    material = db.query(MaterialsCatalog).filter(MaterialsCatalog.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    material.in_stock = False
    db.commit()
    return {"message": "Material removed from catalog"}
