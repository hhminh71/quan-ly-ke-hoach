import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Tablet,
  X,
  RotateCw,
  RefreshCw,
  Maximize2,
  Minimize2,
  Check,
  ChevronDown,
} from 'lucide-react';

const DEVICES = [
  { id: 'iphone14', name: 'iPhone 14 / 15', width: 390, height: 844, type: 'phone' },
  { id: 'galaxy', name: 'Galaxy S22', width: 360, height: 800, type: 'phone' },
  { id: 'iphonese', name: 'iPhone SE (Nhỏ)', width: 375, height: 667, type: 'phone' },
  { id: 'pixel', name: 'Google Pixel 7', width: 412, height: 915, type: 'phone' },
  { id: 'ipad', name: 'iPad Mini', width: 768, height: 1024, type: 'tablet' },
];

export default function MobileSimulatorModal({ isOpen, onClose }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState('iphone14');
  const [isLandscape, setIsLandscape] = useState(false);
  const [scale, setScale] = useState(1);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);

  const device = DEVICES.find((d) => d.id === selectedDeviceId) || DEVICES[0];
  const frameWidth = isLandscape ? device.height : device.width;
  const frameHeight = isLandscape ? device.width : device.height;

  // Auto-fit scale to desktop viewport height
  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      const availableHeight = window.innerHeight - 140;
      const availableWidth = window.innerWidth - 60;
      const targetHeight = frameHeight + 40;
      const targetWidth = frameWidth + 40;

      const scaleH = availableHeight / targetHeight;
      const scaleW = availableWidth / targetWidth;
      const fitted = Math.min(1, Math.min(scaleH, scaleW));
      setScale(Math.max(0.65, Math.round(fitted * 100) / 100));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isOpen, frameHeight, frameWidth]);

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

  // Build simulator URL pointing to current app with flag
  const simulatorUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?is_mobile_sim=1`;

  const handleReloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden animate-fadeIn">
      {/* Top Toolbar */}
      <div className="w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-white shadow-xl z-20">
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5">
              <span>Giả Lập Xem Trên Điện Thoại</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {frameWidth} × {frameHeight}px
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Mô phỏng chính xác giao diện thực tế như khi mở web trên điện thoại
            </p>
          </div>
        </div>

        {/* Center Controls: Device Picker & Rotation */}
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
                  {d.name} ({d.width}×{d.height})
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

          {/* Zoom scale info */}
          <span className="text-[11px] font-mono text-slate-400 hidden md:inline px-1">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer border border-rose-500/60"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Thoát Giả Lập</span>
        </button>
      </div>

      {/* Main Container: Centered Phone Model with Scale */}
      <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out',
          }}
          className="relative shrink-0"
        >
          {/* Phone Hardware Shell */}
          <div
            style={{
              width: `${frameWidth + 24}px`,
              height: `${frameHeight + 24}px`,
            }}
            className="relative rounded-[48px] p-3 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-[5px] border-slate-700/80 ring-1 ring-white/20 select-none"
          >
            {/* Dynamic Island / Top Notch (only in portrait phone mode) */}
            {!isLandscape && device.type === 'phone' && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 pointer-events-none flex items-center justify-between px-2 shadow-sm border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900/80" />
              </div>
            )}

            {/* Inner Phone Screen */}
            <div
              style={{
                width: `${frameWidth}px`,
                height: `${frameHeight}px`,
              }}
              className="relative overflow-hidden rounded-[36px] bg-white border border-slate-900 shadow-inner"
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={simulatorUrl}
                style={{
                  width: `${frameWidth}px`,
                  height: `${frameHeight}px`,
                }}
                className="w-full h-full border-0 block bg-slate-50"
                title="Khung xem trước điện thoại di động"
              />
            </div>

            {/* Bottom Home Indicator Bar */}
            {!isLandscape && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] text-slate-400 py-1">
        💡 Bạn có thể thao tác vuốt cuộn và bấm thử mọi chức năng bên trong chiếc điện thoại này y như trên máy thật. Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">ESC</kbd> để thoát.
      </div>
    </div>
  );
}
