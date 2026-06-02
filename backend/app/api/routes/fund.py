from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.services.auth import get_current_member, require_treasurer
from app.services.fund_transactions import (
    adjust_member_fund,
    deposit_member_fund,
    get_fund_summary,
    list_fund_transactions,
    spend_common_fund,
)
from app.schemas.fund_transaction import (
    CommonFundExpenseCreate,
    FundAdjustmentCreate,
    FundSummaryRead,
    FundTransactionRead,
    MemberDepositCreate,
)

router = APIRouter(prefix="/fund", tags=["fund"])

@router.get("/transactions", response_model=list[FundTransactionRead])
def list_fund_transactions_endpoint(
    member_id: str | None = None,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return list_fund_transactions(db, member_id=member_id)


@router.post("/deposits", response_model=FundTransactionRead, status_code=201)
def deposit_member_fund_endpoint(
    payload: MemberDepositCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return deposit_member_fund(db, payload, current_member)


@router.post("/adjustments", response_model=FundTransactionRead, status_code=201)
def adjust_member_fund_endpoint(
    payload: FundAdjustmentCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return adjust_member_fund(db, payload, current_member)


@router.post("/common-expense", response_model=FundTransactionRead, status_code=201)
def spend_common_fund_endpoint(
    payload: CommonFundExpenseCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return spend_common_fund(db, payload, current_member)


@router.get("/summary", response_model=FundSummaryRead)
def get_fund_summary_endpoint(
    db: Session = Depends(get_db),
    current_member: Member = Depends(get_current_member),
):
    return get_fund_summary(db)