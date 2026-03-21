"""Haversine distance calculation for geo-spatial operations.

Source of truth: core.md §9
"""

import math


def haversine_distance(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    """Return the great-circle distance between two points in miles.

    Uses the Haversine formula with Earth radius = 3959 miles.
    """
    earth_radius_miles = 3959

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius_miles * c
