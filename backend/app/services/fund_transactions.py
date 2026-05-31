from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.fund_transaction import FundTransaction
from app.models.member import Member
from app.schemas.fund_transaction import MemberDepositCreate


def get_member_or_404(db: Session, member_id: str) -> Member:
    member = db.get(Member, member_id)

    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    return member


def deposit_member_fund(
    db: Session,
    payload: MemberDepositCreate,
    created_by: Member,
) -> FundTransaction:
    member = get_member_or_404(db, payload.member_id)

    member.balance += payload.amount

    transaction = FundTransaction(
        member_id=member.id,
        type="member_deposit",
        amount=payload.amount,
        balance_after=member.balance,
        description=payload.description,
        created_by_member_id=created_by.id,
    )

    db.add(transaction)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid fund transaction data")

    db.refresh(transaction)

    return transaction


def list_fund_transactions(
    db: Session,
    member_id: str | None = None,
) -> list[FundTransaction]:
    statement = select(FundTransaction)

    if member_id is not None:
        get_member_or_404(db, member_id)
        statement = statement.where(FundTransaction.member_id == member_id)

    statement = statement.order_by(FundTransaction.created_at.desc())

    return list(db.scalars(statement).all())
