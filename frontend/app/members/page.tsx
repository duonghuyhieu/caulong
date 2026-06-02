"use client";

import { useEffect, useState } from "react";
import { membersApi, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/Dialog";
import type { Member, MemberRole } from "@/lib/types";

export default function MembersPage() {
  const { member: currentUser } = useAuth();
  const isTreasurer = currentUser?.role === "treasurer";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  async function loadMembers() {
    try {
      const data = await membersApi.list();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  // Tai lan dau (mount): dinh nghia trong effect + setter truc tiep de khong
  // vi pham react-hooks/set-state-in-effect.
  useEffect(() => {
    async function init() {
      try {
        setMembers(await membersApi.list());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải danh sách");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function toggleStatus(m: Member) {
    const next = m.status === "active" ? "inactive" : "active";
    try {
      await membersApi.setStatus(m.id, next);
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lỗi đổi trạng thái");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Thành viên</h1>
        {isTreasurer && (
          <button type="button" onClick={() => setAddOpen(true)}>
            + Thêm thành viên
          </button>
        )}
      </div>

      <div className="card">
        <h2>Danh sách</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Đang tải...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tên</th>
                {isTreasurer && <th>Tài khoản</th>}
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th className="right">Số dư</th>
                {isTreasurer && <th></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td data-label="Tên">{m.name}</td>
                  {isTreasurer && (
                    <td data-label="Tài khoản" className="muted">{m.username}</td>
                  )}
                  <td data-label="Vai trò">{m.role === "treasurer" ? "Thủ quỹ" : "Người chơi"}</td>
                  <td data-label="Trạng thái">
                    <span className={`badge ${m.status}`}>
                      {m.status === "active" ? "Đang hoạt động" : "Tạm nghỉ"}
                    </span>
                  </td>
                  <td data-label="Số dư" className="right">{formatMoney(m.balance)}</td>
                  {isTreasurer && (
                    <td className="right">
                      <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button className="ghost" onClick={() => setEditing(m)}>
                          Sửa
                        </button>
                        <button className="ghost" onClick={() => toggleStatus(m)}>
                          {m.status === "active" ? "Cho nghỉ" : "Kích hoạt"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={isTreasurer ? 6 : 4} className="muted">
                    Chưa có thành viên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Thêm thành viên">
        <CreateMemberForm
          onDone={() => {
            setAddOpen(false);
            loadMembers();
          }}
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Sửa thành viên">
        {editing && (
          <EditMemberForm
            member={editing}
            onDone={() => {
              setEditing(null);
              loadMembers();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

// Segmented control nho cho 2 lua chon.
function RoleSeg({ value, onChange }: { value: MemberRole; onChange: (v: MemberRole) => void }) {
  return (
    <div className="seg">
      <button type="button" aria-pressed={value === "player"} onClick={() => onChange("player")}>
        Người chơi
      </button>
      <button type="button" aria-pressed={value === "treasurer"} onClick={() => onChange("treasurer")}>
        Thủ quỹ
      </button>
    </div>
  );
}

// Form thêm thành viên mới.
function CreateMemberForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<MemberRole>("player");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await membersApi.create({
        username,
        name,
        password,
        role,
        phone: phone || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tạo được thành viên");
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
      <div className="grid">
        <div className="field">
          <label htmlFor="m-name">Tên</label>
          <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="m-username">Tài khoản</label>
          <input
            id="m-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="m-password">Mật khẩu</label>
          <input
            id="m-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="field">
          <label>Vai trò</label>
          <RoleSeg value={role} onChange={setRole} />
        </div>
        <div className="field">
          <label htmlFor="m-phone">Số điện thoại (tuỳ chọn)</label>
          <input id="m-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Đang lưu..." : "Thêm thành viên"}
      </button>
    </form>
  );
}

// Form sửa thành viên (khong doi mat khau).
function EditMemberForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const [username, setUsername] = useState(member.username);
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState<MemberRole>(member.role);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await membersApi.update(member.id, {
        username,
        name,
        role,
        status: member.status,
        phone: phone || null,
        email: email || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được thay đổi");
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
      <div className="grid">
        <div className="field">
          <label htmlFor="e-name">Tên</label>
          <input id="e-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="e-username">Tài khoản</label>
          <input
            id="e-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
        </div>
        <div className="field">
          <label>Vai trò</label>
          <RoleSeg value={role} onChange={setRole} />
        </div>
        <div className="field">
          <label htmlFor="e-phone">Số điện thoại</label>
          <input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-email">Email</label>
          <input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
