import React from 'react';
import { Wallet, FileSpreadsheet, TrendingUp, Users } from 'lucide-react';

export default function StatCards({ transactions }) {
  const totalAmount = transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalCount = transactions.length;
  const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
  
  // Unique employees count
  const uniqueEmployees = new Set(transactions.map((t) => t.employeeName.trim())).size;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const stats = [
    {
      title: 'Tổng chi tiêu',
      value: formatCurrency(totalAmount),
      description: 'Tổng tiền các phiếu đã nhập',
      icon: Wallet,
      color: 'blue',
      badge: '+12% tuần này',
      bgGradient: 'from-blue-500/10 to-indigo-500/5',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      title: 'Tổng số phiếu',
      value: `${totalCount} phiếu`,
      description: 'Lượt nhập liệu ghi nhận',
      icon: FileSpreadsheet,
      color: 'emerald',
      badge: 'Cập nhật tức thì',
      bgGradient: 'from-emerald-500/10 to-teal-500/5',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      title: 'Trung bình / phiếu',
      value: formatCurrency(avgAmount),
      description: 'Giá trị bình quân',
      icon: TrendingUp,
      color: 'amber',
      badge: 'Ổn định',
      bgGradient: 'from-amber-500/10 to-orange-500/5',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      title: 'Nhân viên tham gia',
      value: `${uniqueEmployees} nhân sự`,
      description: 'Đã phát sinh phiếu thu chi',
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
