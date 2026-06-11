from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.cost_category import (
    CostCategoryCreate,
    CostCategoryRead,
    CostCategoryUpdate,
)
from app.services.auth import get_current_member, require_treasurer
from app.services.cost_categories import (
    create_cost_category,
    delete_cost_category,
    list_cost_categories,
    update_cost_category,
)


router = APIRouter(prefix="/cost-categories", tags=["cost-categories"])


@router.get("", response_model=list[CostCategoryRead])
def list_cost_categories_endpoint(
    db: Session = Depends(get_db),
    current_member: Member = Depends(get_current_member),
):
    return list_cost_categories(db)


@router.post("", response_model=CostCategoryRead, status_code=201)
def create_cost_category_endpoint(
    payload: CostCategoryCreate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return create_cost_category(db, payload)


@router.put("/{category_id}", response_model=CostCategoryRead)
def update_cost_category_endpoint(
    category_id: str,
    payload: CostCategoryUpdate,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    return update_cost_category(db, category_id, payload)


@router.delete("/{category_id}", status_code=204)
def delete_cost_category_endpoint(
    category_id: str,
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    delete_cost_category(db, category_id)
