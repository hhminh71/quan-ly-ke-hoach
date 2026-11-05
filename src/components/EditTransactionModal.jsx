import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Edit3, X, Save, Calendar, Tag, DollarSign, User, FileText, Calculator } from 'lucide-react';
import employeesList from '../data/employees.json';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { evaluateMathExpression } from '../utils/mathParser';

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
    remark: '',
    chuaBcms: false,
  });

  const prevIsOpenRef = useRef(false);
  const prevTxIdRef = useRef(null);

  // Chỉ nạp dữ liệu vào form DUY NHẤT một lần khi mở modal hoặc khi đổi sang xem phiếu khác.
  // Tuyệt đối không ghi đè form khi người dùng đang sửa.
  useEffect(() => {
    const isNewlyOpened = isOpen && !prevIsOpenRef.current;
    const isDifferentTx = transaction && transaction.id !== prevTxIdRef.current;

    if (isOpen && transaction && (isNewlyOpened || isDifferentTx)) {
      prevTxIdRef.current = transaction.id;
      setEditForm({
        date: String(transaction.date || '').trim(),
        accountCode: String(transaction.accountCode || (budgets[0]?.code || '62762101')).trim(),
        category: String(transaction.category || '').trim(),
        group: String(transaction.group || 'SỬA CHỮA THƯỜNG XUYÊN').trim(),
        employeeName: String(transaction.employeeName || '').trim(),
        amount: String(transaction.amount || 0),
        notes: String(transaction.notes || '').trim(),
        remark: String(transaction.remark || '').trim(),
        chuaBcms: Boolean(transaction.chuaBcms),
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, transaction?.id]);

  // Handle mobile Back button
  useModalBackHandler(isOpen && Boolean(transaction), onClose, 'edit-transaction');

  if (!isOpen || !transaction) return null;

  const formatVND = (num) => {
    return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
  };

  // Safe math evaluation for real-time calculations (+, -, *, /, (), %, 1.5tr, 500k)
  const mathResult = useMemo(() => {
    return evaluateMathExpression(editForm.amount);
  }, [editForm.amount]);

  const numAmount = mathResult.isValid ? (mathResult.value || 0) : (Number(editForm.amount) || 0);

  const handleResolveAmount = () => {
    if (mathResult.hasFormula && mathResult.isValid && mathResult.value !== null) {
      setEditForm((prev) => ({ ...prev, amount: String(mathResult.value) }));
    }
  };

  const handleAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (mathResult.hasFormula && mathResult.isValid) {
        e.preventDefault();
        setEditForm((prev) => ({ ...prev, amount: String(mathResult.value) }));
      }
    }
  };

  const handleInsertOperator = (op) => {
    if (op === '()') {
      setEditForm((prev) => {
        const trimmed = (prev.amount || '').trim();
        return { ...prev, amount: trimmed ? `(${trimmed})` : '()' };
      });
      return;
    }
    setEditForm((prev) => {
      const trimmed = (prev.amount || '').trim();
      return { ...prev, amount: !trimmed && op === '-' ? '-' : `${trimmed} ${op} ` };
    });
  };

  const handleEditAccountChange = (code) => {
    const found = budgets.find((b) => String(b.code || '').trim() === String(code).trim());
    setEditForm((prev) => ({
      ...prev,
      accountCode: code,
      category: found ? found.name : prev.category,
      group: found ? found.group : prev.group,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanDate = String(editForm.date || '').trim();
    const finalAmount = mathResult.isValid ? (mathResult.value || 0) : (Number(editForm.amount) || 0);

    const updated = {
      ...transaction,
      date: cleanDate,
      fiscalYear: cleanDate.length >= 4 ? cleanDate.substring(0, 4) : transaction.fiscalYear,
      accountCode: String(editForm.accountCode || '').trim(),
      category: String(editForm.category || '').trim(),
      group: String(editForm.group || '').trim(),
      employeeName: String(editForm.employeeName || '').trim(),
      amount: finalAmount,
      notes: String(editForm.notes || '').trim(),
      remark: String(editForm.remark || '').trim(),
      chuaBcms: Boolean(editForm.chuaBcms),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Chỉnh Sửa Hạng Mục #{transaction.id}
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

          {/* Số Tiền with Math Expression */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Số Tiền Thực Tế (VNĐ)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {mathResult.hasFormula ? (
                  mathResult.isValid ? (
                    <button
                      type="button"
                      onClick={handleResolveAmount}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                      title="Click để áp dụng kết quả tính"
                    >
                      <Calculator className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span>= {formatVND(mathResult.value)}</span>
                      <span className="text-3xs font-semibold underline ml-0.5">Áp dụng</span>
                    </button>
                  ) : (
                    <span className="text-3xs text-amber-600 italic flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                      <Calculator className="w-3 h-3 text-amber-500" />
                      <span>{mathResult.error || 'Đang tính...'}</span>
                    </span>
                  )
                ) : numAmount > 0 ? (
                  <span className="font-mono text-xs font-bold text-blue-700">
                    {formatVND(numAmount)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="text"
                placeholder="Nhập số tiền hoặc phép tính (+, -, *, /, (), 1.5tr, 500k)..."
                required
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                onKeyDown={handleAmountKeyDown}
                onBlur={handleResolveAmount}
                className={`w-full px-3 py-2 pr-16 text-xs font-mono font-bold text-slate-900 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                  mathResult.hasFormula && mathResult.isValid
                    ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20'
                    : 'border-slate-300 bg-white'
                }`}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {mathResult.hasFormula && mathResult.isValid && (
                  <button
                    type="button"
                    onClick={handleResolveAmount}
                    className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                    title="Nhấn để tự động tính kết quả"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-3xs font-bold text-slate-400 select-none">VNĐ</span>
              </div>
            </div>

            {/* Quick Math Operators */}
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-3xs text-slate-400 font-medium mr-0.5">Toán tử:</span>
              {[
                { label: '+', op: '+' },
                { label: '-', op: '-' },
                { label: '×', op: '*' },
                { label: '÷', op: '/' },
                { label: '( )', op: '()' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleInsertOperator(item.op)}
                  className="w-5.5 h-5 flex items-center justify-center rounded text-xs font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 border border-slate-200 transition-all active:scale-95 cursor-pointer select-none"
                  title={`Chèn toán tử ${item.label}`}
                >
                  {item.label}
                </button>
              ))}
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

          {/* Tùy chọn Chưa BCMS (Dự kiến) */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editForm.chuaBcms}
                onChange={(e) => setEditForm({ ...editForm, chuaBcms: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-amber-900 block leading-tight">
                  Chưa BCMS (Khoản dự kiến)
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5 leading-tight">
                  Khi check chọn: Khoản này sẽ <strong>không tính vào tổng thực tế</strong> (chỉ hiển thị khi bật "Tổng gồm dự kiến").
                </span>
              </div>
            </label>
          </div>

          {/* Ghi Chú Phụ / Bổ sung */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi Chú (Tùy chọn)</span>
            </label>
            <input
              type="text"
              value={editForm.remark}
              onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
              placeholder="VD: Chờ phê duyệt, đợt 2, hợp đồng số..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
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
