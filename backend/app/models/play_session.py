from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlaySession(Base):
    __tablename__ = "play_sessions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: uuid4().hex,
    )
    played_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    total_slots: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_per_slot: Mapped[int] = mapped_column(Integer, nullable=False)
    total_charged: Mapped[int] = mapped_column(Integer, nullable=False)
    surplus_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="closed")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by_member_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("members.id"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    participants: Mapped[list["PlaySessionParticipant"]] = relationship(
    back_populates="session",
    cascade="all, delete-orphan",
    )
    cost_items: Mapped[list["PlaySessionCostItem"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class PlaySessionParticipant(Base):
    __tablename__ = "play_session_participants"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: uuid4().hex,
    )
    play_session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("play_sessions.id"),
        nullable=False,
        index=True,
    )
    member_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("members.id"),
        nullable=False,
        index=True,
    )
    slot_count: Mapped[int] = mapped_column(Integer, nullable=False)
    charged_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    session: Mapped["PlaySession"] = relationship(back_populates="participants")


class CostCategory(Base):
    """Hang muc chi phi quan ly duoc (them/sua/xoa). Dung de dien san vao form
    tao buoi. Buoi cu luu category theo ten (string) nen doi ten o day khong
    hoi to lai du lieu cu."""

    __tablename__ = "cost_categories"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: uuid4().hex,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class PlaySessionCostItem(Base):
    """Mot dong chi phi cua buoi choi (vd: tien san, tien cau, tien nuoc).

    Tong cac dong = total_cost cua buoi. Chi de theo doi tien di dau; khong
    anh huong cach chia tien (van chia theo slot tren tong).
    """

    __tablename__ = "play_session_cost_items"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: uuid4().hex,
    )
    play_session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("play_sessions.id"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    session: Mapped["PlaySession"] = relationship(back_populates="cost_items")
