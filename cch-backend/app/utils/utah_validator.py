"""Utah-specific validation for zip codes and coordinates.

Source of truth: core.md §1
"""

import re

from app.config import UTAH_NE, UTAH_SW


def validate_zip(zip_code: str) -> bool:
    """Return True if *zip_code* matches the Utah 84xxx pattern."""
    return bool(re.match(r"^84\d{3}$", zip_code))


def validate_coordinates(lat: float, lng: float) -> bool:
    """Return True if (*lat*, *lng*) falls within the Utah bounding box.

    Bounds are defined by UTAH_SW and UTAH_NE in app.config.
    """
    return (
        UTAH_SW[0] <= lat <= UTAH_NE[0]
        and UTAH_SW[1] <= lng <= UTAH_NE[1]
    )
