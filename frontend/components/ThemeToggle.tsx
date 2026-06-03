"use client";

// Nút chuyển theme sáng/tối.
// - Nguồn sự thật là data-theme trên <html> (script trong layout đặt sẵn trước
//   khi paint -> không nhấp nháy). Component đọc DOM qua useSyncExternalStore,
//   tránh setState-trong-effect và xử lý gọn chuyện hydrate.
// - Khi bấm: đổi data-theme + lưu localStorage + phát sự kiện để các nút khác
//   (vd nút ở trang đăng nhập) cùng cập nhật.

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const EVENT = "themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5z" />
    </svg>
  );
}

export function ThemeToggle({ className = "ghost icon-btn" }: { className?: string }) {
  // Server render giả định "dark" (khớp mặc định); client đồng bộ sau khi hydrate.
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark");
  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage có thể bị chặn — vẫn đổi được trong phiên */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  const label = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span className="btn-label" suppressHydrationWarning>
        {isDark ? "Giao diện sáng" : "Giao diện tối"}
      </span>
    </button>
  );
}
