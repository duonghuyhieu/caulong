# Quy Cau Long

Du an quan ly quy cho nhom choi cau long.

Trang thai hien tai: **da co base backend toi thieu**, chua code nghiep vu va chua dung frontend.

## Muc tieu san pham

He thong giup nhom cau long quan ly:

- Thanh vien trong nhom.
- Tien quy tung nguoi da nop va con lai.
- Lich choi co dinh.
- Chi phi moi buoi choi.
- Khach vang lai trong tung buoi.
- Cach chia tien cong bang giua thanh vien va khach vang lai.
- Lich su thu chi minh bach.

## Role

### Nguoi choi

- Xem so du quy cua minh.
- Xem lich su bi tru tien.
- Xem lich choi.
- Xem cac buoi da tham gia.

### Nguoi cam quy

- Quan ly thanh vien.
- Ghi nhan thanh vien nop quy.
- Dieu chinh so du khi can.
- Tao/sua lich choi co dinh.
- Tao buoi choi.
- Nhap thanh vien tham gia va khach vang lai.
- Chot tien tru cua tung nguoi.
- Xem so quy tong va lich su giao dich.

## Tai lieu thiet ke

- [Quy uoc lam viec](docs/00-working-agreement.md)
- [Yeu cau nghiep vu](docs/01-requirements.md)
- [Thiet ke du lieu](docs/02-data-design.md)
- [Thiet ke API](docs/03-api-design.md)
- [Plan trien khai](docs/04-implementation-plan.md)
- [Huong dan hoc theo tung buoc](docs/05-learning-path.md)
- [Backend implementation plan](docs/06-backend-implementation-plan.md)

## Backend base hien tai

```text
backend/
  app/
    api/
      routes/
        health.py
      router.py
    core/
      config.py
    db/
      base.py
      init_db.py
      session.py
    models/
    schemas/
    services/
    main.py
  alembic/
    versions/
    env.py
  alembic.ini
  .env.example
  pyproject.toml
  uv.lock
```

## Flow chuan backend

### 1. Setup lan dau

Chay tu thu muc root cua project:

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

### 2. Chay hang ngay

Neu da setup roi, moi lan quay lai lam tiep chi can:

```bash
docker compose up -d postgres
cd backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Khi thay doi database model

Moi khi tao/sua model trong `backend/app/models`, tao migration moi:

```bash
cd backend
uv run alembic revision --autogenerate -m "mo ta thay doi"
```

Sau do mo file moi trong:

```text
backend/alembic/versions/
```

Kiem tra migration co dung y muon khong, roi apply:

```bash
uv run alembic upgrade head
```

### 4. Khi can rollback migration

Rollback 1 migration gan nhat:

```bash
uv run alembic downgrade -1
```

Xem migration hien tai:

```bash
uv run alembic current
```

Xem lich su migration:

```bash
uv run alembic history
```

Database chay bang Docker PostgreSQL:

```text
host: localhost
port: 5433
container port: 5432
database: badminton_fund
user: badminton
password: badminton
```

Ghi chu: project dung host port `5433` vi port `5432` tren may co the da duoc PostgreSQL khac su dung.

Auth hien dung:

```text
username + password
```

Email chi la thong tin lien he, khong dung de dang nhap.

## Nguyen tac lam du an

Minh se khong code ngay toan bo. Thu tu dung la:

1. Chot yeu cau nghiep vu.
2. Chot database schema.
3. Chot API.
4. Dung backend nho nhat.
5. Them migration bang Alembic.
6. Test API bang Swagger/Postman.
7. Dung frontend sau khi backend on.
8. Them dang nhap va phan quyen.
9. Hoan thien bao cao, export, deploy.
