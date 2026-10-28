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
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { formatDate } from '../utils/dateUtils';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
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
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [editingItem, setEditingItem] = useState(null);

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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num) || 0);
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
                    Tổng cộng <strong className="text-blue-700">{accountTransactions.length}</strong> phiếu chi phát sinh
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
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
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              {/* 1. Tổng được duyệt */}
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-tight">
                  <span>Duyệt {selectedYear}</span>
                  <span className="font-bold bg-slate-200/90 text-slate-700 px-1 py-0.2 rounded text-3xs">
                    100%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-tight mt-0.5 truncate">
                  {formatVND(approved)}
                </div>
              </div>

              {/* 2. Chi phí thực tế (Báo cáo MAX) */}
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 shadow-2xs">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-blue-700 font-semibold uppercase tracking-tight">
                  <span className="truncate">Thực Tế</span>
                  <span className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                    isSeparated ? 'bg-indigo-600' : 'bg-blue-600'
                  }`}>
                    {spentPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-blue-900 font-mono leading-tight mt-0.5 truncate">
                  {formatVND(reportActual)}
                </div>
              </div>

              {/* 3. Tổng còn lại */}
              <div
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border shadow-2xs ${
                  remaining >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold uppercase tracking-tight">
                  <span className={remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {remaining >= 0 ? 'Còn Lại' : 'Vượt'}
                  </span>
                  <span
                    className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                      remaining >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {remainingPercent.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-extrabold font-mono leading-tight mt-0.5 truncate ${
                    remaining >= 0 ? 'text-emerald-900' : 'text-rose-700'
                  }`}
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
                    : `Quy tắc MAX(Bravo, Nhập liệu) • Bravo: ${formatVND(bravoVal)}`}
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

            <div className="flex items-center gap-1.5 shrink-0">
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

          {/* Ledger Table: Sổ cái chi tiết các phiếu chi */}
          {/* USER SPECIFICATION:
              1. Cột 'Người thực hiện' di chuyển ra cuối, trước cột 'Điều chỉnh' (Thao tác)
                 -> Thứ tự: # | Ngày | Nội Dung Diễn Giải | Số Tiền (VNĐ) | Người Thực Hiện | Điều Chỉnh
              2. Bóp nhỏ tối giản các cột, có thể xuống dòng nếu cần (break-words, whitespace-normal, padding py-1 sm:py-1.5)
          */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {sortedTransactions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {searchTerm
                    ? 'Không tìm thấy phiếu chi nào khớp với từ khóa'
                    : `Chưa có phiếu chi nào phát sinh cho khoản mục này trong năm ${selectedYear}`}
                </p>
                <p className="text-3xs sm:text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
                  {searchTerm
                    ? 'Thử thay đổi từ khóa hoặc xóa tìm kiếm để xem tất cả phiếu chi.'
                    : 'Các khoản chi mới phát sinh trên Webhook hoặc form nhập liệu sẽ tự động xuất hiện tại đây.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-auto">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-20 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                    {/* 1. STT */}
                    <th className="py-0.5 px-0.5 w-5 sm:w-6 text-center leading-tight">#</th>
                    {/* 2. Ngày: dd/mm/yy không logo lịch, bóp siêu gọn */}
                    <th className="py-0.5 px-0.5 sm:px-1 w-12 sm:w-14 text-center whitespace-nowrap leading-tight">Ngày</th>
                    {/* 3. Nội dung diễn giải */}
                    <th className="py-0.5 px-0.5 sm:px-1 min-w-[95px] leading-tight">Nội Dung Diễn Giải</th>
                    {/* 4. Số tiền */}
                    <th className="py-0.5 px-0.5 sm:px-1 text-right w-18 sm:w-22 whitespace-nowrap leading-tight">Số Tiền (VNĐ)</th>
                    {/* 5. Người thực hiện */}
                    <th className="py-0.5 px-0.5 sm:px-1 w-16 sm:w-22 leading-tight">Người Thực Hiện</th>
                    {/* 6. Điều chỉnh */}
                    <th className="py-0.5 px-0.5 text-center w-8 sm:w-10 whitespace-nowrap leading-tight">Điều Chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sortedTransactions.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* 1. STT */}
                      <td className="py-0.5 px-0.5 text-center font-mono text-[9px] sm:text-[10px] text-slate-400 leading-tight">
                        {index + 1}
                      </td>

                      {/* 2. Ngày */}
                      <td className="py-0.5 px-0.5 sm:px-1 text-center whitespace-nowrap font-mono text-[9px] sm:text-xs text-slate-700 font-medium leading-tight">
                        {formatDate(item.date)}
                      </td>

                      {/* 3. Nội dung diễn giải */}
                      <td className="py-0.5 px-0.5 sm:px-1 text-slate-700 text-[9.5px] sm:text-xs break-words whitespace-normal leading-tight">
                        {item.notes}
                      </td>

                      {/* 4. Số tiền */}
                      <td className="py-0.5 px-0.5 sm:px-1 text-right whitespace-nowrap font-mono font-bold text-slate-900 text-[9.5px] sm:text-xs leading-tight">
                        {formatVND(item.amount)}
                      </td>

                      {/* 5. Người thực hiện */}
                      <td className="py-0.5 px-0.5 sm:px-1 text-slate-700 text-[9.5px] sm:text-xs break-words leading-tight">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-blue-100 text-blue-700 font-bold text-[7.5px] flex items-center justify-center shrink-0">
                            {String(item.employeeName || 'U').trim().charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium text-slate-800 leading-tight">
                            {item.employeeName || 'Chưa ghi nhận'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Điều chỉnh */}
                      <td className="py-0.5 px-0.5 text-center whitespace-nowrap leading-tight">
                        <div className="flex items-center justify-center gap-0.5">
                          {onUpdateTransaction && (
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-75 group-hover:opacity-100"
                              title="Chỉnh sửa phiếu này"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa phiếu chi "${item.notes}" (${formatVND(item.amount)})?`)) {
                                  onDeleteTransaction(item.id);
                                }
                              }}
                              className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-75 group-hover:opacity-100"
                              title="Xóa phiếu này"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Footer: Slim single-line footer */}
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 text-3xs sm:text-[11px] text-slate-500 shrink-0">
            <div className="truncate">
              Hiển thị <strong className="text-slate-800">{sortedTransactions.length}</strong> / <strong className="text-slate-800">{accountTransactions.length}</strong> phiếu{' '}
              {searchTerm && <span>(Khớp bộ lọc)</span>}
              {' • '}
              Tổng cộng:{' '}
              <strong className="text-blue-700 font-mono font-bold">
                {formatVND(currentTotalAmount)}
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
    </>
  );
}
