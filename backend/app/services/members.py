from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberStatusUpdate, MemberUpdate


def list_members(db: Session) -> list[Member]:
    statement = select(Member).order_by(Member.created_at.asc())
    return list(db.scalars(statement).all())


def get_member(db: Session, member_id: str) -> Member:
    member = db.get(Member, member_id)

    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    return member


def raise_member_integrity_error(error: IntegrityError) -> None:
    error_text = str(error.orig)

    if "member_email_key" in error_text:
        detail = "Email already exists"
    elif "ix_members_username" in error_text:
        detail = "Username already exists"
    else:
        detail = "Member data conflicts with existing data"

    raise HTTPException(status_code=400, detail=detail)


def create_member(db: Session, payload: MemberCreate) -> Member:
    member = Member(
        username=payload.username,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=payload.status,
    )

    db.add(member)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise_member_integrity_error(error)

    db.refresh(member)

    return member


def update_member(db: Session, member_id: str, payload: MemberUpdate) -> Member:
    member = get_member(db, member_id)

    member.username = payload.username
    member.name = payload.name
    member.phone = payload.phone
    member.email = payload.email
    member.role = payload.role
    member.status = payload.status

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise_member_integrity_error(error)

    db.refresh(member)

    return member


def update_member_status(
    db: Session, member_id: str, payload: MemberStatusUpdate
) -> Member:
    member = get_member(db, member_id)

    member.status = payload.status

    db.commit()
    db.refresh(member)

    return member
