import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Trash2,
  ArrowUpDown,
  Filter,
  Layers,
  DollarSign,
  Wallet,
  CheckCircle2,
  ShieldAlert,
  Edit3,
  Save,
  X,
  User,
  FileText,
  Clock,
  Sparkles,
  PlusCircle,
  Calculator,
  Eye,
  EyeOff,
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import AddTransactionModal from './AddTransactionModal';
import { useResizableColumns, ColumnResizeHandle, ColumnVisibilityDropdown } from '../hooks/useResizableColumns';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { formatDate } from '../utils/dateUtils';

export default function TransactionList({
  transactions = [],
  budgets = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  selectedYear = '2026',
  selectedCategory: selectedCategoryProp,
  onSelectCategory,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(selectedCategoryProp || 'ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'account_asc', 'account_desc', 'highest', 'lowest'
  const [bcmsFilter, setBcmsFilter] = useState('ALL'); // 'ALL' | 'DA_BCMS' | 'CHUA_BCMS'

  // Tùy chọn Ẩn/Hiện Tổng bao gồm dự kiến (Chưa BCMS)
  const [showExpectedTotal, setShowExpectedTotal] = useState(false);

  // Thống kê nhanh số lượng Đã BCMS / Chưa BCMS
  const totalTxPendingCount = useMemo(() => {
    return (transactions || []).filter((t) => t && t.chuaBcms).length;
  }, [transactions]);
  const totalTxDoneCount = (transactions || []).length - totalTxPendingCount;

  // Add & Edit Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditToast, setShowEditToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Resizable columns hook (drag handles + column visibility with localStorage persistence)
  const {
    columnWidths,
    handleResizeStart,
    resetColumnWidth,
    totalTableWidth,
    isColumnVisible,
    toggleColumnVisibility,
    showAllColumns,
  } = useResizableColumns({
    storageKey: 'tbl_cols_transactions_v5',
    initialWidths: {
      date: 72,
      chuaBcms: 76,
      account: 88,
      notes: 320,
      amount: 115,
      remark: 130,
      employee: 100,
      actions: 55,
    },
    minWidths: {
      date: 50,
      chuaBcms: 55,
      account: 65,
      notes: 90,
      amount: 105,
      remark: 65,
      employee: 60,
      actions: 45,
    },
  });

  const transactionTableColumns = useMemo(
    () => [
      { key: 'date', label: 'Ngày' },
      { key: 'chuaBcms', label: 'Chưa BCMS' },
      { key: 'account', label: 'Khoản mục' },
      { key: 'notes', label: 'Nội dung diễn giải' },
      { key: 'amount', label: 'Số tiền (VNĐ)' },
      { key: 'remark', label: 'Ghi chú' },
      { key: 'employee', label: 'Người thực hiện' },
      { key: 'actions', label: 'Điều chỉnh' },
    ],
    []
  );

  // Sync selectedCategory when prop changes
  useEffect(() => {
    if (selectedCategoryProp !== undefined) {
      setSelectedCategory(selectedCategoryProp);
    }
  }, [selectedCategoryProp]);

  // Derive default account code from current filter (selectedCategory or searchTerm)
  const activeFilteredAccountCode = useMemo(() => {
    // 1. If category dropdown is selected (not 'ALL')
    if (selectedCategory && selectedCategory !== 'ALL') {
      const cat = String(selectedCategory).trim();
      const byCode = budgets.find((b) => String(b.code || '').trim() === cat);
      if (byCode) return byCode.code;
      const byName = budgets.find((b) => String(b.name || '').trim() === cat);
      if (byName) return byName.code;
      return cat;
    }
    // 2. If search term matches an account code
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const exactCodeMatch = budgets.find(
        (b) => String(b.code || '').trim().toLowerCase() === term
      );
      if (exactCodeMatch) return exactCodeMatch.code;
    }
    return null;
  }, [selectedCategory, searchTerm, budgets]);

  const formatVND = (num) => {
    return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
  };

  // Open Edit Modal
  const handleStartEdit = (item) => {
    setEditingItem(item);
  };

  // Unique categories
  const categories = useMemo(() => {
    const map = new Map();
    (transactions || []).forEach((t) => {
      if (!t) return;
      const codeStr = String(t.accountCode || '').trim();
      const catStr = String(t.category || '').trim();
      const key = codeStr ? `[${codeStr}] ${catStr}` : catStr;
      if (key && !map.has(key)) {
        map.set(key, { code: codeStr, name: catStr, display: key });
      }
    });
    return Array.from(map.values()).sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
  }, [transactions]);

  // Filter logic
  const filtered = useMemo(() => {
    const catFilter = String(selectedCategory || 'ALL').trim();

    return (transactions || []).filter((item) => {
      if (!item) return false;

      // 1. Lọc theo trạng thái BCMS
      if (bcmsFilter === 'CHUA_BCMS' && !item.chuaBcms) return false;
      if (bcmsFilter === 'DA_BCMS' && item.chuaBcms) return false;

      const matchesSearch = matchesVietnameseSearch(
        [item.employeeName, item.notes, item.accountCode, item.category, item.remark],
        searchTerm
      );

      const itemAcc = String(item.accountCode || '').trim();
      const itemCat = String(item.category || '').trim();

      const matchesCategory =
        catFilter === 'ALL' ||
        itemAcc === catFilter ||
        itemCat === catFilter;

      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, selectedCategory, bcmsFilter]);

  // Sort logic
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'newest') {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      }
      if (sortOrder === 'oldest') {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      }
      if (sortOrder === 'account_asc') {
        const codeA = String(a.accountCode || '');
        const codeB = String(b.accountCode || '');
        if (codeA !== codeB) return codeA.localeCompare(codeB);
        return String(b.date || '').localeCompare(String(a.date || ''));
      }
      if (sortOrder === 'account_desc') {
        const codeA = String(a.accountCode || '');
        const codeB = String(b.accountCode || '');
        if (codeA !== codeB) return codeB.localeCompare(codeA);
        return String(b.date || '').localeCompare(String(a.date || ''));
      }
      if (sortOrder === 'highest') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (sortOrder === 'lowest') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });
  }, [filtered, sortOrder]);

  // Auto-sum amount of filtered transactions:
  // 1. Tổng thực tế đã BCMS (loại trừ các khoản đã check Chưa BCMS)
  const totalActualAmount = useMemo(() => {
    return sorted
      .filter((item) => !item.chuaBcms)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [sorted]);

  // 2. Tổng bao gồm cả dự kiến Chưa BCMS
  const totalExpectedAmount = useMemo(() => {
    return sorted.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [sorted]);

  const pendingBcmsCount = useMemo(() => {
    return sorted.filter((item) => item.chuaBcms).length;
  }, [sorted]);

  const pendingBcmsAmount = totalExpectedAmount - totalActualAmount;

  // Tổng số tiền đang hiển thị (phụ thuộc vào showExpectedTotal)
  const totalFilteredAmount = showExpectedTotal ? totalExpectedAmount : totalActualAmount;

  // Auto-count unique descriptions of filtered transactions
  const uniqueNotesCount = useMemo(() => {
    const set = new Set();
    sorted.forEach((item) => {
      const n = String(item.notes || '').trim();
      if (n) set.add(n);
    });
    return set.size;
  }, [sorted]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden relative">
      {/* Toast Notification when saved & synced */}
      {showEditToast && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage || 'Đã lưu chỉnh sửa & đồng bộ trực tiếp về Google Sheet!'}</span>
        </div>
      )}

      {/* Header & Controls: Slim minimalist height */}
      <div className="p-0.5 sm:p-1.5 border-b border-slate-100 space-y-0.5 sm:space-y-1">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 sm:gap-2">
          <div>
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
                <h2 className="text-[9.5px] sm:text-sm font-bold text-slate-800 leading-none">
                  Sổ Cái Hạng Mục{' '}
                  <span className="text-emerald-700 font-extrabold">
                    ({selectedYear === 'ALL' ? 'Tất Cả' : selectedYear})
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-1">
                {/* Tùy chọn Ẩn/Hiện Tổng bao gồm dự kiến (Chưa BCMS) */}
                <button
                  type="button"
                  onClick={() => setShowExpectedTotal((prev) => !prev)}
                  className={`h-5 sm:h-6 px-1.5 py-0 rounded text-[7.5px] sm:text-[9px] font-bold transition-all cursor-pointer leading-tight inline-flex items-center gap-1 ${
                    showExpectedTotal
                      ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-400/50'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Ẩn/Hiện tổng chi phí bao gồm cả các hạng mục Chưa BCMS (dự kiến)"
                >
                  {showExpectedTotal ? (
                    <Eye className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                  )}
                  <span>{showExpectedTotal ? 'Gồm Dự Kiến' : 'Chỉ Đã BCMS'}</span>
                  {pendingBcmsCount > 0 && (
                    <span
                      className={`px-1 rounded-full text-[7px] font-bold ${
                        showExpectedTotal ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pendingBcmsCount}
                    </span>
                  )}
                </button>

                <ColumnVisibilityDropdown
                  columns={transactionTableColumns}
                  isColumnVisible={isColumnVisible}
                  onToggleColumn={toggleColumnVisibility}
                  onShowAll={showAllColumns}
                />

                {onAddTransaction && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-0.5 px-1 py-0.2 sm:px-2 sm:py-0.5 rounded text-[8px] sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all"
                    title={
                      activeFilteredAccountCode
                        ? `Thêm mới hạng mục cho mã [${activeFilteredAccountCode}] và đồng bộ trực tiếp lên Google Sheet`
                        : 'Thêm mới hạng mục và đồng bộ trực tiếp lên Google Sheet'
                    }
                  >
                    <PlusCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>+ Thêm Hạng Mục</span>
                  </button>
                )}
              </div>
            </div>
            <p className="hidden sm:block text-[8px] sm:text-3xs text-slate-500 mt-0.5">
              Hiển thị {sorted.length.toLocaleString('vi-VN')} giao dịch phát sinh trong{' '}
              {selectedYear === 'ALL' ? 'toàn bộ lịch sử' : `năm tài chính ${selectedYear}`}
              {selectedCategory !== 'ALL' && (
                <span className="font-semibold text-blue-600 ml-1">
                  • Lọc [{selectedCategory}]
                </span>
              )}
            </p>
          </div>

          {/* 2 Filter Summary Cards: Auto-count Notes & Auto-sum Amount */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 bg-slate-50/90 p-0.5 sm:p-1 rounded-lg border border-slate-200/80 shadow-2xs">
            {/* 1. Tự đếm nội dung diễn giải */}
            <div className="px-1.5 py-0.5 sm:py-1 rounded bg-white border border-slate-200 shadow-2xs text-left">
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] text-slate-500 font-semibold uppercase tracking-tight leading-none gap-1">
                <span className="flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span>Diễn giải</span>
                </span>
                <span className="text-[7px] sm:text-[8.5px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-100">
                  {uniqueNotesCount} nội dung
                </span>
              </div>
              <div className="text-[9.5px] sm:text-xs font-extrabold text-slate-800 mt-0.5 truncate leading-tight">
                Đếm: <span className="text-blue-700">{sorted.length.toLocaleString('vi-VN')}</span> mục
              </div>
            </div>

            {/* 2. Tự sum cột số tiền */}
            <div
              className={`px-1.5 py-0.5 sm:py-1 rounded border shadow-2xs text-left transition-all ${
                showExpectedTotal
                  ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-blue-50/80 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] font-semibold uppercase tracking-tight leading-none gap-1">
                <span className={`flex items-center gap-0.5 ${showExpectedTotal ? 'text-amber-800' : 'text-blue-700'}`}>
                  <Calculator className="w-2.5 h-2.5 shrink-0" />
                  <span>{showExpectedTotal ? 'Tổng gồm dự kiến' : 'Tổng thực tế'}</span>
                </span>
                <span
                  className={`text-[7px] sm:text-[8.5px] font-bold px-1 rounded border hidden sm:inline-block ${
                    showExpectedTotal
                      ? 'text-amber-800 bg-white/90 border-amber-300'
                      : 'text-blue-700 bg-white/90 border-blue-200'
                  }`}
                >
                  {showExpectedTotal ? 'Bao gồm Chưa BCMS' : 'Chỉ đã BCMS'}
                </span>
              </div>
              <div
                className={`text-[9.5px] sm:text-xs font-black font-mono mt-0.5 truncate whitespace-nowrap leading-tight ${
                  showExpectedTotal ? 'text-amber-950' : 'text-blue-900'
                }`}
                title={formatVND(totalFilteredAmount)}
              >
                {formatVND(totalFilteredAmount)}
              </div>
              {pendingBcmsCount > 0 && (
                <div className="text-[7px] sm:text-[8px] text-slate-500 mt-0.5 leading-none truncate">
                  {showExpectedTotal
                    ? `(+${formatVND(pendingBcmsAmount)} dự kiến)`
                    : `(-${pendingBcmsCount} mục Chưa BCMS)`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Bar: Ultra-slim 1-line controls */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-0.5 sm:gap-1.5 pt-0.5">
          {/* Search Input */}
          <div className="col-span-2 sm:col-span-4 relative">
            <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo nhân viên, nội dung, mã (627...)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="w-full h-5 sm:h-6 pl-5 pr-1.5 py-0 text-[8px] sm:text-xs rounded border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-500 transition-all leading-tight"
            />
          </div>

          {/* Category Filter */}
          <div className="col-span-1 sm:col-span-3 relative">
            <Layers className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                if (onSelectCategory) onSelectCategory(val);
              }}
              className="w-full h-5 sm:h-6 pl-4.5 pr-1 py-0 text-[8px] sm:text-xs rounded border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer truncate leading-tight"
            >
              <option value="ALL">Tất cả tài khoản ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.display} value={c.code || c.name}>
                  {c.display}
                </option>
              ))}
            </select>
          </div>

          {/* BCMS Filter Pills */}
          <div className="col-span-1 sm:col-span-3 inline-flex items-center p-0.5 rounded border border-slate-200 bg-slate-50/80 h-5 sm:h-6 text-[7.5px] sm:text-[9.5px]">
            <button
              type="button"
              onClick={() => setBcmsFilter('ALL')}
              className={`flex-1 h-full px-1 rounded transition-all cursor-pointer font-semibold ${
                bcmsFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Toàn bộ giao dịch"
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setBcmsFilter('DA_BCMS')}
              className={`flex-1 h-full px-1 rounded transition-all cursor-pointer font-semibold ${
                bcmsFilter === 'DA_BCMS'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chỉ các khoản Đã có chứng từ/BCMS"
            >
              Đã BCMS ({totalTxDoneCount})
            </button>
            <button
              type="button"
              onClick={() => setBcmsFilter('CHUA_BCMS')}
              className={`flex-1 h-full px-1 rounded transition-all cursor-pointer font-semibold inline-flex items-center justify-center gap-0.5 ${
                bcmsFilter === 'CHUA_BCMS'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : totalTxPendingCount > 0
                  ? 'text-amber-800 bg-amber-100 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title={
                totalTxPendingCount > 0
                  ? `Có ${totalTxPendingCount} khoản Chưa BCMS (dự kiến)`
                  : 'Không có khoản dự kiến nào'
              }
            >
              {totalTxPendingCount > 0 && <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>}
              <span>Chưa BCMS ({totalTxPendingCount})</span>
            </button>
          </div>

          {/* Sort Order */}
          <div className="col-span-2 sm:col-span-2 relative">
            <ArrowUpDown className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full h-5 sm:h-6 pl-4.5 pr-1 py-0 text-[8px] sm:text-xs rounded border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer truncate font-medium leading-tight"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="account_asc">Mã tăng dần</option>
              <option value="account_desc">Mã giảm dần</option>
              <option value="highest">Tiền cao nhất</option>
              <option value="lowest">Tiền thấp nhất</option>
            </select>
          </div>

          {/* Quick Add Button (Desktop only, mobile has it in header) */}
          {onAddTransaction && (
            <div className="hidden sm:block sm:col-span-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all"
                title={
                  activeFilteredAccountCode
                    ? `Thêm mới hạng mục cho mã [${activeFilteredAccountCode}]`
                    : 'Tạo hạng mục mới theo mã khoản mục'
                }
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">Thêm Hạng Mục</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table: Compact minimalist layout, column order:
          Ngày | Khoản mục & Nhóm | Nội dung diễn giải | Số tiền | Người thực hiện | Điều chỉnh
      */}
      {sorted.length === 0 ? (
        <div className="text-center py-10 px-4">
          <p className="text-xs sm:text-sm font-medium text-slate-600">Không tìm thấy giao dịch phù hợp</p>
          <p className="text-3xs sm:text-xs text-slate-400 mt-0.5">
            Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-130px)] sm:max-h-[calc(100vh-155px)] relative">
          <table
            className="w-full text-left border-collapse table-fixed"
            style={{ minWidth: `${totalTableWidth}px` }}
          >
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
              <tr className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                {/* 1. Ngày: dd/mm/yy không icon, tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('date') && (
                  <th
                    onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                    style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 cursor-pointer hover:text-blue-600 transition-colors select-none text-center leading-tight break-words"
                    title="Click để đổi thứ tự ngày • Kéo mép phải để giãn cột"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center">
                      <span>Ngày</span>
                      <ArrowUpDown className="w-2 h-2 text-slate-400 shrink-0" />
                    </div>
                    <ColumnResizeHandle colKey="date" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 1b. Chưa BCMS: Tùy biến kéo giãn */}
                {isColumnVisible('chuaBcms') && (
                  <th
                    style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                    className="relative py-0.5 px-0.5 text-center leading-tight select-none"
                    title="Chưa BCMS (Khoản dự kiến, không tính vào tổng thực tế) • Kéo mép phải để giãn cột"
                  >
                    <div className="truncate text-center w-full">Chưa BCMS</div>
                    <ColumnResizeHandle colKey="chuaBcms" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 2. Khoản mục & Nhóm: tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('account') && (
                  <th
                    onClick={() => setSortOrder(sortOrder === 'account_asc' ? 'account_desc' : 'account_asc')}
                    style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 cursor-pointer hover:text-blue-600 transition-colors select-none text-center leading-tight break-words"
                    title="Click để sort theo Mã khoản mục • Kéo mép phải để giãn cột"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center">
                      <span>Khoản mục</span>
                      <ArrowUpDown className="w-2 h-2 text-slate-400 shrink-0" />
                    </div>
                    <ColumnResizeHandle colKey="account" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 3. Nội dung diễn giải: tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('notes') && (
                  <th
                    style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                    title="Nội dung diễn giải • Kéo mép phải để giãn cột"
                  >
                    <div className="text-center w-full pr-1">Nội dung diễn giải</div>
                    <ColumnResizeHandle colKey="notes" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 4. Số tiền (VNĐ): tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('amount') && (
                  <th
                    onClick={() => setSortOrder(sortOrder === 'highest' ? 'lowest' : 'highest')}
                    style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center cursor-pointer hover:text-blue-600 transition-colors select-none leading-tight break-words"
                    title="Click để đổi thứ tự số tiền • Kéo mép phải để giãn cột"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center">
                      <span>Số tiền (VNĐ)</span>
                      <ArrowUpDown className="w-2 h-2 text-slate-400 shrink-0" />
                    </div>
                    <ColumnResizeHandle colKey="amount" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 4b. Ghi chú: Nằm ngay sau cột Số tiền */}
                {isColumnVisible('remark') && (
                  <th
                    style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words select-none"
                    title="Ghi chú bổ sung • Kéo mép phải để giãn cột"
                  >
                    <div className="text-center w-full pr-1">Ghi Chú</div>
                    <ColumnResizeHandle colKey="remark" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 5. Người thực hiện: căn giữa, tùy biến kéo giãn */}
                {isColumnVisible('employee') && (
                  <th
                    style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                    title="Người thực hiện • Kéo mép phải để giãn cột"
                  >
                    <div className="text-center w-full pr-1">Người thực hiện</div>
                    <ColumnResizeHandle colKey="employee" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 6. Điều chỉnh (Thao tác): tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('actions') && (
                  <th
                    style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                    className="relative py-0.5 px-0.5 text-center leading-tight break-words"
                    title="Thao tác"
                  >
                    <div className="text-center w-full">Điều chỉnh</div>
                    <ColumnResizeHandle colKey="actions" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* 1. Ngày: dd/mm/yy không logo lịch */}
                  {isColumnVisible('date') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-center font-mono text-[9px] sm:text-xs text-slate-700 font-medium leading-tight break-words"
                      style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                    >
                      {formatDate(item.date)}
                    </td>
                  )}

                  {/* 1b. Chưa BCMS: Checkbox bật/tắt dự kiến */}
                  {isColumnVisible('chuaBcms') && (
                    <td
                      className="py-0.5 px-0.5 text-center leading-tight select-none"
                      style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                    >
                      <label
                        className="inline-flex items-center justify-center cursor-pointer p-0.5"
                        title={item.chuaBcms ? 'Khoản dự kiến (Chưa BCMS) - Loại trừ khỏi tổng thực tế' : 'Đã BCMS - Tính vào tổng thực tế'}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.chuaBcms)}
                          onChange={(e) => {
                            if (onUpdateTransaction) {
                              onUpdateTransaction({
                                ...item,
                                chuaBcms: e.target.checked,
                              });
                              setToastMessage(
                                e.target.checked
                                  ? 'Đã chuyển thành "Chưa BCMS" (khoản dự kiến)'
                                  : 'Đã bỏ chọn Chưa BCMS (tính vào tổng thực tế)'
                              );
                              setShowEditToast(true);
                              setTimeout(() => setShowEditToast(false), 2500);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                        />
                      </label>
                    </td>
                  )}

                  {/* 2. Khoản mục: Chỉ hiện số mã không hiện tên khoản mục */}
                  {isColumnVisible('account') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-center leading-tight"
                      style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }}
                      title={item.category ? `[${item.accountCode || ''}] ${item.category}` : item.accountCode}
                    >
                      {item.accountCode ? (
                        <span className="font-mono text-[8.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors inline-block">
                          {item.accountCode}
                        </span>
                      ) : (
                        <span className="font-mono text-[8.5px] sm:text-[10px] font-bold text-slate-500">
                          {item.category || '—'}
                        </span>
                      )}
                    </td>
                  )}

                  {/* 3. Nội dung diễn giải: Xuống dòng tự nhiên, khoảng cách dòng mảnh */}
                  {isColumnVisible('notes') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-[9.5px] sm:text-xs text-slate-700 break-words whitespace-normal leading-tight"
                      style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                      title={item.notes}
                    >
                      <div className="flex items-start gap-1">
                        {item.chuaBcms && (
                          <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            Dự kiến
                          </span>
                        )}
                        <span>{item.notes}</span>
                      </div>
                    </td>
                  )}

                  {/* 4. Số tiền */}
                  {isColumnVisible('amount') && (
                    <td
                      className={`py-0.5 px-0.5 sm:px-1 text-right font-mono font-bold text-[9.5px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden ${
                        item.chuaBcms ? 'text-amber-700 italic' : 'text-slate-900'
                      }`}
                      style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                      title={item.chuaBcms ? 'Khoản Chưa BCMS (dự kiến)' : undefined}
                    >
                      {formatVND(item.amount)}
                    </td>
                  )}

                  {/* 4b. Ghi chú: Nằm ngay sau cột Số tiền */}
                  {isColumnVisible('remark') && (
                    <td
                      className="py-0.5 px-1 text-center text-slate-600 text-[9px] sm:text-xs leading-tight break-words whitespace-normal"
                      style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                    >
                      {item.remark ? (
                        <span className="text-slate-700 italic">{item.remark}</span>
                      ) : (
                        <span className="text-slate-200 select-none font-light">—</span>
                      )}
                    </td>
                  )}

                  {/* 5. Người thực hiện: Căn giữa, xuống dòng nếu hẹp */}
                  {isColumnVisible('employee') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-[9.5px] sm:text-xs text-slate-700 text-center leading-tight break-words"
                      style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                    >
                      <span className="font-medium text-slate-700 leading-tight">
                        {item.employeeName || 'Chưa ghi nhận'}
                      </span>
                    </td>
                  )}

                  {/* 6. Điều chỉnh */}
                  {isColumnVisible('actions') && (
                    <td
                      className="py-0.5 px-0.5 text-center leading-tight"
                      style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {onUpdateTransaction && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-75 group-hover:opacity-100"
                            title="Chỉnh sửa nội dung hạng mục này"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {onDeleteTransaction && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa hạng mục "${item.notes}" không?`)) {
                                onDeleteTransaction(item.id);
                              }
                            }}
                            className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-75 group-hover:opacity-100"
                            title="Xóa hạng mục này"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {!onUpdateTransaction && !onDeleteTransaction && (
                          <span className="text-[9px] text-slate-400 italic">Chỉ xem</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>

            {/* Sticky Table Footer: Tự sum tiền & Tự đếm diễn giải */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 backdrop-blur-xs border-t-2 border-slate-300 shadow-xs">
              <tr className="divide-x divide-slate-200">
                {/* 1. Ngày */}
                {isColumnVisible('date') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center font-bold text-[8px] sm:text-xs text-slate-700 uppercase leading-tight"
                    style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                  >
                    TỔNG
                  </td>
                )}

                {/* 1b. Chưa BCMS */}
                {isColumnVisible('chuaBcms') && (
                  <td
                    className="py-1 px-0.5 text-center text-slate-400 text-3xs"
                    style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                  >
                    —
                  </td>
                )}

                {/* 2. Khoản mục */}
                {isColumnVisible('account') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center font-mono text-[8.5px] sm:text-xs text-slate-700 leading-tight truncate"
                    style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }}
                    title={selectedCategory !== 'ALL' ? `Lọc mã: ${selectedCategory}` : 'Tất cả khoản mục'}
                  >
                    {selectedCategory !== 'ALL' ? (
                      <span className="text-blue-700 font-bold truncate block">{selectedCategory}</span>
                    ) : (
                      <span className="text-slate-500 font-semibold italic text-[8px] sm:text-[9.5px]">Tất cả</span>
                    )}
                  </td>
                )}

                {/* 3. Nội dung diễn giải: Tự đếm */}
                {isColumnVisible('notes') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-[8.5px] sm:text-xs text-slate-800 leading-tight"
                    style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 shrink-0" />
                      <span>
                        Đếm: <strong className="text-blue-700 font-black">{sorted.length.toLocaleString('vi-VN')}</strong> mục{' '}
                        <span className="text-slate-500 font-normal">({uniqueNotesCount} nội dung)</span>
                      </span>
                    </div>
                  </td>
                )}

                {/* 4. Số tiền: Tự sum */}
                {isColumnVisible('amount') && (
                  <td
                    className={`py-1 px-0.5 sm:px-1 text-right font-mono font-black text-[9.5px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden ${
                      showExpectedTotal ? 'text-amber-950' : 'text-blue-900'
                    }`}
                    style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                    title={`Tổng chi phí: ${formatVND(totalFilteredAmount)}`}
                  >
                    <div>{formatVND(totalFilteredAmount)}</div>
                    {pendingBcmsCount > 0 && (
                      <div className="text-[7.5px] font-normal text-slate-500 font-sans">
                        {showExpectedTotal
                          ? `(+${formatVND(pendingBcmsAmount)} DK)`
                          : `(-${pendingBcmsCount} mục Chưa BCMS)`}
                      </div>
                    )}
                  </td>
                )}

                {/* 4b. Ghi chú */}
                {isColumnVisible('remark') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center text-slate-400 text-3xs"
                    style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                  >
                    —
                  </td>
                )}

                {/* 5. Người thực hiện */}
                {isColumnVisible('employee') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center text-slate-400 text-[8.5px] sm:text-xs"
                    style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                  >
                    —
                  </td>
                )}

                {/* 6. Điều chỉnh */}
                {isColumnVisible('actions') && (
                  <td
                    className="py-1 px-0.5 text-center text-slate-400 text-[8.5px] sm:text-xs"
                    style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                  >
                    —
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* EDIT MODAL: Chỉnh sửa trực tiếp & Đồng bộ tức thì */}
      {editingItem && (
        <EditTransactionModal
          isOpen={Boolean(editingItem)}
          transaction={editingItem}
          budgets={budgets}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            if (onUpdateTransaction) {
              onUpdateTransaction(updated);
            }
            setToastMessage('Đã lưu chỉnh sửa & đồng bộ trực tiếp về Google Sheet!');
            setShowEditToast(true);
            setTimeout(() => setShowEditToast(false), 3000);
          }}
        />
      )}

      {/* ADD TRANSACTION MODAL: Thêm mới theo mã khoản mục & đồng bộ tức thì */}
      {isAddModalOpen && (
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          budgets={budgets}
          transactions={transactions}
          selectedYear={selectedYear}
          defaultAccountCode={activeFilteredAccountCode}
          onAddTransaction={(newRec) => {
            if (onAddTransaction) {
              onAddTransaction(newRec);
            }
            setToastMessage('Đã thêm hạng mục mới & đồng bộ trực tiếp về Google Sheet!');
            setShowEditToast(true);
            setTimeout(() => setShowEditToast(false), 3500);
          }}
        />
      )}
    </div>
  );
}
