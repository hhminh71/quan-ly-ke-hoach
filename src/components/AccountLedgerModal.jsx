import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Search,
  ArrowUpDown,
  Trash2,
  Edit3,
  FileSpreadsheet,
  ArrowUpRight,
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import { matchesVietnameseSearch } from '../utils/searchUtils';

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

  // 1. ALL hooks MUST be declared at the top unconditionally (React Rules of Hooks)
  const accountTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    const accCode = String(account.code || '').trim();
    const accName = String(account.name || '').trim();

    return (transactions || []).filter((t) => {
      if (!t) return false;
      const tCode = String(t.accountCode || '').trim();
      const tCat = String(t.category || '').trim();
      return (tCode && tCode === accCode) || (!tCode && tCat === accName);
    });
  }, [isOpen, transactions, account]);

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

  // 2. ONLY return early after ALL hooks have been executed
  if (!isOpen || !account) return null;

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num) || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
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
  const reportActual = Math.max(spent, bravoVal);
  const remaining =
    typeof account.liveRemaining === 'number' && !isNaN(account.liveRemaining)
      ? account.liveRemaining
      : approved - reportActual;
  const spentPercent = approved > 0 ? (reportActual / approved) * 100 : 0;
  const remainingPercent = approved > 0 ? (remaining / approved) * 100 : 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {account.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {account.name}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                    Năm {selectedYear}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-700">{account.scope || account.group}</span>
                  {' • '}
                  <span>
                    Tổng cộng <strong className="text-blue-700">{accountTransactions.length}</strong> phiếu chi phát sinh
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {onNavigateToLedger && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToLedger(account.code);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  title="Mở toàn màn hình trong tab Sổ Cái"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Mở Trong Tab Sổ Cái</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top KPI Bar (Prominent Approved, Spent, Remaining) */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Tổng được duyệt */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Tổng Được Duyệt
                  </span>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    100%
                  </span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono mt-1 truncate">
                  {formatVND(approved)}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Hạn mức năm {selectedYear}
                </div>
              </div>

              {/* 2. Chi phí thực tế (Báo cáo MAX) */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                    Chi Phí Thực Tế
                  </span>
                  <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                    {spentPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-blue-900 font-mono mt-1 truncate">
                  {formatVND(reportActual)}
                </div>
                <div className="text-[11px] text-blue-700 font-medium truncate">
                  {bravoVal > spent
                    ? `Theo Bravo (${formatVND(bravoVal)}) > Phiếu chi (${formatVND(spent)})`
                    : `${accountTransactions.length} phiếu chi (${formatVND(spent)})`}
                </div>
              </div>

              {/* 3. Tổng còn lại */}
              <div
                className={`p-3 rounded-xl border shadow-sm ${
                  remaining >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {remaining >= 0 ? 'Tổng Còn Lại' : 'Vượt Hạn Mức'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                      remaining >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {remainingPercent.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-base sm:text-lg font-extrabold font-mono mt-1 truncate ${
                    remaining >= 0 ? 'text-emerald-900' : 'text-rose-700'
                  }`}
                >
                  {formatVND(remaining)}
                </div>
                <div
                  className={`text-[11px] font-medium ${
                    remaining >= 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  {remaining >= 0 ? 'Dự trữ khả dụng' : 'Cảnh báo vượt định mức'}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            {approved > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
          </div>

          {/* Search & Sort Controls inside Modal */}
          <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm phiếu chi theo người thực hiện, nội dung diễn giải..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer font-medium"
                >
                  <option value="newest">Ngày mới nhất</option>
                  <option value="oldest">Ngày cũ nhất</option>
                  <option value="highest">Số tiền cao nhất</option>
                  <option value="lowest">Số tiền thấp nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ledger Table: Sổ cái chi tiết các phiếu chi */}
          <div className="overflow-y-auto flex-1">
            {sortedTransactions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchTerm
                    ? 'Không tìm thấy phiếu chi nào khớp với từ khóa'
                    : `Chưa có phiếu chi nào phát sinh cho khoản mục này trong năm ${selectedYear}`}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {searchTerm
                    ? 'Thử thay đổi từ khóa hoặc xóa tìm kiếm để xem tất cả phiếu chi.'
                    : 'Các khoản chi mới phát sinh trên Webhook hoặc form nhập liệu sẽ tự động xuất hiện tại đây.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-sm">
                  <tr className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-2 sm:py-2.5 sm:px-3 w-10 text-center">#</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-3 w-24 sm:w-28">Ngày</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-3 w-32 sm:w-40">Người Thực Hiện</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-3 text-right w-28 sm:w-36">Số Tiền (VNĐ)</th>
                    <th className="py-2 px-2 sm:py-2.5 sm:px-3 max-w-[180px] sm:max-w-xs">Nội Dung Diễn Giải</th>
                    <th className="py-2 px-1.5 sm:py-2.5 sm:px-2 text-right w-16">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sortedTransactions.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center font-mono text-[11px] text-slate-400">
                        {index + 1}
                      </td>

                      {/* Ngày */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 max-w-[120px] sm:max-w-[160px] truncate">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {String(item.employeeName || 'U').trim().charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium text-slate-800 truncate" title={item.employeeName}>
                            {item.employeeName || 'Chưa ghi nhận'}
                          </span>
                        </div>
                      </td>

                      {/* Số tiền */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        {formatVND(item.amount)}
                      </td>

                      {/* Nội dung diễn giải */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-slate-600 max-w-[180px] sm:max-w-xs truncate" title={item.notes}>
                        {item.notes}
                      </td>

                      {/* Thao tác: Chỉnh sửa & Xóa */}
                      <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {onUpdateTransaction && (
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-70 group-hover:opacity-100"
                              title="Chỉnh sửa phiếu này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100"
                              title="Xóa phiếu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Modal Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Hiển thị <strong className="text-slate-800">{sortedTransactions.length}</strong> / <strong className="text-slate-800">{accountTransactions.length}</strong> phiếu chi{' '}
              {searchTerm && <span>(Khớp bộ lọc)</span>}
              {' • '}
              Tổng tiền trang này:{' '}
              <strong className="text-blue-700 font-mono font-bold">
                {formatVND(currentTotalAmount)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
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
