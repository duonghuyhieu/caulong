from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.fund_transaction import FundTransaction
from app.models.member import Member
from app.schemas.fund_transaction import (
    CommonFundExpenseCreate,
    FundAdjustmentCreate,
    MemberDepositCreate,
)
from app.core.config import get_settings



def common_fund_balance(db: Session) -> int:
    """So du quy chung = tong cac giao dich khong gan thanh vien (chua bi huy)."""
    return db.scalar(
        select(func.coalesce(func.sum(FundTransaction.amount), 0)).where(
            FundTransaction.member_id.is_(None),
            FundTransaction.voided_at.is_(None),
        )
    ) or 0


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


def adjust_member_fund(
    db: Session,
    payload: FundAdjustmentCreate,
    created_by: Member,
) -> FundTransaction:
    member = get_member_or_404(db, payload.member_id)

    member.balance += payload.amount

    transaction = FundTransaction(
        member_id=member.id,
        type="manual_adjustment",
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


def spend_common_fund(
    db: Session,
    payload: CommonFundExpenseCreate,
    created_by: Member,
) -> FundTransaction:
    """Chi tien tu quy chung cho hoat dong tap the. Khong duoc chi vuot so du."""
    balance = common_fund_balance(db)

    if payload.amount > balance:
        raise HTTPException(
            status_code=400,
            detail=f"Quỹ chung không đủ. Số dư hiện tại: {balance}.",
        )

    transaction = FundTransaction(
        member_id=None,
        type="common_fund_expense",
        amount=-payload.amount,
        balance_after=None,
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


def get_fund_summary(db: Session) -> dict:
    settings = get_settings()

    member_total_balance = db.scalar(select(func.coalesce(func.sum(Member.balance), 0))) or 0

    common_balance = common_fund_balance(db)

    active_member_count = db.scalar(
        select(func.count()).select_from(Member).where(Member.status == "active")
    ) or 0

    low_balance_member_count = db.scalar(
        select(func.count())
        .select_from(Member)
        .where(
            Member.status == "active",
            Member.balance <= settings.low_balance_threshold,
        )
    ) or 0

    total_deposit_amount = db.scalar(
        select(func.coalesce(func.sum(FundTransaction.amount), 0)).where(
            FundTransaction.type == "member_deposit",
            FundTransaction.voided_at.is_(None),
        )
    ) or 0

    total_session_charge_amount = db.scalar(
        select(func.coalesce(func.sum(FundTransaction.amount), 0)).where(
            FundTransaction.type == "session_charge",
            FundTransaction.voided_at.is_(None),
        )
    ) or 0

    total_rounding_surplus_amount = db.scalar(
        select(func.coalesce(func.sum(FundTransaction.amount), 0)).where(
            FundTransaction.type == "rounding_surplus",
            FundTransaction.voided_at.is_(None),
        )
    ) or 0

    return {
        "member_total_balance": member_total_balance,
        "common_fund_balance": common_balance,
        "total_balance": member_total_balance + common_balance,
        "active_member_count": active_member_count,
        "low_balance_member_count": low_balance_member_count,
        "total_deposit_amount": total_deposit_amount,
        "total_session_charge_amount": abs(total_session_charge_amount),
        "total_rounding_surplus_amount": total_rounding_surplus_amount,
    }
