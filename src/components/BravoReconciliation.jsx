import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Info,
  ChevronRight,
  ExternalLink,
  Layers,
  Building2,
  PieChart,
  ShieldAlert,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import bravoInfoData from '../data/bravoInfo.json';
import AccountLedgerModal from './AccountLedgerModal';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { getSctsSeparatedCodes, calculateReportActual, isSctsSeparated } from '../utils/sctsConfig';
import { useResizableColumns, ColumnResizeHandle, ColumnVisibilityDropdown } from '../hooks/useResizableColumns';

export default function BravoReconciliation({
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
  bravoInfo = null,
}) {
  const activeBravoInfo = useMemo(() => {
    return Array.isArray(bravoInfo) && bravoInfo.length > 0 ? bravoInfo : bravoInfoData;
  }, [bravoInfo]);
  // Mode: 'PLANNING_RECON' (Đối soát 76 khoản mục Tổ KH) or 'MACRO_INFO' (Toàn cảnh 152 mục Sheet INFO)
  const [activeSubTab, setActiveSubTab] = useState('PLANNING_RECON');

  // Filters for Planning Recon View
  const [planningSearch, setPlanningSearch] = useState('');
  const [planningGroupFilter, setPlanningGroupFilter] = useState('ALL');
  const [discrepancyFilter, setDiscrepancyFilter] = useState('ALL'); // 'ALL', 'BRAVO_HIGH', 'ACTUAL_HIGH', 'MATCHED', 'DIFF_ONLY'
  const [planningSort, setPlanningSort] = useState('abs_diff_desc'); // 'abs_diff_desc', 'diff_desc', 'diff_asc', 'code_asc', 'approved_desc'

  // Filters for Macro INFO View
  const [macroSearch, setMacroSearch] = useState('');
  const [macroCategoryFilter, setMacroCategoryFilter] = useState('ALL');
  const [macroOwnerFilter, setMacroOwnerFilter] = useState('ALL'); // 'ALL', 'PLANNING', 'CORPORATE'

  // Drilldown modal state
  const [selectedDetailCode, setSelectedDetailCode] = useState(null);
  const [sctsCodes, setSctsCodes] = useState(getSctsSeparatedCodes);

  // Resizable columns hook for 76 Planning Items Table
  const {
    columnWidths: reconWidths,
    handleResizeStart: handleReconResizeStart,
    resetColumnWidth: resetReconColumnWidth,
    totalTableWidth: totalReconWidth,
    isColumnVisible: isReconColVisible,
    toggleColumnVisibility: toggleReconCol,
    showAllColumns: showAllReconCols,
  } = useResizableColumns({
    storageKey: 'tbl_cols_bravo_recon_v2',
    initialWidths: {
      stt: 38,
      code: 68,
      name: 210,
      group: 95,
      approved: 100,
      actual: 100,
      bravo: 100,
      diff: 105,
      maxActual: 110,
      remaining: 95,
      percent: 55,
      ledger: 45,
    },
    minWidths: {
      stt: 28,
      code: 42,
      name: 85,
      group: 50,
      approved: 60,
      actual: 60,
      bravo: 60,
      diff: 65,
      maxActual: 70,
      remaining: 60,
      percent: 40,
      ledger: 35,
    },
  });

  const reconTableColumns = useMemo(
    () => [
      { key: 'stt', label: 'STT' },
      { key: 'code', label: 'Mã TK' },
      { key: 'name', label: 'Khoản Mục & Quy Mô' },
      { key: 'group', label: 'Nhóm' },
      { key: 'approved', label: 'Hạn Mức Duyệt' },
      { key: 'actual', label: 'Thực Tế Tổ KH' },
      { key: 'bravo', label: 'Hạch Toán BRAVO' },
      { key: 'diff', label: 'Chênh Lệch (±)' },
      { key: 'maxActual', label: 'MAX Quản Lý' },
      { key: 'remaining', label: 'Còn Lại' },
      { key: 'percent', label: 'Tỷ Lệ' },
      { key: 'ledger', label: 'Sổ Cái' },
    ],
    []
  );

  // Resizable columns hook for Sheet INFO 152 items Table
  const {
    columnWidths: macroWidths,
    handleResizeStart: handleMacroResizeStart,
    resetColumnWidth: resetMacroColumnWidth,
    totalTableWidth: totalMacroWidth,
    isColumnVisible: isMacroColVisible,
    toggleColumnVisibility: toggleMacroCol,
    showAllColumns: showAllMacroCols,
  } = useResizableColumns({
    storageKey: 'tbl_cols_bravo_macro_v2',
    initialWidths: {
      row: 42,
      code: 68,
      name: 220,
      category: 100,
      approved: 100,
      bravo: 100,
      rate: 55,
      owner: 100,
      reason: 200,
    },
    minWidths: {
      row: 30,
      code: 42,
      name: 85,
      category: 55,
      approved: 60,
      bravo: 60,
      rate: 40,
      owner: 65,
      reason: 80,
    },
  });

  const macroTableColumns = useMemo(
    () => [
      { key: 'row', label: 'Dòng' },
      { key: 'code', label: 'Mã TK' },
      { key: 'name', label: 'Tên Hạng Mục / Khoản Mục' },
      { key: 'category', label: 'Nhóm Danh Mục' },
      { key: 'approved', label: 'Hạn Mức Duyệt' },
      { key: 'bravo', label: 'Đã Ghi Sổ BRAVO' },
      { key: 'rate', label: 'Tỷ Lệ' },
      { key: 'owner', label: 'Đơn Vị Quản Lý' },
      { key: 'reason', label: 'Giải Trình & Lý Do' },
    ],
    []
  );

  useEffect(() => {
    const handleUpdate = () => {
      setSctsCodes(getSctsSeparatedCodes());
    };
    window.addEventListener('app_scts_codes_updated', handleUpdate);
    return () => window.removeEventListener('app_scts_codes_updated', handleUpdate);
  }, []);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatCompactVND = (num) => {
    const val = Number(num) || 0;
    if (Math.abs(val) >= 1e9) {
      return (val / 1e9).toFixed(2) + ' tỷ';
    }
    if (Math.abs(val) >= 1e6) {
      return (val / 1e6).toFixed(1) + ' tr';
    }
    return val.toLocaleString('vi-VN') + ' đ';
  };

  // 1. Live Actuals from Transactions for the selected year
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

  // 2. Compute 76 Planning Items with 4-way comparison
  const reconItems = useMemo(() => {
    return (budgets || []).map((b, idx) => {
      const code = String(b.code || '').trim();
      const name = String(b.name || '').trim();
      const group = String(b.group || 'KHÁC').trim();

      // Approved for selected fiscal year
      const approved =
        b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
          ? Number(b.yearlyApproved[selectedYear])
          : Number(b.approvedAmount) || 0;

      // Actual from Planning vouchers
      const actual = liveActualsByCode[code] !== undefined ? liveActualsByCode[code] : Number(b.actualAmount) || 0;

      // Actual from BRAVO
      const bravo = Number(b.bravoActual !== undefined ? b.bravoActual : b.bravoAmount) || 0;

      // Discrepancy (BRAVO - Thực tế)
      const diff = bravo - actual;
      const absDiff = Math.abs(diff);

      // Prudent Management Spent = Chi phí thực tế báo cáo (Tách riêng SCTS nếu có)
      const { reportActual: maxActual, isSctsSeparated: isScts } = calculateReportActual(
        actual,
        bravo,
        code,
        sctsCodes
      );
      const remaining = approved - maxActual;
      const percent = approved > 0 ? (maxActual / approved) * 100 : 0;

      // Status
      let status = 'MATCHED'; // Khớp
      if (diff > 500) status = 'BRAVO_HIGH'; // BRAVO > Thực tế
      else if (diff < -500) status = 'ACTUAL_HIGH'; // Thực tế > BRAVO

      return {
        ...b,
        stt: idx + 1,
        code,
        name,
        group,
        approved,
        actual,
        bravo,
        diff,
        absDiff,
        maxActual,
        isSctsSeparated: isScts,
        remaining,
        percent,
        status,
      };
    });
  }, [budgets, liveActualsByCode, selectedYear, sctsCodes]);

  // 3. Unique Groups in Planning Items
  const planningGroups = useMemo(() => {
    const set = new Set(reconItems.map((item) => item.group).filter(Boolean));
    return Array.from(set);
  }, [reconItems]);

  // 4. Filter & Sort Planning Items
  const filteredReconItems = useMemo(() => {
    return reconItems
      .filter((item) => {
        const matchSearch = matchesVietnameseSearch(
          [item.code, item.name, item.scope, item.group],
          planningSearch
        );

        const matchGroup = planningGroupFilter === 'ALL' || item.group === planningGroupFilter;

        let matchStatus = true;
        if (discrepancyFilter === 'BRAVO_HIGH') matchStatus = item.status === 'BRAVO_HIGH';
        else if (discrepancyFilter === 'ACTUAL_HIGH') matchStatus = item.status === 'ACTUAL_HIGH';
        else if (discrepancyFilter === 'MATCHED') matchStatus = item.status === 'MATCHED';
        else if (discrepancyFilter === 'DIFF_ONLY') matchStatus = item.status !== 'MATCHED';

        return matchSearch && matchGroup && matchStatus;
      })
      .sort((a, b) => {
        if (planningSort === 'abs_diff_desc') return b.absDiff - a.absDiff;
        if (planningSort === 'diff_desc') return b.diff - a.diff;
        if (planningSort === 'diff_asc') return a.diff - b.diff;
        if (planningSort === 'code_asc') return a.code.localeCompare(b.code);
        if (planningSort === 'approved_desc') return b.approved - a.approved;
        return 0;
      });
  }, [reconItems, planningSearch, planningGroupFilter, discrepancyFilter, planningSort]);

  // 5. Aggregate KPIs for 76 Planning Items
  const planningKPIs = useMemo(() => {
    const totalApproved = reconItems.reduce((acc, i) => acc + i.approved, 0);
    const totalActual = reconItems.reduce((acc, i) => acc + i.actual, 0);
    const totalBravo = reconItems.reduce((acc, i) => acc + i.bravo, 0);
    const totalMax = reconItems.reduce((acc, i) => acc + i.maxActual, 0);
    const totalRemaining = totalApproved - totalMax;

    const bravoHighItems = reconItems.filter((i) => i.status === 'BRAVO_HIGH');
    const actualHighItems = reconItems.filter((i) => i.status === 'ACTUAL_HIGH');
    const matchedItems = reconItems.filter((i) => i.status === 'MATCHED');

    const sumBravoHighDiff = bravoHighItems.reduce((acc, i) => acc + i.diff, 0);
    const sumActualHighDiff = actualHighItems.reduce((acc, i) => acc + Math.abs(i.diff), 0);

    return {
      totalApproved,
      totalActual,
      totalBravo,
      totalMax,
      totalRemaining,
      bravoHighCount: bravoHighItems.length,
      sumBravoHighDiff,
      actualHighCount: actualHighItems.length,
      sumActualHighDiff,
      matchedCount: matchedItems.length,
    };
  }, [reconItems]);

  // 6. Macro INFO Data Processing
  const macroCategories = useMemo(() => {
    const set = new Set(
      activeBravoInfo
        .filter((i) => i.category && i.row > 2)
        .map((i) => i.category)
    );
    return Array.from(set);
  }, [activeBravoInfo]);

  const filteredMacroItems = useMemo(() => {
    return activeBravoInfo
      .filter((item) => item.row > 2 && (item.code || item.name))
      .filter((item) => {
        const matchSearch = matchesVietnameseSearch(
          [item.code, item.name, item.category, item.nonPlanningReason],
          macroSearch
        );

        const matchCat = macroCategoryFilter === 'ALL' || item.category === macroCategoryFilter;

        let matchOwner = true;
        if (macroOwnerFilter === 'PLANNING') matchOwner = item.isPlanningTracked;
        else if (macroOwnerFilter === 'CORPORATE') matchOwner = !item.isPlanningTracked;

        return matchSearch && matchCat && matchOwner;
      });
  }, [activeBravoInfo, macroSearch, macroCategoryFilter, macroOwnerFilter]);

  // Aggregate KPIs for Sheet INFO (Macro View)
  const macroKPIs = useMemo(() => {
    const totalApproved = 147247000000;
    const totalBravo = 129835582811;

    // Major non-planning groups
    const khauHao = 53683774716;
    const nhanVien = 35334505031;
    const giaVon = 6721413431;
    const thueDat = 386743680;

    return {
      totalApproved,
      totalBravo,
      khauHao,
      nhanVien,
      giaVon,
      thueDat,
      nonPlanningTotal: khauHao + nhanVien + giaVon + thueDat,
    };
  }, []);

  // Selected Detail Account for Ledger Drilldown Modal
  const selectedDetailAccount = useMemo(() => {
    if (!selectedDetailCode) return null;
    const target = String(selectedDetailCode).trim();
    return (
      reconItems.find((b) => String(b.code || '').trim() === target) ||
      budgets.find((b) => String(b.code || '').trim() === target) || {
        code: target,
        name: `Khoản mục ${target}`,
      }
    );
  }, [selectedDetailCode, reconItems, budgets]);

  // Export Planning Reconciliation to CSV
  const handleExportReconCSV = () => {
    const headers =
      'STT,MaKhoanMuc,TenKhoanMuc,Nhom,HanMucDuyet,ThucTeToKH,HachToanBRAVO,ChenhLech,TrangThai,ThucTeQuanLyMAX,ConLai,TyLe%\n';
    const rows = filteredReconItems
      .map((i) => {
        const statusText =
          i.status === 'BRAVO_HIGH'
            ? 'BRAVO > Thực tế'
            : i.status === 'ACTUAL_HIGH'
            ? 'Thực tế > BRAVO'
            : 'Khớp';
        return `"${i.stt}","${i.code}","${i.name.replace(/"/g, '""')}","${i.group}","${i.approved}","${i.actual}","${i.bravo}","${i.diff}","${statusText}","${i.maxActual}","${i.remaining}","${i.percent.toFixed(2)}%"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `doi-soat-bravo-nam-${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Sheet INFO Macro to CSV
  const handleExportMacroCSV = () => {
    const headers = 'Row,MaTK,TenHangMuc,NhomDanhMuc,HanMucDuyet,ThucHienBRAVO,TyLe%,DonViQuanLy,GiaiTrinh\n';
    const rows = filteredMacroItems
      .map((i) => {
        const owner = i.isPlanningTracked ? 'Tổ Kế hoạch' : 'Kế toán / Tổng công ty';
        return `"${i.row}","${i.code || ''}","${(i.name || '').replace(/"/g, '""')}","${(i.category || '').replace(/"/g, '""')}","${i.approvedAmount}","${i.bravoAmount}","${i.rate}%","${owner}","${(i.nonPlanningReason || '').replace(/"/g, '""')}"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'toan-canh-chi-phi-bravo-info.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-tab Switcher */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Đối Soát Chi Phí BRAVO (Kế Toán) & Thực Tế (Tổ Kế Hoạch)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                  ERP BRAVO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân tích chênh lệch giữa số liệu hạch toán phần mềm kế toán Tổng công ty (BRAVO) và sổ cái hạng mục thực tế năm {selectedYear}
              </p>
            </div>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('PLANNING_RECON')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'PLANNING_RECON'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Đối Soát 76 Khoản Mục Tổ KH</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('MACRO_INFO')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'MACRO_INFO'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Toàn Cảnh Cảng (Sheet INFO - 152 Mục)</span>
            </button>
          </div>
        </div>

        {/* 4 Multi-Dimension KPI Summary Cards */}
        {activeSubTab === 'PLANNING_RECON' ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 pt-1">
            {/* Card 1: Approved */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                1. Hạn Mức Duyệt ({selectedYear})
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCompactVND(planningKPIs.totalApproved)}
              </p>
              <p className="text-2xs text-slate-400 mt-0.5 truncate" title={formatVND(planningKPIs.totalApproved)}>
                {formatVND(planningKPIs.totalApproved)}
              </p>
            </div>

            {/* Card 2: Actual Planning */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-blue-700">
                  2. Thực Tế Tổ KH (Sổ cái)
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {formatCompactVND(planningKPIs.totalActual)}
              </p>
              <p className="text-2xs text-blue-600 mt-0.5 truncate" title={formatVND(planningKPIs.totalActual)}>
                {formatVND(planningKPIs.totalActual)}
              </p>
            </div>

            {/* Card 3: BRAVO Actual */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-amber-800">
                  3. Hạch Toán BRAVO
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <p className="text-lg font-bold text-amber-900 mt-1">
                {formatCompactVND(planningKPIs.totalBravo)}
              </p>
              <p className="text-2xs text-amber-700 mt-0.5 truncate" title={formatVND(planningKPIs.totalBravo)}>
                {formatVND(planningKPIs.totalBravo)}
              </p>
            </div>

            {/* Card 4: Discrepancy Breakdown */}
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/60">
              <span className="text-2xs font-semibold uppercase tracking-wider text-purple-800">
                4. Tình Trạng Lệch Sổ
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="px-1.5 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800"
                  title="BRAVO > Thực tế: Kế toán đã hạch toán thêm"
                >
                  {planningKPIs.bravoHighCount} mục Cam
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-2xs font-bold bg-purple-100 text-purple-800"
                  title="Thực tế > BRAVO: Tổ KH chi nhưng Kế toán chưa lên BRAVO"
                >
                  {planningKPIs.actualHighCount} mục Tím
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800"
                  title="Khớp tuyệt đối"
                >
                  {planningKPIs.matchedCount} Khớp
                </span>
              </div>
              <p className="text-2xs text-purple-700 mt-1">
                Chênh lệch BRAVO &gt; KH: +{formatCompactVND(planningKPIs.sumBravoHighDiff)}
              </p>
            </div>

            {/* Card 5: Prudent Max Spent */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-800">
                  5. MAX Quản Lý Rủi Ro
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-3xs font-mono font-bold">
                  MAX(F,G)
                </span>
              </div>
              <p className="text-lg font-bold text-emerald-950 mt-1">
                {formatCompactVND(planningKPIs.totalMax)}
              </p>
              <p className="text-2xs text-emerald-700 mt-0.5">
                Còn lại: <span className="font-bold">{formatCompactVND(planningKPIs.totalRemaining)}</span>
              </p>
            </div>
          </div>
        ) : (
          /* Macro Airport KPIs (Sheet INFO) */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                Tổng Ngân Sách Toàn Cảng
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCompactVND(macroKPIs.totalApproved)}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">
                BRAVO đã ghi nhận: <span className="font-bold text-slate-700">{formatCompactVND(macroKPIs.totalBravo)}</span> (88.2%)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/60">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-rose-800">
                  Khấu Hao TSCĐ (TCT Trích)
                </span>
                <Building2 className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <p className="text-lg font-bold text-rose-900 mt-1">
                {formatCompactVND(macroKPIs.khauHao)}
              </p>
              <p className="text-2xs text-rose-700 mt-0.5">
                Tổ KH không lập hạng mục (Kế toán trích tự động)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/60">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-800">
                  Lương, BHXH, Nhân Viên
                </span>
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              </div>
              <p className="text-lg font-bold text-indigo-900 mt-1">
                {formatCompactVND(macroKPIs.nhanVien)}
              </p>
              <p className="text-2xs text-indigo-700 mt-0.5">
                Phòng TCCB & Kế toán hạch toán tập trung
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-800">
                  Giá Vốn & Thuế Đất
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-emerald-950 mt-1">
                {formatCompactVND(macroKPIs.giaVon + macroKPIs.thueDat)}
              </p>
              <p className="text-2xs text-emerald-700 mt-0.5">
                Hạch toán trực tiếp theo doanh thu & thông báo thuế
              </p>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: 76 Khoản Mục Kế Hoạch (Planning Reconciliation) */}
      {activeSubTab === 'PLANNING_RECON' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={planningSearch}
                onChange={(e) => setPlanningSearch(e.target.value)}
                placeholder="Tìm theo mã TK (627...), tên khoản mục, hoặc quy mô..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
              />
            </div>

            {/* Filter Buttons & Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Discrepancy Filter Buttons */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setDiscrepancyFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    discrepancyFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({reconItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDiscrepancyFilter('BRAVO_HIGH')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    discrepancyFilter === 'BRAVO_HIGH'
                      ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                      : 'text-amber-800 hover:bg-amber-100/50'
                  }`}
                  title="Kế toán đã hạch toán thêm ngoài Tổ Kế hoạch"
                >
                  BRAVO &gt; KH ({planningKPIs.bravoHighCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDiscrepancyFilter('ACTUAL_HIGH')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    discrepancyFilter === 'ACTUAL_HIGH'
                      ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                      : 'text-purple-800 hover:bg-purple-100/50'
                  }`}
                  title="Tổ Kế hoạch đã phát sinh hạng mục nhưng Kế toán chưa lên BRAVO"
                >
                  KH &gt; BRAVO ({planningKPIs.actualHighCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDiscrepancyFilter('MATCHED')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    discrepancyFilter === 'MATCHED'
                      ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                      : 'text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  Khớp ({planningKPIs.matchedCount})
                </button>
              </div>

              {/* Group Filter */}
              <select
                value={planningGroupFilter}
                onChange={(e) => setPlanningGroupFilter(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Tất cả nhóm ({planningGroups.length})</option>
                {planningGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Sort Order */}
              <select
                value={planningSort}
                onChange={(e) => setPlanningSort(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="abs_diff_desc">Sắp xếp: Chênh lệch lớn nhất</option>
                <option value="diff_desc">BRAVO &gt; KH nhiều nhất</option>
                <option value="diff_asc">KH &gt; BRAVO nhiều nhất</option>
                <option value="code_asc">Mã khoản mục A - Z</option>
                <option value="approved_desc">Hạn mức duyệt cao nhất</option>
              </select>

              {/* Column Visibility Dropdown */}
              <ColumnVisibilityDropdown
                columns={reconTableColumns}
                isColumnVisible={isReconColVisible}
                onToggleColumn={toggleReconCol}
                onShowAll={showAllReconCols}
              />

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportReconCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all"
                title="Xuất bảng đối soát ra file CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>

          {/* Explanation Alert Callout */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">
                Quy tắc đối soát & Quản lý an toàn ngân sách theo file TỔNG HỢP KẾ HOẠCH:
              </p>
              <p className="text-amber-800">
                • <span className="font-semibold text-amber-900">BRAVO &gt; Thực tế (Màu cam):</span> Kế toán đã ghi nhận chi phí trên phần mềm BRAVO mà không qua hạng mục Tổ Kế hoạch, hoặc các hóa đơn hạch toán trực tiếp.
                <br />
                • <span className="font-semibold text-purple-900">Thực tế &gt; BRAVO (Màu tím):</span> Tổ Kế hoạch đã duyệt và phát sinh hạng mục cục bộ nhưng Kế toán chưa kịp hạch toán vào kỳ BRAVO.
                <br />
                • <span className="font-semibold text-emerald-900">MAX Thực Tế = MAX(Thực tế, BRAVO):</span> Theo công thức cột H trong file Excel gốc, Cảng luôn dùng giá trị lớn nhất giữa hai bên để kiểm soát hạn mức, tránh bội chi.
              </p>
            </div>
          </div>

          {/* 76 Planning Items Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full text-left border-collapse text-xs table-fixed"
                style={{ minWidth: `${totalReconWidth}px` }}
              >
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-2xs uppercase tracking-wider">
                    {isReconColVisible('stt') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.stt}px`, minWidth: `${reconWidths.stt}px` }}
                      >
                        <div className="truncate text-center w-full">STT</div>
                        <ColumnResizeHandle
                          colKey="stt"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('code') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.code}px`, minWidth: `${reconWidths.code}px` }}
                      >
                        <div className="truncate text-center w-full">Mã TK</div>
                        <ColumnResizeHandle
                          colKey="code"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('name') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.name}px`, minWidth: `${reconWidths.name}px` }}
                      >
                        <div className="truncate text-center w-full">Khoản Mục & Quy Mô</div>
                        <ColumnResizeHandle
                          colKey="name"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('group') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.group}px`, minWidth: `${reconWidths.group}px` }}
                      >
                        <div className="truncate text-center w-full">Nhóm</div>
                        <ColumnResizeHandle
                          colKey="group"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('approved') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.approved}px`, minWidth: `${reconWidths.approved}px` }}
                      >
                        <div className="truncate text-center w-full">Hạn Mức Duyệt</div>
                        <ColumnResizeHandle
                          colKey="approved"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('actual') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center bg-blue-50/40 text-blue-900 relative select-none"
                        style={{ width: `${reconWidths.actual}px`, minWidth: `${reconWidths.actual}px` }}
                      >
                        <div className="truncate text-center w-full">Thực Tế Tổ KH</div>
                        <ColumnResizeHandle
                          colKey="actual"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('bravo') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center bg-amber-50/40 text-amber-900 relative select-none"
                        style={{ width: `${reconWidths.bravo}px`, minWidth: `${reconWidths.bravo}px` }}
                      >
                        <div className="truncate text-center w-full">Hạch Toán BRAVO</div>
                        <ColumnResizeHandle
                          colKey="bravo"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('diff') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.diff}px`, minWidth: `${reconWidths.diff}px` }}
                      >
                        <div className="truncate text-center w-full">Chênh Lệch (±)</div>
                        <ColumnResizeHandle
                          colKey="diff"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('maxActual') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center bg-emerald-50/40 text-emerald-950 font-bold relative select-none"
                        style={{ width: `${reconWidths.maxActual}px`, minWidth: `${reconWidths.maxActual}px` }}
                      >
                        <div className="truncate text-center w-full">MAX Quản Lý</div>
                        <ColumnResizeHandle
                          colKey="maxActual"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('remaining') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.remaining}px`, minWidth: `${reconWidths.remaining}px` }}
                      >
                        <div className="truncate text-center w-full">Còn Lại</div>
                        <ColumnResizeHandle
                          colKey="remaining"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('percent') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.percent}px`, minWidth: `${reconWidths.percent}px` }}
                      >
                        <div className="truncate text-center w-full">Tỷ Lệ</div>
                        <ColumnResizeHandle
                          colKey="percent"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                    {isReconColVisible('ledger') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${reconWidths.ledger}px`, minWidth: `${reconWidths.ledger}px` }}
                      >
                        <div className="truncate text-center w-full">Sổ Cái</div>
                        <ColumnResizeHandle
                          colKey="ledger"
                          onResizeStart={handleReconResizeStart}
                          onResetWidth={resetReconColumnWidth}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredReconItems.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-12 text-center text-slate-400">
                        Không tìm thấy khoản mục phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredReconItems.map((item) => {
                      const isBravoHigh = item.status === 'BRAVO_HIGH';
                      const isActualHigh = item.status === 'ACTUAL_HIGH';
                      const isOver = item.remaining < 0;

                      return (
                        <tr
                          key={item.code}
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={() => setSelectedDetailCode(item.code)}
                        >
                          {/* STT */}
                          {isReconColVisible('stt') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center text-slate-400 text-2xs font-mono leading-tight break-words"
                              style={{ width: `${reconWidths.stt}px`, minWidth: `${reconWidths.stt}px` }}
                            >
                              {item.stt}
                            </td>
                          )}

                          {/* Account Code */}
                          {isReconColVisible('code') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 leading-tight break-words"
                              style={{ width: `${reconWidths.code}px`, minWidth: `${reconWidths.code}px` }}
                            >
                              <span className="inline-block px-1 py-0.2 rounded font-mono text-[9px] sm:text-2xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80 group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors break-all">
                                {item.code}
                              </span>
                            </td>
                          )}

                          {/* Name & Scope */}
                          {isReconColVisible('name') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 leading-tight break-words whitespace-normal"
                              style={{ width: `${reconWidths.name}px`, minWidth: `${reconWidths.name}px` }}
                            >
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1 text-[9.5px] sm:text-xs leading-tight">
                                <span>{item.name}</span>
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity shrink-0" />
                              </div>
                              {item.scope && (
                                <p className="text-[7.5px] sm:text-3xs text-slate-400 mt-0.5 leading-tight break-words" title={item.scope}>
                                  {item.scope}
                                </p>
                              )}
                            </td>
                          )}

                          {/* Group */}
                          {isReconColVisible('group') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-slate-500 text-[8px] sm:text-3xs leading-tight break-words whitespace-normal"
                              style={{ width: `${reconWidths.group}px`, minWidth: `${reconWidths.group}px` }}
                            >
                              <span className="inline-block px-1 py-0.2 bg-slate-100 rounded text-slate-600" title={item.group}>
                                {item.group}
                              </span>
                            </td>
                          )}

                          {/* Approved Budget */}
                          {isReconColVisible('approved') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-right font-semibold text-slate-900 font-mono text-[9px] sm:text-xs leading-tight break-words"
                              style={{ width: `${reconWidths.approved}px`, minWidth: `${reconWidths.approved}px` }}
                            >
                              {formatVND(item.approved)}
                            </td>
                          )}

                          {/* Actual Spent (Planning) */}
                          {isReconColVisible('actual') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-right font-semibold text-blue-900 bg-blue-50/20 font-mono text-[9px] sm:text-xs leading-tight break-words"
                              style={{ width: `${reconWidths.actual}px`, minWidth: `${reconWidths.actual}px` }}
                            >
                              {formatVND(item.actual)}
                            </td>
                          )}

                          {/* BRAVO Recorded Spent */}
                          {isReconColVisible('bravo') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-right font-semibold text-amber-900 bg-amber-50/20 font-mono text-[9px] sm:text-xs leading-tight break-words"
                              style={{ width: `${reconWidths.bravo}px`, minWidth: `${reconWidths.bravo}px` }}
                            >
                              {formatVND(item.bravo)}
                            </td>
                          )}

                          {/* Discrepancy (BRAVO - Thực tế) */}
                          {isReconColVisible('diff') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                              style={{ width: `${reconWidths.diff}px`, minWidth: `${reconWidths.diff}px` }}
                            >
                              {item.isSctsSeparated ? (
                                <div className="inline-flex flex-col items-center">
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[7px] sm:text-3xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    title="Khoản mục này đã được tách riêng SCTS do Bravo hạch toán gộp cả dự án lớn của TCT"
                                  >
                                    Đã tách SCTS
                                  </span>
                                  <span className="text-[7px] sm:text-3xs text-slate-500 font-normal mt-0.5" title="Chênh lệch gộp Bravo">
                                    Bravo: +{formatCompactVND(item.diff)}
                                  </span>
                                </div>
                              ) : isBravoHigh ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[7px] sm:text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    +{formatCompactVND(item.diff)}
                                  </span>
                                  <span className="text-[7px] sm:text-3xs text-amber-600 font-normal mt-0.5">
                                    BRAVO &gt; KH
                                  </span>
                                </div>
                              ) : isActualHigh ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[7px] sm:text-3xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                    {formatCompactVND(item.diff)}
                                  </span>
                                  <span className="text-[7px] sm:text-3xs text-purple-600 font-normal mt-0.5">
                                    KH &gt; BRAVO
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[7px] sm:text-3xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Khớp 100%
                                </span>
                              )}
                            </td>
                          )}

                          {/* Max Actual Spent */}
                          {isReconColVisible('maxActual') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-right font-bold text-emerald-950 bg-emerald-50/30 font-mono text-[9px] sm:text-xs leading-tight break-words"
                              style={{ width: `${reconWidths.maxActual}px`, minWidth: `${reconWidths.maxActual}px` }}
                            >
                              <div>{formatVND(item.maxActual)}</div>
                              {item.isSctsSeparated && (
                                <span className="text-[7px] sm:text-3xs font-medium text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 inline-block mt-0.5" title="Chỉ lấy theo số nhập liệu SCTX của Cảng">
                                  SCTX Nhập liệu
                                </span>
                              )}
                            </td>
                          )}

                          {/* Remaining */}
                          {isReconColVisible('remaining') && (
                            <td
                              className={`py-0.5 px-0.5 sm:px-1 text-right font-semibold font-mono text-[9px] sm:text-xs leading-tight break-words ${isOver ? 'text-rose-600' : 'text-slate-700'}`}
                              style={{ width: `${reconWidths.remaining}px`, minWidth: `${reconWidths.remaining}px` }}
                            >
                              {formatVND(item.remaining)}
                            </td>
                          )}

                          {/* Percent */}
                          {isReconColVisible('percent') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                              style={{ width: `${reconWidths.percent}px`, minWidth: `${reconWidths.percent}px` }}
                            >
                              <span
                                className={`inline-flex items-center justify-center px-1 py-0.2 rounded text-[7.5px] sm:text-3xs font-bold ${
                                  item.percent >= 100
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.percent >= 80
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.percent.toFixed(1)}%
                              </span>
                            </td>
                          )}

                          {/* Action Button: View Ledger */}
                          {isReconColVisible('ledger') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                              style={{ width: `${reconWidths.ledger}px`, minWidth: `${reconWidths.ledger}px` }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedDetailCode(item.code)}
                                className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                title="Xem chi tiết các hạng mục của khoản mục này"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary */}
            <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div>
                Đang hiển thị <span className="font-bold text-slate-900">{filteredReconItems.length}</span> / {reconItems.length} khoản mục kế hoạch
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span>Duyệt: <strong className="text-slate-900">{formatCompactVND(planningKPIs.totalApproved)}</strong></span>
                <span>Thực tế KH: <strong className="text-blue-700">{formatCompactVND(planningKPIs.totalActual)}</strong></span>
                <span>BRAVO: <strong className="text-amber-700">{formatCompactVND(planningKPIs.totalBravo)}</strong></span>
                <span>MAX Quản lý: <strong className="text-emerald-700">{formatCompactVND(planningKPIs.totalMax)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Toàn Cảnh Cảng (Sheet INFO - 152 Mục) */}
      {activeSubTab === 'MACRO_INFO' && (
        <div className="space-y-4">
          {/* Information Notice */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
              <h3 className="font-bold text-indigo-950 text-sm">
                Toàn Cảnh Báo Cáo Tài Chính Tổng Hợp Cảng (Nguồn: Phần Mềm BRAVO - Sheet INFO)
              </h3>
            </div>
            <p className="text-indigo-900 leading-relaxed">
              Dữ liệu này kết xuất toàn bộ 152 dòng tài khoản chi phí từ phần mềm BRAVO của Tổng công ty.
              Trong thực tế vận hành tại Cảng hàng không:
              <br />
              • <strong className="text-indigo-950">55+ Hạng mục lớn (~112.9 tỷ VNĐ)</strong> phát sinh hoàn toàn ngoài Tổ Kế hoạch: Tiền lương &amp; Bảo hiểm (35.33 tỷ), Khấu hao TSCĐ (53.68 tỷ), Giá vốn thương mại (6.72 tỷ), Tiền thuê đất, Chi phí phúc lợi, v.v. do Kế toán hoặc Tổng công ty trích lập tự động.
              <br />
              • <strong className="text-blue-700 font-bold">76 Khoản mục (~48.06 tỷ VNĐ)</strong> được giao Tổ Kế hoạch trực tiếp lập hồ sơ, thẩm duyệt và theo dõi giải ngân từng hạng mục.
            </p>
          </div>

          {/* Action & Filter Bar for Sheet INFO */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={macroSearch}
                onChange={(e) => setMacroSearch(e.target.value)}
                placeholder="Tìm theo mã TK, tên hạng mục, hoặc lý do không qua Tổ Kế hoạch..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Owner Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setMacroOwnerFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    macroOwnerFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({activeBravoInfo.filter((i) => i.row > 2).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMacroOwnerFilter('PLANNING')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    macroOwnerFilter === 'PLANNING'
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-blue-700 hover:bg-blue-100/50'
                  }`}
                >
                  Tổ KH Quản Lý (76)
                </button>
                <button
                  type="button"
                  onClick={() => setMacroOwnerFilter('CORPORATE')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    macroOwnerFilter === 'CORPORATE'
                      ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                      : 'text-indigo-700 hover:bg-indigo-100/50'
                  }`}
                >
                  Kế Toán / TCT (55+)
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={macroCategoryFilter}
                onChange={(e) => setMacroCategoryFilter(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">Tất cả nhóm chi phí lớn ({macroCategories.length})</option>
                {macroCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Column Visibility Dropdown */}
              <ColumnVisibilityDropdown
                columns={macroTableColumns}
                isColumnVisible={isMacroColVisible}
                onToggleColumn={toggleMacroCol}
                onShowAll={showAllMacroCols}
              />

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportMacroCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all"
                title="Xuất dữ liệu Sheet INFO ra CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV (INFO)</span>
              </button>
            </div>
          </div>

          {/* Sheet INFO Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full text-left border-collapse text-xs table-fixed"
                style={{ minWidth: `${totalMacroWidth}px` }}
              >
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-2xs uppercase tracking-wider">
                    {isMacroColVisible('row') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.row}px`, minWidth: `${macroWidths.row}px` }}
                      >
                        <div className="truncate text-center w-full">Dòng</div>
                        <ColumnResizeHandle
                          colKey="row"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('code') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.code}px`, minWidth: `${macroWidths.code}px` }}
                      >
                        <div className="truncate text-center w-full">Mã TK</div>
                        <ColumnResizeHandle
                          colKey="code"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('name') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.name}px`, minWidth: `${macroWidths.name}px` }}
                      >
                        <div className="truncate text-center w-full">Tên Hạng Mục / Khoản Mục</div>
                        <ColumnResizeHandle
                          colKey="name"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('category') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.category}px`, minWidth: `${macroWidths.category}px` }}
                      >
                        <div className="truncate text-center w-full">Nhóm Danh Mục</div>
                        <ColumnResizeHandle
                          colKey="category"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('approved') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.approved}px`, minWidth: `${macroWidths.approved}px` }}
                      >
                        <div className="truncate text-center w-full">Hạn Mức Duyệt</div>
                        <ColumnResizeHandle
                          colKey="approved"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('bravo') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center bg-amber-50/40 text-amber-900 relative select-none"
                        style={{ width: `${macroWidths.bravo}px`, minWidth: `${macroWidths.bravo}px` }}
                      >
                        <div className="truncate text-center w-full">Đã Ghi Sổ BRAVO</div>
                        <ColumnResizeHandle
                          colKey="bravo"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('rate') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.rate}px`, minWidth: `${macroWidths.rate}px` }}
                      >
                        <div className="truncate text-center w-full">Tỷ Lệ</div>
                        <ColumnResizeHandle
                          colKey="rate"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('owner') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.owner}px`, minWidth: `${macroWidths.owner}px` }}
                      >
                        <div className="truncate text-center w-full">Đơn Vị Quản Lý</div>
                        <ColumnResizeHandle
                          colKey="owner"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                    {isMacroColVisible('reason') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center relative select-none"
                        style={{ width: `${macroWidths.reason}px`, minWidth: `${macroWidths.reason}px` }}
                      >
                        <div className="truncate text-center w-full">Giải Trình & Lý Do Chênh Lệch</div>
                        <ColumnResizeHandle
                          colKey="reason"
                          onResizeStart={handleMacroResizeStart}
                          onResetWidth={resetMacroColumnWidth}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMacroItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        Không tìm thấy dòng dữ liệu nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredMacroItems.map((item) => {
                      const isHeaderGroup = !item.code;
                      const isPlanning = item.isPlanningTracked;

                      if (isHeaderGroup) {
                        return (
                          <tr key={`header-${item.row}`} className="bg-slate-100/70 font-bold text-slate-900">
                            {isMacroColVisible('row') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-center text-2xs text-slate-400 leading-tight break-words"
                                style={{ width: `${macroWidths.row}px`, minWidth: `${macroWidths.row}px` }}
                              >
                                {item.row}
                              </td>
                            )}
                            {isMacroColVisible('code') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 font-mono text-slate-400 leading-tight break-words text-center"
                                style={{ width: `${macroWidths.code}px`, minWidth: `${macroWidths.code}px` }}
                              >
                                —
                              </td>
                            )}
                            {isMacroColVisible('name') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-blue-900 font-bold uppercase tracking-wide text-[9.5px] sm:text-xs leading-tight break-words whitespace-normal"
                                style={{ width: `${macroWidths.name}px`, minWidth: `${macroWidths.name}px` }}
                              >
                                {item.name}
                              </td>
                            )}
                            {isMacroColVisible('category') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-slate-400 leading-tight break-words text-center"
                                style={{ width: `${macroWidths.category}px`, minWidth: `${macroWidths.category}px` }}
                              >
                                —
                              </td>
                            )}
                            {isMacroColVisible('approved') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-right text-slate-900 font-mono text-[9px] sm:text-xs leading-tight break-words"
                                style={{ width: `${macroWidths.approved}px`, minWidth: `${macroWidths.approved}px` }}
                              >
                                {formatVND(item.approvedAmount)}
                              </td>
                            )}
                            {isMacroColVisible('bravo') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-right text-amber-900 bg-amber-100/40 font-mono text-[9px] sm:text-xs leading-tight break-words"
                                style={{ width: `${macroWidths.bravo}px`, minWidth: `${macroWidths.bravo}px` }}
                              >
                                {formatVND(item.bravoAmount)}
                              </td>
                            )}
                            {isMacroColVisible('rate') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-center text-slate-800 text-[9px] sm:text-xs leading-tight break-words"
                                style={{ width: `${macroWidths.rate}px`, minWidth: `${macroWidths.rate}px` }}
                              >
                                {item.rate.toFixed(1)}%
                              </td>
                            )}
                            {isMacroColVisible('owner') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                                style={{ width: `${macroWidths.owner}px`, minWidth: `${macroWidths.owner}px` }}
                              >
                                <span className="px-1 py-0.2 rounded text-[7.5px] sm:text-3xs font-bold uppercase bg-slate-200 text-slate-700">
                                  Nhóm Lớn
                                </span>
                              </td>
                            )}
                            {isMacroColVisible('reason') && (
                              <td
                                className="py-0.5 px-0.5 sm:px-1 text-3xs text-slate-500 italic leading-tight break-words whitespace-normal"
                                style={{ width: `${macroWidths.reason}px`, minWidth: `${macroWidths.reason}px` }}
                              >
                                Tổng cộng nhóm danh mục
                              </td>
                            )}
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={`leaf-${item.row}-${item.code}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPlanning ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          {/* Row */}
                          {isMacroColVisible('row') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center text-slate-400 text-3xs font-mono leading-tight break-words"
                              style={{ width: `${macroWidths.row}px`, minWidth: `${macroWidths.row}px` }}
                            >
                              {item.row}
                            </td>
                          )}

                          {/* Code */}
                          {isMacroColVisible('code') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 leading-tight break-words"
                              style={{ width: `${macroWidths.code}px`, minWidth: `${macroWidths.code}px` }}
                            >
                              <span className="font-mono text-[9px] sm:text-2xs font-bold text-slate-800 break-all">
                                {item.code}
                              </span>
                            </td>
                          )}

                          {/* Name */}
                          {isMacroColVisible('name') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 font-medium text-slate-900 text-[9.5px] sm:text-xs leading-tight break-words whitespace-normal"
                              style={{ width: `${macroWidths.name}px`, minWidth: `${macroWidths.name}px` }}
                            >
                              {item.name}
                            </td>
                          )}

                          {/* Category */}
                          {isMacroColVisible('category') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-[8px] sm:text-3xs text-slate-500 leading-tight break-words whitespace-normal"
                              style={{ width: `${macroWidths.category}px`, minWidth: `${macroWidths.category}px` }}
                            >
                              {item.category}
                            </td>
                          )}

                          {/* Approved */}
                          {isMacroColVisible('approved') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-right text-slate-800 font-mono text-[9px] sm:text-xs leading-tight break-words"
                              style={{ width: `${macroWidths.approved}px`, minWidth: `${macroWidths.approved}px` }}
                            >
                              {formatVND(item.approvedAmount)}
                            </td>
                          )}

                          {/* BRAVO Amount */}
                          {isMacroColVisible('bravo') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-right font-semibold text-amber-900 bg-amber-50/20 font-mono text-[9px] sm:text-xs leading-tight break-words"
                              style={{ width: `${macroWidths.bravo}px`, minWidth: `${macroWidths.bravo}px` }}
                            >
                              {formatVND(item.bravoAmount)}
                            </td>
                          )}

                          {/* Rate */}
                          {isMacroColVisible('rate') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center text-3xs leading-tight break-words"
                              style={{ width: `${macroWidths.rate}px`, minWidth: `${macroWidths.rate}px` }}
                            >
                              <span
                                className={`inline-flex items-center justify-center px-1 py-0.2 rounded font-bold text-[7.5px] sm:text-3xs ${
                                  item.rate > 100
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.rate >= 80
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.rate.toFixed(1)}%
                              </span>
                            </td>
                          )}

                          {/* Owner Badge */}
                          {isMacroColVisible('owner') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words whitespace-normal"
                              style={{ width: `${macroWidths.owner}px`, minWidth: `${macroWidths.owner}px` }}
                            >
                              {isPlanning ? (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[7px] sm:text-3xs font-bold bg-blue-100 text-blue-800">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Tổ Kế Hoạch
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[7px] sm:text-3xs font-bold bg-slate-200 text-slate-700">
                                  Kế Toán / TCT
                                </span>
                              )}
                            </td>
                          )}

                          {/* Reason */}
                          {isMacroColVisible('reason') && (
                            <td
                              className="py-0.5 px-0.5 sm:px-1 text-[7.5px] sm:text-3xs text-slate-500 leading-tight break-words whitespace-normal"
                              style={{ width: `${macroWidths.reason}px`, minWidth: `${macroWidths.reason}px` }}
                            >
                              {isPlanning ? (
                                <span className="text-emerald-700 font-medium">
                                  Tổ KH theo dõi định mức và kiểm soát từng hạng mục
                                </span>
                              ) : (
                                <span className="text-slate-600">
                                  {item.nonPlanningReason || 'Hạch toán trực tiếp từ phòng Kế toán / TCT'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
              <div>
                Đang hiển thị <span className="font-bold text-slate-800">{filteredMacroItems.length}</span> dòng từ Sheet INFO BRAVO
              </div>
              <div className="text-xs">
                Toàn Cảng: Duyệt 147.25 tỷ • BRAVO: 129.84 tỷ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Ledger Drilldown Modal (When clicking any planning item) */}
      {selectedDetailAccount && (
        <AccountLedgerModal
          isOpen={Boolean(selectedDetailAccount)}
          account={selectedDetailAccount}
          transactions={transactions}
          budgets={budgets}
          selectedYear={selectedYear}
          onClose={() => setSelectedDetailCode(null)}
          onAddTransaction={onAddTransaction}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onNavigateToLedger={onNavigateToLedger}
        />
      )}
    </div>
  );
}
