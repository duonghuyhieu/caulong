# Triển khai `caulong` lên server

Hướng dẫn này bám theo các quy ước trong [`README_SYSTEM.md`](./README_SYSTEM.md):
Cloudflare Tunnel (không mở cổng public), mạng `internet_boundary` (external),
dữ liệu DB nằm trên HDD `/mnt/data/`.

Stack: **3 container** (giống Kara) — `caulong-frontend` (Next.js), `caulong-backend`
(FastAPI), `caulong-postgres` (Postgres 16).

| Thành phần | Container | Cổng nội bộ | Domain (qua Tunnel) |
|---|---|---|---|
| Frontend (Next.js) | `caulong-frontend` | `3000` | `caulong.huyhieu.online` |
| Backend (FastAPI) | `caulong-backend` | `8000` | `api-caulong.huyhieu.online` |
| Database (Postgres) | `caulong-postgres` | `5432` | (chỉ nội bộ, không expose) |

---

## 0. Yêu cầu sẵn có trên server
- Docker + Docker Compose plugin.
- Mạng external `internet_boundary` đã tồn tại (Cloudflare Tunnel nối qua đây).
  Kiểm tra: `docker network ls | grep internet_boundary`
  Nếu chưa có: `docker network create internet_boundary`
- `cloudflared` (trong `~/apps/infra/`) phải **cùng mạng** `internet_boundary` để
  reach được `caulong-frontend` / `caulong-backend`.

## 1. Lấy mã nguồn
```bash
cd /home/admin-hieu/apps
git clone https://github.com/duonghuyhieu/caulong.git
cd caulong
```

## 2. Tạo thư mục dữ liệu trên HDD (theo Storage Policy)
```bash
sudo mkdir -p /mnt/data/caulong/postgres_data
sudo chown -R admin-hieu:admin-hieu /mnt/data/caulong
```

## 3. Tạo file `.env`
```bash
cp .env.example .env
nano .env
```
Điền:
```dotenv
POSTGRES_PASSWORD=<mật-khẩu-mạnh>
JWT_SECRET_KEY=<chuỗi ngẫu nhiên>           # tạo bằng: openssl rand -hex 32
BACKEND_CORS_ORIGINS=https://caulong.huyhieu.online
NEXT_PUBLIC_API_BASE_URL=https://api-caulong.huyhieu.online/api
```
> ⚠️ `NEXT_PUBLIC_API_BASE_URL` được **nhúng vào bundle lúc build** và **bắt buộc có đuôi `/api`**
> (router backend dùng prefix `/api`). Nếu sau này đổi domain API thì phải **build lại** frontend.

## 4. Build & chạy
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- Backend khi khởi động sẽ **tự chạy `alembic upgrade head`** để tạo/đồng bộ schema.
- Postgres ghi dữ liệu vào `/mnt/data/caulong/postgres_data`.

Kiểm tra:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend   # xem migration + uvicorn
```

## 5. Tạo tài khoản thủ quỹ đầu tiên
Cách nhanh (tạo sẵn thủ quỹ + vài người chơi + dữ liệu mẫu):
```bash
docker compose -f docker-compose.prod.yml exec backend uv run python seed.py
# Đăng nhập: treasurer / password123  -> ĐĂNG NHẬP XONG ĐỔI MẬT KHẨU NGAY (nút "Đổi mật khẩu")
```
> Seed là **idempotent**: nếu đã có user `treasurer` thì bỏ qua. Trên môi trường thật,
> sau khi đăng nhập hãy dùng tính năng **Đổi mật khẩu** và tạo thành viên thật trong app.

## 6. Khai báo Cloudflare Tunnel ingress
Sửa `~/apps/infra/cloudflare/config.yaml`, thêm vào phần `ingress` (đặt **trên** rule
`service: http_status:404` cuối cùng):
```yaml
  - hostname: caulong.huyhieu.online
    service: http://caulong-frontend:3000
  - hostname: api-caulong.huyhieu.online
    service: http://caulong-backend:8000
```
Tạo bản ghi DNS cho 2 subdomain (nếu chưa có):
```bash
cloudflared tunnel route dns 0e078cc4-729e-48b6-ba3e-b34f01d1fd21 caulong.huyhieu.online
cloudflared tunnel route dns 0e078cc4-729e-48b6-ba3e-b34f01d1fd21 api-caulong.huyhieu.online
```
**Restart tunnel** (Final Step bắt buộc sau mỗi lần đổi ingress):
```bash
docker restart <ten-container-cloudflared>   # vd: infra-cloudflared
```

## 7. Kiểm tra
```bash
# Trong server (qua mang noi bo)
docker compose -f docker-compose.prod.yml exec backend \
  sh -c 'wget -qO- http://localhost:8000/health'      # {"status":"ok"}
```
- Mở `https://caulong.huyhieu.online` → trang đăng nhập.
- `https://api-caulong.huyhieu.online/health` → `{"status":"ok"}`.

---

## Cập nhật phiên bản mới (redeploy)
```bash
cd /home/admin-hieu/apps/caulong
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Migration tự chạy khi backend khởi động lại. Không cần thao tác DB thủ công.

## Vận hành nhanh
```bash
# Log
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
# Tài nguyên
btop
# Backup DB
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U badminton badminton_fund > caulong_$(date +%F).sql
```

## Ghi chú
- File `docker-compose.yml` (ở root) là cấu hình **dev local** (chỉ Postgres, có mở cổng
  `5434`). Trên server dùng `docker-compose.prod.yml` (không mở cổng, theo AI Protocol).
- Backend đọc cấu hình qua biến môi trường (pydantic-settings): `DATABASE_URL`,
  `JWT_SECRET_KEY`, `BACKEND_CORS_ORIGINS`, `ACCESS_TOKEN_EXPIRE_MINUTES`,
  `LOW_BALANCE_THRESHOLD`, `MONEY_ROUNDING_UNIT`.
