import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Layers,
  PlusCircle,
  Edit3,
  Save,
  X,
  TableProperties,
  BarChart3,
} from 'lucide-react';

export default function BudgetOverview({
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  onUpdateBudgets,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'OVER', 'WARNING', 'SAFE'
  
  // View mode: 'PROGRESS' (Tiến độ giải ngân 1 năm) or 'MATRIX' (Ma trận các cột năm 2024, 2025, 2026, 2027...)
  const [viewMode, setViewMode] = useState('PROGRESS');

  // Matrix Editing state
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);
  const [editedBudgets, setEditedBudgets] = useState(budgets);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYearModal, setShowAddYearModal] = useState(false);

  // Sync editedBudgets when budgets prop updates
  useMemo(() => {
    setEditedBudgets(budgets);
  }, [budgets]);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  // Determine all available budget column years from the data
  const matrixYears = useMemo(() => {
    const yearSet = new Set();
    editedBudgets.forEach((b) => {
      if (b.yearlyApproved) {
        Object.keys(b.yearlyApproved).forEach((y) => yearSet.add(y));
      }
    });
    // Ensure 2024, 2025, 2026, 2027 are present
    ['2024', '2025', '2026', '2027'].forEach((y) => yearSet.add(y));
    return Array.from(yearSet).sort();
  }, [editedBudgets]);

  // Compute live actual spent per account strictly from the passed year's transactions
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
    const set = new Set(editedBudgets.map((b) => b.group).filter(Boolean));
    return Array.from(set);
  }, [editedBudgets]);

  // Enhanced budgets for PROGRESS view: picks the approved amount for the selected fiscal year
  const enhancedBudgets = useMemo(() => {
    return editedBudgets.map((b) => {
      const liveActual = liveActualsByCode[b.code] || 0;
      
      // Pick approved budget for the selected year, fallback to approvedAmount
      const approved =
        b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
          ? Number(b.yearlyApproved[selectedYear])
          : Number(b.approvedAmount) || 0;

      const remaining = approved - liveActual;
      const percent = approved > 0 ? (liveActual / approved) * 100 : 0;

      let status = 'SAFE'; // < 80%
      if (percent >= 100) status = 'OVER';
      else if (percent >= 80) status = 'WARNING';

      return {
        ...b,
        selectedYearApproved: approved,
        liveActual,
        liveRemaining: remaining,
        livePercent: percent,
        status,
      };
    });
  }, [editedBudgets, liveActualsByCode, selectedYear]);

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
    const totalApproved = filtered.reduce((sum, b) => sum + (Number(b.selectedYearApproved) || 0), 0);
    const totalActual = filtered.reduce((sum, b) => sum + (Number(b.liveActual) || 0), 0);
    const totalRemaining = totalApproved - totalActual;
    const avgPercent = totalApproved > 0 ? (totalActual / totalApproved) * 100 : 0;
    const overCount = filtered.filter((b) => b.status === 'OVER').length;
    const warningCount = filtered.filter((b) => b.status === 'WARNING').length;

    return { totalApproved, totalActual, totalRemaining, avgPercent, overCount, warningCount };
  }, [filtered]);

  // Handle cell edit in Matrix mode
  const handleMatrixCellChange = (code, year, value) => {
    const num = Number(value.replace(/\D/g, '')) || 0;
    setEditedBudgets((prev) =>
      prev.map((b) => {
        if (b.code === code) {
          const updatedYearly = { ...(b.yearlyApproved || {}), [year]: num };
          return {
            ...b,
            yearlyApproved: updatedYearly,
            approvedAmount: year === '2026' ? num : b.approvedAmount,
          };
        }
        return b;
      })
    );
  };

  // Add new year column
  const handleAddNewYearColumn = (e) => {
    e.preventDefault();
    const yr = newYearInput.trim();
    if (!yr || !/^\d{4}$/.test(yr)) {
      alert('Vui lòng nhập năm hợp lệ gồm 4 chữ số (ví dụ: 2028)');
      return;
    }
    if (matrixYears.includes(yr)) {
      alert(`Cột năm ${yr} đã tồn tại trong danh sách!`);
      return;
    }

    setEditedBudgets((prev) =>
      prev.map((b) => {
        const lastYearVal =
          (b.yearlyApproved && b.yearlyApproved[String(Number(yr) - 1)]) || b.approvedAmount || 0;
        return {
          ...b,
          yearlyApproved: {
            ...(b.yearlyApproved || {}),
            [yr]: Math.round(Number(lastYearVal) * 1.05), // default +5%
          },
        };
      })
    );

    setNewYearInput('');
    setShowAddYearModal(false);
    setIsEditingMatrix(true);
    alert(`Đã thêm cột Năm ${yr} thành công vào bảng kế hoạch!`);
  };

  // Save matrix changes
  const handleSaveMatrix = () => {
    if (onUpdateBudgets) {
      onUpdateBudgets(editedBudgets);
    }
    setIsEditingMatrix(false);
    alert('Đã lưu các thay đổi hạn mức ngân sách thành công!');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
              <h2 className="text-lg font-bold text-slate-800">
                {viewMode === 'PROGRESS' ? (
                  <>
                    Tiến Độ Kế Hoạch Định Mức{' '}
                    <span className="text-blue-600 font-extrabold">
                      ({selectedYear === 'ALL' ? 'Tất Cả Các Năm' : `Năm ${selectedYear}`})
                    </span>
                  </>
                ) : (
                  <>
                    Ma Trận Kế Hoạch Ngân Sách Đa Năm{' '}
                    <span className="text-indigo-600 font-extrabold">
                      (Cột {matrixYears.join(', ')})
                    </span>
                  </>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {viewMode === 'PROGRESS'
                ? `Hạn mức và tiến độ giải ngân theo từng mã tài khoản riêng cho năm ${selectedYear}`
                : 'Mỗi năm là một cột hạn mức riêng biệt. Thêm cột mới khi sang năm mới mà không làm xáo trộn năm cũ.'}
            </p>
          </div>

          {/* Toggle View Mode & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Buttons */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('PROGRESS')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'PROGRESS'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem tiến độ giải ngân chi tiết theo năm đang chọn"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Tiến Độ ({selectedYear})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'MATRIX'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem bảng ma trận nhiều cột năm (2024, 2025, 2026, 2027...)"
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Ma Trận Các Năm</span>
              </button>
            </div>

            {/* Matrix Actions */}
            {viewMode === 'MATRIX' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all"
                  title="Thêm một cột năm mới (ví dụ 2028)"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Thêm Cột Năm</span>
                </button>

                {!isEditingMatrix ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingMatrix(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sửa Hạn Mức</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditedBudgets(budgets);
                        setIsEditingMatrix(false);
                      }}
                      className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMatrix}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu Hạn Mức</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filter bar (shared) */}
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

          {/* Status (only relevant in Progress view) */}
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

      {/* VIEW 1: PROGRESS VIEW (Tiến độ giải ngân 1 năm) */}
      {viewMode === 'PROGRESS' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Mã KH</th>
                <th className="py-3 px-4">Tên Hạng Mục / Khoản Mục</th>
                <th className="py-3 px-4 text-right">Được Duyệt ({selectedYear})</th>
                <th className="py-3 px-4 text-right">Đã Chi ({selectedYear})</th>
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

                      {/* Được duyệt của năm đang chọn */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs text-slate-700 font-semibold">
                        {formatVND(item.selectedYearApproved)}
                      </td>

                      {/* Đã chi trong năm đang chọn */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs text-blue-600 font-bold">
                        {formatVND(item.liveActual)}
                      </td>

                      {/* Còn lại */}
                      <td
                        className={`py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs font-bold ${
                          item.liveRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
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
      )}

      {/* VIEW 2: MULTI-YEAR MATRIX VIEW (Bảng Ma Trận Các Cột Năm 2024, 2025, 2026, 2027...) */}
      {viewMode === 'MATRIX' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6 sticky left-0 bg-slate-50 z-10">Mã KH</th>
                <th className="py-3 px-4 min-w-[200px]">Tên Hạng Mục</th>
                <th className="py-3 px-4 min-w-[150px]">Nhóm Chi Phí</th>
                {matrixYears.map((yr) => (
                  <th
                    key={yr}
                    className={`py-3 px-4 text-right min-w-[140px] font-mono ${
                      yr === selectedYear
                        ? 'bg-blue-100/70 text-blue-900 font-bold border-x border-blue-200'
                        : ''
                    }`}
                  >
                    <span>Cột Năm {yr}</span>
                    {yr === selectedYear && (
                      <span className="block text-[9px] font-sans text-blue-600 font-normal">
                        (Đang chọn)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((item) => (
                <tr key={item.code} className="hover:bg-slate-50/70 transition-colors">
                  {/* Mã */}
                  <td className="py-3 px-4 sm:px-6 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.code}
                    </span>
                  </td>

                  {/* Tên */}
                  <td className="py-3 px-4 text-xs font-medium text-slate-800">
                    {item.name}
                  </td>

                  {/* Nhóm */}
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {item.group}
                  </td>

                  {/* Các cột năm tài chính */}
                  {matrixYears.map((yr) => {
                    const val = (item.yearlyApproved && item.yearlyApproved[yr]) || 0;
                    const isSelected = yr === selectedYear;

                    return (
                      <td
                        key={yr}
                        className={`py-2 px-3 text-right whitespace-nowrap font-mono text-xs ${
                          isSelected ? 'bg-blue-50/50 border-x border-blue-100 font-bold text-blue-900' : 'text-slate-700'
                        }`}
                      >
                        {isEditingMatrix ? (
                          <input
                            type="text"
                            value={val ? val.toLocaleString('vi-VN') : '0'}
                            onChange={(e) => handleMatrixCellChange(item.code, yr, e.target.value)}
                            className="w-full text-right px-2 py-1 rounded border border-indigo-300 bg-white text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        ) : (
                          <span>{formatVND(val)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Thêm Cột Năm Mới */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>Thêm Cột Năm Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddYearModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewYearColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhập số năm cần thêm cột (ví dụ: 2028):
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="2028"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống sẽ tự động nhân bản 76 khoản mục sang cột năm mới với hạn mức ban đầu.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Tạo Cột Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
