import React, { useState } from "react";
import { getCurrencySymbol } from "../lib/currencies.js";
import { ArrowDownLeft, Plus, Trash2, Camera, Upload } from "lucide-react";

/**
 * IncomeFeed — separate income list/feed (FR-I2).
 * Income entries render in their own list, distinct from the expense feed.
 * Each row is a white hairline card with a confirmed-green left accent + upward arrow.
 */
export const IncomeFeed = ({ incomeEntries = [], currency = "USD", onAddIncome, onOpenIncomeCapture, onOpenImport, onDeleteIncome, isOwner }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const totalIncome = incomeEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      if (typeof onDeleteIncome === "function") onDeleteIncome(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Income header + Add Income button */}
      <div className="bg-white p-4 rounded-xl border border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-[#000000] flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#e7f4ec] text-[#0f7a52] flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
            Income log
          </h2>
          <p className="text-xs text-[#615d59]">
            A simple log of money in — not invoices or customer billing.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <span className="text-xs text-[#6b665c] font-medium bg-[#f7f3ea] border border-black/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Total: <span className="font-mono font-bold text-[#0f7a52]">{getCurrencySymbol(currency)}{totalIncome.toFixed(2)}</span>
          </span>
          {onOpenImport && (
            <button
              type="button"
              onClick={() => onOpenImport("income")}
              className="w-full sm:w-auto bg-white hover:bg-[#f7f3ea] text-[#1c1b19] border border-black/10 hover:border-black/30 font-display font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
              title="Bulk import income records from a CSV or Excel file"
            >
              <Upload className="w-3.5 h-3.5 text-[#0075de]" />
              <span>Import CSV/Excel</span>
            </button>
          )}
          {onOpenIncomeCapture && (
            <button
              type="button"
              onClick={onOpenIncomeCapture}
              className="w-full sm:w-auto bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 shadow-2xs"
              title="Snap income document, speak voice note, or enter details"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snap Income</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAddIncome}
            className="w-full sm:w-auto bg-white hover:bg-[#e6f3fe] text-[#0075de] border border-[#0075de]/40 hover:border-[#0075de] font-display font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
            title="Log money that came in"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Income list */}
      {incomeEntries.length > 0 ? (
        <div className="space-y-2.5">
          {incomeEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-black/10 rounded-xl overflow-hidden flex"
            >
              {/* Green left accent — visually distinguishes income from expenses */}
              <div className="w-1 bg-[#0f7a52] shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#e7f4ec] text-[#0f7a52] flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-[#1c1b19] truncate">
                      {entry.source}
                    </p>
                    <p className="text-[11px] text-[#6b665c] font-medium">
                      {formatDate(entry.date)} · {entry.submittedByName || "Team"}
                    </p>
                    {entry.notes && (
                      <p className="text-[11px] text-[#615d59] mt-0.5 line-clamp-1">{entry.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-[#0f7a52]">
                      {getCurrencySymbol(entry.currency || currency)}{Number(entry.amount).toFixed(2)}
                    </p>
                    <span className="text-[10px] font-mono font-semibold text-[#0f7a52] bg-[#e7f4ec] px-2 py-0.5 rounded-full">
                      Income
                    </span>
                  </div>
                  {isOwner && onDeleteIncome && (
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        confirmDeleteId === entry.id
                          ? "bg-red-50 text-red-600"
                          : "text-[#6b665c] hover:text-red-600 hover:bg-red-50"
                      }`}
                      title={confirmDeleteId === entry.id ? "Click again to confirm delete" : "Delete income entry"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-[#d9d4c8] space-y-3">
          <div className="w-12 h-12 bg-[#e7f4ec] text-[#0f7a52] rounded-full mx-auto flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1c1b19]">Income log is empty</h3>
          <p className="text-xs text-[#6b665c] max-w-sm mx-auto">
            No income logged yet. Use + Add Income when money comes in.
          </p>
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {onOpenIncomeCapture && (
              <button
                type="button"
                onClick={onOpenIncomeCapture}
                className="bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5" />
                Snap Income
              </button>
            )}
            <button
              type="button"
              onClick={onAddIncome}
              className="bg-white hover:bg-[#e6f3fe] text-[#0075de] border border-[#0075de]/40 hover:border-[#0075de] font-display font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Income
            </button>
          </div>
        </div>
      )}
    </div>
  );
};