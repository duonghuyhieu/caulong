from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberRead, MemberUpdate
from app.services.auth import get_current_member, require_treasurer
from app.services.members import (
    create_member,
    get_member,
    list_members,
    update_member,
)


router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=list[MemberRead])
def list_members_endpoint(
    db: Session = Depends(get_db),
    current_member: Member = Depends(get_current_member),
):
    return list_members(db)


@router.post("", response_model=MemberRead, status_code=201)
def create_member_endpoint(
    payload: MemberCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return create_member(db, payload)


@router.get("/{member_id}", response_model=MemberRead)
def get_member_endpoint(
    member_id: str,
    db: Session = Depends(get_db),
    current_member: Member = Depends(get_current_member),
):
    return get_member(db, member_id)


@router.put("/{member_id}", response_model=MemberRead)
def update_member_endpoint(
    member_id: str,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return update_member(db, member_id, payload)
