# 06. Backend Implementation Plan

Day la ke hoach lam rieng backend. Moi phan se lam xong, chay test duoc, roi moi sang phan tiep theo.

## BE-00: Base project

Muc tieu:

- FastAPI app chay duoc.
- Co `/health`.
- Co cau truc thu muc ro rang.
- Co config `.env`.
- Co PostgreSQL chay bang Docker.
- Co Alembic migration setup.

Trang thai hien tai: da tao.

File quan trong:

```text
backend/app/main.py
backend/app/core/config.py
backend/app/api/router.py
backend/app/api/routes/health.py
backend/app/db/base.py
backend/app/db/session.py
backend/app/db/init_db.py
backend/alembic.ini
backend/alembic/env.py
docker-compose.yml
```

Lenh chay voi `uv`:

```bash
docker compose up -d postgres
cd backend
uv sync
Copy-Item .env.example .env -Force
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Kiem tra:

```text
http://localhost:8000/health
http://localhost:8000/api/health
http://localhost:8000/docs
```

Ghi chu:

- Khong dung `Base.metadata.create_all()` de quan ly schema.
- Moi thay doi database phai tao migration bang Alembic.
- Deploy server se chay `uv run alembic upgrade head` truoc khi start app.

## BE-01: Members

Muc tieu:

- Tao bang `members`.
- Tao migration `members`.
- Tao API them thanh vien.
- Tao API lay danh sach thanh vien.
- Tao API sua thanh vien.

Bang:

```text
members
- id
- name
- role
- status
- balance
- created_at
- updated_at
```

API:

```text
GET  /api/members
POST /api/members
GET  /api/members/{id}
PUT  /api/members/{id}
```

File se tao:

```text
backend/app/models/member.py
backend/app/schemas/member.py
backend/app/services/members.py
backend/app/api/routes/members.py
```

Lenh migration sau khi tao model:

```bash
uv run alembic revision --autogenerate -m "create members"
uv run alembic upgrade head
```

## BE-02: Fund transactions

Muc tieu:

- Tao so quy.
- Ghi nhan nop quy.
- Moi thay doi tien deu co transaction.

Bang:

```text
fund_transactions
- id
- member_id
- type
- amount
- note
- created_at
```

API:

```text
GET  /api/fund/summary
GET  /api/fund/transactions
POST /api/fund/contributions
POST /api/fund/adjustments
```

Rule:

- `amount > 0`: tien vao.
- `amount < 0`: tien ra.
- Khi nop quy, tang `members.balance`.
- Khi dieu chinh, cap nhat `members.balance` va ghi transaction.
- Transaction types dung:
  - `member_deposit`
  - `session_charge`
  - `guest_collection`
  - `manual_adjustment`
  - `session_refund`

## BE-03: Play session preview

Muc tieu:

- Chua chot buoi.
- Chi tinh thu xem moi thanh vien se bi tru bao nhieu.

API:

```text
POST /api/play-sessions/preview
```

Body:

```json
{
  "total_cost": 600000,
  "participants": [
    {
      "member_id": "member-1",
      "slot_count": 1
    },
    {
      "member_id": "member-2",
      "slot_count": 2
    }
  ]
}
```

Cong thuc:

```text
total_slots = sum(slot_count)
cost_per_slot = ceil(total_cost / total_slots, lam tron len theo 1.000)
charged_amount cua tung member = cost_per_slot * slot_count
total_charged = sum(charged_amount)
surplus = total_charged - total_cost
```

## BE-04: Close play session

Muc tieu:

- Tao buoi choi thuc te.
- Luu thanh vien tham gia va slot_count cua tung nguoi.
- Tru tien quy tung thanh vien.
- Ghi fund transaction cho tung nguoi.

Bang:

```text
play_sessions
play_session_participants
```

API:

```text
POST /api/play-sessions
GET  /api/play-sessions
GET  /api/play-sessions/{id}
```

## BE-05: Auth and permission

Lam sau khi nghiep vu chinh on.

Muc tieu:

- Dang nhap.
- JWT.
- Role `player` va `treasurer`.
- API nao can `treasurer` thi chan nguoi choi.

Khong tao bang `users` rieng trong giai doan nay. Dung luon bang `members` de dang nhap.

Them cot vao `members`:

```text
- email
- password_hash
```

## Cach lam tung phan

Moi phan se theo thu tu:

1. Tao model database.
2. Tao schema request/response.
3. Tao service xu ly nghiep vu.
4. Tao route API.
5. Dang ky route vao `api/router.py`.
6. Chay server.
7. Test tren `/docs`.
8. Chi khi pass moi sang phan tiep.
