from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.member import Member
from app.schemas.report import CostByCategoryReport
from app.services.auth import require_treasurer
from app.services.reports import cost_by_category


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/cost-by-category", response_model=CostByCategoryReport)
def cost_by_category_endpoint(
    db: Session = Depends(get_db),
    current_member: Member = Depends(require_treasurer),
):
    """Vi theo hang muc: da ung / da dung / con lai."""
    return cost_by_category(db)
