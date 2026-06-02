"""Seed du lieu fake de test nhanh.

Chay tu thu muc backend:
    uv run python seed.py

Idempotent: neu da co user "treasurer" thi bo qua, khong tao trung.
Tai dung lai cac service that (members / fund / play_sessions) de balance
va fund_transactions luon dung voi nghiep vu.
"""

from datetime import datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.member import Member
from app.schemas.fund_transaction import FundAdjustmentCreate, MemberDepositCreate
from app.schemas.member import MemberCreate
from app.schemas.play_session import PlaySessionCreate, PlaySessionParticipantCreate
from app.services.fund_transactions import adjust_member_fund, deposit_member_fund
from app.services.members import create_member
from app.services.play_sessions import create_play_session


TREASURER = {
    "username": "treasurer",
    "name": "Anh Thu Quy",
    "phone": "0900000000",
    "email": "treasurer@example.com",
    "password": "password123",
    "role": "treasurer",
    "status": "active",
}

PLAYERS = [
    {"username": "hieu", "name": "Hieu", "email": "hieu@example.com"},
    {"username": "minh", "name": "Minh", "email": "minh@example.com"},
    {"username": "nam", "name": "Nam", "email": "nam@example.com"},
    {"username": "lan", "name": "Lan", "email": "lan@example.com"},
    {"username": "khoa", "name": "Khoa (nghi)", "email": "khoa@example.com", "status": "inactive"},
]

DEFAULT_PASSWORD = "password123"


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(Member).where(Member.username == TREASURER["username"]))
        if existing is not None:
            print("Da co du lieu seed (user 'treasurer' ton tai). Bo qua.")
            return

        # 1. Thu quy (account de login test)
        treasurer = create_member(db, MemberCreate(**TREASURER))
        print(f"+ treasurer: {treasurer.username} / {TREASURER['password']}  (role={treasurer.role})")

        # 2. Nguoi choi
        members: dict[str, Member] = {}
        for player in PLAYERS:
            member = create_member(
                db,
                MemberCreate(
                    username=player["username"],
                    name=player["name"],
                    email=player.get("email"),
                    password=DEFAULT_PASSWORD,
                    role="player",
                    status=player.get("status", "active"),
                ),
            )
            members[member.username] = member
            print(f"+ player: {member.username}  (status={member.status})")

        # 3. Nop quy cho mot so nguoi
        deposits = {"hieu": 500000, "minh": 300000, "nam": 300000, "lan": 200000}
        for username, amount in deposits.items():
            deposit_member_fund(
                db,
                MemberDepositCreate(
                    member_id=members[username].id,
                    amount=amount,
                    description="Nop quy thang 6",
                ),
                created_by=treasurer,
            )
            print(f"  nop quy {username}: +{amount:,}")

        # 4. Mot buoi choi da chot (tru tien tu dong + tao transaction)
        session = create_play_session(
            db,
            PlaySessionCreate(
                played_at=datetime.utcnow() - timedelta(days=2),
                total_cost=600000,
                note="Buoi toi thu 5",
                participants=[
                    PlaySessionParticipantCreate(member_id=members["hieu"].id, slot_count=3),
                    PlaySessionParticipantCreate(member_id=members["minh"].id, slot_count=2),
                    PlaySessionParticipantCreate(member_id=members["nam"].id, slot_count=1),
                ],
            ),
            created_by=treasurer,
        )
        print(
            f"  buoi choi: total={session.total_cost:,} "
            f"cost_per_slot={session.cost_per_slot:,} surplus={session.surplus_amount:,}"
        )

        # 5. Mot dieu chinh thu cong (vi du: nhap sai, tru bot 20.000 cua lan)
        adjust_member_fund(
            db,
            FundAdjustmentCreate(
                member_id=members["lan"].id,
                amount=-20000,
                description="Dieu chinh: tru tien nhap nham",
            ),
            created_by=treasurer,
        )
        print("  dieu chinh lan: -20,000")

        print("\nSeed xong. Login bang: treasurer / password123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
