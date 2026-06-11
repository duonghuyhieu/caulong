// O nhap tien co dau phan cach hang nghin (vd 1.200.000) cho de doc.
// Parent van giu gia tri la chuoi so thuan ("1200000" hoac "-50000"); component
// chi lo phan hien thi. onChange tra ve chuoi so thuan de logic cu khong doi.

import { type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (raw: string) => void;
  // Cho phep so am (dung cho dieu chinh +/-).
  allowNegative?: boolean;
};

// "1200000" -> "1.200.000" ; "-50000" -> "-50.000" ; "" -> ""
function format(raw: string): string {
  if (!raw) return "";
  const neg = raw.startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return neg ? "-" : "";
  return (neg ? "-" : "") + Number(digits).toLocaleString("vi-VN");
}

export function MoneyInput({ value, onChange, allowNegative = false, ...rest }: Props) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={format(value)}
      onChange={(e) => {
        const input = e.target.value;
        const neg = allowNegative && input.trimStart().startsWith("-");
        const digits = input.replace(/\D/g, "");
        onChange((neg ? "-" : "") + digits);
      }}
      {...rest}
    />
  );
}
