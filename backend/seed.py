"""Seed toi thieu: chi tao 1 tai khoan thu quy.

Chay trong container backend:
    docker compose -f docker-compose.prod.yml exec backend python seed.py

Idempotent: neu da co user thu quy thi bo qua (khong tao trung).
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.member import Member
from app.schemas.member import MemberCreate
from app.services.members import create_member


TREASURER = {
    "username": "hieu.duong",
    "name": "Hieu Duong",
    "password": "huyhieu93",
    "role": "treasurer",
    "status": "active",
}


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(Member).where(Member.username == TREASURER["username"]))
        if existing is not None:
            print(f"Da co user '{TREASURER['username']}'. Bo qua.")
            return

        member = create_member(db, MemberCreate(**TREASURER))
        print(f"+ treasurer: {member.username}  (role={member.role})")
        print("Seed xong. Dang nhap bang: hieu.duong / huyhieu93")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
