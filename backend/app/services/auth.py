from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.member import Member
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse


bearer_scheme = HTTPBearer(auto_error=False)


def authenticate_member(db: Session, payload: LoginRequest) -> TokenResponse:
    statement = select(Member).where(Member.username == payload.username)
    member = db.scalar(statement)

    if member is None or member.password_hash is None:
        raise_invalid_credentials()

    if member.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khoá")

    if not verify_password(payload.password, member.password_hash):
        raise_invalid_credentials()

    return TokenResponse(access_token=create_access_token(subject=member.id))


def change_password(
    db: Session,
    member: Member,
    payload: ChangePasswordRequest,
) -> None:
    if member.password_hash is None or not verify_password(
        payload.current_password, member.password_hash
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu hiện tại không đúng")

    member.password_hash = hash_password(payload.new_password)
    db.commit()


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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ thủ quỹ mới có quyền thực hiện thao tác này",
        )
    return current_member


def raise_invalid_credentials() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sai tài khoản hoặc mật khẩu",
        headers={"WWW-Authenticate": "Bearer"},
    )
