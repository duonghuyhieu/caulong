from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


FundTransactionType = Literal[
    "member_deposit",
    "session_charge",
    "rounding_surplus",
    "manual_adjustment",
    "session_refund",
]


class MemberDepositCreate(BaseModel):
    member_id: str
    amount: int = Field(gt=0)
    description: str = Field(min_length=1, max_length=500)


class FundTransactionRead(BaseModel):
    id: str
    member_id: str | None
    play_session_id: str | None
    type: FundTransactionType
    amount: int
    balance_after: int | None
    description: str
    created_by_member_id: str | None
    created_at: datetime
    voided_at: datetime | None
    void_reason: str | None


class FundSummaryRead(BaseModel):
    member_total_balance: int
    common_fund_balance: int
    total_balance: int
    active_member_count: int
    low_balance_member_count: int
    total_deposit_amount: int
    total_session_charge_amount: int
    total_rounding_surplus_amount: int

    model_config = {"from_attributes": True}

