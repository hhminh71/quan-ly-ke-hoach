import React, { useState } from 'react';
import StatCards from '../components/StatCards';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import { Calendar, Download, RefreshCw } from 'lucide-react';

const INITIAL_TRANSACTIONS = [
  {
    id: 1,
    date: '2026-10-21',
    employeeName: 'Nguyễn Văn An',
    amount: 1450000,
    category: 'Văn phòng phẩm',
    notes: 'Mua giấy in A4 Double A, mực máy in văn phòng và bút ký',
    createdAt: '09:15',
  },
  {
    id: 2,
    date: '2026-10-21',
    employeeName: 'Trần Thị Bích',
    amount: 3200000,
    category: 'Tiếp khách đối tác',
    notes: 'Tiếp đoàn đối tác khách hàng ký kết hợp đồng quý 4',
    createdAt: '11:30',
  },
  {
    id: 3,
    date: '2026-10-20',
    employeeName: 'Lê Hoàng Nam',
    amount: 850000,
    category: 'Công tác phí & Đi lại',
    notes: 'Chi phí taxi và phụ cấp công tác khảo sát thị trường Hải Phòng',
    createdAt: '16:45',
  },
  {
    id: 4,
    date: '2026-10-19',
    employeeName: 'Phạm Minh Tuấn',
    amount: 2500000,
    category: 'Thiết bị & Công cụ',
    notes: 'Nâng cấp bàn phím cơ và ổ cứng SSD cho phòng kỹ thuật',
    createdAt: '14:20',
  },
];

export default function DashboardPage({ user }) {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  const handleAddTransaction = (newRecord) => {
    setTransactions((prev) => [newRecord, ...prev]);
  };

  const handleDeleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetSampleData = () => {
    if (confirm('Khôi phục danh sách dữ liệu mẫu ban đầu?')) {
      setTransactions(INITIAL_TRANSACTIONS);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }
    const headers = 'ID,Ngay,NhanVien,SoTien,DanhMuc,GhiChu\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.date}","${t.employeeName}","${t.amount}","${t.category}","${t.notes.replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-thu-chi-${new Date().toISOString().split('T')[0]}.csv`);
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
            Bảng Điều Khiển Quản Lý
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xin chào, <span className="font-semibold text-slate-700">{user?.name || 'Quản trị viên'}</span>! Chúc bạn một ngày làm việc hiệu quả.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetSampleData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all"
            title="Nạp lại dữ liệu mẫu"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Dữ liệu mẫu</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
            title="Xuất danh sách ra file Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <StatCards transactions={transactions} />

      {/* Main Grid: Form (left on large screens) & Table (right/full width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-5 xl:col-span-4">
          <TransactionForm onAddTransaction={handleAddTransaction} />
        </div>

        {/* List Table Column */}
        <div className="lg:col-span-7 xl:col-span-8">
          <TransactionList
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
      </div>
    </div>
  );
}
