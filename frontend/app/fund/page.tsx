"use client";

import { useEffect, useMemo, useState } from "react";
import { fundApi, membersApi, ApiError } from "@/lib/api";
import { formatMoney, formatDate, formatDateTime, TRANSACTION_TYPE_LABEL } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/Dialog";
import { Pager } from "@/components/Pager";
import type { FundSummary, FundTransaction, Member } from "@/lib/types";

export default function FundPage() {
  const { member: currentUser } = useAuth();
  const isTreasurer = currentUser?.role === "treasurer";

  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  // scope "mine" = chi giao dich cua minh (mac dinh); "all" = ca quy (chung).
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [filterMemberId, setFilterMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [dialog, setDialog] = useState<"deposit" | "adjust" | "common" | null>(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 10;

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadTransactions(memberId?: string) {
    try {
      setTransactions(await fundApi.transactions(memberId || undefined));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lỗi tải giao dịch");
    }
  }

  // member_id dung de query theo scope hien tai.
  function queryMemberId(s: "mine" | "all", fid: string): string | undefined {
    return s === "mine" ? currentUser?.id : fid || undefined;
  }

  // Tai du lieu lan dau (mount). Dinh nghia trong effect + dung setter truc tiep
  // de khong vi pham react-hooks/set-state-in-effect.
  useEffect(() => {
    async function init() {
      try {
        setMembers(await membersApi.list());
        setSummary(await fundApi.summary());
        // mac dinh: chi xem giao dich cua minh
        setTransactions(await fundApi.transactions(currentUser?.id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeScope(next: "mine" | "all") {
    setScope(next);
    setFilterMemberId("");
    setPage(1);
    loadTransactions(queryMemberId(next, ""));
  }

  function onFilterChange(memberId: string) {
    setFilterMemberId(memberId);
    setPage(1);
    loadTransactions(memberId || undefined);
  }

  // Sau khi nộp/điều chỉnh: tải lại giao dịch (theo scope/filter hiện tại) + members + summary.
  async function refreshAfterChange() {
    setMembers(await membersApi.list());
    setSummary(await fundApi.summary());
    setPage(1);
    await loadTransactions(queryMemberId(scope, filterMemberId));
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
        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            flexWrap: "wrap",
            alignItems: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label>Phạm vi</label>
            <div className="seg">
              <button type="button" aria-pressed={scope === "mine"} onClick={() => changeScope("mine")}>
                Riêng
              </button>
              <button type="button" aria-pressed={scope === "all"} onClick={() => changeScope("all")}>
                Chung
              </button>
            </div>
          </div>

          {scope === "all" && (
            <div className="field" style={{ marginBottom: 0, minWidth: 200, flex: 1, maxWidth: 280 }}>
              <label htmlFor="filter">Lọc theo thành viên</label>
              <select id="filter" value={filterMemberId} onChange={(e) => onFilterChange(e.target.value)}>
                <option value="">Tất cả</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted center">Đang tải...</p>
        ) : transactions.length === 0 ? (
          <p className="muted center" style={{ padding: "1.2rem 0" }}>Chưa có giao dịch.</p>
        ) : (
          <div className="xlist">
            {pageItems.map((t) => {
              const open = expanded.has(t.id);
              return (
                <div className={`xrow${open ? " open" : ""}`} key={t.id}>
                  <button
                    type="button"
                    className="xrow-head"
                    onClick={() => toggleRow(t.id)}
                    aria-expanded={open}
                  >
                    <span className="xrow-main">
                      <span className="xrow-title">{TRANSACTION_TYPE_LABEL[t.type] ?? t.type}</span>
                      <span className="xrow-sub">{formatDate(t.created_at)}</span>
                    </span>
                    <span
                      className="xrow-amount"
                      style={{ color: t.amount < 0 ? "var(--neg)" : "var(--pos)" }}
                    >
                      {t.amount > 0 ? "+" : ""}
                      {formatMoney(t.amount)}
                    </span>
                    <Chevron />
                  </button>
                  {open && (
                    <div className="xrow-detail">
                      <div className="drow">
                        <span className="k">Thời gian</span>
                        <span className="v">{formatDateTime(t.created_at)}</span>
                      </div>
                      {scope === "all" && (
                        <div className="drow">
                          <span className="k">Thành viên</span>
                          <span className="v">
                            {t.member_id ? memberName.get(t.member_id) ?? "?" : "Quỹ chung"}
                          </span>
                        </div>
                      )}
                      <div className="drow">
                        <span className="k">Số dư sau</span>
                        <span className="v">
                          {t.balance_after === null ? "—" : formatMoney(t.balance_after)}
                        </span>
                      </div>
                      {t.description && (
                        <div className="drow">
                          <span className="k">Ghi chú</span>
                          <span className="v">{t.description}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

// Mui ten xo (xoay khi mo)
function Chevron() {
  return (
    <svg
      className="xrow-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
