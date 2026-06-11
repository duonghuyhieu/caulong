from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.fund_transaction import FundTransaction
from app.models.play_session import CostCategory, PlaySessionCostItem
from app.schemas.cost_category import CostCategoryCreate, CostCategoryUpdate


def category_spend_total(db: Session, name: str) -> int:
    """Tong chi tieu hien tai cua mot hang muc (theo ten): chi phi buoi choi +
    cac dieu chinh tay. Dung de chan xoa khi hang muc chua ve 0."""
    from_sessions = db.scalar(
        select(func.coalesce(func.sum(PlaySessionCostItem.amount), 0)).where(
            PlaySessionCostItem.category == name
        )
    ) or 0
    from_manual = db.scalar(
        select(func.coalesce(func.sum(-FundTransaction.amount), 0)).where(
            FundTransaction.type == "category_expense",
            FundTransaction.category == name,
            FundTransaction.voided_at.is_(None),
        )
    ) or 0
    return int(from_sessions) + int(from_manual)


def list_cost_categories(db: Session) -> list[CostCategory]:
    return list(
        db.scalars(
            select(CostCategory).order_by(CostCategory.position, CostCategory.created_at)
        ).all()
    )


def list_category_names(db: Session) -> list[str]:
    return [c.name for c in list_cost_categories(db)]


def get_category_or_404(db: Session, category_id: str) -> CostCategory:
    category = db.get(CostCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Cost category not found")
    return category


def create_cost_category(db: Session, payload: CostCategoryCreate) -> CostCategory:
    # Them vao cuoi danh sach.
    max_position = db.scalar(select(func.coalesce(func.max(CostCategory.position), -1)))
    category = CostCategory(name=payload.name.strip(), position=(max_position or -1) + 1)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tên hạng mục đã tồn tại")
    db.refresh(category)
    return category


def update_cost_category(
    db: Session, category_id: str, payload: CostCategoryUpdate
) -> CostCategory:
    category = get_category_or_404(db, category_id)
    category.name = payload.name.strip()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tên hạng mục đã tồn tại")
    db.refresh(category)
    return category


def delete_cost_category(db: Session, category_id: str) -> None:
    category = get_category_or_404(db, category_id)
    total = category_spend_total(db, category.name)
    if total != 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Hạng mục còn chi tiêu ({total:,}đ). "
                "Hãy điều chỉnh về 0 trước khi xoá."
            ),
        )
    db.delete(category)
    db.commit()
