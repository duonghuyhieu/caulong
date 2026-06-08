"""Seed du lieu demo cho moi truong local.

Chay trong container backend:
    docker compose -f docker-compose.prod.yml exec backend python seed.py

Hoac chay local trong thu muc backend:
    uv run python seed.py

Idempotent: co the chay lai ma khong tao trung du lieu fake.
"""

from datetime import datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.fund_transaction import FundTransaction
from app.models.member import Member
from app.models.play_session import PlaySession
from app.schemas.fund_transaction import MemberDepositCreate
from app.schemas.member import MemberCreate
from app.schemas.play_session import PlaySessionCreate, PlaySessionParticipantCreate
from app.services.fund_transactions import deposit_member_fund
from app.services.members import create_member
from app.services.play_sessions import create_play_session


TREASURER = {
    "username": "hieu.duong",
    "name": "Hieu Duong",
    "password": "huyhieu93",
    "role": "treasurer",
    "status": "active",
}

FAKE_MARKER = "[fake-seed]"

FAKE_MEMBERS = [
    {
        "username": "minh.nguyen",
        "name": "Minh Nguyen",
        "phone": "0901000001",
        "email": "minh.nguyen@example.com",
    },
    {
        "username": "lan.tran",
        "name": "Lan Tran",
        "phone": "0901000002",
        "email": "lan.tran@example.com",
    },
    {
        "username": "tuan.pham",
        "name": "Tuan Pham",
        "phone": "0901000003",
        "email": "tuan.pham@example.com",
    },
    {
        "username": "hoa.le",
        "name": "Hoa Le",
        "phone": "0901000004",
        "email": "hoa.le@example.com",
    },
    {
        "username": "quang.vo",
        "name": "Quang Vo",
        "phone": "0901000005",
        "email": "quang.vo@example.com",
    },
    {
        "username": "an.do",
        "name": "An Do",
        "phone": "0901000006",
        "email": "an.do@example.com",
    },
    {
        "username": "vy.hoang",
        "name": "Vy Hoang",
        "phone": "0901000007",
        "email": "vy.hoang@example.com",
    },
    {
        "username": "khanh.bui",
        "name": "Khanh Bui",
        "phone": "0901000008",
        "email": "khanh.bui@example.com",
    },
]

DEPOSIT_AMOUNTS = {
    "minh.nguyen": 500_000,
    "lan.tran": 400_000,
    "tuan.pham": 350_000,
    "hoa.le": 450_000,
    "quang.vo": 300_000,
    "an.do": 250_000,
    "vy.hoang": 500_000,
    "khanh.bui": 150_000,
}

SESSION_PLANS = [
    {
        "days_ago": 28,
        "total_cost": 420_000,
        "participants": ["minh.nguyen", "lan.tran", "tuan.pham", "hoa.le", "quang.vo", "vy.hoang"],
        "note": "San 2h + cau Aeroplane",
    },
    {
        "days_ago": 21,
        "total_cost": 460_000,
        "participants": ["minh.nguyen", "lan.tran", "hoa.le", "an.do", "vy.hoang", "khanh.bui"],
        "note": "San 2h, them 1 hop cau",
    },
    {
        "days_ago": 14,
        "total_cost": 390_000,
        "participants": ["minh.nguyen", "tuan.pham", "hoa.le", "quang.vo", "an.do"],
        "note": "Buoi giua tuan",
    },
    {
        "days_ago": 7,
        "total_cost": 520_000,
        "participants": [
            "minh.nguyen",
            "lan.tran",
            "tuan.pham",
            "hoa.le",
            "quang.vo",
            "an.do",
            "vy.hoang",
            "khanh.bui",
        ],
        "note": "Dong du thanh vien",
    },
]


def get_member_by_username(db, username: str) -> Member | None:
    return db.scalar(select(Member).where(Member.username == username))


def ensure_member(db, payload: dict) -> Member:
    existing = get_member_by_username(db, payload["username"])
    if existing is not None:
        print(f"= member: {existing.username}")
        return existing

    member = create_member(
        db,
        MemberCreate(
            username=payload["username"],
            name=payload["name"],
            phone=payload.get("phone"),
            email=payload.get("email"),
            password="password123",
            role=payload.get("role", "player"),
            status=payload.get("status", "active"),
        ),
    )
    print(f"+ member: {member.username}")
    return member


def ensure_deposit(db, member: Member, amount: int, treasurer: Member) -> None:
    description = f"{FAKE_MARKER} Nap quy demo cho {member.name}"
    existing = db.scalar(
        select(FundTransaction).where(
            FundTransaction.member_id == member.id,
            FundTransaction.type == "member_deposit",
            FundTransaction.description == description,
            FundTransaction.voided_at.is_(None),
        )
    )
    if existing is not None:
        print(f"= deposit: {member.username}")
        return

    deposit_member_fund(
        db,
        MemberDepositCreate(
            member_id=member.id,
            amount=amount,
            description=description,
        ),
        created_by=treasurer,
    )
    print(f"+ deposit: {member.username} {amount:,} VND")


def ensure_play_session(db, plan: dict, members_by_username: dict[str, Member], treasurer: Member) -> None:
    played_at = (datetime.utcnow() - timedelta(days=plan["days_ago"])).replace(
        hour=19,
        minute=30,
        second=0,
        microsecond=0,
    )
    note = f"{FAKE_MARKER} {plan['note']}"
    existing = db.scalar(select(PlaySession).where(PlaySession.note == note))
    if existing is not None:
        print(f"= session: {played_at.date().isoformat()}")
        return

    create_play_session(
        db,
        PlaySessionCreate(
            played_at=played_at,
            total_cost=plan["total_cost"],
            note=note,
            participants=[
                PlaySessionParticipantCreate(
                    member_id=members_by_username[username].id,
                    slot_count=1,
                )
                for username in plan["participants"]
            ],
        ),
        created_by=treasurer,
    )
    print(f"+ session: {played_at.date().isoformat()} {plan['total_cost']:,} VND")


def seed() -> None:
    db = SessionLocal()
    try:
        treasurer = get_member_by_username(db, TREASURER["username"])
        if treasurer is None:
            treasurer = create_member(db, MemberCreate(**TREASURER))
            print(f"+ treasurer: {treasurer.username}  (role={treasurer.role})")
        else:
            print(f"= treasurer: {treasurer.username}")

        members_by_username = {
            payload["username"]: ensure_member(db, payload)
            for payload in FAKE_MEMBERS
        }

        for username, amount in DEPOSIT_AMOUNTS.items():
            ensure_deposit(db, members_by_username[username], amount, treasurer)

        for plan in SESSION_PLANS:
            ensure_play_session(db, plan, members_by_username, treasurer)

        print("Seed xong.")
        print("Dang nhap thu quy: hieu.duong / huyhieu93")
        print("Dang nhap member fake: <username> / password123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
