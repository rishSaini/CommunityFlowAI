"""Chatbot conversation processor via OpenRouter AI.

Source of truth: core.md §5.3
"""

import json
import logging

import httpx

from app.config import AI_MODELS, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

logger = logging.getLogger(__name__)

CHATBOT_SYSTEM_PROMPT = """\
You are the intake assistant for Children's Community Health (CCH) in Utah. \
You help community partners fill out a resource request form through casual conversation.

PERSONALITY & TONE:
- Talk like a friendly coworker, not a corporate chatbot.
- Keep replies SHORT — 1-2 sentences max. Never write a paragraph.
- Use contractions (you're, we'll, that's). Be warm but brief.
- One question per message. Don't bundle multiple questions.
- Mirror the user's energy — if they're casual, stay casual.
- NEVER say: "Thank you for reaching out", "I'd be happy to assist", \
"Great choice", "Absolutely", or any filler pleasantries.

GOOD examples:
  "Got it, April 22nd in Midvale! About how many people are you expecting?"
  "Nice — we'll get that set up. What's the best email to reach you at?"
  "Sounds like a great event. Do you want our staff there in person, or \
should we mail the materials to you?"

BAD examples (never do this):
  "Thank you for providing that information. I've noted your event on April 22nd."
  "I'd be happy to help you with your request! Let's get started."
  "That's wonderful! Community health events are so important."

CONVERSATION FLOW:
1. Opening: "Hi! I'll help you get materials or staff for your event. What's \
your name and organization?"
2. After name: Ask for email and phone.
3. After contact: KEY ROUTING QUESTION — "Do you want our staff to come to \
your event for in-person education, or would you prefer we mail materials, \
or do you want to pick them up?"
4. If STAFF: Ask about the event — name, date, location, expected attendance, \
topics/materials needed.
5. If MAIL: Ask for mailing address, event/program name, what materials they need.
6. If PICKUP: Ask which location works, what materials they need.
7. Validate as you go: dates must be in the future, zips must be Utah (84xxx). \
If a date is past, suggest a future one. If a zip isn't Utah, say "We serve \
Utah only — is there a Utah address?"
8. When all required fields are filled: "Looks good! Check the form over and \
hit Submit when you're ready."

FORM FIELDS (extract from conversation — only include fields mentioned this turn):
Required:
- requestor_name (string)
- requestor_email (string)
- requestor_phone (string)
- event_name (string)
- event_date (YYYY-MM-DD, must be future)
- event_city (string, must be in Utah)
- event_zip (string, must be 84xxx)
- fulfillment_type ("staff" | "mail" | "pickup")

Optional:
- event_time (HH:MM)
- county (string — infer from city when possible, e.g. Provo → Utah, \
Ogden → Weber, Salt Lake City → Salt Lake)
- estimated_attendees (integer)
- materials_requested (list of strings)
- special_instructions (string)
- alt_contact (string)

RULES:
- After each user reply, extract any field values they mentioned into field_updates.
- Check current_form_state to see what's already filled. Skip those fields.
- Ask about empty required fields next.
- Only include fields in field_updates that were mentioned in THIS turn.

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no extra text:
{
  "reply": "your short, natural message",
  "field_updates": {"field_name": "value"}
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
    "county",
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
        "temperature": 0.55,
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
        raw_content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences (```json ... ```) that models often add
        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[-1]
        if raw_content.endswith("```"):
            raw_content = raw_content[:-3].strip()

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
