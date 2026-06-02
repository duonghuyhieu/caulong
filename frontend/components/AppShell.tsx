"use client";

// Khung app, thiet ke uu tien dien thoai:
// - Mobile: top bar gon (brand + dang xuat) + thanh tab co dinh duoi day.
// - Desktop (>= 768px): nav ngang tren, an thanh tab.
// Bao ve route: chua dang nhap -> /login; player vao route thu quy -> ve trang chu.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/api";
import { Dialog } from "@/components/Dialog";

// Player XEM duoc moi man (chi doc). Cac nut them/sua/nop/dieu chinh
// deu da gate theo isTreasurer ben trong tung trang.
const NAV_LINKS = [
  { href: "/", label: "Tổng quan", treasurerOnly: false },
  { href: "/members", label: "Thành viên", treasurerOnly: false },
  { href: "/fund", label: "Sổ quỹ", treasurerOnly: false },
  { href: "/sessions", label: "Buổi chơi", treasurerOnly: false },
];

// Khong con route nao chan han player — moi thao tac ghi da gate trong trang.
const TREASURER_ONLY_PATHS: string[] = [];

// Icon tu ve (tranh bo icon mac dinh), net mong dong nhat.
const ICONS: Record<string, ReactNode> = {
  "/": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  "/members": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17 19c0-2.4-1-4-2.4-4.6" />
    </svg>
  ),
  "/fund": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 9h18" />
      <circle cx="16.5" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  "/sessions": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="18" r="3" />
      <path d="M12 15 8 4M12 15l4-11M8 4h8M9.5 9.5h5" />
    </svg>
  ),
};

// Icon cho nut header (cung net mong 1.7 nhu bo icon nav).
function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="4.5" />
      <path d="M11.7 11.7 20 20M16.5 16.5l2-2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4.5v-.5A1.5 1.5 0 0 0 13.5 2.5h-8A1.5 1.5 0 0 0 4 4v16a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 15 20v-.5" />
      <path d="M9 12h11M16.5 8.5 20 12l-3.5 3.5" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { member, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);

  const isLoginPage = pathname === "/login";
  const isTreasurer = member?.role === "treasurer";

  useEffect(() => {
    if (loading) return;
    if (!member && !isLoginPage) {
      router.replace("/login");
      return;
    }
    if (member && isLoginPage) {
      router.replace("/");
      return;
    }
    if (member && !isTreasurer && TREASURER_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace("/");
    }
  }, [loading, member, isTreasurer, isLoginPage, pathname, router]);

  if (loading) return <div className="main muted">Đang tải...</div>;
  if (isLoginPage) return <>{children}</>;
  if (!member) return <div className="main muted">Đang chuyển đến trang đăng nhập...</div>;

  const visibleLinks = NAV_LINKS.filter((link) => isTreasurer || !link.treasurerOnly);

  return (
    <>
      <header className="topbar">
        <span className="brand">Quỹ Cầu Lông</span>
        <nav className="topnav">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="spacer" />
        <span className="who">
          {member.name} · {isTreasurer ? "Thủ quỹ" : "Người chơi"}
        </span>
        <button
          className="ghost icon-btn"
          onClick={() => setPwOpen(true)}
          aria-label="Đổi mật khẩu"
          title="Đổi mật khẩu"
        >
          <KeyIcon />
          <span className="btn-label">Đổi mật khẩu</span>
        </button>
        <button
          className="ghost icon-btn"
          onClick={logout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <LogoutIcon />
          <span className="btn-label">Đăng xuất</span>
        </button>
      </header>

      <main className="main">{children}</main>

      {/* Thanh tab duoi day - chi hien tren mobile, va chi khi co tu 2 muc tro len */}
      <nav className={`tabbar${visibleLinks.length < 2 ? " hidden" : ""}`}>
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "active" : ""}
          >
            <span className="tabicon">{ICONS[link.href]}</span>
            <span className="tablabel">{link.label}</span>
          </Link>
        ))}
      </nav>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} title="Đổi mật khẩu">
        <ChangePasswordForm onDone={() => setPwOpen(false)} />
      </Dialog>
    </>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (next !== confirm) {
      setError("Mật khẩu mới nhập lại không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ current_password: current, new_password: next });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đổi được mật khẩu");
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
        <label htmlFor="pw-current">Mật khẩu hiện tại</label>
        <input
          id="pw-current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="pw-new">Mật khẩu mới (tối thiểu 8 ký tự)</label>
        <input
          id="pw-new"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Nhập lại mật khẩu mới</label>
        <input
          id="pw-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Đang lưu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
