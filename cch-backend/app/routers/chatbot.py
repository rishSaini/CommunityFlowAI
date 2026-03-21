"""AI chatbot endpoint for form auto-fill.

Source of truth: core.md §5.3
"""
from fastapi import APIRouter
from app.models.schemas import ChatbotRequest, ChatbotResponse
from app.services.chatbot_service import process_message

router = APIRouter(tags=["chatbot"])


@router.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(request: ChatbotRequest):
    """Process chatbot message and return reply with field updates."""
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    result = await process_message(messages, request.current_form_state)
    return ChatbotResponse(**result)
