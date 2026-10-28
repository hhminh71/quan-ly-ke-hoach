import React, { useState, useEffect, useMemo } from 'react';
import ExecutiveDashboard from '../components/ExecutiveDashboard';
import AccountLedgerModal from '../components/AccountLedgerModal';
import TransactionList from '../components/TransactionList';
import BudgetOverview from '../components/BudgetOverview';
import SyncModal from '../components/SyncModal';
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
    return initialTransactions;
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
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith('#ke-hoach') || hash.startsWith('#budgets')) return 'BUDGETS';
    if (hash.startsWith('#so-cai') || hash.startsWith('#transactions') || hash.startsWith('#ledger')) return 'TRANSACTIONS';
    if (hash.startsWith('#doi-soat') || hash.startsWith('#bravo')) return 'BRAVO_RECON';
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
    const hash = getHashFromTab(newTab);
    if (replace) {
      window.history.replaceState({ tab: newTab }, '', hash);
    } else {
      window.history.pushState({ tab: newTab }, '', hash);
    }
  };

  // Đồng bộ điều hướng Tab với Browser History (Nút Back trên điện thoại)
  useEffect(() => {
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
  }, []);

  // Selected account for drilldown modal
  const [selectedDetailAccount, setSelectedDetailAccount] = useState(null);

  // Fiscal Year Selection
  const [selectedYear, setSelectedYear] = useState('2026');

  // Active Account Filter for Ledger (synchronized across tabs)
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState('ALL');

  // Google Sheets sync states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasWebhook, setHasWebhook] = useState(() => Boolean(getSavedWebhookUrl()));
  const [lastSyncTime, setLastSyncTimeState] = useState(() => getLastSyncTime());

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
        alert(`Đồng bộ thành công! Đã nạp ${data.transactions?.length || 0} phiếu chi và số liệu đối soát Bravo từ Google Sheet.`);
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
    if (confirm('Khôi phục toàn bộ danh sách 1.216 giao dịch thực tế (2024, 2025, 2026) từ file gốc?')) {
      setTransactions(initialTransactions);
      localStorage.removeItem('app_transactions_v4');
      localStorage.removeItem('app_transactions_v3');
      localStorage.removeItem('app_transactions_v2');
      localStorage.removeItem('app_transactions');
    }
  };

  const handleExportCSV = () => {
    if (yearTransactions.length === 0) {
      alert(`Không có dữ liệu năm ${selectedYear} để xuất.`);
      return;
    }
    const headers = 'ID,Nam,MaKhoanMuc,DanhMuc,Nhom,Ngay,NguoiThucHien,SoTien,GhiChu\n';
    const rows = yearTransactions
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

    window.addEventListener('app_export_csv', handleCustomExport);
    window.addEventListener('app_sync_sheet', handleSync);
    window.addEventListener('app_open_sheet_settings', handleSettings);
    window.addEventListener('app_reset_data', handleReset);

    return () => {
      window.removeEventListener('app_export_csv', handleCustomExport);
      window.removeEventListener('app_sync_sheet', handleSync);
      window.removeEventListener('app_open_sheet_settings', handleSettings);
      window.removeEventListener('app_reset_data', handleReset);
    };
  }, [yearTransactions, selectedYear]);

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* View Tabs & Fiscal Year Selector in One Single Elegant Line */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('DASHBOARD')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'DASHBOARD'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="sm:hidden">Dashboard</span>
            <span className="hidden sm:inline">Dashboard Điều Hành</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('BUDGETS')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'BUDGETS'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="sm:hidden">Kế Hoạch</span>
            <span className="hidden sm:inline">Kế Hoạch & Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('TRANSACTIONS')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Sổ Cái</span>
          </button>
        </div>

        {/* ONLY Year Selector: Clean and Prominent */}
        <div className="shrink-0 flex items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer shadow-2xs transition-all"
            title="Chọn năm tài chính"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Năm {yr}
              </option>
            ))}
            <option value="ALL">Tất cả năm</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Executive Dashboard (Macro Analytics, Group breakdown, Cashflow, Top 8, Risk radar) */}
      {activeTab === 'DASHBOARD' && (
        <ExecutiveDashboard
          budgets={budgets}
          transactions={yearTransactions}
          selectedYear={selectedYear}
          onNavigateToBudgets={() => handleTabChange('BUDGETS')}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            handleTabChange('TRANSACTIONS');
          }}
          onOpenAccountDetail={(account) => {
            setSelectedDetailAccount(account);
          }}
        />
      )}

      {/* Tab 2: Master Budgets Table for this Fiscal Year */}
      {activeTab === 'BUDGETS' && (
        <BudgetOverview
          budgets={budgets}
          transactions={yearTransactions}
          selectedYear={selectedYear}
          onUpdateBudgets={(newBudgets) => {
            setBudgets(newBudgets);
            localStorage.setItem('app_budgets_v3', JSON.stringify(newBudgets));
          }}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            handleTabChange('TRANSACTIONS');
          }}
        />
      )}

      {/* Tab 3: Full Width Transactions List */}
      {activeTab === 'TRANSACTIONS' && (
        <TransactionList
          transactions={yearTransactions}
          budgets={budgets}
          onAddTransaction={handleAddTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
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
          transactions={yearTransactions}
          budgets={budgets}
          selectedYear={selectedYear}
          onClose={() => setSelectedDetailAccount(null)}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
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
          budgets={budgets}
          transactions={yearTransactions}
          selectedYear={selectedYear}
          bravoInfo={bravoInfo}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
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
    </div>
  );
}
