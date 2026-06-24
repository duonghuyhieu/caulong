// Types khop voi schema backend (backend/app/schemas).
// Sua o day neu backend doi schema.

export type MemberRole = "player" | "treasurer";
export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: MemberRole;
  status: MemberStatus;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface MemberCreateInput {
  username: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role?: MemberRole;
  status?: MemberStatus;
  password: string;
}

export interface MemberUpdateInput {
  username: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: MemberRole;
  status: MemberStatus;
}

export type FundTransactionType =
  | "member_deposit"
  | "session_charge"
  | "rounding_surplus"
  | "manual_adjustment"
  | "session_refund"
  | "common_fund_expense"
  | "surplus_expense"
  | "quy_chung_income"
  | "session_payment"
  | "session_expense"
  | "category_expense";

export interface FundTransaction {
  id: string;
  member_id: string | null;
  play_session_id: string | null;
  type: FundTransactionType;
  category: string | null;
  amount: number;
  balance_after: number | null;
  description: string;
  created_by_member_id: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
}

export interface FundSummary {
  member_total_balance: number;
  common_fund_balance: number;
  total_balance: number;
  active_member_count: number;
  low_balance_member_count: number;
  total_deposit_amount: number;
  total_session_charge_amount: number;
  total_rounding_surplus_amount: number;
}

export interface DepositInput {
  member_id: string;
  amount: number; // > 0
  description: string;
}

// Dieu chinh chi tieu theo hang muc (giong dieu chinh so quy).
export interface CategoryExpenseInput {
  category: string;
  amount: number; // != 0, duong = them chi, am = giam/hoan
  paid_at: string; // ISO datetime
  description: string;
}

export interface AdjustmentInput {
  member_id: string;
  amount: number; // != 0, am la tru
  description: string;
}

export interface CommonFundExpenseInput {
  amount: number; // > 0, so tien chi ra
  description: string;
  source?: "quy" | "quy_chung"; // quy = tien mat; quy_chung = tien thua lam tron
}

// Cong tien vao Quy chung (donate, tien thuong khi danh giai).
export interface CommonFundIncomeInput {
  amount: number; // > 0, so tien cong vao
  description: string;
}

export interface PlaySessionParticipant {
  id: string;
  play_session_id: string;
  member_id: string;
  slot_count: number;
  charged_amount: number;
  created_at: string;
}

// Mot dong chi phi cua buoi (tien san, tien cau, tien nuoc...).
export interface CostItem {
  category: string;
  amount: number;
}

// Hang muc chi phi quan ly duoc (CRUD).
export interface CostCategory {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface PlaySession {
  id: string;
  played_at: string;
  total_cost: number;
  total_slots: number;
  cost_per_slot: number;
  total_charged: number;
  surplus_amount: number;
  status: string;
  note: string;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
  participants: PlaySessionParticipant[];
  cost_items: CostItem[];
}

export interface PlaySessionParticipantInput {
  member_id: string;
  slot_count: number; // 1..10
}

export interface PlaySessionCreateInput {
  played_at: string; // ISO datetime
  // Tong chi phi = tong cac dong; backend tu tinh total_cost.
  cost_items: CostItem[];
  participants: PlaySessionParticipantInput[];
  note?: string;
}

export interface PlaySessionPreview {
  total_cost: number;
  total_slots: number;
  cost_per_slot: number;
  total_charged: number;
  surplus_amount: number;
  participants: {
    member_id: string;
    slot_count: number;
    charged_amount: number;
  }[];
  cost_items: CostItem[];
}

// ---- Bao cao chi tieu: moi hang muc la mot "vi" ----
export interface CategoryWallet {
  category: string;
  advanced: number; // da ung (tach quy)
  used: number; // da dung (qua buoi choi)
  remaining: number; // con lai
}

export interface CostByCategoryReport {
  categories: CategoryWallet[];
  total_advanced: number;
  total_used: number;
  total_remaining: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatInput {
  message: string;
  history: AIChatMessage[];
}

export interface AIChatResponse {
  message: string;
}
