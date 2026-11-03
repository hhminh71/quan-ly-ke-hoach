import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Trash2,
  ArrowUpDown,
  Filter,
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
  Calculator,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import AddTransactionModal from './AddTransactionModal';
import { exportAccountLedgerExcel } from '../utils/excelExport';
import { useResizableColumns, ColumnResizeHandle, ColumnVisibilityDropdown } from '../hooks/useResizableColumns';
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
  // Multi-sort rules: Hỗ trợ sort cùng lúc nhiều cột (BCMS + Số tiền / Ghi chú / Khoản mục)
  const [sortRules, setSortRules] = useState([{ key: 'date', dir: 'desc' }]);
  const [bcmsFilter, setBcmsFilter] = useState('ALL'); // 'ALL' | 'DA_BCMS' | 'CHUA_BCMS'

  // Tùy chọn Ẩn/Hiện Tổng bao gồm dự kiến (Chưa BCMS)
  const [showExpectedTotal, setShowExpectedTotal] = useState(false);

  // Thống kê nhanh số lượng Đã BCMS / Chưa BCMS
  const totalTxPendingCount = useMemo(() => {
    return (transactions || []).filter((t) => t && t.chuaBcms).length;
  }, [transactions]);
  const totalTxDoneCount = (transactions || []).length - totalTxPendingCount;

  // Add & Edit Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditToast, setShowEditToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Resizable columns hook (drag handles + column visibility with localStorage persistence)
  const {
    columnWidths,
    handleResizeStart,
    resetColumnWidth,
    totalTableWidth,
    isColumnVisible,
    toggleColumnVisibility,
    showAllColumns,
  } = useResizableColumns({
    storageKey: 'tbl_cols_transactions_v6',
    initialWidths: {
      date: 72,
      chuaBcms: 46,
      account: 88,
      notes: 320,
      amount: 115,
      remark: 130,
      employee: 100,
      actions: 55,
    },
    minWidths: {
      date: 50,
      chuaBcms: 34,
      account: 65,
      notes: 90,
      amount: 105,
      remark: 65,
      employee: 60,
      actions: 45,
    },
  });

  const transactionTableColumns = useMemo(
    () => [
      { key: 'date', label: 'Ngày' },
      { key: 'chuaBcms', label: 'Chưa BCMS' },
      { key: 'account', label: 'Khoản mục' },
      { key: 'notes', label: 'Nội dung diễn giải' },
      { key: 'amount', label: 'Số tiền (VNĐ)' },
      { key: 'remark', label: 'Ghi chú' },
      { key: 'employee', label: 'Người thực hiện' },
      { key: 'actions', label: 'Điều chỉnh' },
    ],
    []
  );

  // Sync selectedCategory when prop changes
  useEffect(() => {
    if (selectedCategoryProp !== undefined) {
      setSelectedCategory(selectedCategoryProp);
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
    return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
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

      // 1. Lọc theo trạng thái BCMS
      if (bcmsFilter === 'CHUA_BCMS' && !item.chuaBcms) return false;
      if (bcmsFilter === 'DA_BCMS' && item.chuaBcms) return false;

      const matchesSearch = matchesVietnameseSearch(
        [item.employeeName, item.notes, item.accountCode, item.category, item.remark],
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
  }, [transactions, searchTerm, selectedCategory, bcmsFilter]);

  // Multi-sort comparator logic (hỗ trợ sort cùng lúc BCMS + Số tiền / Ghi chú / Khoản mục)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      for (const rule of sortRules) {
        const { key, dir } = rule;
        let cmp = 0;

        if (key === 'chuaBcms') {
          const valA = a.chuaBcms ? 1 : 0;
          const valB = b.chuaBcms ? 1 : 0;
          cmp = dir === 'desc' ? valB - valA : valA - valB;
        } else if (key === 'amount') {
          const numA = Number(a.amount) || 0;
          const numB = Number(b.amount) || 0;
          cmp = dir === 'desc' ? numB - numA : numA - numB;
        } else if (key === 'remark') {
          const strA = String(a.remark || '').trim();
          const strB = String(b.remark || '').trim();
          if (!strA && strB) {
            cmp = 1;
          } else if (strA && !strB) {
            cmp = -1;
          } else if (strA && strB) {
            cmp = dir === 'desc'
              ? strB.localeCompare(strA, 'vi', { sensitivity: 'base' })
              : strA.localeCompare(strB, 'vi', { sensitivity: 'base' });
          }
        } else if (key === 'date') {
          const dateA = String(a.date || '');
          const dateB = String(b.date || '');
          cmp = dir === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
        } else if (key === 'account') {
          const codeA = String(a.accountCode || '');
          const codeB = String(b.accountCode || '');
          cmp = dir === 'desc' ? codeB.localeCompare(codeA) : codeA.localeCompare(codeB);
        } else if (key === 'notes') {
          const notesA = String(a.notes || '');
          const notesB = String(b.notes || '');
          cmp = dir === 'desc'
            ? notesB.localeCompare(notesA, 'vi', { sensitivity: 'base' })
            : notesA.localeCompare(notesB, 'vi', { sensitivity: 'base' });
        }

        if (cmp !== 0) return cmp;
      }

      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [filtered, sortRules]);

  // Click vào tiêu đề cột để sắp xếp (tự động kết hợp BCMS với các cột khác)
  const handleColumnSort = (key, e) => {
    const isMultiKey = e && (e.shiftKey || e.ctrlKey || e.metaKey);

    setSortRules((prevRules) => {
      const existingIdx = prevRules.findIndex((r) => r.key === key);
      let newDir = key === 'remark' || key === 'notes' || key === 'account' ? 'asc' : 'desc';
      if (existingIdx >= 0) {
        const currentDir = prevRules[existingIdx].dir;
        newDir = currentDir === 'desc' ? 'asc' : null;
      }

      // Giữ Shift/Ctrl để kết hợp tùy ý
      if (isMultiKey) {
        if (newDir === null) {
          const next = prevRules.filter((r) => r.key !== key);
          return next.length > 0 ? next : [{ key: 'date', dir: 'desc' }];
        }
        if (existingIdx >= 0) {
          return prevRules.map((r, i) => (i === existingIdx ? { key, dir: newDir } : r));
        }
        return [...prevRules, { key, dir: newDir }];
      }

      // Click bình thường (tự động kết hợp thông minh cùng BCMS):
      if (key === 'chuaBcms') {
        if (newDir === null) {
          const otherRules = prevRules.filter((r) => r.key !== 'chuaBcms');
          return otherRules.length > 0 ? otherRules : [{ key: 'date', dir: 'desc' }];
        }
        const secondary = prevRules.find((r) => r.key !== 'chuaBcms') || { key: 'amount', dir: 'desc' };
        return [{ key: 'chuaBcms', dir: newDir }, secondary];
      }

      // Khi click vào cột khác (Số tiền, Ghi chú, Khoản mục, Ngày):
      const bcmsRule = prevRules.find((r) => r.key === 'chuaBcms');
      if (bcmsRule) {
        if (newDir === null) {
          return [bcmsRule, { key: 'date', dir: 'desc' }];
        }
        return [bcmsRule, { key, dir: newDir }];
      }

      if (newDir === null) {
        return [{ key: 'date', dir: 'desc' }];
      }
      return [{ key, dir: newDir }];
    });
  };

  const getSortDropdownValue = () => {
    const hasBcms = sortRules.find((r) => r.key === 'chuaBcms');
    const amountRule = sortRules.find((r) => r.key === 'amount');
    const remarkRule = sortRules.find((r) => r.key === 'remark');
    const accountRule = sortRules.find((r) => r.key === 'account');
    const dateRule = sortRules.find((r) => r.key === 'date');

    if (hasBcms && hasBcms.dir === 'desc') {
      if (amountRule && amountRule.dir === 'desc') return 'bcms_amount_desc';
      if (amountRule && amountRule.dir === 'asc') return 'bcms_amount_asc';
      if (remarkRule && remarkRule.dir === 'asc') return 'bcms_remark_asc';
      if (remarkRule && remarkRule.dir === 'desc') return 'bcms_remark_desc';
      if (accountRule && accountRule.dir === 'asc') return 'bcms_account_asc';
      if (dateRule && dateRule.dir === 'desc') return 'bcms_date_desc';
      return 'bcms_amount_desc';
    }

    if (amountRule && !hasBcms) {
      return amountRule.dir === 'desc' ? 'amount_desc' : 'amount_asc';
    }
    if (remarkRule && !hasBcms) {
      return remarkRule.dir === 'desc' ? 'remark_desc' : 'remark_asc';
    }
    if (accountRule && !hasBcms) {
      return accountRule.dir === 'desc' ? 'account_desc' : 'account_asc';
    }
    if (dateRule && !hasBcms) {
      return dateRule.dir === 'asc' ? 'oldest' : 'newest';
    }

    return 'custom';
  };

  const handleDropdownSortChange = (val) => {
    switch (val) {
      case 'bcms_amount_desc':
        setSortRules([{ key: 'chuaBcms', dir: 'desc' }, { key: 'amount', dir: 'desc' }]);
        break;
      case 'bcms_amount_asc':
        setSortRules([{ key: 'chuaBcms', dir: 'desc' }, { key: 'amount', dir: 'asc' }]);
        break;
      case 'bcms_remark_asc':
        setSortRules([{ key: 'chuaBcms', dir: 'desc' }, { key: 'remark', dir: 'asc' }]);
        break;
      case 'bcms_remark_desc':
        setSortRules([{ key: 'chuaBcms', dir: 'desc' }, { key: 'remark', dir: 'desc' }]);
        break;
      case 'bcms_account_asc':
        setSortRules([{ key: 'chuaBcms', dir: 'desc' }, { key: 'account', dir: 'asc' }]);
        break;
      case 'bcms_date_desc':
        setSortRules([{ key: 'chuaBcms', dir: 'desc' }, { key: 'date', dir: 'desc' }]);
        break;
      case 'amount_desc':
        setSortRules([{ key: 'amount', dir: 'desc' }]);
        break;
      case 'amount_asc':
        setSortRules([{ key: 'amount', dir: 'asc' }]);
        break;
      case 'remark_asc':
        setSortRules([{ key: 'remark', dir: 'asc' }]);
        break;
      case 'remark_desc':
        setSortRules([{ key: 'remark', dir: 'desc' }]);
        break;
      case 'account_asc':
        setSortRules([{ key: 'account', dir: 'asc' }]);
        break;
      case 'account_desc':
        setSortRules([{ key: 'account', dir: 'desc' }]);
        break;
      case 'oldest':
        setSortRules([{ key: 'date', dir: 'asc' }]);
        break;
      case 'newest':
      default:
        setSortRules([{ key: 'date', dir: 'desc' }]);
        break;
    }
  };

  const renderSortIndicator = (colKey) => {
    const ruleIdx = sortRules.findIndex((r) => r.key === colKey);
    const isActive = ruleIdx >= 0;
    const dir = isActive ? sortRules[ruleIdx].dir : null;
    const isMulti = sortRules.length > 1;

    return (
      <span className="inline-flex items-center gap-0.5 ml-0.5 select-none shrink-0">
        {isActive ? (
          <>
            {dir === 'desc' ? (
              <span className={`text-[8.5px] sm:text-[9.5px] font-black ${colKey === 'chuaBcms' ? 'text-amber-600' : 'text-blue-600'}`}>
                ▼
              </span>
            ) : (
              <span className={`text-[8.5px] sm:text-[9.5px] font-black ${colKey === 'chuaBcms' ? 'text-amber-600' : 'text-blue-600'}`}>
                ▲
              </span>
            )}
            {isMulti && (
              <span
                className={`w-3 h-3 rounded-full text-[6.5px] sm:text-[7.5px] font-black flex items-center justify-center leading-none text-white shadow-2xs ${
                  colKey === 'chuaBcms' ? 'bg-amber-600' : 'bg-blue-600'
                }`}
                title={`Ưu tiên sắp xếp thứ ${ruleIdx + 1}`}
              >
                {ruleIdx + 1}
              </span>
            )}
          </>
        ) : (
          <ArrowUpDown className="w-2 h-2 text-slate-300 opacity-60 hover:opacity-100" />
        )}
      </span>
    );
  };

  // Auto-sum amount of filtered transactions:
  // 1. Tổng thực tế đã BCMS (loại trừ các khoản đã check Chưa BCMS)
  const totalActualAmount = useMemo(() => {
    return sorted
      .filter((item) => !item.chuaBcms)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [sorted]);

  // 2. Tổng bao gồm cả dự kiến Chưa BCMS
  const totalExpectedAmount = useMemo(() => {
    return sorted.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [sorted]);

  const pendingBcmsCount = useMemo(() => {
    return sorted.filter((item) => item.chuaBcms).length;
  }, [sorted]);

  const pendingBcmsAmount = totalExpectedAmount - totalActualAmount;

  // Tổng số tiền đang hiển thị (phụ thuộc vào showExpectedTotal)
  const totalFilteredAmount = showExpectedTotal ? totalExpectedAmount : totalActualAmount;

  // Auto-count unique descriptions of filtered transactions
  const uniqueNotesCount = useMemo(() => {
    const set = new Set();
    sorted.forEach((item) => {
      const n = String(item.notes || '').trim();
      if (n) set.add(n);
    });
    return set.size;
  }, [sorted]);

  const handleExportSingleAccount = () => {
    if (!activeFilteredAccountCode) return;
    const targetBudget = (budgets || []).find(
      (b) => String(b.code || '').trim() === activeFilteredAccountCode
    ) || {
      code: activeFilteredAccountCode,
      name: `Khoản mục ${activeFilteredAccountCode}`,
    };
    const approved = Number(
      targetBudget.selectedYearApproved !== undefined
        ? targetBudget.selectedYearApproved
        : targetBudget.approved !== undefined
        ? targetBudget.approved
        : (targetBudget.yearlyApproved && selectedYear !== 'ALL' && targetBudget.yearlyApproved[selectedYear] !== undefined)
        ? targetBudget.yearlyApproved[selectedYear]
        : targetBudget.approvedAmount || 0
    );
    const bravoVal = Number(
      targetBudget.bravoVal !== undefined
        ? targetBudget.bravoVal
        : targetBudget.bravoActual !== undefined
        ? targetBudget.bravoActual
        : targetBudget.bravoAmount || 0
    );
    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('demo_user'));
      } catch {
        return null;
      }
    })();

    exportAccountLedgerExcel({
      account: targetBudget,
      transactions: sorted,
      selectedYear,
      approved,
      bravoVal,
      spent: totalFilteredAmount,
      reportActual: Math.max(totalFilteredAmount, bravoVal),
      remaining: approved - Math.max(totalFilteredAmount, bravoVal),
      isSeparated: false,
      user: currentUser,
      showExpectedTotal,
    });
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

              <div className="flex items-center gap-1">
                {/* Tùy chọn Ẩn/Hiện Tổng bao gồm dự kiến (Chưa BCMS) */}
                <button
                  type="button"
                  onClick={() => setShowExpectedTotal((prev) => !prev)}
                  className={`h-5 sm:h-6 px-1.5 py-0 rounded text-[7.5px] sm:text-[9px] font-bold transition-all cursor-pointer leading-tight inline-flex items-center gap-1 ${
                    showExpectedTotal
                      ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-400/50'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Ẩn/Hiện tổng chi phí bao gồm cả các hạng mục Chưa BCMS (dự kiến)"
                >
                  {showExpectedTotal ? (
                    <Eye className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                  )}
                  <span>{showExpectedTotal ? 'Gồm Dự Kiến' : 'Chỉ Đã BCMS'}</span>
                  {pendingBcmsCount > 0 && (
                    <span
                      className={`px-1 rounded-full text-[7px] font-bold ${
                        showExpectedTotal ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pendingBcmsCount}
                    </span>
                  )}
                </button>

                <ColumnVisibilityDropdown
                  columns={transactionTableColumns}
                  isColumnVisible={isColumnVisible}
                  onToggleColumn={toggleColumnVisibility}
                  onShowAll={showAllColumns}
                />

                {activeFilteredAccountCode && (
                  <button
                    type="button"
                    onClick={handleExportSingleAccount}
                    className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-[8px] sm:text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-2xs border border-amber-300 transition-all active:scale-95 cursor-pointer"
                    title={`Xuất file Excel báo cáo chi tiết cho riêng mã [${activeFilteredAccountCode}]`}
                  >
                    <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                    <span className="hidden sm:inline">Xuất Báo Cáo [{activeFilteredAccountCode}]</span>
                    <span className="sm:hidden">Xuất [{activeFilteredAccountCode}]</span>
                  </button>
                )}

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

          {/* 2 Filter Summary Cards: Auto-count Notes & Auto-sum Amount */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 bg-slate-50/90 p-0.5 sm:p-1 rounded-lg border border-slate-200/80 shadow-2xs">
            {/* 1. Tự đếm nội dung diễn giải */}
            <div className="px-1.5 py-0.5 sm:py-1 rounded bg-white border border-slate-200 shadow-2xs text-left">
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] text-slate-500 font-semibold uppercase tracking-tight leading-none gap-1">
                <span className="flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span>Diễn giải</span>
                </span>
                <span className="text-[7px] sm:text-[8.5px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-100">
                  {uniqueNotesCount} nội dung
                </span>
              </div>
              <div className="text-[9.5px] sm:text-xs font-extrabold text-slate-800 mt-0.5 truncate leading-tight">
                Đếm: <span className="text-blue-700">{sorted.length.toLocaleString('vi-VN')}</span> mục
              </div>
            </div>

            {/* 2. Tự sum cột số tiền */}
            <div
              className={`px-1.5 py-0.5 sm:py-1 rounded border shadow-2xs text-left transition-all ${
                showExpectedTotal
                  ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-blue-50/80 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between text-[7px] sm:text-[8.5px] font-semibold uppercase tracking-tight leading-none gap-1">
                <span className={`flex items-center gap-0.5 ${showExpectedTotal ? 'text-amber-800' : 'text-blue-700'}`}>
                  <Calculator className="w-2.5 h-2.5 shrink-0" />
                  <span>{showExpectedTotal ? 'Tổng gồm dự kiến' : 'Tổng thực tế'}</span>
                </span>
                <span
                  className={`text-[7px] sm:text-[8.5px] font-bold px-1 rounded border hidden sm:inline-block ${
                    showExpectedTotal
                      ? 'text-amber-800 bg-white/90 border-amber-300'
                      : 'text-blue-700 bg-white/90 border-blue-200'
                  }`}
                >
                  {showExpectedTotal ? 'Bao gồm Chưa BCMS' : 'Chỉ đã BCMS'}
                </span>
              </div>
              <div
                className={`text-[9.5px] sm:text-xs font-black font-mono mt-0.5 truncate whitespace-nowrap leading-tight ${
                  showExpectedTotal ? 'text-amber-950' : 'text-blue-900'
                }`}
                title={formatVND(totalFilteredAmount)}
              >
                {formatVND(totalFilteredAmount)}
              </div>
              {pendingBcmsCount > 0 && (
                <div className="text-[7px] sm:text-[8px] text-slate-500 mt-0.5 leading-none truncate">
                  {showExpectedTotal
                    ? `(+${formatVND(pendingBcmsAmount)} dự kiến)`
                    : `(-${pendingBcmsCount} mục Chưa BCMS)`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Bar: Ultra-slim 1-line controls */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-0.5 sm:gap-1.5 pt-0.5">
          {/* Search Input */}
          <div className="col-span-2 sm:col-span-4 relative">
            <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo nhân viên, nội dung, mã (627...)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="w-full h-5 sm:h-6 pl-5 pr-1.5 py-0 text-[8px] sm:text-xs rounded border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-500 transition-all leading-tight"
            />
          </div>

          {/* Category Filter */}
          <div className="col-span-1 sm:col-span-3 relative">
            <Layers className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                if (onSelectCategory) onSelectCategory(val);
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

          {/* BCMS Filter Pills */}
          <div className="col-span-1 sm:col-span-3 inline-flex items-center p-0.5 rounded border border-slate-200 bg-slate-50/80 h-5 sm:h-6 text-[7.5px] sm:text-[9.5px]">
            <button
              type="button"
              onClick={() => setBcmsFilter('ALL')}
              className={`flex-1 h-full px-1 rounded transition-all cursor-pointer font-semibold ${
                bcmsFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Toàn bộ giao dịch"
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setBcmsFilter('DA_BCMS')}
              className={`flex-1 h-full px-1 rounded transition-all cursor-pointer font-semibold ${
                bcmsFilter === 'DA_BCMS'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chỉ các khoản Đã có chứng từ/BCMS"
            >
              Đã BCMS ({totalTxDoneCount})
            </button>
            <button
              type="button"
              onClick={() => setBcmsFilter('CHUA_BCMS')}
              className={`flex-1 h-full px-1 rounded transition-all cursor-pointer font-semibold inline-flex items-center justify-center gap-0.5 ${
                bcmsFilter === 'CHUA_BCMS'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : totalTxPendingCount > 0
                  ? 'text-amber-800 bg-amber-100 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title={
                totalTxPendingCount > 0
                  ? `Có ${totalTxPendingCount} khoản Chưa BCMS (dự kiến)`
                  : 'Không có khoản dự kiến nào'
              }
            >
              {totalTxPendingCount > 0 && <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>}
              <span>Chưa BCMS ({totalTxPendingCount})</span>
            </button>
          </div>

          {/* Sort Order */}
          <div className="col-span-2 sm:col-span-2 relative">
            <ArrowUpDown className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={getSortDropdownValue()}
              onChange={(e) => handleDropdownSortChange(e.target.value)}
              className="w-full h-5 sm:h-6 pl-4.5 pr-1 py-0 text-[8px] sm:text-xs rounded border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer truncate font-medium leading-tight"
            >
              <option value="newest">🕒 Ngày mới nhất</option>
              <option value="oldest">🕒 Ngày cũ nhất</option>
              <optgroup label="⚡ Kết hợp Chưa BCMS (Dự kiến)">
                <option value="bcms_amount_desc">⚡ Chưa BCMS → Tiền cao nhất</option>
                <option value="bcms_amount_asc">⚡ Chưa BCMS → Tiền thấp nhất</option>
                <option value="bcms_remark_asc">⚡ Chưa BCMS → Ghi chú (A-Z)</option>
                <option value="bcms_account_asc">⚡ Chưa BCMS → Mã khoản mục</option>
                <option value="bcms_date_desc">⚡ Chưa BCMS → Ngày mới nhất</option>
              </optgroup>
              <optgroup label="💰 Theo Số tiền">
                <option value="amount_desc">💰 Tiền cao nhất</option>
                <option value="amount_asc">💰 Tiền thấp nhất</option>
              </optgroup>
              <optgroup label="📝 Theo Ghi chú">
                <option value="remark_asc">📝 Ghi chú: A → Z (có ghi chú trước)</option>
                <option value="remark_desc">📝 Ghi chú: Z → A</option>
              </optgroup>
              <optgroup label="🏷️ Theo Khoản mục">
                <option value="account_asc">🏷️ Mã khoản mục (Tăng dần)</option>
                <option value="account_desc">🏷️ Mã khoản mục (Giảm dần)</option>
              </optgroup>
              {getSortDropdownValue() === 'custom' && (
                <option value="custom">🔀 Đang sắp xếp đa cột (Click bảng)</option>
              )}
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
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-130px)] sm:max-h-[calc(100vh-155px)] relative">
          <table
            className="w-full text-left border-collapse table-fixed"
            style={{ minWidth: `${totalTableWidth}px` }}
          >
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
              <tr className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                {/* 1. Ngày: dd/mm/yy không icon, tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('date') && (
                  <th
                    onClick={(e) => handleColumnSort('date', e)}
                    style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 cursor-pointer hover:bg-slate-200/90 transition-colors select-none text-center leading-tight break-words group"
                    title="Click để sắp xếp Ngày • Giữ Shift để kết hợp nhiều cột"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center">
                      <span>Ngày</span>
                      {renderSortIndicator('date')}
                    </div>
                    <ColumnResizeHandle colKey="date" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 1b. Chưa BCMS: Tùy biến kéo giãn */}
                {isColumnVisible('chuaBcms') && (
                  <th
                    onClick={(e) => handleColumnSort('chuaBcms', e)}
                    style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                    className="relative py-0.5 px-0.5 text-center leading-tight select-none cursor-pointer hover:bg-amber-100/70 transition-colors group text-amber-900"
                    title="Click để đưa Chưa BCMS lên đầu (kết hợp với Số tiền / Ghi chú)"
                  >
                    <div className="flex items-center justify-center gap-0.5 w-full">
                      <div className="flex flex-col items-center justify-center leading-none text-[7.5px] sm:text-[8px] font-black uppercase tracking-tight text-amber-900 select-none shrink-0">
                        <span>Chưa</span>
                        <span className="mt-0.5">BCMS</span>
                      </div>
                      {renderSortIndicator('chuaBcms')}
                    </div>
                    <ColumnResizeHandle colKey="chuaBcms" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 2. Khoản mục & Nhóm: tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('account') && (
                  <th
                    onClick={(e) => handleColumnSort('account', e)}
                    style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 cursor-pointer hover:bg-slate-200/90 transition-colors select-none text-center leading-tight break-words group"
                    title="Click để sort theo Mã khoản mục • Giữ Shift để kết hợp"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center">
                      <span>Khoản mục</span>
                      {renderSortIndicator('account')}
                    </div>
                    <ColumnResizeHandle colKey="account" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 3. Nội dung diễn giải: tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('notes') && (
                  <th
                    onClick={(e) => handleColumnSort('notes', e)}
                    style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words cursor-pointer hover:bg-slate-200/90 transition-colors select-none group"
                    title="Click để sắp xếp theo Nội dung diễn giải"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center w-full">
                      <span>Nội dung diễn giải</span>
                      {renderSortIndicator('notes')}
                    </div>
                    <ColumnResizeHandle colKey="notes" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 4. Số tiền (VNĐ): tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('amount') && (
                  <th
                    onClick={(e) => handleColumnSort('amount', e)}
                    style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center cursor-pointer hover:bg-slate-200/90 transition-colors select-none leading-tight break-words group"
                    title="Click để đổi thứ tự số tiền • Tự động kết hợp cùng Chưa BCMS nếu đã chọn"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center">
                      <span>Số tiền (VNĐ)</span>
                      {renderSortIndicator('amount')}
                    </div>
                    <ColumnResizeHandle colKey="amount" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 4b. Ghi chú: Nằm ngay sau cột Số tiền */}
                {isColumnVisible('remark') && (
                  <th
                    onClick={(e) => handleColumnSort('remark', e)}
                    style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words select-none cursor-pointer hover:bg-slate-200/90 transition-colors group"
                    title="Click để sắp xếp Ghi chú • Tự động kết hợp cùng Chưa BCMS nếu đã chọn"
                  >
                    <div className="flex items-center justify-center gap-0.5 pr-1 text-center w-full">
                      <span>Ghi Chú</span>
                      {renderSortIndicator('remark')}
                    </div>
                    <ColumnResizeHandle colKey="remark" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 5. Người thực hiện: căn giữa, tùy biến kéo giãn */}
                {isColumnVisible('employee') && (
                  <th
                    style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                    className="relative py-0.5 px-0.5 sm:px-1 text-center leading-tight break-words"
                    title="Người thực hiện • Kéo mép phải để giãn cột"
                  >
                    <div className="text-center w-full pr-1">Người thực hiện</div>
                    <ColumnResizeHandle colKey="employee" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}

                {/* 6. Điều chỉnh (Thao tác): tùy biến kéo giãn, tiêu đề căn giữa */}
                {isColumnVisible('actions') && (
                  <th
                    style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                    className="relative py-0.5 px-0.5 text-center leading-tight break-words"
                    title="Thao tác"
                  >
                    <div className="text-center w-full">Điều chỉnh</div>
                    <ColumnResizeHandle colKey="actions" onResizeStart={handleResizeStart} onReset={resetColumnWidth} />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* 1. Ngày: dd/mm/yy không logo lịch */}
                  {isColumnVisible('date') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-center font-mono text-[9px] sm:text-xs text-slate-700 font-medium leading-tight break-words"
                      style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                    >
                      {formatDate(item.date)}
                    </td>
                  )}

                  {/* 1b. Chưa BCMS: Checkbox bật/tắt dự kiến */}
                  {isColumnVisible('chuaBcms') && (
                    <td
                      className="py-0.5 px-0.5 text-center leading-tight select-none"
                      style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                    >
                      <label
                        className="inline-flex items-center justify-center cursor-pointer p-0.5"
                        title={item.chuaBcms ? 'Khoản dự kiến (Chưa BCMS) - Loại trừ khỏi tổng thực tế' : 'Đã BCMS - Tính vào tổng thực tế'}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.chuaBcms)}
                          onChange={(e) => {
                            if (onUpdateTransaction) {
                              onUpdateTransaction({
                                ...item,
                                chuaBcms: e.target.checked,
                              });
                              setToastMessage(
                                e.target.checked
                                  ? 'Đã chuyển thành "Chưa BCMS" (khoản dự kiến)'
                                  : 'Đã bỏ chọn Chưa BCMS (tính vào tổng thực tế)'
                              );
                              setShowEditToast(true);
                              setTimeout(() => setShowEditToast(false), 2500);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                        />
                      </label>
                    </td>
                  )}

                  {/* 2. Khoản mục: Chỉ hiện số mã không hiện tên khoản mục */}
                  {isColumnVisible('account') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-center leading-tight"
                      style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }}
                      title={item.category ? `[${item.accountCode || ''}] ${item.category}` : item.accountCode}
                    >
                      {item.accountCode ? (
                        <span className="font-mono text-[8.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors inline-block">
                          {item.accountCode}
                        </span>
                      ) : (
                        <span className="font-mono text-[8.5px] sm:text-[10px] font-bold text-slate-500">
                          {item.category || '—'}
                        </span>
                      )}
                    </td>
                  )}

                  {/* 3. Nội dung diễn giải: Xuống dòng tự nhiên, khoảng cách dòng mảnh */}
                  {isColumnVisible('notes') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-[9.5px] sm:text-xs text-slate-700 break-words whitespace-normal leading-tight"
                      style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                      title={item.notes}
                    >
                      <div className="flex items-start gap-1">
                        {item.chuaBcms && (
                          <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            Dự kiến
                          </span>
                        )}
                        <span>{item.notes}</span>
                      </div>
                    </td>
                  )}

                  {/* 4. Số tiền */}
                  {isColumnVisible('amount') && (
                    <td
                      className={`py-0.5 px-0.5 sm:px-1 text-right font-mono font-bold text-[9.5px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden ${
                        item.chuaBcms ? 'text-amber-700 italic' : 'text-slate-900'
                      }`}
                      style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                      title={item.chuaBcms ? 'Khoản Chưa BCMS (dự kiến)' : undefined}
                    >
                      {formatVND(item.amount)}
                    </td>
                  )}

                  {/* 4b. Ghi chú: Nằm ngay sau cột Số tiền */}
                  {isColumnVisible('remark') && (
                    <td
                      className="py-0.5 px-1 text-center text-slate-600 text-[9px] sm:text-xs leading-tight break-words whitespace-normal"
                      style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                    >
                      {item.remark ? (
                        <span className="text-slate-700 italic">{item.remark}</span>
                      ) : (
                        <span className="text-slate-200 select-none font-light">—</span>
                      )}
                    </td>
                  )}

                  {/* 5. Người thực hiện: Căn giữa, xuống dòng nếu hẹp */}
                  {isColumnVisible('employee') && (
                    <td
                      className="py-0.5 px-0.5 sm:px-1 text-[9.5px] sm:text-xs text-slate-700 text-center leading-tight break-words"
                      style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                    >
                      <span className="font-medium text-slate-700 leading-tight">
                        {item.employeeName || 'Chưa ghi nhận'}
                      </span>
                    </td>
                  )}

                  {/* 6. Điều chỉnh */}
                  {isColumnVisible('actions') && (
                    <td
                      className="py-0.5 px-0.5 text-center leading-tight"
                      style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {onUpdateTransaction && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-75 group-hover:opacity-100"
                            title="Chỉnh sửa nội dung hạng mục này"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {onDeleteTransaction && (
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
                        )}
                        {!onUpdateTransaction && !onDeleteTransaction && (
                          <span className="text-[9px] text-slate-400 italic">Chỉ xem</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>

            {/* Sticky Table Footer: Tự sum tiền & Tự đếm diễn giải */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 backdrop-blur-xs border-t-2 border-slate-300 shadow-xs">
              <tr className="divide-x divide-slate-200">
                {/* 1. Ngày */}
                {isColumnVisible('date') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center font-bold text-[8px] sm:text-xs text-slate-700 uppercase leading-tight"
                    style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                  >
                    TỔNG
                  </td>
                )}

                {/* 1b. Chưa BCMS */}
                {isColumnVisible('chuaBcms') && (
                  <td
                    className="py-1 px-0.5 text-center text-slate-400 text-3xs"
                    style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                  >
                    —
                  </td>
                )}

                {/* 2. Khoản mục */}
                {isColumnVisible('account') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center font-mono text-[8.5px] sm:text-xs text-slate-700 leading-tight truncate"
                    style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }}
                    title={selectedCategory !== 'ALL' ? `Lọc mã: ${selectedCategory}` : 'Tất cả khoản mục'}
                  >
                    {selectedCategory !== 'ALL' ? (
                      <span className="text-blue-700 font-bold truncate block">{selectedCategory}</span>
                    ) : (
                      <span className="text-slate-500 font-semibold italic text-[8px] sm:text-[9.5px]">Tất cả</span>
                    )}
                  </td>
                )}

                {/* 3. Nội dung diễn giải: Tự đếm */}
                {isColumnVisible('notes') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-[8.5px] sm:text-xs text-slate-800 leading-tight"
                    style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 shrink-0" />
                      <span>
                        Đếm: <strong className="text-blue-700 font-black">{sorted.length.toLocaleString('vi-VN')}</strong> mục{' '}
                        <span className="text-slate-500 font-normal">({uniqueNotesCount} nội dung)</span>
                      </span>
                    </div>
                  </td>
                )}

                {/* 4. Số tiền: Tự sum */}
                {isColumnVisible('amount') && (
                  <td
                    className={`py-1 px-0.5 sm:px-1 text-right font-mono font-black text-[9.5px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden ${
                      showExpectedTotal ? 'text-amber-950' : 'text-blue-900'
                    }`}
                    style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                    title={`Tổng chi phí: ${formatVND(totalFilteredAmount)}`}
                  >
                    <div>{formatVND(totalFilteredAmount)}</div>
                    {pendingBcmsCount > 0 && (
                      <div className="text-[7.5px] font-normal text-slate-500 font-sans">
                        {showExpectedTotal
                          ? `(+${formatVND(pendingBcmsAmount)} DK)`
                          : `(-${pendingBcmsCount} mục Chưa BCMS)`}
                      </div>
                    )}
                  </td>
                )}

                {/* 4b. Ghi chú */}
                {isColumnVisible('remark') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center text-slate-400 text-3xs"
                    style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                  >
                    —
                  </td>
                )}

                {/* 5. Người thực hiện */}
                {isColumnVisible('employee') && (
                  <td
                    className="py-1 px-0.5 sm:px-1 text-center text-slate-400 text-[8.5px] sm:text-xs"
                    style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                  >
                    —
                  </td>
                )}

                {/* 6. Điều chỉnh */}
                {isColumnVisible('actions') && (
                  <td
                    className="py-1 px-0.5 text-center text-slate-400 text-[8.5px] sm:text-xs"
                    style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                  >
                    —
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
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
