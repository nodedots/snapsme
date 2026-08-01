import React from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export const OfflineBanner = ({
  isOfflineMode,
  pendingSyncCount,
  onForceSync
}) => {
  if (!isOfflineMode && pendingSyncCount === 0) return null;

  return (
    <div
      className={`w-full py-2.5 px-4 text-xs font-medium border-b transition-colors flex items-center justify-between gap-3 ${
        isOfflineMode
          ? "bg-[#fbf1de] text-[#1c1b19] border-[#e0982a]"
          : "bg-[#e7f4ec] text-[#0f7a52] border-[#0f7a52]/30"
      }`}
    >
      <div className="flex items-center gap-2 max-w-[1120px] mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          {isOfflineMode ? (
            <WifiOff className="w-4 h-4 text-[#e0982a] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#0f7a52] shrink-0" />
          )}
          <span>
            {isOfflineMode ? (
              <>
                <strong>Simulated Offline Mode Active:</strong> New expenses will be saved locally as{" "}
                <span className="font-mono bg-white/70 px-1 py-0.5 rounded text-[11px] font-bold">Pending Sync</span> and automatically synced when reconnected.
              </>
            ) : (
              <>
                <strong>Online:</strong> You have {pendingSyncCount} expense(s) created offline ready to sync to the central workspace.
              </>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onForceSync}
          className="bg-white hover:bg-gray-50 border border-current text-xs font-bold px-3 py-1 rounded-md shadow-2xs flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Now ({pendingSyncCount})</span>
        </button>
      </div>
    </div>
  );
};
