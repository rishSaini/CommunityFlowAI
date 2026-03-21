"""Application configuration — environment variables and constants.

Source of truth: core.md §4.3 (AI models), §9 (maps), §18.3 (env vars)
"""
import os
import secrets

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

# ── JWT ─────────────────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_hex(32)
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ── OpenRouter (Phase 4+) ──────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

# AI model defaults per feature — core.md §4.3
AI_MODELS = {
    "classification": "anthropic/claude-sonnet-4.5",
    "chatbot": "anthropic/claude-sonnet-4.5",
    "job_brief": "anthropic/claude-sonnet-4.5",
    "search": "openai/gpt-4o-mini",
    "tagging": "openai/gpt-4o-mini",
    "digest": "anthropic/claude-sonnet-4.5",
    "dispatch": "openai/gpt-4o-mini",
    "priority": "openai/gpt-4o-mini",
}

# ── Google Maps (Phase 6+) ─────────────────────────────────
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# ── Twilio (Phase 7+) ──────────────────────────────────────
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# ── Travel ──────────────────────────────────────────────────
TRAVEL_BUFFER_MINUTES = int(os.getenv("TRAVEL_BUFFER_MINUTES", "15"))

# ── Utah Region Lock — core.md §1 ──────────────────────────
UTAH_CENTER_LAT = 39.3210
UTAH_CENTER_LNG = -111.0937
UTAH_ZOOM = 7
UTAH_SW = (36.99, -114.05)
UTAH_NE = (42.00, -109.04)
