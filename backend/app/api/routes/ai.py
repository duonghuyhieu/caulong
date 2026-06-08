from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.ai import AIChatRequest, AIChatResponse
from app.services.ai import answer_question
from app.services.auth import get_current_member


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai_endpoint(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
    current_member: Member = Depends(get_current_member),
):
    return AIChatResponse(
        message=answer_question(
            db=db,
            current_member=current_member,
            message=payload.message,
            history=payload.history,
        )
    )
