"""Backfill AI classification data on seeded requests.

One-time script: runs classify_request() on all requests missing AI data.
"""
import asyncio
import sys

from app.models.database import SessionLocal
from app.models.tables import Request, ServiceAreaZip
from app.services.ai_service import classify_request


async def backfill():
    db = SessionLocal()
    try:
        # Find requests with no AI data
        pending = (
            db.query(Request)
            .filter(Request.ai_priority_score.is_(None))
            .all()
        )
        print(f"Found {len(pending)} requests without AI data.\n")

        if not pending:
            print("Nothing to backfill.")
            return

        for i, request in enumerate(pending, 1):
            # Lookup equity score
            szip = db.query(ServiceAreaZip).filter(
                ServiceAreaZip.zip_code == request.event_zip
            ).first()
            equity_score = szip.equity_score if szip else 50.0

            # Count prior requests for history
            prior = db.query(Request).filter(
                Request.requestor_email == request.requestor_email,
                Request.id != request.id,
            ).count()
            history = (
                "first-time" if prior == 0
                else "frequent" if prior > 3
                else "returning"
            )

            # Run AI classification
            print(f"[{i}/{len(pending)}] {request.event_name} ({request.event_zip})...", end=" ", flush=True)

            ai_result = await classify_request({
                "event_name": request.event_name,
                "event_date": str(request.event_date),
                "event_time": request.event_time,
                "event_city": request.event_city,
                "event_zip": request.event_zip,
                "fulfillment_type": request.fulfillment_type,
                "estimated_attendees": request.estimated_attendees,
                "materials_requested": request.materials_requested,
                "special_instructions": request.special_instructions,
                "requestor_name": request.requestor_name,
                "requestor_email": request.requestor_email,
                "equity_score": equity_score,
                "requestor_history": history,
            })

            # Store results
            request.ai_classification = ai_result
            request.ai_priority_score = ai_result.get("ai_priority_score")
            request.priority_justification = ai_result.get("priority_justification")
            request.ai_summary = ai_result.get("summary")
            request.ai_tags = ai_result.get("tags")
            request.ai_flags = ai_result.get("flags")
            request.urgency_level = ai_result.get("urgency_level", request.urgency_level)
            request.ai_urgency = {
                "level": ai_result.get("urgency_level"),
                "reasons": ai_result.get("urgency_reasons", []),
                "auto_escalated": ai_result.get("auto_escalated", False),
            }

            score = ai_result.get("ai_priority_score", "?")
            urgency = ai_result.get("urgency_level", "?")
            print(f"score={score} urgency={urgency}")

            # Commit every 5 to avoid losing progress
            if i % 5 == 0:
                db.commit()
                print(f"  (committed batch {i})")

        db.commit()
        print(f"\nDone. Backfilled {len(pending)} requests.")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(backfill())
