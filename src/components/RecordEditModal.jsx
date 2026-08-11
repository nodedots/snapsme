import React, { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { WORLD_CURRENCIES, getCurrencySymbol } from "../lib/currencies.js";

/**
 * Lightweight edit modal for a single expense or income record.
 * No AI re-extraction — field corrections only.
 */
export function RecordEditModal({
  isOpen,
  record,
  recordType = "expense", // "expense" | "income"
  categories = [],
  currency = "USD",
  onClose,
  onSave
}) {
  const isExpense = recordType === "expense";
  const [vendorSource, setVendorSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [moneyMovement, setMoneyMovement] = useState("company_card");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !record) return;
    setVendorSource(isExpense ? record.vendor || "" : record.source || "");
    setAmount(record.amount != null ? String(record.amount) : "");
    setDate(String(record.date || "").slice(0, 10));
    setNotes(record.notes || "");
    setCategoryId(record.categoryId || record.category || categories[0]?.id || "");
    setCategoryName(record.categoryName || categories[0]?.name || "");
    setMoneyMovement(record.moneyMovement || "company_card");
    setError("");
    setIsSaving(false);
  }, [isOpen, record, isExpense, categories]);

  if (!isOpen || !record) return null;

  const handleCategoryChange = (e) => {
    const id = e.target.value;
    const cat = categories.find((c) => c.id === id);
    setCategoryId(id);
    setCategoryName(cat?.name || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const amt = parseFloat(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!vendorSource.trim()) {
      setError(isExpense ? "Vendor is required." : "Source is required.");
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a valid date.");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        amount: Math.round(amt * 100) / 100,
        date,
        notes: notes.trim() || null,
        updatedAt: new Date().toISOString()
      };
      if (isExpense) {
        updates.vendor = vendorSource.trim();
        updates.categoryId = categoryId || null;
        updates.category = categoryId || null;
        updates.categoryName = categoryName || "Other Expenses";
        updates.moneyMovement = moneyMovement;
      } else {
        updates.source = vendorSource.trim();
      }
      await onSave(record.id, updates, record);
      onClose();
    } catch (err) {
      setError(err?.message || "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#d9d4c8] rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#d9d4c8] bg-[#f7f3ea]">
          <h3 className="font-display font-bold text-base text-[#1c1b19]">
            Edit {isExpense ? "expense" : "income"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6b665c] hover:bg-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#1c1b19]">
              {isExpense ? "Vendor / Merchant" : "Source"} *
            </span>
            <input
              type="text"
              value={vendorSource}
              onChange={(e) => setVendorSource(e.target.value)}
              className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0075de]"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#1c1b19]">Amount *</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#6b665c]">
                  {getCurrencySymbol(record.currency || currency)}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg pl-7 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-[#0075de]"
                  required
                />
              </div>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#1c1b19]">Date *</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0075de]"
                required
              />
            </label>
          </div>

          {isExpense && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#1c1b19]">Category</span>
                <select
                  value={categoryId}
                  onChange={handleCategoryChange}
                  className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0075de]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {categories.length === 0 && (
                    <option value="">Other Expenses</option>
                  )}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#1c1b19]">Money movement</span>
                <select
                  value={moneyMovement}
                  onChange={(e) => setMoneyMovement(e.target.value)}
                  className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0075de]"
                >
                  <option value="company_card">Company Card</option>
                  <option value="personal_reimbursement">Personal Reimbursement</option>
                  <option value="petty_cash">Petty Cash</option>
                  <option value="supplier_payment">Supplier Direct</option>
                </select>
              </label>
            </>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#1c1b19]">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0075de] resize-none"
            />
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-[#6b665c] border border-[#d9d4c8] rounded-xl hover:bg-[#f7f3ea] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0075de] hover:bg-[#0060b8] rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? "Saving…" : "Save changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
