import React, { useState, useMemo } from 'react';
import { Search, Trash2, Calendar, ArrowUpDown, Filter, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export default function TransactionList({ transactions, onDeleteTransaction, selectedYear = '2026' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Tổng phát sinh lọc:</span>
            <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {formatVND(totalFilteredAmount)}
            </span>
          </div>
        </div>

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

                  {/* Thao tác */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
    </div>
  );
}
