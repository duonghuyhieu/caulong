from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.fund_transaction import FundTransaction
from app.models.member import Member
from app.models.play_session import PlaySession
from app.schemas.fund_transaction import (
    CategoryExpenseCreate,
    CommonFundExpenseCreate,
    FundAdjustmentCreate,
    MemberDepositCreate,
)
from app.core.config import get_settings



def common_fund_balance(db: Session) -> int:
    """Quy hien co (tien mat thu quy dang cam) = tien nap + dieu chinh
    - phan bo ngan sach - chi quy - chi quy chung. Buoi choi KHONG dong vao day."""
    return db.scalar(
        select(func.coalesce(func.sum(FundTransaction.amount), 0)).where(
            FundTransaction.type.in_(
                [
                    "member_deposit",
                    "manual_adjustment",
                    "category_expense",
                    "common_fund_expense",
                    "surplus_expense",
                ]
            ),
            FundTransaction.voided_at.is_(None),
        )
    ) or 0


def quy_chung_balance(db: Session) -> int:
    """Quy chung = tien thua lam tron con lai = tong surplus moi tran - da chi quy chung."""
    surplus_income = db.scalar(
        select(func.coalesce(func.sum(PlaySession.surplus_amount), 0))
    ) or 0
    surplus_spent = db.scalar(
        select(func.coalesce(func.sum(FundTransaction.amount), 0)).where(
            FundTransaction.type == "surplus_expense",
            FundTransaction.voided_at.is_(None),
        )
    ) or 0
    # surplus_spent la so am (chi ra) nen cong vao.
    return surplus_income + surplus_spent


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
    """Chi tien cho hoat dong tap the. Khong duoc chi vuot so du cua nguon da chon."""
    if payload.source == "quy_chung":
        balance = quy_chung_balance(db)
        if payload.amount > balance:
            raise HTTPException(
                status_code=400,
                detail=f"Quỹ chung không đủ. Hiện có: {balance}.",
            )
        tx_type = "surplus_expense"
    else:
        balance = common_fund_balance(db)
        if payload.amount > balance:
            raise HTTPException(
                status_code=400,
                detail=f"Quỹ không đủ. Số dư hiện tại: {balance}.",
            )
        tx_type = "common_fund_expense"

    transaction = FundTransaction(
        member_id=None,
        type=tx_type,
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


def spend_category(
    db: Session,
    payload: CategoryExpenseCreate,
    created_by: Member,
) -> FundTransaction:
    """Dieu chinh chi tieu theo hang muc (giong dieu chinh so quy).
    amount duong = them chi (tru quy), am = giam/hoan ve quy. Quy ung truoc nen
    KHONG chan khi so du am."""
    transaction = FundTransaction(
        member_id=None,
        type="category_expense",
        category=payload.category.strip(),
        # amount duong (them chi) -> tru quy (so am). amount am (hoan) -> cong quy.
        amount=-payload.amount,
        balance_after=None,
        description=payload.description.strip(),
        created_by_member_id=created_by.id,
        created_at=payload.paid_at,
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

    # Quy chung = tien thua lam tron con lai (tong surplus moi tran - da chi quy chung).
    total_rounding_surplus_amount = quy_chung_balance(db)

    return {
        "member_total_balance": member_total_balance,
        # common_fund_balance giờ = "Quỹ hiện có" (tiền mặt thủ quỹ đang cầm).
        "common_fund_balance": common_balance,
        # Tổng tiền nhóm = tổng số dư mọi người (= quỹ hiện có + đang ứng ở vendor).
        "total_balance": member_total_balance,
        "active_member_count": active_member_count,
        "low_balance_member_count": low_balance_member_count,
        "total_deposit_amount": total_deposit_amount,
        "total_session_charge_amount": abs(total_session_charge_amount),
        "total_rounding_surplus_amount": total_rounding_surplus_amount,
    }
