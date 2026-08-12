import React, { useState } from "react";
import { getCurrencySymbol } from "../lib/currencies.js";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Receipt,
  ArrowDownLeft,
  Search
} from "lucide-react";

/**
 * TrashView — shows soft-deleted expenses & income entries.
 * Provides bulk restore (restore all) and empty trash (permanent delete all)
 * actions for easier management.
 */
export const TrashView = ({
  expenses = [],
  incomeEntries = [],
  currency = "USD",
  isOwner = false,
  onRestoreExpense,
  onRestoreIncome,
  onPermanentDeleteExpense,
  onPermanentDeleteIncome,
  onBulkRestore,
  onEmptyTrash
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);
  const [selectedType, setSelectedType] = useState("all"); // "all" | "expenses" | "income"

  // Filter trashed records
  const trashedExpenses = expenses.filter((e) => e.deletedAt);
  const trashedIncome = incomeEntries.filter((e) => e.deletedAt);

  // Apply type filter
  const filteredExpenses = selectedType === "income" ? [] : trashedExpenses;
  const filteredIncome = selectedType === "expenses" ? [] : trashedIncome;

  // Apply search filter
  const q = searchQuery.trim().toLowerCase();
  const searchExpenses = q
    ? filteredExpenses.filter((e) =>
        (e.vendor || "").toLowerCase().includes(q) ||
        (e.categoryName || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q)
      )
    : filteredExpenses;

  const searchIncome = q
    ? filteredIncome.filter((e) =>
        (e.source || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q)
      )
    : filteredIncome;

  const totalTrashed = trashedExpenses.length + trashedIncome.length;
  const totalAmount = [...trashedExpenses, ...trashedIncome].reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const handleRestoreAll = () => {
    if (!onBulkRestore) return;
    onBulkRestore({
      expenseIds: trashedExpenses.map((e) => e.id),
      incomeIds: trashedIncome.map((e) => e.id)
    });
    setConfirmRestoreAll(false);
  };

  const handleEmptyTrash = () => {
    if (!onEmptyTrash) return;
    onEmptyTrash({
      expenseIds: trashedExpenses.map((e) => e.id),
      incomeIds: trashedIncome.map((e) => e.id)
    });
    setConfirmEmpty(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const formatDeletedAt = (deletedAt) => {
    if (!deletedAt) return "—";
    try {
      return new Date(deletedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return deletedAt;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#ff5a3c] bg-[#ff5a3c]/10 px-2.5 py-0.5 rounded-full inline-block">
                Trash
              </span>
              {totalTrashed > 0 && (
                <span className="text-[10px] font-mono font-bold bg-[#1c1b19] text-white px-2 py-0.5 rounded-full">
                  {totalTrashed} item{totalTrashed !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1c1b19] tracking-tight">
              Deleted Records
            </h2>
            <p className="text-xs sm:text-sm text-[#615d59] leading-relaxed">
              Soft-deleted expenses and income entries live here for {isOwner ? "restore or permanent removal" : "review"}.{" "}
              {isOwner
                ? "Restore records you need back, or empty the trash to permanently remove everything."
                : "Only the workspace owner can restore or permanently delete records."}
            </p>
          </div>

          {/* Action buttons */}
          {isOwner && totalTrashed > 0 && (
            <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
              {/* Restore All */}
              {!confirmRestoreAll ? (
                <button
                  onClick={() => setConfirmRestoreAll(true)}
                  aria-label="Restore all trashed records"
                  className="flex-1 sm:flex-none font-display font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer bg-[#0f7a52] hover:bg-[#0b5f40] text-white shadow-2xs min-h-[40px]"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">Restore All</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-[#e7f4ec] border border-[#0f7a52]/30 rounded-lg p-1.5">
                  <span className="text-[11px] font-semibold text-[#0f7a52] px-1">
                    Restore all {totalTrashed} records?
                  </span>
                  <button
                    onClick={handleRestoreAll}
                    className="text-[11px] font-bold bg-[#0f7a52] text-white px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-[#0b5f40] transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmRestoreAll(false)}
                    className="text-[11px] font-bold bg-white text-[#6b665c] px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-[#f7f3ea] transition-colors border border-[#d9d4c8]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Empty Trash */}
              {!confirmEmpty ? (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  aria-label="Empty trash permanently"
                  className="flex-1 sm:flex-none font-display font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer bg-[#ff5a3c] hover:bg-[#e04a2f] text-white shadow-2xs min-h-[40px]"
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">Empty Trash</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-[#fbf1de] border border-[#ff5a3c]/40 rounded-lg p-1.5">
                  <span className="text-[11px] font-semibold text-[#ff5a3c] px-1">
                    Permanently delete all?
                  </span>
                  <button
                    onClick={handleEmptyTrash}
                    className="text-[11px] font-bold bg-[#ff5a3c] text-white px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-[#e04a2f] transition-colors"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmEmpty(false)}
                    className="text-[11px] font-bold bg-white text-[#6b665c] px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-[#f7f3ea] transition-colors border border-[#d9d4c8]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary stats */}
        {totalTrashed > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#f7f3ea] rounded-lg p-3 border border-[#d9d4c8]">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6b665c]">Total Trashed</p>
              <p className="font-mono text-xl font-bold text-[#1c1b19]">{totalTrashed}</p>
            </div>
            <div className="bg-[#f7f3ea] rounded-lg p-3 border border-[#d9d4c8]">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6b665c]">Trashed Amount</p>
              <p className="font-mono text-xl font-bold text-[#ff5a3c]">{getCurrencySymbol(currency)}{totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-[#f7f3ea] rounded-lg p-3 border border-[#d9d4c8]">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6b665c]">Breakdown</p>
              <p className="font-mono text-sm font-bold text-[#1c1b19]">
                {trashedExpenses.length} expense{trashedExpenses.length !== 1 ? "s" : ""} · {trashedIncome.length} income
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {totalTrashed === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-[#d9d4c8] text-center">
          <div className="w-14 h-14 rounded-full bg-[#f7f3ea] border border-[#d9d4c8] flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-6 h-6 text-[#6b665c]" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1c1b19]">Trash is empty</h3>
          <p className="text-xs text-[#6b665c] mt-1 max-w-sm mx-auto">
            Records you soft-delete from the feed or income views will appear here. You can restore them or permanently remove them.
          </p>
        </div>
      ) : (
        <>
          {/* Search & filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b665c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trashed records..."
                className="w-full bg-white border border-[#d9d4c8] text-sm text-[#1c1b19] rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#0075de]"
              />
            </div>
            <div className="flex items-center gap-1 bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg p-1 text-[11px] w-fit">
              {[
                { id: "all", label: "All" },
                { id: "expenses", label: "Expenses" },
                { id: "income", label: "Income" }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.id)}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    selectedType === t.id
                      ? "bg-white text-[#1c1b19] shadow-xs border border-[#d9d4c8]"
                      : "text-[#6b665c] hover:text-[#1c1b19]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trashed Expenses */}
          {searchExpenses.length > 0 && (
            <div className="bg-white rounded-xl border border-[#d9d4c8] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#d9d4c8] bg-[#f7f3ea]/50 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#1c1b19] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#ff5a3c]" /> Trashed Expenses
                </h3>
                <span className="text-[10px] font-mono font-bold text-[#6b665c] bg-white px-2 py-0.5 rounded-full border border-[#d9d4c8]">
                  {searchExpenses.length}
                </span>
              </div>
              <div className="divide-y divide-[#d9d4c8]/60">
                {searchExpenses.map((exp) => (
                  <div key={exp.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#f7f3ea]/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-[#1c1b19] truncate">{exp.vendor || "Untitled Expense"}</p>
                        <span className="text-[10px] font-mono font-bold text-[#ff5a3c] bg-[#ff5a3c]/10 px-1.5 py-0.5 rounded-full">
                          Deleted {formatDeletedAt(exp.deletedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6b665c] mt-0.5 flex-wrap">
                        <span>{formatDate(exp.date)}</span>
                        <span>·</span>
                        <span>{exp.categoryName || "Uncategorized"}</span>
                        {exp.submittedByName && (
                          <>
                            <span>·</span>
                            <span>{exp.submittedByName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-[#1c1b19]">
                        {getCurrencySymbol(currency)}{(Number(exp.amount) || 0).toFixed(2)}
                      </span>
                      {isOwner && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onRestoreExpense?.(exp.id)}
                            title="Restore this expense"
                            className="p-1.5 rounded-md bg-[#e7f4ec] text-[#0f7a52] hover:bg-[#0f7a52] hover:text-white transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPermanentDeleteExpense?.(exp.id)}
                            title="Permanently delete this expense"
                            className="p-1.5 rounded-md bg-[#fbf1de] text-[#ff5a3c] hover:bg-[#ff5a3c] hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Income */}
          {searchIncome.length > 0 && (
            <div className="bg-white rounded-xl border border-[#d9d4c8] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#d9d4c8] bg-[#f7f3ea]/50 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#1c1b19] flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-[#0f7a52]" /> Trashed Income
                </h3>
                <span className="text-[10px] font-mono font-bold text-[#6b665c] bg-white px-2 py-0.5 rounded-full border border-[#d9d4c8]">
                  {searchIncome.length}
                </span>
              </div>
              <div className="divide-y divide-[#d9d4c8]/60">
                {searchIncome.map((inc) => (
                  <div key={inc.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#f7f3ea]/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-[#1c1b19] truncate">{inc.source || "Untitled Income"}</p>
                        <span className="text-[10px] font-mono font-bold text-[#ff5a3c] bg-[#ff5a3c]/10 px-1.5 py-0.5 rounded-full">
                          Deleted {formatDeletedAt(inc.deletedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6b665c] mt-0.5 flex-wrap">
                        <span>{formatDate(inc.date)}</span>
                        {inc.submittedByName && (
                          <>
                            <span>·</span>
                            <span>{inc.submittedByName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-[#0f7a52]">
                        +{getCurrencySymbol(currency)}{(Number(inc.amount) || 0).toFixed(2)}
                      </span>
                      {isOwner && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onRestoreIncome?.(inc.id)}
                            title="Restore this income entry"
                            className="p-1.5 rounded-md bg-[#e7f4ec] text-[#0f7a52] hover:bg-[#0f7a52] hover:text-white transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPermanentDeleteIncome?.(inc.id)}
                            title="Permanently delete this income entry"
                            className="p-1.5 rounded-md bg-[#fbf1de] text-[#ff5a3c] hover:bg-[#ff5a3c] hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No search results */}
          {searchExpenses.length === 0 && searchIncome.length === 0 && (
            <div className="bg-white p-8 rounded-xl border border-dashed border-[#d9d4c8] text-center">
              <Search className="w-6 h-6 text-[#6b665c] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#1c1b19]">No matching records</p>
              <p className="text-xs text-[#6b665c] mt-1">Try a different search term or filter.</p>
            </div>
          )}
        </>
      )}

      {/* Warning note */}
      {isOwner && totalTrashed > 0 && (
        <div className="bg-[#fbf1de] border border-[#e0982a]/40 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#1c1b19]">
          <AlertTriangle className="w-4 h-4 text-[#e0982a] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#e0982a]">Important</p>
            <p className="text-[#615d59] mt-0.5">
              Emptying the trash permanently deletes all trashed records. This action cannot be undone. Restore records first if you might need them later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};