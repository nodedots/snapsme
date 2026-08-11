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
  AlertCircle,
  Layers
} from "lucide-react";
import {
  parseCSV,
  openWorkbook,
  extractSheetRows,
  prepareRowsFromGrid,
  suggestColumnMappings,
  processImportRowsAsync,
  batchSaveImportRecords,
  PROGRESS_THRESHOLD
} from "../lib/import.js";

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
  // Steps: 1 file → 1.5 sheet → 2 map → 3 validate → 4 success
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [workbookMeta, setWorkbookMeta] = useState(null); // { workbook, sheetNames, XLSX }
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rawGrid, setRawGrid] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [noHeaderRow, setNoHeaderRow] = useState(false);
  const [columnMappings, setColumnMappings] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null); // { processed, total }
  const [importError, setImportError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setFile(null);
    setWorkbookMeta(null);
    setSheetNames([]);
    setSelectedSheet("");
    setRawGrid([]);
    setHeaders([]);
    setRows([]);
    setHeaderRowIndex(0);
    setNoHeaderRow(false);
    setColumnMappings({});
    setValidationResult(null);
    setIsProcessing(false);
    setProgress(null);
    setImportError("");
    setSavedCount(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const applyGridToMappingStep = (grid, opts = {}) => {
    const prepared = prepareRowsFromGrid(grid, {
      hasHeader: opts.noHeader ? false : true,
      autoDetectHeader: opts.noHeader ? false : true,
      headerRowIndex: opts.headerRowIndex != null ? opts.headerRowIndex : null
    });
    setRawGrid(grid);
    setHeaders(prepared.headers);
    setRows(prepared.rows);
    setHeaderRowIndex(prepared.headerRowIndex);
    setNoHeaderRow(prepared.detectedNoHeader || !!opts.noHeader);
    setColumnMappings(suggestColumnMappings(prepared.headers));
    setStep(2);
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setImportError("");
    setIsProcessing(true);
    setFile(selectedFile);
    setProgress(null);

    try {
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        const text = await selectedFile.text();
        const res = parseCSV(text);
        setWorkbookMeta(null);
        setSheetNames([]);
        setSelectedSheet("");
        setRawGrid(res.rawGrid || []);
        setHeaders(res.headers);
        setRows(res.rows);
        setHeaderRowIndex(res.headerRowIndex);
        setNoHeaderRow(!!res.detectedNoHeader);
        setColumnMappings(suggestColumnMappings(res.headers));
        if (res.rows.length === 0) {
          throw new Error("The selected file does not contain any data rows.");
        }
        setStep(2);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = await selectedFile.arrayBuffer();
        const { workbook, sheetNames: names, XLSX } = await openWorkbook(buffer);
        setWorkbookMeta({ workbook, sheetNames: names, XLSX });
        setSheetNames(names);

        if (names.length > 1) {
          setSelectedSheet(names[0]);
          setStep(1.5);
        } else {
          setSelectedSheet(names[0]);
          const { rows: grid } = extractSheetRows(workbook, names[0], XLSX);
          if (!grid.length) throw new Error("Excel worksheet is empty.");
          applyGridToMappingStep(grid);
        }
      } else {
        throw new Error("Unsupported file format. Please select a .csv or .xlsx file.");
      }
    } catch (err) {
      setImportError(err.message || "Failed to parse file.");
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSheet = () => {
    if (!workbookMeta || !selectedSheet) return;
    setImportError("");
    try {
      const { rows: grid } = extractSheetRows(
        workbookMeta.workbook,
        selectedSheet,
        workbookMeta.XLSX
      );
      if (!grid.length) {
        setImportError("That sheet is empty. Pick another sheet.");
        return;
      }
      applyGridToMappingStep(grid);
    } catch (err) {
      setImportError(err.message || "Failed to read sheet.");
    }
  };

  const handleToggleNoHeader = (checked) => {
    setNoHeaderRow(checked);
    if (!rawGrid || rawGrid.length === 0) return;
    applyGridToMappingStep(rawGrid, {
      noHeader: checked,
      headerRowIndex: checked ? -1 : null
    });
  };

  const handleMappingChange = (colIndex, targetField) => {
    setColumnMappings((prev) => ({
      ...prev,
      [colIndex]: targetField
    }));
  };

  const handleProceedToValidation = async () => {
    setImportError("");
    setIsProcessing(true);
    setProgress(rows.length >= PROGRESS_THRESHOLD ? { processed: 0, total: rows.length } : null);

    try {
      const res = await processImportRowsAsync(
        rows,
        columnMappings,
        type,
        categories,
        currency,
        currentUser,
        { headerRowIndex },
        rows.length >= PROGRESS_THRESHOLD
          ? (p) => setProgress(p)
          : null
      );
      setValidationResult(res);
      setStep(3);
    } catch (err) {
      setImportError(err.message || "Validation failed.");
    } finally {
      setIsProcessing(false);
      setProgress(null);
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

  const targetFieldOptions =
    type === "expenses"
      ? [
          { value: "ignore", label: "— Ignore Column —" },
          { value: "amount", label: "Amount *" },
          { value: "date", label: "Date *" },
          { value: "vendorSource", label: "Vendor / Merchant *" },
          { value: "category", label: "Category" },
          { value: "notes", label: "Notes / Memo" }
        ]
      : [
          { value: "ignore", label: "— Ignore Column —" },
          { value: "amount", label: "Amount *" },
          { value: "date", label: "Date *" },
          { value: "vendorSource", label: "Source / Client *" },
          { value: "category", label: "Category" },
          { value: "notes", label: "Notes / Memo" }
        ];

  const summary = validationResult?.summary;

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
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
                Import CSV or Excel (.xlsx) — multi-sheet, real-world formats supported
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
                  Supports .csv and .xlsx (multi-sheet OK · up to 5,000 rows)
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

        {/* STEP 1.5: Sheet selector */}
        {step === 1.5 && (
          <div className="space-y-4 flex-1">
            <div className="bg-[#e6f3fe] border border-[#0075de]/25 p-3 rounded-xl flex items-start gap-2.5 text-xs">
              <Layers className="w-4 h-4 text-[#0075de] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1c1b19]">
                  This workbook has {sheetNames.length} sheets
                </p>
                <p className="text-[#615d59] mt-0.5">
                  Choose which sheet holds the line-item rows you want to import. Summary sheets
                  are selectable too — you decide.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-display font-bold text-[#1c1b19]">
                Sheet to import
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="w-full bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl px-3 py-2.5 text-sm font-medium text-[#1c1b19] focus:outline-none focus:border-[#0075de]"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ul className="text-[11px] text-[#6b665c] font-mono space-y-0.5 pl-1">
                {sheetNames.map((name) => (
                  <li key={name}>
                    {name === selectedSheet ? "→ " : "  "}
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping & Preview */}
        {step === 2 && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="bg-[#f7f3ea] p-3 rounded-xl border border-[#d9d4c8] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#0075de] shrink-0" />
                <span className="font-semibold text-[#1c1b19] truncate">{file?.name}</span>
                {selectedSheet && (
                  <span className="font-mono text-[#0075de] bg-white border border-[#0075de]/20 px-1.5 py-0.5 rounded shrink-0">
                    {selectedSheet}
                  </span>
                )}
              </div>
              <span className="font-mono text-[#6b665c] font-medium shrink-0">
                {rows.length} data rows
              </span>
            </div>

            <label className="flex items-start gap-2.5 p-3 bg-white border border-[#d9d4c8] rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={noHeaderRow}
                onChange={(e) => handleToggleNoHeader(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-[#0075de] border-[#d9d4c8]"
              />
              <div>
                <span className="font-display font-bold text-xs text-[#1c1b19] block">
                  My file doesn't have a header row
                </span>
                <span className="text-[11px] text-[#6b665c] block">
                  Use when the first row is already data (dates, amounts). Columns become
                  Column 1, Column 2, …
                </span>
              </div>
            </label>

            <div>
              <h4 className="font-display font-bold text-xs text-[#1c1b19] mb-2">
                1. Map File Columns to SnapSME Fields
              </h4>
              <p className="text-[11px] text-[#6b665c] mb-2">
                Headers are auto-suggested when names match (Amount, Date, …). You can override any
                column.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {headers.map((header, idx) => (
                  <div key={idx} className="bg-white border border-[#d9d4c8] p-2.5 rounded-xl space-y-1">
                    <label className="block text-[11px] font-mono text-[#6b665c] truncate">
                      Column {idx + 1}:{" "}
                      <strong className="text-[#1c1b19]">{header || `Header ${idx + 1}`}</strong>
                    </label>
                    <select
                      value={columnMappings[idx] || "ignore"}
                      onChange={(e) => handleMappingChange(idx, e.target.value)}
                      className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0075de]"
                    >
                      {targetFieldOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
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
                            {row[cIdx] instanceof Date
                              ? row[cIdx].toISOString().slice(0, 10)
                              : row[cIdx] === "" || row[cIdx] == null
                                ? "—"
                                : String(row[cIdx])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {isProcessing && progress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#0075de]">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Validating rows…
                  </span>
                  <span className="font-mono">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <div className="h-1.5 bg-[#e6f3fe] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0075de] transition-all"
                    style={{
                      width: `${Math.round((progress.processed / Math.max(progress.total, 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Categorized validation summary */}
        {step === 3 && validationResult && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#e7f4ec] border border-[#0f7a52]/30 p-3.5 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#0f7a52] shrink-0" />
                <div>
                  <span className="font-display font-bold text-base text-[#0f7a52] block">
                    {summary?.imported ?? 0} Ready to Import
                  </span>
                  <span className="text-xs text-[#0f7a52]/80 block">
                    Valid transaction rows
                  </span>
                </div>
              </div>

              <div className="bg-[#fff6e5] border border-[#e0982a]/40 p-3.5 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-[#e0982a] shrink-0" />
                <div>
                  <span className="font-display font-bold text-base text-[#e0982a] block">
                    {(summary?.skippedUnparseableDates || 0) +
                      (summary?.skippedUnparseableAmounts || 0) +
                      (summary?.skippedNonData || 0) +
                      (summary?.skippedOther || 0)}{" "}
                    Rows Skipped
                  </span>
                  <span className="text-xs text-[#e0982a]/90 block">
                    Broken out by reason below
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white border border-[#d9d4c8] rounded-xl p-3">
                <span className="font-mono text-[10px] uppercase text-[#6b665c] tracking-wider">
                  Unparseable dates
                </span>
                <p className="font-display font-bold text-lg text-[#1c1b19]">
                  {summary?.skippedUnparseableDates ?? 0}
                </p>
              </div>
              <div className="bg-white border border-[#d9d4c8] rounded-xl p-3">
                <span className="font-mono text-[10px] uppercase text-[#6b665c] tracking-wider">
                  Unparseable amounts
                </span>
                <p className="font-display font-bold text-lg text-[#1c1b19]">
                  {summary?.skippedUnparseableAmounts ?? 0}
                </p>
              </div>
              <div className="bg-white border border-[#d9d4c8] rounded-xl p-3">
                <span className="font-mono text-[10px] uppercase text-[#6b665c] tracking-wider">
                  Totals / non-data rows
                </span>
                <p className="font-display font-bold text-lg text-[#1c1b19]">
                  {summary?.skippedNonData ?? 0}
                </p>
              </div>
              <div className="bg-white border border-[#d9d4c8] rounded-xl p-3">
                <span className="font-mono text-[10px] uppercase text-[#6b665c] tracking-wider">
                  Empty rows ignored
                </span>
                <p className="font-display font-bold text-lg text-[#1c1b19]">
                  {summary?.emptyRowsIgnored ?? 0}
                </p>
              </div>
            </div>

            {validationResult.skippedRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-display font-bold text-xs text-[#1c1b19]">
                  Skip details (sample)
                </h4>
                <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {validationResult.skippedRows.slice(0, 40).map((errRow, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-amber-900 bg-white p-2 rounded-lg border border-amber-200"
                    >
                      <span>
                        Row {errRow.rowNumber}: {errRow.reason}
                      </span>
                    </div>
                  ))}
                  {validationResult.skippedRows.length > 40 && (
                    <p className="text-[#6b665c] text-center pt-1">
                      +{validationResult.skippedRows.length - 40} more…
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="py-8 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#e7f4ec] text-[#0f7a52] flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#1c1b19]">Import Complete!</h3>
            <p className="text-xs text-[#6b665c] max-w-sm">
              Successfully imported <strong>{savedCount}</strong>{" "}
              {type === "expenses" ? "expense" : "income"} records into your workspace.
            </p>
          </div>
        )}

        {/* Actions */}
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

          {step === 1.5 && (
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
                onClick={handleConfirmSheet}
                className="bg-[#0075de] hover:bg-[#0060b8] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>Use “{selectedSheet}”</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(sheetNames.length > 1 ? 1.5 : 1)}
                className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToValidation}
                disabled={isProcessing}
                className="bg-[#0075de] hover:bg-[#0060b8] disabled:opacity-60 text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating…</span>
                  </>
                ) : (
                  <>
                    <span>Validate Mapping</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
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
                  <span>
                    Confirm & Import {validationResult?.validRecords.length} Records
                  </span>
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
