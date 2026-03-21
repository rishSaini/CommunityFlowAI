"""Google Geocoding and nearest-location assignment.

Source of truth: core.md §9.1, §11 Step 5
"""

import logging

import googlemaps
from sqlalchemy.orm import Session

from app.config import GOOGLE_MAPS_API_KEY
from app.models.tables import Location
from app.utils.geo import haversine_distance
from app.utils.utah_validator import validate_coordinates

logger = logging.getLogger(__name__)


def geocode_address(city: str, zip_code: str, street_address: str | None = None) -> tuple[float, float] | None:
    """Geocode a Utah address into (lat, lng) via the Google Geocoding API.

    Uses full street address when provided for pin-point accuracy, otherwise
    falls back to city + zip (city-level).
    Returns None when the API key is missing, the address cannot be resolved,
    or the result falls outside Utah bounds.
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("GOOGLE_MAPS_API_KEY is not set — skipping geocode")
        return None

    try:
        client = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
        query = f"{street_address}, {city}, UT {zip_code}" if street_address else f"{city}, UT {zip_code}"
        results = client.geocode(query)

        if not results:
            logger.warning("Geocode returned no results for %s, UT %s", city, zip_code)
            return None

        location = results[0]["geometry"]["location"]
        lat = location["lat"]
        lng = location["lng"]

        if not validate_coordinates(lat, lng):
            logger.warning(
                "Geocoded coordinates (%.4f, %.4f) are outside Utah bounds",
                lat,
                lng,
            )
            return None

        return (lat, lng)

    except Exception:
        logger.exception("Google Geocoding API error for %s", query)
        return None


def assign_nearest_location(lat: float, lng: float, db: Session) -> str | None:
    """Return the id of the nearest active CCH location to the given point.

    Returns None if no active locations exist or none have coordinates.
    """
    locations = db.query(Location).filter(Location.is_active == True).all()  # noqa: E712

    if not locations:
        return None

    nearest_id: str | None = None
    nearest_distance = float("inf")

    for loc in locations:
        if loc.lat is None or loc.lng is None:
            continue

        distance = haversine_distance(lat, lng, loc.lat, loc.lng)
        if distance < nearest_distance:
            nearest_distance = distance
            nearest_id = loc.id

    return nearest_id
