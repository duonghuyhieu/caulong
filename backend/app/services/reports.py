from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.fund_transaction import FundTransaction
from app.models.play_session import CostCategory, PlaySessionCostItem
from app.schemas.report import CategoryWallet, CostByCategoryReport


def cost_by_category(db: Session) -> CostByCategoryReport:
    """Moi hang muc la mot 'vi': Da ung (tach quy) / Da dung (qua buoi choi) / Con lai.
    Chi hien cac hang muc dang quan ly (theo thu tu)."""

    # Da ung: tong cac khoan tach quy (category_expense, amount am -> doi dau).
    advanced_rows = db.execute(
        select(
            FundTransaction.category,
            func.coalesce(func.sum(-FundTransaction.amount), 0),
        )
        .where(
            FundTransaction.type == "category_expense",
            FundTransaction.category.is_not(None),
            FundTransaction.voided_at.is_(None),
        )
        .group_by(FundTransaction.category)
    ).all()
    advanced = {cat: int(total) for cat, total in advanced_rows}

    # Da dung: tong chi phi hang muc qua cac buoi choi.
    used_rows = db.execute(
        select(
            PlaySessionCostItem.category,
            func.coalesce(func.sum(PlaySessionCostItem.amount), 0),
        ).group_by(PlaySessionCostItem.category)
    ).all()
    used = {cat: int(total) for cat, total in used_rows}

    managed = db.scalars(
        select(CostCategory).order_by(CostCategory.position, CostCategory.created_at)
    ).all()

    categories = []
    for c in managed:
        a = advanced.get(c.name, 0)
        u = used.get(c.name, 0)
        categories.append(
            CategoryWallet(category=c.name, advanced=a, used=u, remaining=a - u)
        )

    return CostByCategoryReport(
        categories=categories,
        total_advanced=sum(c.advanced for c in categories),
        total_used=sum(c.used for c in categories),
        total_remaining=sum(c.remaining for c in categories),
    )
