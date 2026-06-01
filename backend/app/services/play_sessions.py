from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.fund_transaction import FundTransaction
from app.models.member import Member
from app.models.play_session import PlaySession, PlaySessionParticipant
from app.schemas.play_session import (
    PlaySessionCreate,
    PlaySessionParticipantPreview,
    PlaySessionPreview,
)


def round_up_money(value: int, unit: int) -> int:
    return ((value + unit - 1) // unit) * unit


def preview_play_session(db: Session, payload: PlaySessionCreate) -> PlaySessionPreview:
    if not payload.participants:
        raise HTTPException(status_code=400, detail="Participants are required")

    member_ids = [participant.member_id for participant in payload.participants]

    if len(member_ids) != len(set(member_ids)):
        raise HTTPException(status_code=400, detail="Duplicate member in participants")

    members = db.scalars(
        select(Member).where(
            Member.id.in_(member_ids),
            Member.status == "active",
        )
    ).all()

    if len(members) != len(member_ids):
        raise HTTPException(status_code=400, detail="Invalid or inactive member in participants")

    settings = get_settings()
    total_slots = sum(participant.slot_count for participant in payload.participants)

    if total_slots <= 0:
        raise HTTPException(status_code=400, detail="Total slots must be greater than 0")

    cost_per_slot = round_up_money(
        payload.total_cost // total_slots
        if payload.total_cost % total_slots == 0
        else payload.total_cost // total_slots + 1,
        settings.money_rounding_unit,
    )

    participant_previews = [
        PlaySessionParticipantPreview(
            member_id=participant.member_id,
            slot_count=participant.slot_count,
            charged_amount=cost_per_slot * participant.slot_count,
        )
        for participant in payload.participants
    ]

    total_charged = sum(participant.charged_amount for participant in participant_previews)

    return PlaySessionPreview(
        total_cost=payload.total_cost,
        total_slots=total_slots,
        cost_per_slot=cost_per_slot,
        total_charged=total_charged,
        surplus_amount=total_charged - payload.total_cost,
        participants=participant_previews,
    )


def create_play_session(
    db: Session,
    payload: PlaySessionCreate,
    created_by: Member,
) -> PlaySession:
    preview = preview_play_session(db, payload)

    session = PlaySession(
        played_at=payload.played_at,
        total_cost=payload.total_cost,
        total_slots=preview.total_slots,
        cost_per_slot=preview.cost_per_slot,
        total_charged=preview.total_charged,
        surplus_amount=preview.surplus_amount,
        status="closed",
        note=payload.note,
        created_by_member_id=created_by.id,
    )

    db.add(session)
    db.flush()

    members_by_id = {
        member.id: member
        for member in db.scalars(
            select(Member).where(Member.id.in_([item.member_id for item in payload.participants]))
        ).all()
    }

    for participant_preview in preview.participants:
        member = members_by_id[participant_preview.member_id]
        member.balance -= participant_preview.charged_amount

        db.add(
            PlaySessionParticipant(
                play_session_id=session.id,
                member_id=member.id,
                slot_count=participant_preview.slot_count,
                charged_amount=participant_preview.charged_amount,
            )
        )

        db.add(
            FundTransaction(
                member_id=member.id,
                play_session_id=session.id,
                type="session_charge",
                amount=-participant_preview.charged_amount,
                balance_after=member.balance,
                description=f"Tru tien buoi choi {payload.played_at.date().isoformat()}",
                created_by_member_id=created_by.id,
            )
        )

    if preview.surplus_amount > 0:
        db.add(
            FundTransaction(
                member_id=None,
                play_session_id=session.id,
                type="rounding_surplus",
                amount=preview.surplus_amount,
                balance_after=None,
                description=f"Du quy do lam tron buoi choi {payload.played_at.date().isoformat()}",
                created_by_member_id=created_by.id,
            )
        )

    db.commit()

    return get_play_session(db, session.id)


def list_play_sessions(db: Session) -> list[PlaySession]:
    return list(
        db.scalars(
            select(PlaySession)
            .options(selectinload(PlaySession.participants))
            .order_by(PlaySession.played_at.desc())
        ).all()
    )


def get_play_session(db: Session, play_session_id: str) -> PlaySession:
    session = db.scalar(
        select(PlaySession)
        .options(selectinload(PlaySession.participants))
        .where(PlaySession.id == play_session_id)
    )

    if session is None:
        raise HTTPException(status_code=404, detail="Play session not found")

    return session
