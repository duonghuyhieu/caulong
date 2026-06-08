// API client: 1 ham fetch chung tu gan Bearer token, plus cac ham goi theo module.
// Token luu o localStorage (xem lib/auth.tsx). Moi loi tra ve throw ApiError.

import type {
  AIChatInput,
  AIChatResponse,
  AdjustmentInput,
  CommonFundExpenseInput,
  DepositInput,
  FundSummary,
  FundTransaction,
  Member,
  MemberCreateInput,
  MemberStatus,
  MemberUpdateInput,
  PlaySession,
  PlaySessionCreateInput,
  PlaySessionPreview,
  TokenResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

const TOKEN_KEY = "caulong_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // mac dinh true: tu gan token. Dat false cho login.
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      // FastAPI tra loi o "detail" (string hoac mang validation error)
      if (typeof data?.detail === "string") detail = data.detail;
      else if (Array.isArray(data?.detail)) detail = data.detail.map((e: { msg: string }) => e.msg).join(", ");
    } catch {
      // body khong phai JSON, giu statusText
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Auth ----
export const authApi = {
  login: (username: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),
  me: () => request<Member>("/auth/me"),
  changePassword: (input: { current_password: string; new_password: string }) =>
    request<void>("/auth/change-password", { method: "POST", body: input }),
};

// ---- Members ----
export const membersApi = {
  list: () => request<Member[]>("/members"),
  get: (id: string) => request<Member>(`/members/${id}`),
  create: (input: MemberCreateInput) =>
    request<Member>("/members", { method: "POST", body: input }),
  update: (id: string, input: MemberUpdateInput) =>
    request<Member>(`/members/${id}`, { method: "PUT", body: input }),
  setStatus: (id: string, status: MemberStatus) =>
    request<Member>(`/members/${id}/status`, { method: "PATCH", body: { status } }),
};

// ---- Fund ----
export const fundApi = {
  summary: () => request<FundSummary>("/fund/summary"),
  transactions: (memberId?: string) =>
    request<FundTransaction[]>(
      `/fund/transactions${memberId ? `?member_id=${memberId}` : ""}`,
    ),
  deposit: (input: DepositInput) =>
    request<FundTransaction>("/fund/deposits", { method: "POST", body: input }),
  adjust: (input: AdjustmentInput) =>
    request<FundTransaction>("/fund/adjustments", { method: "POST", body: input }),
  spendCommon: (input: CommonFundExpenseInput) =>
    request<FundTransaction>("/fund/common-expense", { method: "POST", body: input }),
};

// ---- Play sessions ----
export const playSessionsApi = {
  list: () => request<PlaySession[]>("/play-sessions"),
  get: (id: string) => request<PlaySession>(`/play-sessions/${id}`),
  preview: (input: PlaySessionCreateInput) =>
    request<PlaySessionPreview>("/play-sessions/preview", { method: "POST", body: input }),
  create: (input: PlaySessionCreateInput) =>
    request<PlaySession>("/play-sessions", { method: "POST", body: input }),
};

// ---- AI ----
export const aiApi = {
  chat: (input: AIChatInput) =>
    request<AIChatResponse>("/ai/chat", { method: "POST", body: input }),
};
