"use client";

import { useEffect, useMemo, useState } from "react";
import { fundApi, membersApi, playSessionsApi, ApiError } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { FundSummary, Member, PlaySession } from "@/lib/types";

export default function DashboardPage() {
  const { member } = useAuth();
  const isTreasurer = member?.role === "treasurer";

  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  useEffect(() => {
    async function load() {
      try {
        const summaryData = await fundApi.summary();
        setSummary(summaryData);
        // Người chơi: gộp luôn lịch sử buổi chơi vào màn này.
        if (member && member.role !== "treasurer") {
          setSessions(await playSessionsApi.list());
          setMembers(await membersApi.list());
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [member]);

  if (loading) return <p className="muted">Đang tải...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!summary) return null;

  const playerStats = [
    { label: "Số dư của bạn", value: formatMoney(member?.balance ?? 0) },
    { label: "Tổng quỹ còn lại", value: formatMoney(summary.total_balance) },
    { label: "Quỹ chung", value: formatMoney(summary.common_fund_balance) },
  ];

  const treasurerStats = [
    { label: "Tổng quỹ còn lại", value: formatMoney(summary.total_balance) },
    { label: "Số dư thành viên", value: formatMoney(summary.member_total_balance) },
    { label: "Quỹ chung", value: formatMoney(summary.common_fund_balance) },
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

      {/* Người chơi: lịch sử buổi chơi nằm ngay dưới, không tách màn riêng */}
      {!isTreasurer && (
        <div className="card">
          <h2>Lịch sử buổi chơi</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th className="right">Tổng chi</th>
                <th className="right">Mỗi slot</th>
                <th>Người tham gia</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td data-label="Ngày" className="muted">
                    {formatDate(s.played_at)}
                  </td>
                  <td data-label="Tổng chi" className="right">
                    {formatMoney(s.total_cost)}
                  </td>
                  <td data-label="Mỗi slot" className="right">
                    {formatMoney(s.cost_per_slot)}
                  </td>
                  <td data-label="Người tham gia">
                    {s.participants
                      .map((p) => `${memberName.get(p.member_id) ?? "?"} (${p.slot_count})`)
                      .join(", ")}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Chưa có buổi chơi nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
