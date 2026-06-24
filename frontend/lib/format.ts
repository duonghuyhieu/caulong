// Tiện ích hiển thị.

export function formatMoney(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
}

// Nhãn loại giao dịch để hiển thị tiếng Việt.
export const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  member_deposit: "Nộp quỹ",
  session_charge: "Trừ buổi chơi",
  rounding_surplus: "Dư làm tròn",
  manual_adjustment: "Điều chỉnh",
  session_refund: "Hoàn tiền",
  common_fund_expense: "Chi quỹ",
  surplus_expense: "Chi quỹ chung",
  quy_chung_income: "Cộng quỹ chung",
  session_payment: "Người chơi trả quỹ",
  session_expense: "Quỹ chi buổi chơi",
  category_expense: "Phân bổ ngân sách",
};
