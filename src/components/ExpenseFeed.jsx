import React, { useState } from "react";
import { TornCard } from "./TornCard";
import { StatusPill } from "./StatusPill";
import { ConfidenceDot } from "./ConfidenceDot";
import { getCurrencySymbol } from "../lib/currencies.js";
import {
  Search,
  Filter,
  AlertOctagon,
  Receipt,
  Eye,
  Check,
  Calendar,
  User,
  Tag,
  Sparkles,
  Image as ImageIcon,
  Mic,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  Download,
  FileSpreadsheet,
  Upload,
  Plus,
  TrendingUp,
  Camera
} from "lucide-react";

export const ExpenseFeed = ({
  expenses,
  incomeEntries = [],
  categories,
  members,
  onOpenCapture,
  onAddIncome,
  onOpenImport,
  currency
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [selectedMoneyMovement, setSelectedMoneyMovement] = useState("all");
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Lightbox Modal state
  const [lightboxExpense, setLightboxExpense] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const openLightbox = (expense, e) => {
    if (e) e.stopPropagation();
    setLightboxExpense(expense);
    setZoomScale(1);
    setRotation(0);
  };

  const closeLightbox = () => {
    setLightboxExpense(null);
    setZoomScale(1);
    setRotation(0);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.submittedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || exp.categoryId === selectedCategory;
    const matchesMember = selectedMember === "all" || exp.submittedBy === selectedMember;
    const matchesMM = selectedMoneyMovement === "all" || exp.moneyMovement === selectedMoneyMovement;

    return matchesSearch && matchesCategory && matchesMember && matchesMM;
  });

  const totalFilteredAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // CSV Export logic for accounting (FR-I5: income included, clearly typed)
  const handleExportCSV = () => {
    const escapeCsvCell = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const commonHeaders = [
      "Type",
      "ID",
      "Date",
      "Description / Vendor / Source",
      "Amount",
      "Currency",
      "Category",
      "Money Movement",
      "Submitted By",
      "Intake Source",
      "Sync Status",
      "Notes"
    ];

    const expenseRows = filteredExpenses.map((exp) => [
      "Expense",
      exp.id || "",
      exp.date || "",
      exp.vendor || "",
      exp.amount ?? "",
      exp.currency || currency,
      exp.categoryName || "",
      exp.moneyMovement || "",
      exp.submittedByName || "",
      exp.source || "",
      exp.syncStatus || "",
      exp.notes || ""
    ].map(escapeCsvCell));

    const incomeRows = (incomeEntries || []).map((i) => [
      "Income",
      i.id || "",
      i.date || "",
      i.source || "",
      i.amount ?? "",
      i.currency || currency,
      "",
      "",
      i.submittedByName || "",
      "manual",
      "",
      i.notes || ""
    ].map(escapeCsvCell));

    const lines = [];
    lines.push("# SnapSME export — expenses and income");
    lines.push(`# Generated ${new Date().toISOString()}`);
    lines.push("");
    lines.push("# === EXPENSES ===");
    lines.push(commonHeaders.join(","));
    if (expenseRows.length === 0) {
      lines.push(escapeCsvCell("(no expense rows)"));
    } else {
      lines.push(...expenseRows);
    }
    lines.push("");
    lines.push("# === INCOME ===");
    lines.push(commonHeaders.join(","));
    if (incomeRows.length === 0) {
      lines.push(escapeCsvCell("(no income rows)"));
    } else {
      lines.push(...incomeRows);
    }

    const csvContent = lines.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `snapsme_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
              placeholder="Search vendor, category, staff or note..."
              className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#0075de]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Stats Banner */}
            <div className="flex items-center gap-3 justify-between bg-[#f6f5f4] border border-black/10 px-3.5 py-1.5 rounded-lg text-xs">
              <span className="text-[#615d59] font-medium">Filtered Feed Total:</span>
              <span className="font-mono text-[#000000] font-bold text-sm">
                {getCurrencySymbol(currency)}{totalFilteredAmount.toFixed(2)} ({currency})
              </span>
              <span className="text-[10px] text-[#615d59] font-medium bg-white px-2 py-0.5 rounded border border-black/10">
                {filteredExpenses.length} entries
              </span>
            </div>

              {/* Record Expense — co-primary expense action */}
              {onOpenCapture && (
                <button
                  type="button"
                  onClick={onOpenCapture}
                  aria-label="Record an expense"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all whitespace-nowrap cursor-pointer"
                  style={{ backgroundColor: 'var(--color-expense-action)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-expense-action-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-expense-action)'}
                  title="Snap, say, or type an expense"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Record Expense</span>
                </button>
              )}

              {/* Add Income — co-primary income action, equal weight to Record Expense */}
              {onAddIncome && (
                <button
                  type="button"
                  onClick={onAddIncome}
                  aria-label="Add an income entry"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all whitespace-nowrap cursor-pointer"
                  style={{ backgroundColor: 'var(--color-income-action)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-income-action-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-income-action)'}
                  title="Log money that came in"
                >
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Income</span>
                </button>
              )}

              {/* Import CSV / Excel Button */}
              {onOpenImport && (
                <button
                  type="button"
                  onClick={() => onOpenImport("expenses")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-white hover:bg-[#f7f3ea] text-[#1c1b19] border border-black/10 hover:border-black/30"
                  title="Bulk import expenses from a CSV or Excel file"
                >
                  <Upload className="w-3.5 h-3.5 text-[#0075de]" />
                  <span>Import CSV/Excel</span>
                </button>
              )}

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredExpenses.length === 0 && (incomeEntries || []).length === 0}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  filteredExpenses.length > 0 || (incomeEntries || []).length > 0
                    ? "bg-[#0075de] hover:bg-[#0060b8] text-white"
                    : "bg-black/10 text-[#757575] cursor-not-allowed"
                }`}
                title="Export current filtered expenses as a CSV file for accounting"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
          </div>
        </div>

        {/* Category, Member & Money Movement Filter Controls */}
        <div className="pt-2.5 border-t border-black/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1c1b19] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#0075de]" /> Filter Feed:
            </span>

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

          {/* Responsive Filter Selectors (1 Column on Mobile < 640px, 3 Columns on Tablet/Desktop >= 640px) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-xs">
            {/* Category Selector */}
            <div className="w-full min-w-0">
              <label htmlFor="feed-filter-category" className="sr-only">Filter by Category</label>
              <select
                id="feed-filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none focus:border-[#0075de] cursor-pointer box-border min-h-[44px] sm:min-h-0"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Selector */}
            <div className="w-full min-w-0">
              <label htmlFor="feed-filter-member" className="sr-only">Filter by Submitter</label>
              <select
                id="feed-filter-member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none focus:border-[#0075de] cursor-pointer box-border min-h-[44px] sm:min-h-0"
              >
                <option value="all">All Submitters ({members.length})</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Money Movement Selector */}
            <div className="w-full min-w-0">
              <label htmlFor="feed-filter-money" className="sr-only">Filter by Money Movement</label>
              <select
                id="feed-filter-money"
                value={selectedMoneyMovement}
                onChange={(e) => setSelectedMoneyMovement(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-semibold rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none focus:border-[#0075de] cursor-pointer box-border min-h-[44px] sm:min-h-0"
              >
                <option value="all">All Money Movements</option>
                <option value="company_card">Company Card</option>
                <option value="personal_reimbursement">Personal Reimbursement</option>
                <option value="petty_cash">Petty Cash</option>
                <option value="supplier_payment">Supplier Direct</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Feed Grid */}
      {filteredExpenses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.map((exp) => (
            <TornCard
              key={exp.id}
              onClick={() => setSelectedExpense(exp)}
              headerColor={
                exp.moneyMovement === "company_card"
                  ? "bg-blue-600"
                  : exp.moneyMovement === "personal_reimbursement"
                  ? "bg-[#e0982a]"
                  : exp.moneyMovement === "petty_cash"
                  ? "bg-[#0f7a52]"
                  : "bg-purple-600"
              }
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <StatusPill type="moneyMovement" value={exp.moneyMovement} size="sm" />
                <StatusPill type="sync" value={exp.syncStatus} />
              </div>

              {/* Vendor & Amount */}
              <div className="flex items-start justify-between gap-2 my-2">
                <div>
                  <h3 className="font-display font-bold text-base text-[#1c1b19] line-clamp-1">
                    {exp.vendor}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b665c] font-medium mt-0.5">
                    <Tag className="w-3 h-3 text-[#0f7a52]" />
                    <span>{exp.categoryName}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-lg font-bold text-[#1c1b19]">
                    {getCurrencySymbol(exp.currency || currency)}{exp.amount.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-[#6b665c]">
                    {exp.currency || currency} (Accounting)
                  </div>
                  {exp.originalCurrency && exp.originalCurrency !== (exp.currency || currency) && (
                    <div className="mt-1 bg-[#e7f4ec] text-[#0f7a52] border border-[#0f7a52]/20 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded text-right">
                      Doc: {getCurrencySymbol(exp.originalCurrency)}{exp.originalAmount ? exp.originalAmount.toFixed(2) : exp.amount.toFixed(2)} {exp.originalCurrency}
                    </div>
                  )}
                </div>
              </div>

              {/* Duplicate Warning Pill per PRD FR20 */}
              {exp.duplicateOf && (
                <div className="bg-[#fbf1de] border border-[#e0982a] p-2 rounded-lg my-2 flex items-center gap-1.5 text-[11px] font-medium text-[#1c1b19]">
                  <AlertOctagon className="w-3.5 h-3.5 text-[#e0982a] shrink-0" />
                  <span className="truncate">
                    <strong>Possible Duplicate</strong> (48h match)
                  </span>
                </div>
              )}

              {/* Receipt Image Thumbnail preview trigger */}
              {exp.receiptImageUrl && (
                <div
                  className="my-2.5 relative rounded-lg border border-[#d9d4c8] overflow-hidden group/img bg-[#f7f3ea] h-28 cursor-pointer"
                  onClick={(e) => openLightbox(exp, e)}
                >
                  <img
                    src={exp.receiptImageUrl}
                    alt="Receipt thumbnail"
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-[#1c1b19]/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-display text-xs font-semibold backdrop-blur-[1px]">
                    <ZoomIn className="w-4 h-4" /> Preview Receipt
                  </div>
                </div>
              )}

              {/* Voice Note Badge */}
              {exp.source === "voice" && exp.voiceTranscript && (
                <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg my-2 text-[11px] text-purple-900 line-clamp-2 italic font-mono">
                  "{exp.voiceTranscript}"
                </div>
              )}

              {/* Footer Submitter & Date Info */}
              <div className="pt-2 mt-2 border-t border-[#d9d4c8]/60 flex items-center justify-between text-[11px] text-[#6b665c]">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-3 h-3 text-[#1c1b19]" />
                  <span className="truncate max-w-[110px]">{exp.submittedByName}</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  {exp.aiConfidence && (
                    <ConfidenceDot
                      score={
                        (exp.aiConfidence.vendor +
                          exp.aiConfidence.amount +
                          exp.aiConfidence.date +
                          exp.aiConfidence.category) /
                        4
                      }
                      fieldName="Avg AI"
                    />
                  )}
                  <span>{exp.date}</span>
                </div>
              </div>
            </TornCard>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-[#d9d4c8] space-y-3">
          <div className="w-12 h-12 bg-[#f7f3ea] text-[#6b665c] rounded-full mx-auto flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1c1b19]">Nothing here yet</h3>
          <p className="text-xs text-[#6b665c] max-w-sm mx-auto">
            {expenses.length === 0 ? "Nothing here yet — snap your first receipt to get started." : "No expenses match your search query or filters. Try adjusting your search."}
          </p>
          <button
            onClick={onOpenCapture}
            className="bg-[#ff5a3c] hover:bg-[#e0482c] text-white font-display font-bold text-xs px-4 py-2 rounded-xl transition-transform active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            Record Expense
          </button>
        </div>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d9d4c8] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#f7f3ea] p-4 border-b border-[#d9d4c8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusPill type="moneyMovement" value={selectedExpense.moneyMovement} />
                <StatusPill type="source" value={selectedExpense.source} />
              </div>

              <button
                onClick={() => setSelectedExpense(null)}
                className="text-[#6b665c] hover:text-[#1c1b19] p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between border-b border-[#d9d4c8] pb-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-[#1c1b19]">
                    {selectedExpense.vendor}
                  </h2>
                  <p className="text-xs text-[#6b665c] font-medium">{selectedExpense.categoryName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-[#1c1b19]">
                    ${selectedExpense.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-[#6b665c] font-mono">{selectedExpense.currency || currency}</p>
                </div>
              </div>

              {/* Duplicate Banner */}
              {selectedExpense.duplicateOf && (
                <div className="bg-[#fbf1de] border border-[#e0982a] p-3 rounded-xl flex items-center gap-2 text-xs text-[#1c1b19]">
                  <AlertOctagon className="w-4 h-4 text-[#e0982a] shrink-0" />
                  <span>
                    <strong>Duplicate Warning:</strong> This expense matches another entry submitted within 48 hours.
                  </span>
                </div>
              )}

              {/* Receipt Image */}
              {selectedExpense.receiptImageUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1c1b19]">Receipt Image</span>
                    <button
                      type="button"
                      onClick={(e) => openLightbox(selectedExpense, e)}
                      className="text-xs text-[#0f7a52] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Open Full Screen Lightbox
                    </button>
                  </div>
                  <div
                    className="rounded-xl border border-[#d9d4c8] overflow-hidden bg-[#f7f3ea] max-h-56 cursor-pointer relative group"
                    onClick={(e) => openLightbox(selectedExpense, e)}
                  >
                    <img
                      src={selectedExpense.receiptImageUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#1c1b19]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <ZoomIn className="w-4 h-4" /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Transcript */}
              {selectedExpense.voiceTranscript && (
                <div>
                  <span className="text-xs font-semibold text-[#1c1b19] block mb-1">
                    Voice Note Audio Transcript
                  </span>
                  <p className="bg-[#f7f3ea] border border-[#d9d4c8] p-3 rounded-xl text-xs font-mono italic text-[#1c1b19]">
                    "{selectedExpense.voiceTranscript}"
                  </p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#f7f3ea]/50 p-3 rounded-xl border border-[#d9d4c8]">
                <div>
                  <span className="text-[#6b665c] block">Submitted By</span>
                  <span className="font-semibold text-[#1c1b19]">{selectedExpense.submittedByName}</span>
                </div>
                <div>
                  <span className="text-[#6b665c] block">Expense Date</span>
                  <span className="font-semibold font-mono text-[#1c1b19]">{selectedExpense.date}</span>
                </div>
                <div>
                  <span className="text-[#6b665c] block">Sync Status</span>
                  <StatusPill type="sync" value={selectedExpense.syncStatus} />
                </div>
                <div>
                  <span className="text-[#6b665c] block">Entry ID</span>
                  <span className="font-mono text-[10px] text-[#6b665c]">{selectedExpense.id}</span>
                </div>
              </div>

              {/* AI Confidence Scores */}
              {selectedExpense.aiConfidence && (
                <div className="space-y-1.5 border-t border-[#d9d4c8] pt-3">
                  <span className="text-xs font-semibold text-[#1c1b19] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#0f7a52]" /> AI Extraction Confidence Scores
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-[#6b665c] block">Vendor</span>
                      <ConfidenceDot score={selectedExpense.aiConfidence.vendor} showPercent />
                    </div>
                    <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-[#6b665c] block">Amount</span>
                      <ConfidenceDot score={selectedExpense.aiConfidence.amount} showPercent />
                    </div>
                    <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-[#6b665c] block">Date</span>
                      <ConfidenceDot score={selectedExpense.aiConfidence.date} showPercent />
                    </div>
                    <div className="bg-[#f7f3ea] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-[#6b665c] block">Category</span>
                      <ConfidenceDot score={selectedExpense.aiConfidence.category} showPercent />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedExpense.notes && (
                <div>
                  <span className="text-xs font-semibold text-[#1c1b19] block mb-1">Notes</span>
                  <p className="text-xs text-[#6b665c] bg-[#f7f3ea] p-2.5 rounded-lg border border-[#d9d4c8]">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#f7f3ea] p-4 border-t border-[#d9d4c8] flex justify-end">
              <button
                onClick={() => setSelectedExpense(null)}
                className="bg-[#1c1b19] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal Preview Component */}
      {lightboxExpense && (
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
                <div className="w-8 h-8 rounded-lg bg-[#ff5a3c] text-white flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    {lightboxExpense.vendor}
                    <span className="text-emerald-400 font-mono font-bold">
                      ${lightboxExpense.amount.toFixed(2)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {lightboxExpense.date} • Submitted by {lightboxExpense.submittedByName}
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
              {lightboxExpense.receiptImageUrl ? (
                <img
                  src={lightboxExpense.receiptImageUrl}
                  alt="Receipt Full Preview"
                  className="max-h-[70vh] object-contain transition-transform duration-200 select-none shadow-2xl rounded"
                  style={{
                    transform: `scale(${zoomScale}) rotate(${rotation}deg)`
                  }}
                />
              ) : (
                <div className="text-gray-400 text-xs text-center">No image available</div>
              )}
            </div>

            {/* Lightbox Footer Bar */}
            <div className="bg-[#1c1b19] px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
              <div className="flex items-center gap-3">
                <StatusPill type="moneyMovement" value={lightboxExpense.moneyMovement} />
                <span className="text-gray-400 font-mono">Category: {lightboxExpense.categoryName}</span>
              </div>

              {lightboxExpense.receiptImageUrl && (
                <a
                  href={lightboxExpense.receiptImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download Full Receipt
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
