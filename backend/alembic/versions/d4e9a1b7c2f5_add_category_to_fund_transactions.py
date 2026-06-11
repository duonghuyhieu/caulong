"""add category to fund transactions

Revision ID: d4e9a1b7c2f5
Revises: c3d8f2a6b1e4
Create Date: 2026-06-11 02:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e9a1b7c2f5"
down_revision: Union[str, None] = "c3d8f2a6b1e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "fund_transactions",
        sa.Column("category", sa.String(length=120), nullable=True),
    )
    op.create_index(
        op.f("ix_fund_transactions_category"),
        "fund_transactions",
        ["category"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_fund_transactions_category"), table_name="fund_transactions")
    op.drop_column("fund_transactions", "category")
