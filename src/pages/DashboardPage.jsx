import React, { useState, useEffect, useMemo } from 'react';
import ExecutiveDashboard from '../components/ExecutiveDashboard';
import AccountLedgerModal from '../components/AccountLedgerModal';
import TransactionList from '../components/TransactionList';
import BudgetOverview from '../components/BudgetOverview';
import SyncModal from '../components/SyncModal';
import {
  Calendar,
  Download,
  RefreshCw,
  LayoutDashboard,
  ListOrdered,
  FileSpreadsheet,
  Cloud,
  CheckCircle2,
  Settings,
  CalendarDays,
  Sparkles,
  Scale,
} from 'lucide-react';
import initialBudgets from '../data/budgets.json';
import initialTransactions from '../data/transactions.json';
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
      const saved = localStorage.getItem('app_transactions_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((t, idx) => ({
            id: t.id || idx + 1,
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
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD', 'BUDGETS', 'TRANSACTIONS'

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
      if (t.date && t.date.length >= 4) {
        const y = t.date.substring(0, 4);
        if (/^\d{4}$/.test(y)) yearSet.add(y);
      }
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
    return transactions.filter((t) => t.date && t.date.startsWith(selectedYear));
  }, [transactions, selectedYear]);

  // Sync transactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_transactions_v2', JSON.stringify(transactions));
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
      setHasWebhook(true);
      setLastSyncTimeState(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      if (showAlert) {
        alert(`Đồng bộ thành công! Đã nạp ${data.transactions?.length || 0} phiếu từ Google Sheet.`);
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
    // 1. Cập nhật state cục bộ ngay lập tức
    setTransactions((prev) => [newRecord, ...prev]);

    // 2. Gửi ngầm lên Google Sheet nếu đã kết nối
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      addTransactionToGoogleSheet(webhookUrl, newRecord);
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
    // 1. Cập nhật state cục bộ ngay lập tức
    setTransactions((prev) =>
      prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
    );

    // 2. Gửi ngầm cập nhật trực tiếp lên Google Sheet qua webhook
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      updateTransactionInGoogleSheet(webhookUrl, updatedRecord);
    }
  };

  const handleResetData = () => {
    if (confirm('Khôi phục toàn bộ danh sách 1.216 giao dịch thực tế (2024, 2025, 2026) từ file gốc?')) {
      setTransactions(initialTransactions);
      localStorage.removeItem('app_transactions_v2');
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

  // Event listener for Header Export Button
  useEffect(() => {
    const handleCustomExport = () => {
      handleExportCSV();
    };
    window.addEventListener('app_export_csv', handleCustomExport);
    return () => window.removeEventListener('app_export_csv', handleCustomExport);
  }, [yearTransactions, selectedYear]);

  // Format today in Vietnamese format
  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const mobileDateStr = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-2.5 sm:space-y-6">
      {/* Top Action Toolbar: Ultra-slim Single Line */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 sm:pb-2 border-b border-slate-200/70 text-xs">
        {/* Info summary */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-700">{selectedYear === 'ALL' ? 'Tất cả' : selectedYear}</span>
          <span>•</span>
          <span className="text-slate-600">{budgets.length} mục</span>
          <span>•</span>
          <span className="font-semibold text-blue-600">{yearTransactions.length} phiếu</span>
        </div>

        {/* Action Controls & Fiscal Year Selector: Ultra-compact, single line */}
        <div className="flex items-center gap-1">
          {/* Year select: sleek, compact */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer shadow-2xs"
            title="Chọn năm tài chính"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Năm {yr}
              </option>
            ))}
            <option value="ALL">Tất cả năm</option>
          </select>

          {/* Google Sheets Sync: Slim pill */}
          <button
            type="button"
            onClick={() => (hasWebhook ? handleSyncNow() : setIsSyncModalOpen(true))}
            disabled={isSyncing}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all border shadow-2xs ${
              hasWebhook
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={hasWebhook ? 'Bấm để đồng bộ lại dữ liệu từ Google Sheet' : 'Bấm để kết nối Google Sheet'}
          >
            {isSyncing ? (
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-600" />
            ) : hasWebhook ? (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            ) : (
              <Cloud className="w-2.5 h-2.5 text-slate-400" />
            )}
            <span>{hasWebhook ? 'Sheet' : 'Nối Sheet'}</span>
          </button>

          {/* Sheet Settings Gear */}
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cài đặt kết nối Google Sheet"
          >
            <Settings className="w-3 h-3" />
          </button>

          {/* Reload Original Data */}
          <button
            type="button"
            onClick={handleResetData}
            className="p-1 rounded bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 shadow-2xs transition-all"
            title="Khôi phục dữ liệu gốc từ Excel"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          {/* Export CSV: Sleek slim button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-1 sm:px-2 sm:py-0.5 rounded text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs inline-flex items-center gap-1 transition-all"
            title={`Xuất dữ liệu năm ${selectedYear} ra file CSV`}
          >
            <Download className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* View Tabs - Smooth Horizontal Scroll on Mobile */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'DASHBOARD'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="sm:hidden">Dashboard</span>
          <span className="hidden sm:inline">Dashboard Điều Hành</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BUDGETS')}
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'BUDGETS'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="sm:hidden">Kế Hoạch ({budgets.length})</span>
          <span className="hidden sm:inline">Kế Hoạch & Báo Cáo ({budgets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="sm:hidden">Sổ Cái ({yearTransactions.length})</span>
          <span className="hidden sm:inline">
            Sổ Cái Phiếu Chi ({yearTransactions.length.toLocaleString('vi-VN')})
          </span>
        </button>
      </div>

      {/* Tab 1: Executive Dashboard (Macro Analytics, Group breakdown, Cashflow, Top 8, Risk radar) */}
      {activeTab === 'DASHBOARD' && (
        <ExecutiveDashboard
          budgets={budgets}
          transactions={yearTransactions}
          selectedYear={selectedYear}
          onNavigateToBudgets={() => setActiveTab('BUDGETS')}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            setActiveTab('TRANSACTIONS');
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
            setActiveTab('TRANSACTIONS');
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
            setActiveTab('TRANSACTIONS');
          }}
        />
      )}

      {/* Tab 4: BRAVO Reconciliation & Macro Airport View */}
      {activeTab === 'BRAVO_RECON' && (
        <BravoReconciliation
          budgets={budgets}
          transactions={yearTransactions}
          selectedYear={selectedYear}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onNavigateToLedger={(accountCode) => {
            setSelectedLedgerAccount(accountCode);
            setActiveTab('TRANSACTIONS');
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
          setHasWebhook(true);
        }}
      />
    </div>
  );
}
