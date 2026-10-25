import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, RefreshCw, ExternalLink, Check, Copy, AlertCircle } from 'lucide-react';
import { getSavedWebhookUrl, saveWebhookUrl, fetchFromGoogleSheet } from '../services/googleSheetService';

export default function SyncModal({ isOpen, onClose, onSyncSuccess }) {
  const [url, setUrl] = useState(() => getSavedWebhookUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: true/false, message: '' }
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setTestResult(null);

    const cleanUrl = url.trim();
    if (!cleanUrl) {
      saveWebhookUrl('');
      setTestResult({ success: true, message: 'Đã xóa cấu hình Google Sheet (sử dụng chế độ cục bộ)' });
      return;
    }

    if (!cleanUrl.startsWith('https://script.google.com')) {
      setTestResult({
        success: false,
        message: 'URL không hợp lệ. Phải bắt đầu bằng: https://script.google.com/.../exec',
      });
      return;
    }

    setIsTesting(true);
    try {
      const data = await fetchFromGoogleSheet(cleanUrl);
      saveWebhookUrl(cleanUrl);
      setTestResult({
        success: true,
        message: `Kết nối thành công! Đã tìm thấy ${data.transactions?.length || 0} phiếu chi trên Google Sheet.`,
      });
      if (onSyncSuccess) {
        onSyncSuccess(data);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Không thể kết nối: ${err.message}. Hãy kiểm tra xem quyền truy cập Apps Script đã để "Bất kỳ ai (Anyone)" chưa.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyGuide = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Cấu Hình Đồng Bộ Google Sheets</h3>
              <p className="text-xs text-slate-500">Kết nối tự động 2 chiều giữa Web App và Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                URL Webhook Google Apps Script (Web App URL):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Để trống nếu bạn muốn quay lại chế độ chạy hoàn toàn Offline (bộ nhớ cục bộ).
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{testResult.message}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra kết nối...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Lưu & Kiểm Tra Kết Nối</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Guide Box */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <span>📖 3 bước lấy URL Webhook Google Sheet (miễn phí):</span>
              </span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed pl-1">
              <li>
                Mở Google Sheets $\rightarrow$ Chọn menu <strong>Tiện ích mở rộng (Extensions)</strong> $\rightarrow$ <strong>Apps Script</strong>.
              </li>
              <li>
                Dán toàn bộ mã nguồn từ file <code className="bg-slate-200 px-1 rounded text-slate-800">google-apps-script/Code.gs</code> vào và bấm <strong>Lưu (Ctrl+S)</strong>.
              </li>
              <li>
                Bấm <strong>Triển khai (Deploy)</strong> $\rightarrow$ <strong>Tùy chọn triển khai mới</strong> $\rightarrow$ Chọn <strong>Ứng dụng web (Web app)</strong> $\rightarrow$ Đặt mục <em>"Ai có quyền truy cập"</em> thành <strong>"Bất kỳ ai (Anyone)"</strong> $\rightarrow$ Sao chép URL rồi dán vào ô bên trên!
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
