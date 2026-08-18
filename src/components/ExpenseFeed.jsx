import React, { useState, useMemo } from "react";
import { TornCard } from "./TornCard";
import { StatusPill } from "./StatusPill";
import { ConfidenceDot } from "./ConfidenceDot";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { UndoToast } from "./UndoToast";
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
  Search,
  Filter,
  AlertOctagon,
  Receipt,
  Check,
  Calendar,
  User,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  FileSpreadsheet,
  Upload,
  TrendingUp,
  ArrowDownLeft,
  Camera,
  Pencil,
  Trash2,
  ArrowUpDown,
  RotateCcw,
  CheckSquare,
  LayoutDashboard,
  Mic,
  Sparkles,
  Download,
  Wallet
} from "lucide-react";


export const ExpenseFeed = ({
  expenses = [],
  incomeEntries = [],
  categories = [],
  members = [],
  currentUser = null,
  onOpenCapture,
  onAddIncome,
  onOpenDashboard,
  onOpenImport,
  onEditExpense,
  onEditIncome,
  onDeleteExpense,
  onDeleteIncome,
  onRestoreExpense,
  onRestoreIncome,
  onBulkDelete,
  onBulkDeleteIncome,
  onBulkRecategorize,
  onBulkMoneyMovement,
  currency = "USD"
}) => {
  const [transactionType, setTransactionType] = useState("all"); // "all" | "expense" | "income"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [selectedMoneyMovement, setSelectedMoneyMovement] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState(null); // { type: "expense"|"income", data: record }
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState(null);
  const [undoToastState, setUndoToastState] = useState(null);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkMoneyMovement, setBulkMoneyMovement] = useState("");

  // Lightbox Modal state
  const [lightboxRecord, setLightboxRecord] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const openLightbox = (record, e) => {
    if (e) e.stopPropagation();
    setLightboxRecord(record);
    setZoomScale(1);
    setRotation(0);
  };

  const closeLightbox = () => {
    setLightboxRecord(null);
    setZoomScale(1);
    setRotation(0);
  };

  const isOwner = currentUser?.role === "owner";
  const canBulk = canBulkManage(currentUser);

  // Combine and normalize expenses and income records into a unified pool
  const allNormalizedRecords = useMemo(() => {
    const normExpenses = (expenses || []).map((exp) => ({
      ...exp,
      recordType: "expense",
      searchableTitle: exp.vendor || "",
      searchableMeta: `${exp.categoryName || ""} ${exp.submittedByName || ""} ${exp.notes || ""}`
    }));

    const normIncome = (incomeEntries || []).map((inc) => ({
      ...inc,
      recordType: "income",
      searchableTitle: inc.source || "",
      searchableMeta: `${inc.origin || ""} ${inc.submittedByName || ""} ${inc.notes || ""}`
    }));

    return [...normExpenses, ...normIncome];
  }, [expenses, incomeEntries]);

  const deletedCount = useMemo(() => {
    return filterDeletedRecords(allNormalizedRecords).length;
  }, [allNormalizedRecords]);

  // Filter + sort combined records
  const filteredRecords = useMemo(() => {
    const pool = showDeleted
      ? filterDeletedRecords(allNormalizedRecords)
      : filterActiveRecords(allNormalizedRecords);

    const filtered = pool.filter((rec) => {
      // 1. Transaction Type filter
      if (transactionType === "expense" && rec.recordType !== "expense") return false;
      if (transactionType === "income" && rec.recordType !== "income") return false;

      // 2. Search Query filter
      const title = rec.searchableTitle.toLowerCase();
      const meta = rec.searchableMeta.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || title.includes(q) || meta.includes(q);

      // 3. Category filter (applies to expenses; income passes if category filter is all)
      const catId = rec.categoryId || rec.category;
      const matchesCategory =
        selectedCategory === "all" || (rec.recordType === "expense" && catId === selectedCategory);

      // 4. Member filter
      const matchesMember = selectedMember === "all" || rec.submittedBy === selectedMember;

      // 5. Money Movement filter (applies to expenses; income passes if movement filter is all)
      const matchesMM =
        selectedMoneyMovement === "all" ||
        (rec.recordType === "expense" && rec.moneyMovement === selectedMoneyMovement);

      return matchesSearch && matchesCategory && matchesMember && matchesMM;
    });

    return sortRecords(filtered, sortKey, sortDir);
  }, [
    allNormalizedRecords,
    transactionType,
    showDeleted,
    searchQuery,
    selectedCategory,
    selectedMember,
    selectedMoneyMovement,
    sortKey,
    sortDir
  ]);

  // Calculate Cashflow Ledger Totals
  const { totalInflow, totalOutflow, netBalance } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const rec of filteredRecords) {
      const amt = Number(rec.amount) || 0;
      if (rec.recordType === "income") inflow += amt;
      else outflow += amt;
    }
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netBalance: inflow - outflow
    };
  }, [filteredRecords]);

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
    setSelectedIds(new Set(filteredRecords.map((e) => e.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleRowDelete = (rec, e) => {
    if (e) e.stopPropagation();
    if (!canDeleteRecord(rec, currentUser).allowed) return;

    const title = rec.recordType === "income" ? rec.source : rec.vendor;
    const isPermanent = isSoftDeleted(rec);

    if (isPermanent) {
      // Permanent deletion: open branded confirmation modal
      setDeleteModalConfig({
        title: "Permanently Delete Record?",
        description: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
        record: rec,
        isPermanent: true,
        confirmText: "Delete Permanently",
        onConfirm: () => {
          if (rec.recordType === "income") onDeleteIncome?.(rec.id, { permanent: true });
          else onDeleteExpense?.(rec.id, { permanent: true });
          if (selectedRecord?.data?.id === rec.id) setSelectedRecord(null);
        }
      });
    } else {
      // Soft deletion: move to trash & show interactive Undo Toast banner
      if (rec.recordType === "income") {
        onDeleteIncome?.(rec.id, { permanent: false });
      } else {
        onDeleteExpense?.(rec.id, { permanent: false });
      }
      if (selectedRecord?.data?.id === rec.id) setSelectedRecord(null);

      setUndoToastState({
        id: rec.id,
        message: `Moved "${title}" to Trash.`,
        onUndo: () => {
          if (rec.recordType === "income") onRestoreIncome?.(rec.id);
          else onRestoreExpense?.(rec.id);
        }
      });
    }
  };

  const selectedCount = selectedIds.size;

  // CSV Export logic for combined accounting ledger
  const handleExportCSV = () => {
    const escapeCsvCell = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Type",
      "ID",
      "Date",
      "Description / Vendor / Source",
      "Amount",
      "Currency",
      "Category",
      "Money Movement / Origin",
      "Submitted By",
      "Sync Status",
      "Notes"
    ];

    const rows = filteredRecords.map((rec) => [
      rec.recordType === "income" ? "Income" : "Expense",
      rec.id || "",
      rec.date || "",
      rec.recordType === "income" ? rec.source || "" : rec.vendor || "",
      rec.amount ?? "",
      rec.currency || currency,
      rec.categoryName || (rec.recordType === "income" ? "Income" : ""),
      rec.recordType === "income" ? rec.origin || "manual" : rec.moneyMovement || "",
      rec.submittedByName || "",
      rec.syncStatus || "synced",
      rec.notes || ""
    ].map(escapeCsvCell));

    const lines = [];
    lines.push("# SnapSME Financial Ledger Export — Expenses & Income");
    lines.push(`# Generated ${new Date().toISOString()}`);
    lines.push(`# Filtered Total Inflow: ${totalInflow.toFixed(2)} ${currency}`);
    lines.push(`# Filtered Total Outflow: ${totalOutflow.toFixed(2)} ${currency}`);
    lines.push(`# Net Cashflow Balance: ${netBalance.toFixed(2)} ${currency}`);
    lines.push("");
    lines.push(headers.join(","));
    if (rows.length === 0) {
      lines.push(escapeCsvCell("(no records found)"));
    } else {
      lines.push(...rows);
    }

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `snapsme_ledger_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-black/10 space-y-3 shadow-xs">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor, source, staff, category or note..."
              className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#0075de]"
            />
          </div>

          {/* Feed Data Tools (Import & Export CSV) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Import CSV / Excel Button */}
            {onOpenImport && (
              <button
                type="button"
                onClick={() => onOpenImport("expenses")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-white hover:bg-[#f7f3ea] text-[#1c1b19] border border-black/10 hover:border-black/30"
                title="Bulk import records from a CSV or Excel file"
              >
                <Upload className="w-3.5 h-3.5 text-[#0075de]" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                filteredRecords.length > 0
                  ? "bg-[#0075de] hover:bg-[#0060b8] text-white"
                  : "bg-black/10 text-[#757575] cursor-not-allowed"
              }`}
              title="Export current ledger transactions as a CSV file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger Transaction Type Tabs & Summary Cards */}
        <div className="pt-2 border-t border-black/10 space-y-3">
          {/* Transaction Type Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-[#f7f3ea] p-1 rounded-xl border border-[#d9d4c8]">
              <button
                type="button"
                onClick={() => setTransactionType("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  transactionType === "all"
                    ? "bg-white text-[#1c1b19] shadow-2xs border border-[#d9d4c8]"
                    : "text-[#6b665c] hover:text-[#1c1b19]"
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-[#0075de]" />
                <span>All Cashflows</span>
                <span className="bg-[#1c1b19]/10 text-[#1c1b19] text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {allNormalizedRecords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType("income")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  transactionType === "income"
                    ? "bg-[#e7f4ec] text-[#0f7a52] shadow-2xs border border-[#0f7a52]/30"
                    : "text-[#6b665c] hover:text-[#0f7a52]"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-[#0f7a52]" />
                <span>Income (Inflow)</span>
                <span className="bg-[#0f7a52]/15 text-[#0f7a52] text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {incomeEntries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType("expense")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  transactionType === "expense"
                    ? "bg-red-50 text-red-700 shadow-2xs border border-red-200"
                    : "text-[#6b665c] hover:text-red-700"
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-[#ff5a3c]" />
                <span>Expenses (Outflow)</span>
                <span className="bg-[#ff5a3c]/15 text-[#ff5a3c] text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {expenses.length}
                </span>
              </button>
            </div>

            {/* Trash & Bulk Select Toggles */}
            <div className="flex items-center gap-2">
              {isOwner && deletedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleted((v) => !v);
                    clearSelection();
                  }}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer ${
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
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer flex items-center gap-1 ${
                    selectMode
                      ? "bg-[#e6f3fe] text-[#0075de] border-[#0075de]/30"
                      : "bg-white text-[#6b665c] border-[#d9d4c8]"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {selectMode ? "Cancel select" : "Select"}
                </button>
              )}
              {(selectedCategory !== "all" || selectedMember !== "all" || selectedMoneyMovement !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedMember("all");
                    setSelectedMoneyMovement("all");
                    setSearchQuery("");
                  }}
                  className="text-[#f64932] hover:underline text-xs font-bold shrink-0 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Quick Ledger Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Total Inflow (Income) */}
            <div className="bg-[#e7f4ec]/60 border border-[#0f7a52]/20 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-[#0f7a52] flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Total Income (Inflow)
                </span>
                <p className="font-mono font-bold text-lg text-[#0f7a52] mt-0.5">
                  +{getCurrencySymbol(currency)}{totalInflow.toFixed(2)}
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#0f7a52] bg-white px-2 py-0.5 rounded border border-[#0f7a52]/20 font-bold">
                {filteredRecords.filter((r) => r.recordType === "income").length} items
              </span>
            </div>

            {/* Total Outflow (Expenses) */}
            <div className="bg-red-50/60 border border-red-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-red-700 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-[#ff5a3c]" /> Total Expenses (Outflow)
                </span>
                <p className="font-mono font-bold text-lg text-red-700 mt-0.5">
                  -{getCurrencySymbol(currency)}{totalOutflow.toFixed(2)}
                </p>
              </div>
              <span className="text-[10px] font-mono text-red-700 bg-white px-2 py-0.5 rounded border border-red-200 font-bold">
                {filteredRecords.filter((r) => r.recordType === "expense").length} items
              </span>
            </div>

            {/* Net Cashflow Balance */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                netBalance >= 0
                  ? "bg-[#e6f3fe]/60 border-[#0075de]/30 text-[#0075de]"
                  : "bg-amber-50/60 border-amber-200 text-amber-800"
              }`}
            >
              <div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" /> Net Ledger Balance
                </span>
                <p className="font-mono font-bold text-lg mt-0.5">
                  {netBalance >= 0 ? "+" : ""}
                  {getCurrencySymbol(currency)}{netBalance.toFixed(2)}
                </p>
              </div>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-black/10 font-bold">
                {filteredRecords.length} total
              </span>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full text-xs pt-1">
            <div className="w-full min-w-0">
              <label htmlFor="feed-filter-category" className="sr-only">Filter by Category</label>
              <select
                id="feed-filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full min-w-0">
              <label htmlFor="feed-filter-member" className="sr-only">Filter by Submitter</label>
              <select
                id="feed-filter-member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="all">All Submitters ({members.length})</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full min-w-0">
              <label htmlFor="feed-filter-money" className="sr-only">Filter by Money Movement</label>
              <select
                id="feed-filter-money"
                value={selectedMoneyMovement}
                onChange={(e) => setSelectedMoneyMovement(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="all">All Money Movements</option>
                <option value="company_card">Company Card</option>
                <option value="personal_reimbursement">Personal Reimbursement</option>
                <option value="petty_cash">Petty Cash</option>
                <option value="supplier_payment">Supplier Direct</option>
              </select>
            </div>

            <div className="w-full min-w-0 flex gap-1.5">
              <label htmlFor="feed-sort-key" className="sr-only">Sort by</label>
              <select
                id="feed-sort-key"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="flex-1 bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                <option value="date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="vendor">Sort: Vendor/Source</option>
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
            {!showDeleted && (
              <>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="text-[11px] rounded-md px-2 py-1 text-[#1c1b19] bg-white"
                >
                  <option value="">Set category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkCategoryId || selectedCount === 0}
                  onClick={() => {
                    const cat = categories.find((c) => c.id === bulkCategoryId);
                    if (cat) onBulkRecategorize?.([...selectedIds], cat);
                    clearSelection();
                    setBulkCategoryId("");
                  }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#0075de] disabled:opacity-40 cursor-pointer"
                >
                  Apply category
                </button>

                <select
                  value={bulkMoneyMovement}
                  onChange={(e) => setBulkMoneyMovement(e.target.value)}
                  className="text-[11px] rounded-md px-2 py-1 text-[#1c1b19] bg-white"
                >
                  <option value="">Money movement…</option>
                  <option value="company_card">Company Card</option>
                  <option value="personal_reimbursement">Personal Reimbursement</option>
                  <option value="petty_cash">Petty Cash</option>
                  <option value="supplier_payment">Supplier Direct</option>
                </select>
                <button
                  type="button"
                  disabled={!bulkMoneyMovement || selectedCount === 0}
                  onClick={() => {
                    onBulkMoneyMovement?.([...selectedIds], bulkMoneyMovement);
                    clearSelection();
                    setBulkMoneyMovement("");
                  }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#0075de] disabled:opacity-40 cursor-pointer"
                >
                  Apply movement
                </button>
              </>
            )}
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                const expenseIds = [];
                const incomeIds = [];
                for (const id of selectedIds) {
                  const rec = filteredRecords.find((r) => r.id === id);
                  if (rec?.recordType === "income") incomeIds.push(id);
                  else expenseIds.push(id);
                }

                setDeleteModalConfig({
                  title: showDeleted
                    ? `Permanently Delete ${selectedCount} Record${selectedCount !== 1 ? "s" : ""}?`
                    : `Move ${selectedCount} Record${selectedCount !== 1 ? "s" : ""} to Trash?`,
                  description: showDeleted
                    ? "This action is permanent. All selected records and accounting data will be erased."
                    : "The selected records will be moved to Trash. You can restore them anytime.",
                  selectedCount,
                  isPermanent: showDeleted,
                  confirmText: showDeleted ? "Delete Forever" : "Move to Trash",
                  onConfirm: () => {
                    if (expenseIds.length > 0) onBulkDelete?.(expenseIds, { permanent: showDeleted });
                    if (incomeIds.length > 0) onBulkDeleteIncome?.(incomeIds, { permanent: showDeleted });
                    clearSelection();

                    if (!showDeleted) {
                      setUndoToastState({
                        id: `bulk_${Date.now()}`,
                        message: `Moved ${selectedCount} record${selectedCount !== 1 ? "s" : ""} to Trash.`,
                        onUndo: () => {
                          expenseIds.forEach((id) => onRestoreExpense?.(id));
                          incomeIds.forEach((id) => onRestoreIncome?.(id));
                        }
                      });
                    }
                  }
                });
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#f64932] disabled:opacity-40 cursor-pointer ml-auto"
            >
              {showDeleted ? "Delete forever" : "Move to trash"}
            </button>
          </div>
        </div>
      )}

      {/* Ledger Feed Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => {
            const isIncome = rec.recordType === "income";

            return (
              <TornCard
                key={rec.id}
                onClick={() => {
                  if (selectMode) {
                    toggleSelect(rec.id);
                    return;
                  }
                  setSelectedRecord({ type: rec.recordType, data: rec });
                }}
                headerColor={
                  isSoftDeleted(rec)
                    ? "bg-red-500"
                    : isIncome
                    ? "bg-[#0f7a52]"
                    : rec.moneyMovement === "company_card"
                    ? "bg-blue-600"
                    : rec.moneyMovement === "personal_reimbursement"
                    ? "bg-[#e0982a]"
                    : rec.moneyMovement === "petty_cash"
                    ? "bg-[#0f7a52]"
                    : "bg-purple-600"
                }
              >
                {/* Header Badges + actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rec.id)}
                        onChange={(e) => toggleSelect(rec.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded shrink-0"
                      />
                    )}

                    {isIncome ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#e7f4ec] text-[#0f7a52] border border-[#0f7a52]/30 px-2 py-0.5 rounded-md">
                        <ArrowDownLeft className="w-3 h-3" /> Income Inflow
                      </span>
                    ) : (
                      <StatusPill type="moneyMovement" value={rec.moneyMovement} size="sm" />
                    )}

                    {isSoftDeleted(rec) && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Deleted
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <StatusPill type="sync" value={rec.syncStatus || "synced"} />

                    {!selectMode && canEditRecord(rec, currentUser).allowed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isIncome) onEditIncome?.(rec);
                          else onEditExpense?.(rec);
                        }}
                        className="p-1 rounded-md text-[#6b665c] hover:text-[#0075de] hover:bg-[#e6f3fe] cursor-pointer transition-colors"
                        title={isIncome ? "Edit income" : "Edit expense"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!selectMode && isSoftDeleted(rec) && canRestoreRecord(rec, currentUser).allowed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isIncome) onRestoreIncome?.(rec.id);
                          else onRestoreExpense?.(rec.id);
                        }}
                        className="p-1 rounded-md text-[#0f7a52] hover:bg-[#e7f4ec] cursor-pointer transition-colors"
                        title="Restore record"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!selectMode && canDeleteRecord(rec, currentUser).allowed && (
                      <button
                        type="button"
                        onClick={(e) => handleRowDelete(rec, e)}
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          confirmDeleteId === rec.id
                            ? "bg-red-50 text-red-600"
                            : "text-[#6b665c] hover:text-red-600 hover:bg-red-50"
                        }`}
                        title={
                          confirmDeleteId === rec.id
                            ? isSoftDeleted(rec)
                              ? "Click again to permanently delete"
                              : "Click again to confirm trash"
                            : isSoftDeleted(rec)
                              ? "Delete forever"
                              : "Move to trash"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title (Vendor/Source) & Amount */}
                <div className="flex items-start justify-between gap-2 my-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-[#1c1b19] line-clamp-1">
                      {isIncome ? rec.source : rec.vendor}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#6b665c] font-medium mt-0.5">
                      {isIncome ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-[#0f7a52]" />
                          <span>Income Source · {rec.origin || "manual"}</span>
                        </>
                      ) : (
                        <>
                          <Tag className="w-3 h-3 text-[#0f7a52]" />
                          <span>{rec.categoryName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono text-lg font-bold ${
                        isIncome ? "text-[#0f7a52]" : "text-[#1c1b19]"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {getCurrencySymbol(rec.currency || currency)}
                      {Number(rec.amount).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono font-semibold text-[#6b665c]">
                      {rec.currency || currency} ({isIncome ? "Inflow" : "Accounting"})
                    </div>
                    {rec.originalCurrency && rec.originalCurrency !== (rec.currency || currency) && (
                      <div className="mt-1 bg-[#e7f4ec] text-[#0f7a52] border border-[#0f7a52]/20 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded text-right">
                        Doc: {getCurrencySymbol(rec.originalCurrency)}
                        {rec.originalAmount ? Number(rec.originalAmount).toFixed(2) : Number(rec.amount).toFixed(2)}{" "}
                        {rec.originalCurrency}
                      </div>
                    )}
                  </div>
                </div>

                {/* Duplicate Warning Pill per PRD FR20 */}
                {rec.duplicateOf && (
                  <div className="bg-[#fbf1de] border border-[#e0982a] p-2 rounded-lg my-2 flex items-center gap-1.5 text-[11px] font-medium text-[#1c1b19]">
                    <AlertOctagon className="w-3.5 h-3.5 text-[#e0982a] shrink-0" />
                    <span className="truncate">
                      <strong>Possible Duplicate</strong> (48h match)
                    </span>
                  </div>
                )}

                {/* Image/Document Thumbnail preview trigger */}
                {rec.receiptImageUrl && (
                  <div
                    className="my-2.5 relative rounded-lg border border-[#d9d4c8] overflow-hidden group/img bg-[#f7f3ea] h-28 cursor-pointer"
                    onClick={(e) => openLightbox(rec, e)}
                  >
                    <img
                      src={rec.receiptImageUrl}
                      alt={isIncome ? "Income document thumbnail" : "Receipt thumbnail"}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-[#1c1b19]/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-display text-xs font-semibold backdrop-blur-[1px]">
                      <ZoomIn className="w-4 h-4" /> Preview {isIncome ? "Income Document" : "Receipt"}
                    </div>
                  </div>
                )}

                {/* Voice Note Badge */}
                {rec.sourceType === "voice" || rec.source === "voice" ? (
                  rec.voiceTranscript && (
                    <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg my-2 text-[11px] text-purple-900 line-clamp-2 italic font-mono flex items-start gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <span>"{rec.voiceTranscript}"</span>
                    </div>
                  )
                ) : null}

                {/* Footer Submitter & Date Info */}
                <div className="pt-2 mt-2 border-t border-[#d9d4c8]/60 flex items-center justify-between text-[11px] text-[#6b665c]">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3 h-3 text-[#1c1b19]" />
                    <span className="truncate max-w-[110px]">{rec.submittedByName || "Team"}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    {rec.aiConfidence && (
                      <ConfidenceDot
                        score={
                          isIncome
                            ? ((rec.aiConfidence.source || 0) +
                                (rec.aiConfidence.amount || 0) +
                                (rec.aiConfidence.date || 0)) / 3
                            : ((rec.aiConfidence.vendor || 0) +
                                (rec.aiConfidence.amount || 0) +
                                (rec.aiConfidence.date || 0) +
                                (rec.aiConfidence.category || 0)) / 4
                        }
                        fieldName="Avg AI"
                      />
                    )}
                    <span>{formatDate(rec.date)}</span>
                  </div>
                </div>
              </TornCard>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-[#d9d4c8] space-y-3 shadow-2xs">
          <div className="w-12 h-12 bg-[#f7f3ea] text-[#6b665c] rounded-full mx-auto flex items-center justify-center">
            {transactionType === "income" ? (
              <ArrowDownLeft className="w-6 h-6 text-[#0f7a52]" />
            ) : (
              <Receipt className="w-6 h-6 text-[#ff5a3c]" />
            )}
          </div>
          <h3 className="font-display font-bold text-lg text-[#1c1b19]">Nothing here yet</h3>
          <p className="text-xs text-[#6b665c] max-w-sm mx-auto">
            {allNormalizedRecords.length === 0
              ? "Your ledger is empty — record your first income or expense entry to start tracking money flow."
              : "No ledger records match your active search query or filters. Try adjusting your search."}
          </p>
          <div className="flex items-center gap-2 justify-center pt-1">
            <button
              onClick={onOpenCapture}
              className="bg-[#ff5a3c] hover:bg-[#e0482c] text-white font-display font-bold text-xs px-4 py-2 rounded-xl transition-transform active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5" />
              Record Expense
            </button>
            <button
              onClick={onAddIncome}
              className="bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-bold text-xs px-4 py-2 rounded-xl transition-transform active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Add Income
            </button>
          </div>
        </div>
      )}

      {/* Record Detail Modal (Expense or Income) */}
      {selectedRecord && selectedRecord.data && (
        <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d9d4c8] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-auto max-h-[90vh] flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="bg-[#f7f3ea] p-4 border-b border-[#d9d4c8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedRecord.type === "income" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-[#e7f4ec] text-[#0f7a52] border border-[#0f7a52]/30 px-2.5 py-1 rounded-lg">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Income Inflow
                  </span>
                ) : (
                  <StatusPill type="moneyMovement" value={selectedRecord.data.moneyMovement} />
                )}
                <StatusPill type="sync" value={selectedRecord.data.syncStatus || "synced"} />
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-[#6b665c] hover:text-[#1c1b19] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between border-b border-[#d9d4c8] pb-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-[#1c1b19]">
                    {selectedRecord.type === "income"
                      ? selectedRecord.data.source
                      : selectedRecord.data.vendor}
                  </h2>
                  <p className="text-xs text-[#6b665c] font-medium mt-0.5">
                    {selectedRecord.type === "income"
                      ? `Origin: ${selectedRecord.data.origin || "manual"}`
                      : selectedRecord.data.categoryName}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-2xl font-bold ${
                      selectedRecord.type === "income" ? "text-[#0f7a52]" : "text-[#1c1b19]"
                    }`}
                  >
                    {selectedRecord.type === "income" ? "+" : "-"}
                    {getCurrencySymbol(selectedRecord.data.currency || currency)}
                    {Number(selectedRecord.data.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-[#6b665c] font-mono">
                    {selectedRecord.data.currency || currency} ({selectedRecord.type === "income" ? "Inflow" : "Accounting"})
                  </p>
                </div>
              </div>

              {/* Duplicate Banner */}
              {selectedRecord.data.duplicateOf && (
                <div className="bg-[#fbf1de] border border-[#e0982a] p-3 rounded-xl flex items-center gap-2 text-xs text-[#1c1b19]">
                  <AlertOctagon className="w-4 h-4 text-[#e0982a] shrink-0" />
                  <span>
                    <strong>Duplicate Warning:</strong> Matches another record submitted within 48 hours.
                  </span>
                </div>
              )}

              {/* Image / Document Preview */}
              {selectedRecord.data.receiptImageUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1c1b19]">
                      {selectedRecord.type === "income" ? "Income Document" : "Receipt Image"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => openLightbox(selectedRecord.data, e)}
                      className="text-xs text-[#0f7a52] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Full Screen Lightbox
                    </button>
                  </div>
                  <div
                    className="rounded-xl border border-[#d9d4c8] overflow-hidden bg-[#f7f3ea] max-h-56 cursor-pointer relative group"
                    onClick={(e) => openLightbox(selectedRecord.data, e)}
                  >
                    <img
                      src={selectedRecord.data.receiptImageUrl}
                      alt="Record attachment"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#1c1b19]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <ZoomIn className="w-4 h-4" /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Transcript */}
              {selectedRecord.data.voiceTranscript && (
                <div>
                  <span className="text-xs font-semibold text-[#1c1b19] block mb-1 flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 text-purple-600" /> Voice Note Audio Transcript
                  </span>
                  <p className="bg-purple-50/70 border border-purple-200 p-3 rounded-xl text-xs font-mono italic text-purple-900">
                    "{selectedRecord.data.voiceTranscript}"
                  </p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#f7f3ea]/50 p-3 rounded-xl border border-[#d9d4c8]">
                <div>
                  <span className="text-[#6b665c] block">Submitted By</span>
                  <span className="font-semibold text-[#1c1b19]">
                    {selectedRecord.data.submittedByName || "Team member"}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b665c] block">Record Date</span>
                  <span className="font-semibold font-mono text-[#1c1b19]">
                    {formatDate(selectedRecord.data.date)}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b665c] block">Sync Status</span>
                  <StatusPill type="sync" value={selectedRecord.data.syncStatus || "synced"} />
                </div>
                <div>
                  <span className="text-[#6b665c] block">Record ID</span>
                  <span className="font-mono text-[10px] text-[#6b665c] truncate block">
                    {selectedRecord.data.id}
                  </span>
                </div>
              </div>

              {/* AI Confidence Scores */}
              {selectedRecord.data.aiConfidence && (
                <div className="space-y-1.5 border-t border-[#d9d4c8] pt-3">
                  <span className="text-xs font-semibold text-[#1c1b19] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#0f7a52]" /> AI Extraction Confidence Ratings
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {selectedRecord.type === "income" ? (
                      <>
                        <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                          <span className="text-[10px] text-[#6b665c] block">Source</span>
                          <ConfidenceDot score={selectedRecord.data.aiConfidence.source} showPercent />
                        </div>
                        <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                          <span className="text-[10px] text-[#6b665c] block">Amount</span>
                          <ConfidenceDot score={selectedRecord.data.aiConfidence.amount} showPercent />
                        </div>
                        <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                          <span className="text-[10px] text-[#6b665c] block">Date</span>
                          <ConfidenceDot score={selectedRecord.data.aiConfidence.date} showPercent />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                          <span className="text-[10px] text-[#6b665c] block">Vendor</span>
                          <ConfidenceDot score={selectedRecord.data.aiConfidence.vendor} showPercent />
                        </div>
                        <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                          <span className="text-[10px] text-[#6b665c] block">Amount</span>
                          <ConfidenceDot score={selectedRecord.data.aiConfidence.amount} showPercent />
                        </div>
                        <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                          <span className="text-[10px] text-[#6b665c] block">Date</span>
                          <ConfidenceDot score={selectedRecord.data.aiConfidence.date} showPercent />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRecord.data.notes && (
                <div>
                  <span className="text-xs font-semibold text-[#1c1b19] block mb-1">Notes & Context</span>
                  <p className="text-xs text-[#6b665c] bg-[#f7f3ea] p-2.5 rounded-lg border border-[#d9d4c8]">
                    {selectedRecord.data.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#f7f3ea] p-4 border-t border-[#d9d4c8] flex items-center justify-between">
              {canEditRecord(selectedRecord.data, currentUser).allowed && (
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord.data;
                    const isInc = selectedRecord.type === "income";
                    setSelectedRecord(null);
                    if (isInc) onEditIncome?.(rec);
                    else onEditExpense?.(rec);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0075de] bg-[#e6f3fe] border border-[#0075de]/30 rounded-xl hover:bg-[#d5ebfe] flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Record
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="bg-[#1c1b19] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer ml-auto"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal Preview Component */}
      {lightboxRecord && (
        <div
          className="fixed inset-0 z-50 bg-[#1c1b19]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div
            className="relative bg-black/80 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Controls Header */}
            <div className="bg-[#1c1b19] px-5 py-3 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold ${
                    lightboxRecord.recordType === "income" ? "bg-[#0f7a52]" : "bg-[#ff5a3c]"
                  }`}
                >
                  {lightboxRecord.recordType === "income" ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <Receipt className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    {lightboxRecord.recordType === "income" ? lightboxRecord.source : lightboxRecord.vendor}
                    <span
                      className={`font-mono font-bold ${
                        lightboxRecord.recordType === "income" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {lightboxRecord.recordType === "income" ? "+" : "-"}
                      {getCurrencySymbol(lightboxRecord.currency || currency)}
                      {Number(lightboxRecord.amount).toFixed(2)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {formatDate(lightboxRecord.date)} • Submitted by {lightboxRecord.submittedByName || "Team"}
                  </p>
                </div>
              </div>

              {/* Image Transform Tool Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs text-gray-300 w-12 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="Rotate 90deg"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setRotation(0);
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono rounded-lg transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  Reset
                </button>
                <div className="h-4 w-[1px] bg-white/20 mx-1" />
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors cursor-pointer"
                  title="Close Lightbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Stage */}
            <div className="flex-1 bg-black/90 p-4 flex items-center justify-center overflow-auto min-h-[350px] relative">
              {lightboxRecord.receiptImageUrl ? (
                <img
                  src={lightboxRecord.receiptImageUrl}
                  alt="Full Document Preview"
                  className="max-h-[70vh] object-contain transition-transform duration-200 select-none shadow-2xl rounded"
                  style={{
                    transform: `scale(${zoomScale}) rotate(${rotation}deg)`
                  }}
                />
              ) : (
                <div className="text-gray-400 text-xs text-center">No image attachment available</div>
              )}
            </div>

            {/* Lightbox Footer Bar */}
            <div className="bg-[#1c1b19] px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
              <div className="flex items-center gap-3">
                {lightboxRecord.recordType === "income" ? (
                  <span className="text-emerald-400 font-mono font-semibold">
                    Origin: {lightboxRecord.origin || "manual"}
                  </span>
                ) : (
                  <StatusPill type="moneyMovement" value={lightboxRecord.moneyMovement} />
                )}
                <span className="text-gray-400 font-mono">
                  Category: {lightboxRecord.categoryName || "Income"}
                </span>
              </div>

              {lightboxRecord.receiptImageUrl && (
                <a
                  href={lightboxRecord.receiptImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download Attachment
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branded Delete Confirmation Modal */}
      {deleteModalConfig && (
        <ConfirmDeleteModal
          isOpen={!!deleteModalConfig}
          title={deleteModalConfig.title}
          description={deleteModalConfig.description}
          record={deleteModalConfig.record}
          selectedCount={deleteModalConfig.selectedCount}
          isPermanent={deleteModalConfig.isPermanent}
          confirmText={deleteModalConfig.confirmText}
          currency={currency}
          onConfirm={deleteModalConfig.onConfirm}
          onClose={() => setDeleteModalConfig(null)}
        />
      )}

      {/* Floating Undo Toast Banner */}
      {undoToastState && (
        <UndoToast
          toastState={undoToastState}
          onDismiss={() => setUndoToastState(null)}
        />
      )}
    </div>
  );
};

