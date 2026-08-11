/**
 * public/js/import.js — Hardened CSV/Excel client-side import
 *
 * Sheet selection, formula values (not formula text), tolerant date/currency
 * parsing, header detection, empty/total-row filtering, chunked processing.
 * Plain Vanilla JS (ES Modules). SheetJS loaded from CDN when needed.
 */

const MAX_IMPORT_ROWS = 5000;
const PROGRESS_THRESHOLD = 200;
const CHUNK_SIZE = 100;

// ---------------------------------------------------------------------------
// SheetJS loader
// ---------------------------------------------------------------------------

export async function loadSheetJS() {
  if (typeof window !== "undefined" && window.XLSX) return window.XLSX;

  await new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("SheetJS requires a browser environment."));
      return;
    }
    const existing = document.querySelector('script[data-snapsme-xlsx]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load SheetJS.")));
      if (window.XLSX) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.async = true;
    script.dataset.snapsmeXlsx = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load SheetJS library for Excel parsing."));
    document.head.appendChild(script);
  });

  if (!window.XLSX) throw new Error("SheetJS library is unavailable.");
  return window.XLSX;
}

// ---------------------------------------------------------------------------
// Workbook open & sheet extraction
// ---------------------------------------------------------------------------

/**
 * Reads an .xlsx ArrayBuffer into a workbook object (SheetJS).
 * cellDates: true → Excel date serials become Date objects
 * Formula cells: sheet_to_json / cell.v reads cached calculated values, not .f
 */
export async function openWorkbook(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const data = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, {
    type: "array",
    cellDates: true,
    cellNF: false,
    cellText: false
  });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Excel file contains no worksheets.");
  }
  return { workbook, sheetNames: workbook.SheetNames.slice(), XLSX };
}

/**
 * Extracts raw 2D row array from a named sheet.
 * Uses raw: true so numbers stay numbers and formula cells yield cached .v values.
 */
export function extractSheetRows(workbook, sheetName, XLSX) {
  const lib = XLSX || (typeof window !== "undefined" ? window.XLSX : null);
  if (!lib) throw new Error("SheetJS library is unavailable.");

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error(`Sheet "${sheetName}" was not found.`);

  // header:1 → array-of-arrays; raw:true → computed values (not formula strings)
  const rawRows = lib.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false
  });

  // Also walk cells to detect formula-without-value for later skip reporting
  const formulaMissingCache = new Set();
  if (worksheet["!ref"]) {
    const range = lib.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = lib.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[addr];
        if (cell && cell.f && (cell.v === undefined || cell.v === null) && cell.w === undefined) {
          formulaMissingCache.add(`${R}:${C}`);
        }
      }
    }
  }

  const rows = (rawRows || []).map((row) => {
    const arr = Array.isArray(row) ? row : [];
    // Normalize cells: Date → keep Date; trim strings; leave numbers
    return arr.map((cell) => {
      if (cell === undefined || cell === null) return "";
      if (cell instanceof Date) return cell;
      if (typeof cell === "string") return cell.trim();
      return cell;
    });
  });

  return { rows, formulaMissingCache };
}

/**
 * Convenience: full parse of first sheet only (CSV-compatible shape).
 * Prefer openWorkbook + extractSheetRows for multi-sheet UX.
 */
export async function parseExcel(arrayBuffer, sheetName = null) {
  const { workbook, sheetNames, XLSX } = await openWorkbook(arrayBuffer);
  const chosen = sheetName || sheetNames[0];
  const { rows: allRows, formulaMissingCache } = extractSheetRows(workbook, chosen, XLSX);
  if (!allRows || allRows.length === 0) {
    throw new Error("Excel worksheet is empty.");
  }
  const prepared = prepareRowsFromGrid(allRows, { hasHeader: true, autoDetectHeader: true });
  return {
    ...prepared,
    sheetNames,
    sheetName: chosen,
    formulaMissingCache,
    workbook,
    XLSX
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export function parseCSV(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid CSV content provided.");
  }

  const lines = [];
  let curCell = "";
  let curRow = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nextC = text[i + 1];

    if (c === '"') {
      if (inQuotes && nextC === '"') {
        curCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      curRow.push(curCell.trim());
      curCell = "";
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && nextC === "\n") i++;
      curRow.push(curCell.trim());
      if (curRow.some((cell) => String(cell).length > 0)) {
        lines.push(curRow);
      }
      curRow = [];
      curCell = "";
    } else {
      curCell += c;
    }
  }

  if (curCell.length > 0 || curRow.length > 0) {
    curRow.push(curCell.trim());
    if (curRow.some((cell) => String(cell).length > 0)) {
      lines.push(curRow);
    }
  }

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  return prepareRowsFromGrid(lines, { hasHeader: true, autoDetectHeader: true });
}

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

const HEADER_HINTS =
  /^(date|amount|vendor|merchant|source|category|notes?|memo|currency|total|description|client|payee|submitted|month)$/i;

/**
 * Heuristic: does this row look like column labels rather than data?
 */
export function rowLooksLikeHeader(row = []) {
  if (!row || row.length === 0) return false;
  let textCells = 0;
  let headerish = 0;
  let numericOrDate = 0;
  for (const cell of row) {
    if (cell === "" || cell === null || cell === undefined) continue;
    if (typeof cell === "number" || cell instanceof Date) {
      numericOrDate++;
      continue;
    }
    const s = String(cell).trim();
    if (!s) continue;
    textCells++;
    if (HEADER_HINTS.test(s) || /date|amount|vendor|source|category|note|total|income|expense/i.test(s)) {
      headerish++;
    }
    // Pure numbers as text count against header
    if (/^[\d.,$€£₦()\-\s]+$/.test(s) && /\d/.test(s)) numericOrDate++;
  }
  if (textCells === 0) return false;
  if (headerish >= 2) return true;
  // Mostly short text labels, few numbers
  return headerish >= 1 && numericOrDate === 0 && textCells >= 2;
}

/**
 * Heuristic: first row looks like data (date + amount pattern) → likely no header.
 */
export function rowLooksLikeData(row = []) {
  if (!row || row.length < 2) return false;
  let hasDateLike = false;
  let hasAmountLike = false;
  for (const cell of row) {
    if (cell instanceof Date) hasDateLike = true;
    else if (typeof cell === "number" && cell > 20000 && cell < 60000) hasDateLike = true; // excel serial
    else if (typeof cell === "number" && Math.abs(cell) > 0 && Math.abs(cell) < 1e9) hasAmountLike = true;
    else if (typeof cell === "string") {
      if (parseImportDate(cell).ok) hasDateLike = true;
      if (parseImportAmount(cell).ok) hasAmountLike = true;
    }
  }
  return hasDateLike && hasAmountLike;
}

/**
 * Find best header row index in the first N rows, or 0.
 */
export function detectHeaderRowIndex(grid = [], maxScan = 12) {
  const limit = Math.min(grid.length, maxScan);
  for (let i = 0; i < limit; i++) {
    if (rowLooksLikeHeader(grid[i])) return i;
  }
  // If first row looks like data, signal no header
  if (grid.length > 0 && rowLooksLikeData(grid[0])) return -1;
  return 0;
}

/**
 * Split grid into headers + data rows.
 * @param {object} options
 * @param {boolean} [options.hasHeader=true]
 * @param {boolean} [options.autoDetectHeader=true]
 * @param {number|null} [options.headerRowIndex=null] force index
 */
export function prepareRowsFromGrid(grid, options = {}) {
  const {
    hasHeader = true,
    autoDetectHeader = true,
    headerRowIndex = null
  } = options;

  if (!grid || grid.length === 0) {
    return { headers: [], rows: [], headerRowIndex: 0, detectedNoHeader: false };
  }

  let hIdx = headerRowIndex;
  let detectedNoHeader = false;

  if (hIdx === null || hIdx === undefined) {
    if (!hasHeader) {
      detectedNoHeader = true;
      hIdx = -1;
    } else if (autoDetectHeader) {
      hIdx = detectHeaderRowIndex(grid);
      if (hIdx === -1) {
        detectedNoHeader = true;
      }
    } else {
      hIdx = 0;
    }
  }

  if (detectedNoHeader || hIdx < 0) {
    const colCount = Math.max(...grid.map((r) => (r || []).length), 1);
    const headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    const rows = grid
      .filter((r) => !isEntirelyEmptyRow(r))
      .map((r) => padRow(r, colCount));
    return { headers, rows, headerRowIndex: -1, detectedNoHeader: true, rawGrid: grid };
  }

  const headerRow = grid[hIdx] || [];
  const colCount = Math.max(
    headerRow.length,
    ...grid.slice(hIdx + 1).map((r) => (r || []).length),
    1
  );
  const headers = padRow(headerRow, colCount).map((h, i) => {
    const s = h === "" || h === null || h === undefined ? "" : String(h).trim();
    return s || `Column ${i + 1}`;
  });
  const rows = grid
    .slice(hIdx + 1)
    .filter((r) => !isEntirelyEmptyRow(r))
    .map((r) => padRow(r, colCount));

  return { headers, rows, headerRowIndex: hIdx, detectedNoHeader: false, rawGrid: grid };
}

function padRow(row, len) {
  const out = [];
  for (let i = 0; i < len; i++) {
    const v = row && row[i] !== undefined && row[i] !== null ? row[i] : "";
    out.push(typeof v === "string" ? v.trim() : v);
  }
  return out;
}

export function isEntirelyEmptyRow(row) {
  if (!row || row.length === 0) return true;
  return row.every((c) => c === "" || c === null || c === undefined);
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

/**
 * Parse amount with currency symbols, thousands separators, parentheses negatives.
 * Never defaults to 0 — returns { ok:false } when unparseable.
 */
export function parseImportAmount(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: false, reason: "empty_amount" };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { ok: false, reason: "invalid_amount" };
    // Excel date serials are large (~45k) — treat as amount only if reasonable
    return { ok: true, value: Math.round(raw * 100) / 100 };
  }
  if (raw instanceof Date) {
    return { ok: false, reason: "invalid_amount" };
  }

  let s = String(raw).trim();
  if (!s) return { ok: false, reason: "empty_amount" };

  // Parentheses negative: (120.00)
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (/^-/.test(s) || /−/.test(s)) {
    negative = true;
  }

  // Strip currency symbols and spaces
  s = s.replace(/[$€£¥₦₵₹₽₩₪]/g, "").replace(/\s/g, "");
  // Remove trailing currency codes
  s = s.replace(/(USD|EUR|GBP|NGN|KES|CAD|ZAR|AUD|INR)$/i, "");

  // Thousands separators: 1,234.56 or 1.234,56
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    // European: 1.234,56
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    // US: 1,234.56
    s = s.replace(/,/g, "");
  } else {
    // Remove remaining thousands commas if single decimal point
    const commaCount = (s.match(/,/g) || []).length;
    const dotCount = (s.match(/\./g) || []).length;
    if (commaCount > 0 && dotCount === 1) s = s.replace(/,/g, "");
    else if (commaCount === 1 && dotCount === 0) {
      // Ambiguous 1234,56 vs 1,234 — if 2 digits after comma, treat as decimal
      if (/,\d{1,2}$/.test(s)) s = s.replace(",", ".");
      else s = s.replace(/,/g, "");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  s = s.replace(/[^0-9.\-]/g, "");
  if (!s || s === "-" || s === ".") return { ok: false, reason: "invalid_amount" };

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return { ok: false, reason: "invalid_amount" };

  let value = Math.round(Math.abs(n) * 100) / 100;
  if (negative) value = -value;

  // Zero amount is invalid for import (skip, don't invent)
  if (value === 0) return { ok: false, reason: "zero_amount" };

  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

/**
 * Tolerant date parser. Never falls back to today.
 * Supports: Date objects, Excel serials, ISO, US/EU slash, "14-May-2026", etc.
 */
export function parseImportDate(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: false, reason: "empty_date" };
  }

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return { ok: false, reason: "invalid_date" };
    return { ok: true, value: toISODateLocal(raw) };
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial date (days since 1899-12-30, SheetJS/Excel convention)
    if (raw > 20000 && raw < 80000) {
      const d = excelSerialToDate(raw);
      if (d && !isNaN(d.getTime())) return { ok: true, value: toISODateLocal(d) };
    }
    return { ok: false, reason: "invalid_date" };
  }

  const s = String(raw).trim();
  if (!s) return { ok: false, reason: "empty_date" };

  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    if (validYMD(d, Number(m[1]), Number(m[2]), Number(m[3]))) {
      return { ok: true, value: toISODateLocal(d) };
    }
  }

  // DD-Mon-YYYY or DD Mon YYYY
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
  if (m) {
    const month = monthNameToIndex(m[2]);
    if (month >= 0) {
      const d = new Date(Number(m[3]), month, Number(m[1]), 12, 0, 0);
      if (validYMD(d, Number(m[3]), month + 1, Number(m[1]))) {
        return { ok: true, value: toISODateLocal(d) };
      }
    }
  }

  // Mon YYYY (summary sheets) → first of month
  m = s.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (m) {
    const month = monthNameToIndex(m[1]);
    if (month >= 0) {
      const d = new Date(Number(m[2]), month, 1, 12, 0, 0);
      return { ok: true, value: toISODateLocal(d) };
    }
  }

  // Slash / dash numeric: try MDY then DMY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    // If first > 12, must be DMY
    if (a > 12 && b <= 12) {
      const d = new Date(y, b - 1, a, 12, 0, 0);
      if (validYMD(d, y, b, a)) return { ok: true, value: toISODateLocal(d) };
    } else if (b > 12 && a <= 12) {
      const d = new Date(y, a - 1, b, 12, 0, 0);
      if (validYMD(d, y, a, b)) return { ok: true, value: toISODateLocal(d) };
    } else {
      // Prefer MDY (US) then DMY
      const d1 = new Date(y, a - 1, b, 12, 0, 0);
      if (validYMD(d1, y, a, b)) return { ok: true, value: toISODateLocal(d1) };
      const d2 = new Date(y, b - 1, a, 12, 0, 0);
      if (validYMD(d2, y, b, a)) return { ok: true, value: toISODateLocal(d2) };
    }
  }

  // Last resort: Date.parse (still no "today" fallback)
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    if (!isNaN(d.getTime())) {
      // Reject clearly wrong years
      const year = d.getFullYear();
      if (year >= 1990 && year <= 2100) {
        return { ok: true, value: toISODateLocal(d) };
      }
    }
  }

  return { ok: false, reason: "invalid_date" };
}

function excelSerialToDate(serial) {
  // Excel epoch with leap-year bug: day 0 = 1899-12-30
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000);
  return new Date(utc);
}

function toISODateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function validYMD(d, y, m, day) {
  return (
    d &&
    !isNaN(d.getTime()) &&
    d.getFullYear() === y &&
    d.getMonth() === m - 1 &&
    d.getDate() === day
  );
}

function monthNameToIndex(name) {
  const n = String(name).toLowerCase().slice(0, 3);
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return months.indexOf(n);
}

// ---------------------------------------------------------------------------
// Column mapping suggestions
// ---------------------------------------------------------------------------

export function suggestColumnMappings(headers = []) {
  const mappings = {};
  const used = new Set();

  const tryMap = (index, field) => {
    if (used.has(field) && field !== "ignore") return;
    mappings[index] = field;
    if (field !== "ignore") used.add(field);
  };

  headers.forEach((header, index) => {
    const h = String(header || "").toLowerCase().trim();
    if (!h || /^column\s+\d+$/i.test(h)) {
      mappings[index] = "ignore";
      return;
    }
    if (/^(amount|price|cost|sum|value|money|total\s*(income|expense|expenses)?)$/i.test(h) ||
        (/amount|price|cost/.test(h) && !/category|date/.test(h))) {
      tryMap(index, "amount");
    } else if (/^date$|timestamp|created|txn\s*date|transaction\s*date/i.test(h) ||
               (/date|time/.test(h) && !/update|modified/.test(h))) {
      tryMap(index, "date");
    } else if (/month|period/i.test(h)) {
      tryMap(index, "date");
    } else if (/vendor|merchant|payee|supplier/i.test(h)) {
      tryMap(index, "vendorSource");
    } else if (/^(source|client|customer|payer)$/i.test(h) || /source|client|customer/.test(h)) {
      tryMap(index, "vendorSource");
    } else if (/category|type|dept|department|tag|group/i.test(h)) {
      tryMap(index, "category");
    } else if (/note|memo|detail|comment|remark|description/i.test(h)) {
      tryMap(index, "notes");
    } else if (/currency|ccy/i.test(h)) {
      mappings[index] = "ignore"; // currency handled via workspace default for now
    } else if (/submitted|staff|member|employee|by$/i.test(h)) {
      mappings[index] = "ignore";
    } else {
      mappings[index] = "ignore";
    }
  });

  return mappings;
}

// ---------------------------------------------------------------------------
// Non-data / total row detection
// ---------------------------------------------------------------------------

const TOTAL_LABEL =
  /^(total|totals|subtotal|sub-total|grand\s*total|sum|net\s*(cashflow|total)?|balance)(\s|$|:)/i;

/**
 * Detect summary/total/title rows that should not import as transactions.
 */
export function isNonDataRow(row, columnMappings, recordFields) {
  const vendor = String(recordFields.vendorSource || "").trim();
  const notes = String(recordFields.notes || "").trim();
  const category = String(recordFields.categoryName || "").trim();

  if (TOTAL_LABEL.test(vendor) || TOTAL_LABEL.test(notes) || TOTAL_LABEL.test(category)) {
    return { skip: true, reason: "total_or_summary_row" };
  }

  // "Total Expenses" often sits in the vendor column with only amount filled
  const nonEmpty = (row || []).filter((c) => c !== "" && c !== null && c !== undefined).length;
  if (nonEmpty <= 2 && TOTAL_LABEL.test(vendor + " " + notes + " " + category)) {
    return { skip: true, reason: "total_or_summary_row" };
  }

  // Title-like long banner row (many empty cols, one long text)
  if (nonEmpty === 1) {
    const only = (row || []).find((c) => c !== "" && c !== null && c !== undefined);
    if (typeof only === "string" && only.length > 40) {
      return { skip: true, reason: "title_or_note_row" };
    }
  }

  return { skip: false };
}

// ---------------------------------------------------------------------------
// Row processing (sync chunk body)
// ---------------------------------------------------------------------------

function mapRowFields(row, columnMappings) {
  const record = {
    amount: null,
    date: null,
    vendorSource: "",
    categoryName: "",
    notes: ""
  };

  Object.entries(columnMappings || {}).forEach(([colIndex, targetField]) => {
    if (targetField === "ignore" || !targetField) return;
    const idx = parseInt(colIndex, 10);
    let val = row[idx];
    if (val === undefined || val === null) return;
    if (typeof val === "string") val = val.trim();
    if (val === "") return;

    if (targetField === "amount") record.amount = val;
    else if (targetField === "date") record.date = val;
    else if (targetField === "vendorSource") record.vendorSource = String(val).trim();
    else if (targetField === "category") record.categoryName = String(val).trim();
    else if (targetField === "notes") record.notes = String(val).trim();
  });

  return record;
}

function processOneRow(row, rowIndex, columnMappings, type, workspaceCategories, currency, currentUser, headerOffset) {
  const rowNumber = rowIndex + 1 + (headerOffset >= 0 ? headerOffset + 1 : 1);

  if (isEntirelyEmptyRow(row)) {
    return { kind: "empty" };
  }

  const fields = mapRowFields(row, columnMappings);

  const nonData = isNonDataRow(row, columnMappings, fields);
  if (nonData.skip) {
    return {
      kind: "skipped",
      category: "non_data",
      rowNumber,
      reason: nonData.reason === "title_or_note_row"
        ? "Skipped title/note row"
        : "Skipped total/summary row",
      raw: row
    };
  }

  const amountResult = parseImportAmount(fields.amount);
  if (!amountResult.ok) {
    // If nothing useful mapped, treat as empty-ish non-data
    if (!fields.date && !fields.vendorSource && !fields.amount) {
      return { kind: "empty" };
    }
    return {
      kind: "skipped",
      category: "amount",
      rowNumber,
      reason:
        amountResult.reason === "empty_amount"
          ? "Unparseable amount (empty)"
          : amountResult.reason === "zero_amount"
            ? "Amount is zero"
            : `Unparseable amount (${String(fields.amount).slice(0, 40)})`,
      raw: row
    };
  }

  // Import uses absolute amounts for expense/income logs (sign not required)
  const amount = Math.abs(amountResult.value);

  const dateResult = parseImportDate(fields.date);
  if (!dateResult.ok) {
    return {
      kind: "skipped",
      category: "date",
      rowNumber,
      reason:
        dateResult.reason === "empty_date"
          ? "Unparseable date (empty)"
          : `Unparseable date (${String(fields.date).slice(0, 40)})`,
      raw: row
    };
  }

  const vendorOrSource = fields.vendorSource
    ? fields.vendorSource.trim()
    : type === "expenses"
      ? "Imported Expense"
      : "Imported Income";

  let categoryId = null;
  let finalCatName = fields.categoryName
    ? fields.categoryName.trim()
    : type === "expenses"
      ? "Other Expenses"
      : "General Income";

  if (fields.categoryName && workspaceCategories && workspaceCategories.length > 0) {
    const match = workspaceCategories.find(
      (c) => c.name.toLowerCase() === fields.categoryName.trim().toLowerCase()
    );
    if (match) {
      categoryId = match.id;
      finalCatName = match.name;
    }
  }

  const now = new Date().toISOString();
  const base = {
    submittedBy: currentUser?.userId || "user",
    submittedByName: currentUser?.displayName || "Team Member",
    amount,
    currency: currency || "USD",
    date: dateResult.value,
    notes: fields.notes ? fields.notes.trim() : "",
    createdAt: now
  };

  if (type === "expenses") {
    return {
      kind: "valid",
      record: {
        ...base,
        vendor: vendorOrSource,
        category: categoryId,
        categoryName: finalCatName,
        moneyMovement: "company_card",
        source: "csv_import",
        syncStatus: "synced"
      }
    };
  }

  return {
    kind: "valid",
    record: {
      ...base,
      source: vendorOrSource,
      sourceType: "csv_import",
      origin: "csv_import"
    }
  };
}

/**
 * Process rows with categorized skip reasons.
 * Sync version for small files; use processImportRowsAsync for large files.
 */
export function processImportRows(
  rows,
  columnMappings,
  type = "expenses",
  workspaceCategories = [],
  currency = "USD",
  currentUser = null,
  options = {}
) {
  const headerOffset = options.headerRowIndex != null ? options.headerRowIndex : 0;

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `File contains ${rows.length} rows, exceeding the limit of ${MAX_IMPORT_ROWS} rows per import. Please split your file into smaller batches.`
    );
  }

  const validRecords = [];
  const skippedByCategory = {
    date: [],
    amount: [],
    non_data: [],
    other: []
  };
  let emptyCount = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const result = processOneRow(
      rows[rowIndex],
      rowIndex,
      columnMappings,
      type,
      workspaceCategories,
      currency,
      currentUser,
      headerOffset
    );

    if (result.kind === "empty") {
      emptyCount++;
      continue;
    }
    if (result.kind === "valid") {
      validRecords.push(result.record);
      continue;
    }
    const cat = result.category || "other";
    if (!skippedByCategory[cat]) skippedByCategory[cat] = [];
    skippedByCategory[cat].push({
      rowNumber: result.rowNumber,
      reason: result.reason,
      raw: result.raw
    });
  }

  const skippedRows = [
    ...skippedByCategory.date,
    ...skippedByCategory.amount,
    ...skippedByCategory.non_data,
    ...skippedByCategory.other
  ];

  return {
    validRecords,
    skippedRows,
    skippedByCategory,
    emptyCount,
    totalRows: rows.length,
    summary: {
      imported: validRecords.length,
      skippedUnparseableDates: skippedByCategory.date.length,
      skippedUnparseableAmounts: skippedByCategory.amount.length,
      skippedNonData: skippedByCategory.non_data.length,
      skippedOther: skippedByCategory.other.length,
      emptyRowsIgnored: emptyCount
    }
  };
}

/**
 * Async chunked processing — keeps UI responsive for large files.
 * @param {(progress: {processed:number,total:number}) => void} [onProgress]
 */
export async function processImportRowsAsync(
  rows,
  columnMappings,
  type = "expenses",
  workspaceCategories = [],
  currency = "USD",
  currentUser = null,
  options = {},
  onProgress = null
) {
  const headerOffset = options.headerRowIndex != null ? options.headerRowIndex : 0;

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `File contains ${rows.length} rows, exceeding the limit of ${MAX_IMPORT_ROWS} rows per import. Please split your file into smaller batches.`
    );
  }

  const validRecords = [];
  const skippedByCategory = {
    date: [],
    amount: [],
    non_data: [],
    other: []
  };
  let emptyCount = 0;
  const total = rows.length;

  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total);
    for (let rowIndex = start; rowIndex < end; rowIndex++) {
      const result = processOneRow(
        rows[rowIndex],
        rowIndex,
        columnMappings,
        type,
        workspaceCategories,
        currency,
        currentUser,
        headerOffset
      );

      if (result.kind === "empty") emptyCount++;
      else if (result.kind === "valid") validRecords.push(result.record);
      else {
        const cat = result.category || "other";
        if (!skippedByCategory[cat]) skippedByCategory[cat] = [];
        skippedByCategory[cat].push({
          rowNumber: result.rowNumber,
          reason: result.reason,
          raw: result.raw
        });
      }
    }

    if (typeof onProgress === "function") {
      onProgress({ processed: end, total });
    }

    // Yield to browser so UI stays responsive
    if (end < total) {
      await new Promise((resolve) => {
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(() => resolve(), { timeout: 50 });
        } else {
          setTimeout(resolve, 0);
        }
      });
    }
  }

  const skippedRows = [
    ...skippedByCategory.date,
    ...skippedByCategory.amount,
    ...skippedByCategory.non_data,
    ...skippedByCategory.other
  ];

  return {
    validRecords,
    skippedRows,
    skippedByCategory,
    emptyCount,
    totalRows: total,
    summary: {
      imported: validRecords.length,
      skippedUnparseableDates: skippedByCategory.date.length,
      skippedUnparseableAmounts: skippedByCategory.amount.length,
      skippedNonData: skippedByCategory.non_data.length,
      skippedOther: skippedByCategory.other.length,
      emptyRowsIgnored: emptyCount
    }
  };
}

export { MAX_IMPORT_ROWS, PROGRESS_THRESHOLD };
