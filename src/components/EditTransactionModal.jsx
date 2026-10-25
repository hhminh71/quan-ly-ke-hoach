import React, { useState, useEffect } from 'react';
import { Edit3, X, Save, Calendar, Tag, DollarSign, User, FileText } from 'lucide-react';
import employeesList from '../data/employees.json';

export default function EditTransactionModal({
  isOpen,
  transaction,
  budgets = [],
  onClose,
  onSave,
}) {
  const [editForm, setEditForm] = useState({
    date: '',
    accountCode: '',
    category: '',
    group: '',
    employeeName: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    if (transaction) {
      setEditForm({
        date: transaction.date || '',
        accountCode: transaction.accountCode || (budgets[0]?.code || '62762101'),
        category: transaction.category || '',
        group: transaction.group || 'SỬA CHỮA THƯỜNG XUYÊN',
        employeeName: transaction.employeeName || '',
        amount: String(transaction.amount || 0),
        notes: transaction.notes || '',
      });
    }
  }, [transaction, budgets]);

  if (!isOpen || !transaction) return null;

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num) || 0);
  };

  const handleEditAccountChange = (code) => {
    const found = budgets.find((b) => b.code === code);
    setEditForm((prev) => ({
      ...prev,
      accountCode: code,
      category: found ? found.name : prev.category,
      group: found ? found.group : prev.group,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = {
      ...transaction,
      date: editForm.date,
      accountCode: editForm.accountCode,
      category: editForm.category,
      group: editForm.group,
      employeeName: editForm.employeeName.trim(),
      amount: Number(editForm.amount) || 0,
      notes: editForm.notes.trim(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Chỉnh Sửa Phiếu Chi #{transaction.id}
              </h3>
              <p className="text-[11px] text-slate-500">
                Sửa đổi sẽ tự động đồng bộ trực tiếp về Google Sheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Ngày */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ngày Giao Dịch</span>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Khoản Mục Ngân Sách</span>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Người Thực Hiện</span>
            </label>
            <input
              type="text"
              required
              list="edit-employees-list-modal"
              value={editForm.employeeName}
              onChange={(e) => setEditForm({ ...editForm, employeeName: e.target.value })}
              placeholder="Nhập tên người thực hiện..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
            />
            <datalist id="edit-employees-list-modal">
              {Array.isArray(employeesList) &&
                employeesList
                  .filter((e) => e && isNaN(e))
                  .slice(0, 30)
                  .map((emp) => <option key={emp} value={emp} />)}
            </datalist>
          </div>

          {/* Số Tiền */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Số Tiền Thực Tế (VNĐ)</span>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Nội Dung Diễn Giải / Ghi Chú</span>
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
              onClick={onClose}
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
  );
}
