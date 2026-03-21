"""Google Directions API wrapper for travel time and departure calculation.

Source of truth: core.md §9.3
"""

import logging
from datetime import datetime, timedelta

import googlemaps

from app.config import GOOGLE_MAPS_API_KEY, TRAVEL_BUFFER_MINUTES

logger = logging.getLogger(__name__)


def get_travel_time(
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
) -> dict | None:
    """Fetch driving travel time and distance between two points.

    Returns a dict with duration, distance, and encoded polyline, or None on
    any failure (missing API key, network error, no routes found).
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("GOOGLE_MAPS_API_KEY is not set — skipping directions")
        return None

    try:
        client = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
        results = client.directions(
            origin=(from_lat, from_lng),
            destination=(to_lat, to_lng),
            departure_time=datetime.now(),
        )

        if not results:
            logger.warning(
                "Directions API returned no routes from (%.4f, %.4f) to (%.4f, %.4f)",
                from_lat,
                from_lng,
                to_lat,
                to_lng,
            )
            return None

        route = results[0]
        leg = route["legs"][0]

        # Prefer duration_in_traffic when available (requires departure_time)
        if "duration_in_traffic" in leg:
            duration_sec = leg["duration_in_traffic"]["value"]
            duration_text = leg["duration_in_traffic"]["text"]
        else:
            duration_sec = leg["duration"]["value"]
            duration_text = leg["duration"]["text"]

        distance_m = leg["distance"]["value"]
        distance_text = leg["distance"]["text"]
        polyline = route.get("overview_polyline", {}).get("points", "")

        return {
            "duration_sec": duration_sec,
            "duration_text": duration_text,
            "distance_m": distance_m,
            "distance_text": distance_text,
            "polyline": polyline,
        }

    except Exception:
        logger.exception(
            "Google Directions API error from (%.4f, %.4f) to (%.4f, %.4f)",
            from_lat,
            from_lng,
            to_lat,
            to_lng,
        )
        return None


def calculate_departure_time(event_time: str, travel_duration_sec: int) -> str:
    """Calculate the recommended departure time as an HH:MM string.

    Subtracts the travel duration and a configurable buffer
    (TRAVEL_BUFFER_MINUTES, default 15) from the event start time.

    Args:
        event_time: Event start time in HH:MM format.
        travel_duration_sec: Driving duration in seconds.

    Returns:
        Departure time as an HH:MM string.
    """
    hours, minutes = map(int, event_time.split(":"))
    event_dt = datetime.now().replace(
        hour=hours, minute=minutes, second=0, microsecond=0
    )

    travel_minutes = travel_duration_sec / 60
    total_offset = timedelta(minutes=travel_minutes + TRAVEL_BUFFER_MINUTES)
    departure_dt = event_dt - total_offset

    return departure_dt.strftime("%H:%M")
