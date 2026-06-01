from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.play_session import PlaySessionCreate, PlaySessionPreview, PlaySessionRead
from app.services.auth import require_treasurer
from app.services.play_sessions import (
    create_play_session,
    get_play_session,
    list_play_sessions,
    preview_play_session,
)


router = APIRouter(prefix="/play-sessions", tags=["play-sessions"])


@router.post("/preview", response_model=PlaySessionPreview)
def preview_play_session_endpoint(
    payload: PlaySessionCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return preview_play_session(db, payload)


@router.post("", response_model=PlaySessionRead, status_code=201)
def create_play_session_endpoint(
    payload: PlaySessionCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return create_play_session(db, payload, current_member)


@router.get("", response_model=list[PlaySessionRead])
def list_play_sessions_endpoint(
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return list_play_sessions(db)


@router.get("/{play_session_id}", response_model=PlaySessionRead)
def get_play_session_endpoint(
    play_session_id: str,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return get_play_session(db, play_session_id)