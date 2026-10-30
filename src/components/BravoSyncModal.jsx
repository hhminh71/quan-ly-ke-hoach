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
  Lock,
  Unlock,
  Edit3,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { parseBravoExcelBuffer } from '../utils/bravoParser';
import {
  syncBravoInfoToGoogleSheet,
  fetchBravoFromDrive,
  saveBravoDriveUrlToGoogleSheet,
  getSavedWebhookUrl,
} from '../services/googleSheetService';
import { formatVND } from '../utils/formatters';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { canSettings } from '../utils/permissions';

export default function BravoSyncModal({
  isOpen,
  onClose,
  user = null,
  budgets = [],
  onUpdateBudgets,
  onUpdateBravoInfo,
  onRefreshAll,
}) {
  useModalBackHandler(isOpen, onClose, 'bravo-sync-modal');

  const fileInputRef = useRef(null);
  const isAdmin = canSettings(user);
  
  // Sync source mode: 'DRIVE_LINK' (Khuyên dùng) or 'LOCAL_FILE'
  const [syncSourceMode, setSyncSourceMode] = useState('DRIVE_LINK');
  
  // Google Drive link state - Thư mục cố định duy nhất của toàn hệ thống
  const [driveFolderUrl, setDriveFolderUrl] = useState(() => {
    return localStorage.getItem('app_bravo_drive_url') || 'https://drive.google.com/drive/folders/1cRZRKZRuvUEoNQyQuBA';
  });
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [editUrlInput, setEditUrlInput] = useState(driveFolderUrl);
  const [saveUrlFeedback, setSaveUrlFeedback] = useState(null);

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

  // Lưu link thư mục Google Drive cố định (Chỉ Admin)
  const handleSaveSystemDriveUrl = async () => {
    if (!isAdmin) {
      alert('Chỉ tài khoản Admin mới có quyền thay đổi link thư mục Google Drive hệ thống.');
      return;
    }

    const cleanUrl = editUrlInput.trim();
    if (!cleanUrl) {
      alert('Vui lòng nhập link thư mục Google Drive hợp lệ.');
      return;
    }

    setDriveFolderUrl(cleanUrl);
    localStorage.setItem('app_bravo_drive_url', cleanUrl);
    setIsEditingLink(false);

    // Lưu ngầm lên Google Sheet cho toàn bộ người dùng khác
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      saveBravoDriveUrlToGoogleSheet(webhookUrl, cleanUrl);
    }

    setSaveUrlFeedback('Đã cập nhật và khóa link thư mục Google Drive cố định cho toàn hệ thống!');
    setTimeout(() => setSaveUrlFeedback(null), 3500);
  };

  // Process directly from Google Drive Web Link via Apps Script Webhook
  const handleLoadFromDrive = async () => {
    const inputUrl = driveFolderUrl ? driveFolderUrl.trim() : '';
    if (!inputUrl) {
      setParseError('Chưa cấu hình Link thư mục Google Drive. Vui lòng liên hệ Admin để cài đặt.');
      return;
    }

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
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  syncSourceMode === 'DRIVE_LINK'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Thư Mục Google Drive (Hệ Thống)</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-3xs font-extrabold uppercase">
                  Cố Định
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSyncSourceMode('LOCAL_FILE');
                  setParseError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  syncSourceMode === 'LOCAL_FILE'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>File Máy Tính (Kéo Thả)</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-3xs font-extrabold uppercase">
                  Dự Phòng
                </span>
              </button>
            </div>
          )}

          {/* PHƯƠNG THỨC 1: LINK GOOGLE DRIVE CỐ ĐỊNH HỆ THỐNG */}
          {syncSourceMode === 'DRIVE_LINK' && !parseResult && !syncSuccessMessage && (
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-3.5 animate-in fade-in">
              {/* Thẻ Thư Mục Hệ Thống */}
              <div className="bg-white p-3.5 rounded-xl border border-blue-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>Thư Mục Google Drive Hệ Thống</span>
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-3xs font-bold inline-flex items-center gap-0.5 border border-emerald-200">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Cố định</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {isAdmin
                          ? 'Bạn là Admin: Có quyền thay đổi link thư mục này'
                          : 'Được cố định bởi Admin (Chỉ Admin mới có quyền sửa đổi)'}
                      </p>
                    </div>
                  </div>

                  {/* Nút sửa link dành riêng cho Admin */}
                  {isAdmin && !isEditingLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditUrlInput(driveFolderUrl);
                        setIsEditingLink(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shrink-0"
                      title="Chỉnh sửa link thư mục Google Drive (Chỉ tài khoản Admin)"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa link</span>
                    </button>
                  )}
                </div>

                {/* Chế độ xem link cố định (Mặc định) */}
                {!isEditingLink ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[11px] text-slate-700 break-all select-all flex items-center justify-between gap-2">
                      <span className="truncate">
                        {driveFolderUrl || 'Chưa cấu hình link thư mục Google Drive.'}
                      </span>
                      <span className="text-3xs font-sans font-bold text-slate-400 shrink-0">
                        [Đã khóa]
                      </span>
                    </div>

                    {/* Nút Đồng Bộ 1-Click To Rõ */}
                    <button
                      type="button"
                      disabled={isLoadingFromDrive || !driveFolderUrl}
                      onClick={handleLoadFromDrive}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-sm transition-all cursor-pointer"
                    >
                      {isLoadingFromDrive ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang quét Google Drive & Tải file mới nhất...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Đồng Bộ Ngay Từ Google Drive (1-Click)</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Chế độ chỉnh sửa link dành riêng cho Admin */
                  <div className="space-y-2.5 pt-1 animate-in fade-in">
                    <div className="relative">
                      <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={editUrlInput}
                        onChange={(e) => setEditUrlInput(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/1cRZRKZRuvUEoNQyQuBA..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xs text-slate-500">
                        * Link này sẽ được ghim cố định cho toàn bộ nhân viên và thiết bị khác.
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsEditingLink(false)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSystemDriveUrl}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu link hệ thống</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {saveUrlFeedback && (
                  <div className="text-2xs font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{saveUrlFeedback}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-white/90 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                <p>
                  💡 <strong>Cơ chế tự động:</strong> Mỗi ngày khi có file mới xuất từ Bravo đẩy lên thư mục Drive trên, hệ thống sẽ tự động tìm file Excel có thời gian cập nhật mới nhất để đối soát.
                </p>
                {!isAdmin && (
                  <p className="text-3xs text-slate-400">
                    (Tài khoản nhân viên không có quyền thay đổi link thư mục Google Drive để bảo đảm an toàn dữ liệu).
                  </p>
                )}
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

          {/* Lỗi nếu có (Kèm hướng dẫn chi tiết nếu dính lỗi phân quyền hoặc phiên bản cũ của Apps Script) */}
          {parseError && (() => {
            const isAuthError =
              parseError.includes('DriveApp') ||
              parseError.includes('auth/drive') ||
              parseError.includes('getFolderById') ||
              parseError.includes('quyền thực hiện lệnh gọi') ||
              parseError.includes('authorization');
            const isPostActionError =
              !isAuthError &&
              (parseError.includes('POST') ||
                parseError.includes('Code.gs') ||
                parseError.includes('hợp lệ'));

            return (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold text-xs sm:text-sm text-rose-800">
                      {isAuthError
                        ? 'Google yêu cầu cấp quyền truy cập Google Drive cho Apps Script'
                        : isPostActionError
                        ? 'Webhook Google Sheet cần cập nhật phiên bản mới'
                        : 'Không thể tải hoặc đọc file:'}
                    </strong>
                    <p className="text-xs leading-relaxed text-rose-800">{parseError}</p>
                  </div>
                </div>

                {/* Hướng dẫn giải quyết lỗi Cấp quyền Google Drive (OAuth Scope DriveApp) */}
                {isAuthError && (
                  <div className="mt-2 p-3 bg-white/95 rounded-xl border border-rose-200 text-2xs text-slate-700 space-y-2 shadow-2xs">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Cách cấp quyền Google Drive (Chỉ làm 1 lần trong Apps Script Editor - 20 giây):</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-3xs font-medium">
                      ⚠️ <strong>Lưu ý:</strong> Chính sách bảo mật của Google <u>không cho phép</u> mở popup cấp quyền từ menu trên Google Sheet. Bạn cần bấm nút <strong>"▶ Chạy" (Run)</strong> trực tiếp trong màn hình Apps Script theo các bước dưới đây:
                    </div>

                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 leading-relaxed">
                      <li>Trên Google Sheet, vào menu <strong>Tiện ích mở rộng (Extensions)</strong> -&gt; <strong>Apps Script</strong>.</li>
                      <li>Tại thanh công cụ phía trên (ngay cạnh nút Lưu), ở ô chọn hàm, nhấp chọn hàm <strong>capQuyenTruyCapGoogleDrive</strong>.</li>
                      <li>Bấm nút <strong>▶ Chạy (Run)</strong>.</li>
                      <li>Google sẽ hiện popup <em>"Cần có quyền ủy quyền" (Authorization required)</em>:
                        <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-slate-600">
                          <li>Bấm <strong>Xem lại quyền (Review permissions)</strong> -&gt; Chọn tài khoản Google của bạn.</li>
                          <li>Bấm <strong>Nâng cao (Advanced)</strong> ở góc dưới.</li>
                          <li>Bấm <strong>Đi tới ... (không an toàn) / Go to ... (unsafe)</strong>.</li>
                          <li>Bấm nút <strong>Cho phép (Allow)</strong>.</li>
                        </ul>
                      </li>
                      <li>Sau khi cấp quyền xong, bấm <strong>Triển khai (Deploy)</strong> -&gt; <strong>Quản lý bản triển khai (Manage deployments)</strong> -&gt; Bấm hình <strong>Cây bút (Chỉnh sửa)</strong> -&gt; Chọn <strong>Phiên bản mới (New version)</strong> -&gt; Bấm <strong>Triển khai (Deploy)</strong>.</li>
                    </ol>

                    <div className="pt-2 text-blue-700 font-semibold border-t border-slate-100 flex items-center justify-between">
                      <span>💡 Cấp quyền xong, bạn quay lại đây bấm <strong>"Đồng Bộ Ngay Từ Google Drive (1-Click)"</strong> là thành công 100%!</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSyncSourceMode('LOCAL_FILE');
                          setParseError(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-3xs cursor-pointer shrink-0 border border-amber-300"
                      >
                        Dùng file máy tính ngay
                      </button>
                    </div>
                  </div>
                )}

                {/* Hướng dẫn chi tiết nếu dính lỗi Hành động POST không hợp lệ */}
                {isPostActionError && (
                  <div className="mt-2 p-3 bg-white/95 rounded-xl border border-rose-200 text-2xs text-slate-700 space-y-1.5 shadow-2xs">
                    <div className="font-bold text-rose-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hướng dẫn cập nhật Webhook Google Sheet (Chỉ mất 1 phút):</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                      <li>Mở file Google Sheet trên trình duyệt -&gt; Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> -&gt; <strong>Apps Script</strong>.</li>
                      <li>Xóa code cũ, dán toàn bộ nội dung mới từ file <code className="font-mono bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-800 font-bold">google-apps-script/Code.gs</code> vào.</li>
                      <li>Bấm <strong>Lưu (Ctrl + S)</strong> -&gt; Bấm <strong>Triển khai (Deploy)</strong> -&gt; <strong>Quản lý bản triển khai (Manage deployments)</strong>.</li>
                      <li>Bấm hình <strong>Cây bút (Chỉnh sửa)</strong> -&gt; Mục Phiên bản chọn <strong>Phiên bản mới (New version)</strong> -&gt; Bấm <strong>Triển khai (Deploy)</strong>.</li>
                    </ol>
                    <div className="pt-1.5 text-blue-700 font-semibold border-t border-slate-100 flex items-center justify-between">
                      <span>💡 <em>Gợi ý tạm thời:</em> Bạn có thể chuyển sang tab <strong>"File Máy Tính"</strong> ở trên để chọn file từ thư mục <code>BRAVO Daily</code> và đồng bộ ngay lập tức!</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSyncSourceMode('LOCAL_FILE');
                          setParseError(null);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-3xs cursor-pointer shrink-0"
                      >
                        Chuyển sang File Máy Tính
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
                  className="text-2xs text-slate-500 hover:text-slate-800 underline shrink-0 font-medium cursor-pointer"
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
                  Thư mục Google Drive được Admin ghim cố định. Mọi nhân viên chỉ cần mở popup và bấm <span className="font-semibold text-blue-700">"Đồng Bộ Ngay Từ Google Drive"</span>.
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
              <span>Thư mục Drive: <strong>{driveFolderUrl ? 'Đã kết nối' : 'Chưa cấu hình'}</strong></span>
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
