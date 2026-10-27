import React, { useState, useMemo } from 'react';
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

export default function BravoReconciliation({
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
}) {
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

      // Prudent Management Spent = MAX(Thực tế, BRAVO)
      const maxActual = Math.max(actual, bravo);
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
        remaining,
        percent,
        status,
      };
    });
  }, [budgets, liveActualsByCode, selectedYear]);

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
      bravoInfoData
        .filter((i) => i.category && i.row > 2)
        .map((i) => i.category)
    );
    return Array.from(set);
  }, []);

  const filteredMacroItems = useMemo(() => {
    return bravoInfoData
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
  }, [macroSearch, macroCategoryFilter, macroOwnerFilter]);

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
    return reconItems.find((b) => b.code === target) || null;
  }, [selectedDetailCode, reconItems]);

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
                Phân tích chênh lệch giữa số liệu hạch toán phần mềm kế toán Tổng công ty (BRAVO) và sổ cái phiếu chi thực tế năm {selectedYear}
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
                Tổ KH không lập phiếu chi (Kế toán trích tự động)
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
                  title="Tổ Kế hoạch đã phát sinh phiếu chi nhưng Kế toán chưa lên BRAVO"
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
                • <span className="font-semibold text-amber-900">BRAVO &gt; Thực tế (Màu cam):</span> Kế toán đã ghi nhận chi phí trên phần mềm BRAVO mà không qua phiếu chi Tổ Kế hoạch, hoặc các hóa đơn hạch toán trực tiếp.
                <br />
                • <span className="font-semibold text-purple-900">Thực tế &gt; BRAVO (Màu tím):</span> Tổ Kế hoạch đã duyệt và phát sinh phiếu chi cục bộ nhưng Kế toán chưa kịp hạch toán vào kỳ BRAVO.
                <br />
                • <span className="font-semibold text-emerald-900">MAX Thực Tế = MAX(Thực tế, BRAVO):</span> Theo công thức cột H trong file Excel gốc, Cảng luôn dùng giá trị lớn nhất giữa hai bên để kiểm soát hạn mức, tránh bội chi.
              </p>
            </div>
          </div>

          {/* 76 Planning Items Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-2xs uppercase tracking-wider">
                    <th className="py-3 px-3.5 w-12 text-center">STT</th>
                    <th className="py-3 px-3.5 w-24">Mã TK</th>
                    <th className="py-3 px-3.5 min-w-[220px]">Khoản Mục & Quy Mô</th>
                    <th className="py-3 px-3.5 min-w-[140px]">Nhóm</th>
                    <th className="py-3 px-3.5 text-right min-w-[110px]">Hạn Mức Duyệt</th>
                    <th className="py-3 px-3.5 text-right min-w-[120px] bg-blue-50/40 text-blue-900">
                      Thực Tế Tổ KH
                    </th>
                    <th className="py-3 px-3.5 text-right min-w-[120px] bg-amber-50/40 text-amber-900">
                      Hạch Toán BRAVO
                    </th>
                    <th className="py-3 px-3.5 text-center min-w-[140px]">Chênh Lệch (±)</th>
                    <th className="py-3 px-3.5 text-right min-w-[120px] bg-emerald-50/40 text-emerald-950 font-bold">
                      MAX Quản Lý
                    </th>
                    <th className="py-3 px-3.5 text-right min-w-[110px]">Còn Lại</th>
                    <th className="py-3 px-3.5 text-center min-w-[80px]">Tỷ Lệ</th>
                    <th className="py-3 px-3.5 text-center w-24">Sổ Cái</th>
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
                          <td className="py-3 px-3.5 text-center text-slate-400 text-2xs font-mono">
                            {item.stt}
                          </td>

                          {/* Account Code */}
                          <td className="py-3 px-3.5">
                            <span className="inline-block px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80 group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                              {item.code}
                            </span>
                          </td>

                          {/* Name & Scope */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                            </div>
                            {item.scope && (
                              <p className="text-3xs text-slate-400 line-clamp-1 mt-0.5" title={item.scope}>
                                {item.scope}
                              </p>
                            )}
                          </td>

                          {/* Group */}
                          <td className="py-3 px-3.5 text-slate-500 text-3xs">
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 truncate max-w-[130px]" title={item.group}>
                              {item.group}
                            </span>
                          </td>

                          {/* Approved Budget */}
                          <td className="py-3 px-3.5 text-right font-semibold text-slate-900">
                            {formatVND(item.approved)}
                          </td>

                          {/* Actual Spent (Planning) */}
                          <td className="py-3 px-3.5 text-right font-semibold text-blue-900 bg-blue-50/20">
                            {formatVND(item.actual)}
                          </td>

                          {/* BRAVO Recorded Spent */}
                          <td className="py-3 px-3.5 text-right font-semibold text-amber-900 bg-amber-50/20">
                            {formatVND(item.bravo)}
                          </td>

                          {/* Discrepancy (BRAVO - Thực tế) */}
                          <td className="py-3 px-3.5 text-center">
                            {isBravoHigh ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  +{formatCompactVND(item.diff)}
                                </span>
                                <span className="text-3xs text-amber-600 font-normal mt-0.5">
                                  BRAVO &gt; KH
                                </span>
                              </div>
                            ) : isActualHigh ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  {formatCompactVND(item.diff)}
                                </span>
                                <span className="text-3xs text-purple-600 font-normal mt-0.5">
                                  KH &gt; BRAVO
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Khớp 100%
                              </span>
                            )}
                          </td>

                          {/* Max Actual Spent */}
                          <td className="py-3 px-3.5 text-right font-bold text-emerald-950 bg-emerald-50/30">
                            {formatVND(item.maxActual)}
                          </td>

                          {/* Remaining */}
                          <td className={`py-3 px-3.5 text-right font-semibold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatVND(item.remaining)}
                          </td>

                          {/* Percent */}
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-3xs font-bold ${
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

                          {/* Action Button: View Ledger */}
                          <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedDetailCode(item.code)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Xem chi tiết các phiếu chi của khoản mục này"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                          </td>
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
              • <strong className="text-blue-700 font-bold">76 Khoản mục (~48.06 tỷ VNĐ)</strong> được giao Tổ Kế hoạch trực tiếp lập hồ sơ, thẩm duyệt và theo dõi giải ngân từng phiếu chi.
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
                  Tất cả ({bravoInfoData.filter((i) => i.row > 2).length})
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
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-2xs uppercase tracking-wider">
                    <th className="py-3 px-3.5 w-12 text-center">Dòng</th>
                    <th className="py-3 px-3.5 w-24">Mã TK</th>
                    <th className="py-3 px-3.5 min-w-[240px]">Tên Hạng Mục / Khoản Mục</th>
                    <th className="py-3 px-3.5 min-w-[150px]">Nhóm Danh Mục</th>
                    <th className="py-3 px-3.5 text-right min-w-[120px]">Hạn Mức Duyệt</th>
                    <th className="py-3 px-3.5 text-right min-w-[120px] bg-amber-50/40 text-amber-900">
                      Đã Ghi Sổ BRAVO
                    </th>
                    <th className="py-3 px-3.5 text-center min-w-[80px]">Tỷ Lệ</th>
                    <th className="py-3 px-3.5 text-center min-w-[130px]">Đơn Vị Quản Lý</th>
                    <th className="py-3 px-3.5 min-w-[260px]">Giải Trình &amp; Lý Do Chênh Lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMacroItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
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
                            <td className="py-2.5 px-3.5 text-center text-2xs text-slate-400">
                              {item.row}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-400">—</td>
                            <td className="py-2.5 px-3.5 text-blue-900 font-bold uppercase tracking-wide">
                              {item.name}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-400">—</td>
                            <td className="py-2.5 px-3.5 text-right text-slate-900">
                              {formatVND(item.approvedAmount)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-amber-900 bg-amber-100/40">
                              {formatVND(item.bravoAmount)}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-slate-800">
                              {item.rate.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase bg-slate-200 text-slate-700">
                                Nhóm Lớn
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-3xs text-slate-500 italic">
                              Tổng cộng nhóm danh mục
                            </td>
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
                          <td className="py-2.5 px-3.5 text-center text-slate-400 text-3xs font-mono">
                            {item.row}
                          </td>

                          {/* Code */}
                          <td className="py-2.5 px-3.5">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {item.code}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="py-2.5 px-3.5 font-medium text-slate-900">
                            {item.name}
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3.5 text-3xs text-slate-500">
                            {item.category}
                          </td>

                          {/* Approved */}
                          <td className="py-2.5 px-3.5 text-right text-slate-800">
                            {formatVND(item.approvedAmount)}
                          </td>

                          {/* BRAVO Amount */}
                          <td className="py-2.5 px-3.5 text-right font-semibold text-amber-900 bg-amber-50/20">
                            {formatVND(item.bravoAmount)}
                          </td>

                          {/* Rate */}
                          <td className="py-2.5 px-3.5 text-center text-3xs">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
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

                          {/* Owner Badge */}
                          <td className="py-2.5 px-3.5 text-center">
                            {isPlanning ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-100 text-blue-800">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Tổ Kế Hoạch
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-slate-200 text-slate-700">
                                Kế Toán / TCT
                              </span>
                            )}
                          </td>

                          {/* Reason */}
                          <td className="py-2.5 px-3.5 text-3xs text-slate-500 leading-tight">
                            {isPlanning ? (
                              <span className="text-emerald-700 font-medium">
                                Tổ KH theo dõi định mức và kiểm soát từng phiếu chi
                              </span>
                            ) : (
                              <span className="text-slate-600">
                                {item.nonPlanningReason || 'Hạch toán trực tiếp từ phòng Kế toán / TCT'}
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
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onNavigateToLedger={onNavigateToLedger}
        />
      )}
    </div>
  );
}
