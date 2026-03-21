"""Analytics dashboard endpoints.

Source of truth: core.md §2.4, §15
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.models.database import get_db
from app.models.schemas import AnalyticsSummaryResponse
from app.models.tables import Request

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Return aggregated analytics for the admin dashboard."""
    # Total requests
    total_requests = db.query(func.count(Request.id)).scalar() or 0

    # Group by status
    status_rows = db.query(Request.status, func.count(Request.id)).group_by(Request.status).all()
    by_status = {row[0]: row[1] for row in status_rows}

    # Group by urgency
    urgency_rows = db.query(Request.urgency_level, func.count(Request.id)).group_by(Request.urgency_level).all()
    by_urgency = {row[0]: row[1] for row in urgency_rows}

    # Group by fulfillment type
    fulfillment_rows = db.query(Request.fulfillment_type, func.count(Request.id)).group_by(Request.fulfillment_type).all()
    by_fulfillment_type = {row[0]: row[1] for row in fulfillment_rows}

    # Average priority score (where not null)
    avg_priority_score = db.query(func.avg(Request.ai_priority_score)).filter(
        Request.ai_priority_score.isnot(None)
    ).scalar()
    if avg_priority_score is not None:
        avg_priority_score = round(avg_priority_score, 2)

    # Requests this week (Monday = start of week)
    today = datetime.utcnow()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    requests_this_week = db.query(func.count(Request.id)).filter(
        Request.created_at >= start_of_week
    ).scalar() or 0

    # Requests this month
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    requests_this_month = db.query(func.count(Request.id)).filter(
        Request.created_at >= start_of_month
    ).scalar() or 0

    return AnalyticsSummaryResponse(
        total_requests=total_requests,
        by_status=by_status,
        by_urgency=by_urgency,
        by_fulfillment_type=by_fulfillment_type,
        avg_priority_score=avg_priority_score,
        requests_this_week=requests_this_week,
        requests_this_month=requests_this_month,
    )
