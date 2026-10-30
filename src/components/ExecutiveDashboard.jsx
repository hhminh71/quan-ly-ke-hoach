import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Calendar,
  Users,
  Building2,
  PieChart,
  BarChart3,
  ChevronRight,
  FileSpreadsheet,
  Activity,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getSctsSeparatedCodes, calculateReportActual } from '../utils/sctsConfig';

export default function ExecutiveDashboard({
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  onNavigateToBudgets,
  onNavigateToLedger,
  onOpenAccountDetail,
}) {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('ALL'); // 'ALL', 'OVER', 'WARNING', 'SAFE'
  const [sctsCodes, setSctsCodes] = useState(getSctsSeparatedCodes);

  useEffect(() => {
    const handleUpdate = () => {
      setSctsCodes(getSctsSeparatedCodes());
    };
    window.addEventListener('app_scts_codes_updated', handleUpdate);
    return () => window.removeEventListener('app_scts_codes_updated', handleUpdate);
  }, []);

  const formatVND = (num) => {
    return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
  };

  const formatCompactVND = (num) => {
    const val = Number(num) || 0;
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + '\u00A0tỷ';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + '\u00A0tr';
    return Math.round(val).toLocaleString('vi-VN') + '\u00A0đ';
  };

  // 1. Live Actuals by Account Code from Transactions
  const liveActualsByCode = useMemo(() => {
    const map = {};
    (transactions || []).forEach((t) => {
      if (t && t.accountCode) {
        const code = String(t.accountCode).trim();
        map[code] = (map[code] || 0) + (Number(t.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  // 2. Compute enhanced items with MAX(Bravo, Nhập liệu)
  const enhancedItems = useMemo(() => {
    return budgets.map((b) => {
      const code = String(b.code || '').trim();
      const liveActual =
        liveActualsByCode[code] !== undefined ? liveActualsByCode[code] : Number(b.actualAmount) || 0;
      const bravoVal = Number(b.bravoActual !== undefined ? b.bravoActual : b.bravoAmount) || 0;

      // Approved for selected fiscal year
      const approved =
        b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
          ? Number(b.yearlyApproved[selectedYear])
          : Number(b.approvedAmount) || 0;

      // Executive Rule: Chi phí thực tế báo cáo (Tách riêng SCTS nếu có)
      const { reportActual, isSctsSeparated: isScts } = calculateReportActual(
        liveActual,
        bravoVal,
        code,
        sctsCodes
      );
      const remaining = approved - reportActual;
      const percent = approved > 0 ? (reportActual / approved) * 100 : 0;

      let status = 'SAFE';
      if (percent >= 100) status = 'OVER';
      else if (percent >= 80) status = 'WARNING';

      return {
        ...b,
        code,
        approved,
        liveActual,
        bravoVal,
        reportActual,
        isSctsSeparated: isScts,
        remaining,
        percent,
        status,
        voucherCount: (transactions || []).filter((t) => String(t.accountCode).trim() === code).length,
      };
    });
  }, [budgets, liveActualsByCode, selectedYear, transactions, sctsCodes]);

  // 3. Macro KPI Totals
  const kpis = useMemo(() => {
    const totalApproved = enhancedItems.reduce((acc, i) => acc + i.approved, 0);
    const totalReportActual = enhancedItems.reduce((acc, i) => acc + i.reportActual, 0);
    const totalRemaining = totalApproved - totalReportActual;
    const avgPercent = totalApproved > 0 ? (totalReportActual / totalApproved) * 100 : 0;
    const overItems = enhancedItems.filter((i) => i.status === 'OVER');
    const warningItems = enhancedItems.filter((i) => i.status === 'WARNING');
    const safeItems = enhancedItems.filter((i) => i.status === 'SAFE');

    const totalVouchers = transactions.length;
    const uniqueEmployees = new Set(
      transactions.map((t) => (t.employeeName || '').trim()).filter((n) => n && n !== 'Ban Quản lý')
    ).size;

    return {
      totalApproved,
      totalReportActual,
      totalRemaining,
      avgPercent,
      overCount: overItems.length,
      warningCount: warningItems.length,
      safeCount: safeItems.length,
      totalVouchers,
      uniqueEmployees,
    };
  }, [enhancedItems, transactions]);

  // 4. Group Analysis (Cơ Cấu Ngân Sách Theo Nhóm Chi Phí)
  const groupStats = useMemo(() => {
    const map = {};
    enhancedItems.forEach((item) => {
      const g = item.group || 'KHÁC';
      if (!map[g]) {
        map[g] = {
          name: g,
          count: 0,
          approved: 0,
          actual: 0,
          remaining: 0,
        };
      }
      map[g].count += 1;
      map[g].approved += item.approved;
      map[g].actual += item.reportActual;
      map[g].remaining += item.remaining;
    });

    return Object.values(map)
      .map((g) => ({
        ...g,
        percent: g.approved > 0 ? (g.actual / g.approved) * 100 : 0,
      }))
      .sort((a, b) => b.actual - a.actual);
  }, [enhancedItems]);

  // 5. Top 8 Spending Accounts (Khoản Mục Chi Tiêu Lớn Nhất)
  const topSpendingAccounts = useMemo(() => {
    return [...enhancedItems].sort((a, b) => b.reportActual - a.reportActual).slice(0, 8);
  }, [enhancedItems]);

  // 6. Quarterly & Monthly Distribution
  const monthlyStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: `T${i + 1}`,
      amount: 0,
      count: 0,
    }));

    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        const m = parseInt(t.date.substring(5, 7), 10);
        if (m >= 1 && m <= 12) {
          months[m - 1].amount += Number(t.amount) || 0;
          months[m - 1].count += 1;
        }
      }
    });

    const maxMonthAmount = Math.max(...months.map((m) => m.amount), 1);

    const q1 = months.slice(0, 3).reduce((acc, m) => acc + m.amount, 0);
    const q2 = months.slice(3, 6).reduce((acc, m) => acc + m.amount, 0);
    const q3 = months.slice(6, 9).reduce((acc, m) => acc + m.amount, 0);
    const q4 = months.slice(9, 12).reduce((acc, m) => acc + m.amount, 0);

    return {
      months,
      maxMonthAmount,
      quarters: [
        { label: 'Quý I', amount: q1 },
        { label: 'Quý II', amount: q2 },
        { label: 'Quý III', amount: q3 },
        { label: 'Quý IV', amount: q4 },
      ],
    };
  }, [transactions]);

  // 7. Filtered Risk Accounts
  const riskAccounts = useMemo(() => {
    if (selectedRiskFilter === 'OVER') return enhancedItems.filter((i) => i.status === 'OVER');
    if (selectedRiskFilter === 'WARNING') return enhancedItems.filter((i) => i.status === 'WARNING');
    if (selectedRiskFilter === 'SAFE') return enhancedItems.filter((i) => i.status === 'SAFE');
    return enhancedItems.filter((i) => i.status !== 'SAFE'); // Default show all warning + over
  }, [enhancedItems, selectedRiskFilter]);

  return (
    <div className="space-y-2 sm:space-y-4 animate-in fade-in duration-200">
      {/* 1. EXECUTIVE KPI SUMMARY CARDS: Slim, Elegant Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
        {/* Card 1: Hạn mức duyệt */}
        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-2xs border border-blue-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">
              Hạn Mức ({selectedYear})
            </span>
            <Wallet className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono tracking-tight mt-0.5">
            {formatCompactVND(kpis.totalApproved)}
          </p>
          <p className="text-[9px] sm:text-[11px] text-blue-300/80 mt-0.5 truncate">
            100% định mức • {budgets.length} danh mục
          </p>
        </div>

        {/* Card 2: Chi phí thực tế (MAX) */}
        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">
              Thực Tế (MAX)
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono tracking-tight text-slate-900 mt-0.5">
            {formatCompactVND(kpis.totalReportActual)}
          </p>
          <p className="text-[9px] sm:text-[11px] text-emerald-700 font-medium mt-0.5 truncate">
            Đã chi {kpis.avgPercent.toFixed(1)}% • {kpis.totalVouchers} hạng mục
          </p>
        </div>

        {/* Card 3: Khả dụng còn lại */}
        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">
              Còn Lại
            </span>
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
              kpis.totalRemaining >= 0 ? 'text-blue-600' : 'text-rose-600'
            }`} />
          </div>
          <p
            className={`text-sm sm:text-lg font-bold font-mono tracking-tight mt-0.5 ${
              kpis.totalRemaining >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatCompactVND(kpis.totalRemaining)}
          </p>
          <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            {kpis.totalRemaining >= 0
              ? `Còn ${((kpis.totalRemaining / kpis.totalApproved) * 100).toFixed(1)}% • ${kpis.safeCount} an toàn`
              : 'Đã vượt định mức'}
          </p>
        </div>

        {/* Card 4: Tình trạng an toàn & Vận hành */}
        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">
              An Toàn
            </span>
            <Activity className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
            {kpis.safeCount} <span className="text-xs text-slate-400 font-normal">/ {budgets.length}</span>
          </p>
          <p className="text-[9px] sm:text-[11px] font-medium text-amber-700 mt-0.5 truncate">
            {kpis.overCount > 0 ? `${kpis.overCount} vượt • ` : ''}{kpis.warningCount} cảnh báo
          </p>
        </div>
      </div>

      {/* 2. MAIN ANALYTICS GRID: CƠ CẤU THEO NHÓM CHI PHÍ & TIẾN ĐỘ THEO QUÝ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 items-start">
        {/* Left Column: Cơ Cấu Ngân Sách Theo Nhóm Chi Phí (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm p-2 sm:p-3.5 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 sm:pb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <PieChart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Cơ Cấu Chi Phí Theo Nhóm
                </h3>
                <p className="hidden sm:block text-[10px] text-slate-400 leading-none">
                  Phân bổ hạn mức và tiến độ giải ngân chi tiết
                </p>
              </div>
            </div>
            {onNavigateToBudgets && (
              <button
                type="button"
                onClick={onNavigateToBudgets}
                className="text-[11px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 sm:gap-1 hover:underline"
              >
                <span className="hidden sm:inline">Xem chi tiết 76 mục</span>
                <span className="sm:hidden">76 mục</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group breakdown progress bars */}
          <div className="space-y-1 sm:space-y-2 pt-0.5">
            {groupStats.map((g) => {
              const clamped = Math.min(Math.max(g.percent, 0), 100);
              return (
                <div key={g.name} className="space-y-0.5 sm:space-y-1 p-1.5 sm:p-2 rounded-lg bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 text-[11px] sm:text-xs truncate max-w-[160px] sm:max-w-[280px]" title={g.name}>
                      {g.name}
                    </span>
                    <div className="flex items-center gap-1 sm:gap-2 font-mono text-[10px] sm:text-xs">
                      <span className="font-extrabold text-slate-900">{formatCompactVND(g.actual)}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{formatCompactVND(g.approved)}</span>
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] sm:text-[10px] font-bold ${
                          g.percent >= 100
                            ? 'bg-rose-100 text-rose-800'
                            : g.percent >= 80
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {g.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 sm:h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        g.percent >= 100
                          ? 'bg-rose-500'
                          : g.percent >= 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      }`}
                      style={{ width: `${clamped}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                    <span>{g.count} mục con</span>
                    <span>Còn: <strong className="text-slate-600 font-mono">{formatVND(g.remaining)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dòng Tiền Theo Quý & Các Tháng (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm p-2 sm:p-3.5 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 sm:pb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Giải Ngân 4 Quý ({selectedYear})
                </h3>
                <p className="hidden sm:block text-[10px] text-slate-400 leading-none">Dòng tiền phát sinh từ sổ cái hạng mục</p>
              </div>
            </div>
            {onNavigateToLedger && (
              <button
                type="button"
                onClick={() => onNavigateToLedger('ALL')}
                className="text-[11px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 sm:gap-1 hover:underline"
              >
                <span>Mở Sổ Cái</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4 Quarters mini cards */}
          <div className="grid grid-cols-2 gap-1 sm:gap-2">
            {monthlyStats.quarters.map((q) => (
              <div key={q.label} className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {q.label}
                </span>
                <p className="text-xs sm:text-xs font-bold font-mono text-slate-900 mt-0.5">
                  {formatCompactVND(q.amount)}
                </p>
                <div className="mt-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${kpis.totalReportActual > 0 ? (q.amount / kpis.totalReportActual) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Burn Rate Bar Chart */}
          <div className="pt-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Phát sinh 12 tháng trong năm {selectedYear}
            </span>
            <div className="grid grid-cols-12 gap-0.5 sm:gap-1 items-end h-16 pt-2 pb-0.5 border-b border-slate-100">
              {monthlyStats.months.map((m) => {
                const heightPercent =
                  monthlyStats.maxMonthAmount > 0
                    ? Math.max((m.amount / monthlyStats.maxMonthAmount) * 100, 6)
                    : 6;
                return (
                  <div
                    key={m.month}
                    className="flex flex-col items-center h-full justify-end group relative"
                  >
                    <div
                      className="w-full max-w-[12px] sm:max-w-[14px] bg-blue-600/80 group-hover:bg-blue-600 rounded-t transition-all"
                      style={{ height: `${heightPercent}%` }}
                      title={`Tháng ${m.month}: ${formatVND(m.amount)} (${m.count} hạng mục)`}
                    ></div>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 group-hover:text-blue-600 font-semibold">
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 mt-1 text-center">
              Rê chuột vào từng cột để xem chi tiết số tiền phát sinh theo tháng
            </p>
          </div>
        </div>
      </div>

      {/* 3. LOWER SECTION: TOP 8 SPENDING & RISK MONITOR RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 items-start">
        {/* Top 8 Spending Accounts (Col 7): Ultra-slim 1-line Rows */}
        <div className="lg:col-span-7 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm p-2 sm:p-3.5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Top 8 Chi Phí Lớn Nhất ({selectedYear})
              </h3>
            </div>
            {onNavigateToBudgets && (
              <button
                type="button"
                onClick={onNavigateToBudgets}
                className="text-[11px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-0.5 hover:underline"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {topSpendingAccounts.map((item, idx) => (
              <div
                key={item.code}
                onClick={() => onOpenAccountDetail && onOpenAccountDetail(item)}
                className="py-1.5 px-1 sm:px-1.5 flex items-center justify-between gap-1.5 hover:bg-slate-50/80 rounded transition-colors cursor-pointer group"
                title={`[${item.code}] ${item.name} • Duyệt: ${formatCompactVND(item.approved)} • Đã chi: ${formatVND(item.reportActual)}`}
              >
                {/* Left: Rank + Code + Full Item Name */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-mono text-[10px] text-slate-400 font-bold w-3 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-blue-600 shrink-0">
                    {item.code}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={item.name}>
                    {item.name}
                  </span>
                </div>

                {/* Right: Compact VND + Percent badge */}
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-900">
                    {formatCompactVND(item.reportActual)}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                      item.percent >= 100
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : item.percent >= 80
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}
                  >
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Monitor Radar (Col 5): Ultra-slim 1-line Rows */}
        <div className="lg:col-span-5 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm p-2 sm:p-3.5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Cảnh Báo Ngân Sách
              </h3>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded text-[9px] sm:text-3xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('ALL')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  selectedRiskFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lưu Ý ({kpis.warningCount + kpis.overCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('OVER')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  selectedRiskFilter === 'OVER'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Vượt ({kpis.overCount})
              </button>
            </div>
          </div>

          {/* List of risk items */}
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
            {riskAccounts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                <p className="font-semibold text-slate-700 text-xs">Tất cả ngân sách an toàn</p>
              </div>
            ) : (
              riskAccounts.map((item) => (
                <div
                  key={item.code}
                  onClick={() => onOpenAccountDetail && onOpenAccountDetail(item)}
                  className="py-1.5 px-1 sm:px-1.5 flex items-center justify-between gap-1.5 hover:bg-slate-50/80 rounded transition-colors cursor-pointer group"
                  title={`[${item.code}] ${item.name} • Duyệt: ${formatCompactVND(item.approved)} • Đã chi: ${formatVND(item.reportActual)}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.status === 'OVER' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-mono text-[10px] font-bold text-slate-700 shrink-0">
                      {item.code}
                    </span>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-right">
                    <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-900">
                      {formatCompactVND(item.reportActual)}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                        item.status === 'OVER'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {item.percent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
