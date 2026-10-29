import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  TableProperties,
  BarChart3,
  FileText,
  Calendar,
  Layers,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import {
  exportProgressReportExcel,
  exportMatrixReportExcel,
  exportProgressReportCSV,
} from '../utils/excelExport';
import { getUserScopeInfo } from '../utils/permissions';

export default function ExportReportModal({
  isOpen,
  onClose,
  budgets = [],
  filteredBudgets = [],
  summary = {},
  selectedYear = '2026',
  matrixYears = ['2024', '2025', '2026', '2027'],
  user = null,
  currentViewMode = 'PROGRESS',
}) {
  const [reportType, setReportType] = useState(
    currentViewMode === 'MATRIX' ? 'MATRIX' : 'PROGRESS'
  );
  const [dataScope, setDataScope] = useState('ALL_SCOPED'); // 'ALL_SCOPED' (Toàn bộ khoản mục được phân quyền) | 'FILTERED' (Chỉ danh sách đang lọc)
  const [isExporting, setIsExporting] = useState(false);

  useModalBackHandler(isOpen, onClose, 'export-report');

  if (!isOpen) return null;

  const scopeInfo = getUserScopeInfo(user);
  const itemsToExport = dataScope === 'FILTERED' ? filteredBudgets : budgets;

  const handleExport = (format = 'EXCEL') => {
    setIsExporting(true);

    try {
      if (reportType === 'PROGRESS') {
        if (format === 'CSV') {
          exportProgressReportCSV({
            items: itemsToExport,
            selectedYear,
          });
        } else {
          exportProgressReportExcel({
            items: itemsToExport,
            summary,
            selectedYear,
            user,
            scopeInfo,
          });
        }
      } else {
        exportMatrixReportExcel({
          items: itemsToExport,
          matrixYears,
          user,
          scopeInfo,
        });
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo file xuất báo cáo: ' + err.message);
      setIsExporting(false);
    }
  };

  const totalApproved = itemsToExport.reduce(
    (sum, b) => sum + (Number(b.selectedYearApproved || b.approvedAmount) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-emerald-200 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5 leading-tight">
                <span>Xuất Báo Cáo Kế Hoạch & Chi Phí</span>
              </h3>
              <p className="text-[11px] text-emerald-100/80">
                Xuất file Excel bảng chuẩn định dạng Google Sheet / Kế toán ACV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Section 1: Choose Report Template */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn mẫu bảng báo cáo cần xuất:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Progress Report */}
              <button
                type="button"
                onClick={() => setReportType('PROGRESS')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reportType === 'PROGRESS'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/30'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <span>Tiến Độ Kế Hoạch {selectedYear}</span>
                    </span>
                    {reportType === 'PROGRESS' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Đầy đủ 12 cột: Hạn mức duyệt, Bravo, Thực tế, Chi phí Báo cáo Max, Số dư còn lại & Tỷ lệ % tiến độ.
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-700">
                  ★ Khuyên dùng cho giao ban & đối soát
                </div>
              </button>

              {/* Option 2: Multi-year Matrix */}
              <button
                type="button"
                onClick={() => setReportType('MATRIX')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reportType === 'MATRIX'
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/30'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <TableProperties className="w-4 h-4 text-indigo-600" />
                      <span>Ma Trận Ngân Sách Đa Năm</span>
                    </span>
                    {reportType === 'MATRIX' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Chuẩn 100% mẫu trang tính Google Sheet <strong className="text-slate-700">KE_HOACH_NGAN_SACH</strong> ({matrixYears.join(', ')}).
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-semibold text-indigo-700">
                  ★ Khuyên dùng cho quy hoạch ngân sách
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Choose Data Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Phạm vi dữ liệu xuất:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDataScope('ALL_SCOPED')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  dataScope === 'ALL_SCOPED'
                    ? 'bg-blue-50 text-blue-800 border-blue-400 font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Toàn bộ danh mục ({budgets.length} khoản mục)
              </button>
              <button
                type="button"
                onClick={() => setDataScope('FILTERED')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  dataScope === 'FILTERED'
                    ? 'bg-blue-50 text-blue-800 border-blue-400 font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Chỉ danh sách đang lọc ({filteredBudgets.length} khoản mục)
              </button>
            </div>
          </div>

          {/* Summary Box Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>Số lượng khoản mục xuất:</span>
              <span className="font-bold text-slate-900">{itemsToExport.length} khoản mục</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Hạn mức ngân sách tổng:</span>
              <span className="font-bold text-emerald-700">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalApproved)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Phân quyền tài khoản:</span>
              <span className="font-semibold text-slate-800">{scopeInfo.shortLabel}</span>
            </div>
          </div>

          {/* Standards notice */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-[11px] text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Đạt chuẩn định dạng:</strong> File Excel được kẻ bảng sẵn, font chữ chuẩn kế toán ACV, màu sắc tiêu đề xanh lá trùng khớp Google Sheet, các ô tiền tệ có định dạng số để tính công thức ngay lập tức.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleExport('CSV')}
            disabled={isExporting || itemsToExport.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
            title="Tải định dạng văn bản CSV nhẹ"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Tải CSV</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => handleExport('EXCEL')}
              disabled={isExporting || itemsToExport.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang kết xuất...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Tải File Excel (.xls)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
