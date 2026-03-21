"""Chatbot conversation processor via OpenRouter AI.

Source of truth: core.md §5.3
"""

import json
import logging

import httpx

from app.config import AI_MODELS, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

logger = logging.getLogger(__name__)

CHATBOT_SYSTEM_PROMPT = """\
You are a friendly intake assistant for Children's Community Health in Utah.
Your job is to conversationally collect information to fill out a request form.

FORM FIELDS (extract these from the conversation):
- requestor_name (string, required)
- requestor_email (string, required)
- requestor_phone (string, required)
- event_name (string, required)
- event_date (YYYY-MM-DD, required, must be future)
- event_time (HH:MM, optional)
- event_city (string, required, must be in Utah)
- event_zip (string, required, must be 84xxx)
- fulfillment_type ("staff" | "mail" | "pickup", required)
- estimated_attendees (integer, optional)
- materials_requested (list of material names, optional)
- special_instructions (string, optional)
- alt_contact (string, optional)

RULES:
- Ask one question at a time. Be conversational and warm.
- After each user reply, extract any field values mentioned.
- CRITICAL: Early in the conversation, ask whether they want STAFF to attend \
their event for in-person education, or prefer materials MAILED to them, or \
want to PICK UP materials.
- Validate as you go: dates must be future, zips must be Utah (84xxx).
- Track which fields are still empty from the current_form_state.
- Ask about empty required fields next. Skip already-filled fields.
- When all required fields are filled, confirm and tell them to review + submit.

RESPONSE FORMAT (return ONLY valid JSON):
{
  "reply": "Your conversational message to the partner",
  "field_updates": {"field_name": "value", ...}
}\
"""

_REQUIRED_FIELDS = {
    "requestor_name",
    "requestor_email",
    "requestor_phone",
    "event_name",
    "event_date",
    "event_city",
    "event_zip",
    "fulfillment_type",
}

_ALL_FIELDS = _REQUIRED_FIELDS | {
    "event_time",
    "estimated_attendees",
    "materials_requested",
    "special_instructions",
    "alt_contact",
}


def _build_form_state_note(current_form_state: dict) -> str:
    """Create a concise summary of filled vs. empty fields for the AI."""
    filled = {
        k: v
        for k, v in current_form_state.items()
        if k in _ALL_FIELDS and v not in (None, "", [])
    }
    empty_required = sorted(_REQUIRED_FIELDS - set(filled))
    empty_optional = sorted((_ALL_FIELDS - _REQUIRED_FIELDS) - set(filled))

    lines = ["[CURRENT FORM STATE]"]
    if filled:
        lines.append("Filled: " + ", ".join(f"{k}={v!r}" for k, v in filled.items()))
    if empty_required:
        lines.append("Empty REQUIRED: " + ", ".join(empty_required))
    if empty_optional:
        lines.append("Empty optional: " + ", ".join(empty_optional))

    return "\n".join(lines)


async def process_message(
    messages: list[dict],
    current_form_state: dict,
) -> dict:
    """Send conversation to OpenRouter and return the chatbot response.

    Args:
        messages: Full conversation history as [{role, content}, ...].
        current_form_state: Current field values collected so far.

    Returns:
        A dict with ``reply`` (str) and ``field_updates`` (dict).
    """
    if not OPENROUTER_API_KEY:
        return {
            "reply": "Chatbot is not configured. Please fill out the form manually.",
            "field_updates": {},
        }

    form_state_note = _build_form_state_note(current_form_state)

    openrouter_messages = [
        {"role": "system", "content": CHATBOT_SYSTEM_PROMPT},
        {"role": "system", "content": form_state_note},
        *messages,
    ]

    payload = {
        "model": AI_MODELS.get("chatbot", "anthropic/claude-sonnet-4.5"),
        "temperature": 0.3,
        "max_tokens": 2000,
        "messages": openrouter_messages,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cch-system.vercel.app",
        "X-Title": "CCH Ordering System",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_BASE_URL,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()

        data = response.json()
        raw_content = data["choices"][0]["message"]["content"]

        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            logger.warning("Chatbot returned non-JSON content, wrapping raw text")
            parsed = {"reply": raw_content, "field_updates": {}}

        # Ensure expected keys exist
        parsed.setdefault("reply", "")
        parsed.setdefault("field_updates", {})

        return parsed

    except (httpx.HTTPStatusError, httpx.RequestError):
        logger.exception("OpenRouter API request failed")
        return {
            "reply": (
                "I'm having trouble connecting. "
                "Please try again or fill the form manually."
            ),
            "field_updates": {},
        }
    except Exception:
        logger.exception("Unexpected error in chatbot processing")
        return {
            "reply": (
                "I'm having trouble connecting. "
                "Please try again or fill the form manually."
            ),
            "field_updates": {},
        }
