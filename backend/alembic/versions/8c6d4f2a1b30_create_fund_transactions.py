"""create fund transactions

Revision ID: 8c6d4f2a1b30
Revises: 7a4b1d2e8f90
Create Date: 2026-05-31 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c6d4f2a1b30"
down_revision: Union[str, None] = "7a4b1d2e8f90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fund_transactions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("member_id", sa.String(length=32), nullable=True),
        sa.Column("play_session_id", sa.String(length=32), nullable=True),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_by_member_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("voided_at", sa.DateTime(), nullable=True),
        sa.Column("void_reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_member_id"], ["members.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fund_transactions_created_by_member_id", "fund_transactions", ["created_by_member_id"])
    op.create_index("ix_fund_transactions_member_id", "fund_transactions", ["member_id"])
    op.create_index("ix_fund_transactions_play_session_id", "fund_transactions", ["play_session_id"])
    op.create_index("ix_fund_transactions_type", "fund_transactions", ["type"])


def downgrade() -> None:
    op.drop_index("ix_fund_transactions_type", table_name="fund_transactions")
    op.drop_index("ix_fund_transactions_play_session_id", table_name="fund_transactions")
    op.drop_index("ix_fund_transactions_member_id", table_name="fund_transactions")
    op.drop_index("ix_fund_transactions_created_by_member_id", table_name="fund_transactions")
    op.drop_table("fund_transactions")
