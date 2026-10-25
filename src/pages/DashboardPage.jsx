import React, { useState, useEffect } from 'react';
import StatCards from '../components/StatCards';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import BudgetOverview from '../components/BudgetOverview';
import SyncModal from '../components/SyncModal';
import { Calendar, Download, RefreshCw, LayoutDashboard, ListOrdered, FileSpreadsheet, Cloud, CheckCircle2, Settings } from 'lucide-react';
import initialBudgets from '../data/budgets.json';
import initialTransactions from '../data/transactions.json';
import {
  getSavedWebhookUrl,
  fetchFromGoogleSheet,
  addTransactionToGoogleSheet,
  deleteTransactionFromGoogleSheet,
  getLastSyncTime,
} from '../services/googleSheetService';

export default function DashboardPage({ user }) {
  // Load saved transactions from localStorage or default to imported real data
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('app_transactions_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialTransactions;
  });

  const [budgets, setBudgets] = useState(initialBudgets);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'BUDGETS', 'TRANSACTIONS'

  // Google Sheets sync states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasWebhook, setHasWebhook] = useState(() => Boolean(getSavedWebhookUrl()));
  const [lastSyncTime, setLastSyncTimeState] = useState(() => getLastSyncTime());

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_transactions_v2', JSON.stringify(transactions));
    } catch (e) {
      console.error('Storage full or error', e);
    }
  }, [transactions]);

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

  const handleResetData = () => {
    if (confirm('Khôi phục toàn bộ danh sách 1.216 giao dịch thực tế từ file Excel gốc?')) {
      setTransactions(initialTransactions);
      localStorage.removeItem('app_transactions_v2');
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }
    const headers = 'ID,MaKhoanMuc,DanhMuc,Nhom,Ngay,NguoiThucHien,SoTien,GhiChu\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.accountCode || ''}","${(t.category || '').replace(/"/g, '""')}","${(t.group || '').replace(/"/g, '""')}","${t.date || ''}","${(t.employeeName || '').replace(/"/g, '""')}","${t.amount || 0}","${(t.notes || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-ke-hoach-chi-phi-${new Date().toISOString().split('T')[0]}.csv`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize">{todayFormatted}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hệ Thống Quản Lý Kế Hoạch & Chi Phí Doanh Nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-700">76 Khoản mục ngân sách</span> •{' '}
            <span className="font-semibold text-slate-700">{transactions.length.toLocaleString('vi-VN')} Phiếu chi thực tế</span>
          </p>
        </div>

        {/* Sync Status & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
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
            title="Xuất toàn bộ danh sách ra file Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <StatCards transactions={transactions} budgets={budgets} />

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
          <span>Định Mức Ngân Sách ({budgets.length})</span>
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
          <span>Sổ Cái Toàn Bộ ({transactions.length.toLocaleString('vi-VN')})</span>
        </button>
      </div>

      {/* Tab 1: Form & List Side-by-Side */}
      {activeTab === 'ALL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 xl:col-span-4">
            <TransactionForm onAddTransaction={handleAddTransaction} budgets={budgets} />
          </div>
          <div className="lg:col-span-7 xl:col-span-8">
            <TransactionList
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Master Budgets Table */}
      {activeTab === 'BUDGETS' && (
        <BudgetOverview budgets={budgets} transactions={transactions} />
      )}

      {/* Tab 3: Full Width Transactions List */}
      {activeTab === 'TRANSACTIONS' && (
        <TransactionList
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
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
