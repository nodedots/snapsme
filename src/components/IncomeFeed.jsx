import React, { useState, useMemo } from "react";
import { getCurrencySymbol } from "../lib/currencies.js";
import {
  canEditRecord,
  canDeleteRecord,
  canRestoreRecord,
  canBulkManage,
  isSoftDeleted,
  sortRecords,
  filterActiveRecords,
  filterDeletedRecords
} from "../lib/recordPermissions.js";
import {
  ArrowDownLeft,
  Plus,
  Trash2,
  Camera,
  Upload,
  Search,
  Filter,
  User,
  Tag,
  LayoutDashboard,
  Pencil,
  RotateCcw,
  CheckSquare,
  ArrowUpDown
} from "lucide-react";

/**
 * IncomeFeed — separate income list/feed (FR-I2).
 * Income entries render in their own list, distinct from the expense feed.
 * Each row is a white hairline card with a confirmed-green left accent + upward arrow.
 * Owners get full record management: edit, soft-delete, restore, bulk actions, and empty trash.
 */
export const IncomeFeed = ({
  incomeEntries = [],
  members = [],
  currency = "USD",
  currentUser = null,
  onAddIncome,
  onOpenIncomeCapture,
  onOpenDashboard,
  onOpenImport,
  onEditIncome,
  onDeleteIncome,
  onRestoreIncome,
  onBulkDelete,
  isOwner
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState("all");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const canBulk = canBulkManage(currentUser);

  const deletedCount = useMemo(
    () => filterDeletedRecords(incomeEntries).length,
    [incomeEntries]
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  // Filter + sort income
  const filteredIncome = useMemo(() => {
    const pool = showDeleted
      ? filterDeletedRecords(incomeEntries)
      : filterActiveRecords(incomeEntries);

    const filtered = pool.filter((inc) => {
      const source = (inc.source || "").toLowerCase();
      const by = (inc.submittedByName || "").toLowerCase();
      const notes = (inc.notes || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q || source.includes(q) || by.includes(q) || notes.includes(q);
      const matchesMember = selectedMember === "all" || inc.submittedBy === selectedMember;
      const matchesOrigin = selectedOrigin === "all" || (inc.origin || "manual") === selectedOrigin;
      return matchesSearch && matchesMember && matchesOrigin;
    });

    return sortRecords(filtered, sortKey, sortDir);
  }, [
    incomeEntries,
    showDeleted,
    searchQuery,
    selectedMember,
    selectedOrigin,
    sortKey,
    sortDir
  ]);

  const totalFilteredIncome = filteredIncome.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const formatOriginTag = (origin) => {
    if (origin === "csv_import") return "CSV Import";
    if (origin === "manual") return "Manual Entry";
    if (origin === "api_sync") return "API Sync";
    return origin || "Manual";
  };

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredIncome.map((e) => e.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDelete = (entry, e) => {
    if (e) e.stopPropagation();
    if (!canDeleteRecord(entry, currentUser).allowed) return;
    if (confirmDeleteId === entry.id) {
      onDeleteIncome?.(entry.id, { permanent: isSoftDeleted(entry) });
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(entry.id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-black/10 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search source, staff or note..."
              className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#0075de]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Stats Banner */}
            <div className="flex items-center gap-3 justify-between bg-[#f6f5f4] border border-black/10 px-3.5 py-1.5 rounded-lg text-xs">
              <span className="text-[#615d59] font-medium">Filtered Feed Total:</span>
              <span className="font-mono text-[#000000] font-bold text-sm">
                {getCurrencySymbol(currency)}{totalFilteredIncome.toFixed(2)} ({currency})
              </span>
              <span className="text-[10px] text-[#615d59] font-medium bg-white px-2 py-0.5 rounded border border-black/10">
                {filteredIncome.length} entries
              </span>
            </div>

            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-white hover:bg-[#f7f3ea] text-[#1c1b19] border border-black/10 hover:border-black/30"
                title="Open spend dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#0075de]" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            {onOpenImport && (
              <button
                type="button"
                onClick={() => onOpenImport("income")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-white hover:bg-[#f7f3ea] text-[#1c1b19] border border-black/10 hover:border-black/30"
                title="Bulk import income records from a CSV or Excel file"
              >
                <Upload className="w-3.5 h-3.5 text-[#0075de]" />
                <span className="hidden sm:inline">Import CSV/Excel</span>
              </button>
            )}

            {onOpenIncomeCapture && (
              <button
                type="button"
                onClick={onOpenIncomeCapture}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-[#0f7a52] hover:bg-[#0b5f40] text-white shadow-2xs"
                title="Snap income document, speak voice note, or enter details"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Snap Income</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAddIncome}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-white hover:bg-[#e6f3fe] text-[#0075de] border border-[#0075de]/40 hover:border-[#0075de]"
              title="Log money that came in"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Income</span>
            </button>
          </div>
        </div>

        {/* Member & Origin Filter Controls */}
        <div className="pt-2.5 border-t border-black/10 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-[#1c1b19] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#0075de]" /> Filter & sort:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {isOwner && deletedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleted((v) => !v);
                    clearSelection();
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer ${
                    showDeleted
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-white text-[#6b665c] border-[#d9d4c8]"
                  }`}
                >
                  {showDeleted ? "Showing deleted" : `Trash (${deletedCount})`}
                </button>
              )}
              {canBulk && !showDeleted && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectMode((v) => !v);
                    clearSelection();
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${
                    selectMode
                      ? "bg-[#e6f3fe] text-[#0075de] border-[#0075de]/30"
                      : "bg-white text-[#6b665c] border-[#d9d4c8]"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {selectMode ? "Cancel select" : "Select"}
                </button>
              )}
              {(selectedMember !== "all" || selectedOrigin !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember("all");
                    setSelectedOrigin("all");
                    setSearchQuery("");
                  }}
                  className="text-[#f64932] hover:underline text-xs font-bold shrink-0 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <User className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#757575]" />
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="pl-7 pr-8 py-1.5 bg-[#f6f5f4] border border-black/10 rounded-lg text-xs font-medium text-[#1c1b19] appearance-none focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="all">All Team Members</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Tag className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#757575]" />
              <select
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
                className="pl-7 pr-8 py-1.5 bg-[#f6f5f4] border border-black/10 rounded-lg text-xs font-medium text-[#1c1b19] appearance-none focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="all">All Origins</option>
                <option value="manual">Manual Entry</option>
                <option value="csv_import">CSV Import</option>
                <option value="api_sync">API Sync</option>
              </select>
            </div>

            <div className="relative flex gap-1.5">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-[#f6f5f4] border border-black/10 rounded-lg text-xs font-medium text-[#1c1b19] appearance-none focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="source">Sort: Source</option>
                <option value="submittedBy">Sort: Submitted by</option>
                <option value="createdAt">Sort: Created</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="px-2.5 rounded-lg border border-[#d9d4c8] bg-white text-[#1c1b19] text-xs font-bold cursor-pointer flex items-center gap-1"
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortDir === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && canBulk && (
        <div className="sticky top-2 z-20 bg-[#1c1b19] text-white rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 shadow-lg">
          <span className="text-xs font-semibold shrink-0">
            {selectedCount} selected
          </span>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              Select all visible
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                if (
                  window.confirm(
                    showDeleted
                      ? `Permanently delete ${selectedCount} income record(s)? This cannot be undone.`
                      : `Move ${selectedCount} income record(s) to trash?`
                  )
                ) {
                  onBulkDelete?.([...selectedIds], { permanent: showDeleted });
                  clearSelection();
                }
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#f64932] disabled:opacity-40 cursor-pointer ml-auto"
            >
              {showDeleted ? "Delete forever" : "Move to trash"}
            </button>
          </div>
        </div>
      )}

      {/* Income list */}
      {filteredIncome.length > 0 ? (
        <div className="space-y-2.5">
          {filteredIncome.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white border rounded-xl overflow-hidden flex ${
                isSoftDeleted(entry) ? "border-red-200 opacity-75" : "border-black/10"
              }`}
            >
              {/* Green left accent — visually distinguishes income from expenses */}
              <div className={`w-1 shrink-0 ${isSoftDeleted(entry) ? "bg-red-400" : "bg-[#0f7a52]"}`} aria-hidden="true" />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={(e) => toggleSelect(entry.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded shrink-0"
                    />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-[#e7f4ec] text-[#0f7a52] flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-sm text-[#1c1b19] truncate">
                        {entry.source}
                      </p>
                      {/* Visual Origin Tag */}
                      <span className="text-[9px] font-mono font-medium text-[#6b665c] bg-[#f7f3ea] px-1.5 py-0.5 rounded border border-black/5 whitespace-nowrap">
                        {formatOriginTag(entry.origin || "manual")}
                      </span>
                      {isSoftDeleted(entry) && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Deleted
                        </span>
                      )}
                    </div>
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

                  {/* Action buttons */}
                  {!selectMode && canEditRecord(entry, currentUser).allowed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditIncome?.(entry);
                      }}
                      className="p-1.5 rounded-lg text-[#6b665c] hover:text-[#0075de] hover:bg-[#e6f3fe] transition-colors cursor-pointer"
                      title="Edit income entry"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!selectMode && isSoftDeleted(entry) && canRestoreRecord(entry, currentUser).allowed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreIncome?.(entry.id);
                      }}
                      className="p-1.5 rounded-lg text-[#0f7a52] hover:bg-[#e7f4ec] transition-colors cursor-pointer"
                      title="Restore income entry"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!selectMode && canDeleteRecord(entry, currentUser).allowed && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(entry, e)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        confirmDeleteId === entry.id
                          ? "bg-red-50 text-red-600"
                          : "text-[#6b665c] hover:text-red-600 hover:bg-red-50"
                      }`}
                      title={
                        confirmDeleteId === entry.id
                          ? isSoftDeleted(entry)
                            ? "Click again to permanently delete"
                            : "Click again to confirm trash"
                          : isSoftDeleted(entry)
                            ? "Delete forever"
                            : "Move to trash"
                      }
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
          <h3 className="font-display font-bold text-lg text-[#1c1b19]">
            {showDeleted
              ? "Trash is empty"
              : incomeEntries.length === 0
                ? "No income logged yet"
                : "No matching income"}
          </h3>
          <p className="text-xs text-[#6b665c] max-w-sm mx-auto">
            {showDeleted
              ? "Deleted income records will appear here. You can restore them or permanently delete them."
              : incomeEntries.length === 0
                ? "No income logged yet — add your first sale whenever you're ready."
                : "Try adjusting your search or filter settings."}
          </p>
          {!showDeleted && (
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
          )}
        </div>
      )}
    </div>
  );
};