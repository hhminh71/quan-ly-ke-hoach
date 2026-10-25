import React from 'react';
import { Wallet, TrendingUp, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function StatCards({ transactions = [], budgets = [], selectedYear = '2026' }) {
  const totalAmount = transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalCount = transactions.length;

  // Total approved from budgets for selected year
  const totalApproved = budgets.reduce((acc, b) => {
    const val =
      b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
        ? Number(b.yearlyApproved[selectedYear])
        : Number(b.approvedAmount) || 0;
    return acc + val;
  }, 0);
  const percentExecuted = totalApproved > 0 ? (totalAmount / totalApproved) * 100 : 0;
  const remainingBudget = totalApproved - totalAmount;

  // Unique employees count
  const uniqueEmployees = new Set(
    transactions.map((t) => (t.employeeName || '').trim()).filter((name) => name && name !== 'Ban Quản lý')
  ).size;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const yearLabel = selectedYear === 'ALL' ? 'Toàn bộ' : `Năm ${selectedYear}`;

  const stats = [
    {
      title: 'Tổng ngân sách duyệt',
      value: formatCurrency(totalApproved),
      description: `${budgets.length} danh mục kế hoạch`,
      icon: Wallet,
      color: 'blue',
      badge: selectedYear === 'ALL' ? 'Tổng định mức' : `Định mức ${selectedYear}`,
      bgGradient: 'from-blue-500/10 to-indigo-500/5',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      title: `Đã chi (${yearLabel})`,
      value: formatCurrency(totalAmount),
      description: `${totalCount.toLocaleString('vi-VN')} phiếu chi phát sinh`,
      icon: TrendingUp,
      color: 'emerald',
      badge: `Đạt ${percentExecuted.toFixed(1)}% kế hoạch`,
      bgGradient: 'from-emerald-500/10 to-teal-500/5',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      title: 'Ngân sách còn lại',
      value: formatCurrency(remainingBudget),
      description: remainingBudget >= 0 ? `Hạn mức khả dụng ${yearLabel}` : 'Cảnh báo vượt định mức',
      icon: remainingBudget >= 0 ? CheckCircle2 : ShieldAlert,
      color: remainingBudget >= 0 ? 'amber' : 'rose',
      badge: `${(100 - percentExecuted).toFixed(1)}% dự trữ`,
      bgGradient: remainingBudget >= 0 ? 'from-amber-500/10 to-orange-500/5' : 'from-rose-500/10 to-pink-500/5',
      iconBg: remainingBudget >= 0 ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white',
    },
    {
      title: 'Nhân sự thực hiện',
      value: `${uniqueEmployees} cán bộ / kỹ sư`,
      description: `Phát sinh chi phí trong ${yearLabel}`,
      icon: Users,
      color: 'purple',
      badge: 'Đang hoạt động',
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
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${stat.iconBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {stat.value}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-500 truncate max-w-[140px]">{stat.description}</span>
                <span className="font-medium text-slate-700 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                  {stat.badge}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
