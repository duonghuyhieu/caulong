from datetime import datetime

from pydantic import BaseModel, Field


class PlaySessionParticipantCreate(BaseModel):
    member_id: str
    slot_count: int = Field(ge=1, le=10)


class PlaySessionCreate(BaseModel):
    played_at: datetime
    total_cost: int = Field(gt=0)
    participants: list[PlaySessionParticipantCreate] = Field(min_length=1)
    note: str = ""


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


class PlaySessionParticipantRead(BaseModel):
    id: str
    play_session_id: str
    member_id: str
    slot_count: int
    charged_amount: int
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

    model_config = {"from_attributes": True}