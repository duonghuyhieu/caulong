from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, verify_password
from app.db.session import get_db
from app.models.member import Member
from app.schemas.auth import LoginRequest, TokenResponse


bearer_scheme = HTTPBearer(auto_error=False)


def authenticate_member(db: Session, payload: LoginRequest) -> TokenResponse:
    statement = select(Member).where(Member.username == payload.username)
    member = db.scalar(statement)

    if member is None or member.password_hash is None:
        raise_invalid_credentials()

    if member.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Member is inactive")

    if not verify_password(payload.password, member.password_hash):
        raise_invalid_credentials()

    return TokenResponse(access_token=create_access_token(subject=member.id))


def get_current_member(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Member:
    if credentials is None:
        raise_invalid_credentials()

    try:
        payload = decode_access_token(credentials.credentials)
        member_id = payload.get("sub")
    except InvalidTokenError:
        raise_invalid_credentials()

    if not isinstance(member_id, str):
        raise_invalid_credentials()

    member = db.get(Member, member_id)
    if member is None or member.status != "active":
        raise_invalid_credentials()

    return member


def require_treasurer(current_member: Member = Depends(get_current_member)) -> Member:
    if current_member.role != "treasurer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Treasurer role required")
    return current_member


def raise_invalid_credentials() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
