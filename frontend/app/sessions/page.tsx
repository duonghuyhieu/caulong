"use client";

import { useEffect, useMemo, useState } from "react";
import { playSessionsApi, membersApi, ApiError } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/Dialog";
import { Pager } from "@/components/Pager";
import type { Member, PlaySession, PlaySessionCreateInput, PlaySessionPreview } from "@/lib/types";

interface Row {
  member_id: string;
  slot_count: number;
}

export default function SessionsPage() {
  const { member: currentUser } = useAuth();
  const isTreasurer = currentUser?.role === "treasurer";

  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
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

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sessions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadSessions() {
    setSessions(await playSessionsApi.list());
    setPage(1);
  }

  // Tai du lieu lan dau (mount). Dinh nghia trong effect + setter truc tiep
  // de khong vi pham react-hooks/set-state-in-effect.
  useEffect(() => {
    async function init() {
      try {
        // Tải members để hiển thị tên người tham gia (player cũng được phép GET /members).
        setMembers(await membersApi.list());
        setSessions(await playSessionsApi.list());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Buổi chơi</h1>
        {isTreasurer && (
          <button type="button" onClick={() => setCreateOpen(true)}>
            + Tạo buổi chơi
          </button>
        )}
      </div>

      {isTreasurer && (
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo buổi chơi">
          <CreateSessionForm
            members={members}
            onCreated={() => {
              setCreateOpen(false);
              loadSessions();
            }}
          />
        </Dialog>
      )}

      <div className="card">
        <h2>Lịch sử buổi chơi</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted center">Đang tải...</p>
        ) : sessions.length === 0 ? (
          <p className="muted center" style={{ padding: "1.2rem 0" }}>Chưa có buổi chơi nào.</p>
        ) : (
          <div className="xlist">
            {pageItems.map((s) => {
              const open = expanded.has(s.id);
              return (
                <div className={`xrow${open ? " open" : ""}`} key={s.id}>
                  <button
                    type="button"
                    className="xrow-head"
                    onClick={() => toggleRow(s.id)}
                    aria-expanded={open}
                  >
                    <span className="xrow-main">
                      <span className="xrow-title">{formatDate(s.played_at)}</span>
                      <span className="xrow-sub">
                        {s.participants.length} người · {s.total_slots} slot
                      </span>
                    </span>
                    <span className="xrow-amount">{formatMoney(s.total_cost)}</span>
                    <Chevron />
                  </button>
                  {open && (
                    <div className="xrow-detail">
                      <div className="drow">
                        <span className="k">Mỗi slot</span>
                        <span className="v">{formatMoney(s.cost_per_slot)}</span>
                      </div>
                      <div className="drow">
                        <span className="k">Người tham gia</span>
                        <span className="v">
                          {s.participants
                            .map((p) => `${memberName.get(p.member_id) ?? "?"} (${p.slot_count})`)
                            .join(", ")}
                        </span>
                      </div>
                      <div className="drow">
                        <span className="k">Dư làm tròn</span>
                        <span className="v">{formatMoney(s.surplus_amount)}</span>
                      </div>
                      {s.note && (
                        <div className="drow">
                          <span className="k">Ghi chú</span>
                          <span className="v">{s.note}</span>
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
            total={sessions.length}
            unit="buổi"
            onPrev={() => setPage(safePage - 1)}
            onNext={() => setPage(safePage + 1)}
          />
        )}
      </div>
    </div>
  );
}

// Ngay hom nay dang "YYYY-MM-DD" (theo gio may)
function todayLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function CreateSessionForm({
  members,
  onCreated,
}: {
  members: Member[];
  onCreated: () => void;
}) {
  const activeMembers = members.filter((m) => m.status === "active");

  const [playedAt, setPlayedAt] = useState(todayLocal());
  const [totalCost, setTotalCost] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const [preview, setPreview] = useState<PlaySessionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  const slotByMember = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.member_id, r.slot_count));
    return map;
  }, [rows]);

  const totalSlots = rows.reduce((sum, r) => sum + r.slot_count, 0);

  // Bam ten -> them/bo nguoi choi (mac dinh 1 slot).
  function toggleMember(id: string) {
    setRows((prev) =>
      prev.some((r) => r.member_id === id)
        ? prev.filter((r) => r.member_id !== id)
        : [...prev, { member_id: id, slot_count: 1 }]
    );
    setPreview(null);
  }

  function setSlot(id: string, next: number) {
    const v = Math.min(10, Math.max(1, next));
    setRows((prev) => prev.map((r) => (r.member_id === id ? { ...r, slot_count: v } : r)));
    setPreview(null);
  }

  // Gom input thành payload gửi backend. Trả null nếu chưa hợp lệ.
  function buildPayload(): PlaySessionCreateInput | null {
    const participants = rows
      .filter((r) => r.member_id)
      .map((r) => ({ member_id: r.member_id, slot_count: r.slot_count }));

    if (!playedAt || !totalCost || participants.length === 0) {
      setError("Cần điền thời gian, tổng chi và ít nhất 1 người chơi.");
      return null;
    }
    return {
      // playedAt la "YYYY-MM-DD" -> gui kem 00:00:00 cho dung kieu datetime cua backend
      played_at: `${playedAt}T00:00:00`,
      total_cost: Number(totalCost),
      participants,
      note,
    };
  }

  async function handlePreview() {
    setError(null);
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      setPreview(await playSessionsApi.preview(payload));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tính được");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    setError(null);
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      await playSessionsApi.create(payload);
      setPlayedAt(todayLocal());
      setTotalCost("");
      setNote("");
      setRows([]);
      setPreview(null);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không chốt được buổi");
    } finally {
      setBusy(false);
    }
  }

  const chargedByMember = useMemo(() => {
    const map = new Map<string, number>();
    preview?.participants.forEach((p) => map.set(p.member_id, p.charged_amount));
    return map;
  }, [preview]);

  return (
    <div>
      <div className="grid">
        <div className="field">
          <label>Ngày chơi</label>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => {
              setPlayedAt(e.target.value);
              setPreview(null);
            }}
          />
        </div>
        <div className="field">
          <label>Tổng chi phí (đồng)</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="vd: 200000"
            value={totalCost}
            onChange={(e) => {
              setTotalCost(e.target.value);
              setPreview(null);
            }}
          />
          <div className="chips" style={{ marginTop: "0.5rem" }}>
            {[100000, 150000, 200000, 300000].map((v) => (
              <button
                type="button"
                key={v}
                className="chip"
                onClick={() => {
                  setTotalCost(String(v));
                  setPreview(null);
                }}
              >
                {v / 1000}K
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd: Sân 3, 19h" />
        </div>
      </div>

      <h3>
        Ai chơi hôm nay?{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({rows.length} người · {totalSlots} slot)
        </span>
      </h3>

      {activeMembers.length === 0 ? (
        <p className="muted">Chưa có thành viên hoạt động.</p>
      ) : (
        <div className="chips" style={{ marginBottom: "1rem" }}>
          {activeMembers.map((m) => {
            const picked = slotByMember.has(m.id);
            return (
              <button
                type="button"
                key={m.id}
                className="chip"
                aria-pressed={picked}
                onClick={() => toggleMember(m.id)}
              >
                {m.name}
                {picked && <span className="count">{slotByMember.get(m.id)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Chinh so slot cho nhung nguoi choi nhieu hon 1 (mac dinh ai cung 1) */}
      {rows.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          {rows.map((r) => (
            <div className="pick-row" key={r.member_id}>
              <span className="who-name">{memberName.get(r.member_id) ?? "?"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                {preview && chargedByMember.has(r.member_id) && (
                  <span className="right" style={{ color: "var(--neg)" }}>
                    -{formatMoney(chargedByMember.get(r.member_id) ?? 0)}
                  </span>
                )}
                <div className="stepper">
                  <button
                    type="button"
                    aria-label="Bớt slot"
                    onClick={() => setSlot(r.member_id, r.slot_count - 1)}
                    disabled={r.slot_count <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={r.slot_count}
                    onChange={(e) => setSlot(r.member_id, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    aria-label="Thêm slot"
                    onClick={() => setSlot(r.member_id, r.slot_count + 1)}
                    disabled={r.slot_count >= 10}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {preview && (
        <div className="summary">
          <div className="item">
            <span className="k">Mỗi slot</span>
            <span className="v accent">{formatMoney(preview.cost_per_slot)}</span>
          </div>
          <div className="item">
            <span className="k">Tổng thu</span>
            <span className="v">{formatMoney(preview.total_charged)}</span>
          </div>
          <div className="item">
            <span className="k">Dư làm tròn</span>
            <span className="v">{formatMoney(preview.surplus_amount)}</span>
          </div>
        </div>
      )}

      <div className="actions">
        <button type="button" className="ghost" onClick={handlePreview} disabled={busy}>
          Tính thử
        </button>
        <button type="button" onClick={handleCreate} disabled={busy}>
          {busy ? "Đang xử lý..." : "Chốt buổi"}
        </button>
      </div>
    </div>
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
