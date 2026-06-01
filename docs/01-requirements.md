# 01. Yeu Cau Nghiep Vu

## Bai toan

Nhom cau long co nhieu thanh vien. Moi nguoi nop tien vao quy ca nhan. Sau moi buoi choi, nguoi cam quy nhap tong chi phi buoi do, chon thanh vien tham gia va so slot cua tung thanh vien. He thong tu chia tien theo slot va tru vao quy cua tung thanh vien.

Khong quan ly khach vang lai rieng. Neu mot thanh vien dan theo ban choi ngoai nhom, thanh vien do se bi tinh them slot.

Vi du:

```text
Nam di mot minh       slot_count = 1
Minh dan theo 1 ban   slot_count = 2
Hieu dan theo 2 ban   slot_count = 3
```

## Doi tuong chinh

### Thanh vien

Thong tin can co:

- Username dang nhap.
- Ten.
- Vai tro: nguoi choi hoac nguoi cam quy.
- Trang thai: dang choi, tam nghi.
- So du quy.
- Canh bao sap het quy theo mot nguong chung cua he thong.

### Buoi choi

Moi buoi can luu:

- Ngay/gio choi.
- Tong chi phi.
- Thanh vien tham gia.
- So slot cua tung thanh vien.
- Don gia moi slot.
- So tien moi thanh vien bi tru.
- Ghi chu.

Khong can luu san, gio co dinh, lich co dinh, khach vang lai.

### So quy

Moi thay doi tien phai co lich su:

- Nop quy.
- Tru tien buoi choi.
- Dieu chinh so du.
- Hoan tien neu can.

## Quy tac chia tien buoi choi

Input:

```text
total_cost
participants: member_id + slot_count
```

Cong thuc:

```text
total_slots = sum(slot_count)
cost_per_slot = ceil(total_cost / total_slots, lam tron len theo MONEY_ROUNDING_UNIT)
charged_amount cua tung member = cost_per_slot * slot_count
surplus_amount = sum(charged_amount) - total_cost
```

Vi du:

```text
Tong chi phi: 600.000
Nam: 1 slot
Minh: 2 slot
Hieu: 3 slot

Tong slot = 6
Moi slot = 100.000

Nam bi tru: 100.000
Minh bi tru: 200.000
Hieu bi tru: 300.000
```

Vi du co lam tron:

```text
Tong chi phi: 550.000
Tong slot: 6
Lam tron theo 1.000

Moi slot = ceil(550.000 / 6, 1.000) = 92.000
Tong tru = 552.000
surplus_amount = 2.000
```

## Cau hoi can chot sau

- Thanh vien bi am quy co duoc tiep tuc chot buoi khong?
- Buoi da chot co cho sua khong, hay chi tao giao dich dieu chinh/hoan tien?
- Co can nhieu nguoi cam quy khong?
