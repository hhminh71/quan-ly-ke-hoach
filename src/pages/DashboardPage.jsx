import React, { useState, useEffect, useMemo } from 'react';
import StatCards from '../components/StatCards';
import TransactionForm from '../components/TransactionForm';
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
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'BUDGETS', 'TRANSACTIONS'

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

  // Format today in Vietnamese format
  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize">{todayFormatted}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hệ Thống Quản Lý Kế Hoạch & Chi Phí Doanh Nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-700">76 Khoản mục kế hoạch</span> •{' '}
            <span className="font-semibold text-blue-600">
              {selectedYear === 'ALL'
                ? `Toàn bộ ${transactions.length.toLocaleString('vi-VN')} phiếu chi`
                : `${yearTransactions.length.toLocaleString('vi-VN')} Phiếu chi năm ${selectedYear}`}
            </span>
          </p>
        </div>

        {/* Action Controls & Fiscal Year Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* FISCAL YEAR SELECTOR BADGE */}
          <div className="flex items-center gap-1.5 p-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl shadow-xs">
            <div className="flex items-center gap-1 pl-2 text-blue-700 text-xs font-bold">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Năm tài chính:</span>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all cursor-pointer shadow-2xs"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Năm {yr} ({transactions.filter((t) => t.date && t.date.startsWith(yr)).length} phiếu)
                </option>
              ))}
              <option value="ALL">Tất cả các năm ({transactions.length} phiếu)</option>
            </select>
          </div>

          {/* Google Sheets Sync Pill */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSyncNow()}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                hasWebhook
                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title={hasWebhook ? 'Đồng bộ lại từ Google Sheet' : 'Bấm để cấu hình kết nối Google Sheet'}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Đang đồng bộ...</span>
                </>
              ) : hasWebhook ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Google Sheet: Online</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Nối Google Sheet</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Cài đặt kết nối Google Sheet"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all"
            title="Khôi phục lại dữ liệu gốc từ Excel"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Nạp lại gốc</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
            title={`Xuất báo cáo năm ${selectedYear} ra file Excel / CSV`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV ({selectedYear})</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards (Strictly for the selected fiscal year) */}
      <StatCards transactions={yearTransactions} budgets={budgets} selectedYear={selectedYear} />

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Bàn Làm Việc & Nhập Liệu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BUDGETS')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'BUDGETS'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Kế Hoạch & Báo Cáo Chi Phí ({budgets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>
            Sổ Cái Năm {selectedYear} ({yearTransactions.length.toLocaleString('vi-VN')})
          </span>
        </button>
      </div>

      {/* Tab 1: Form & List Side-by-Side */}
      {activeTab === 'ALL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 xl:col-span-4">
            <TransactionForm
              onAddTransaction={handleAddTransaction}
              budgets={budgets}
              transactions={yearTransactions}
              selectedYear={selectedYear}
            />
          </div>
          <div className="lg:col-span-7 xl:col-span-8">
            <TransactionList
              transactions={yearTransactions}
              budgets={budgets}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              selectedYear={selectedYear}
              selectedCategory={selectedLedgerAccount}
              onSelectCategory={setSelectedLedgerAccount}
            />
          </div>
        </div>
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
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          selectedYear={selectedYear}
          selectedCategory={selectedLedgerAccount}
          onSelectCategory={setSelectedLedgerAccount}
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
