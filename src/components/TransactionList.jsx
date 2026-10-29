import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Trash2,
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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
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

      const matchesSearch = matchesVietnameseSearch(
        [item.employeeName, item.notes, item.accountCode, item.category],
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

          {/* 3 KPI Summary Cards: Ultra-slim horizontal tiles */}
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1 bg-slate-50/90 p-0.5 sm:p-1 rounded border border-slate-200/80 shadow-2xs">
            {/* 1. Tổng được duyệt */}
            <div className="px-1 py-0.5 rounded bg-white border border-slate-200/70 shadow-2xs text-left">
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] text-slate-500 font-semibold uppercase tracking-tight leading-none">
                <span>Được duyệt</span>
                <span className="hidden sm:inline-block font-bold text-slate-500 bg-slate-100 px-1 rounded text-3xs">
                  100%
                </span>
              </div>
              <div className="text-[9px] sm:text-xs font-extrabold text-slate-800 font-mono mt-0.5 truncate leading-tight" title={formatVND(budgetStats.approved)}>
                {formatVND(budgetStats.approved)}
              </div>
            </div>

            {/* 2. Tổng phát sinh (số tiền và %) */}
            <div className="px-1 py-0.5 rounded bg-blue-50/80 border border-blue-200 shadow-2xs text-left">
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] text-blue-700 font-semibold uppercase tracking-tight leading-none">
                <span>Phát sinh</span>
                <span className="text-[7px] sm:text-[8.5px] font-bold bg-blue-600 text-white px-0.5 rounded">
                  {budgetStats.spentPercent.toFixed(0)}%
                </span>
              </div>
              <div className="text-[9px] sm:text-xs font-extrabold text-blue-900 font-mono mt-0.5 truncate leading-tight" title={formatVND(budgetStats.spent)}>
                {formatVND(budgetStats.spent)}
              </div>
            </div>

            {/* 3. Tổng còn lại (số tiền và %) */}
            <div
              className={`px-1 py-0.5 rounded border shadow-2xs text-left ${
                budgetStats.remaining >= 0
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] font-semibold uppercase tracking-tight leading-none">
                <span className={budgetStats.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {budgetStats.remaining >= 0 ? 'Còn lại' : 'Vượt'}
                </span>
                <span
                  className={`text-[7px] sm:text-[8.5px] font-bold px-0.5 rounded text-white ${
                    budgetStats.remaining >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {budgetStats.remainingPercent.toFixed(0)}%
                </span>
              </div>
              <div
                className={`text-[9px] sm:text-xs font-extrabold font-mono mt-0.5 truncate leading-tight ${
                  budgetStats.remaining >= 0 ? 'text-emerald-900' : 'text-rose-700'
                }`}
                title={formatVND(budgetStats.remaining)}
              >
                {formatVND(budgetStats.remaining)}
              </div>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ trực quan siêu mảnh */}
        {budgetStats.approved > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
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

        {/* Search, Filter & Sort Bar: Ultra-slim 1-line controls */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-0.5 sm:gap-1.5 pt-0.5">
          {/* Search Input */}
          <div className="col-span-2 sm:col-span-5 relative">
            <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo nhân viên, nội dung, mã (627...)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-5 sm:h-6 pl-5 pr-1.5 py-0 text-[8px] sm:text-xs rounded border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-500 transition-all leading-tight"
            />
          </div>

          {/* Category Filter */}
          <div className="col-span-1 sm:col-span-4 relative">
            <Layers className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                if (onSelectCategory) onSelectCategory(val);
                setCurrentPage(1);
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

          {/* Sort Order */}
          <div className="col-span-1 sm:col-span-3 relative">
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
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-175px)] sm:max-h-[calc(100vh-210px)] relative">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
              <tr className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                {/* 1. Ngày: dd/mm/yy không icon, bóp siêu gọn */}
                <th
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="py-0.5 px-0.5 sm:px-1 w-12 sm:w-14 cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap text-center leading-tight"
                  title="Click để đổi thứ tự ngày"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Ngày</span>
                    <ArrowUpDown className="w-2 h-2 text-slate-400" />
                  </div>
                </th>

                {/* 2. Khoản mục & Nhóm */}
                <th
                  onClick={() => setSortOrder(sortOrder === 'account_asc' ? 'account_desc' : 'account_asc')}
                  className="py-0.5 px-0.5 sm:px-1 w-20 sm:w-28 cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap leading-tight"
                  title="Click để sort theo Mã khoản mục"
                >
                  <div className="flex items-center gap-0.5">
                    <span>Khoản mục</span>
                    <ArrowUpDown className="w-2 h-2 text-slate-400" />
                  </div>
                </th>

                {/* 3. Nội dung diễn giải */}
                <th className="py-0.5 px-0.5 sm:px-1 min-w-[95px] leading-tight">Nội dung diễn giải</th>

                {/* 4. Số tiền (VNĐ) */}
                <th
                  onClick={() => setSortOrder(sortOrder === 'highest' ? 'lowest' : 'highest')}
                  className="py-0.5 px-0.5 sm:px-1 text-right w-18 sm:w-22 cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap leading-tight"
                  title="Click để đổi thứ tự số tiền"
                >
                  <div className="flex items-center justify-end gap-0.5">
                    <span>Số tiền (VNĐ)</span>
                    <ArrowUpDown className="w-2 h-2 text-slate-400" />
                  </div>
                </th>

                {/* 5. Người thực hiện (di chuyển ra trước cột điều chỉnh, căn giữa và bỏ chữ cái viết tắt phía trước) */}
                <th className="py-0.5 px-0.5 sm:px-1 w-16 sm:w-22 text-center leading-tight">Người thực hiện</th>

                {/* 6. Điều chỉnh (Thao tác) */}
                <th className="py-0.5 px-0.5 text-center w-8 sm:w-10 whitespace-nowrap leading-tight">Điều chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* 1. Ngày: dd/mm/yy không logo lịch */}
                  <td className="py-0.5 px-0.5 sm:px-1 text-center whitespace-nowrap font-mono text-[9px] sm:text-xs text-slate-700 font-medium leading-tight">
                    {formatDate(item.date)}
                  </td>

                  {/* 2. Khoản mục & Mã */}
                  <td className="py-0.5 px-0.5 sm:px-1 whitespace-nowrap leading-tight">
                    <div className="flex items-center gap-0.5">
                      {item.accountCode && (
                        <span className="font-mono text-[8px] sm:text-[9.5px] font-bold px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.accountCode}
                        </span>
                      )}
                      <span className="font-semibold text-[9.5px] sm:text-xs text-slate-800 max-w-[95px] sm:max-w-[130px] truncate" title={item.category}>
                        {item.category}
                      </span>
                    </div>
                  </td>

                  {/* 3. Nội dung diễn giải */}
                  <td className="py-0.5 px-0.5 sm:px-1 text-[9.5px] sm:text-xs text-slate-700 break-words whitespace-normal leading-tight" title={item.notes}>
                    {item.notes}
                  </td>

                  {/* 4. Số tiền */}
                  <td className="py-0.5 px-0.5 sm:px-1 text-right whitespace-nowrap font-mono font-bold text-slate-900 text-[9.5px] sm:text-xs leading-tight">
                    {formatVND(item.amount)}
                  </td>

                  {/* 5. Người thực hiện: Căn giữa, bỏ chữ viết tắt phía trước */}
                  <td className="py-0.5 px-0.5 sm:px-1 text-[9.5px] sm:text-xs text-slate-700 text-center leading-tight">
                    <span className="font-medium text-slate-700 leading-tight">
                      {item.employeeName || 'Chưa ghi nhận'}
                    </span>
                  </td>

                  {/* 6. Điều chỉnh */}
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap leading-tight">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-75 group-hover:opacity-100"
                        title="Chỉnh sửa nội dung hạng mục này"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
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
