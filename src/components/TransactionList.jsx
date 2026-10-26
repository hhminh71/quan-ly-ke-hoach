import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Trash2,
  Calendar,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import AddTransactionModal from './AddTransactionModal';

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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Add & Edit Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditToast, setShowEditToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Sync selectedCategory when prop changes
  useEffect(() => {
    if (selectedCategoryProp !== undefined) {
      setSelectedCategory(selectedCategoryProp);
      setCurrentPage(1);
    }
  }, [selectedCategoryProp]);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
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
    const lowerSearch = String(searchTerm || '').toLowerCase().trim();
    const catFilter = String(selectedCategory || 'ALL').trim();

    return (transactions || []).filter((item) => {
      if (!item) return false;
      const emp = String(item.employeeName || '').toLowerCase();
      const notes = String(item.notes || '').toLowerCase();
      const acc = String(item.accountCode || '').toLowerCase();
      const cat = String(item.category || '').toLowerCase();

      const matchesSearch =
        !lowerSearch ||
        emp.includes(lowerSearch) ||
        notes.includes(lowerSearch) ||
        acc.includes(lowerSearch) ||
        cat.includes(lowerSearch);

      const itemAcc = String(item.accountCode || '').trim();
      const itemCat = String(item.category || '').trim();

      const matchesCategory =
        catFilter === 'ALL' ||
        itemAcc === catFilter ||
        itemCat === catFilter;

      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, selectedCategory]);

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

  const totalFilteredAmount = useMemo(() => {
    return sorted.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [sorted]);

  // Calculation for: Tổng được duyệt, Tổng phát sinh (số tiền và %), Tổng còn lại (số tiền và %)
  const budgetStats = useMemo(() => {
    let approved = 0;
    if (selectedCategory === 'ALL') {
      approved = budgets.reduce((sum, b) => {
        const val =
          b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined
            ? Number(b.yearlyApproved[selectedYear])
            : Number(b.approvedAmount) || Number(b.approved) || 0;
        return sum + val;
      }, 0);
    } else {
      const found = budgets.find((b) => b.code === selectedCategory || b.name === selectedCategory);
      if (found) {
        approved =
          found.yearlyApproved && selectedYear !== 'ALL' && found.yearlyApproved[selectedYear] !== undefined
            ? Number(found.yearlyApproved[selectedYear])
            : Number(found.approvedAmount) || Number(found.approved) || 0;
      }
    }

    const spent = totalFilteredAmount;
    const spentPercent = approved > 0 ? (spent / approved) * 100 : 0;
    const remaining = approved - spent;
    const remainingPercent = approved > 0 ? (remaining / approved) * 100 : 0;

    return {
      approved,
      spent,
      spentPercent,
      remaining,
      remainingPercent,
    };
  }, [budgets, selectedCategory, selectedYear, totalFilteredAmount]);

  // Pagination calculation
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden relative">
      {/* Toast Notification when saved & synced */}
      {showEditToast && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage || 'Đã lưu chỉnh sửa & đồng bộ trực tiếp về Google Sheet!'}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="p-3 sm:p-6 border-b border-slate-100 space-y-2.5 sm:space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 ring-2 sm:ring-4 ring-emerald-100"></span>
              <h2 className="text-sm sm:text-lg font-bold text-slate-800">
                Sổ Cái Chi Tiết Các Phiếu Chi{' '}
                <span className="text-emerald-700 font-extrabold">
                  ({selectedYear === 'ALL' ? 'Tất Cả' : `Năm ${selectedYear}`})
                </span>
              </h2>

              {onAddTransaction && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-2xs sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
                  title="Thêm mới phiếu chi và đồng bộ trực tiếp lên Google Sheet"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Thêm Phiếu Chi</span>
                </button>
              )}
            </div>
            <p className="text-3xs sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
              Hiển thị {sorted.length.toLocaleString('vi-VN')} giao dịch phát sinh trong{' '}
              {selectedYear === 'ALL' ? 'toàn bộ lịch sử' : `năm tài chính ${selectedYear}`}
              {selectedCategory !== 'ALL' && (
                <span className="font-semibold text-blue-600 ml-1">
                  • Lọc [{selectedCategory}]
                </span>
              )}
            </p>
          </div>

          {/* 3 KPI Summary Cards: Được duyệt, Phát sinh (tiền & %), Còn lại (tiền & %) */}
          <div className="grid grid-cols-3 gap-1 sm:gap-3 bg-slate-50/90 p-1 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* 1. Tổng được duyệt */}
            <div className="px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-white border border-slate-200/70 shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-3xs sm:text-[10px] font-semibold text-slate-500 uppercase tracking-tight sm:tracking-wide">
                  Được duyệt
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                  100%
                </span>
              </div>
              <div className="text-[11px] sm:text-sm font-extrabold text-slate-800 font-mono mt-0.5 truncate" title={formatVND(budgetStats.approved)}>
                {formatVND(budgetStats.approved)}
              </div>
              <div className="text-3xs sm:text-[10px] text-slate-400 font-medium hidden sm:block">Hạn mức ngân sách</div>
            </div>

            {/* 2. Tổng phát sinh (số tiền và %) */}
            <div className="px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-blue-50/80 border border-blue-200 shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-3xs sm:text-[10px] font-semibold text-blue-700 uppercase tracking-tight sm:tracking-wide">
                  Phát sinh
                </span>
                <span className="text-3xs sm:text-[10px] font-bold bg-blue-600 text-white px-1 py-0.2 rounded">
                  {budgetStats.spentPercent.toFixed(1)}%
                </span>
              </div>
              <div className="text-[11px] sm:text-sm font-extrabold text-blue-900 font-mono mt-0.5 truncate" title={formatVND(budgetStats.spent)}>
                {formatVND(budgetStats.spent)}
              </div>
              <div className="text-3xs sm:text-[10px] text-blue-600 font-medium hidden sm:block">Đã thực hiện</div>
            </div>

            {/* 3. Tổng còn lại (số tiền và %) */}
            <div
              className={`px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border shadow-2xs text-left ${
                budgetStats.remaining >= 0
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-3xs sm:text-[10px] font-semibold uppercase tracking-tight sm:tracking-wide truncate ${
                    budgetStats.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {budgetStats.remaining >= 0 ? 'Còn lại' : 'Vượt'}
                </span>
                <span
                  className={`text-3xs sm:text-[10px] font-bold px-1 py-0.2 rounded text-white ${
                    budgetStats.remaining >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {budgetStats.remainingPercent.toFixed(1)}%
                </span>
              </div>
              <div
                className={`text-[11px] sm:text-sm font-extrabold font-mono mt-0.5 truncate ${
                  budgetStats.remaining >= 0 ? 'text-emerald-900' : 'text-rose-700'
                }`}
                title={formatVND(budgetStats.remaining)}
              >
                {formatVND(budgetStats.remaining)}
              </div>
              <div
                className={`text-3xs sm:text-[10px] font-medium hidden sm:block ${
                  budgetStats.remaining >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {budgetStats.remaining >= 0 ? 'Dự trữ khả dụng' : 'Cảnh báo'}
              </div>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ trực quan */}
        {budgetStats.approved > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                budgetStats.spentPercent > 100
                  ? 'bg-rose-500'
                  : budgetStats.spentPercent > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(budgetStats.spentPercent, 100)}%` }}
            ></div>
          </div>
        )}

        {/* Search, Filter & Sort Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Search Input */}
          <div className={`${onAddTransaction ? 'sm:col-span-4' : 'sm:col-span-5'} relative`}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo nhân viên, nội dung, mã (627...)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className={`${onAddTransaction ? 'sm:col-span-3' : 'sm:col-span-4'} relative`}>
            <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                if (onSelectCategory) onSelectCategory(val);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer truncate"
            >
              <option value="ALL">Tất cả tài khoản ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.display} value={c.code || c.name}>
                  {c.display}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="sm:col-span-3 relative">
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer font-medium"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="account_asc">Mã khoản mục (627... tăng dần)</option>
              <option value="account_desc">Mã khoản mục (giảm dần)</option>
              <option value="highest">Số tiền cao nhất</option>
              <option value="lowest">Số tiền thấp nhất</option>
            </select>
          </div>

          {/* Quick Add Button */}
          {onAddTransaction && (
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all"
                title="Tạo phiếu chi mới theo mã khoản mục"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">Thêm Phiếu</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-sm font-medium text-slate-600">Không tìm thấy giao dịch phù hợp</p>
          <p className="text-xs text-slate-400 mt-1">
            Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="py-2.5 px-3 sm:py-3 sm:px-6 cursor-pointer hover:text-blue-600 transition-colors select-none"
                  title="Click để đổi thứ tự ngày"
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => setSortOrder(sortOrder === 'account_asc' ? 'account_desc' : 'account_asc')}
                  className="py-2.5 px-3 sm:py-3 sm:px-4 cursor-pointer hover:text-blue-600 transition-colors select-none"
                  title="Click để sort theo Mã khoản mục"
                >
                  <div className="flex items-center gap-1">
                    <span>Khoản mục & Nhóm</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 sm:py-3 sm:px-4">Người thực hiện</th>
                <th
                  onClick={() => setSortOrder(sortOrder === 'highest' ? 'lowest' : 'highest')}
                  className="py-2.5 px-3 sm:py-3 sm:px-4 text-right cursor-pointer hover:text-blue-600 transition-colors select-none"
                  title="Click để đổi thứ tự số tiền"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Số tiền (VNĐ)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 sm:py-3 sm:px-4">Nội dung diễn giải</th>
                <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Ngày */}
                  <td className="py-2 px-3 sm:py-3.5 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-700 font-medium text-2xs sm:text-xs">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </td>

                  {/* Khoản mục & Mã */}
                  <td className="py-2 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {item.accountCode && (
                        <span className="font-mono text-3xs sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.accountCode}
                        </span>
                      )}
                      <span className="font-semibold text-2xs sm:text-xs text-slate-800 max-w-[140px] sm:max-w-[160px] truncate" title={item.category}>
                        {item.category}
                      </span>
                    </div>
                  </td>

                  {/* Người thực hiện */}
                  <td className="py-2 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-3xs sm:text-[11px] flex items-center justify-center shrink-0">
                        {String(item.employeeName || 'U').trim().charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-slate-700 text-2xs sm:text-xs">
                        {item.employeeName || 'Chưa ghi nhận'}
                      </span>
                    </div>
                  </td>

                  {/* Số tiền */}
                  <td className="py-2 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-2xs sm:text-sm">
                    {formatVND(item.amount)}
                  </td>

                  {/* Diễn giải */}
                  <td className="py-2 px-3 sm:py-3.5 sm:px-4 max-w-xs truncate text-2xs sm:text-xs text-slate-600" title={item.notes}>
                    {item.notes}
                  </td>

                  {/* Thao tác: Chỉnh sửa & Xóa */}
                  <td className="py-2 px-3 sm:py-3.5 sm:px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-70 group-hover:opacity-100"
                        title="Chỉnh sửa nội dung phiếu này"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa phiếu "${item.notes}" không?`)) {
                            onDeleteTransaction(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100"
                        title="Xóa phiếu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Đang xem trang <strong className="text-slate-800">{currentPage}</strong> / <strong className="text-slate-800">{totalPages}</strong> (Mỗi trang {pageSize} dòng)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - 4 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white font-bold'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
          onAddTransaction={(newRec) => {
            if (onAddTransaction) {
              onAddTransaction(newRec);
            }
            setToastMessage('Đã thêm phiếu chi mới & đồng bộ trực tiếp về Google Sheet!');
            setShowEditToast(true);
            setTimeout(() => setShowEditToast(false), 3500);
          }}
        />
      )}
    </div>
  );
}
