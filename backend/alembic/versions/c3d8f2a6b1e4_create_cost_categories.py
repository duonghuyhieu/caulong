"""create cost categories

Revision ID: c3d8f2a6b1e4
Revises: b2c9e1f4a7d0
Create Date: 2026-06-11 01:00:00.000000
"""

from datetime import datetime
from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "c3d8f2a6b1e4"
down_revision: Union[str, None] = "b2c9e1f4a7d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_CATEGORIES = ["Tiền sân", "Tiền cầu", "Tiền nước"]


def upgrade() -> None:
    cost_categories = op.create_table(
        "cost_categories",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    # Seed cac hang muc mac dinh (truoc day cau hinh o .env).
    now = datetime.utcnow()
    op.bulk_insert(
        cost_categories,
        [
            {"id": uuid4().hex, "name": name, "position": i, "created_at": now}
            for i, name in enumerate(DEFAULT_CATEGORIES)
        ],
    )


def downgrade() -> None:
    op.drop_table("cost_categories")
