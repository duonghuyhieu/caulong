from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.member import MemberRead
from app.services.auth import authenticate_member, get_current_member


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login_endpoint(payload: LoginRequest, db: Session = Depends(get_db)):
    return authenticate_member(db, payload)


@router.get("/me", response_model=MemberRead)
def me_endpoint(current_member: Member = Depends(get_current_member)):
    return current_member
