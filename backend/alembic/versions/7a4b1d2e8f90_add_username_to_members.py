"""add username to members

Revision ID: 7a4b1d2e8f90
Revises: 3f2b8a7d9c10
Create Date: 2026-05-31 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7a4b1d2e8f90"
down_revision: Union[str, None] = "3f2b8a7d9c10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("members", sa.Column("username", sa.String(length=80), nullable=True))
    op.execute(
        """
        UPDATE members
        SET username = 'member_' || left(id, 8)
        WHERE username IS NULL
        """
    )
    op.alter_column("members", "username", existing_type=sa.String(length=80), nullable=False)
    op.create_index("ix_members_username", "members", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_members_username", table_name="members")
    op.drop_column("members", "username")
