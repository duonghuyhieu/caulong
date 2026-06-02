"use client";

// Dialog dung chung cho cac thao tac them/sua.
// - Dong bang nut X, phim Esc, hoac bam ra nen mo.
// - Khoa scroll nen khi mo. Mobile: dang bottom-sheet truot len.

import { useEffect, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dlg-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dlg" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dlg-head">
          <span className="dlg-title">{title}</span>
          <button type="button" className="dlg-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="dlg-body">{children}</div>
      </div>
    </div>
  );
}
