import React, { useState, useRef } from 'react';
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Database,
  Cloud,
  Clock,
  Sparkles,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { parseBravoExcelBuffer } from '../utils/bravoParser';
import {
  syncBravoInfoToGoogleSheet,
  fetchBravoFromDrive,
  getSavedWebhookUrl,
} from '../services/googleSheetService';
import { formatVND } from '../utils/formatters';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

export default function BravoSyncModal({
  isOpen,
  onClose,
  budgets = [],
  onUpdateBudgets,
  onUpdateBravoInfo,
  onRefreshAll,
}) {
  useModalBackHandler(isOpen, onClose, 'bravo-sync-modal');

  const fileInputRef = useRef(null);
  
  // Sync source mode: 'DRIVE_LINK' (Khuyên dùng) or 'LOCAL_FILE'
  const [syncSourceMode, setSyncSourceMode] = useState('DRIVE_LINK');
  
  // Google Drive link state
  const [driveFolderUrl, setDriveFolderUrl] = useState(() => {
    return localStorage.getItem('app_bravo_drive_url') || '';
  });
  const [isLoadingFromDrive, setIsLoadingFromDrive] = useState(false);
  const [driveFileInfo, setDriveFileInfo] = useState(null);

  // Local file state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  // Sync execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState(null);
  const [syncToSheet, setSyncToSheet] = useState(true);

  if (!isOpen) return null;

  // Process a local File object
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processLocalFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processLocalFile(file);
  };

  const processLocalFile = async (file) => {
    setSelectedFile(file);
    setDriveFileInfo(null);
    setParseError(null);
    setSyncSuccessMessage(null);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseBravoExcelBuffer(buffer, file.name);
      setParseResult(result);
    } catch (err) {
      console.error('Error parsing Bravo Excel:', err);
      setParseError(err.message || 'Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Process directly from Google Drive Web Link via Apps Script Webhook
  const handleLoadFromDrive = async () => {
    const inputUrl = driveFolderUrl ? driveFolderUrl.trim() : '';
    if (!inputUrl) {
      setParseError('Vui lòng nhập Link thư mục Google Drive (hoặc link file).');
      return;
    }

    try {
      localStorage.setItem('app_bravo_drive_url', inputUrl);
    } catch (e) {}

    const webhookUrl = getSavedWebhookUrl();
    if (!webhookUrl) {
      setParseError(
        'Chưa kết nối Webhook Google Sheet. Bạn vui lòng vào Menu avatar -> Cài đặt kết nối Google Sheet để dán link Webhook trước khi đồng bộ từ Google Drive.'
      );
      return;
    }

    setIsLoadingFromDrive(true);
    setParseError(null);
    setSyncSuccessMessage(null);
    setParseResult(null);
    setSelectedFile(null);

    try {
      const driveRes = await fetchBravoFromDrive(webhookUrl, inputUrl);
      if (!driveRes || !driveRes.base64) {
        throw new Error('Không nhận được dữ liệu file từ Google Drive.');
      }

      setDriveFileInfo({
        fileName: driveRes.fileName,
        folderName: driveRes.folderName,
        lastUpdated: driveRes.lastUpdated,
        fileSize: driveRes.fileSize,
      });

      // Decode base64 to binary ArrayBuffer
      const binaryStr = atob(driveRes.base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const buffer = bytes.buffer;

      const result = await parseBravoExcelBuffer(buffer, driveRes.fileName);
      setParseResult(result);
    } catch (err) {
      console.error('Error fetching/parsing from Drive:', err);
      setParseError(err.message || 'Lỗi khi tải hoặc đọc file từ Google Drive.');
      setParseResult(null);
      setDriveFileInfo(null);
    } finally {
      setIsLoadingFromDrive(false);
    }
  };

  const handleConfirmSync = async () => {
    if (!parseResult || !parseResult.items) return;

    setIsSubmitting(true);
    setParseError(null);

    try {
      const { items, validAccounts, summary } = parseResult;

      // 1. Cập nhật state nội bộ và localStorage cho bravoInfo
      if (onUpdateBravoInfo) {
        onUpdateBravoInfo(items);
      }
      try {
        localStorage.setItem('app_bravo_info_v2', JSON.stringify(items));
      } catch (e) {
        console.warn(e);
      }

      // 2. Cập nhật số thực hiện Bravo vào từng khoản mục kế hoạch (budgets)
      const codeToBravo = {};
      validAccounts.forEach((it) => {
        if (it.code) {
          codeToBravo[String(it.code).trim()] = it.bravoAmount;
        }
      });

      if (onUpdateBudgets) {
        const updatedBudgets = budgets.map((b) => {
          const c = String(b.code || '').trim();
          if (codeToBravo[c] !== undefined) {
            return {
              ...b,
              bravoActual: codeToBravo[c],
            };
          }
          return b;
        });

        onUpdateBudgets(updatedBudgets);
        try {
          localStorage.setItem('app_budgets_v3', JSON.stringify(updatedBudgets));
        } catch (e) {
          console.warn(e);
        }
      }

      // 3. Đồng bộ lên Google Sheet (tab INFO) nếu được chọn
      let sheetMsg = '';
      if (syncToSheet) {
        const webhookUrl = getSavedWebhookUrl();
        if (webhookUrl) {
          try {
            await syncBravoInfoToGoogleSheet(webhookUrl, items, summary.syncTime);
            sheetMsg = ' và tab INFO trên Google Sheet';
          } catch (sheetErr) {
            console.warn('Lỗi đồng bộ Google Sheet Webhook:', sheetErr);
            sheetMsg = ' (Lưu ý: Chưa thể kết nối Webhook Google Sheet)';
          }
        }
      }

      setSyncSuccessMessage(
        `Đã đồng bộ thành công ${validAccounts.length} tài khoản kế toán với tổng chi phí ${formatVND(
          summary.totalBravoAmount
        )} vào Hệ Thống${sheetMsg}!`
      );

      // Kích hoạt custom event thông báo toàn hệ thống
      window.dispatchEvent(
        new CustomEvent('app_bravo_synced', {
          detail: { summary, count: validAccounts.length },
        })
      );

      if (onRefreshAll) {
        onRefreshAll();
      }
    } catch (err) {
      console.error(err);
      setParseError('Đồng bộ thất bại: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setDriveFileInfo(null);
    setParseResult(null);
    setParseError(null);
    setSyncSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Đồng Bộ Số Liệu Thực Tế BRAVO (ERP)</span>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                  BRAVO Daily
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Lấy số liệu thực hiện chi phí từ phần mềm Bravo vào Web App & Google Sheet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Lựa chọn phương thức: Link Google Drive vs File máy tính */}
          {!parseResult && !syncSuccessMessage && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setSyncSourceMode('DRIVE_LINK');
                  setParseError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${
                  syncSourceMode === 'DRIVE_LINK'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Link Thư Mục Google Drive</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-3xs font-extrabold uppercase">
                  Tự Động
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSyncSourceMode('LOCAL_FILE');
                  setParseError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${
                  syncSourceMode === 'LOCAL_FILE'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>File Máy Tính (Kéo Thả)</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-3xs font-extrabold uppercase">
                  Thủ Công
                </span>
              </button>
            </div>
          )}

          {/* PHƯƠNG THỨC 1: NHẬP LINK GOOGLE DRIVE */}
          {syncSourceMode === 'DRIVE_LINK' && !parseResult && !syncSuccessMessage && (
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-3.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Đồng bộ tự động từ Thư mục Google Drive được chia sẻ
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Dán link thư mục Google Drive chứa các file Excel xuất từ Bravo hàng ngày. Hệ thống sẽ tự động tìm file Excel mới nhất của ngày hôm đó để đối soát.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Link thư mục web Google Drive (hoặc link file):</span>
                  <span className="text-3xs text-blue-600 font-medium">Tự động ghi nhớ sau khi dán</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/1aBcDeFgHiJk..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isLoadingFromDrive || !driveFolderUrl.trim()}
                    onClick={handleLoadFromDrive}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    {isLoadingFromDrive ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang quét Drive...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tải file mới nhất</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                <p>
                  💡 <strong>Gợi ý:</strong> Bạn chỉ cần copy link thư mục Google Drive (Ví dụ: <code className="font-mono text-blue-700">https://drive.google.com/drive/folders/...</code>) và dán vào đây 1 lần duy nhất.
                </p>
                <p className="text-slate-500 text-3xs">
                  Ứng dụng gọi Webhook Google Apps Script để truy cập trực tiếp Google Drive, tự động giải quyết triệt để rào cản CORS và bảo mật của Google.
                </p>
              </div>
            </div>
          )}

          {/* PHƯƠNG THỨC 2: CHỌN / KÉO THẢ FILE TỪ MÁY TÍNH */}
          {syncSourceMode === 'LOCAL_FILE' && !parseResult && !syncSuccessMessage && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-slate-600">
                <FolderOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800">
                    Vị trí thư mục file trên máy tính (Google Drive Desktop):
                  </div>
                  <code className="text-3xs sm:text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 block select-all">
                    I:\My Drive\APP\Projects\quan-ly-ke-hoach\BRAVO Daily\Báo cáo thực hiện chi phí 2026.xlsx
                  </code>
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bravo-file-input"
                />

                <label
                  htmlFor="bravo-file-input"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-amber-50/20 hover:bg-amber-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">
                      Nhấp để chọn file Excel hoặc Kéo thả file vào đây
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      Hỗ trợ file xuất trực tiếp từ Bravo 10: <span className="font-mono font-medium text-slate-700">.xlsx, .xls</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold text-2xs shadow-2xs group-hover:border-amber-300">
                    <Upload className="w-3 h-3 text-amber-600" />
                    <span>Chọn file từ thư mục BRAVO Daily</span>
                  </div>
                </label>

                {isParsing && (
                  <div className="flex items-center justify-center gap-2 text-amber-700 font-semibold py-3">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang phân tích dữ liệu file Excel...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lỗi nếu có */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Không thể đọc file:</strong>
                <span className="leading-relaxed">{parseError}</span>
              </div>
            </div>
          )}

          {/* Xem trước kết quả phân tích (Preview) */}
          {parseResult && !syncSuccessMessage && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block">
                      Đã đọc thành công: {parseResult.summary.fileName}
                    </span>
                    {driveFileInfo && (
                      <span className="text-3xs text-emerald-800 block">
                        Nguồn: Google Drive {driveFileInfo.folderName ? `• Thư mục: ${driveFileInfo.folderName}` : ''} • Cập nhật: {driveFileInfo.lastUpdated}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-2xs text-slate-500 hover:text-slate-800 underline shrink-0 font-medium"
                >
                  Đổi nguồn / Tải lại
                </button>
              </div>

              {/* 3 Thẻ thống kê nhanh */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="text-[10px] uppercase font-bold text-amber-800">1. Số tài khoản tìm thấy</div>
                  <div className="text-base sm:text-lg font-black font-mono text-amber-950 mt-0.5">
                    {parseResult.summary.accountsCount} <span className="text-xs font-normal">tài khoản</span>
                  </div>
                  <div className="text-3xs text-amber-700 mt-0.5">Trên tổng {parseResult.summary.totalRows} dòng</div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
                  <div className="text-[10px] uppercase font-bold text-blue-800">2. Tổng số đã duyệt</div>
                  <div className="text-base sm:text-lg font-black font-mono text-blue-950 mt-0.5 whitespace-nowrap truncate" title={formatVND(parseResult.summary.totalApprovedAmount)}>
                    {formatVND(parseResult.summary.totalApprovedAmount)}
                  </div>
                  <div className="text-3xs text-blue-700 mt-0.5">Hạn mức theo file Bravo</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">3. Thực hiện Bravo (Kỳ này)</div>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-950 mt-0.5 whitespace-nowrap truncate" title={formatVND(parseResult.summary.totalBravoAmount)}>
                    {formatVND(parseResult.summary.totalBravoAmount)}
                  </div>
                  <div className="text-3xs text-emerald-700 mt-0.5">Sẽ nạp vào cột Theo Bravo</div>
                </div>
              </div>

              {/* Bảng xem trước 8 tài khoản tiêu biểu */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-100/80 font-bold text-slate-700 text-3xs uppercase tracking-wider flex items-center justify-between">
                  <span>Xem trước các khoản mục tiêu biểu từ file</span>
                  <span>{parseResult.validAccounts.length} khoản mục</span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-2xs">
                  {parseResult.validAccounts.slice(0, 8).map((acc, idx) => (
                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50">
                      <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 shrink-0">
                          {acc.code}
                        </span>
                        <span className="font-medium text-slate-800 truncate" title={acc.name}>
                          {acc.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatVND(acc.bravoAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tùy chọn đồng bộ Google Sheet */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncToSheet}
                  onChange={(e) => setSyncToSheet(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="font-semibold text-slate-800">
                    Tự động đồng bộ và ghi đè vào tab INFO trên Google Sheet
                  </span>
                  <p className="text-3xs text-slate-500">
                    Giữ số liệu giữa Web App và Google Sheet luôn khớp 100% với file xuất từ Bravo
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Thông báo thành công */}
          {syncSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Đồng Bộ Bravo Thành Công!</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-900">{syncSuccessMessage}</p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Xong & Đóng
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Nạp file khác
                </button>
              </div>
            </div>
          )}

          {/* Tiện ích tự động hóa */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-3xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Tiện ích tự động hóa đồng bộ:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="block text-slate-800 font-semibold">1. Đồng bộ 1-Click trên Web:</strong>
                <span className="text-slate-500">
                  Dán link thư mục Google Drive một lần duy nhất. Hàng ngày bạn chỉ cần mở modal và bấm <span className="font-semibold text-blue-700">"Tải file mới nhất"</span>.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="block text-slate-800 font-semibold">2. Tự động ngầm trên máy tính:</strong>
                <span className="text-slate-500">
                  Nhấp đúp file <code className="font-mono bg-white px-1 py-0.2 rounded border border-slate-200">Cap_Nhat_Bravo_Vao_App.bat</code> hoặc chạy <code className="font-mono bg-white px-1 py-0.2 rounded border border-slate-200">scripts/watch_bravo_daily.py</code> để tự canh thư mục máy tính.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="text-3xs text-slate-500">
            {selectedFile ? (
              <span>File đã chọn: <strong>{selectedFile.name}</strong></span>
            ) : driveFileInfo ? (
              <span>File Drive: <strong>{driveFileInfo.fileName}</strong></span>
            ) : (
              <span>Chưa nạp file nào</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            {parseResult && !syncSuccessMessage && (
              <button
                type="button"
                onClick={handleConfirmSync}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Đồng Bộ...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xác Nhận Đồng Bộ Vào Hệ Thống</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
