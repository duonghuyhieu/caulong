from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


FundTransactionType = Literal[
    "member_deposit",
    "session_charge",
    "guest_collection",
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

    model_config = {"from_attributes": True}
