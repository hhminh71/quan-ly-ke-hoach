import React, { useState, useMemo } from 'react';
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

export default function ExecutiveDashboard({
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  onNavigateToBudgets,
  onNavigateToLedger,
  onOpenAccountDetail,
}) {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('ALL'); // 'ALL', 'OVER', 'WARNING', 'SAFE'

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatCompactVND = (num) => {
    const val = Number(num) || 0;
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + ' tỷ';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + ' tr';
    return val.toLocaleString('vi-VN') + ' đ';
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

      // Executive Rule: MAX(Bravo, Nhập liệu)
      const reportActual = Math.max(liveActual, bravoVal);
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
        remaining,
        percent,
        status,
        voucherCount: (transactions || []).filter((t) => String(t.accountCode).trim() === code).length,
      };
    });
  }, [budgets, liveActualsByCode, selectedYear, transactions]);

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
    <div className="space-y-3 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Hạn mức duyệt */}
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-md border border-blue-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-blue-200">
              Tổng Hạn Mức Duyệt ({selectedYear})
            </span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center text-blue-300">
              <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black font-mono tracking-tight mt-1 sm:mt-2">
            {formatCompactVND(kpis.totalApproved)}
          </p>
          <p className="text-3xs sm:text-xs text-blue-300/80 mt-0.5 truncate" title={formatVND(kpis.totalApproved)}>
            {formatVND(kpis.totalApproved)}
          </p>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 pt-1.5 sm:pt-2 border-t border-white/10 text-3xs sm:text-2xs text-blue-200">
            <span className="px-1.5 py-0.2 rounded bg-blue-500/30 font-bold">100% Định mức</span>
            <span className="truncate">{budgets.length} danh mục</span>
          </div>
        </div>

        {/* Card 2: Chi phí thực tế (MAX) */}
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-slate-500">
              Chi Phí Thực Tế (MAX)
            </span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black font-mono tracking-tight text-slate-900 mt-1 sm:mt-2">
            {formatCompactVND(kpis.totalReportActual)}
          </p>
          <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
            <span className="text-3xs sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200">
              Đã chi {kpis.avgPercent.toFixed(1)}%
            </span>
            <span className="text-3xs text-slate-400 font-semibold uppercase hidden sm:inline">MAX(Bravo, Nhập liệu)</span>
          </div>
          <div className="mt-2 sm:mt-3 flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-100 text-3xs sm:text-2xs text-slate-500">
            <span>{kpis.totalVouchers.toLocaleString('vi-VN')} phiếu chi</span>
            <span className="font-semibold text-slate-700">{formatCompactVND(kpis.totalReportActual)}</span>
          </div>
        </div>

        {/* Card 3: Khả dụng còn lại */}
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-slate-500">
              Hạn Mức Khả Dụng Còn Lại
            </span>
            <div
              className={`w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${
                kpis.totalRemaining >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p
            className={`text-lg sm:text-2xl font-black font-mono tracking-tight mt-1 sm:mt-2 ${
              kpis.totalRemaining >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatCompactVND(kpis.totalRemaining)}
          </p>
          <p className="text-3xs sm:text-xs text-slate-500 mt-0.5 truncate" title={formatVND(kpis.totalRemaining)}>
            {kpis.totalRemaining >= 0
              ? `Còn ${((kpis.totalRemaining / kpis.totalApproved) * 100).toFixed(1)}%`
              : 'Đã vượt ngân sách'}
          </p>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 pt-1.5 sm:pt-2 border-t border-slate-100 text-3xs sm:text-2xs text-slate-500">
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                kpis.totalRemaining >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            ></span>
            <span className="truncate">
              {kpis.safeCount} an toàn • {kpis.warningCount + kpis.overCount} lưu ý
            </span>
          </div>
        </div>

        {/* Card 4: Tình trạng an toàn & Vận hành */}
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-slate-500">
              An Toàn Ngân Sách
            </span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
            <span className="text-lg sm:text-2xl font-black font-mono text-slate-900">
              {kpis.safeCount}
            </span>
            <span className="text-3xs sm:text-xs text-slate-500 font-semibold">/ {budgets.length} an toàn</span>
          </div>
          <div className="flex items-center gap-1 mt-1 sm:mt-1.5">
            <span className="px-1.5 py-0.2 rounded text-3xs font-bold bg-rose-100 text-rose-800">
              {kpis.overCount} Vượt
            </span>
            <span className="px-1.5 py-0.2 rounded text-3xs font-bold bg-amber-100 text-amber-800">
              {kpis.warningCount} Cảnh báo
            </span>
          </div>
          <div className="mt-2 sm:mt-3 flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-100 text-3xs sm:text-2xs text-slate-500">
            <span>{kpis.uniqueEmployees} cán bộ</span>
            <span className="font-semibold text-blue-600">Năm {selectedYear}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN ANALYTICS GRID: CƠ CẤU THEO NHÓM CHI PHÍ & TIẾN ĐỘ THEO QUÝ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-start">
        {/* Left Column: Cơ Cấu Ngân Sách Theo Nhóm Chi Phí (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Cơ Cấu Chi Phí Theo Nhóm Danh Mục
                </h3>
                <p className="text-3xs text-slate-400">
                  Phân bổ hạn mức và tiến độ giải ngân chi tiết
                </p>
              </div>
            </div>
            {onNavigateToBudgets && (
              <button
                type="button"
                onClick={onNavigateToBudgets}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span className="hidden sm:inline">Xem chi tiết 76 mục</span>
                <span className="sm:hidden">76 mục</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group breakdown progress bars */}
          <div className="space-y-4 pt-1">
            {groupStats.map((g) => {
              const clamped = Math.min(Math.max(g.percent, 0), 100);
              return (
                <div key={g.name} className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 text-xs truncate max-w-[280px]" title={g.name}>
                      {g.name}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-extrabold text-slate-900">{formatCompactVND(g.actual)}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{formatCompactVND(g.approved)}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-3xs font-bold ${
                          g.percent >= 100
                            ? 'bg-rose-100 text-rose-800'
                            : g.percent >= 80
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {g.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
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

                  <div className="flex items-center justify-between text-3xs text-slate-400">
                    <span>{g.count} khoản mục con</span>
                    <span>Còn lại: <strong className="text-slate-600 font-mono">{formatVND(g.remaining)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dòng Tiền Theo Quý & Các Tháng (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Phân Bổ Giải Ngân 4 Quý ({selectedYear})
                </h3>
                <p className="text-3xs text-slate-400">Dòng tiền phát sinh từ sổ cái phiếu chi</p>
              </div>
            </div>
            {onNavigateToLedger && (
              <button
                type="button"
                onClick={() => onNavigateToLedger('ALL')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Mở Sổ Cái</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4 Quarters mini cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {monthlyStats.quarters.map((q, idx) => (
              <div key={q.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                  {q.label}
                </span>
                <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                  {formatCompactVND(q.amount)}
                </p>
                <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
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
          <div className="pt-2">
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Phát sinh 12 tháng trong năm {selectedYear}
            </span>
            <div className="grid grid-cols-12 gap-1 items-end h-28 pt-4 pb-1 border-b border-slate-100">
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
                      className="w-full max-w-[18px] bg-blue-600/80 group-hover:bg-blue-600 rounded-t transition-all"
                      style={{ height: `${heightPercent}%` }}
                      title={`Tháng ${m.month}: ${formatVND(m.amount)} (${m.count} phiếu)`}
                    ></div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 group-hover:text-blue-600 font-semibold">
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-3xs text-slate-400 mt-2 text-center">
              Rê chuột vào từng cột để xem chi tiết số tiền phát sinh theo tháng
            </p>
          </div>
        </div>
      </div>

      {/* 3. LOWER SECTION: TOP 8 SPENDING & RISK MONITOR RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Top 8 Spending Accounts (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Top 8 Khoản Mục Chi Phí Lớn Nhất ({selectedYear})
                </h3>
                <p className="text-3xs text-slate-400">
                  Xếp hạng theo giá trị thực tế MAX(Bravo, Nhập liệu)
                </p>
              </div>
            </div>
            {onNavigateToBudgets && (
              <button
                type="button"
                onClick={onNavigateToBudgets}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline"
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
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-blue-50/50 p-2 rounded-xl transition-colors cursor-pointer group"
                title="Bấm để xem sổ cái chi tiết của khoản mục này"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/80">
                        {item.code}
                      </span>
                      <p className="font-semibold text-slate-900 text-xs truncate group-hover:text-blue-700 transition-colors">
                        {item.name}
                      </p>
                    </div>
                    <p className="text-3xs text-slate-400 truncate max-w-sm mt-0.5">
                      {item.scope || item.group}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-xs text-slate-900">
                    {formatVND(item.reportActual)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-3xs text-slate-400 font-mono">
                      Duyệt: {formatCompactVND(item.approved)}
                    </span>
                    <span
                      className={`text-3xs font-bold px-1.5 py-0.2 rounded ${
                        item.percent >= 100
                          ? 'bg-rose-100 text-rose-800'
                          : item.percent >= 80
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Monitor Radar (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Ra Đa Cảnh Báo Ngân Sách
                </h3>
                <p className="text-3xs text-slate-400">Các khoản mục gần chạm trần hoặc vượt hạn mức</p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-3xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('ALL')}
                className={`px-2 py-1 rounded transition-all ${
                  selectedRiskFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cần Lưu Ý ({kpis.warningCount + kpis.overCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('OVER')}
                className={`px-2 py-1 rounded transition-all ${
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
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {riskAccounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">Tình trạng ngân sách an toàn!</p>
                <p className="text-3xs text-slate-400 mt-0.5">Không có khoản mục nào vượt định mức.</p>
              </div>
            ) : (
              riskAccounts.map((item) => (
                <div
                  key={item.code}
                  onClick={() => onOpenAccountDetail && onOpenAccountDetail(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                    item.status === 'OVER'
                      ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                      : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-3xs font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-800">
                        {item.code}
                      </span>
                      <p className="font-bold text-slate-900 truncate max-w-[190px]" title={item.name}>
                        {item.name}
                      </p>
                    </div>
                    <span
                      className={`text-3xs font-black px-1.5 py-0.5 rounded ${
                        item.status === 'OVER'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-3xs text-slate-600 mt-2 font-mono">
                    <span>Đã chi: <strong>{formatVND(item.reportActual)}</strong></span>
                    <span className={item.remaining < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                      {item.remaining < 0 ? `Vượt: ${formatVND(Math.abs(item.remaining))}` : `Còn: ${formatVND(item.remaining)}`}
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
