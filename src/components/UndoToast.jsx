import React, { useEffect, useState } from "react";
import { RotateCcw, Check, X, Trash2 } from "lucide-react";

/**
 * UndoToast — Branded floating toast banner for instant restoration of trashed records.
 * Provides micro-animation, 5-second progress countdown bar, and interactive Undo button.
 */
export function UndoToast({
  toastState, // { id, message, count, onUndo }
  onDismiss
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toastState) return;
    setProgress(100);
    const duration = 5000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss?.();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toastState, onDismiss]);

  if (!toastState) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-up max-w-md w-full px-4">
      <div className="bg-[#1c1b19] text-white p-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 overflow-hidden relative backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#ff5a3c]/20 text-[#ff5a3c] flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-gray-100 truncate">
            {toastState.message || "Moved record to Trash."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              toastState.onUndo?.();
              onDismiss?.();
            }}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom progress countdown bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-emerald-400 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
