import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, User, DollarSign, FileText, PlusCircle, CheckCircle, RotateCcw, AlertTriangle, Layers } from 'lucide-react';
import employeesList from '../data/employees.json';

export default function TransactionForm({ onAddTransaction, budgets = [], transactions = [], selectedYear = '2026' }) {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const getDefaultDate = () => {
    const today = getTodayString();
    if (selectedYear && selectedYear !== 'ALL' && !today.startsWith(selectedYear)) {
      return `${selectedYear}-01-01`;
    }
    return today;
  };

  const [date, setDate] = useState(getDefaultDate);
  const [employeeName, setEmployeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [accountCode, setAccountCode] = useState(() => (budgets.length > 0 ? budgets[0].code : '62762101'));

  const [errors, setErrors] = useState({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Auto-sync date when selectedYear changes
  useEffect(() => {
    if (selectedYear && selectedYear !== 'ALL') {
      const today = getTodayString();
      if (today.startsWith(selectedYear)) {
        setDate(today);
      } else {
        setDate(`${selectedYear}-01-01`);
      }
    }
  }, [selectedYear]);

  // Compute live actual spent per account for this year's transactions
  const liveActualsByCode = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (t.accountCode) {
        map[t.accountCode] = (map[t.accountCode] || 0) + (Number(t.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  // Helper to get approved budget for any budget item in the selected year
  const getItemApproved = (b) => {
    if (!b) return 0;
    if (b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined) {
      return Number(b.yearlyApproved[selectedYear]);
    }
    return Number(b.approvedAmount) || Number(b.approved) || 0;
  };

  // Selected budget item details for selected year
  const selectedBudget = useMemo(() => {
    const found = budgets.find((b) => b.code === accountCode);
    if (!found) return null;
    const yearApproved = getItemApproved(found);
    const spent = liveActualsByCode[accountCode] || 0;
    const remaining = yearApproved - spent;

    return {
      ...found,
      approvedAmount: yearApproved,
      spentAmount: spent,
      remainingAmount: remaining,
    };
  }, [budgets, accountCode, selectedYear, liveActualsByCode]);

  // Suggested employees: take real employees from Excel
  const suggestedEmployees = useMemo(() => {
    const list = Array.isArray(employeesList) ? employeesList.filter((e) => e && e.length > 1 && isNaN(e)) : [];
    return list.slice(0, 15);
  }, []);

  // Quick amount additions
  const quickAmounts = [500000, 2000000, 5000000, 10000000];

  const handleAddQuickAmount = (val) => {
    const current = Number(amount) || 0;
    setAmount(String(current + val));
  };

  const formatVND = (num) => {
    if (!num || isNaN(num)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));
  };

  const validate = () => {
    const newErrors = {};
    if (!date) newErrors.date = 'Vui lòng chọn ngày giao dịch';
    if (!employeeName.trim()) newErrors.employeeName = 'Vui lòng nhập tên nhân viên';
    if (!amount || Number(amount) <= 0) newErrors.amount = 'Vui lòng nhập số tiền hợp lệ (> 0)';
    if (!notes.trim()) newErrors.notes = 'Vui lòng nhập ghi chú nội dung';
    if (!accountCode) newErrors.accountCode = 'Vui lòng chọn mã khoản mục kế hoạch';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const newRecord = {
      id: Date.now(),
      fiscalYear: (date && date.length >= 4) ? date.substring(0, 4) : selectedYear,
      accountCode,
      category: selectedBudget ? selectedBudget.name : 'Chi phí',
      group: selectedBudget ? selectedBudget.group : 'Chi phí khác',
      date,
      employeeName: employeeName.trim(),
      amount: Number(amount),
      notes: notes.trim(),
      status: 'Đã thực hiện',
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    onAddTransaction(newRecord);

    // Reset fields except date and accountCode
    setEmployeeName('');
    setAmount('');
    setNotes('');
    setErrors({});

    // Toast
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3500);
  };

  const handleReset = () => {
    setDate(getTodayString());
    setEmployeeName('');
    setAmount('');
    setNotes('');
    setErrors({});
  };

  // Check if amount exceeds remaining budget
  const numAmount = Number(amount) || 0;
  const isOverBudget = selectedBudget && selectedBudget.remainingAmount !== undefined && numAmount > selectedBudget.remainingAmount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400"></div>

      {/* Form Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
            <h2 className="text-lg font-bold text-slate-800">
              Biểu Mẫu Nhập Liệu Thu Chi{' '}
              <span className="text-blue-600 font-extrabold text-sm">
                ({selectedYear === 'ALL' ? 'Mọi Năm' : `Năm ${selectedYear}`})
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận phiếu chi thực tế gắn với Mã kế hoạch ngân sách (627x, 641x)
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Đặt lại biểu mẫu"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Success Notification Alert */}
      {showSuccessToast && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">
              Đã ghi nhận phiếu thu/chi thành công vào hệ thống!
            </span>
          </div>
          <span className="text-xs text-emerald-600 font-semibold cursor-pointer" onClick={() => setShowSuccessToast(false)}>
            Đóng
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Field: Mã Khoản Mục / Kế Hoạch */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Mã Kế Hoạch / Khoản Mục Chi Phí <span className="text-rose-500">*</span>
            </span>
            {selectedBudget && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                selectedBudget.remainingAmount < 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                Còn lại: {formatVND(selectedBudget.remainingAmount)}
              </span>
            )}
          </label>
          <select
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer font-medium"
          >
            {budgets.map((b) => {
              const itemApproved = getItemApproved(b);
              return (
                <option key={b.code} value={b.code}>
                  [{b.code}] {b.name} (Hạn mức: {formatVND(itemApproved)})
                </option>
              );
            })}
          </select>
          {selectedBudget && (
            <div className="mt-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <span>Nhóm: <strong className="text-slate-800">{selectedBudget.group}</strong></span>
              <span>Được duyệt {selectedYear !== 'ALL' ? `(${selectedYear})` : ''}: <strong className="text-slate-800">{formatVND(selectedBudget.approvedAmount)}</strong></span>
              <span>Đã chi: <strong className="text-slate-800">{formatVND(selectedBudget.spentAmount)}</strong></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Field 1: Ngày (Date) */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Ngày giao dịch <span className="text-rose-500">*</span>
              </span>
              <span
                onClick={() => setDate(getTodayString())}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Hôm nay
              </span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                  errors.date
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
                }`}
              />
            </div>
            {errors.date && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.date}</p>
            )}
          </div>

          {/* Field 2: Tên nhân viên (Employee Name) */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Người thực hiện <span className="text-rose-500">*</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="employee-suggestions"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Nhập hoặc chọn người phụ trách..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.employeeName
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
                }`}
              />
              <datalist id="employee-suggestions">
                {suggestedEmployees.map((emp) => (
                  <option key={emp} value={emp} />
                ))}
              </datalist>
            </div>
            {errors.employeeName ? (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.employeeName}</p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[11px] text-slate-400">Gợi ý nhanh:</span>
                {['Kiệt', 'Ẩn', 'Tân', 'Nhung', 'Thu Lan'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setEmployeeName(name)}
                    className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Field 3: Số tiền (Amount) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              Số tiền chi thực tế (VNĐ) <span className="text-rose-500">*</span>
            </span>
            {amount && !isNaN(amount) && Number(amount) > 0 && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {formatVND(amount)}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 15000000"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                errors.amount
                  ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
              }`}
            />
          </div>

          {/* Budget warning if over limit */}
          {isOverBudget && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Cảnh báo: Khoản chi này vượt quá ngân sách còn lại của hạng mục ({formatVND(selectedBudget?.remainingAmount)}).
              </span>
            </div>
          )}

          {errors.amount ? (
            <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.amount}</p>
          ) : (
            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
              <span className="text-[11px] text-slate-400">Cộng nhanh:</span>
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAddQuickAmount(q)}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors font-mono"
                >
                  +{(q / 1000000).toLocaleString()}M
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Field 4: Ghi chú (Notes) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Nội dung công việc / Diễn giải chi tiết <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Mua vật tư thay thế thiết bị điện, số hóa đơn VAT, vị trí thi công..."
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
              errors.notes
                ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
            }`}
          />
          {errors.notes && (
            <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.notes}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            Làm mới
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-medium shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lưu phiếu chi thực tế</span>
          </button>
        </div>
      </form>
    </div>
  );
}
