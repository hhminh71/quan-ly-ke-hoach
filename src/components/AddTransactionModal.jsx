import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  PlusCircle,
  Calendar,
  User,
  DollarSign,
  FileText,
  Search,
  Check,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import employeesList from '../data/employees.json';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

export default function AddTransactionModal({
  isOpen,
  onClose,
  onAddTransaction,
  budgets = [],
  transactions = [],
  selectedYear = '2026',
  defaultAccountCode = null,
}) {
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

  // Handle mobile Back button to close modal instead of exiting app
  useModalBackHandler(isOpen, onClose, 'add-transaction');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [errors, setErrors] = useState({});

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(getDefaultDate());
      setEmployeeName('');
      setAmount('');
      setNotes('');
      setErrors({});
      setAccountSearch('');
      setIsDropdownOpen(false);

      // Select default account if provided, or first budget account
      if (budgets.length > 0) {
        if (defaultAccountCode) {
          const match = budgets.find(
            (b) => String(b.code || '').trim() === String(defaultAccountCode).trim()
          );
          if (match) {
            setSelectedAccount(match);
          } else if (!selectedAccount) {
            setSelectedAccount(budgets[0]);
          }
        } else if (!selectedAccount) {
          setSelectedAccount(budgets[0]);
        }
      }
    }
  }, [isOpen, selectedYear, budgets, defaultAccountCode]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live actuals by account code
  const liveActualsByCode = useMemo(() => {
    const map = {};
    (transactions || []).forEach((t) => {
      if (t && t.accountCode) {
        const code = String(t.accountCode).trim();
        map[code] = (map[code] || 0) + (Number(t.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  // Helper to get approved budget
  const getItemApproved = (b) => {
    if (!b) return 0;
    if (b.yearlyApproved && selectedYear !== 'ALL' && b.yearlyApproved[selectedYear] !== undefined) {
      return Number(b.yearlyApproved[selectedYear]);
    }
    return Number(b.approvedAmount) || Number(b.approved) || 0;
  };

  // Enriched budgets with live remaining balance
  const enrichedBudgets = useMemo(() => {
    return budgets.map((b) => {
      const code = String(b.code || '').trim();
      const approved = getItemApproved(b);
      const spent = liveActualsByCode[code] || 0;
      const remaining = approved - spent;
      return {
        ...b,
        code,
        approved,
        spent,
        remaining,
      };
    });
  }, [budgets, liveActualsByCode, selectedYear]);

  // Filter accounts by search query (Accent-insensitive)
  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return enrichedBudgets;
    return enrichedBudgets.filter((b) =>
      matchesVietnameseSearch([b.code, b.name, b.group], accountSearch)
    );
  }, [enrichedBudgets, accountSearch]);

  // Selected account with stats
  const activeBudgetStats = useMemo(() => {
    if (!selectedAccount) return null;
    const found = enrichedBudgets.find((b) => b.code === selectedAccount.code);
    return found || selectedAccount;
  }, [selectedAccount, enrichedBudgets]);

  const formatVND = (num) => {
    if (!num || isNaN(num)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));
  };

  const handleAddQuickAmount = (val) => {
    const current = Number(amount) || 0;
    setAmount(String(current + val));
  };

  // Suggested employees
  const suggestedEmployees = useMemo(() => {
    const list = Array.isArray(employeesList) ? employeesList.filter((e) => e && e.length > 1 && isNaN(e)) : [];
    return list.slice(0, 10);
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!selectedAccount) newErrors.accountCode = 'Vui lòng chọn mã khoản mục kế hoạch';
    if (!date) newErrors.date = 'Vui lòng chọn ngày chi';
    if (!employeeName.trim()) newErrors.employeeName = 'Vui lòng nhập tên người thực hiện / nhận';
    if (!amount || Number(amount) <= 0) newErrors.amount = 'Vui lòng nhập số tiền chi (> 0)';
    if (!notes.trim()) newErrors.notes = 'Vui lòng nhập nội dung diễn giải hạng mục';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const newRecord = {
      id: Date.now(),
      fiscalYear: (date && date.length >= 4) ? date.substring(0, 4) : selectedYear,
      accountCode: selectedAccount.code,
      category: selectedAccount.name,
      group: selectedAccount.group || 'Chi phí khác',
      date,
      employeeName: employeeName.trim(),
      amount: Number(amount),
      notes: notes.trim(),
      status: 'Đã thực hiện',
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    onAddTransaction(newRecord);
    onClose();
  };

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isOverBudget = activeBudgetStats && activeBudgetStats.remaining !== undefined && numAmount > activeBudgetStats.remaining;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-200">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Thêm Hạng Mục Mới</span>
                <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  Năm {selectedYear}
                </span>
              </h3>
              <p className="text-2xs text-blue-200">
                Tìm kiếm mã khoản mục và tạo hạng mục đồng bộ trực tiếp vào sổ cái & Google Sheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Field: Search & Select Khoản mục */}
          <div ref={dropdownRef} className="relative">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Mã Khoản Mục Kế Hoạch Ngân Sách <span className="text-rose-500">*</span>
              </span>
              {activeBudgetStats && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md font-mono ${
                    activeBudgetStats.remaining < 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  Còn lại: {formatVND(activeBudgetStats.remaining)}
                </span>
              )}
            </label>

            {/* Account Selector Button / Input */}
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                isDropdownOpen
                  ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              {selectedAccount ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                    {selectedAccount.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedAccount.name}
                    </p>
                    <p className="text-3xs text-slate-500 truncate">
                      Nhóm: {selectedAccount.group}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Chọn hoặc tìm kiếm mã khoản mục...</span>
              )}
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>

            {/* Search Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Gõ mã (627...) hoặc tên khoản mục để tìm..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Không tìm thấy khoản mục nào khớp với "{accountSearch}"
                    </div>
                  ) : (
                    filteredAccounts.map((item) => (
                      <div
                        key={item.code}
                        onClick={() => {
                          setSelectedAccount(item);
                          setIsDropdownOpen(false);
                          setAccountSearch('');
                        }}
                        className={`p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          selectedAccount?.code === item.code ? 'bg-blue-50/80' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="font-mono text-2xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.code}
                          </span>
                          <span className="font-medium text-slate-800 truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono text-2xs font-bold ${
                              item.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            Còn: {formatVND(item.remaining)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {errors.accountCode && <p className="text-rose-600 text-2xs mt-1">{errors.accountCode}</p>}
          </div>

          {/* Row 2: Date & Employee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Ngày Ghi Nhận <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono ${
                  errors.date ? 'border-rose-300' : 'border-slate-200'
                }`}
              />
              {errors.date && <p className="text-rose-600 text-2xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Người Thực Hiện / Thụ Hưởng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A..."
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                  errors.employeeName ? 'border-rose-300' : 'border-slate-200'
                }`}
              />
              {errors.employeeName && <p className="text-rose-600 text-2xs mt-1">{errors.employeeName}</p>}

              {/* Quick employee chips */}
              {suggestedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {suggestedEmployees.slice(0, 4).map((emp) => (
                    <button
                      key={emp}
                      type="button"
                      onClick={() => setEmployeeName(emp)}
                      className="text-3xs px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors"
                    >
                      {emp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Amount with Quick additions */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                Số Tiền Chi (VNĐ) <span className="text-rose-500">*</span>
              </span>
              {numAmount > 0 && (
                <span className="font-mono text-xs font-bold text-blue-700">
                  {formatVND(numAmount)}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Nhập số tiền..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                  errors.amount ? 'border-rose-300' : 'border-slate-200'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
              </span>
            </div>
            {errors.amount && <p className="text-rose-600 text-2xs mt-1">{errors.amount}</p>}

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-3xs text-slate-400 font-medium mr-1">Cộng nhanh:</span>
              {[500000, 1000000, 2000000, 5000000, 10000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddQuickAmount(val)}
                  className="px-2 py-0.5 rounded-lg text-3xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 transition-colors"
                >
                  +{val >= 1000000 ? `${val / 1000000}tr` : `${val / 1000}k`}
                </button>
              ))}
            </div>

            {/* Over-budget warning */}
            {isOverBudget && (
              <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-3xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Số tiền này vượt hạn mức khả dụng còn lại ({formatVND(activeBudgetStats.remaining)}) của khoản mục.
                </span>
              </div>
            )}
          </div>

          {/* Row 4: Notes / Content */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Nội Dung / Diễn Giải Hạng Mục <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              placeholder="VD: Chi thanh toán tiền bảo dưỡng máy tính, số hóa đơn 00123..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                errors.notes ? 'border-rose-300' : 'border-slate-200'
              }`}
            ></textarea>
            {errors.notes && <p className="text-rose-600 text-2xs mt-1">{errors.notes}</p>}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Ghi Nhận & Đồng Bộ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
