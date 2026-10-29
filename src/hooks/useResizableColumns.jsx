import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Custom hook to enable resizable columns on tables with mouse & touch drag support.
 * Column widths persist into localStorage so user customizations are preserved.
 *
 * @param {Object} options
 * @param {Object} options.initialWidths - Mapping of colKey -> widthInPixels
 * @param {string} [options.storageKey] - Key for localStorage persistence
 * @param {Object} [options.minWidths] - Mapping of colKey -> minWidthInPixels
 * @param {number} [options.defaultMinWidth=35] - Default minimum column width
 */
export function useResizableColumns({
  initialWidths = {},
  storageKey = null,
  minWidths = {},
  defaultMinWidth = 35,
}) {
  const [columnWidths, setColumnWidths] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...initialWidths, ...parsed };
          }
        }
      } catch (err) {
        console.warn('Failed to load column widths from localStorage:', err);
      }
    }
    return { ...initialWidths };
  });

  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  const dragStateRef = useRef(null);

  // Resize Start handler (handles both Mouse and Touch)
  const handleResizeStart = useCallback(
    (colKey, e) => {
      e.stopPropagation();

      const isTouch = e.type === 'touchstart';
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const currentWidth = widthsRef.current[colKey] || initialWidths[colKey] || 80;

      dragStateRef.current = {
        colKey,
        startX: clientX,
        startWidth: currentWidth,
      };

      const handleMove = (moveEvent) => {
        if (!dragStateRef.current) return;
        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }

        const currentX = moveEvent.type.startsWith('touch')
          ? moveEvent.touches[0].clientX
          : moveEvent.clientX;

        const deltaX = currentX - dragStateRef.current.startX;
        const minW = minWidths[colKey] || defaultMinWidth;
        const newWidth = Math.max(minW, Math.round(dragStateRef.current.startWidth + deltaX));

        setColumnWidths((prev) => {
          const updated = { ...prev, [colKey]: newWidth };
          widthsRef.current = updated;
          return updated;
        });
      };

      const handleEnd = () => {
        if (!dragStateRef.current) return;
        const finalWidths = widthsRef.current;
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(finalWidths));
          } catch (err) {
            console.warn('Failed to save column widths:', err);
          }
        }
        dragStateRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('touchcancel', handleEnd);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    },
    [initialWidths, storageKey, minWidths, defaultMinWidth]
  );

  // Reset a single column to its initial width
  const resetColumnWidth = useCallback(
    (colKey, e) => {
      if (e) e.stopPropagation();
      if (initialWidths[colKey] !== undefined) {
        setColumnWidths((prev) => {
          const updated = { ...prev, [colKey]: initialWidths[colKey] };
          widthsRef.current = updated;
          if (storageKey) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch (err) {}
          }
          return updated;
        });
      }
    },
    [initialWidths, storageKey]
  );

  // Reset all columns
  const resetAllWidths = useCallback(() => {
    setColumnWidths({ ...initialWidths });
    widthsRef.current = { ...initialWidths };
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {}
    }
  }, [initialWidths, storageKey]);

  // Compute total width of all configured columns
  const totalTableWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [columnWidths]);

  return {
    columnWidths,
    handleResizeStart,
    resetColumnWidth,
    resetAllWidths,
    totalTableWidth,
  };
}

/**
 * Visual Resize Handle placed on the right edge of a <th>.
 * Supports mouse drag, touch drag, and double-click to reset width.
 */
export function ColumnResizeHandle({
  colKey,
  onResizeStart,
  onReset,
  title = 'Kéo để tùy chỉnh độ rộng cột • Nhấp đúp để đặt lại',
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={(e) => onResizeStart(colKey, e)}
      onTouchStart={(e) => onResizeStart(colKey, e)}
      onDoubleClick={(e) => onReset && onReset(colKey, e)}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 bottom-0 right-0 w-2.5 sm:w-2 cursor-col-resize select-none touch-none z-20 group/resize flex items-center justify-center hover:bg-blue-500/30 active:bg-blue-600 transition-colors"
      title={title}
    >
      <div className="w-[1.5px] h-3 bg-slate-300/80 group-hover/resize:bg-blue-600 group-hover/resize:h-full group-hover/resize:w-[2px] transition-all" />
    </div>
  );
}

export default useResizableColumns;
