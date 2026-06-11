from datetime import datetime

from pydantic import BaseModel, Field


class CostCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CostCategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CostCategoryRead(BaseModel):
    id: str
    name: str
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}
