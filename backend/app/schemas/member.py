from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


MemberRole = Literal["player", "treasurer"]
MemberStatus = Literal["active", "inactive"]


class MemberBase(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    role: MemberRole = "player"
    status: MemberStatus = "active"


class MemberCreate(MemberBase):
    password: str = Field(min_length=8, max_length=128)


class MemberUpdate(MemberBase):
    pass


class MemberRead(MemberBase):
    id: str
    balance: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
