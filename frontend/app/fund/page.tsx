"use client";

import { useEffect, useMemo, useState } from "react";
import { fundApi, membersApi, ApiError } from "@/lib/api";
import { formatMoney, formatDateTime, TRANSACTION_TYPE_LABEL } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/Dialog";
import { Pager } from "@/components/Pager";
import type { FundSummary, FundTransaction, Member } from "@/lib/types";

export default function FundPage() {
  const { member: currentUser } = useAuth();
  const isTreasurer = currentUser?.role === "treasurer";

  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [filterMemberId, setFilterMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [dialog, setDialog] = useState<"deposit" | "adjust" | "common" | null>(null);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadTransactions(memberId: string) {
    try {
      setTransactions(await fundApi.transactions(memberId || undefined));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lỗi tải giao dịch");
    }
  }

  // Tai du lieu lan dau (mount). Dinh nghia trong effect + dung setter truc tiep
  // de khong vi pham react-hooks/set-state-in-effect.
  useEffect(() => {
    async function init() {
      try {
        setMembers(await membersApi.list());
        setSummary(await fundApi.summary());
        setTransactions(await fundApi.transactions(undefined));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function onFilterChange(memberId: string) {
    setFilterMemberId(memberId);
    setPage(1);
    loadTransactions(memberId);
  }

  // Sau khi nộp/điều chỉnh: tải lại giao dịch (theo filter hiện tại) + members (số dư đổi) + summary.
  async function refreshAfterChange() {
    setMembers(await membersApi.list());
    setSummary(await fundApi.summary());
    setPage(1);
    await loadTransactions(filterMemberId);
  }

  // Sau khi nop/dieu chinh xong: dong dialog + tai lai.
  function afterDialog() {
    setDialog(null);
    refreshAfterChange();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Sổ quỹ</h1>
        {isTreasurer && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="ghost" onClick={() => setDialog("common")}>
              Chi quỹ chung
            </button>
            <button type="button" className="ghost" onClick={() => setDialog("adjust")}>
              Điều chỉnh
            </button>
            <button type="button" onClick={() => setDialog("deposit")}>
              + Nộp quỹ
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Lịch sử giao dịch</h2>
        <div className="field" style={{ maxWidth: 280 }}>
          <label htmlFor="filter">Lọc theo thành viên</label>
          <select
            id="filter"
            value={filterMemberId}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="">Tất cả</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Đang tải...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Thành viên</th>
                <th className="right">Số tiền</th>
                <th className="right">Số dư sau</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr key={t.id}>
                  <td data-label="Thời gian" className="muted">{formatDateTime(t.created_at)}</td>
                  <td data-label="Loại">{TRANSACTION_TYPE_LABEL[t.type] ?? t.type}</td>
                  <td data-label="Thành viên">{t.member_id ? memberName.get(t.member_id) ?? "?" : "Quỹ chung"}</td>
                  <td
                    data-label="Số tiền"
                    className="right"
                    style={{ color: t.amount < 0 ? "var(--neg)" : "var(--pos)" }}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {formatMoney(t.amount)}
                  </td>
                  <td data-label="Số dư sau" className="right">
                    {t.balance_after === null ? "—" : formatMoney(t.balance_after)}
                  </td>
                  <td data-label="Ghi chú" className="muted">{t.description}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Chưa có giao dịch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {!loading && totalPages > 1 && (
          <Pager
            page={safePage}
            totalPages={totalPages}
            total={transactions.length}
            unit="giao dịch"
            onPrev={() => setPage(safePage - 1)}
            onNext={() => setPage(safePage + 1)}
          />
        )}
      </div>

      <Dialog open={dialog === "deposit"} onClose={() => setDialog(null)} title="Nộp quỹ">
        <DepositForm members={members} onDone={afterDialog} />
      </Dialog>

      <Dialog open={dialog === "adjust"} onClose={() => setDialog(null)} title="Điều chỉnh thủ công">
        <AdjustForm members={members} onDone={afterDialog} />
      </Dialog>

      <Dialog open={dialog === "common"} onClose={() => setDialog(null)} title="Chi quỹ chung">
        <CommonExpenseForm balance={summary?.common_fund_balance ?? 0} onDone={afterDialog} />
      </Dialog>
    </div>
  );
}

// Chi tien tu quy chung cho hoat dong tap the (lien hoan, mua nuoc, ...).
function CommonExpenseForm({ balance, onDone }: { balance: number; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const value = Number(amount) || 0;
  const overBalance = value > balance;

  function addAmount(delta: number) {
    setAmount((prev) => String((Number(prev) || 0) + delta));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await fundApi.spendCommon({ amount: value, description });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không chi được");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="summary">
        <div className="item">
          <span className="k">Quỹ chung hiện có</span>
          <span className="v accent">{formatMoney(balance)}</span>
        </div>
        {value > 0 && !overBalance && (
          <div className="item">
            <span className="k">Còn lại sau khi chi</span>
            <span className="v">{formatMoney(balance - value)}</span>
          </div>
        )}
      </div>

      <div className="field">
        <label>Số tiền chi (đồng)</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={balance}
          placeholder="vd: 300000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
        />
        <div className="chips" style={{ marginTop: "0.5rem" }}>
          {[100000, 200000, 500000].map((v) => (
            <button type="button" key={v} className="chip" onClick={() => addAmount(v)}>
              +{v / 1000}K
            </button>
          ))}
          {amount && (
            <button type="button" className="chip" onClick={() => setAmount("")}>
              Xoá
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label>Nội dung chi</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="vd: Liên hoan cuối tháng, mua nước"
          required
        />
      </div>

      {overBalance && <p className="error">Vượt quá quỹ chung hiện có ({formatMoney(balance)}).</p>}
      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting || value <= 0 || overBalance}>
        {submitting ? "Đang lưu..." : "Chi quỹ chung"}
      </button>
    </form>
  );
}

function DepositForm({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Nộp quỹ");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addAmount(delta: number) {
    setAmount((prev) => String((Number(prev) || 0) + delta));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await fundApi.deposit({
        member_id: memberId,
        amount: Number(amount),
        description,
      });
      setAmount("");
      setDescription("Nộp quỹ");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không nộp được");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="field">
        <label>Thành viên</label>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required autoFocus>
            <option value="">-- chọn --</option>
            {members
              .filter((m) => m.status === "active")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label>Số tiền (đồng)</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="vd: 200000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <div className="chips" style={{ marginTop: "0.5rem" }}>
            {[50000, 100000, 200000, 500000].map((v) => (
              <button type="button" key={v} className="chip" onClick={() => addAmount(v)}>
                +{v / 1000}K
              </button>
            ))}
            {amount && (
              <button type="button" className="chip" onClick={() => setAmount("")}>
                Xoá
              </button>
            )}
          </div>
        </div>
        <div className="field">
          <label>Ghi chú</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Nộp quỹ"}
        </button>
      </form>
  );
}

function AdjustForm({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await fundApi.adjust({
        member_id: memberId,
        amount: Number(amount),
        description,
      });
      setAmount("");
      setDescription("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không điều chỉnh được");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="field">
        <label>Thành viên</label>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required autoFocus>
          <option value="">-- chọn --</option>
          {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Số tiền (âm = trừ, dương = cộng)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Lý do</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Điều chỉnh"}
        </button>
      </form>
  );
}
