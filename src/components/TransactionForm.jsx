import React, { useState } from 'react';
import { Calendar, User, DollarSign, FileText, PlusCircle, CheckCircle, RotateCcw } from 'lucide-react';

export default function TransactionForm({ onAddTransaction }) {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(getTodayString());
  const [employeeName, setEmployeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Chi phí vận hành');

  const [errors, setErrors] = useState({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Common employee suggestions
  const suggestedEmployees = [
    'Nguyễn Văn An',
    'Trần Thị Bích',
    'Lê Hoàng Nam',
    'Phạm Minh Tuấn',
    'Đỗ Hải Yến',
  ];

  // Quick amount additions
  const quickAmounts = [100000, 500000, 1000000, 5000000];

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const newRecord = {
      id: Date.now(),
      date,
      employeeName: employeeName.trim(),
      amount: Number(amount),
      notes: notes.trim(),
      category,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    onAddTransaction(newRecord);

    // Reset fields except date
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400"></div>

      {/* Form Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
            <h2 className="text-lg font-bold text-slate-800">Biểu Mẫu Nhập Liệu Thu Chi</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Nhập chi tiết các khoản chi, tạm ứng hoặc thanh toán nội bộ của nhân viên
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
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm flex items-center justify-between animate-fadeIn">
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
                Tên nhân viên <span className="text-rose-500">*</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="employee-suggestions"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Nhập hoặc chọn tên nhân viên..."
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
                <span className="text-[11px] text-slate-400">Gợi ý:</span>
                {suggestedEmployees.slice(0, 3).map((name) => (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Field 3: Số tiền (Amount) */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                Số tiền (VNĐ) <span className="text-rose-500">*</span>
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
                placeholder="Ví dụ: 500000"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.amount
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
                }`}
              />
            </div>
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
                    +{(q / 1000).toLocaleString()}k
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Additional Field: Danh mục phân loại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Danh mục phân loại
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="Chi phí vận hành">Chi phí vận hành</option>
              <option value="Công tác phí & Đi lại">Công tác phí & Đi lại</option>
              <option value="Tiếp khách đối tác">Tiếp khách đối tác</option>
              <option value="Văn phòng phẩm">Văn phòng phẩm</option>
              <option value="Thiết bị & Công cụ">Thiết bị & Công cụ</option>
              <option value="Khoản chi khác">Khoản chi khác</option>
            </select>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Giúp phân nhóm và lập báo cáo quản trị dễ dàng hơn
            </p>
          </div>
        </div>

        {/* Field 4: Ghi chú (Notes) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Ghi chú chi tiết <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nhập mục đích thanh toán, số hóa đơn (nếu có), hoặc chi tiết công việc..."
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
            <span>Lưu phiếu nhập liệu</span>
          </button>
        </div>
      </form>
    </div>
  );
}
