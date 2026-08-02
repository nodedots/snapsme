import React, { useState, useEffect, useRef } from "react";
import { WORLD_CURRENCIES, convertCurrency, getCurrencySymbol, fetchLiveExchangeRates } from "../lib/currencies.js";
import {
  Camera,
  Mic,
  Edit3,
  X,
  Upload,
  Check,
  AlertTriangle,
  Loader2,
  Sparkles,
  DollarSign,
  Calendar,
  Building,
  Tag,
  CreditCard,
  Volume2,
  FileText,
  RefreshCw
} from "lucide-react";
import { ConfidenceDot } from "./ConfidenceDot";

export const CaptureModal = ({
  isOpen,
  onClose,
  categories,
  currentUser,
  workspaceCurrency,
  isOfflineMode,
  onSaveExpense
}) => {
  const [activeTab, setActiveTab] = useState("photo");
  const [fileInputKey, setFileInputKey] = useState(0);

  // Extracted/Edited form values
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(workspaceCurrency || "USD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [categoryName, setCategoryName] = useState(categories[0]?.name || "General");
  const [moneyMovement, setMoneyMovement] = useState("company_card");
  const [notes, setNotes] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadedDocInfo, setUploadedDocInfo] = useState(null);

  // Fetch live exchange rates on modal open
  useEffect(() => {
    if (isOpen) {
      fetchLiveExchangeRates(workspaceCurrency || "USD");
    }
  }, [isOpen, workspaceCurrency]);

  // Voice note state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  // AI & Processing flags
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);
  const [correctedFields, setCorrectedFields] = useState([]);
  const [noticeMessage, setNoticeMessage] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    const catObj = categories.find((c) => c.id === selectedId);
    setCategoryId(selectedId);
    setCategoryName(catObj ? catObj.name : "Other");

    if (aiConfidence && !correctedFields.includes("category")) {
      setCorrectedFields([...correctedFields, "category"]);
    }
  };

  const handleFieldEdit = (field, value) => {
    if (field === "vendor") setVendor(value);
    if (field === "amount") setAmount(value);
    if (field === "date") setDate(value);

    if (aiConfidence && !correctedFields.includes(field)) {
      setCorrectedFields([...correctedFields, field]);
    }
  };

  // Process photo or document (PDF / DOCX) uploading
  const handlePhotoUpload = async (file) => {
    if (!file) return;

    const isDoc = file.type.includes("pdf") ||
                  file.type.includes("word") ||
                  file.type.includes("officedocument") ||
                  file.name.endsWith(".pdf") ||
                  file.name.endsWith(".docx") ||
                  file.name.endsWith(".doc");

    setUploadedDocInfo({
      name: file.name,
      size: file.size ? `${(file.size / 1024).toFixed(0)} KB` : "Document",
      type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      isDocument: isDoc
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Str = e.target?.result;
      if (!isDoc) {
        setPreviewImage(base64Str);
      }
      setIsProcessingAI(true);
      setNoticeMessage(null);

      try {
        const response = await fetch("/api/extract-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Str,
            mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
            fileName: file.name
          })
        });

        const resData = await response.json();

        if (resData.success && resData.data) {
          const d = resData.data;
          setVendor(d.vendor || "");
          setAmount(d.amount ? String(d.amount) : "");
          setCurrency(d.currency || workspaceCurrency);
          setDate(d.date || new Date().toISOString().split("T")[0]);

          // Match category
          const matchedCat = categories.find(
            (c) => c.name.toLowerCase() === (d.suggestedCategory || "").toLowerCase()
          );
          if (matchedCat) {
            setCategoryId(matchedCat.id);
            setCategoryName(matchedCat.name);
          }

          setAiConfidence(d.confidence || { vendor: 0.9, amount: 0.95, date: 0.85, category: 0.88 });
          if (resData.notice) {
            setNoticeMessage(resData.notice);
          }
        }
      } catch (err) {
        console.error("AI photo/document extraction error:", err);
      } finally {
        setIsProcessingAI(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Voice note simulation / API call
  const handleVoiceProcess = async (simulatedText) => {
    const textToProcess = simulatedText || voiceTranscript || "Paid 28 dollars for lunch at Cafe";
    setIsProcessingAI(true);

    try {
      const response = await fetch("/api/extract-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: textToProcess
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const d = resData.data;
        setVendor(d.vendor || "");
        setAmount(d.amount ? String(d.amount) : "");
        setCurrency(d.currency || workspaceCurrency);
        setDate(d.date || new Date().toISOString().split("T")[0]);
        setVoiceTranscript(d.transcriptText || textToProcess);

        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === (d.suggestedCategory || "").toLowerCase()
        );
        if (matchedCat) {
          setCategoryId(matchedCat.id);
          setCategoryName(matchedCat.name);
        }

        setAiConfidence(d.confidence || { vendor: 0.82, amount: 0.90, date: 0.75, category: 0.80 });
        if (resData.notice) {
          setNoticeMessage(resData.notice);
        }
      }
    } catch (err) {
      console.error("Voice extraction error:", err);
    } finally {
      setIsProcessingAI(false);
      setIsRecordingVoice(false);
    }
  };

  const handleSimulateMicrophone = () => {
    setIsRecordingVoice(true);
    setTimeout(() => {
      const samples = [
        "Fuel refuel 45 dollars at Shell for truck 3",
        "Paid 85 dollars cash for office paper and printer cartridges at Staples",
        "Team lunch 62 dollars at Mama's Bistro on company card"
      ];
      const choice = samples[Math.floor(Math.random() * samples.length)];
      setVoiceTranscript(choice);
      handleVoiceProcess(choice);
    }, 2000);
  };

  const conversion = convertCurrency(amount, currency, workspaceCurrency || "USD");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!vendor.trim() || !amount) {
      alert("Please enter at least a merchant/vendor name and an amount.");
      return;
    }

    const defaultCurrency = workspaceCurrency || "USD";

    onSaveExpense({
      businessId: currentUser?.businessId || "biz_default",
      submittedBy: currentUser?.userId || "usr_guest",
      submittedByName: currentUser?.displayName || "Guest User",
      submittedByRole: currentUser?.role || "owner",
      amount: conversion.convertedAmount,
      currency: defaultCurrency,
      originalAmount: parseFloat(amount),
      originalCurrency: currency,
      exchangeRate: conversion.exchangeRate,
      isConverted: conversion.isConverted,
      vendor: vendor.trim(),
      categoryId: categoryId || categories[0]?.id || "cat_general",
      categoryName: categoryName || "General",
      moneyMovement,
      date,
      source: activeTab,
      receiptImageUrl: previewImage || undefined,
      voiceTranscript: voiceTranscript || undefined,
      aiConfidence,
      correctedFields,
      syncStatus: isOfflineMode ? "pending" : "synced",
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className="bg-[#ffffff] border border-black/10 rounded-xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 box-border min-w-0">
        {/* Header */}
        <div className="bg-[#f6f5f4] px-5 py-4 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-black/10 flex items-center justify-center shrink-0">
              <img src="/logo.jpg" alt="SnapSME Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#000000]">Snap New Expense</h2>
              <p className="text-xs text-[#615d59]">Capture receipt, speak voice note, or enter details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#757575] hover:text-[#000000] p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Mode Tabs */}
        <div className="grid grid-cols-3 bg-[#f6f5f4] p-1.5 border-b border-black/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("photo")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "photo" ? "bg-white text-[#1c1b19] shadow-2xs border border-[#d9d4c8]" : "text-[#6b665c]"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Receipt Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "voice" ? "bg-white text-[#1c1b19] shadow-2xs border border-[#d9d4c8]" : "text-[#6b665c]"
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-purple-600" />
            <span>Voice Note</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "manual" ? "bg-white text-[#1c1b19] shadow-2xs border border-[#d9d4c8]" : "text-[#6b665c]"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#1c1b19]" />
            <span>Manual Form</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 space-y-2.5 max-h-[82vh] overflow-y-auto">
          {/* Photo Mode Capture Area */}
          {activeTab === "photo" && (
            <div className="space-y-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#d9d4c8] hover:border-[#0f7a52] bg-[#f7f3ea]/40 hover:bg-[#e7f4ec]/30 rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-colors relative group"
              >
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                />

                {previewImage || uploadedDocInfo ? (
                  <div className="relative rounded-lg border border-[#d9d4c8] bg-white p-2.5">
                    {uploadedDocInfo?.isDocument ? (
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-[#0075de] flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                          <FileText className="w-5 h-5 text-[#0075de]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs text-[#1c1b19] truncate">{uploadedDocInfo.name}</p>
                          <p className="text-[10px] text-[#6b665c]">{uploadedDocInfo.size} • {uploadedDocInfo.name.endsWith(".pdf") ? "PDF Document" : "Word Document"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="text-[11px] font-semibold text-[#0f7a52] hover:underline px-2 py-1 bg-[#e7f4ec] rounded"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative max-h-32 overflow-hidden rounded-lg border border-[#d9d4c8]">
                        <img src={previewImage} alt="Receipt preview" className="w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-[#1c1b19]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <Upload className="w-4 h-4" /> Change Receipt Photo / File
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    <div className="w-9 h-9 rounded-full bg-[#0f7a52]/10 text-[#0f7a52] mx-auto flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-xs text-[#1c1b19]">
                        Click to snap receipt or upload file
                      </p>
                      <p className="text-[10px] text-[#6b665c]">Supports JPG, PNG, WEBP images, PDF, and DOCX documents</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Mode Area */}
          {activeTab === "voice" && (
            <div className="bg-[#f7f3ea] p-4 rounded-xl border border-[#d9d4c8] space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <p className="font-display font-semibold text-xs text-[#1c1b19]">Speak your expense note</p>
                <p className="text-[11px] text-[#6b665c]">
                  Example: "Paid 45 dollars for diesel refuel at Shell on company card"
                </p>
              </div>

              <button
                type="button"
                onClick={handleSimulateMicrophone}
                disabled={isRecordingVoice || isProcessingAI}
                className="bg-purple-600 hover:bg-purple-700 text-white font-display text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 mx-auto cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                {isRecordingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Recording voice note...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" /> Speak Expense (Simulate Voice)
                  </>
                )}
              </button>

              {voiceTranscript && (
                <div className="bg-white p-2.5 rounded-lg border border-[#d9d4c8] text-left text-xs font-mono">
                  <span className="text-[10px] text-[#6b665c] block font-sans">Recognized Transcript:</span>
                  "{voiceTranscript}"
                </div>
              )}
            </div>
          )}

          {/* Processing Spinner */}
          {isProcessingAI && (
            <div className="bg-[#e7f4ec] border border-[#0f7a52]/40 p-3 rounded-xl flex items-center gap-2 text-xs text-[#0f7a52] font-semibold animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin shrink-0" />
              <span>AI is parsing receipt details and extracting confidence scores...</span>
            </div>
          )}

          {/* Notice Message */}
          {noticeMessage && (
            <div className="bg-[#fbf1de] border border-[#e0982a]/40 p-2.5 rounded-xl text-xs text-[#1c1b19] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#e0982a] shrink-0" />
              <span className="text-[11px]">{noticeMessage}</span>
            </div>
          )}

          {/* AI Confidence Indicators & Form Fields */}
          <div className="space-y-2.5 pt-1 w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full min-w-0">
              {/* Merchant / Vendor */}
              <div className="min-w-0">
                <label className="text-xs font-semibold text-[#1c1b19] flex items-center justify-between mb-1">
                  <span>Merchant / Vendor *</span>
                  {aiConfidence && <ConfidenceDot score={aiConfidence.vendor} fieldName="Vendor" showPercent />}
                </label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => handleFieldEdit("vendor", e.target.value)}
                  placeholder="e.g. Shell Gas Station, Staples"
                  className="w-full min-w-0 bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[#0f7a52] box-border"
                />
              </div>

              {/* Amount & Currency */}
              <div className="min-w-0">
                <label className="text-xs font-semibold text-[#1c1b19] flex items-center justify-between mb-1">
                  <span>Amount & Currency *</span>
                  {aiConfidence && <ConfidenceDot score={aiConfidence.amount} fieldName="Amount" showPercent />}
                </label>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => handleFieldEdit("amount", e.target.value)}
                    placeholder="0.00"
                    className="flex-1 min-w-0 w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-mono font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-[#0f7a52] box-border"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-24 shrink-0 bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-mono font-bold rounded-lg px-2 py-2 focus:outline-none cursor-pointer box-border"
                  >
                    {WORLD_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-Conversion Indicator for Default Accounting Currency */}
                {conversion.isConverted && parseFloat(amount) > 0 && (
                  <div className="mt-2 bg-[#e7f4ec] border border-[#0f7a52]/30 rounded-lg p-2 text-xs text-[#0f7a52]">
                    <div className="flex items-center justify-between font-semibold flex-wrap gap-1">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" /> Converted to Default Accounting Currency:
                      </span>
                      <span className="font-mono font-bold text-sm">
                        {getCurrencySymbol(workspaceCurrency || "USD")}{conversion.convertedAmount.toFixed(2)} {workspaceCurrency || "USD"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6b665c] mt-0.5 font-mono">
                      Recorded as {workspaceCurrency || "USD"} in ledger • Rate: 1 {currency} = {conversion.exchangeRate} {workspaceCurrency || "USD"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full min-w-0">
              {/* Category */}
              <div className="min-w-0">
                <label className="text-xs font-semibold text-[#1c1b19] flex items-center justify-between mb-1">
                  <span>Category *</span>
                  {aiConfidence && <ConfidenceDot score={aiConfidence.category} fieldName="Category" showPercent />}
                </label>
                <select
                  value={categoryId}
                  onChange={handleCategoryChange}
                  className="w-full min-w-0 bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-medium rounded-lg px-3 py-2 focus:outline-none cursor-pointer box-border"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="min-w-0">
                <label className="text-xs font-semibold text-[#1c1b19] flex items-center justify-between mb-1">
                  <span>Expense Date</span>
                  {aiConfidence && <ConfidenceDot score={aiConfidence.date} fieldName="Date" showPercent />}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleFieldEdit("date", e.target.value)}
                  className="w-full min-w-0 bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-medium rounded-lg px-3 py-2 focus:outline-none box-border"
                />
              </div>
            </div>

            {/* Money Movement Selector per PRD FR3 */}
            <div className="w-full min-w-0">
              <label className="text-xs font-semibold text-[#1c1b19] block mb-1">
                Money Movement Channel *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs w-full min-w-0">
                {[
                  { id: "company_card", label: "Company Card" },
                  { id: "personal_reimbursement", label: "Reimbursement" },
                  { id: "petty_cash", label: "Petty Cash" },
                  { id: "supplier_payment", label: "Supplier Direct" }
                ].map((mm) => (
                  <button
                    key={mm.id}
                    type="button"
                    onClick={() => setMoneyMovement(mm.id)}
                    className={`p-2 rounded-lg border font-medium text-[11px] text-center cursor-pointer transition-colors truncate min-w-0 ${
                      moneyMovement === mm.id
                        ? "bg-[#0f7a52] text-white border-[#0f7a52] font-bold"
                        : "bg-[#f7f3ea] text-[#1c1b19] border-[#d9d4c8] hover:border-[#0f7a52]"
                    }`}
                  >
                    {mm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-[#1c1b19] block mb-1">
                Notes / Context
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional purpose or job detail..."
                rows={2}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] text-xs font-medium rounded-lg p-2.5 focus:outline-none focus:border-[#0f7a52]"
              />
            </div>
          </div>

          {/* Corrected Fields Audit Notice */}
          {correctedFields.length > 0 && (
            <div className="bg-[#f7f3ea] border border-[#d9d4c8] p-2.5 rounded-lg text-[11px] text-[#6b665c] font-mono flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#0f7a52]" />
              <span>Corrected AI fields logged: {correctedFields.join(", ")}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#d9d4c8] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6b665c] hover:text-[#1c1b19] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingAI}
              className="bg-[#ff5a3c] hover:bg-[#e0482c] text-white font-display font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Save Expense Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
