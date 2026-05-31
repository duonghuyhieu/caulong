# 02. Thiet Ke Du Lieu

Database muc tieu: **PostgreSQL chay bang Docker**.

Schema thay doi se duoc quan ly bang **Alembic migration**, khong dung `create_all()` cho deploy.

Ban dung: voi bai toan nay, giai doan dau **khong nen tach `users` va `members`**.

Ly do:

- Nhom cau long la he thong nho, moi nguoi dang nhap cung chinh la thanh vien.
- Neu tach `users` va `members` qua som, moi API phai xu ly them quan he `user_id`.
- Role `player` / `treasurer` co the dat truc tiep tren `members`.
- Sau nay neu can auth nang cao, van co the tach sau bang migration.

Thiet ke hien tai se dung mot bang chinh:

```text
members
```

Khach vang lai khong co quy rieng, khong co tai khoan, khong co lich su nop quy.

Giai doan dau khong can luu tung ten khach. Chi can luu **so luong khach vang lai** trong buoi choi. He thong tu tinh so tien can thu cua khach.

## Bang `members`

Luu thanh vien trong nhom, dong thoi la nguoi co the dang nhap sau nay.

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

- Giai doan dau co the chua lam login, nen `email` va `password_hash` nullable.
- Khi lam auth, dung luon bang `members` de dang nhap.
- `username` la dinh danh dang nhap, bat buoc va khong trung.
- `email` chi la thong tin lien he, khong dung de dang nhap.
- `balance` la so du quy cua thanh vien.
- Canh bao sap het quy dung nguong chung trong config, khong luu rieng tung member.

Nguong chung de xuat:

```text
LOW_BALANCE_THRESHOLD = 100000
MONEY_ROUNDING_UNIT = 1000
```

## Bang `fund_transactions`

Bang nay la **so cai cua quy**. Moi dong la mot bien dong tien da xay ra.

Khong coi bang nay la "bang tong ket". Tong ket nhu so du tung nguoi, tong tien thu, tong tien chi se duoc tinh tu bang nay hoac cap nhat vao `members.balance` sau moi giao dich.

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

### Y nghia cot

`member_id`

- Co gia tri neu giao dich gan voi mot thanh vien.
- Null neu giao dich khong thuoc rieng thanh vien nao, vi du tien thu tu khach vang lai.

`play_session_id`

- Co gia tri neu giao dich lien quan den mot buoi choi.
- Null neu la nop quy, dieu chinh thu cong, hoac giao dich khac khong gan voi buoi nao.

`type`

```text
member_deposit
session_charge
guest_collection
manual_adjustment
session_refund
```

`amount`

- So tien co dau.
- Duong la tien vao.
- Am la tien bi tru.

Vi du:

```text
Thanh vien nop quy 300.000        amount = 300000
Tru tien buoi choi 80.000         amount = -80000
Thu khach vang lai 160.000        amount = 160000
Hoan tien do nhap sai 20.000      amount = 20000
```

`balance_after`

- So du cua thanh vien sau giao dich.
- Chi co gia tri khi `member_id` khong null.
- Null voi giao dich khach vang lai vi khach khong co quy rieng.

`description`

- Noi dung hien thi cho nguoi cam quy va nguoi choi.
- Vi du: `Nop quy thang 6`, `Tru tien buoi 2026-06-01`.

`created_by_member_id`

- Nguoi tao giao dich, thuong la nguoi cam quy.
- Giai doan chua lam login co the de null.

`voided_at`, `void_reason`

- Dung khi can huy giao dich sai.
- Khong xoa record khoi database.
- Neu giao dich da anh huong tien, nen tao giao dich dao nguoc thay vi sua truc tiep.

### Quy tac thiet ke

1. Moi lan tien thay doi, bat buoc tao `fund_transactions`.
2. Khong sua `amount` cua giao dich da tao.
3. Khong xoa giao dich.
4. Neu nhap sai, tao giao dich dieu chinh hoac danh dau void kem ly do.
5. `members.balance` la so du hien tai de doc nhanh.
6. `fund_transactions` la lich su dung de audit.

### Cac case quan trong

#### Thanh vien nop quy

```text
member_id = A
play_session_id = null
type = member_deposit
amount = 300000
balance_after = 500000
```

Dong thoi:

```text
members.balance += 300000
```

#### Tru tien thanh vien sau buoi choi

```text
member_id = A
play_session_id = session_1
type = session_charge
amount = -100000
balance_after = 400000
```

Dong thoi:

```text
members.balance -= 100000
```

#### Thu tien khach vang lai

```text
member_id = null
play_session_id = session_1
type = guest_collection
amount = 200000
balance_after = null
```

Khach vang lai khong co `members.balance`, nen chi ghi nhan tien thu cho buoi do.

#### Dieu chinh thu cong

Dung khi nguoi cam quy can sua sai lech.

```text
member_id = A
play_session_id = null
type = manual_adjustment
amount = -20000
balance_after = 380000
description = Dieu chinh do nhap thua tien nop quy
```

## Bang `fixed_schedules`

Lich choi co dinh.

```text
id
day_of_week
start_time
end_time
court_name
default_cost
is_active
created_at
updated_at
```

## Bang `play_sessions`

Buoi choi thuc te.

```text
id
play_date
fixed_schedule_id nullable
court_name
total_cost
member_count
guest_count
share_per_person
member_total_charge
guest_total_due
guest_total_collected
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

## Bang `play_session_members`

Thanh vien tham gia buoi choi.

```text
id
play_session_id
member_id
charged_amount
created_at
```

## Bang `play_session_guests`

Bang nay **chua can lam o giai doan dau** neu chi quan tam so luong khach.

Giai doan dau luu truc tiep tren `play_sessions`:

```text
guest_count
guest_total_due
guest_total_collected
```

Chi tao bang `play_session_guests` sau nay neu can luu ten tung khach.

```text
id
play_session_id
guest_name
paid_amount
note nullable
created_at
```

## Luong chot tien mot buoi

Input:

```text
total_cost
member_ids tham gia
guest_count
```

Tinh tien:

```text
total_people = member_count + guest_count
share_per_person = ceil(total_cost / total_people, lam tron len theo MONEY_ROUNDING_UNIT)
member_total_charge = share_per_person * member_count
guest_total_due = share_per_person * guest_count
surplus_amount = (member_total_charge + guest_total_due) - total_cost
```

Khi chot buoi:

1. Tao `play_sessions`.
2. Tao `play_session_members`.
3. Voi moi thanh vien tham gia:
   - Tru `members.balance`.
   - Tao `fund_transactions` type `session_charge`, amount am.
4. Hien thi so tien can thu tu khach:
   - Moi khach: `share_per_person`.
   - Tong khach can thu: `guest_total_due`.
5. Khi nguoi cam quy xac nhan da thu tien khach:
   - Cap nhat `guest_total_collected`.
   - Tao transaction type `guest_payment`, `member_id = null`, amount duong.

Vi du:

```text
Tong chi: 600.000
Thanh vien tham gia: 5
Khach vang lai: 1

Tong nguoi: 6
Moi nguoi: 100.000

Moi thanh vien bi tru quy: 100.000
Tong tru quy thanh vien: 500.000
Phai thu khach: 100.000
```

Vi du co lam tron:

```text
Tong chi: 500.000
Thanh vien tham gia: 3
Khach vang lai: 2

Tong nguoi: 5
Moi nguoi: 100.000
Tong tru thanh vien: 300.000
Phai thu khach: 200.000
```

Neu chia le:

```text
Tong chi: 550.000
Thanh vien tham gia: 4
Khach vang lai: 2

Tong nguoi: 6
Moi nguoi: ceil(550.000 / 6, theo 1.000) = 92.000
Tong thu theo chia deu: 552.000
surplus_amount = 2.000
```

## Quan he chinh

```text
members 1-n fund_transactions
members 1-n play_session_members
fixed_schedules 1-n play_sessions
play_sessions 1-n play_session_members
play_sessions 1-n play_session_guests
play_sessions 1-n fund_transactions
```
