import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  X,
  RotateCw,
  RefreshCw,
  ChevronDown,
  Plus,
  Minus,
} from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

const DEVICES = [
  {
    id: 'iphone_duo_both',
    name: 'iPhone Duo (Cả 2 Màn Hình: Ngoài 5.4" & Trong 7.6")',
    type: 'duo_both',
    coverWidth: 466,
    coverHeight: 678,
    innerWidth: 626,
    innerHeight: 890,
  },
  {
    id: 'iphone_duo_inner',
    name: 'iPhone Duo - Màn Chính Trong 7.6" (1878×2670 px)',
    width: 626,
    height: 890,
    type: 'inner_screen',
  },
  {
    id: 'iphone_duo_cover',
    name: 'iPhone Duo - Màn Phụ Ngoài 5.4" (1398×2034 px)',
    width: 466,
    height: 678,
    type: 'cover_screen',
  },
  { id: 'iphone14', name: 'iPhone 14 / 15 (390×844 px)', width: 390, height: 844, type: 'phone' },
  { id: 'galaxy', name: 'Galaxy S22 (360×800 px)', width: 360, height: 800, type: 'phone' },
  { id: 'iphonese', name: 'iPhone SE (375×667 px)', width: 375, height: 667, type: 'phone' },
  { id: 'pixel', name: 'Google Pixel 7 (412×915 px)', width: 412, height: 915, type: 'phone' },
  { id: 'ipad', name: 'iPad Mini (768×1024 px)', width: 768, height: 1024, type: 'tablet' },
];

export default function MobileSimulatorModal({ isOpen, onClose }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState('iphone_duo_both');
  const [isLandscape, setIsLandscape] = useState(false);
  const [scale, setScale] = useState(1);
  const [iframeKey, setIframeKey] = useState(0);

  // Handle mobile Back button to close simulator
  useModalBackHandler(isOpen, onClose, 'mobile-simulator');

  const device = DEVICES.find((d) => d.id === selectedDeviceId) || DEVICES[0];
  const isDuoBoth = device.type === 'duo_both';

  // For Duo Both dimensions (CSS points based on Apple standard Retina @3x from 1398x2034 & 1878x2670)
  const coverW = isLandscape ? (device.coverHeight || 678) : (device.coverWidth || 466);
  const coverH = isLandscape ? (device.coverWidth || 466) : (device.coverHeight || 678);
  const innerW = isLandscape ? (device.innerHeight || 890) : (device.innerWidth || 626);
  const innerH = isLandscape ? (device.innerWidth || 626) : (device.innerHeight || 890);

  // For Single Device modes
  const singleW = isLandscape ? (device.height || 844) : (device.width || 390);
  const singleH = isLandscape ? (device.width || 390) : (device.height || 844);

  // Total unscaled content dimensions for container
  const totalContentWidth = isDuoBoth
    ? (coverW + innerW + 68)
    : (singleW + 28);
  const totalContentHeight = isDuoBoth
    ? (Math.max(coverH, innerH) + 68)
    : (singleH + 28);

  // Auto-fit scale to desktop viewport height & width
  const handleAutoFit = () => {
    // Available height inside modal = window height minus modal padding (32px), header (~56px), footer (~32px), buffer (25px)
    const availableHeight = Math.max(260, window.innerHeight - 145);
    const availableWidth = Math.max(300, window.innerWidth - 48);

    const scaleH = availableHeight / totalContentHeight;
    const scaleW = availableWidth / totalContentWidth;
    const fitted = Math.min(1, Math.min(scaleH, scaleW));
    setScale(Math.max(0.35, Math.round(fitted * 100) / 100));
  };

  useEffect(() => {
    if (!isOpen) return;
    handleAutoFit();
    window.addEventListener('resize', handleAutoFit);
    return () => window.removeEventListener('resize', handleAutoFit);
  }, [isOpen, totalContentHeight, totalContentWidth]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build simulator URL pointing to current app
  const simulatorUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?is_mobile_sim=1`;

  const handleReloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  // Render Cover Screen Shell (5.4 inch - 1398 x 2034 px / CSS 466 x 678)
  const renderCoverScreen = (keySuffix) => (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-bold text-amber-300 mb-2 px-3 py-0.5 rounded-full bg-slate-900/95 border border-amber-400/40 shadow-sm shrink-0">
        📱 Màn Phụ Ngoài 5.4" (1398×2034 px • CSS {coverW}×{coverH})
      </span>

      <div
        style={{
          width: `${coverW + 24}px`,
          height: `${coverH + 24}px`,
        }}
        className="relative rounded-[36px] p-2.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[4px] border-slate-700/90 border-l-[6px] border-l-slate-600 ring-1 ring-white/20 select-none flex flex-col justify-center items-center"
      >
        {/* Inner Screen */}
        <div
          style={{
            width: `${coverW}px`,
            height: `${coverH}px`,
          }}
          className="relative overflow-hidden rounded-[26px] bg-white border border-slate-900/90 shadow-inner flex flex-col shrink-0"
        >
          {/* Cover Screen Status Bar with Punch-Hole Camera at Top-Right */}
          {!isLandscape && (
            <div className="h-6 w-full bg-[#074780] text-white flex items-center justify-between px-4 text-[10px] font-semibold shrink-0 select-none relative z-20 border-b border-blue-900/40">
              <span className="font-mono text-[9px] tracking-tight">09:41</span>

              {/* Punch-hole camera dot at top-right (characteristic of iPhone Duo cover screen) */}
              <div className="absolute top-1.5 right-14 w-3.5 h-3.5 rounded-full bg-black/90 border border-black/80 shadow-xs flex items-center justify-center pointer-events-none">
                <div className="w-1 h-1 rounded-full bg-slate-900" />
              </div>

              <div className="flex items-center gap-1 font-mono text-[8px] text-blue-100 pr-1">
                <span>5G</span>
                <div className="w-3.5 h-2 border border-white/70 rounded-2xs p-0.2 flex items-center">
                  <div className="w-2 h-1 bg-white rounded-3xs" />
                </div>
              </div>
            </div>
          )}

          {/* Iframe Viewport */}
          <iframe
            key={`${iframeKey}-${keySuffix}`}
            src={simulatorUrl}
            className="w-full flex-1 border-0 block bg-slate-50"
            title="Khung xem trước Màn Phụ Ngoài 5.4 inch"
          />

          {/* Bottom Home Indicator Bar */}
          {!isLandscape && (
            <div className="h-3.5 w-full bg-white/95 border-t border-slate-200/50 flex items-center justify-center shrink-0">
              <div className="w-24 h-1 bg-slate-400 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Inner Screen Shell (7.6 inch - 1878 x 2670 px / CSS 626 x 890)
  const renderInnerScreen = (keySuffix) => (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-bold text-emerald-300 mb-2 px-3 py-0.5 rounded-full bg-slate-900/95 border border-emerald-400/40 shadow-sm shrink-0">
        ✨ Màn Chính Trong 7.6" (1878×2670 px • CSS {innerW}×{innerH})
      </span>

      <div
        style={{
          width: `${innerW + 24}px`,
          height: `${innerH + 24}px`,
        }}
        className="relative rounded-[32px] p-2.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[4px] border-slate-700/90 ring-1 ring-white/20 select-none flex flex-col justify-center items-center"
      >
        {/* Inner Screen */}
        <div
          style={{
            width: `${innerW}px`,
            height: `${innerH}px`,
          }}
          className="relative overflow-hidden rounded-[24px] bg-white border border-slate-900/90 shadow-inner flex flex-col shrink-0"
        >
          {/* Inner Screen Status Bar (Full width nano-texture OLED display) */}
          {!isLandscape && (
            <div className="h-6 w-full bg-[#074780] text-white flex items-center justify-between px-5 text-[10px] font-semibold shrink-0 select-none relative z-20 border-b border-blue-900/40">
              <span className="font-mono text-[9px] tracking-tight">09:41</span>

              {/* Status Bar Indicators */}
              <div className="flex items-center gap-1.5 font-mono text-[8px] text-blue-100">
                <span className="px-1.5 py-0.2 rounded-full bg-blue-950/60 border border-blue-800/40 text-[7px] text-emerald-300 font-sans">
                  120Hz ProMotion
                </span>
                <span>5G</span>
                <div className="w-3.5 h-2 border border-white/70 rounded-2xs p-0.2 flex items-center">
                  <div className="w-2 h-1 bg-white rounded-3xs" />
                </div>
              </div>
            </div>
          )}

          {/* Iframe Viewport */}
          <iframe
            key={`${iframeKey}-${keySuffix}`}
            src={simulatorUrl}
            className="w-full flex-1 border-0 block bg-slate-50"
            title="Khung xem trước Màn Chính Trong 7.6 inch"
          />

          {/* Bottom Home Indicator Bar */}
          {!isLandscape && (
            <div className="h-3.5 w-full bg-white/95 border-t border-slate-200/50 flex items-center justify-center shrink-0">
              <div className="w-36 h-1 bg-slate-400 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Single Phone Shell for other devices
  const renderSinglePhoneShell = () => (
    <div className="flex flex-col items-center">
      <div
        style={{
          width: `${singleW + 28}px`,
          height: `${singleH + 28}px`,
        }}
        className="relative rounded-[44px] p-3.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[5px] border-slate-700/80 ring-1 ring-white/20 select-none flex items-center justify-center"
      >
        <div
          style={{
            width: `${singleW}px`,
            height: `${singleH}px`,
          }}
          className="relative overflow-hidden rounded-[30px] bg-white border border-slate-900/90 shadow-inner flex flex-col shrink-0"
        >
          {/* Status Bar */}
          {!isLandscape && device.type !== 'tablet' && (
            <div className="h-6 w-full bg-[#074780] text-white flex items-center justify-between px-4 text-[10px] font-semibold shrink-0 select-none relative z-20 border-b border-blue-900/40">
              <span className="font-mono text-[9px] tracking-tight">09:41</span>
              {/* Dynamic Island pill */}
              <div className="w-16 h-3 bg-black rounded-full flex items-center justify-center border border-black/60 shadow-xs">
                <div className="w-1 h-1 rounded-full bg-slate-900 ml-auto mr-1.5" />
              </div>
              <div className="flex items-center gap-1 font-mono text-[8px] text-blue-100">
                <span>5G</span>
                <div className="w-3.5 h-2 border border-white/70 rounded-2xs p-0.2 flex items-center">
                  <div className="w-2 h-1 bg-white rounded-3xs" />
                </div>
              </div>
            </div>
          )}

          <iframe
            key={`${iframeKey}-single`}
            src={simulatorUrl}
            className="w-full flex-1 border-0 block bg-slate-50"
            title={device.name}
          />

          {!isLandscape && (
            <div className="h-3.5 w-full bg-white/95 border-t border-slate-200/50 flex items-center justify-center shrink-0">
              <div className="w-28 h-1 bg-slate-400 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden animate-fadeIn">
      {/* Top Toolbar */}
      <div className="w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-white shadow-xl z-20 shrink-0">
        {/* Title & Dimension Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5">
              <span>
                {isDuoBoth
                  ? 'Giả Lập iPhone Duo (2 Màn Hình: 5.4" & 7.6")'
                  : 'Giả Lập Xem Trên Điện Thoại'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {isDuoBoth
                  ? `5.4" (466×678) + 7.6" (626×890)`
                  : `${singleW} × ${singleH}px`}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {isDuoBoth
                ? 'Mô phỏng chuẩn thông số iPhone Duo: Màn ngoài 5.4" (1398×2034) & Màn chính 7.6" (1878×2670)'
                : 'Mô phỏng chính xác giao diện thực tế như khi mở web trên điện thoại'}
            </p>
          </div>
        </div>

        {/* Center Controls: Device Picker, Zoom & Rotation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Device Selector */}
          <div className="relative">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer transition-all"
            >
              {DEVICES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Rotate Button */}
          <button
            type="button"
            onClick={() => setIsLandscape((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-all ${
              isLandscape
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-600 hover:bg-slate-700'
            }`}
            title={isLandscape ? 'Chuyển về màn hình dọc (Portrait)' : 'Xoay màn hình ngang (Landscape)'}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Reload Iframe */}
          <button
            type="button"
            onClick={handleReloadIframe}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-600 hover:bg-slate-700 transition-all"
            title="Tải lại trang trong khung giả lập"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Zoom controls with Auto-Fit */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-600">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.25, Math.round((s - 0.05) * 100) / 100))}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors text-xs font-bold"
              title="Thu nhỏ (-5%)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAutoFit}
              className="px-1.5 py-0.5 hover:bg-slate-700 text-[11px] font-mono text-amber-300 hover:text-white rounded transition-colors font-bold select-none"
              title="Nhấn để tự động vừa màn hình (Auto-Fit)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(1.5, Math.round((s + 0.05) * 100) / 100))}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors text-xs font-bold"
              title="Phóng to (+5%)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer border border-rose-500/60 shrink-0"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Thoát Giả Lập</span>
        </button>
      </div>

      {/* Main Container: Centered Phone Model with Absolute Scaled Box */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-2 min-h-0">
        <div
          style={{
            width: `${Math.round(totalContentWidth * scale)}px`,
            height: `${Math.round(totalContentHeight * scale)}px`,
            transition: 'width 0.2s ease-out, height 0.2s ease-out',
          }}
          className="relative shrink-0 flex items-center justify-center"
        >
          <div
            style={{
              width: `${totalContentWidth}px`,
              height: `${totalContentHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease-out',
            }}
            className="absolute top-0 left-0"
          >
            {isDuoBoth ? (
              <div className="flex items-end justify-center gap-6 sm:gap-8 h-full">
                {renderCoverScreen('cover')}
                {renderInnerScreen('inner')}
              </div>
            ) : device.type === 'inner_screen' ? (
              renderInnerScreen('single-inner')
            ) : device.type === 'cover_screen' ? (
              renderCoverScreen('single-cover')
            ) : (
              renderSinglePhoneShell()
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] text-slate-400 py-1 shrink-0">
        💡 {isDuoBoth ? 'iPhone Duo trang bị Màn phụ ngoài 5.4" (1398×2034px) khi gập và Màn chính trong 7.6" (1878×2670px) khi mở rộng. Bạn có thể thao tác độc lập trên cả 2 màn hình. ' : 'Bạn có thể thao tác vuốt cuộn và bấm thử mọi chức năng bên trong chiếc điện thoại này y như trên máy thật. '}Nhấn nút % để Auto-Fit hoặc phím <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">ESC</kbd> để thoát.
      </div>
    </div>
  );
}
