import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Layers } from 'lucide-react';

export default function BudgetOverview({ budgets, transactions }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'OVER', 'WARNING', 'SAFE'

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  // Compute live actual spent per account from transactions
  const liveActualsByCode = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (t.accountCode) {
        map[t.accountCode] = (map[t.accountCode] || 0) + (Number(t.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  // Unique groups
  const groups = useMemo(() => {
    const set = new Set(budgets.map((b) => b.group).filter(Boolean));
    return Array.from(set);
  }, [budgets]);

  // Enhanced budgets with live calculation
  const enhancedBudgets = useMemo(() => {
    return budgets.map((b) => {
      // Use live transaction total if available, otherwise fallback to imported actualAmount
      const liveActual = liveActualsByCode[b.code] !== undefined ? liveActualsByCode[b.code] : (b.actualAmount || 0);
      const approved = Number(b.approvedAmount) || 0;
      const remaining = approved - liveActual;
      const percent = approved > 0 ? (liveActual / approved) * 100 : 0;

      let status = 'SAFE'; // < 80%
      if (percent >= 100) status = 'OVER';
      else if (percent >= 80) status = 'WARNING';

      return {
        ...b,
        liveActual,
        liveRemaining: remaining,
        livePercent: percent,
        status,
      };
    });
  }, [budgets, liveActualsByCode]);

  // Filtered
  const filtered = useMemo(() => {
    return enhancedBudgets.filter((b) => {
      const matchSearch =
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.scope && b.scope.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGroup = selectedGroup === 'ALL' || b.group === selectedGroup;
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;

      return matchSearch && matchGroup && matchStatus;
    });
  }, [enhancedBudgets, searchTerm, selectedGroup, statusFilter]);

  // Totals for filtered
  const summary = useMemo(() => {
    const totalApproved = filtered.reduce((sum, b) => sum + (Number(b.approvedAmount) || 0), 0);
    const totalActual = filtered.reduce((sum, b) => sum + (Number(b.liveActual) || 0), 0);
    const totalRemaining = totalApproved - totalActual;
    const avgPercent = totalApproved > 0 ? (totalActual / totalApproved) * 100 : 0;
    const overCount = filtered.filter((b) => b.status === 'OVER').length;
    const warningCount = filtered.filter((b) => b.status === 'WARNING').length;

    return { totalApproved, totalActual, totalRemaining, avgPercent, overCount, warningCount };
  }, [filtered]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
              <h2 className="text-lg font-bold text-slate-800">
                Bảng Kế Hoạch Ngân Sách Định Mức (76 Khoản Mục)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi hạn mức được duyệt, số tiền đã thực hiện và tỷ lệ giải ngân theo từng mã tài khoản
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Hạn mức hiển thị:</span>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
              {formatVND(summary.totalApproved)}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Còn lại:</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              summary.totalRemaining >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {formatVND(summary.totalRemaining)}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã (627...), tên hạng mục, quy mô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Group */}
          <div className="sm:col-span-4 relative">
            <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả nhóm chi phí</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="sm:col-span-3 relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SAFE">An toàn (&lt; 80%)</option>
              <option value="WARNING">Cảnh báo (80% - 100%)</option>
              <option value="OVER">Vượt ngân sách (&gt; 100%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Mã KH</th>
              <th className="py-3 px-4">Tên Hạng Mục / Khoản Mục</th>
              <th className="py-3 px-4 text-right">Được Duyệt</th>
              <th className="py-3 px-4 text-right">Đã Thực Hiện</th>
              <th className="py-3 px-4 text-right">Còn Lại</th>
              <th className="py-3 px-4 min-w-[140px]">Tiến Độ Giải Ngân</th>
              <th className="py-3 px-4 text-center">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-400 text-xs">
                  Không tìm thấy khoản mục kế hoạch phù hợp
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const percentClamped = Math.min(Math.max(item.livePercent, 0), 100);
                return (
                  <tr key={item.code} className="hover:bg-slate-50/70 transition-colors">
                    {/* Mã */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        {item.code}
                      </span>
                    </td>

                    {/* Tên & Nhóm */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={item.scope || item.group}>
                        {item.scope ? item.scope : item.group}
                      </div>
                    </td>

                    {/* Được duyệt */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs text-slate-700 font-semibold">
                      {formatVND(item.approvedAmount)}
                    </td>

                    {/* Đã thực hiện */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs text-blue-600 font-bold">
                      {formatVND(item.liveActual)}
                    </td>

                    {/* Còn lại */}
                    <td className={`py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs font-bold ${
                      item.liveRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}>
                      {formatVND(item.liveRemaining)}
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.livePercent >= 100
                                ? 'bg-rose-500'
                                : item.livePercent >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentClamped}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0 w-12 text-right">
                          {item.livePercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.status === 'OVER' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>Vượt định mức</span>
                        </span>
                      ) : item.status === 'WARNING' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <TrendingUp className="w-3 h-3 text-amber-500" />
                          <span>Gần hết</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>An toàn</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
