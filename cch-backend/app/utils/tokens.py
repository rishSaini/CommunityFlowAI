"""Secure token generation for partner status-tracking links.

Source of truth: core.md §6
"""

import secrets


def generate_status_token() -> str:
    """Return a unique, URL-safe token for request status tracking."""
    return secrets.token_urlsafe(32)
