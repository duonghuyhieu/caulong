"use client";

import { useEffect, useState } from "react";
import { reportsApi, categoriesApi, fundApi, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/Dialog";
import { MoneyInput } from "@/components/MoneyInput";
import type { CostByCategoryReport, CostCategory } from "@/lib/types";

// "YYYY-MM-DD" hom nay (theo gio may).
function todayLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const { member } = useAuth();
  const isTreasurer = member?.role === "treasurer";

  const [report, setReport] = useState<CostByCategoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Khong loc thoi gian: bao cao = tinh trang hien tai (cong don tat ca).
        const data = await reportsApi.costByCategory();
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Lỗi tải báo cáo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  if (!isTreasurer) return null;

  const cats = report?.categories ?? [];

  return (
    <div>
      <div className="page-head">
        <h1>Ngân sách</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="ghost" onClick={() => setCatOpen(true)}>
            Hạng mục
          </button>
          <button type="button" onClick={() => setPayOpen(true)}>
            + Phân bổ
          </button>
        </div>
      </div>

      <p className="muted budget-hint">
        Mọi người đóng vào quỹ, thủ quỹ phân bổ tiền đó cho từng khoản phải chi.
        Mỗi buổi chơi sẽ trừ dần vào khoản tương ứng.
      </p>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted center">Đang tải...</p>
      ) : report && cats.length > 0 ? (
        <>
          <div className="summary" style={{ marginBottom: "1.2rem" }}>
            <div className="item">
              <span className="k">Đã phân bổ</span>
              <span className="v">{formatMoney(report.total_advanced)}</span>
            </div>
            <div className="item">
              <span className="k">Đã dùng</span>
              <span className="v">{formatMoney(report.total_used)}</span>
            </div>
            <div className="item">
              <span className="k">Còn lại</span>
              <span className="v accent">{formatMoney(report.total_remaining)}</span>
            </div>
          </div>

          <div className="budget-grid">
            {cats.map((c) => {
              const pct =
                c.advanced > 0 ? Math.min(100, (c.used / c.advanced) * 100) : c.used > 0 ? 100 : 0;
              const over = c.remaining < 0; // dung vuot muc phan bo
              return (
                <div className={`card budget-card${over ? " over" : ""}`} key={c.category}>
                  <div className="budget-top">
                    <span className="budget-name">{c.category}</span>
                    {over && <span className="budget-flag">Vượt mức</span>}
                  </div>
                  <div className="budget-remaining">
                    {formatMoney(c.remaining)}
                    <span className="budget-remaining-label">còn lại</span>
                  </div>
                  <div className="cat-track">
                    <div
                      className="cat-bar"
                      style={{ width: `${pct}%`, background: over ? "var(--neg)" : undefined }}
                    />
                  </div>
                  <div className="budget-foot muted">
                    <span>Phân bổ {formatMoney(c.advanced)}</span>
                    <span>Đã dùng {formatMoney(c.used)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="card">
          <p className="muted center" style={{ padding: "1.2rem 0" }}>
            Chưa có hạng mục nào. Bấm "Hạng mục" để tạo, rồi "+ Phân bổ" để chia tiền từ quỹ.
          </p>
        </div>
      )}

      <Dialog open={catOpen} onClose={() => setCatOpen(false)} title="Hạng mục chi">
        <CategoryManager />
      </Dialog>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} title="Phân bổ ngân sách">
        <PaymentForm
          onDone={() => {
            setPayOpen(false);
            setRefresh((n) => n + 1);
          }}
        />
      </Dialog>
    </div>
  );
}

// Phan bo ngan sach: chia tien tu quy chung cho mot hang muc (tra chu san/tap hoa truoc).
function PaymentForm({ onDone }: { onDone: () => void }) {
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayLocal());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => {
        setCategories(data);
        if (data[0]) setCategory(data[0].name);
      })
      .catch(() => setError("Không tải được danh sách hạng mục"));
  }, []);

  const value = Number(amount) || 0;

  async function submit() {
    setError(null);
    if (value <= 0) {
      setError("Số tiền phân bổ phải lớn hơn 0.");
      return;
    }
    setSubmitting(true);
    try {
      await fundApi.spendCategory({
        category,
        amount: value,
        paid_at: `${paidAt}T00:00:00`,
        description,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không phân bổ được");
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
        <label>Hạng mục</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {categories.length === 0 && <option value="">-- chưa có hạng mục --</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Số tiền phân bổ (lấy từ quỹ)</label>
        <MoneyInput
          placeholder="vd: 2.000.000"
          value={amount}
          onChange={setAmount}
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label>Ngày</label>
        <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
      </div>
      <div className="field">
        <label>Lý do / ghi chú</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="vd: Trả sân tháng 6 cho chủ sân"
          required
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting || !category || !amount || !description.trim()}>
        {submitting ? "Đang lưu..." : "Phân bổ"}
      </button>
    </form>
  );
}

// Quan ly danh sach hang muc chi phi: them / doi ten / xoa.
function CategoryManager() {
  const [items, setItems] = useState<CostCategory[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const data = await categoriesApi.list();
    setItems(data);
    setDrafts(Object.fromEntries(data.map((c) => [c.id, c.name])));
  }

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => {
        setItems(data);
        setDrafts(Object.fromEntries(data.map((c) => [c.id, c.name])));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Lỗi tải hạng mục"));
  }, []);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      await categoriesApi.create(name);
      setNewName("");
    });
  }

  return (
    <div>
      <p className="muted" style={{ marginTop: "-0.4rem" }}>
        Các khoản này dùng khi tạo buổi chơi. Đổi tên chỉ áp dụng cho buổi tạo sau.
        Chỉ xoá được khi hạng mục đã về 0.
      </p>

      {error && <p className="error">{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
        {items.map((c) => {
          const changed = (drafts[c.id] ?? "") !== c.name;
          return (
            <div className="pick-row" key={c.id}>
              <input
                style={{ flex: 1, minWidth: 0 }}
                value={drafts[c.id] ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
              />
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="ghost"
                  disabled={busy || !changed || !(drafts[c.id] ?? "").trim()}
                  onClick={() => run(async () => { await categoriesApi.update(c.id, drafts[c.id].trim()); })}
                >
                  Lưu
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={busy}
                  onClick={() => run(async () => { await categoriesApi.remove(c.id); })}
                >
                  Xoá
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="muted">Chưa có hạng mục nào.</p>}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          style={{ flex: 1, minWidth: 180 }}
          placeholder="Thêm hạng mục mới (vd: Tiền gửi xe)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" disabled={busy || !newName.trim()} onClick={add}>
          + Thêm
        </button>
      </div>
    </div>
  );
}
