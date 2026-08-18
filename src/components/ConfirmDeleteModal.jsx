import React from "react";
import { AlertOctagon, Trash2, X, AlertTriangle, ArrowDownLeft, Receipt } from "lucide-react";
import { getCurrencySymbol } from "../lib/currencies.js";

/**
 * ConfirmDeleteModal — Branded confirmation modal for single record and bulk deletion/trash actions.
 * Replaces native browser alert popups with a tactile, brand-aligned modal UX.
 */
export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  record = null,
  selectedCount = 0,
  isPermanent = false,
  confirmText = null,
  currency = "USD",
  onConfirm,
  onClose
}) {
  if (!isOpen) return null;

  const defaultTitle = isPermanent
    ? selectedCount > 1
      ? `Permanently Delete ${selectedCount} Records?`
      : "Permanently Delete Record?"
    : selectedCount > 1
    ? `Move ${selectedCount} Records to Trash?`
    : "Move Record to Trash?";

  const defaultDescription = isPermanent
    ? "This action is permanent and cannot be undone. This record and all associated accounting data will be erased."
    : "This record will be moved to Trash. Workspace members and owners can review or restore it at any time.";

  const defaultConfirmText = confirmText || (isPermanent ? "Delete Permanently" : "Move to Trash");

  const isIncome = record?.recordType === "income";

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#d9d4c8] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="bg-[#f7f3ea] px-5 py-4 border-b border-[#d9d4c8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                isPermanent
                  ? "bg-red-100 text-red-600 border border-red-200"
                  : "bg-[#fbf1de] text-[#e0982a] border border-[#e0982a]/30"
              }`}
            >
              {isPermanent ? <AlertOctagon className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#1c1b19]">
                {title || defaultTitle}
              </h3>
              <span className="text-[11px] font-mono text-[#6b665c]">
                {isPermanent ? "Permanent Destruction" : "Soft Delete & Trash"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#6b665c] hover:text-[#1c1b19] p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#6b665c] leading-relaxed font-medium">
            {description || defaultDescription}
          </p>

          {/* Record Preview Card snippet if deleting a single record */}
          {record && (
            <div className="bg-[#f7f3ea] p-3.5 rounded-xl border border-[#d9d4c8] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
                    isIncome ? "bg-[#0f7a52]" : "bg-[#ff5a3c]"
                  }`}
                >
                  {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-[#1c1b19] truncate">
                    {isIncome ? record.source : record.vendor}
                  </p>
                  <p className="text-[11px] text-[#6b665c] truncate">
                    {isIncome ? `Origin: ${record.origin || "manual"}` : record.categoryName || "Expense"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`font-mono text-sm font-bold ${
                    isIncome ? "text-[#0f7a52]" : "text-[#1c1b19]"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {getCurrencySymbol(record.currency || currency)}
                  {Number(record.amount || 0).toFixed(2)}
                </p>
                <p className="text-[10px] text-[#6b665c] font-mono">{record.date || "No date"}</p>
              </div>
            </div>
          )}

          {/* Bulk Count Banner if multiple records */}
          {selectedCount > 1 && (
            <div className="bg-[#fbf1de] p-3 rounded-xl border border-[#e0982a]/40 flex items-center gap-2 text-xs font-semibold text-[#1c1b19]">
              <AlertTriangle className="w-4 h-4 text-[#e0982a] shrink-0" />
              <span>Targeting {selectedCount} selected transactions</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#f7f3ea] px-5 py-3.5 border-t border-[#d9d4c8] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#1c1b19] bg-white border border-[#d9d4c8] rounded-xl hover:bg-[#f7f3ea] cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer transition-transform active:scale-95 shadow-2xs flex items-center gap-1.5 ${
              isPermanent
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#ff5a3c] hover:bg-[#e0482c]"
            }`}
          >
            {isPermanent ? <AlertOctagon className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{defaultConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
