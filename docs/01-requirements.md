# 01. Yeu Cau Nghiep Vu

## Bai toan

Nhom cau long co nhieu thanh vien. Moi nguoi nop tien vao quy ca nhan. Khi di choi, chi phi buoi choi se duoc tru vao quy cua nhung thanh vien tham gia.

Ngoai thanh vien chinh thuc, moi buoi co the co khach vang lai. Khach vang lai khong co tai khoan quy co dinh, nhung co the tra tien truc tiep cho buoi do.

## Doi tuong chinh

### Thanh vien

Thong tin can co:

- Ten.
- Vai tro: nguoi choi hoac nguoi cam quy.
- Trang thai: dang choi, tam nghi.
- So du quy.
- Canh bao sap het quy theo mot nguong chung cua he thong.

### Lich co dinh

Vi du:

- Thu 3, 19:00 - 21:00, san A.
- Thu 6, 20:00 - 22:00, san B.

Lich co dinh giup tao buoi choi nhanh hon.

### Buoi choi

Moi buoi can luu:

- Ngay choi.
- Lich co dinh neu co.
- Tong chi phi.
- Thanh vien tham gia.
- Khach vang lai.
- So tien khach vang lai da tra.
- So tien moi thanh vien bi tru.
- Ghi chu.

### So quy

Moi thay doi tien phai co lich su:

- Nop quy.
- Tru tien buoi choi.
- Dieu chinh so du.
- Tien khach vang lai tra.

## Quy tac chia tien buoi choi

Cong thuc mac dinh:

```text
tien_khach_tra = tong tien cua tat ca khach vang lai
phan_con_lai = max(tong_chi_phi - tien_khach_tra, 0)
tien_moi_thanh_vien = ceil(phan_con_lai / so_thanh_vien_tham_gia)
tien_du = max(tien_khach_tra - tong_chi_phi, 0)
```

Vi du:

```text
Tong chi phi: 600.000
Thanh vien tham gia: 5 nguoi
Khach vang lai tra: 100.000

Phan con lai = 600.000 - 100.000 = 500.000
Moi thanh vien bi tru = 500.000 / 5 = 100.000
```

## Cau hoi can chot sau

- Khach vang lai tra theo gia co dinh hay nhap tuy tung buoi?
- Neu thanh vien het quy/bi am quy thi co cho chot buoi khong?
- Co can chia theo so set/thoi gian choi khong, hay chia deu?
- Co can nhieu nguoi cam quy khong?
- Co can xoa/sua buoi da chot khong, hay chi tao giao dich dieu chinh?
