"""rename member table to members

Revision ID: 3f2b8a7d9c10
Revises: 0906a255f91f
Create Date: 2026-05-31 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "3f2b8a7d9c10"
down_revision: Union[str, None] = "0906a255f91f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("member", "members")


def downgrade() -> None:
    op.rename_table("members", "member")
