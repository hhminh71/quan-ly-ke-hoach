import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ArrowUpDown,
  Trash2,
  Edit3,
  FileSpreadsheet,
  ArrowUpRight,
  Shield,
  Layers,
  PlusCircle,
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import AddTransactionModal from './AddTransactionModal';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { formatDate } from '../utils/dateUtils';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { useResizableColumns, ColumnResizeHandle, ColumnVisibilityDropdown } from '../hooks/useResizableColumns';
import {
  getSctsSeparatedCodes,
  isSctsSeparated,
  toggleSctsSeparation,
  calculateReportActual,
} from '../utils/sctsConfig';

export default function AccountLedgerModal({
  isOpen = true,
  account,
  transactions = [],
  budgets = [],
  selectedYear = '2026',
  onClose,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [editingItem, setEditingItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBravo, setShowBravo] = useState(true);
  const [showActual, setShowActual] = useState(true);

  // Sync with browser history for mobile hardware/gesture Back button
  useModalBackHandler(isOpen && Boolean(account), onClose, 'account-ledger');

  // 1. ALL hooks MUST be declared at the top unconditionally (React Rules of Hooks)
  const accountTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    const accCode = String(account.code || '').trim();
    const accName = String(account.name || '').trim();

    return (transactions || []).filter((t) => {
      if (!t) return false;
      if (selectedYear && selectedYear !== 'ALL') {
        const fy = String(t.fiscalYear || (t.date && t.date.length >= 4 ? t.date.substring(0, 4) : '')).trim();
        if (fy && fy !== String(selectedYear)) return false;
      }
      const tCode = String(t.accountCode || '').trim();
      const tCat = String(t.category || '').trim();
      return (tCode && tCode === accCode) || (!tCode && tCat === accName);
    });
  }, [isOpen, transactions, account, selectedYear]);

  const filteredTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    return accountTransactions.filter((item) => {
      return matchesVietnameseSearch(
        [item.employeeName, item.notes, item.date, item.amount],
        searchTerm
      );
    });
  }, [isOpen, account, accountTransactions, searchTerm]);

  const sortedTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    return [...filteredTransactions].sort((a, b) => {
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
      if (sortOrder === 'highest') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (sortOrder === 'lowest') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });
  }, [isOpen, account, filteredTransactions, sortOrder]);

  const currentTotalAmount = useMemo(() => {
    if (!isOpen || !account) return 0;
    return sortedTransactions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [isOpen, account, sortedTransactions]);

  const [sctsCodes, setSctsCodes] = useState(getSctsSeparatedCodes);

  // Resizable columns hook for Account Ledger Detail table
  const {
    columnWidths,
    handleResizeStart,
    resetColumnWidth,
    totalTableWidth,
    isColumnVisible,
    toggleColumnVisibility,
    showAllColumns,
  } = useResizableColumns({
    storageKey: 'tbl_cols_account_ledger_v3',
    initialWidths: {
      stt: 36,
      date: 72,
      notes: 300,
      amount: 115,
      employee: 110,
      actions: 60,
    },
    minWidths: {
      stt: 28,
      date: 50,
      notes: 90,
      amount: 105,
      employee: 60,
      actions: 45,
    },
  });

  const ledgerTableColumns = useMemo(
    () => [
      { key: 'stt', label: '#' },
      { key: 'date', label: 'Ngày' },
      { key: 'notes', label: 'Nội Dung Diễn Giải' },
      { key: 'amount', label: 'Số Tiền (VNĐ)' },
      { key: 'employee', label: 'Người Thực Hiện' },
      { key: 'actions', label: 'Điều Chỉnh' },
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

  // 2. ONLY return early after ALL hooks have been executed
  if (!isOpen || !account) return null;

  const formatVND = (num) => {
    return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
  };

  // Live account stats defensively
  const approved = Number(account.selectedYearApproved) || 0;
  const spent = Number(account.liveActual) || 0;
  const bravoVal = Number(
    account.bravoVal !== undefined
      ? account.bravoVal
      : account.bravoActual !== undefined
      ? account.bravoActual
      : account.bravoAmount
  ) || 0;

  const isSeparated = isSctsSeparated(account.code, sctsCodes);
  const { reportActual, source } = calculateReportActual(spent, bravoVal, account.code, sctsCodes);
  const remaining = approved - reportActual;
  const spentPercent = approved > 0 ? (reportActual / approved) * 100 : 0;
  const liveActualPercent = approved > 0 ? (spent / approved) * 100 : 0;
  const bravoPercent = approved > 0 ? (bravoVal / approved) * 100 : 0;
  const remainingPercent = approved > 0 ? (remaining / approved) * 100 : 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Modal Container: Compact, sleek, maximized visible vertical area for screenshots */}
        <div
          className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Slim minimalist bar */}
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-mono text-2xs sm:text-xs font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                    {account.code}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {account.name}
                  </h3>
                  <span className="text-3xs sm:text-[10px] font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded-full shrink-0">
                    Năm {selectedYear}
                  </span>
                </div>
                <p className="text-3xs sm:text-[11px] text-slate-500 leading-none mt-0.5 truncate">
                  <span className="font-medium text-slate-700">{account.scope || account.group}</span>
                  {' • '}
                  <span>
                    Tổng cộng <strong className="text-blue-700">{accountTransactions.length}</strong> hạng mục phát sinh
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Nút Thêm Mới Hạng Mục (chỉ hiển thị khi có quyền onAddTransaction) */}
              {onAddTransaction && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs sm:text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                  title={`Thêm mới hạng mục cho mã [${account.code}]`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Thêm Mới</span>
                </button>
              )}

              {onNavigateToLedger && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToLedger(account.code);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  title="Mở toàn màn hình trong tab Sổ Cái"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mở Tab Sổ Cái</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Top KPI Bar (Ultra-slim, minimalist height for screenshots) */}
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 space-y-1.5 shrink-0">
            <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 [&>*]:flex-1 [&>*]:min-w-[85px] sm:[&>*]:min-w-0">
              {/* 1. Tổng được duyệt */}
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs shrink-0 sm:shrink">
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-tight">
                  <span className="truncate">Duyệt {selectedYear}</span>
                  <span className="font-bold bg-slate-200/90 text-slate-700 px-1 py-0.2 rounded text-3xs">
                    100%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-tight mt-0.5 truncate" title={formatVND(approved)}>
                  {formatVND(approved)}
                </div>
              </div>

              {/* 2. Theo Bravo (hiển thị khi showBravo = true) */}
              {showBravo && (
                <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 shadow-2xs shrink-0 sm:shrink">
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-amber-800 font-semibold uppercase tracking-tight">
                    <span className="truncate">Theo Bravo</span>
                    <span className="font-bold px-1 py-0.2 rounded text-white bg-amber-500 text-3xs">
                      {bravoPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-950 font-mono leading-tight mt-0.5 truncate" title={formatVND(bravoVal)}>
                    {formatVND(bravoVal)}
                  </div>
                </div>
              )}

              {/* 3. Theo Thực Tế (hiển thị khi showActual = true) */}
              {showActual && (
                <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 shadow-2xs shrink-0 sm:shrink">
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-blue-800 font-semibold uppercase tracking-tight">
                    <span className="truncate">Theo Thực Tế</span>
                    <span className="font-bold px-1 py-0.2 rounded text-white bg-blue-600 text-3xs">
                      {liveActualPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-blue-950 font-mono leading-tight mt-0.5 truncate" title={formatVND(spent)}>
                    {formatVND(spent)}
                  </div>
                </div>
              )}

              {/* 4. Chi phí thực tế báo cáo (MAX) */}
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 shadow-2xs shrink-0 sm:shrink">
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-emerald-800 font-semibold uppercase tracking-tight">
                  <span className="truncate">{isSeparated ? 'SCTX Nhập Liệu' : 'Báo Cáo (MAX)'}</span>
                  <span className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                    isSeparated ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}>
                    {spentPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-950 font-mono leading-tight mt-0.5 truncate" title={formatVND(reportActual)}>
                  {formatVND(reportActual)}
                </div>
              </div>

              {/* 5. Còn lại / Vượt */}
              <div
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border shadow-2xs shrink-0 sm:shrink ${
                  remaining >= 0 ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-semibold uppercase tracking-tight">
                  <span className={remaining >= 0 ? 'text-slate-600' : 'text-rose-700'}>
                    {remaining >= 0 ? 'Còn Lại' : 'Vượt'}
                  </span>
                  <span
                    className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                      remaining >= 0 ? 'bg-slate-600' : 'bg-rose-600'
                    }`}
                  >
                    {remainingPercent.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-extrabold font-mono leading-tight mt-0.5 truncate ${
                    remaining >= 0 ? 'text-slate-900' : 'text-rose-700'
                  }`}
                  title={formatVND(remaining)}
                >
                  {formatVND(remaining)}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar - Slim 1px line */}
            {approved > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    spentPercent > 100
                      ? 'bg-rose-500'
                      : spentPercent > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(spentPercent, 100)}%` }}
                ></div>
              </div>
            )}

            {/* SCTS separation toggle - Ultra-slim single line */}
            <div
              className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg border text-3xs sm:text-[11px] transition-colors ${
                isSeparated
                  ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                  : 'bg-slate-50 border-slate-200/80 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className={`w-3.5 h-3.5 shrink-0 ${isSeparated ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-semibold truncate">
                  {isSeparated
                    ? `Đã tách riêng SCTS • Chỉ tính SCTX nhập liệu (${formatVND(spent)})`
                    : `Quy tắc MAX(Bravo, Thực Tế) • Bravo: ${formatVND(bravoVal)} • Thực tế: ${formatVND(spent)}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleSctsSeparation(account.code)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs sm:text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  isSeparated
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                title="Bấm để bật/tắt chế độ tách riêng chi phí SCTS cho mã tài khoản này"
              >
                {isSeparated ? '✓ Đang Tách SCTS' : 'Tách Riêng SCTS'}
              </button>
            </div>
          </div>

          {/* Search & Sort Controls inside Modal: Slim bar */}
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-2 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm người thực hiện, diễn giải..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-2xs sm:text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Nút Ẩn/Hiện Theo Bravo và Theo Thực Tế */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBravo((prev) => !prev)}
                  className={`h-5 sm:h-6 px-1.5 py-0 rounded text-[7.5px] sm:text-[9px] font-bold transition-all cursor-pointer leading-tight ${
                    showBravo
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title={showBravo ? 'Ẩn Theo Bravo' : 'Hiện Theo Bravo'}
                >
                  Bravo
                </button>
                <button
                  type="button"
                  onClick={() => setShowActual((prev) => !prev)}
                  className={`h-5 sm:h-6 px-1.5 py-0 rounded text-[7.5px] sm:text-[9px] font-bold transition-all cursor-pointer leading-tight ${
                    showActual
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title={showActual ? 'Ẩn Theo Thực Tế' : 'Hiện Theo Thực Tế'}
                >
                  Thực Tế
                </button>
              </div>

              <ColumnVisibilityDropdown
                columns={ledgerTableColumns}
                isColumnVisible={isColumnVisible}
                onToggleColumn={toggleColumnVisibility}
                onShowAll={showAllColumns}
              />

              <div className="relative">
                <ArrowUpDown className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="pl-6 pr-2 py-1 text-2xs sm:text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all cursor-pointer font-medium"
                >
                  <option value="newest">Ngày mới nhất</option>
                  <option value="oldest">Ngày cũ nhất</option>
                  <option value="highest">Tiền cao nhất</option>
                  <option value="lowest">Tiền thấp nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ledger Table: Sổ cái chi tiết các hạng mục */}
          {/* USER SPECIFICATION:
              1. Cột 'Người thực hiện' di chuyển ra cuối, trước cột 'Điều chỉnh' (Thao tác), căn giữa và bỏ chữ cái viết tắt phía trước
                 -> Thứ tự: # | Ngày | Nội Dung Diễn Giải | Số Tiền (VNĐ) | Người Thực Hiện | Điều Chỉnh
              2. Kéo giãn các cột tùy biến, xuống dòng tự nhiên, khoảng cách dòng tối giản mảnh
          */}
          <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0">
            {sortedTransactions.length === 0 && (!showBravo || bravoVal === 0) ? (
              <div className="text-center py-10 px-4">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {searchTerm
                    ? 'Không tìm thấy hạng mục nào khớp với từ khóa'
                    : `Chưa có hạng mục nào phát sinh cho khoản mục này trong năm ${selectedYear}`}
                </p>
                <p className="text-3xs sm:text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
                  {searchTerm
                    ? 'Thử thay đổi từ khóa hoặc xóa tìm kiếm để xem tất cả hạng mục.'
                    : 'Các hạng mục mới phát sinh trên Webhook hoặc form nhập liệu sẽ tự động xuất hiện tại đây.'}
                </p>
              </div>
            ) : (
              <table
                className="w-full text-left border-collapse table-fixed"
                style={{ minWidth: `${totalTableWidth}px` }}
              >
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-20 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                    {/* 1. STT */}
                    {isColumnVisible('stt') && (
                      <th
                        className="py-0.5 px-0.5 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.stt}px`, minWidth: `${columnWidths.stt}px` }}
                      >
                        <div className="truncate text-center w-full">#</div>
                        <ColumnResizeHandle
                          colKey="stt"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 2. Ngày: dd/mm/yy không logo lịch, bóp siêu gọn */}
                    {isColumnVisible('date') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                      >
                        <div className="truncate text-center w-full">Ngày</div>
                        <ColumnResizeHandle
                          colKey="date"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 3. Nội dung diễn giải */}
                    {isColumnVisible('notes') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                      >
                        <div className="truncate text-center w-full">Nội Dung Diễn Giải</div>
                        <ColumnResizeHandle
                          colKey="notes"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 4. Số tiền */}
                    {isColumnVisible('amount') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                      >
                        <div className="truncate text-center w-full">Số Tiền (VNĐ)</div>
                        <ColumnResizeHandle
                          colKey="amount"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 5. Người thực hiện: Căn giữa */}
                    {isColumnVisible('employee') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                      >
                        <div className="truncate text-center w-full">Người Thực Hiện</div>
                        <ColumnResizeHandle
                          colKey="employee"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 6. Điều chỉnh */}
                    {isColumnVisible('actions') && (
                      <th
                        className="py-0.5 px-0.5 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                      >
                        <div className="truncate text-center w-full">Điều Chỉnh</div>
                        <ColumnResizeHandle
                          colKey="actions"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {showActual &&
                    sortedTransactions.map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        {/* 1. STT */}
                        {isColumnVisible('stt') && (
                          <td
                            className="py-0.5 px-0.5 text-center font-mono text-[9px] sm:text-[10px] text-slate-400 leading-tight break-words"
                            style={{ width: `${columnWidths.stt}px`, minWidth: `${columnWidths.stt}px` }}
                          >
                            {index + 1}
                          </td>
                        )}

                        {/* 2. Ngày */}
                        {isColumnVisible('date') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-center font-mono text-[9px] sm:text-xs text-slate-700 font-medium leading-tight break-words whitespace-normal"
                            style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                          >
                            {formatDate(item.date)}
                          </td>
                        )}

                        {/* 3. Nội dung diễn giải */}
                        {isColumnVisible('notes') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-slate-700 text-[9.5px] sm:text-xs break-words whitespace-normal leading-tight"
                            style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                          >
                            {item.notes}
                          </td>
                        )}

                        {/* 4. Số tiền */}
                        {isColumnVisible('amount') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-right font-mono font-bold text-slate-900 text-[9.5px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden"
                            style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                          >
                            {formatVND(item.amount)}
                          </td>
                        )}

                        {/* 5. Người thực hiện: Căn giữa, bỏ chữ viết tắt phía trước */}
                        {isColumnVisible('employee') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-slate-700 text-[9.5px] sm:text-xs text-center leading-tight break-words whitespace-normal"
                            style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                          >
                            <span className="font-medium text-slate-800 leading-tight">
                              {item.employeeName || 'Chưa ghi nhận'}
                            </span>
                          </td>
                        )}

                        {/* 6. Điều chỉnh */}
                        {isColumnVisible('actions') && (
                          <td
                            className="py-0.5 px-0.5 text-center leading-tight break-words"
                            style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              {onUpdateTransaction && (
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(item)}
                                  className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-75 group-hover:opacity-100"
                                  title="Chỉnh sửa hạng mục này"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {onDeleteTransaction && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Bạn có chắc muốn xóa hạng mục "${item.notes}" (${formatVND(item.amount)})?`)) {
                                      onDeleteTransaction(item.id);
                                    }
                                  }}
                                  className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-75 group-hover:opacity-100"
                                  title="Xóa hạng mục này"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                  {/* Khi người dùng ẩn danh sách Thực Tế */}
                  {!showActual && sortedTransactions.length > 0 && (
                    <tr className="bg-slate-50/70 text-slate-400 italic">
                      <td colSpan={6} className="py-2.5 px-3 text-center text-3xs sm:text-xs">
                        Danh sách hạng mục Thực Tế (nhập liệu) đang tạm ẩn. Bấm nút <strong>Thực Tế</strong> phía trên để hiển thị lại.
                      </td>
                    </tr>
                  )}

                  {/* Dòng hạch toán hệ thống Bravo khi showBravo = true */}
                  {showBravo && bravoVal > 0 && (
                    <tr className="bg-amber-50/70 border-t-2 border-amber-200/90 hover:bg-amber-100/70 transition-colors">
                      {isColumnVisible('stt') && (
                        <td
                          className="py-0.5 px-0.5 text-center font-mono text-[8.5px] sm:text-[9.5px] font-bold text-amber-700 leading-tight"
                          style={{ width: `${columnWidths.stt}px`, minWidth: `${columnWidths.stt}px` }}
                        >
                          BRAVO
                        </td>
                      )}
                      {isColumnVisible('date') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-center font-mono text-[8.5px] sm:text-xs text-amber-800 font-semibold leading-tight whitespace-normal break-words"
                          style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                        >
                          {selectedYear}
                        </td>
                      )}
                      {isColumnVisible('notes') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-amber-900 text-[9px] sm:text-xs leading-tight whitespace-normal break-words"
                          style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                        >
                          <span className="font-bold text-amber-800">Số liệu hạch toán hệ thống BRAVO</span>
                          {bravoVal > currentTotalAmount ? (
                            <span className="text-amber-700 text-3xs sm:text-[10px] ml-1 sm:ml-1.5 font-medium">
                              (Chênh lệch chưa lập chứng từ chi tiết: +{formatVND(bravoVal - currentTotalAmount)})
                            </span>
                          ) : bravoVal < currentTotalAmount ? (
                            <span className="text-blue-700 text-3xs sm:text-[10px] ml-1 sm:ml-1.5 font-medium">
                              (Nhập liệu thực tế đang cao hơn Bravo {formatVND(currentTotalAmount - bravoVal)})
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-3xs sm:text-[10px] ml-1 sm:ml-1.5 font-medium">
                              (Khớp 100% với nhập liệu thực tế)
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('amount') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-right font-mono font-extrabold text-amber-900 text-[9px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden"
                          style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                        >
                          {formatVND(bravoVal)}
                        </td>
                      )}
                      {isColumnVisible('employee') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-center text-amber-800 text-[9px] sm:text-xs leading-tight font-medium break-words"
                          style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                        >
                          Hệ thống BRAVO
                        </td>
                      )}
                      {isColumnVisible('actions') && (
                        <td
                          className="py-0.5 px-0.5 text-center leading-tight break-words"
                          style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                        >
                          <span className="text-[7.5px] sm:text-[8.5px] font-bold px-1 py-0.2 bg-amber-200/80 text-amber-800 rounded">
                            Tự động
                          </span>
                        </td>
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Footer: Slim single-line footer */}
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 text-3xs sm:text-[11px] text-slate-500 shrink-0">
            <div className="truncate">
              Hiển thị <strong className="text-slate-800">{showActual ? sortedTransactions.length : 0}</strong> / <strong className="text-slate-800">{accountTransactions.length}</strong> hạng mục thực tế{' '}
              {searchTerm && <span>(Khớp bộ lọc)</span>}
              {showActual && (
                <>
                  {' • '}Thực Tế:{' '}
                  <strong className="text-blue-700 font-mono font-bold whitespace-nowrap">
                    {formatVND(currentTotalAmount)}
                  </strong>
                </>
              )}
              {showBravo && bravoVal > 0 && (
                <>
                  {' • '}Bravo:{' '}
                  <strong className="text-amber-700 font-mono font-bold whitespace-nowrap">
                    {formatVND(bravoVal)}
                  </strong>
                </>
              )}
              {' • '}Báo Cáo (MAX):{' '}
              <strong className="text-emerald-700 font-mono font-bold whitespace-nowrap">
                {formatVND(reportActual)}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-2xs sm:text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal for direct row modification */}
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
          }}
        />
      )}

      {/* Add Transaction Modal with pre-selected account */}
      {isAddModalOpen && (
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddTransaction={(newRecord) => {
            if (onAddTransaction) {
              onAddTransaction(newRecord);
            }
            setIsAddModalOpen(false);
          }}
          budgets={budgets}
          transactions={transactions}
          selectedYear={selectedYear}
          defaultAccountCode={account?.code}
        />
      )}
    </>
  );
}
