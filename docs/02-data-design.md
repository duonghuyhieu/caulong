# 02. Thiet Ke Du Lieu

Database muc tieu: **PostgreSQL chay bang Docker**.

Schema thay doi duoc quan ly bang **Alembic migration**, khong dung `create_all()` cho deploy.

Thiet ke hien tai:

- Khong tach `users` va `members`.
- `members` vua la thanh vien, vua la account dang nhap.
- Khong co lich co dinh.
- Khong co bang khach vang lai.
- Nguoi ngoai nhom di cung ai thi tinh vao `slot_count` cua thanh vien do.

## Config chung

```text
LOW_BALANCE_THRESHOLD = 100000
MONEY_ROUNDING_UNIT = 1000
```

## Bang `members`

Luu thanh vien trong nhom.

```text
id
username
name
phone nullable
email nullable
password_hash nullable
role
status
balance
created_at
updated_at
```

Role:

- `player`: nguoi choi.
- `treasurer`: nguoi cam quy.

Status:

- `active`: dang tham gia.
- `inactive`: tam nghi.

Ghi chu:

- `username` la dinh danh dang nhap, bat buoc va khong trung.
- `email` chi la thong tin lien he, khong dung de dang nhap.
- `balance` la so du quy cua thanh vien.
- Canh bao sap het quy dung nguong chung trong config.

## Bang `fund_transactions`

Bang nay la **so cai cua quy**. Moi dong la mot bien dong tien da xay ra.

```text
id
member_id nullable
play_session_id nullable
type
amount
balance_after nullable
description
created_by_member_id nullable
created_at
voided_at nullable
void_reason nullable
```

Type:

```text
member_deposit
session_charge
rounding_surplus
manual_adjustment
session_refund
```

`amount`:

- Duong la tien vao.
- Am la tien bi tru.

Vi du:

```text
Thanh vien nop quy 300.000        amount = 300000
Tru tien buoi choi 80.000         amount = -80000
Du do lam tron 2.000              amount = 2000, member_id = null
Hoan tien do nhap sai 20.000      amount = 20000
```

Quy tac:

1. Moi lan tien thay doi, bat buoc tao `fund_transactions`.
2. Khong sua `amount` cua giao dich da tao.
3. Khong xoa giao dich.
4. Neu nhap sai, tao giao dich dieu chinh/hoan tien hoac danh dau void kem ly do.
5. `members.balance` la so du ca nhan hien tai de doc nhanh.
6. Giao dich `member_id = null` la tien cua quy chung.
7. Tong quy hien tai = tong `members.balance` + quy chung.
8. `fund_transactions` la lich su dung de audit.

## Bang `play_sessions`

Buoi choi thuc te.

```text
id
played_at
total_cost
total_slots
cost_per_slot
total_charged
surplus_amount
status
note
created_by_member_id nullable
created_at
updated_at
```

Status:

- `draft`: dang nhap thong tin, chua tru tien.
- `closed`: da chot tien va da tao giao dich.
- `cancelled`: huy.

Ghi chu:

- `played_at` la ngay/gio buoi choi thuc te.
- Khong luu san, gio co dinh, lich co dinh.
- `surplus_amount` la tien le do lam tron len.
- `surplus_amount` duong se duoc dua vao quy chung.

## Bang `play_session_participants`

Thanh vien tham gia buoi choi.

```text
id
play_session_id
member_id
slot_count
charged_amount
created_at
```

`slot_count`:

- Di mot minh: `1`.
- Dan theo 1 nguoi: `2`.
- Dan theo 2 nguoi: `3`.

## Luong chot tien mot buoi

Input:

```text
played_at
total_cost
participants:
  - member_id
  - slot_count
note
```

Tinh tien:

```text
total_slots = sum(slot_count)
cost_per_slot = ceil(total_cost / total_slots, lam tron len theo MONEY_ROUNDING_UNIT)
charged_amount moi member = cost_per_slot * slot_count
total_charged = sum(charged_amount)
surplus_amount = total_charged - total_cost
```

Khi chot buoi:

1. Tao `play_sessions`.
2. Tao `play_session_participants`.
3. Voi moi participant:
   - Tru `members.balance` theo `charged_amount`.
   - Tao `fund_transactions` type `session_charge`, amount am.
4. Neu `surplus_amount > 0`:
   - Tao `fund_transactions` type `rounding_surplus`, `member_id = null`, amount duong.

Vi du:

```text
Tong chi: 600.000
Nam: 1 slot
Minh: 2 slot
Hieu: 3 slot

Tong slot: 6
Moi slot: 100.000

Nam bi tru: 100.000
Minh bi tru: 200.000
Hieu bi tru: 300.000
```

## Quan he chinh

```text
members 1-n fund_transactions
members 1-n play_session_participants
play_sessions 1-n play_session_participants
play_sessions 1-n fund_transactions
```
