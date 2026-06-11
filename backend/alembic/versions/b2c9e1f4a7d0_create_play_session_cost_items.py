"""create play session cost items

Revision ID: b2c9e1f4a7d0
Revises: 3a1da6d3c91e
Create Date: 2026-06-11 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c9e1f4a7d0"
down_revision: Union[str, None] = "3a1da6d3c91e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "play_session_cost_items",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("play_session_id", sa.String(length=32), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["play_session_id"], ["play_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_play_session_cost_items_play_session_id"),
        "play_session_cost_items",
        ["play_session_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_play_session_cost_items_play_session_id"),
        table_name="play_session_cost_items",
    )
    op.drop_table("play_session_cost_items")
