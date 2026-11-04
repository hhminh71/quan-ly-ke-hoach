import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ArrowUpDown,
  Trash2,
  Edit3,
  FileSpreadsheet,
  ArrowUpRight,
  Shield,
  Layers,
  PlusCircle,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import AddTransactionModal from './AddTransactionModal';
import { matchesVietnameseSearch } from '../utils/searchUtils';
import { formatDate } from '../utils/dateUtils';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { useResizableColumns, ColumnResizeHandle, ColumnVisibilityDropdown } from '../hooks/useResizableColumns';
import {
  getSctsSeparatedCodes,
  isSctsSeparated,
  toggleSctsSeparation,
  calculateReportActual,
} from '../utils/sctsConfig';
import { exportAccountLedgerExcel, exportAccountLedgerCSV } from '../utils/excelExport';

export default function AccountLedgerModal({
  isOpen = true,
  account,
  transactions = [],
  budgets = [],
  selectedYear = '2026',
  user = null,
  onClose,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  // Multi-sort rules: Hỗ trợ sort cùng lúc nhiều cột (BCMS + Số tiền / Ghi chú)
  const [sortRules, setSortRules] = useState([{ key: 'date', dir: 'desc' }]);
  const [editingItem, setEditingItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBravo, setShowBravo] = useState(true);
  const [showActual, setShowActual] = useState(true);

  // Sync with browser history for mobile hardware/gesture Back button
  useModalBackHandler(isOpen && Boolean(account), onClose, 'account-ledger');

  // 1. ALL hooks MUST be declared at the top unconditionally (React Rules of Hooks)
  const accountTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    const accCode = String(account.code || '').trim();
    const accName = String(account.name || '').trim();

    return (transactions || []).filter((t) => {
      if (!t) return false;
      if (selectedYear && selectedYear !== 'ALL') {
        const fy = String(t.fiscalYear || (t.date && t.date.length >= 4 ? t.date.substring(0, 4) : '')).trim();
        if (fy && fy !== String(selectedYear)) return false;
      }
      const tCode = String(t.accountCode || '').trim();
      const tCat = String(t.category || '').trim();
      return (tCode && tCode === accCode) || (!tCode && tCat === accName);
    });
  }, [isOpen, transactions, account, selectedYear]);

  // Bộ lọc nhanh trạng thái BCMS ('ALL' | 'DA_BCMS' | 'CHUA_BCMS')
  const [bcmsFilter, setBcmsFilter] = useState('ALL');

  // Thống kê tổng số lượng toàn tài khoản
  const totalAccountCount = accountTransactions.length;
  const totalAccountPendingCount = useMemo(() => {
    return accountTransactions.filter((item) => item.chuaBcms).length;
  }, [accountTransactions]);
  const totalAccountDoneCount = totalAccountCount - totalAccountPendingCount;

  const filteredTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    return accountTransactions.filter((item) => {
      // 1. Lọc theo trạng thái Chưa BCMS / Đã BCMS
      if (bcmsFilter === 'CHUA_BCMS' && !item.chuaBcms) return false;
      if (bcmsFilter === 'DA_BCMS' && item.chuaBcms) return false;

      // 2. Lọc theo từ khóa tìm kiếm
      if (!searchTerm || !searchTerm.trim()) return true;
      return matchesVietnameseSearch(
        [item.employeeName, item.notes, item.date, item.amount, item.remark],
        searchTerm
      );
    });
  }, [isOpen, account, accountTransactions, searchTerm, bcmsFilter]);

  const sortedTransactions = useMemo(() => {
    if (!isOpen || !account) return [];
    return [...filteredTransactions].sort((a, b) => {
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
            cmp = 1; // Có ghi chú luôn lên trước
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
  }, [isOpen, account, filteredTransactions, sortRules]);

  // Click vào tiêu đề cột để sắp xếp (hỗ trợ sort cùng lúc BCMS + Số tiền / Ghi chú)
  const handleColumnSort = (key, e) => {
    const isMultiKey = e && (e.shiftKey || e.ctrlKey || e.metaKey);

    setSortRules((prevRules) => {
      const existingIdx = prevRules.findIndex((r) => r.key === key);
      let newDir = key === 'remark' || key === 'notes' ? 'asc' : 'desc';
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

      // Nếu đang bật sort BCMS -> giữ BCMS ở vị trí số 1, gán cột này làm tiêu chí số 2
      const bcmsRule = prevRules.find((r) => r.key === 'chuaBcms');
      if (bcmsRule) {
        if (newDir === null) {
          return [bcmsRule, { key: 'date', dir: 'desc' }];
        }
        return [bcmsRule, { key, dir: newDir }];
      }

      // Chưa bật BCMS: sắp xếp độc lập cột này
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
    const dateRule = sortRules.find((r) => r.key === 'date');

    if (hasBcms && hasBcms.dir === 'desc') {
      if (amountRule && amountRule.dir === 'desc') return 'bcms_amount_desc';
      if (amountRule && amountRule.dir === 'asc') return 'bcms_amount_asc';
      if (remarkRule && remarkRule.dir === 'asc') return 'bcms_remark_asc';
      if (remarkRule && remarkRule.dir === 'desc') return 'bcms_remark_desc';
      if (dateRule && dateRule.dir === 'desc') return 'bcms_date_desc';
      return 'bcms_amount_desc';
    }

    if (amountRule && !hasBcms) {
      return amountRule.dir === 'desc' ? 'amount_desc' : 'amount_asc';
    }
    if (remarkRule && !hasBcms) {
      return remarkRule.dir === 'desc' ? 'remark_desc' : 'remark_asc';
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
          <ArrowUpDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-300 opacity-60 hover:opacity-100" />
        )}
      </span>
    );
  };

  // Tùy chọn Ẩn/Hiện Tổng bao gồm dự kiến (Chưa BCMS)
  const [showExpectedTotal, setShowExpectedTotal] = useState(false);

  // Tổng thực tế đã BCMS (loại trừ các khoản đã check Chưa BCMS)
  const currentActualAmount = useMemo(() => {
    if (!isOpen || !account) return 0;
    return sortedTransactions
      .filter((item) => !item.chuaBcms)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [isOpen, account, sortedTransactions]);

  // Tổng toàn bộ (bao gồm cả dự kiến Chưa BCMS)
  const currentExpectedTotalAmount = useMemo(() => {
    if (!isOpen || !account) return 0;
    return sortedTransactions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [isOpen, account, sortedTransactions]);

  const pendingBcmsAmount = currentExpectedTotalAmount - currentActualAmount;
  const pendingBcmsCount = useMemo(() => {
    return sortedTransactions.filter((item) => item.chuaBcms).length;
  }, [sortedTransactions]);

  const currentTotalAmount = showExpectedTotal ? currentExpectedTotalAmount : currentActualAmount;

  const [sctsCodes, setSctsCodes] = useState(getSctsSeparatedCodes);

  // Resizable columns hook for Account Ledger Detail table
  const {
    columnWidths,
    handleResizeStart,
    resetColumnWidth,
    totalTableWidth,
    isColumnVisible,
    toggleColumnVisibility,
    showAllColumns,
  } = useResizableColumns({
    storageKey: 'tbl_cols_account_ledger_v5',
    initialWidths: {
      stt: 36,
      date: 72,
      chuaBcms: 46,
      notes: 260,
      amount: 115,
      remark: 130,
      employee: 100,
      actions: 60,
    },
    minWidths: {
      stt: 28,
      date: 50,
      chuaBcms: 34,
      notes: 90,
      amount: 105,
      remark: 65,
      employee: 60,
      actions: 45,
    },
  });

  const ledgerTableColumns = useMemo(
    () => [
      { key: 'stt', label: '#' },
      { key: 'date', label: 'Ngày' },
      { key: 'chuaBcms', label: 'Chưa BCMS' },
      { key: 'notes', label: 'Nội Dung Diễn Giải' },
      { key: 'amount', label: 'Số Tiền (VNĐ)' },
      { key: 'remark', label: 'Ghi Chú' },
      { key: 'employee', label: 'Người Thực Hiện' },
      { key: 'actions', label: 'Điều Chỉnh' },
    ],
    []
  );

  useEffect(() => {
    const handleUpdate = () => {
      setSctsCodes(getSctsSeparatedCodes());
    };
    window.addEventListener('app_scts_codes_updated', handleUpdate);
    return () => window.removeEventListener('app_scts_codes_updated', handleUpdate);
  }, []);

  // 2. ONLY return early after ALL hooks have been executed
  if (!isOpen || !account) return null;

  const formatVND = (num) => {
    return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
  };

  // Live account stats defensively
  const matchingBudget = useMemo(() => {
    if (!account?.code || !budgets?.length) return null;
    const targetCode = String(account.code).trim();
    return budgets.find((b) => String(b.code || '').trim() === targetCode) || null;
  }, [account?.code, budgets]);

  const approved = Number(
    account.selectedYearApproved !== undefined
      ? account.selectedYearApproved
      : account.approved !== undefined
      ? account.approved
      : (account.yearlyApproved && selectedYear !== 'ALL' && account.yearlyApproved[selectedYear] !== undefined)
      ? account.yearlyApproved[selectedYear]
      : (matchingBudget?.yearlyApproved && selectedYear !== 'ALL' && matchingBudget.yearlyApproved[selectedYear] !== undefined)
      ? matchingBudget.yearlyApproved[selectedYear]
      : matchingBudget?.selectedYearApproved !== undefined
      ? matchingBudget.selectedYearApproved
      : matchingBudget?.approved !== undefined
      ? matchingBudget.approved
      : (account.approvedAmount !== undefined ? account.approvedAmount : matchingBudget?.approvedAmount) || 0
  );

  // Số tiền thực tế: lấy theo currentTotalAmount (chỉ Đã BCMS hoặc Gồm Dự Kiến tùy theo showExpectedTotal)
  const spent = accountTransactions.length > 0 ? currentTotalAmount : (Number(account.liveActual) || 0);
  const bravoVal = Number(
    account.bravoVal !== undefined
      ? account.bravoVal
      : account.bravoActual !== undefined
      ? account.bravoActual
      : account.bravoAmount !== undefined
      ? account.bravoAmount
      : matchingBudget?.bravoVal !== undefined
      ? matchingBudget.bravoVal
      : matchingBudget?.bravoActual !== undefined
      ? matchingBudget.bravoActual
      : matchingBudget?.bravoAmount || 0
  ) || 0;

  const isSeparated = isSctsSeparated(account.code, sctsCodes);
  const { reportActual, source } = calculateReportActual(spent, bravoVal, account.code, sctsCodes);
  const remaining = approved - reportActual;
  const spentPercent = approved > 0 ? (reportActual / approved) * 100 : 0;
  const liveActualPercent = approved > 0 ? (spent / approved) * 100 : 0;
  const bravoPercent = approved > 0 ? (bravoVal / approved) * 100 : 0;
  const remainingPercent = approved > 0 ? (remaining / approved) * 100 : 0;

  const currentUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem('demo_user'));
    } catch {
      return null;
    }
  })();

  const handleExportLedgerExcel = () => {
    try {
      exportAccountLedgerExcel({
        account: { ...matchingBudget, ...account },
        transactions: sortedTransactions.length > 0 ? sortedTransactions : accountTransactions,
        selectedYear,
        approved,
        bravoVal,
        spent,
        reportActual,
        remaining,
        isSeparated,
        user: currentUser,
        showExpectedTotal,
      });
    } catch (err) {
      console.error('Lỗi xuất Excel sổ cái:', err);
      try {
        exportAccountLedgerCSV({
          account: { ...matchingBudget, ...account },
          transactions: sortedTransactions.length > 0 ? sortedTransactions : accountTransactions,
          selectedYear,
          approved,
          bravoVal,
          spent,
          reportActual,
          remaining,
          isSeparated,
          user: currentUser,
        });
      } catch (csvErr) {
        alert('Không thể xuất báo cáo. Chi tiết lỗi: ' + (err?.message || err));
      }
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-1 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Modal Container: Compact, sleek, maximized visible vertical area for screenshots */}
        <div
          className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Slim minimalist bar - Responsive for mobile */}
          <div className="px-2.5 py-2 sm:px-4 sm:py-2.5 border-b border-slate-100 bg-slate-50/80 shrink-0 space-y-1.5 sm:space-y-0">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-mono text-2xs sm:text-xs font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                      {account.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={account.name}>
                      {account.name}
                    </h3>
                    <span className="text-3xs sm:text-[10px] font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded-full shrink-0">
                      Năm {selectedYear}
                    </span>
                  </div>
                  <div className="text-3xs sm:text-[11px] text-slate-500 leading-tight mt-0.5 truncate flex items-center gap-1.5">
                    <span className="font-medium text-slate-700 shrink-0">{account.scope || account.group}</span>
                    <span className="text-slate-300">•</span>
                    <span className="shrink-0">
                      Tổng <strong className="text-blue-700">{totalAccountCount}</strong> mục
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="shrink-0">
                      <strong className="text-slate-800">{totalAccountDoneCount}</strong> Đã BCMS
                    </span>
                    <span className="text-slate-300">•</span>
                    {totalAccountPendingCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 truncate">
                        ⚡ Có {totalAccountPendingCount} Chưa BCMS ({formatVND(pendingBcmsAmount)})
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                        ✓ 0 khoản dự kiến
                      </span>
                    )}
                  </div>
                </div>
              </div>

                          {/* Desktop Header Actions + Close Button */}
              <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportLedgerExcel}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-2xs sm:text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-2xs border border-amber-300 transition-all active:scale-95 cursor-pointer"
                  title={`Xuất file Excel báo cáo chi tiết sổ cái cho riêng mã [${account.code}] ${account.name}`}
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Xuất Báo Cáo</span>
                </button>

                {onAddTransaction && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs sm:text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                    title={`Thêm mới hạng mục cho mã [${account.code}]`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm Mới</span>
                  </button>
                )}

                {onNavigateToLedger && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToLedger(account.code);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Mở toàn màn hình trong tab Sổ Cái"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Mở Tab Sổ Cái</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Close Button only */}
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Header Actions (Row 2 on mobile: full width, easy to tap) */}
            <div className="flex sm:hidden items-center gap-1.5 pt-1 border-t border-slate-200/60 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={handleExportLedgerExcel}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-2xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-2xs border border-amber-300 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                title={`Xuất file Excel báo cáo chi tiết cho riêng mã [${account.code}]`}
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Xuất Báo Cáo</span>
              </button>

              {onAddTransaction && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title={`Thêm mới hạng mục cho mã [${account.code}]`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Thêm Mới</span>
                </button>
              )}

              {onNavigateToLedger && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToLedger(account.code);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
                  title="Mở toàn màn hình trong tab Sổ Cái"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Tab Sổ Cái</span>
                </button>
              )}
            </div>
          </div>

          {/* Top KPI Bar (Ultra-slim, minimalist height for screenshots) */}
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 space-y-1.5 shrink-0">
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:flex sm:flex-nowrap gap-1 sm:gap-2 sm:[&>*]:flex-1">
              {/* 1. Tổng được duyệt */}
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs shrink-0 sm:shrink">
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-tight">
                  <span className="truncate">Duyệt {selectedYear}</span>
                  <span className="font-bold bg-slate-200/90 text-slate-700 px-1 py-0.2 rounded text-3xs">
                    100%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-tight mt-0.5 truncate" title={formatVND(approved)}>
                  {formatVND(approved)}
                </div>
              </div>

              {/* 2. Theo Bravo (hiển thị khi showBravo = true) */}
              {showBravo && (
                <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 shadow-2xs shrink-0 sm:shrink">
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-amber-800 font-semibold uppercase tracking-tight">
                    <span className="truncate">Theo Bravo</span>
                    <span className="font-bold px-1 py-0.2 rounded text-white bg-amber-500 text-3xs">
                      {bravoPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-950 font-mono leading-tight mt-0.5 truncate" title={formatVND(bravoVal)}>
                    {formatVND(bravoVal)}
                  </div>
                </div>
              )}

              {/* 3. Theo Thực Tế (hiển thị khi showActual = true) */}
              {showActual && (
                <div
                  className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border shadow-2xs shrink-0 sm:shrink transition-all ${
                    showExpectedTotal
                      ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/40'
                      : 'bg-blue-50/80 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-semibold uppercase tracking-tight">
                    <span className={`truncate ${showExpectedTotal ? 'text-amber-900 font-bold' : 'text-blue-800'}`}>
                      {showExpectedTotal ? 'Gồm Dự Kiến' : 'Theo Thực Tế'}
                    </span>
                    <span
                      className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                        showExpectedTotal ? 'bg-amber-600' : 'bg-blue-600'
                      }`}
                    >
                      {liveActualPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-extrabold font-mono leading-tight mt-0.5 truncate ${
                      showExpectedTotal ? 'text-amber-950' : 'text-blue-950'
                    }`}
                    title={formatVND(spent)}
                  >
                    {formatVND(spent)}
                  </div>
                  {pendingBcmsCount > 0 && (
                    <div className="text-[7.5px] sm:text-[8.5px] text-slate-500 mt-0.5 leading-none truncate">
                      {showExpectedTotal
                        ? `(+${formatVND(pendingBcmsAmount)} dự kiến)`
                        : `(-${pendingBcmsCount} mục Chưa BCMS)`}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Chi phí thực tế báo cáo (MAX) */}
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 shadow-2xs shrink-0 sm:shrink">
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-emerald-800 font-semibold uppercase tracking-tight">
                  <span className="truncate">{isSeparated ? 'SCTX Nhập Liệu' : 'Báo Cáo (MAX)'}</span>
                  <span className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                    isSeparated ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}>
                    {spentPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-950 font-mono leading-tight mt-0.5 truncate" title={formatVND(reportActual)}>
                  {formatVND(reportActual)}
                </div>
              </div>

              {/* 5. Còn lại / Vượt */}
              <div
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border shadow-2xs shrink-0 sm:shrink col-span-2 min-[480px]:col-span-1 sm:col-span-1 ${
                  remaining >= 0 ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-semibold uppercase tracking-tight">
                  <span className={remaining >= 0 ? 'text-slate-600' : 'text-rose-700'}>
                    {remaining >= 0 ? 'Còn Lại' : 'Vượt'}
                  </span>
                  <span
                    className={`font-bold px-1 py-0.2 rounded text-white text-3xs ${
                      remaining >= 0 ? 'bg-slate-600' : 'bg-rose-600'
                    }`}
                  >
                    {remainingPercent.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-extrabold font-mono leading-tight mt-0.5 truncate ${
                    remaining >= 0 ? 'text-slate-900' : 'text-rose-700'
                  }`}
                  title={formatVND(remaining)}
                >
                  {formatVND(remaining)}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar - Slim 1px line */}
            {approved > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    spentPercent > 100
                      ? 'bg-rose-500'
                      : spentPercent > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(spentPercent, 100)}%` }}
                ></div>
              </div>
            )}

            {/* SCTS separation toggle - Ultra-slim single line */}
            <div
              className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg border text-3xs sm:text-[11px] transition-colors ${
                isSeparated
                  ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                  : 'bg-slate-50 border-slate-200/80 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className={`w-3.5 h-3.5 shrink-0 ${isSeparated ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-semibold truncate">
                  {isSeparated ? (
                    <>
                      <span className="sm:hidden">Đã tách SCTS ({formatVND(spent)})</span>
                      <span className="hidden sm:inline">Đã tách riêng SCTS • Chỉ tính SCTX nhập liệu ({formatVND(spent)})</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Quy tắc MAX(Bravo, Thực Tế)</span>
                      <span className="hidden sm:inline">Quy tắc MAX(Bravo, Thực Tế) • Bravo: {formatVND(bravoVal)} • Thực tế: {formatVND(spent)}</span>
                    </>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleSctsSeparation(account.code)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs sm:text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  isSeparated
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                title="Bấm để bật/tắt chế độ tách riêng chi phí SCTS cho mã tài khoản này"
              >
                {isSeparated ? '✓ Đang Tách SCTS' : 'Tách Riêng SCTS'}
              </button>
            </div>
          </div>

          {/* Search & Sort Controls inside Modal: Responsive 2-tier layout */}
          <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 shrink-0">
            {/* Top row on mobile / Left group on desktop */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto sm:flex-1 sm:min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm người, diễn giải..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-2xs sm:text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Bộ lọc nhanh trạng thái BCMS: Tất cả | Đã BCMS | Chưa BCMS */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0 text-3xs sm:text-[10px]">
                <button
                  type="button"
                  onClick={() => setBcmsFilter('ALL')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    bcmsFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Hiển thị toàn bộ hạng mục"
                >
                  Tất cả ({totalAccountCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBcmsFilter('DA_BCMS')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    bcmsFilter === 'DA_BCMS'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Chỉ hiển thị các khoản Đã có chứng từ/BCMS"
                >
                  Đã BCMS ({totalAccountDoneCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBcmsFilter('CHUA_BCMS')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer inline-flex items-center gap-0.5 ${
                    bcmsFilter === 'CHUA_BCMS'
                      ? 'bg-amber-600 text-white shadow-2xs font-bold'
                      : totalAccountPendingCount > 0
                      ? 'text-amber-800 bg-amber-100/90 font-bold hover:bg-amber-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={
                    totalAccountPendingCount > 0
                      ? `Lọc nhanh: Có ${totalAccountPendingCount} khoản Chưa BCMS (dự kiến)`
                      : 'Không có khoản dự kiến nào'
                  }
                >
                  {totalAccountPendingCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                  <span>Chưa BCMS ({totalAccountPendingCount})</span>
                </button>
              </div>
            </div>

            {/* Bottom row on mobile (horizontal swipeable toolbar) / Right group on desktop */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 sm:py-0 w-full sm:w-auto shrink-0">
              {/* Nút Ẩn/Hiện Theo Bravo và Theo Thực Tế */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBravo((prev) => !prev)}
                  className={`h-5 sm:h-6 px-1.5 py-0 rounded text-[7.5px] sm:text-[9px] font-bold transition-all cursor-pointer leading-tight ${
                    showBravo
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title={showBravo ? 'Ẩn Theo Bravo' : 'Hiện Theo Bravo'}
                >
                  Bravo
                </button>
                <button
                  type="button"
                  onClick={() => setShowActual((prev) => !prev)}
                  className={`h-5 sm:h-6 px-1.5 py-0 rounded text-[7.5px] sm:text-[9px] font-bold transition-all cursor-pointer leading-tight ${
                    showActual
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title={showActual ? 'Ẩn Theo Thực Tế' : 'Hiện Theo Thực Tế'}
                >
                  Thực Tế
                </button>

                {/* Tùy chọn Ẩn/Hiện Tổng bao gồm dự kiến */}
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
              </div>

              <ColumnVisibilityDropdown
                columns={ledgerTableColumns}
                isColumnVisible={isColumnVisible}
                onToggleColumn={toggleColumnVisibility}
                onShowAll={showAllColumns}
              />

              <div className="relative">
                <ArrowUpDown className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={getSortDropdownValue()}
                  onChange={(e) => handleDropdownSortChange(e.target.value)}
                  className="pl-6 pr-2 py-1 text-2xs sm:text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all cursor-pointer font-medium"
                >
                  <option value="newest">🕒 Ngày mới nhất</option>
                  <option value="oldest">🕒 Ngày cũ nhất</option>
                  <optgroup label="⚡ Kết hợp Chưa BCMS (Dự kiến)">
                    <option value="bcms_amount_desc">⚡ Chưa BCMS → Tiền cao nhất</option>
                    <option value="bcms_amount_asc">⚡ Chưa BCMS → Tiền thấp nhất</option>
                    <option value="bcms_remark_asc">⚡ Chưa BCMS → Ghi chú (A-Z)</option>
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
                  {getSortDropdownValue() === 'custom' && (
                    <option value="custom">🔀 Đang sắp xếp đa cột (Click bảng)</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Ledger Table: Sổ cái chi tiết các hạng mục */}
          {/* USER SPECIFICATION:
              1. Cột 'Người thực hiện' di chuyển ra cuối, trước cột 'Điều chỉnh' (Thao tác), căn giữa và bỏ chữ cái viết tắt phía trước
                 -> Thứ tự: # | Ngày | Nội Dung Diễn Giải | Số Tiền (VNĐ) | Người Thực Hiện | Điều Chỉnh
              2. Kéo giãn các cột tùy biến, xuống dòng tự nhiên, khoảng cách dòng tối giản mảnh
          */}
          <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0">
            {sortedTransactions.length === 0 && (!showBravo || bravoVal === 0) ? (
              <div className="text-center py-10 px-4">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {searchTerm
                    ? 'Không tìm thấy hạng mục nào khớp với từ khóa'
                    : `Chưa có hạng mục nào phát sinh cho khoản mục này trong năm ${selectedYear}`}
                </p>
                <p className="text-3xs sm:text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
                  {searchTerm
                    ? 'Thử thay đổi từ khóa hoặc xóa tìm kiếm để xem tất cả hạng mục.'
                    : 'Các hạng mục mới phát sinh trên Webhook hoặc form nhập liệu sẽ tự động xuất hiện tại đây.'}
                </p>
              </div>
            ) : (
              <table
                className="w-full text-left border-collapse table-fixed"
                style={{ minWidth: `${totalTableWidth}px` }}
              >
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-20 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                    {/* 1. STT */}
                    {isColumnVisible('stt') && (
                      <th
                        className="py-0.5 px-0.5 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.stt}px`, minWidth: `${columnWidths.stt}px` }}
                      >
                        <div className="truncate text-center w-full">#</div>
                        <ColumnResizeHandle
                          colKey="stt"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 2. Ngày: dd/mm/yy không logo lịch, bóp siêu gọn */}
                    {isColumnVisible('date') && (
                      <th
                        onClick={(e) => handleColumnSort('date', e)}
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none cursor-pointer hover:bg-slate-200/90 transition-colors group"
                        style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                        title="Click để sắp xếp Ngày • Giữ Shift để kết hợp nhiều cột"
                      >
                        <div className="flex items-center justify-center gap-0.5 truncate w-full">
                          <span>Ngày</span>
                          {renderSortIndicator('date')}
                        </div>
                        <ColumnResizeHandle
                          colKey="date"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 2b. Chưa BCMS (Dự kiến) */}
                    {isColumnVisible('chuaBcms') && (
                      <th
                        onClick={(e) => handleColumnSort('chuaBcms', e)}
                        className="py-0.5 px-0.5 text-center leading-tight relative select-none cursor-pointer hover:bg-amber-100/70 transition-colors group"
                        style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                        title="Click để đưa Chưa BCMS lên đầu (kết hợp với Số tiền / Ghi chú)"
                      >
                        <div className="flex items-center justify-center gap-0.5 w-full">
                          <div className="flex flex-col items-center justify-center leading-none text-[7.5px] sm:text-[8px] font-black uppercase tracking-tight text-amber-900 select-none shrink-0">
                            <span>Chưa</span>
                            <span className="mt-0.5">BCMS</span>
                          </div>
                          {renderSortIndicator('chuaBcms')}
                        </div>
                        <ColumnResizeHandle
                          colKey="chuaBcms"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 3. Nội dung diễn giải */}
                    {isColumnVisible('notes') && (
                      <th
                        onClick={(e) => handleColumnSort('notes', e)}
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none cursor-pointer hover:bg-slate-200/90 transition-colors group"
                        style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                        title="Click để sắp xếp theo Nội dung diễn giải"
                      >
                        <div className="flex items-center justify-center gap-0.5 truncate w-full">
                          <span>Nội Dung Diễn Giải</span>
                          {renderSortIndicator('notes')}
                        </div>
                        <ColumnResizeHandle
                          colKey="notes"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 4. Số tiền */}
                    {isColumnVisible('amount') && (
                      <th
                        onClick={(e) => handleColumnSort('amount', e)}
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none cursor-pointer hover:bg-slate-200/90 transition-colors group"
                        style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                        title="Click để sắp xếp Số tiền • Tự động kết hợp cùng Chưa BCMS nếu đã chọn"
                      >
                        <div className="flex items-center justify-center gap-0.5 truncate w-full">
                          <span>Số Tiền (VNĐ)</span>
                          {renderSortIndicator('amount')}
                        </div>
                        <ColumnResizeHandle
                          colKey="amount"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 4b. Ghi chú (nằm ngay phía sau cột số tiền) */}
                    {isColumnVisible('remark') && (
                      <th
                        onClick={(e) => handleColumnSort('remark', e)}
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none cursor-pointer hover:bg-slate-200/90 transition-colors group"
                        style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                        title="Click để sắp xếp Ghi chú • Tự động kết hợp cùng Chưa BCMS nếu đã chọn"
                      >
                        <div className="flex items-center justify-center gap-0.5 truncate w-full">
                          <span>Ghi Chú</span>
                          {renderSortIndicator('remark')}
                        </div>
                        <ColumnResizeHandle
                          colKey="remark"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 5. Người thực hiện: Căn giữa */}
                    {isColumnVisible('employee') && (
                      <th
                        className="py-0.5 px-0.5 sm:px-1 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                      >
                        <div className="truncate text-center w-full">Người Thực Hiện</div>
                        <ColumnResizeHandle
                          colKey="employee"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}

                    {/* 6. Điều chỉnh */}
                    {isColumnVisible('actions') && (
                      <th
                        className="py-0.5 px-0.5 text-center leading-tight relative select-none"
                        style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                      >
                        <div className="truncate text-center w-full">Điều Chỉnh</div>
                        <ColumnResizeHandle
                          colKey="actions"
                          onResizeStart={handleResizeStart}
                          onResetWidth={resetColumnWidth}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {showActual &&
                    sortedTransactions.map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        {/* 1. STT */}
                        {isColumnVisible('stt') && (
                          <td
                            className="py-0.5 px-0.5 text-center font-mono text-[9px] sm:text-[10px] text-slate-400 leading-tight break-words"
                            style={{ width: `${columnWidths.stt}px`, minWidth: `${columnWidths.stt}px` }}
                          >
                            {index + 1}
                          </td>
                        )}

                        {/* 2. Ngày */}
                        {isColumnVisible('date') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-center font-mono text-[9px] sm:text-xs text-slate-700 font-medium leading-tight break-words whitespace-normal"
                            style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                          >
                            {formatDate(item.date)}
                          </td>
                        )}

                        {/* 2b. Chưa BCMS (Dự kiến) */}
                        {isColumnVisible('chuaBcms') && (
                          <td
                            className="py-0.5 px-0.5 text-center leading-tight select-none"
                            style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                          >
                            <label
                              className="inline-flex items-center justify-center cursor-pointer p-0.5"
                              title={item.chuaBcms ? 'Khoản dự kiến (Chưa BCMS) - Đang loại trừ khỏi tổng thực tế' : 'Đã BCMS - Tính vào tổng chi phí thực tế'}
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
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                              />
                            </label>
                          </td>
                        )}

                        {/* 3. Nội dung diễn giải */}
                        {isColumnVisible('notes') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-slate-700 text-[9.5px] sm:text-xs break-words whitespace-normal leading-tight"
                            style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
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

                        {/* 4b. Ghi chú (nằm ngay phía sau cột số tiền) */}
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

                        {/* 5. Người thực hiện: Căn giữa, bỏ chữ viết tắt phía trước */}
                        {isColumnVisible('employee') && (
                          <td
                            className="py-0.5 px-0.5 sm:px-1 text-slate-700 text-[9.5px] sm:text-xs text-center leading-tight break-words whitespace-normal"
                            style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                          >
                            <span className="font-medium text-slate-800 leading-tight">
                              {item.employeeName || 'Chưa ghi nhận'}
                            </span>
                          </td>
                        )}

                        {/* 6. Điều chỉnh */}
                        {isColumnVisible('actions') && (
                          <td
                            className="py-0.5 px-0.5 text-center leading-tight break-words"
                            style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              {onUpdateTransaction && (
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(item)}
                                  className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-75 group-hover:opacity-100"
                                  title="Chỉnh sửa hạng mục này"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {onDeleteTransaction && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Bạn có chắc muốn xóa hạng mục "${item.notes}" (${formatVND(item.amount)})?`)) {
                                      onDeleteTransaction(item.id);
                                    }
                                  }}
                                  className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-75 group-hover:opacity-100"
                                  title="Xóa hạng mục này"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                  {/* Khi người dùng ẩn danh sách Thực Tế */}
                  {!showActual && sortedTransactions.length > 0 && (
                    <tr className="bg-slate-50/70 text-slate-400 italic">
                      <td colSpan={8} className="py-2.5 px-3 text-center text-3xs sm:text-xs">
                        Danh sách hạng mục Thực Tế (nhập liệu) đang tạm ẩn. Bấm nút <strong>Thực Tế</strong> phía trên để hiển thị lại.
                      </td>
                    </tr>
                  )}

                  {/* Dòng hạch toán hệ thống Bravo khi showBravo = true */}
                  {showBravo && bravoVal > 0 && (
                    <tr className="bg-amber-50/70 border-t-2 border-amber-200/90 hover:bg-amber-100/70 transition-colors">
                      {isColumnVisible('stt') && (
                        <td
                          className="py-0.5 px-0.5 text-center font-mono text-[8.5px] sm:text-[9.5px] font-bold text-amber-700 leading-tight"
                          style={{ width: `${columnWidths.stt}px`, minWidth: `${columnWidths.stt}px` }}
                        >
                          BRAVO
                        </td>
                      )}
                      {isColumnVisible('date') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-center font-mono text-[8.5px] sm:text-xs text-amber-800 font-semibold leading-tight whitespace-normal break-words"
                          style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }}
                        >
                          {selectedYear}
                        </td>
                      )}
                      {isColumnVisible('chuaBcms') && (
                        <td
                          className="py-0.5 px-0.5 text-center text-amber-400 text-3xs leading-tight"
                          style={{ width: `${columnWidths.chuaBcms}px`, minWidth: `${columnWidths.chuaBcms}px` }}
                        >
                          —
                        </td>
                      )}
                      {isColumnVisible('notes') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-amber-900 text-[9px] sm:text-xs leading-tight whitespace-normal break-words"
                          style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                        >
                          <span className="font-bold text-amber-800">Số liệu hạch toán hệ thống BRAVO</span>
                          {bravoVal > currentTotalAmount ? (
                            <span className="text-amber-700 text-3xs sm:text-[10px] ml-1 sm:ml-1.5 font-medium">
                              (Chênh lệch chưa lập chứng từ chi tiết: +{formatVND(bravoVal - currentTotalAmount)})
                            </span>
                          ) : bravoVal < currentTotalAmount ? (
                            <span className="text-blue-700 text-3xs sm:text-[10px] ml-1 sm:ml-1.5 font-medium">
                              (Nhập liệu thực tế đang cao hơn Bravo {formatVND(currentTotalAmount - bravoVal)})
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-3xs sm:text-[10px] ml-1 sm:ml-1.5 font-medium">
                              (Khớp 100% với nhập liệu thực tế)
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('amount') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-right font-mono font-extrabold text-amber-900 text-[9px] sm:text-xs leading-tight whitespace-nowrap overflow-hidden"
                          style={{ width: `${columnWidths.amount}px`, minWidth: `${columnWidths.amount}px` }}
                        >
                          {formatVND(bravoVal)}
                        </td>
                      )}
                      {isColumnVisible('remark') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-center text-amber-700/60 text-3xs leading-tight italic"
                          style={{ width: `${columnWidths.remark}px`, minWidth: `${columnWidths.remark}px` }}
                        >
                          —
                        </td>
                      )}
                      {isColumnVisible('employee') && (
                        <td
                          className="py-0.5 px-0.5 sm:px-1 text-center text-amber-800 text-[9px] sm:text-xs leading-tight font-medium break-words"
                          style={{ width: `${columnWidths.employee}px`, minWidth: `${columnWidths.employee}px` }}
                        >
                          Hệ thống BRAVO
                        </td>
                      )}
                      {isColumnVisible('actions') && (
                        <td
                          className="py-0.5 px-0.5 text-center leading-tight break-words"
                          style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                        >
                          <span className="text-[7.5px] sm:text-[8.5px] font-bold px-1 py-0.2 bg-amber-200/80 text-amber-800 rounded">
                            Tự động
                          </span>
                        </td>
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Footer: Responsive single-line footer */}
          <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-1.5 text-3xs sm:text-[11px] text-slate-500 shrink-0">
            <div className="truncate flex-1 min-w-0">
              Hiển thị <strong className="text-slate-800">{showActual ? sortedTransactions.length : 0}</strong> / <strong className="text-slate-800">{accountTransactions.length}</strong>
              <span className="hidden sm:inline"> hạng mục thực tế</span>{' '}
              {searchTerm && <span className="hidden sm:inline">(Khớp bộ lọc)</span>}
              {showActual && (
                <>
                  {' • '}Thực Tế:{' '}
                  <strong className="text-blue-700 font-mono font-bold whitespace-nowrap">
                    {formatVND(currentActualAmount)}
                  </strong>
                  {pendingBcmsCount > 0 && (
                    <span className="text-amber-700 ml-1">
                      (Dự kiến: +{formatVND(pendingBcmsAmount)})
                    </span>
                  )}
                  {showExpectedTotal && (
                    <span className="text-amber-900 font-mono font-bold ml-1">
                      {' => '}Gồm DK: {formatVND(currentExpectedTotalAmount)}
                    </span>
                  )}
                </>
              )}
              {showBravo && bravoVal > 0 && (
                <>
                  {' • '}Bravo:{' '}
                  <strong className="text-amber-700 font-mono font-bold whitespace-nowrap">
                    {formatVND(bravoVal)}
                  </strong>
                </>
              )}
              {' • '}Báo Cáo (MAX):{' '}
              <strong className="text-emerald-700 font-mono font-bold whitespace-nowrap">
                {formatVND(reportActual)}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleExportLedgerExcel}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-2xs sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title={`Xuất file Excel báo cáo chi tiết cho riêng mã [${account.code}]`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất Excel Sổ Cái</span>
                <span className="sm:hidden">Xuất Excel</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 text-2xs sm:text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal for direct row modification */}
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
          }}
        />
      )}

      {/* Add Transaction Modal with pre-selected account */}
      {isAddModalOpen && (
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddTransaction={(newRecord) => {
            if (onAddTransaction) {
              onAddTransaction(newRecord);
            }
            setIsAddModalOpen(false);
          }}
          budgets={budgets}
          transactions={transactions}
          selectedYear={selectedYear}
          defaultAccountCode={account?.code}
        />
      )}
    </>
  );
}
