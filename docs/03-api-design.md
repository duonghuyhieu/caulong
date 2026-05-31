# 03. Thiet Ke API

Base URL du kien:

```text
/api
```

## Auth, lam sau

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Members

```text
GET    /members
POST   /members
GET    /members/{id}
PUT    /members/{id}
PATCH  /members/{id}/status
```

Nguoi cam quy duoc tao/sua thanh vien.

## Fund

```text
GET  /fund/summary
GET  /fund/transactions
POST /fund/contributions
POST /fund/adjustments
```

Vi du body nop quy:

```json
{
  "member_id": "member-id",
  "amount": 200000,
  "note": "Nop quy thang 6"
}
```

## Fixed Schedules

```text
GET    /fixed-schedules
POST   /fixed-schedules
PUT    /fixed-schedules/{id}
DELETE /fixed-schedules/{id}
```

## Play Sessions

```text
GET  /play-sessions
POST /play-sessions
GET  /play-sessions/{id}
PUT  /play-sessions/{id}
POST /play-sessions/{id}/close
POST /play-sessions/{id}/cancel
```

Giai doan dau co the lam don gian:

```text
POST /play-sessions/preview
POST /play-sessions/close
```

## Bao cao

Lam sau:

```text
GET /reports/monthly
GET /reports/member-balances
GET /reports/export.csv
```
