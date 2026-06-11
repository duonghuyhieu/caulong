"use client";

import { useEffect, useState } from "react";
import { fundApi, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { FundSummary } from "@/lib/types";

export default function DashboardPage() {
  const { member } = useAuth();
  const isTreasurer = member?.role === "treasurer";

  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setSummary(await fundApi.summary());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="muted center">Đang tải...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!summary) return null;

  const playerStats = [
    { label: "Số dư của bạn", value: formatMoney(member?.balance ?? 0) },
    { label: "Tổng quỹ còn lại", value: formatMoney(summary.total_balance) },
    { label: "Quỹ hiện có", value: formatMoney(summary.common_fund_balance) },
  ];

  const treasurerStats = [
    { label: "Tổng quỹ còn lại", value: formatMoney(summary.total_balance) },
    { label: "Số dư thành viên", value: formatMoney(summary.member_total_balance) },
    { label: "Quỹ hiện có", value: formatMoney(summary.common_fund_balance) },
    { label: "Thành viên hoạt động", value: summary.active_member_count },
    { label: "Sắp hết quỹ", value: summary.low_balance_member_count },
    { label: "Tổng đã nộp", value: formatMoney(summary.total_deposit_amount) },
  ];

  const stats = isTreasurer ? treasurerStats : playerStats;

  return (
    <div>
      <h1>Tổng quan</h1>
      <div className="grid">
        {stats.map((s) => (
          <div className="card stat" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
