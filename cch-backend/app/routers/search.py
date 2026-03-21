"""Search endpoints. Basic text search (full NL/AI search in Phase 4).

Source of truth: core.md §15
"""
from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import RequestResponse, SearchRequest, SearchResponse
from app.models.tables import Request

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
def search_requests(
    body: SearchRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Basic LIKE search across request fields (AI-powered NL search in Phase 4)."""
    search_term = f"%{body.query}%"

    results = db.query(Request).filter(
        or_(
            Request.event_name.ilike(search_term),
            Request.requestor_name.ilike(search_term),
            Request.event_city.ilike(search_term),
            Request.event_zip.ilike(search_term),
            Request.special_instructions.ilike(search_term),
        )
    ).limit(50).all()

    return SearchResponse(
        results=[RequestResponse.model_validate(r) for r in results],
        total=len(results),
        query_interpretation="Basic text search (AI-powered search available in next update)",
    )
