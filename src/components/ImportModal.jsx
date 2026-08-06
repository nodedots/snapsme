import React, { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  parseCSV,
  parseExcel,
  suggestColumnMappings,
  processImportRows,
  batchSaveImportRecords
} from "../lib/import.js";
import { getCurrencySymbol } from "../lib/currencies.js";

export const ImportModal = ({
  isOpen,
  onClose,
  type = "expenses",
  businessId,
  categories = [],
  currency = "USD",
  currentUser,
  onImportComplete
}) => {
  const [step, setStep] = useState(1); // 1: Select File, 2: Map Columns & Preview, 3: Validation Summary, 4: Success
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setColumnMappings({});
    setValidationResult(null);
    setIsProcessing(false);
    setImportError("");
    setSavedCount(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setImportError("");
    setIsProcessing(true);
    setFile(selectedFile);

    try {
      const fileName = selectedFile.name.toLowerCase();
      let parsedHeaders = [];
      let parsedRows = [];

      if (fileName.endsWith(".csv")) {
        const text = await selectedFile.text();
        const res = parseCSV(text);
        parsedHeaders = res.headers;
        parsedRows = res.rows;
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = await selectedFile.arrayBuffer();
        const res = await parseExcel(buffer);
        parsedHeaders = res.headers;
        parsedRows = res.rows;
      } else {
        throw new Error("Unsupported file format. Please select a .csv or .xlsx file.");
      }

      if (parsedRows.length === 0) {
        throw new Error("The selected file does not contain any data rows.");
      }

      setHeaders(parsedHeaders);
      setRows(parsedRows);
      const suggested = suggestColumnMappings(parsedHeaders);
      setColumnMappings(suggested);
      setStep(2);
    } catch (err) {
      setImportError(err.message || "Failed to parse file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (colIndex, targetField) => {
    setColumnMappings(prev => ({
      ...prev,
      [colIndex]: targetField
    }));
  };

  const handleProceedToValidation = () => {
    setImportError("");
    try {
      const res = processImportRows(rows, columnMappings, type, categories, currency, currentUser);
      setValidationResult(res);
      setStep(3);
    } catch (err) {
      setImportError(err.message || "Validation failed.");
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validRecords.length === 0) return;

    setImportError("");
    setIsProcessing(true);

    try {
      let count = 0;
      if (businessId) {
        count = await batchSaveImportRecords(businessId, validationResult.validRecords, type);
      } else {
        // Fallback for offline demo mode
        count = validationResult.validRecords.length;
      }

      setSavedCount(count);
      setStep(4);
      if (typeof onImportComplete === "function") {
        onImportComplete(validationResult.validRecords, type);
      }
    } catch (err) {
      setImportError(err.message || "Failed to commit import records to database.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Target Field Labels
  const targetFieldOptions = type === "expenses" ? [
    { value: "ignore", label: "— Ignore Column —" },
    { value: "amount", label: "Amount *" },
    { value: "date", label: "Date *" },
    { value: "vendorSource", label: "Vendor / Merchant *" },
    { value: "category", label: "Category" },
    { value: "notes", label: "Notes / Memo" }
  ] : [
    { value: "ignore", label: "— Ignore Column —" },
    { value: "amount", label: "Amount *" },
    { value: "date", label: "Date *" },
    { value: "vendorSource", label: "Source / Client *" },
    { value: "category", label: "Category" },
    { value: "notes", label: "Notes / Memo" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d9d4c8] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0075de]/10 text-[#0075de] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#1c1b19]">
                Bulk Import {type === "expenses" ? "Expenses" : "Income"}
              </h3>
              <p className="text-xs text-[#6b665c]">
                Import CSV or Excel (.xlsx) records directly into your workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#6b665c] hover:text-[#1c1b19] font-bold text-lg cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* STEP 1: Select File */}
        {step === 1 && (
          <div className="space-y-4 py-4 flex-1">
            <label className="border-2 border-dashed border-[#d9d4c8] hover:border-[#0075de] bg-[#f7f3ea]/50 hover:bg-[#e6f3fe]/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#d9d4c8] flex items-center justify-center shadow-2xs">
                <Upload className="w-6 h-6 text-[#0075de]" />
              </div>
              <div>
                <span className="font-display font-bold text-sm text-[#1c1b19] block">
                  Choose a CSV or Excel file to upload
                </span>
                <span className="text-xs text-[#6b665c] block mt-0.5">
                  Supports .csv and .xlsx files (up to 2,000 rows max)
                </span>
              </div>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
            </label>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0075de] py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing spreadsheet file...</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Column Mapping & Preview */}
        {step === 2 && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="bg-[#f7f3ea] p-3 rounded-xl border border-[#d9d4c8] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0075de]" />
                <span className="font-semibold text-[#1c1b19]">{file?.name}</span>
              </div>
              <span className="font-mono text-[#6b665c] font-medium">{rows.length} rows detected</span>
            </div>

            <div>
              <h4 className="font-display font-bold text-xs text-[#1c1b19] mb-2">
                1. Map File Columns to SnapSME Fields
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {headers.map((header, idx) => (
                  <div key={idx} className="bg-white border border-[#d9d4c8] p-2.5 rounded-xl space-y-1">
                    <label className="block text-[11px] font-mono text-[#6b665c] truncate">
                      Column {idx + 1}: <strong className="text-[#1c1b19]">{header || `Header ${idx + 1}`}</strong>
                    </label>
                    <select
                      value={columnMappings[idx] || "ignore"}
                      onChange={(e) => handleMappingChange(idx, e.target.value)}
                      className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0075de]"
                    >
                      {targetFieldOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-display font-bold text-xs text-[#1c1b19] mb-2">
                2. Data Preview (First 5 Rows)
              </h4>
              <div className="overflow-x-auto border border-[#d9d4c8] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f7f3ea] border-b border-[#d9d4c8] text-[11px] font-mono text-[#6b665c]">
                      {headers.map((h, i) => (
                        <th key={i} className="p-2 font-semibold">
                          {h}
                          <span className="block text-[9px] text-[#0075de] font-bold uppercase">
                            → {columnMappings[i] || "ignore"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d9d4c8]/60 font-mono text-[11px]">
                    {rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#f7f3ea]/30">
                        {headers.map((_, cIdx) => (
                          <td key={cIdx} className="p-2 text-[#1c1b19] truncate max-w-[140px]">
                            {row[cIdx] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Pre-Import Validation Summary */}
        {step === 3 && validationResult && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#e7f4ec] border border-[#0f7a52]/30 p-3.5 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#0f7a52] shrink-0" />
                <div>
                  <span className="font-display font-bold text-base text-[#0f7a52] block">
                    {validationResult.validRecords.length} Ready to Import
                  </span>
                  <span className="text-xs text-[#0f7a52]/80 block">
                    Valid records ready for batch writing
                  </span>
                </div>
              </div>

              <div className="bg-[#fff6e5] border border-[#e0982a]/40 p-3.5 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-[#e0982a] shrink-0" />
                <div>
                  <span className="font-display font-bold text-base text-[#e0982a] block">
                    {validationResult.skippedRows.length} Rows Skipped
                  </span>
                  <span className="text-xs text-[#e0982a]/90 block">
                    Rows with missing/invalid amount or parsing errors
                  </span>
                </div>
              </div>
            </div>

            {/* Skipped Rows Error Details */}
            {validationResult.skippedRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-display font-bold text-xs text-[#1c1b19]">
                  Skipped Rows & Error Reasons
                </h4>
                <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {validationResult.skippedRows.map((errRow, idx) => (
                    <div key={idx} className="flex items-center justify-between text-amber-800 bg-white p-2 rounded-lg border border-amber-200">
                      <span>Row {errRow.rowNumber}: {errRow.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && (
          <div className="py-8 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#e7f4ec] text-[#0f7a52] flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#1c1b19]">
              Import Complete!
            </h3>
            <p className="text-xs text-[#6b665c] max-w-sm">
              Successfully imported <strong>{savedCount}</strong> {type === "expenses" ? "expense" : "income"} records into your workspace.
            </p>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-[#d9d4c8] flex items-center justify-end gap-2 shrink-0">
          {step === 1 && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
            >
              Cancel
            </button>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToValidation}
                className="bg-[#0075de] hover:bg-[#0060b8] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>Validate Mapping</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
              >
                Back to Mapping
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing || validationResult?.validRecords.length === 0}
                className="bg-[#0f7a52] hover:bg-[#0b5e3f] disabled:bg-gray-300 text-white font-display font-semibold text-xs px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing Records...</span>
                  </>
                ) : (
                  <span>Confirm & Import {validationResult?.validRecords.length} Records</span>
                )}
              </button>
            </>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleClose}
              className="bg-[#0f7a52] hover:bg-[#0b5e3f] text-white font-display font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
