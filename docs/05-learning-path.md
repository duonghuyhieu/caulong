# 05. Huong Dan Hoc Theo Tung Buoc

Minh se hoc bang cach lam tung mieng nho.

## Buoc 1: Hieu bai toan

Doc:

- `docs/01-requirements.md`

Can tra loi duoc:

- Thanh vien khac khach vang lai o dau?
- Khi nao tien thanh vien bi tru?
- So quy dung de lam gi?

## Buoc 2: Ve database

Doc:

- `docs/02-data-design.md`

Bai tap:

- Tu ve lai cac bang tren giay hoac draw.io.
- Noi quan he 1-n giua cac bang.

## Buoc 3: Thiet ke API truoc khi code

Doc:

- `docs/03-api-design.md`

Bai tap:

- Chon 3 API dau tien can lam.
- Viet body request mau cho tung API.

De xuat 3 API dau tien:

```text
GET /members
POST /members
POST /fund/contributions
```

## Buoc 4: Dung backend rong

Sau khi chot API, moi bat dau tao:

```text
backend/
```

Khong viet nghiep vu phuc tap ngay. Chi can:

- FastAPI chay duoc.
- `/health` tra ve ok.
- Swagger mo duoc.
- Dependency duoc quan ly bang `uv`.
- PostgreSQL chay bang Docker.
- Migration duoc quan ly bang Alembic.

## Buoc 5: Tao DB

Tao:

- SQLite connection.
- SQLAlchemy Base.
- Model `Member`.
- Tao bang members.

## Buoc 6: Lam API dau tien

Lam:

```text
GET /members
POST /members
```

Khi API nay chay duoc, moi lam tiep nop quy.

## Buoc 7: Lam nop quy

Can co:

- Bang `fund_transactions`.
- Khi nop quy, tang `members.balance`.
- Tao mot dong transaction.

## Buoc 8: Lam buoi choi

Chi lam sau khi members va fund da vung.

Can co:

- Tao buoi choi.
- Preview tien chia.
- Chot buoi.
- Tru tien thanh vien.
- Ghi transaction.

## Cach minh se lam trong chat

Moi buoc toi se:

1. Giai thich y tuong.
2. Chi file can tao/sua.
3. Dua code nho.
4. Bao ban chay lenh test.
5. Doi ket qua cua ban roi moi sang buoc tiep.
