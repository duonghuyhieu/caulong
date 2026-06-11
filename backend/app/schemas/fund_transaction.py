from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


FundTransactionType = Literal[
    "member_deposit",
    "session_charge",
    "rounding_surplus",
    "manual_adjustment",
    "session_refund",
    "common_fund_expense",
    "session_payment",
    "session_expense",
    "category_expense",
]


class MemberDepositCreate(BaseModel):
    member_id: str
    amount: int = Field(gt=0)
    description: str = Field(min_length=1, max_length=500)


class CommonFundExpenseCreate(BaseModel):
    """Chi tien tu quy chung cho hoat dong tap the (amount > 0 la so tien chi ra)."""

    amount: int = Field(gt=0)
    description: str = Field(min_length=1, max_length=500)


class CategoryExpenseCreate(BaseModel):
    """Dieu chinh chi tieu theo hang muc (giong dieu chinh so quy).
    amount: duong = them chi (tru quy), am = giam/hoan ve quy. Quy co the am."""

    category: str = Field(min_length=1, max_length=120)
    amount: int = Field(description="Duong = them chi, am = giam/hoan. Khong duoc bang 0.")
    paid_at: datetime
    description: str = Field(min_length=1, max_length=500)

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("amount khong duoc bang 0")
        return value


class FundAdjustmentCreate(BaseModel):
    member_id: str
    amount: int = Field(description="Duong la cong them, am la tru bot. Khong duoc bang 0.")
    description: str = Field(min_length=1, max_length=500)

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("amount khong duoc bang 0")
        return value


class FundTransactionRead(BaseModel):
    id: str
    member_id: str | None
    play_session_id: str | None
    type: FundTransactionType
    category: str | None = None
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

