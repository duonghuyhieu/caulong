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
