from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.fund_transaction import FundTransactionRead, MemberDepositCreate
from app.services.auth import require_treasurer
from app.services.fund_transactions import deposit_member_fund, list_fund_transactions


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
