import React, { useState, useMemo, useEffect } from 'react';
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
  Info,
  ChevronRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import AccountLedgerModal from './AccountLedgerModal';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { calculateReportActual, getSctsSeparatedCodes, saveSctsSeparatedCodes, isSctsSeparated } from '../utils/sctsConfig';

export default function BudgetOverview({
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  onUpdateBudgets,
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'OVER', 'WARNING', 'SAFE'
  
  // View mode: 'PROGRESS' (Tiến độ giải ngân 1 năm) or 'MATRIX' (Ma trận các cột năm 2024, 2025, 2026, 2027...)
  const [viewMode, setViewMode] = useState('PROGRESS');

  // Drill-down Detail Modal State (Click row to see ledger)
  const [selectedDetailCode, setSelectedDetailCode] = useState(null);

  // Matrix Editing state
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);
  const [editedBudgets, setEditedBudgets] = useState(budgets);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYearModal, setShowAddYearModal] = useState(false);

  const [sctsCodes, setSctsCodes] = useState(getSctsSeparatedCodes);

  useEffect(() => {
    const handleSctsUpdate = () => {
      setSctsCodes(getSctsSeparatedCodes());
    };
    window.addEventListener('app_scts_codes_updated', handleSctsUpdate);
    return () => window.removeEventListener('app_scts_codes_updated', handleSctsUpdate);
  }, []);

  // Admin toggle for optional comparison columns: "Theo Bravo" and "Theo Nhập Liệu"
  const [showBravoCol, setShowBravoCol] = useState(() => {
    try {
      const saved = localStorage.getItem('app_col_show_bravo');
      return saved !== null ? JSON.parse(saved) : false; // Mặc định ẩn, bật lên khi cần
    } catch {
      return false;
    }
  });

  const [showActualCol, setShowActualCol] = useState(() => {
    try {
      const saved = localStorage.getItem('app_col_show_actual');
      return saved !== null ? JSON.parse(saved) : false; // Mặc định ẩn, bật lên khi cần
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_col_show_bravo', JSON.stringify(showBravoCol));
    } catch (e) {
      console.error(e);
    }
  }, [showBravoCol]);

  useEffect(() => {
    try {
      localStorage.setItem('app_col_show_actual', JSON.stringify(showActualCol));
    } catch (e) {
      console.error(e);
    }
  }, [showActualCol]);

  // Sync editedBudgets when budgets prop updates
  useMemo(() => {
    setEditedBudgets(budgets);
  }, [budgets]);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatCompactVND = (num) => {
    const val = Number(num) || 0;
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + ' tỷ';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + ' tr';
    return val.toLocaleString('vi-VN') + ' đ';
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
    (transactions || []).forEach((t) => {
      if (t && t.accountCode) {
        const code = String(t.accountCode).trim();
        map[code] = (map[code] || 0) + (Number(t.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  // Group transactions list by accountCode
  const transactionsByCode = useMemo(() => {
    const map = {};
    (transactions || []).forEach((t) => {
      if (!t) return;
      const code = String(t.accountCode || '').trim();
      if (!map[code]) map[code] = [];
      map[code].push(t);
    });
    return map;
  }, [transactions]);

  // Unique groups
  const groups = useMemo(() => {
    const set = new Set(editedBudgets.map((b) => b.group).filter(Boolean));
    return Array.from(set);
  }, [editedBudgets]);

  // Enhanced budgets for PROGRESS view: picks the approved amount for the selected fiscal year
  // AND compares between Bravo and Nhập Liệu to pick whichever is larger (MAX) for reporting!
  const enhancedBudgets = useMemo(() => {
    return editedBudgets.map((b) => {
      const liveActual =
        liveActualsByCode[b.code] !== undefined ? liveActualsByCode[b.code] : Number(b.actualAmount) || 0;
      const bravoVal = Number(b.bravoActual !== undefined ? b.bravoActual : b.bravoAmount) || 0;
      
      // Pick approved budget for the selected year, fallback to approvedAmount
      const approved =
        b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
          ? Number(b.yearlyApproved[selectedYear])
          : Number(b.approvedAmount) || 0;

      // RULE: Tính chi phí thực tế báo cáo (Tách riêng SCTS nếu thuộc diện dự án lớn của TCT)
      const { reportActual, source, isSctsSeparated: sctsFlag } = calculateReportActual(
        liveActual,
        bravoVal,
        b.code,
        sctsCodes
      );

      const remaining = approved - reportActual;
      const percent = approved > 0 ? (reportActual / approved) * 100 : 0;

      let status = 'SAFE'; // < 80%
      if (percent >= 100) status = 'OVER';
      else if (percent >= 80) status = 'WARNING';

      return {
        ...b,
        selectedYearApproved: approved,
        liveActual,
        bravoVal,
        reportActual,
        source,
        isSctsSeparated: sctsFlag,
        liveRemaining: remaining,
        livePercent: percent,
        status,
      };
    });
  }, [editedBudgets, liveActualsByCode, selectedYear, sctsCodes]);

  // Selected detail account for drilldown modal
  const selectedDetailAccount = useMemo(() => {
    if (!selectedDetailCode) return null;
    const targetCode = String(selectedDetailCode).trim();
    return (
      enhancedBudgets.find((b) => String(b.code || '').trim() === targetCode) ||
      budgets.find((b) => String(b.code || '').trim() === targetCode) || {
        code: targetCode,
        name: `Khoản mục ${targetCode}`,
      }
    );
  }, [selectedDetailCode, enhancedBudgets, budgets]);

  // Filtered
  const filtered = useMemo(() => {
    return enhancedBudgets.filter((b) => {
      const matchSearch = matchesVietnameseSearch(
        [b.code, b.name, b.scope, b.group],
        searchTerm
      );

      const matchGroup = selectedGroup === 'ALL' || b.group === selectedGroup;
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;

      return matchSearch && matchGroup && matchStatus;
    });
  }, [enhancedBudgets, searchTerm, selectedGroup, statusFilter]);

  // Totals for filtered
  const summary = useMemo(() => {
    const totalApproved = filtered.reduce((sum, b) => sum + (Number(b.selectedYearApproved) || 0), 0);
    const totalLiveActual = filtered.reduce((sum, b) => sum + (Number(b.liveActual) || 0), 0);
    const totalBravo = filtered.reduce((sum, b) => sum + (Number(b.bravoVal) || 0), 0);
    const totalReportActual = filtered.reduce((sum, b) => sum + (Number(b.reportActual) || 0), 0);
    const totalRemaining = totalApproved - totalReportActual;
    const avgPercent = totalApproved > 0 ? (totalReportActual / totalApproved) * 100 : 0;
    const overCount = filtered.filter((b) => b.status === 'OVER').length;
    const warningCount = filtered.filter((b) => b.status === 'WARNING').length;

    return {
      totalApproved,
      totalLiveActual,
      totalBravo,
      totalReportActual,
      totalRemaining,
      avgPercent,
      overCount,
      warningCount,
    };
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
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header: Slim, minimalist height */}
      <div className="p-2 sm:p-3.5 border-b border-slate-100 space-y-1.5 sm:space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100"></span>
              <h2 className="text-xs sm:text-base font-bold text-slate-800">
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
            <p className="hidden sm:block text-3xs sm:text-xs text-slate-500 mt-0.5">
              {viewMode === 'PROGRESS'
                ? `Hạn mức và tiến độ giải ngân theo từng mã tài khoản riêng cho năm ${selectedYear}`
                : 'Mỗi năm là một cột hạn mức riêng biệt. Thêm cột mới khi sang năm mới mà không làm xáo trộn năm cũ.'}
            </p>
          </div>

          {/* Toggle View Mode & Actions */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {/* View Mode Buttons */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-md sm:rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('PROGRESS')}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-2xs sm:text-xs font-semibold transition-all ${
                  viewMode === 'PROGRESS'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem tiến độ giải ngân chi tiết theo năm đang chọn"
              >
                <BarChart3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Tiến Độ ({selectedYear})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-2xs sm:text-xs font-semibold transition-all ${
                  viewMode === 'MATRIX'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem bảng ma trận nhiều cột năm (2024, 2025, 2026, 2027...)"
              >
                <TableProperties className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Ma Trận Các Năm</span>
              </button>
            </div>

            {/* Column Visibility Toggles in Progress View (Theo Bravo & Theo Nhập Liệu) */}
            {viewMode === 'PROGRESS' && (
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100/90 rounded-md sm:rounded-lg border border-slate-200/80 text-xs shadow-2xs">
                <span className="text-3xs font-bold text-slate-500 uppercase px-1 flex items-center gap-1 hidden sm:flex">
                  <SlidersHorizontal className="w-2.5 h-2.5 text-slate-400" />
                  <span>Cột:</span>
                </span>

                {/* Toggle Cột Theo Bravo */}
                <button
                  type="button"
                  onClick={() => setShowBravoCol((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-3xs sm:text-2xs font-semibold transition-all cursor-pointer ${
                    showBravoCol
                      ? 'bg-amber-500 text-white shadow-2xs font-bold'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                  title={showBravoCol ? 'Bấm để ẩn cột số liệu Theo Bravo' : 'Bấm để hiện cột số liệu Theo Bravo'}
                >
                  {showBravoCol ? <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <EyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />}
                  <span>Theo Bravo</span>
                </button>

                {/* Toggle Cột Theo Nhập Liệu */}
                <button
                  type="button"
                  onClick={() => setShowActualCol((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-3xs sm:text-2xs font-semibold transition-all cursor-pointer ${
                    showActualCol
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                  title={showActualCol ? 'Bấm để ẩn cột số liệu Theo Nhập Liệu' : 'Bấm để hiện cột số liệu Theo Nhập Liệu'}
                >
                  {showActualCol ? <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <EyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />}
                  <span>Theo Nhập Liệu</span>
                </button>
              </div>
            )}

            {/* Matrix Actions */}
            {viewMode === 'MATRIX' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-2xs sm:text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all"
                  title="Thêm một cột năm mới (ví dụ 2028)"
                >
                  <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>+ Thêm Cột</span>
                </button>

                {!isEditingMatrix ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingMatrix(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-2xs sm:text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all"
                  >
                    <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                    <span>Sửa Hạn Mức</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditedBudgets(budgets);
                        setIsEditingMatrix(false);
                      }}
                      className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-2xs sm:text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMatrix}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-2xs sm:text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all"
                    >
                      <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Lưu</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filter bar (shared): Slim row */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-1.5 sm:gap-2 pt-0.5">
          {/* Search */}
          <div className="col-span-2 sm:col-span-5 relative">
            <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã (627...), tên, quy mô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 sm:pl-8 pr-2 py-1 sm:py-1.5 text-2xs sm:text-xs rounded-md sm:rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Group */}
          <div className="col-span-1 sm:col-span-4 relative">
            <Layers className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full pl-6 sm:pl-7 pr-2 py-1 sm:py-1.5 text-3xs sm:text-xs rounded-md sm:rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all cursor-pointer truncate font-medium"
            >
              <option value="ALL">Tất cả nhóm</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Status (only relevant in Progress view) */}
          <div className="col-span-1 sm:col-span-3 relative">
            <Filter className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-6 sm:pl-7 pr-2 py-1 sm:py-1.5 text-3xs sm:text-xs rounded-md sm:rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all cursor-pointer truncate font-medium"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SAFE">An toàn (&lt; 80%)</option>
              <option value="WARNING">Cảnh báo (80-100%)</option>
              <option value="OVER">Vượt (&gt; 100%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: PROGRESS VIEW (Tiến độ giải ngân 1 năm) */}
      {viewMode === 'PROGRESS' && (
        <>
          {/* Quick Summary Bar: Slim compact horizontal strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-2 p-1 sm:p-2 bg-slate-50/80 border-b border-slate-200 text-xs">
            <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[8.5px] sm:text-3xs font-semibold text-slate-500 uppercase tracking-wide">
                1. Tổng Duyệt
              </span>
              <p className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-0.5 font-mono tracking-tight whitespace-nowrap truncate leading-tight" title={formatVND(summary.totalApproved)}>
                {formatVND(summary.totalApproved)}
              </p>
            </div>

            {showBravoCol && (
              <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-amber-50/70 border border-amber-200/80 shadow-2xs">
                <span className="text-[8.5px] sm:text-3xs font-semibold text-amber-800 uppercase tracking-wide">
                  2. Theo Bravo
                </span>
                <p className="text-[11px] sm:text-xs font-extrabold text-amber-950 mt-0.5 font-mono tracking-tight whitespace-nowrap truncate leading-tight" title={formatVND(summary.totalBravo)}>
                  {formatVND(summary.totalBravo)}
                </p>
              </div>
            )}

            {showActualCol && (
              <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-blue-50/70 border border-blue-200/80 shadow-2xs">
                <span className="text-[8.5px] sm:text-3xs font-semibold text-blue-800 uppercase tracking-wide">
                  3. Theo Nhập Liệu
                </span>
                <p className="text-[11px] sm:text-xs font-extrabold text-blue-950 mt-0.5 font-mono tracking-tight whitespace-nowrap truncate leading-tight" title={formatVND(summary.totalLiveActual)}>
                  {formatVND(summary.totalLiveActual)}
                </p>
              </div>
            )}

            <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-emerald-50/80 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] sm:text-3xs font-bold text-emerald-800 uppercase tracking-wide truncate">
                  Thực Tế (MAX)
                </span>
                <span className="text-[8px] sm:text-3xs font-mono font-bold px-1 py-0.2 bg-emerald-200 text-emerald-900 rounded">
                  MAX
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-extrabold text-emerald-950 mt-0.5 font-mono tracking-tight whitespace-nowrap truncate leading-tight" title={formatVND(summary.totalReportActual)}>
                {formatVND(summary.totalReportActual)}
              </p>
            </div>

            <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[8.5px] sm:text-3xs font-semibold text-slate-500 uppercase tracking-wide">
                Còn Lại (Khả Dụng)
              </span>
              <p
                className={`text-[11px] sm:text-xs font-extrabold mt-0.5 font-mono tracking-tight whitespace-nowrap truncate leading-tight ${
                  summary.totalRemaining < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
                title={formatVND(summary.totalRemaining)}
              >
                {formatVND(summary.totalRemaining)}
              </p>
            </div>
          </div>

          {/* Hint banner: ultra-slim */}
          <div className="px-2.5 sm:px-4 py-0.5 sm:py-1 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[10px] sm:text-2xs text-blue-800 gap-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
              </span>
              <span className="truncate">
                💡 <strong>Quy tắc báo cáo:</strong> Chi Phí Thực Tế = <strong>MAX(Bravo, Nhập liệu)</strong>. <span className="hidden sm:inline">Click vào dòng để xem sổ cái chi tiết.</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-1.5 px-1.5 sm:px-2.5 w-16 sm:w-20">Mã KH</th>
                  <th className="py-1.5 px-1.5 sm:px-2.5 max-w-[200px] sm:max-w-[260px]">Tên Hạng Mục / Khoản Mục</th>
                  <th className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Được Duyệt ({selectedYear})</th>
                  
                  {/* Cột Tùy Chọn: Theo Bravo */}
                  {showBravoCol && (
                    <th className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap bg-amber-50/70 text-amber-900 border-l border-r border-amber-200/50">
                      Theo Bravo
                    </th>
                  )}

                  {/* Cột Tùy Chọn: Theo Nhập Liệu */}
                  {showActualCol && (
                    <th className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap bg-blue-50/70 text-blue-900 border-l border-r border-blue-200/50">
                      Theo Nhập Liệu
                    </th>
                  )}

                  {/* Cột Chính: Chi Phí Thực Tế (MAX Báo Cáo) */}
                  <th className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap bg-emerald-50/90 text-emerald-950 font-bold border-l border-r border-emerald-200/70">
                    Chi Phí Thực Tế
                    <span className="block text-3xs font-normal text-emerald-700">MAX(Bravo, Nhập liệu)</span>
                  </th>

                  <th className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Còn Lại</th>
                  <th className="py-1.5 px-1.5 sm:px-2 whitespace-nowrap w-24 sm:w-28">Tiến Độ</th>
                  <th className="py-1.5 px-1 sm:px-2 text-center w-20 whitespace-nowrap">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + (showBravoCol ? 1 : 0) + (showActualCol ? 1 : 0)}
                      className="text-center py-10 text-slate-400 text-xs"
                    >
                      Không tìm thấy khoản mục kế hoạch phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const percentClamped = Math.min(Math.max(item.livePercent, 0), 100);
                    const count = (transactionsByCode[item.code] || []).length;
                    return (
                      <tr
                        key={item.code}
                        onClick={() => setSelectedDetailCode(item.code)}
                        className="hover:bg-blue-50/80 cursor-pointer transition-colors group"
                        title={`Click để mở sổ cái chi tiết của [${item.code}] ${item.name}`}
                      >
                        {/* Mã */}
                        <td className="py-1.5 px-1.5 sm:px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-2xs sm:text-xs font-bold text-blue-700 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-1.5 py-0.5 rounded border border-blue-200 group-hover:border-blue-600 transition-colors shadow-2xs">
                              {item.code}
                            </span>
                            {count > 0 && (
                              <span
                                className="text-3xs font-bold text-blue-700 bg-blue-100/80 group-hover:bg-white group-hover:text-blue-700 px-1 py-0.2 rounded-full border border-blue-200 transition-colors"
                                title={`${count} phiếu chi phát sinh trong năm ${selectedYear}`}
                              >
                                {count}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tên & Nhóm */}
                        <td className="py-1.5 px-1.5 sm:px-2.5 max-w-[200px] sm:max-w-[260px]">
                          <div className="font-semibold text-slate-800 text-xs truncate leading-snug group-hover:text-blue-700 transition-colors" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-3xs text-slate-400 mt-0.5 truncate" title={item.scope || item.group}>
                            {item.scope ? item.scope : item.group}
                          </div>
                        </td>

                        {/* Được duyệt của năm đang chọn */}
                        <td className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap font-mono text-2xs sm:text-xs text-slate-700 font-semibold">
                          {formatVND(item.selectedYearApproved)}
                        </td>

                        {/* Cột Tùy Chọn: Theo Bravo */}
                        {showBravoCol && (
                          <td className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap font-mono text-2xs sm:text-xs font-semibold text-amber-900 bg-amber-50/20 border-l border-r border-amber-100/60">
                            <div className="flex flex-col items-end">
                              <span>{formatVND(item.bravoVal)}</span>
                              {item.isSctsSeparated && (
                                <span
                                  className="inline-block text-3xs font-semibold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded mt-0.5 border border-amber-300"
                                  title="Bravo hạch toán gộp chung cả SCTX và SCTS (Sửa chữa lớn)"
                                >
                                  Gộp SCTS & SCTX
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Cột Tùy Chọn: Theo Nhập Liệu */}
                        {showActualCol && (
                          <td className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap font-mono text-2xs sm:text-xs font-semibold text-blue-700 bg-blue-50/20 border-l border-r border-blue-100/60">
                            {formatVND(item.liveActual)}
                          </td>
                        )}

                        {/* Cột Chính: Chi Phí Thực Tế (MAX Báo Cáo) */}
                        <td className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap font-mono text-2xs sm:text-xs font-bold text-emerald-950 bg-emerald-50/40 border-l border-r border-emerald-100">
                          <div className="flex flex-col items-end">
                            <span className="font-bold">{formatVND(item.reportActual)}</span>
                            {item.isSctsSeparated ? (
                              <span
                                className="inline-block text-3xs font-semibold text-indigo-800 bg-indigo-100/90 px-1 py-0.2 rounded mt-0.5 border border-indigo-200"
                                title="Đã tách riêng Sửa chữa tài sản (SCTS) theo nghiệp vụ Cảng. Chi phí kế hoạch chỉ tính theo SCTX nhập liệu."
                              >
                                SCTX (Đã tách SCTS)
                              </span>
                            ) : item.source === 'BRAVO' ? (
                              <span
                                className="inline-block text-3xs font-semibold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded mt-0.5 border border-amber-200"
                                title={`Số này lấy theo BRAVO (${formatVND(item.bravoVal)}) vì lớn hơn số nhập liệu (${formatVND(item.liveActual)})`}
                              >
                                (Theo Bravo)
                              </span>
                            ) : item.bravoVal > 0 && item.liveActual === item.bravoVal ? (
                              <span
                                className="inline-block text-3xs font-semibold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded mt-0.5 border border-emerald-200"
                                title="Bravo và Nhập liệu bằng nhau"
                              >
                                (Khớp)
                              </span>
                            ) : (
                              <span
                                className="inline-block text-3xs font-semibold text-blue-800 bg-blue-100/90 px-1 py-0.2 rounded mt-0.5 border border-blue-200"
                                title={`Số này lấy theo Nhập liệu phiếu chi (${formatVND(item.liveActual)})`}
                              >
                                (Theo Nhập liệu)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Còn lại */}
                        <td
                          className={`py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap font-mono text-2xs sm:text-xs font-bold ${
                            item.liveRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatVND(item.liveRemaining)}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-1.5 px-1.5 sm:px-2 whitespace-nowrap w-24 sm:w-28">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 sm:w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                            <span className="text-3xs font-mono font-bold text-slate-600 shrink-0">
                              {item.livePercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-1.5 px-1 sm:px-2 text-center whitespace-nowrap w-20">
                          {item.status === 'OVER' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-3xs font-semibold text-rose-700 bg-rose-50 border border-rose-200">
                              Vượt
                            </span>
                          ) : item.status === 'WARNING' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-3xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                              Gần hết
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-3xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                              An toàn
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer with Column Totals */}
              {filtered.length > 0 && (
                <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan="2" className="py-2.5 px-2.5 sm:px-3">
                      Tổng cộng ({filtered.length} khoản mục)
                    </td>
                    <td className="py-2.5 px-2 sm:px-2.5 text-right font-mono text-slate-900 whitespace-nowrap">
                      {formatVND(summary.totalApproved)}
                    </td>
                    {showBravoCol && (
                      <td className="py-2.5 px-2 sm:px-2.5 text-right font-mono text-amber-900 bg-amber-100/50 border-l border-r border-amber-200 whitespace-nowrap">
                        {formatVND(summary.totalBravo)}
                      </td>
                    )}
                    {showActualCol && (
                      <td className="py-2.5 px-2 sm:px-2.5 text-right font-mono text-blue-900 bg-blue-100/50 border-l border-r border-blue-200 whitespace-nowrap">
                        {formatVND(summary.totalLiveActual)}
                      </td>
                    )}
                    <td className="py-2.5 px-2 sm:px-2.5 text-right font-mono text-emerald-950 bg-emerald-100/70 border-l border-r border-emerald-300 whitespace-nowrap">
                      {formatVND(summary.totalReportActual)}
                    </td>
                    <td
                      className={`py-2.5 px-2 sm:px-2.5 text-right font-mono whitespace-nowrap ${
                        summary.totalRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatVND(summary.totalRemaining)}
                    </td>
                    <td className="py-2.5 px-2 sm:px-2.5 text-center font-mono text-slate-700 whitespace-nowrap">
                      {summary.avgPercent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-1.5 sm:px-2 text-center text-3xs text-slate-500 whitespace-nowrap">
                      {summary.overCount > 0 ? `${summary.overCount} vượt` : '100% OK'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* VIEW 2: MULTI-YEAR MATRIX VIEW (Bảng Ma Trận Các Cột Năm 2024, 2025, 2026, 2027...) */}
      {viewMode === 'MATRIX' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 sticky left-0 bg-slate-50 z-10 w-16 sm:w-20">Mã KH</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 max-w-[220px] sm:max-w-[280px]">Tên Hạng Mục</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 max-w-[140px]">Nhóm Chi Phí</th>
                {matrixYears.map((yr) => (
                  <th
                    key={yr}
                    className={`py-2 px-2.5 sm:py-2.5 sm:px-3 text-right whitespace-nowrap min-w-[110px] font-mono ${
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
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filtered.map((item) => (
                <tr
                  key={item.code}
                  onClick={() => !isEditingMatrix && setSelectedDetailCode(item.code)}
                  className={`hover:bg-blue-50/70 transition-colors group ${!isEditingMatrix ? 'cursor-pointer' : ''}`}
                  title={!isEditingMatrix ? `Click để mở sổ cái chi tiết của [${item.code}] ${item.name}` : ''}
                >
                  {/* Mã */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <span className="font-mono text-2xs sm:text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {item.code}
                    </span>
                  </td>

                  {/* Tên */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-xs font-medium text-slate-800 max-w-[220px] sm:max-w-[280px] truncate" title={item.name}>
                    {item.name}
                  </td>

                  {/* Nhóm */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-xs text-slate-500 max-w-[140px] truncate" title={item.group}>
                    {item.group}
                  </td>

                  {/* Các cột năm tài chính */}
                  {matrixYears.map((yr) => {
                    const val = (item.yearlyApproved && item.yearlyApproved[yr]) || 0;
                    const isSelected = yr === selectedYear;

                    return (
                      <td
                        key={yr}
                        className={`py-2 px-2.5 sm:py-2.5 sm:px-3 text-right whitespace-nowrap font-mono text-xs ${
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

      {/* DETAIL DRILLDOWN MODAL: Sổ Cái Chi Tiết Các Phiếu Chi Theo Mã Khoản Mục */}
      {selectedDetailAccount && (
        <AccountLedgerModal
          isOpen={true}
          account={selectedDetailAccount}
          transactions={transactions}
          budgets={budgets}
          selectedYear={selectedYear}
          onClose={() => setSelectedDetailCode(null)}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onNavigateToLedger={onNavigateToLedger}
        />
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
