"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fundApi, reportsApi, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { CostByCategoryReport, FundSummary } from "@/lib/types";

export default function DashboardPage() {
  const { member } = useAuth();
  const isTreasurer = member?.role === "treasurer";

  const [summary, setSummary] = useState<FundSummary | null>(null);
  // Bao cao ngan sach (chi thu quy goi duoc endpoint nay).
  const [budget, setBudget] = useState<CostByCategoryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setSummary(await fundApi.summary());
        if (isTreasurer) setBudget(await reportsApi.costByCategory());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isTreasurer]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <p className="error">{error}</p>;
  if (!summary) return null;

  return (
    <div className="dash-root">
      {isTreasurer ? (
        <TreasurerDashboard summary={summary} budget={budget} />
      ) : (
        <PlayerDashboard summary={summary} balance={member?.balance ?? 0} />
      )}
    </div>
  );
}

// Skeleton loading: giu cho cho tung khoi de tranh layout shift.
function DashboardSkeleton() {
  return (
    <div className="dash-root">
      <div className="dash-hero-card dash-hero-skeleton">
        <div className="skel skel-label" />
        <div className="skel skel-value" />
        <div className="skel skel-bar" />
        <div className="skel skel-legend" />
      </div>
      <div className="grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card stat">
            <div className="skel skel-stat-label" />
            <div className="skel skel-stat-value" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Thu quy: buc tranh tien cua nhom =====
function TreasurerDashboard({
  summary,
  budget,
}: {
  summary: FundSummary;
  budget: CostByCategoryReport | null;
}) {
  // Cac tui tien:
  //   Quy (tien nguoi choi) = tong so du moi nguoi = Ngan sach + Chua phan bo
  //   Quy chung = tien thua lam tron sau moi tran (rieng, khong thuoc quy)
  //   Tong quy = Quy + Quy chung
  const playerFund = summary.member_total_balance; // Quy (tien nguoi choi)
  const reserved = budget?.total_remaining ?? 0; // Ngan sach da phan bo, con lai
  const unallocated = playerFund - reserved; // Chua phan bo
  const commonFund = summary.total_rounding_surplus_amount; // Quy chung = tien thua lam tron
  const totalFund = playerFund + commonFund; // Tong quy
  const cats = budget?.categories ?? [];

  return (
    <>
      {/* Hero: Tong quy = Quy chung (tien mat) + Ngan sach (da phan bo) */}
      <div className="dash-hero-card">
        {/* Glow trang tri */}
        <div className="dash-hero-glow" aria-hidden />

        <div className="dash-hero-top">
          <span className="dash-hero-label">Tổng quỹ</span>
          <span className="dash-hero-badge">
            {/* Icon: shield check */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            Thủ quỹ
          </span>
        </div>

        <div className="dash-hero-value">{formatMoney(totalFund)}</div>

        <div className="dash-breakdown">
          {/* Quy = tien cua nguoi choi (Ngan sach + Chua phan bo) */}
          <div className="dash-bd-group">
            <div className="dash-bd-row dash-bd-main">
              <span className="dash-bd-name">
                <i className="dash-dot dash-dot-fund" aria-hidden />
                Quỹ <em>tiền người chơi</em>
              </span>
              <b className={`dash-bd-amt${playerFund < 0 ? " neg" : ""}`}>
                {formatMoney(playerFund)}
              </b>
            </div>
            <div className="dash-bd-row dash-bd-sub">
              <span className="dash-bd-name">Ngân sách · đã phân bổ</span>
              <b className={`dash-bd-amt${reserved < 0 ? " neg" : ""}`}>
                {budget ? formatMoney(reserved) : "…"}
              </b>
            </div>
            <div className="dash-bd-row dash-bd-sub">
              <span className="dash-bd-name">Chưa phân bổ</span>
              <b className={`dash-bd-amt${unallocated < 0 ? " neg" : ""}`}>
                {budget ? formatMoney(unallocated) : "…"}
              </b>
            </div>
          </div>

          {/* Quy chung = tien thua lam tron, rieng (khong thuoc quy) */}
          <div className="dash-bd-row dash-bd-main">
            <span className="dash-bd-name">
              <i className="dash-dot dash-dot-surplus" aria-hidden />
              Quỹ chung <em>tiền thừa làm tròn</em>
            </span>
            <b className={`dash-bd-amt${commonFund < 0 ? " neg" : ""}`}>
              {formatMoney(commonFund)}
            </b>
          </div>
        </div>
      </div>

      {/* Cac chi so nhanh */}
      <div className="grid">
        <div className="card stat">
          {/* Icon: users */}
          <svg className="dash-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <div className="label">Thành viên hoạt động</div>
          <div className="value">{summary.active_member_count}</div>
        </div>

        <div className="card stat">
          {/* Icon: alert circle (do neu > 0) */}
          <svg
            className="dash-stat-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke={summary.low_balance_member_count > 0 ? "var(--neg)" : "currentColor"}
            strokeWidth="1.7"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="label">Sắp hết quỹ</div>
          <div className={`value${summary.low_balance_member_count > 0 ? " warn" : ""}`}>
            {summary.low_balance_member_count}
          </div>
        </div>

        <div className="card stat">
          {/* Icon: minus circle */}
          <svg className="dash-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <div className="label">Đã trừ buổi chơi</div>
          <div className="value">{formatMoney(summary.total_session_charge_amount)}</div>
        </div>
      </div>

      {/* Ngan sach thu nho */}
      {cats.length > 0 && (
        <div className="card dash-budget-card">
          <div className="sec-head">
            <h2>Ngân sách</h2>
            <Link href="/reports" className="sec-link">
              Chi tiết →
            </Link>
          </div>
          <div className="cat-list">
            {cats.map((c, idx) => {
              const pct =
                c.advanced > 0
                  ? Math.min(100, (c.used / c.advanced) * 100)
                  : c.used > 0
                  ? 100
                  : 0;
              const over = c.remaining < 0;
              return (
                <div
                  className="cat-row dash-cat-row"
                  key={c.category}
                  style={{ animationDelay: `${0.05 + idx * 0.06}s` }}
                >
                  <div className="cat-head">
                    <span className="cat-name">{c.category}</span>
                    <div className="dash-cat-right">
                      <span className="dash-cat-pct">{Math.round(pct)}%</span>
                      <span
                        className="cat-amount"
                        style={over ? { color: "var(--neg)" } : undefined}
                      >
                        {over ? "Vượt" : "Còn"} {formatMoney(Math.abs(c.remaining))}
                      </span>
                    </div>
                  </div>
                  <div className="cat-track">
                    <div
                      className="cat-bar dash-cat-bar"
                      style={{
                        width: `${pct}%`,
                        background: over ? "var(--neg)" : undefined,
                        animationDelay: `${0.1 + idx * 0.06}s`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ===== Nguoi choi: so du cua minh la chinh =====
function PlayerDashboard({ summary, balance }: { summary: FundSummary; balance: number }) {
  const isNeg = balance < 0;
  const isLow = balance <= 0;

  return (
    <>
      {/* Hero so du cua nguoi choi */}
      <div className={`dash-hero-card${isNeg ? " dash-hero-neg" : ""}`}>
        <div className="dash-hero-glow" aria-hidden />

        <div className="dash-hero-top">
          <span className="dash-hero-label">Số dư của bạn</span>
          {isNeg && (
            <span className="dash-hero-badge dash-hero-badge-neg">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Cần nộp quỹ
            </span>
          )}
        </div>

        <div className={`dash-hero-value${isNeg ? " neg" : ""}`}>
          {formatMoney(balance)}
        </div>

        {isLow && (
          <div className="dash-hero-warn" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Số dư đang thấp. Nhớ nộp thêm quỹ cho thủ quỹ nhé.
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card stat">
          {/* Icon: wallet */}
          <svg className="dash-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M20 12V22H4V12" />
            <path d="M22 7H2v5h20V7z" />
            <path d="M12 22V7" />
            <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
          </svg>
          <div className="label">Quỹ của nhóm</div>
          <div className="value">{formatMoney(summary.total_balance)}</div>
        </div>

        <div className="card stat">
          {/* Icon: users */}
          <svg className="dash-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <div className="label">Thành viên hoạt động</div>
          <div className="value">{summary.active_member_count}</div>
        </div>
      </div>
    </>
  );
}
