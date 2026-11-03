import React, { useState, useEffect, useMemo } from 'react';
import ExecutiveDashboard from '../components/ExecutiveDashboard';
import AccountLedgerModal from '../components/AccountLedgerModal';
import TransactionList from '../components/TransactionList';
import BudgetOverview from '../components/BudgetOverview';
import SyncModal from '../components/SyncModal';
import UserManagementModal from '../components/UserManagementModal';
import {
  canAdd,
  canEdit,
  canDelete,
  hasPermission,
  getUserScopeInfo,
  filterBudgetsForUser,
  filterTransactionsForUser,
  filterBravoInfoForUser,
} from '../utils/permissions';
import {
  Download,
  RefreshCw,
  LayoutDashboard,
  ListOrdered,
  FileSpreadsheet,
  Cloud,
  CheckCircle2,
  Settings,
  Sparkles,
  Scale,
} from 'lucide-react';
import initialBudgets from '../data/budgets.json';
import initialTransactions from '../data/transactions.json';
import initialBravoInfo from '../data/bravoInfo.json';
import BravoReconciliation from '../components/BravoReconciliation';
import BravoSyncModal from '../components/BravoSyncModal';
import {
  getSavedWebhookUrl,
  fetchFromGoogleSheet,
  addTransactionToGoogleSheet,
  updateTransactionInGoogleSheet,
  deleteTransactionFromGoogleSheet,
  getLastSyncTime,
} from '../services/googleSheetService';

export default function DashboardPage({ user }) {
  // Load saved transactions from localStorage or default to imported real data
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('app_transactions_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((t, idx) => ({
            id: t.id || idx + 1,
            fiscalYear: String(t.fiscalYear || (t.date && t.date.length >= 4 ? t.date.substring(0, 4) : '')).trim(),
            date: String(t.date || '').trim(),
            accountCode: String(t.accountCode || '').trim(),
            category: String(t.category || '').trim(),
            group: String(t.group || '').trim(),
            employeeName: String(t.employeeName || '').trim(),
            amount: Number(t.amount) || 0,
            notes: String(t.notes || '').trim(),
            remark: String(t.remark || '').trim(),
            chuaBcms: Boolean(
              t.chuaBcms === true ||
              t.chuaBcms === 'true' ||
              t.chuaBcms === 'TRUE' ||
              t.chuaBcms === 1 ||
              (t.chuaBcms === undefined &&
                typeof t.notes === 'string' &&
                (t.notes.toLowerCase().includes('dự kiến') ||
                  t.notes.toLowerCase().includes('du kien') ||
                  t.notes.toLowerCase().includes('chưa bcms') ||
                  t.notes.toLowerCase().includes('chua bcms')))
            ),
            createdAt: String(t.createdAt || '09:00'),
            status: String(t.status || 'Đã thực hiện'),
          }));
        }
      }
      // Clean up legacy cache so user gets fresh normalized transaction data
      localStorage.removeItem('app_transactions_v3');
      localStorage.removeItem('app_transactions_v2');
      localStorage.removeItem('app_transactions');
    } catch (e) {
      console.error(e);
    }
    return initialTransactions.map((t, idx) => ({
      ...t,
      id: t.id || idx + 1,
      chuaBcms: Boolean(
        t.chuaBcms === true ||
        (typeof t.notes === 'string' &&
          (t.notes.toLowerCase().includes('dự kiến') ||
            t.notes.toLowerCase().includes('du kien') ||
            t.notes.toLowerCase().includes('chưa bcms') ||
            t.notes.toLowerCase().includes('chua bcms')))
      ),
      remark: String(t.remark || '').trim(),
    }));
  });

  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem('app_budgets_v3');
      if (saved) return JSON.parse(saved);
      // Clean up legacy v2 cache so user gets fresh enriched BRAVO data
      localStorage.removeItem('app_budgets_v2');
    } catch (e) {
      console.error(e);
    }
    return initialBudgets;
  });

  const [bravoInfo, setBravoInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('app_bravo_info_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialBravoInfo;
  });

  // Mobile Back Button & URL Hash Navigation Helpers
  const getTabFromHash = () => {
    if (typeof window === 'undefined') return 'DASHBOARD';
    // 1. Kiểm tra tham số URL ?tab= hoặc ?initial_tab= (ưu tiên cao nhất, đặc biệt từ khung giả lập)
    try {
      const params = new URLSearchParams(window.location.search);
      const queryTab = params.get('tab') || params.get('initial_tab');
      if (queryTab) {
        const upper = queryTab.toUpperCase();
        if (['DASHBOARD', 'BUDGETS', 'TRANSACTIONS', 'BRAVO_RECON'].includes(upper)) {
          return upper;
        }
      }
    } catch {}

    // 2. Kiểm tra Hash trên thanh địa chỉ (#so-cai, #ke-hoach, ...)
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith('#ke-hoach') || hash.startsWith('#budgets')) return 'BUDGETS';
    if (hash.startsWith('#so-cai') || hash.startsWith('#transactions') || hash.startsWith('#ledger')) return 'TRANSACTIONS';
    if (hash.startsWith('#doi-soat') || hash.startsWith('#bravo')) return 'BRAVO_RECON';

    // 3. Kiểm tra tab gần nhất được lưu trong localStorage
    try {
      const savedTab = localStorage.getItem('active_app_tab');
      if (savedTab && ['DASHBOARD', 'BUDGETS', 'TRANSACTIONS', 'BRAVO_RECON'].includes(savedTab)) {
        return savedTab;
      }
    } catch {}

    return 'DASHBOARD';
  };

  const getHashFromTab = (tab) => {
    if (tab === 'BUDGETS') return '#ke-hoach';
    if (tab === 'TRANSACTIONS') return '#so-cai';
    if (tab === 'BRAVO_RECON') return '#doi-soat';
    return '#dashboard';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromHash());

  const handleTabChange = (newTab, replace = false) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    try {
      localStorage.setItem('active_app_tab', newTab);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {}
    const hash = getHashFromTab(newTab);
    if (replace) {
      window.history.replaceState({ tab: newTab }, '', hash);
    } else {
      window.history.pushState({ tab: newTab }, '', hash);
    }
  };

  // Đồng bộ điều hướng Tab với Browser History (Nút Back trên điện thoại) & lưu activeTab
  useEffect(() => {
    try {
      localStorage.setItem('active_app_tab', activeTab);
    } catch {}

    const initialTab = getTabFromHash();
    if (!window.location.hash) {
      window.history.replaceState({ tab: initialTab }, '', getHashFromTab(initialTab));
    }

    const handlePopState = (e) => {
      if (e.state?.isAppModal) return;
      const targetTab = e.state?.tab || getTabFromHash();
      setActiveTab(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [activeTab]);

  // Selected account for drilldown modal
  const [selectedDetailAccount, setSelectedDetailAccount] = useState(null);

  // Fiscal Year Selection
  const currentFiscalYear = String(new Date().getFullYear());
  const [selectedYear, setSelectedYearState] = useState(() => {
    try {
      return localStorage.getItem('selected_fiscal_year') || currentFiscalYear;
    } catch {
      return currentFiscalYear;
    }
  });

  const setSelectedYear = (yr) => {
    setSelectedYearState(yr);
    try {
      localStorage.setItem('selected_fiscal_year', yr);
    } catch {}
  };

  // Tab bắt buộc chỉ chọn năm hiện tại: Dashboard & Kế hoạch báo cáo
  const isCurrentYearOnlyTab = activeTab === 'DASHBOARD' || activeTab === 'BUDGETS';

  // Tự động khóa về năm hiện tại khi chuyển vào Dashboard hoặc Kế hoạch báo cáo
  useEffect(() => {
    if (isCurrentYearOnlyTab && selectedYear !== currentFiscalYear) {
      setSelectedYear(currentFiscalYear);
    }
  }, [activeTab, isCurrentYearOnlyTab, currentFiscalYear, selectedYear]);

  // Active Account Filter for Ledger (synchronized across tabs and simulator)
  const [selectedLedgerAccount, setSelectedLedgerAccountState] = useState(() => {
    try {
      return localStorage.getItem('selected_ledger_account') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const setSelectedLedgerAccount = (acc) => {
    const val = acc || 'ALL';
    setSelectedLedgerAccountState(val);
    try {
      localStorage.setItem('selected_ledger_account', val);
    } catch {}
  };

  // Google Sheets sync states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isBravoSyncModalOpen, setIsBravoSyncModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasWebhook, setHasWebhook] = useState(() => Boolean(getSavedWebhookUrl()));
  const [lastSyncTime, setLastSyncTimeState] = useState(() => getLastSyncTime());

  // Role permissions
  const canAddTx = canAdd(user);
  const canEditTx = canEdit(user);
  const canDeleteTx = canDelete(user);
  const canEditBudgetsPlan = hasPermission(user, 'EDIT_BUDGET_PLANS');

  // Dynamically compute available years from existing transactions
  const availableYears = useMemo(() => {
    const yearSet = new Set();
    transactions.forEach((t) => {
      const y = String(t.fiscalYear || (t.date && t.date.length >= 4 ? t.date.substring(0, 4) : '')).trim();
      if (/^\d{4}$/.test(y)) yearSet.add(y);
    });
    // Add current and next year if not present
    const currentY = String(new Date().getFullYear());
    yearSet.add(currentY);
    yearSet.add(String(new Date().getFullYear() + 1));
    return Array.from(yearSet).sort((a, b) => String(b).localeCompare(String(a)));
  }, [transactions]);

  // Filter transactions strictly for the selected fiscal year
  const yearTransactions = useMemo(() => {
    if (selectedYear === 'ALL') return transactions;
    return transactions.filter((t) => {
      const fy = String(t.fiscalYear || (t.date && t.date.length >= 4 ? t.date.substring(0, 4) : '')).trim();
      return fy === String(selectedYear);
    });
  }, [transactions, selectedYear]);

  // Scope information for current user
  const scopeInfo = useMemo(() => getUserScopeInfo(user), [user]);

  // Scoped budgets, transactions, and bravoInfo based on user permissions
  const scopedBudgets = useMemo(() => filterBudgetsForUser(budgets, user), [budgets, user]);
  const scopedYearTransactions = useMemo(() => filterTransactionsForUser(yearTransactions, user), [yearTransactions, user]);
  const scopedBravoInfo = useMemo(() => filterBravoInfoForUser(bravoInfo, user), [bravoInfo, user]);

  // Sync transactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_transactions_v4', JSON.stringify(transactions));
    } catch (e) {
      console.error('Storage full or error', e);
    }
  }, [transactions]);

  // Sync budgets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_budgets_v3', JSON.stringify(budgets));
    } catch (e) {
      console.error('Storage full or error', e);
    }
  }, [budgets]);

  // Sync bravoInfo to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_bravo_info_v2', JSON.stringify(bravoInfo));
    } catch (e) {
      console.error('Storage full or error', e);
    }
  }, [bravoInfo]);

  // Initial auto-sync from Google Sheet if URL exists
  useEffect(() => {
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      handleSyncNow(webhookUrl, false);
    }
  }, []);

  const handleSyncNow = async (specificUrl, showAlert = true) => {
    const url = specificUrl || getSavedWebhookUrl();
    if (!url) {
      setIsSyncModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const data = await fetchFromGoogleSheet(url);
      if (data && data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions);
      }
      if (data && data.budgets && data.budgets.length > 0) {
        setBudgets(data.budgets);
      }
      if (data && data.bravoInfo && data.bravoInfo.length > 0) {
        setBravoInfo(data.bravoInfo);
      }
      setHasWebhook(true);
      setLastSyncTimeState(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      if (showAlert) {
        alert(`Đồng bộ thành công! Đã nạp ${data.transactions?.length || 0} hạng mục và số liệu đối soát Bravo từ Google Sheet.`);
      }
    } catch (err) {
      console.error('Sync error', err);
      if (showAlert) {
        alert(`Lỗi đồng bộ: ${err.message}. Đang sử dụng dữ liệu cục bộ.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTransaction = (newRecord) => {
    const recordWithYear = {
      ...newRecord,
      fiscalYear: String(newRecord.fiscalYear || (newRecord.date && newRecord.date.length >= 4 ? newRecord.date.substring(0, 4) : selectedYear)).trim(),
    };
    // 1. Cập nhật state cục bộ ngay lập tức
    setTransactions((prev) => [recordWithYear, ...prev]);

    // 2. Gửi ngầm lên Google Sheet nếu đã kết nối
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      addTransactionToGoogleSheet(webhookUrl, recordWithYear);
    }
  };

  const handleDeleteTransaction = (id) => {
    // 1. Xóa cục bộ
    setTransactions((prev) => prev.filter((item) => item.id !== id));

    // 2. Xóa trên Google Sheet
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      deleteTransactionFromGoogleSheet(webhookUrl, id);
    }
  };

  const handleUpdateTransaction = (updatedRecord) => {
    const recordWithYear = {
      ...updatedRecord,
      fiscalYear: String(updatedRecord.fiscalYear || (updatedRecord.date && updatedRecord.date.length >= 4 ? updatedRecord.date.substring(0, 4) : selectedYear)).trim(),
    };
    // 1. Cập nhật state cục bộ ngay lập tức
    setTransactions((prev) =>
      prev.map((item) => (item.id === recordWithYear.id ? recordWithYear : item))
    );

    // 2. Gửi ngầm cập nhật trực tiếp lên Google Sheet qua webhook
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      updateTransactionInGoogleSheet(webhookUrl, recordWithYear);
    }
  };

  const handleResetData = () => {
    if (!canDelete(user)) {
      alert('Bạn không có quyền khôi phục hoặc xóa dữ liệu.');
      return;
    }
    if (confirm('Khôi phục toàn bộ danh sách 1.216 giao dịch thực tế (2024, 2025, 2026) từ file gốc?')) {
      const resetTx = initialTransactions.map((t, idx) => ({
        ...t,
        id: t.id || idx + 1,
        chuaBcms: Boolean(
          t.chuaBcms === true ||
          (typeof t.notes === 'string' &&
            (t.notes.toLowerCase().includes('dự kiến') ||
              t.notes.toLowerCase().includes('du kien') ||
              t.notes.toLowerCase().includes('chưa bcms') ||
              t.notes.toLowerCase().includes('chua bcms')))
        ),
        remark: String(t.remark || '').trim(),
      }));
      setTransactions(resetTx);
      localStorage.removeItem('app_transactions_v4');
      localStorage.removeItem('app_transactions_v3');
      localStorage.removeItem('app_transactions_v2');
      localStorage.removeItem('app_transactions');
    }
  };

  const handleExportCSV = () => {
    if (scopedYearTransactions.length === 0) {
      alert(`Không có dữ liệu năm ${selectedYear} trong phạm vi của bạn để xuất.`);
      return;
    }
    const headers = 'ID,Nam,MaKhoanMuc,DanhMuc,Nhom,Ngay,NguoiThucHien,SoTien,GhiChu\n';
    const rows = scopedYearTransactions
      .map(
        (t) =>
          `"${t.id}","${(t.date || '').substring(0, 4)}","${t.accountCode || ''}","${(t.category || '').replace(/"/g, '""')}","${(t.group || '').replace(/"/g, '""')}","${t.date || ''}","${(t.employeeName || '').replace(/"/g, '""')}","${t.amount || 0}","${(t.notes || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-ke-hoach-chi-phi-nam-${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Event listeners for Header Actions (dispatched from User Avatar Menu)
  useEffect(() => {
    const handleCustomExport = () => handleExportCSV();
    const handleSync = () => handleSyncNow(null, true);
    const handleSettings = () => setIsSyncModalOpen(true);
    const handleReset = () => handleResetData();
    const handleOpenUserModal = () => setIsUserModalOpen(true);
    const handleBravoSync = () => setIsBravoSyncModalOpen(true);

    window.addEventListener('app_export_csv', handleCustomExport);
    window.addEventListener('app_sync_sheet', handleSync);
    window.addEventListener('app_open_sheet_settings', handleSettings);
    window.addEventListener('app_reset_data', handleReset);
    window.addEventListener('app_open_user_management', handleOpenUserModal);
    window.addEventListener('app_open_bravo_sync', handleBravoSync);

    return () => {
      window.removeEventListener('app_export_csv', handleCustomExport);
      window.removeEventListener('app_sync_sheet', handleSync);
      window.removeEventListener('app_open_sheet_settings', handleSettings);
      window.removeEventListener('app_reset_data', handleReset);
      window.removeEventListener('app_open_user_management', handleOpenUserModal);
      window.removeEventListener('app_open_bravo_sync', handleBravoSync);
    };
  }, [yearTransactions, selectedYear, user]);

  return (
    <div className="space-y-1 sm:space-y-3">
      {/* View Tabs & Fiscal Year Selector: Sticky Below Header khi cuộn trang */}
      <div className="sticky top-[var(--navbar-height,56px)] z-30 bg-slate-50/95 backdrop-blur-md py-1.5 sm:py-2 border-b border-slate-200/90 shadow-2xs -mx-2.5 sm:-mx-6 lg:-mx-8 px-2.5 sm:px-6 lg:px-8 transition-all">
        <div className="flex items-center justify-between gap-1.5">
          {/* Navigation Tabs: Sleek, compact pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleTabChange('DASHBOARD')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'DASHBOARD'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              <span className="sm:hidden">Dashboard</span>
              <span className="hidden sm:inline">Dashboard Điều Hành</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('BUDGETS')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'BUDGETS'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              <span className="sm:hidden">Kế Hoạch</span>
              <span className="hidden sm:inline">Kế Hoạch & Báo Cáo</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('TRANSACTIONS')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              <span>Sổ Cái</span>
            </button>
          </div>

          {/* Right side: Scope indicator & Year Selector */}
          <div className="shrink-0 flex items-center gap-1.5">
            {/* User Expense Scope Badge */}
            {scopeInfo && scopeInfo.id !== 'ALL' && (
              <div
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border shadow-2xs ${scopeInfo.badgeClass}`}
                title={`Phạm vi chi phí: ${scopeInfo.label} • ${scopeInfo.description}`}
              >
                <span>{scopeInfo.iconText}</span>
                <span className="hidden sm:inline">Phạm vi: {scopeInfo.shortLabel}</span>
                <span className="sm:hidden">{scopeInfo.shortLabel}</span>
              </div>
            )}

            <select
              value={isCurrentYearOnlyTab ? currentFiscalYear : selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={isCurrentYearOnlyTab}
              className={`px-1.5 py-0.5 rounded border text-[9.5px] sm:text-xs font-bold shadow-2xs transition-all leading-tight ${
                isCurrentYearOnlyTab
                  ? 'border-blue-300 bg-blue-50/80 text-blue-900 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer'
              }`}
              title={
                isCurrentYearOnlyTab
                  ? `Dashboard và Kế hoạch báo cáo chỉ áp dụng cho năm tài chính hiện tại (${currentFiscalYear})`
                  : 'Chọn năm tài chính'
              }
            >
            {isCurrentYearOnlyTab ? (
              <option value={currentFiscalYear}>
                Năm {currentFiscalYear} (Hiện tại)
              </option>
            ) : (
              <>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Năm {yr}
                  </option>
                ))}
                <option value="ALL">Tất cả năm</option>
              </>
            )}
          </select>
        </div>
      </div>
    </div>

      {/* Tab 1: Executive Dashboard (Macro Analytics, Group breakdown, Cashflow, Top 8, Risk radar) */}
      {activeTab === 'DASHBOARD' && (
        <ExecutiveDashboard
          budgets={scopedBudgets}
          transactions={scopedYearTransactions}
          selectedYear={selectedYear}
          onNavigateToBudgets={() => handleTabChange('BUDGETS')}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            handleTabChange('TRANSACTIONS');
          }}
          onOpenAccountDetail={(account) => {
            const foundBudget = scopedBudgets.find(
              (b) => String(b.code || '').trim() === String(account?.code || '').trim()
            );
            setSelectedDetailAccount(foundBudget ? { ...foundBudget, ...account } : account);
          }}
        />
      )}

      {/* Tab 2: Master Budgets Table for this Fiscal Year */}
      {activeTab === 'BUDGETS' && (
        <BudgetOverview
          budgets={scopedBudgets}
          transactions={scopedYearTransactions}
          selectedYear={selectedYear}
          user={user}
          onUpdateBudgets={canEditBudgetsPlan ? (newBudgets) => {
            setBudgets(newBudgets);
            localStorage.setItem('app_budgets_v3', JSON.stringify(newBudgets));
          } : null}
          onOpenBravoSync={() => setIsBravoSyncModalOpen(true)}
          onAddTransaction={canAddTx ? handleAddTransaction : null}
          onUpdateTransaction={canEditTx ? handleUpdateTransaction : null}
          onDeleteTransaction={canDeleteTx ? handleDeleteTransaction : null}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            handleTabChange('TRANSACTIONS');
          }}
        />
      )}

      {/* Tab 3: Full Width Transactions List */}
      {activeTab === 'TRANSACTIONS' && (
        <TransactionList
          transactions={scopedYearTransactions}
          budgets={scopedBudgets}
          onAddTransaction={canAddTx ? handleAddTransaction : null}
          onUpdateTransaction={canEditTx ? handleUpdateTransaction : null}
          onDeleteTransaction={canDeleteTx ? handleDeleteTransaction : null}
          selectedYear={selectedYear}
          selectedCategory={selectedLedgerAccount}
          onSelectCategory={setSelectedLedgerAccount}
        />
      )}

      {/* Account Ledger Modal for Executive Dashboard drilldown */}
      {selectedDetailAccount && (
        <AccountLedgerModal
          isOpen={Boolean(selectedDetailAccount)}
          account={selectedDetailAccount}
          transactions={scopedYearTransactions}
          budgets={scopedBudgets}
          selectedYear={selectedYear}
          onClose={() => setSelectedDetailAccount(null)}
          onAddTransaction={canAddTx ? handleAddTransaction : null}
          onUpdateTransaction={canEditTx ? handleUpdateTransaction : null}
          onDeleteTransaction={canDeleteTx ? handleDeleteTransaction : null}
          onNavigateToLedger={(accountCode) => {
            setSelectedDetailAccount(null);
            setSelectedLedgerAccount(accountCode);
            handleTabChange('TRANSACTIONS');
          }}
        />
      )}

      {/* Tab 4: BRAVO Reconciliation & Macro Airport View */}
      {activeTab === 'BRAVO_RECON' && (
        <BravoReconciliation
          budgets={scopedBudgets}
          transactions={scopedYearTransactions}
          selectedYear={selectedYear}
          bravoInfo={scopedBravoInfo}
          onOpenBravoSync={() => setIsBravoSyncModalOpen(true)}
          onAddTransaction={canAddTx ? handleAddTransaction : null}
          onUpdateTransaction={canEditTx ? handleUpdateTransaction : null}
          onDeleteTransaction={canDeleteTx ? handleDeleteTransaction : null}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            handleTabChange('TRANSACTIONS');
          }}
        />
      )}

      {/* Google Sheets Sync Settings Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncSuccess={(data) => {
          if (data?.transactions) setTransactions(data.transactions);
          if (data?.budgets) setBudgets(data.budgets);
          if (data?.bravoInfo) setBravoInfo(data.bravoInfo);
          setHasWebhook(true);
        }}
      />

      {/* BRAVO Excel Sync Modal */}
      <BravoSyncModal
        isOpen={isBravoSyncModalOpen}
        onClose={() => setIsBravoSyncModalOpen(false)}
        user={user}
        budgets={budgets}
        selectedYear={selectedYear}
        onUpdateBudgets={setBudgets}
        onUpdateBravoInfo={setBravoInfo}
        onRefreshAll={() => handleSyncNow(null, false)}
      />

      {/* User Management RBAC Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={user}
      />
    </div>
  );
}
