from datetime import datetime

from pydantic import BaseModel, Field


class PlaySessionParticipantCreate(BaseModel):
    member_id: str
    slot_count: int = Field(ge=1, le=10)


class CostItemCreate(BaseModel):
    """Mot dong chi phi nhap vao khi tao buoi (vd: Tien san = 120000)."""

    category: str = Field(min_length=1, max_length=120)
    amount: int = Field(gt=0)


class PlaySessionCreate(BaseModel):
    played_at: datetime
    # Tong chi phi = tong cac cost_items. Phai co it nhat 1 dong > 0.
    cost_items: list[CostItemCreate] = Field(min_length=1)
    participants: list[PlaySessionParticipantCreate] = Field(min_length=1)
    note: str = ""


class CostItemRead(BaseModel):
    category: str
    amount: int


class PlaySessionParticipantPreview(BaseModel):
    member_id: str
    slot_count: int
    charged_amount: int


class PlaySessionPreview(BaseModel):
    total_cost: int
    total_slots: int
    cost_per_slot: int
    total_charged: int
    surplus_amount: int
    participants: list[PlaySessionParticipantPreview]
    cost_items: list[CostItemRead] = []


class PlaySessionParticipantRead(BaseModel):
    id: str
    play_session_id: str
    member_id: str
    slot_count: int
    charged_amount: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PlaySessionCostItemRead(BaseModel):
    id: str
    play_session_id: str
    category: str
    amount: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PlaySessionRead(BaseModel):
    id: str
    played_at: datetime
    total_cost: int
    total_slots: int
    cost_per_slot: int
    total_charged: int
    surplus_amount: int
    status: str
    note: str
    created_by_member_id: str | None
    created_at: datetime
    updated_at: datetime
    participants: list[PlaySessionParticipantRead] = []
    cost_items: list[PlaySessionCostItemRead] = []

    model_config = {"from_attributes": True}
