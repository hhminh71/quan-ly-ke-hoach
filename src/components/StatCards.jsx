import React from 'react';
import { Wallet, TrendingUp, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { calculateReportActual } from '../utils/sctsConfig';

export default function StatCards({ transactions = [], budgets = [], selectedYear = '2026' }) {
  const totalCount = transactions.length;

  // Map live actuals by code from transactions
  const liveActualsByCode = React.useMemo(() => {
    const map = {};
    (transactions || []).forEach((t) => {
      if (t && t.accountCode) {
        const code = String(t.accountCode).trim();
        map[code] = (map[code] || 0) + (Number(t.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  // Total approved from budgets for selected year
  const totalApproved = React.useMemo(() => {
    return budgets.reduce((acc, b) => {
      const val =
        b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
          ? Number(b.yearlyApproved[selectedYear])
          : Number(b.approvedAmount) || 0;
      return acc + val;
    }, 0);
  }, [budgets, selectedYear]);

  // Total actual reporting cost = SUM(calculateReportActual(liveActual, bravoVal, code))
  const totalReportActual = React.useMemo(() => {
    return budgets.reduce((acc, b) => {
      const code = String(b.code || '').trim();
      const liveActual =
        liveActualsByCode[code] !== undefined ? liveActualsByCode[code] : Number(b.actualAmount) || 0;
      const bravoVal = Number(b.bravoActual !== undefined ? b.bravoActual : b.bravoAmount) || 0;
      const { reportActual } = calculateReportActual(liveActual, bravoVal, code);
      return acc + reportActual;
    }, 0);
  }, [budgets, liveActualsByCode]);

  const percentExecuted = totalApproved > 0 ? (totalReportActual / totalApproved) * 100 : 0;
  const remainingBudget = totalApproved - totalReportActual;

  // Unique employees count
  const uniqueEmployees = new Set(
    transactions.map((t) => (t.employeeName || '').trim()).filter((name) => name && name !== 'Ban Quản lý')
  ).size;

  const formatCurrency = (val) => {
    return Math.round(Number(val) || 0).toLocaleString('vi-VN') + '\u00A0đ';
  };

  const yearLabel = selectedYear === 'ALL' ? 'Toàn bộ' : `Năm ${selectedYear}`;

  const remainingPercent = totalApproved > 0 ? (remainingBudget / totalApproved) * 100 : 0;

  const stats = [
    {
      title: `Tổng được duyệt (${yearLabel})`,
      value: formatCurrency(totalApproved),
      description: `${budgets.length} danh mục kế hoạch`,
      icon: Wallet,
      color: 'blue',
      badge: '100% Định mức',
      progress: 100,
      progressColor: 'bg-blue-600',
      bgGradient: 'from-blue-500/10 to-indigo-500/5',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      title: `Tổng chi phí thực tế (${yearLabel})`,
      value: formatCurrency(totalReportActual),
      description: `MAX(Bravo, Nhập liệu) • ${totalCount.toLocaleString('vi-VN')} hạng mục`,
      icon: TrendingUp,
      color: 'emerald',
      badge: `Đã chi ${percentExecuted.toFixed(1)}%`,
      progress: Math.min(percentExecuted, 100),
      progressColor: percentExecuted > 100 ? 'bg-rose-500' : percentExecuted > 80 ? 'bg-amber-500' : 'bg-emerald-500',
      bgGradient: 'from-emerald-500/10 to-teal-500/5',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      title: `Tổng còn lại (${yearLabel})`,
      value: formatCurrency(remainingBudget),
      description: remainingBudget >= 0 ? `Dự trữ khả dụng ${yearLabel}` : 'Cảnh báo vượt ngân sách',
      icon: remainingBudget >= 0 ? CheckCircle2 : ShieldAlert,
      color: remainingBudget >= 0 ? 'emerald' : 'rose',
      badge: remainingBudget >= 0 ? `Còn lại ${remainingPercent.toFixed(1)}%` : `Vượt ${Math.abs(remainingPercent).toFixed(1)}%`,
      progress: Math.max(0, Math.min(remainingPercent, 100)),
      progressColor: remainingBudget >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
      bgGradient: remainingBudget >= 0 ? 'from-amber-500/10 to-emerald-500/5' : 'from-rose-500/10 to-pink-500/5',
      iconBg: remainingBudget >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white',
    },
    {
      title: 'Nhân sự thực hiện',
      value: `${uniqueEmployees} cán bộ / kỹ sư`,
      description: `Phát sinh chi phí trong ${yearLabel}`,
      icon: Users,
      color: 'purple',
      badge: 'Đang hoạt động',
      progress: null,
      bgGradient: 'from-purple-500/10 to-pink-500/5',
      iconBg: 'bg-purple-600 text-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-br ${stat.bgGradient}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${stat.iconBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono whitespace-nowrap truncate">
                {stat.value}
              </div>
              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="text-slate-500 truncate max-w-[140px] font-medium">{stat.description}</span>
                <span className={`font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  idx === 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : idx === 1
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : idx === 2
                    ? stat.progressColor.includes('rose')
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {stat.badge}
                </span>
              </div>

              {/* Progress bar */}
              {stat.progress !== null && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${stat.progressColor}`}
                    style={{ width: `${stat.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
