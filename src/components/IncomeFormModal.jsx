import React, { useState } from "react";
import { getCurrencySymbol } from "../lib/currencies.js";
import { ArrowDownLeft, X } from "lucide-react";

/**
 * IncomeFormModal — lightweight money-in log form (NOT invoicing).
 * Fastest form in the app: amount, source, date, optional notes. No AI step.
 *
 * FR-I1: Owner or staff can log an income entry.
 */
export const IncomeFormModal = ({ isOpen, onClose, currency = "USD", currentUser, onSaveIncome }) => {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    const trimmedSource = source.trim();
    if (!trimmedSource) {
      setError("Enter a short source (e.g. Product sales, Client payment).");
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a valid date.");
      return;
    }

    const entry = {
      id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      submittedBy: currentUser?.userId || currentUser?.uid || "usr_guest",
      submittedByName: currentUser?.displayName || "Team member",
      amount: Math.round(parsedAmount * 100) / 100,
      currency: (currency || "USD").toString().trim().toUpperCase() || "USD",
      source: trimmedSource,
      date,
      notes: notes.trim() || null,
      createdAt: new Date().toISOString()
    };

    setIsSaving(true);
    try {
      if (typeof onSaveIncome === "function") {
        await onSaveIncome(entry);
      }
      setAmount("");
      setSource("");
      setNotes("");
      setDate(new Date().toISOString().slice(0, 10));
      onClose();
    } catch (err) {
      setError(err?.message || "Could not save income entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-up">
        <div className="flex items-start justify-between pb-3 border-b border-[#d9d4c8]">
          <div>
            <h3 className="font-display font-bold text-lg text-[#1c1b19] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#e7f4ec] text-[#0f7a52] flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
              Log income
            </h3>
            <p className="text-[11px] text-[#6b665c] mt-0.5">
              Record money that came in — not an invoice.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6b665c] hover:text-[#1c1b19] p-1 rounded-lg cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
              Amount <span className="text-[#f64932]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#6b665c]">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-8 py-2.5 text-sm font-mono font-bold text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
              Source <span className="text-[#f64932]">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Product sales, Client payment — Acme"
              className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
              Date <span className="text-[#f64932]">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
              Notes <span className="text-[#6b665c] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering"
              className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors resize-y"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#0f7a52] hover:bg-[#0b5e3f] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving…" : "Save income"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};