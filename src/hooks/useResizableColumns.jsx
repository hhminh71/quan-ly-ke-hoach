import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SlidersHorizontal, Check, RotateCcw, X, Eye } from 'lucide-react';

/**
 * Custom hook to enable resizable columns on tables with mouse & touch drag support,
 * and column visibility (Show/Hide) with checkbox toggles.
 * Both column widths and visibility persist into localStorage.
 *
 * @param {Object} options
 * @param {Object} options.initialWidths - Mapping of colKey -> widthInPixels
 * @param {string} [options.storageKey] - Key for localStorage persistence
 * @param {Object} [options.minWidths] - Mapping of colKey -> minWidthInPixels
 * @param {number} [options.defaultMinWidth=35] - Default minimum column width
 * @param {Object} [options.initialVisibility] - Mapping of colKey -> boolean
 */
export function useResizableColumns({
  initialWidths = {},
  storageKey = null,
  minWidths = {},
  defaultMinWidth = 35,
  initialVisibility = {},
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
  const isResizingRef = useRef(false);
  const lastResizeEndTimeRef = useRef(0);

  // Check if a column was recently resized within 250ms (prevents trailing click from triggering sorting)
  const isRecentlyResized = useCallback(() => {
    return isResizingRef.current || Date.now() - lastResizeEndTimeRef.current < 250;
  }, []);

  // Column Visibility State (key -> boolean)
  const visibilityStorageKey = storageKey ? `${storageKey}_vis` : null;
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (visibilityStorageKey) {
      try {
        const saved = localStorage.getItem(visibilityStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...initialVisibility, ...parsed };
          }
        }
      } catch (err) {
        console.warn('Failed to load column visibility from localStorage:', err);
      }
    }
    return { ...initialVisibility };
  });

  // Check if a column is visible (defaults to true if not explicitly false)
  const isColumnVisible = useCallback(
    (colKey) => {
      return visibleColumns[colKey] !== false;
    },
    [visibleColumns]
  );

  // Toggle a column's visibility
  const toggleColumnVisibility = useCallback(
    (colKey) => {
      setVisibleColumns((prev) => {
        const current = prev[colKey] !== false;
        const updated = { ...prev, [colKey]: !current };
        if (visibilityStorageKey) {
          try {
            localStorage.setItem(visibilityStorageKey, JSON.stringify(updated));
          } catch (err) {}
        }
        return updated;
      });
    },
    [visibilityStorageKey]
  );

  // Show all columns
  const showAllColumns = useCallback(() => {
    const updated = {};
    Object.keys(columnWidths).forEach((k) => {
      updated[k] = true;
    });
    setVisibleColumns(updated);
    if (visibilityStorageKey) {
      try {
        localStorage.removeItem(visibilityStorageKey);
      } catch (err) {}
    }
  }, [columnWidths, visibilityStorageKey]);

  // Reset visibility to initialVisibility
  const resetVisibility = useCallback(() => {
    setVisibleColumns({ ...initialVisibility });
    if (visibilityStorageKey) {
      try {
        localStorage.removeItem(visibilityStorageKey);
      } catch (err) {}
    }
  }, [initialVisibility, visibilityStorageKey]);

  // Resize Start handler (handles both Mouse and Touch)
  const handleResizeStart = useCallback(
    (colKey, e) => {
      e.stopPropagation();

      const isTouch = e.type === 'touchstart';
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const currentWidth = widthsRef.current[colKey] || initialWidths[colKey] || 80;
      let hasMoved = false;

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
        if (Math.abs(deltaX) > 2) {
          hasMoved = true;
          isResizingRef.current = true;
        }

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

        if (hasMoved) {
          lastResizeEndTimeRef.current = Date.now();
          // Kill any synthetic click event triggered by mouseup on parent <th>
          const suppressClick = (clickEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
          };
          window.addEventListener('click', suppressClick, { capture: true, once: true });
          setTimeout(() => {
            window.removeEventListener('click', suppressClick, { capture: true });
            isResizingRef.current = false;
          }, 300);
        } else {
          isResizingRef.current = false;
        }

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

  // Compute total width of all visible configured columns
  const totalTableWidth = useMemo(() => {
    return Object.entries(columnWidths).reduce((sum, [colKey, w]) => {
      const isVis = visibleColumns[colKey] !== false;
      return sum + (isVis ? Number(w) || 0 : 0);
    }, 0);
  }, [columnWidths, visibleColumns]);

  return {
    columnWidths,
    handleResizeStart,
    resetColumnWidth,
    resetAllWidths,
    totalTableWidth,
    isRecentlyResized,
    // Visibility
    visibleColumns,
    isColumnVisible,
    toggleColumnVisibility,
    showAllColumns,
    resetVisibility,
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
      onMouseDown={(e) => {
        e.stopPropagation();
        onResizeStart(colKey, e);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        onResizeStart(colKey, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onReset && onReset(colKey, e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="absolute top-0 bottom-0 right-0 w-2.5 sm:w-2 cursor-col-resize select-none touch-none z-20 group/resize flex items-center justify-center hover:bg-blue-500/30 active:bg-blue-600 transition-colors"
      title={title}
    >
      <div className="w-[1.5px] h-3 bg-slate-300/80 group-hover/resize:bg-blue-600 group-hover/resize:h-full group-hover/resize:w-[2px] transition-all" />
    </div>
  );
}

/**
 * Modern Popover/Dropdown to Check/Uncheck columns to Hide/Show.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, required?: boolean}>} props.columns
 * @param {Function} props.isColumnVisible
 * @param {Function} props.onToggleColumn
 * @param {Function} props.onShowAll
 * @param {string} [props.buttonLabel]
 * @param {string} [props.buttonClassName]
 */
export function ColumnVisibilityDropdown({
  columns = [],
  isColumnVisible,
  onToggleColumn,
  onShowAll,
  buttonLabel,
  buttonClassName,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const visibleCount = useMemo(() => {
    return columns.filter((c) => isColumnVisible(c.key)).length;
  }, [columns, isColumnVisible]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          buttonClassName ||
          `inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[8px] sm:text-xs font-semibold border transition-all cursor-pointer ${
            isOpen
              ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`
        }
        title="Tùy chọn Ẩn / Hiện các cột của bảng"
      >
        <SlidersHorizontal className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
        <span>{buttonLabel || `Cột (${visibleCount}/${columns.length})`}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 sm:w-60 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[9px] sm:text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-blue-600" />
              Ẩn / Hiện Cột
            </span>
            {onShowAll && (
              <button
                type="button"
                onClick={onShowAll}
                className="text-[8px] sm:text-3xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                title="Bật hiển thị tất cả các cột"
              >
                Hiện tất cả
              </button>
            )}
          </div>

          {/* Column Checkboxes List */}
          <div className="max-h-60 overflow-y-auto px-1 py-1 space-y-0.5">
            {columns.map((col) => {
              const visible = isColumnVisible(col.key);
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-[9px] sm:text-xs select-none transition-colors cursor-pointer ${
                    visible ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-slate-50 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    disabled={col.required}
                    onChange={() => onToggleColumn(col.key)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className={`flex-1 truncate ${col.required ? 'font-semibold' : ''}`}>
                    {col.label}
                  </span>
                  {col.required && (
                    <span className="text-[7.5px] sm:text-3xs text-slate-400 font-normal">
                      (Cố định)
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default useResizableColumns;
