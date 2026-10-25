import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import employeesList from '../data/employees.json';

export default function TransactionList({
  transactions = [],
  budgets = [],
  onUpdateTransaction,
  onDeleteTransaction,
  selectedYear = '2026',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    accountCode: '',
    category: '',
    group: '',
    employeeName: '',
    amount: '',
    notes: '',
  });
  const [showEditToast, setShowEditToast] = useState(false);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Open Edit Modal
  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      date: item.date || '',
      accountCode: item.accountCode || (budgets[0]?.code || '62762101'),
      category: item.category || '',
      group: item.group || 'SỬA CHỮA THƯỜNG XUYÊN',
      employeeName: item.employeeName || '',
      amount: String(item.amount || 0),
      notes: item.notes || '',
    });
  };

  // When accountCode changes in Edit Modal, auto-update category & group
  const handleEditAccountChange = (code) => {
    const found = budgets.find((b) => b.code === code);
    setEditForm((prev) => ({
      ...prev,
      accountCode: code,
      category: found ? found.name : prev.category,
      group: found ? found.group : prev.group,
    }));
  };

  // Save Edit
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = {
      ...editingItem,
      date: editForm.date,
      accountCode: editForm.accountCode,
      category: editForm.category,
      group: editForm.group,
      employeeName: editForm.employeeName.trim(),
      amount: Number(editForm.amount) || 0,
      notes: editForm.notes.trim(),
    };

    if (onUpdateTransaction) {
      onUpdateTransaction(updated);
    }

    setEditingItem(null);
    setShowEditToast(true);
    setTimeout(() => setShowEditToast(false), 3000);
  };

  // Unique categories
  const categories = useMemo(() => {
    const map = new Map();
    transactions.forEach((t) => {
      const key = t.accountCode ? `[${t.accountCode}] ${t.category}` : t.category;
      if (key && !map.has(key)) {
        map.set(key, { code: t.accountCode, name: t.category, display: key });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [transactions]);

  // Filter logic
  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        (item.employeeName && item.employeeName.toLowerCase().includes(lowerSearch)) ||
        (item.notes && item.notes.toLowerCase().includes(lowerSearch)) ||
        (item.accountCode && item.accountCode.toLowerCase().includes(lowerSearch)) ||
        (item.category && item.category.toLowerCase().includes(lowerSearch));

      const matchesCategory =
        selectedCategory === 'ALL' ||
        item.accountCode === selectedCategory ||
        item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, selectedCategory]);

  // Sort logic
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'newest') {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return b.id - a.id;
      }
      if (sortOrder === 'oldest') {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.id - b.id;
      }
      if (sortOrder === 'highest') return (b.amount || 0) - (a.amount || 0);
      if (sortOrder === 'lowest') return (a.amount || 0) - (b.amount || 0);
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
          <span>Đã lưu chỉnh sửa & đồng bộ trực tiếp về Google Sheet!</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
              <h2 className="text-lg font-bold text-slate-800">
                Sổ Cái Chi Tiết Các Phiếu Chi{' '}
                <span className="text-emerald-700 font-extrabold">
                  ({selectedYear === 'ALL' ? 'Tất Cả Các Năm' : `Năm ${selectedYear}`})
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hiển thị {sorted.length.toLocaleString('vi-VN')} giao dịch phát sinh trong{' '}
              {selectedYear === 'ALL' ? 'toàn bộ lịch sử' : `năm tài chính ${selectedYear}`}
              {selectedCategory !== 'ALL' && (
                <span className="font-semibold text-blue-600 ml-1">
                  • Lọc theo khoản mục [{selectedCategory}]
                </span>
              )}
            </p>
          </div>

          {/* 3 KPI Summary Cards: Được duyệt, Phát sinh (tiền & %), Còn lại (tiền & %) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/90 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* 1. Tổng được duyệt */}
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Tổng được duyệt
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                  100%
                </span>
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono mt-0.5 truncate">
                {formatVND(budgetStats.approved)}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Hạn mức ngân sách</div>
            </div>

            {/* 2. Tổng phát sinh (số tiền và %) */}
            <div className="px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-200 shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                  Tổng phát sinh
                </span>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded-md">
                  {budgetStats.spentPercent.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-blue-900 font-mono mt-0.5 truncate">
                {formatVND(budgetStats.spent)}
              </div>
              <div className="text-[10px] text-blue-600 font-medium">Đã thực hiện</div>
            </div>

            {/* 3. Tổng còn lại (số tiền và %) */}
            <div
              className={`px-3 py-2 rounded-xl border shadow-2xs text-left ${
                budgetStats.remaining >= 0
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    budgetStats.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {budgetStats.remaining >= 0 ? 'Tổng còn lại' : 'Vượt định mức'}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md text-white ${
                    budgetStats.remaining >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {budgetStats.remainingPercent.toFixed(1)}%
                </span>
              </div>
              <div
                className={`text-xs sm:text-sm font-extrabold font-mono mt-0.5 truncate ${
                  budgetStats.remaining >= 0 ? 'text-emerald-900' : 'text-rose-700'
                }`}
              >
                {formatVND(budgetStats.remaining)}
              </div>
              <div
                className={`text-[10px] font-medium ${
                  budgetStats.remaining >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {budgetStats.remaining >= 0 ? 'Dự trữ khả dụng' : 'Cảnh báo vượt mức'}
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
          <div className="sm:col-span-5 relative">
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
          <div className="sm:col-span-4 relative">
            <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
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
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="highest">Số tiền cao nhất</option>
              <option value="lowest">Số tiền thấp nhất</option>
            </select>
          </div>
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
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Ngày</th>
                <th className="py-3 px-4">Khoản mục & Nhóm</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Số tiền (VNĐ)</th>
                <th className="py-3 px-4">Nội dung diễn giải</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Ngày */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </td>

                  {/* Khoản mục & Mã */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {item.accountCode && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.accountCode}
                        </span>
                      )}
                      <span className="font-semibold text-xs text-slate-800 max-w-[160px] truncate" title={item.category}>
                        {item.category}
                      </span>
                    </div>
                  </td>

                  {/* Người thực hiện */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {item.employeeName ? item.employeeName.charAt(0) : 'U'}
                      </div>
                      <span className="font-medium text-slate-700 text-xs">
                        {item.employeeName}
                      </span>
                    </div>
                  </td>

                  {/* Số tiền */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    {formatVND(item.amount)}
                  </td>

                  {/* Diễn giải */}
                  <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-600" title={item.notes}>
                    {item.notes}
                  </td>

                  {/* Thao tác: Chỉnh sửa & Xóa */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-70 group-hover:opacity-100"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chỉnh Sửa Phiếu Chi #{editingItem.id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sửa đổi sẽ tự động đồng bộ trực tiếp về Google Sheet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {/* Ngày */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày Giao Dịch
                </label>
                <input
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Mã Khoản Mục */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khoản Mục Ngân Sách
                </label>
                <select
                  value={editForm.accountCode}
                  onChange={(e) => handleEditAccountChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white cursor-pointer font-medium"
                >
                  {budgets.map((b) => (
                    <option key={b.code} value={b.code}>
                      [{b.code}] {b.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[10px] text-slate-500">
                  Nhóm: <strong className="text-slate-700">{editForm.group}</strong>
                </div>
              </div>

              {/* Người Thực Hiện */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người Thực Hiện
                </label>
                <input
                  type="text"
                  required
                  list="edit-employees-list"
                  value={editForm.employeeName}
                  onChange={(e) => setEditForm({ ...editForm, employeeName: e.target.value })}
                  placeholder="Nhập tên người thực hiện..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                />
                <datalist id="edit-employees-list">
                  {Array.isArray(employeesList) &&
                    employeesList
                      .filter((e) => e && isNaN(e))
                      .slice(0, 20)
                      .map((emp) => <option key={emp} value={emp} />)}
                </datalist>
              </div>

              {/* Số Tiền */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Tiền Thực Tế (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                />
                <div className="mt-1 text-[11px] font-mono text-blue-700 font-semibold">
                  {formatVND(editForm.amount)}
                </div>
              </div>

              {/* Ghi Chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội Dung Diễn Giải / Ghi Chú
                </label>
                <textarea
                  rows={2}
                  required
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Chi tiết công việc..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu & Đồng Bộ Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
