import React, { useState } from 'react';
import { Search, Trash2, Calendar, User, FileText, ArrowUpDown, Filter, Download } from 'lucide-react';

export default function TransactionList({ transactions, onDeleteTransaction }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Filter logic
  const filtered = transactions.filter((item) => {
    const matchesSearch =
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'newest') return b.id - a.id;
    if (sortOrder === 'oldest') return a.id - b.id;
    if (sortOrder === 'highest') return b.amount - a.amount;
    if (sortOrder === 'lowest') return a.amount - b.amount;
    return 0;
  });

  const totalFilteredAmount = sorted.reduce((sum, item) => sum + Number(item.amount), 0);

  // Category badge styles
  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'Chi phí vận hành':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Công tác phí & Đi lại':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Tiếp khách đối tác':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Văn phòng phẩm':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
              <h2 className="text-lg font-bold text-slate-800">Danh Sách Phiếu Đã Ghi Nhận</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hiển thị {sorted.length} / {transactions.length} giao dịch gần đây
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Tổng lọc:</span>
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
              placeholder="Tìm theo nhân viên, nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-4 relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục</option>
              <option value="Chi phí vận hành">Chi phí vận hành</option>
              <option value="Công tác phí & Đi lại">Công tác phí & Đi lại</option>
              <option value="Tiếp khách đối tác">Tiếp khách đối tác</option>
              <option value="Văn phòng phẩm">Văn phòng phẩm</option>
              <option value="Thiết bị & Công cụ">Thiết bị & Công cụ</option>
              <option value="Khoản chi khác">Khoản chi khác</option>
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

      {/* Table or Empty State */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
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
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Phân loại</th>
                <th className="py-3 px-4">Ghi chú</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {item.employeeName.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                        {item.employeeName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                    {formatVND(item.amount)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category || 'Chi phí'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-600" title={item.notes}>
                    {item.notes}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa phiếu của "${item.employeeName}" không?`)) {
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
    </div>
  );
}
