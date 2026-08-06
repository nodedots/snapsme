/**
 * src/lib/import.js — CSV/Excel client-side import logic & Firestore batch save helper.
 */

import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * Parses raw CSV text into headers and row arrays.
 */
export function parseCSV(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid CSV content.");
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
    } else if (c === ',' && !inQuotes) {
      curRow.push(curCell.trim());
      curCell = "";
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && nextC === '\n') {
        i++;
      }
      curRow.push(curCell.trim());
      if (curRow.some(cell => cell.length > 0)) {
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
    if (curRow.some(cell => cell.length > 0)) {
      lines.push(curRow);
    }
  }

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headers = lines[0];
  const rows = lines.slice(1);

  return { headers, rows };
}

/**
 * Parses Excel (.xlsx) file using SheetJS (dynamically imported or from window.XLSX).
 */
export async function parseExcel(arrayBuffer) {
  let xlsxLib = window.XLSX;
  if (!xlsxLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load SheetJS library."));
      document.head.appendChild(script);
    });
    xlsxLib = window.XLSX;
  }

  if (!xlsxLib) {
    throw new Error("SheetJS library unavailable.");
  }

  const workbook = xlsxLib.read(new Uint8Array(arrayBuffer), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Excel file contains no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsxLib.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Excel worksheet is empty.");
  }

  const headers = (rawRows[0] || []).map(h => String(h || "").trim());
  const rows = rawRows.slice(1).map(row => (row || []).map(cell => String(cell !== undefined && cell !== null ? cell : "").trim()));

  return { headers, rows };
}

/**
 * Suggests default column mappings based on header labels.
 */
export function suggestColumnMappings(headers = []) {
  const mappings = {};
  headers.forEach((header, index) => {
    const h = header.toLowerCase();
    if (/amount|price|cost|total|sum|val|money/i.test(h)) {
      mappings[index] = "amount";
    } else if (/date|time|created|timestamp/i.test(h)) {
      mappings[index] = "date";
    } else if (/vendor|merchant|source|client|payee|customer|name|description/i.test(h)) {
      mappings[index] = "vendorSource";
    } else if (/category|type|dept|tag|group/i.test(h)) {
      mappings[index] = "category";
    } else if (/note|memo|detail|comment|remark/i.test(h)) {
      mappings[index] = "notes";
    } else {
      mappings[index] = "ignore";
    }
  });
  return mappings;
}

/**
 * Validates and maps rows. Max 2,000 rows.
 */
export function processImportRows(rows, columnMappings, type = "expenses", workspaceCategories = [], currency = "USD", currentUser = null) {
  const MAX_ROWS = 2000;
  if (rows.length > MAX_ROWS) {
    throw new Error(`File contains ${rows.length} rows, exceeding the limit of ${MAX_ROWS} rows per import. Please split your file into smaller batches.`);
  }

  const validRecords = [];
  const skippedRows = [];

  rows.forEach((row, rowIndex) => {
    const record = {
      amount: null,
      date: null,
      vendorSource: "",
      categoryName: "",
      notes: ""
    };

    Object.entries(columnMappings).forEach(([colIndex, targetField]) => {
      const idx = parseInt(colIndex, 10);
      const val = row[idx];
      if (val !== undefined && val !== null && targetField !== "ignore") {
        if (targetField === "amount") record.amount = val;
        if (targetField === "date") record.date = val;
        if (targetField === "vendorSource") record.vendorSource = val;
        if (targetField === "category") record.categoryName = val;
        if (targetField === "notes") record.notes = val;
      }
    });

    const cleanAmountStr = String(record.amount || "").replace(/[^0-9.-]/g, "");
    const parsedAmount = parseFloat(cleanAmountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      skippedRows.push({
        rowNumber: rowIndex + 2,
        reason: `Invalid or zero amount (${record.amount || "empty"})`,
        raw: row
      });
      return;
    }

    let parsedDateStr = new Date().toISOString().split("T")[0];
    if (record.date) {
      const d = new Date(record.date);
      if (!isNaN(d.getTime())) {
        parsedDateStr = d.toISOString().split("T")[0];
      }
    }

    const vendorOrSource = record.vendorSource ? record.vendorSource.trim() : (type === "expenses" ? "Imported Expense" : "Imported Income");

    let categoryId = null;
    let finalCatName = record.categoryName ? record.categoryName.trim() : (type === "expenses" ? "Other Expenses" : "General Income");

    if (record.categoryName && workspaceCategories.length > 0) {
      const match = workspaceCategories.find(c => c.name.toLowerCase() === record.categoryName.trim().toLowerCase());
      if (match) {
        categoryId = match.id;
        finalCatName = match.name;
      }
    }

    const now = new Date().toISOString();

    if (type === "expenses") {
      validRecords.push({
        submittedBy: currentUser?.userId || "user",
        submittedByName: currentUser?.displayName || "Team Member",
        amount: parsedAmount,
        currency: currency || "USD",
        vendor: vendorOrSource,
        category: categoryId,
        categoryName: finalCatName,
        date: parsedDateStr,
        moneyMovement: "company_card",
        source: "csv_import",
        notes: record.notes ? record.notes.trim() : "",
        syncStatus: "synced",
        createdAt: now
      });
    } else {
      validRecords.push({
        submittedBy: currentUser?.userId || "user",
        submittedByName: currentUser?.displayName || "Team Member",
        amount: parsedAmount,
        currency: currency || "USD",
        source: vendorOrSource,
        date: parsedDateStr,
        sourceType: "csv_import",
        notes: record.notes ? record.notes.trim() : "",
        createdAt: now
      });
    }
  });

  return {
    validRecords,
    skippedRows,
    totalRows: rows.length
  };
}

/**
 * Saves valid imported records in chunks using Firestore writeBatch.
 */
export async function batchSaveImportRecords(businessId, records, type = "expenses") {
  if (!businessId || !records || records.length === 0) return 0;

  const targetSubcol = type === "expenses" ? "expenses" : "income";
  const CHUNK_SIZE = 450; // Firestore batch cap is 500
  let savedCount = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((rec) => {
      const docRef = doc(collection(db, `businesses/${businessId}/${targetSubcol}`));
      batch.set(docRef, {
        ...rec,
        id: docRef.id
      });
    });

    await batch.commit();
    savedCount += chunk.length;
  }

  return savedCount;
}
