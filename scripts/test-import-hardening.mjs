import fs from "fs";
import * as XLSX from "xlsx";
import {
  prepareRowsFromGrid,
  suggestColumnMappings,
  processImportRows,
  parseImportDate,
  parseImportAmount
} from "../public/js/import.js";

const amountCases = [
  "1234.56",
  "1,234.56",
  "(120.00)",
  "120",
  "bad",
  "500 USD",
  "1.234,56",
  "$1,234.56",
  "₦5,000",
  ""
];
console.log("=== AMOUNT CASES ===");
for (const c of amountCases) {
  console.log(JSON.stringify(c), "→", parseImportAmount(c));
}

console.log("\n=== DATE CASES ===");
for (const c of ["2026-05-01", "05/14/2026", "14-May-2026", "May 2026", "not-a-date", 45100]) {
  console.log(JSON.stringify(c), "→", parseImportDate(c));
}

const buf = fs.readFileSync("./snapsme_test_cashflow_data.xlsx");
const wb = XLSX.read(buf, { type: "buffer", cellDates: true, cellNF: false, cellText: false });
console.log("\n=== SHEETS ===", wb.SheetNames);

function testSheet(name, type) {
  const ws = wb.Sheets[name];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  const grid = rawRows.map((row) =>
    (row || []).map((c) =>
      c instanceof Date ? c : typeof c === "string" ? c.trim() : c ?? ""
    )
  );
  const prepared = prepareRowsFromGrid(grid, { hasHeader: true, autoDetectHeader: true });
  const maps = suggestColumnMappings(prepared.headers);
  const res = processImportRows(
    prepared.rows,
    maps,
    type,
    [
      { id: "c1", name: "Office Supplies" },
      { id: "c2", name: "Fuel & Transport" },
      { id: "c3", name: "Meals & Food" },
      { id: "c4", name: "Software & Subscriptions" },
      { id: "c5", name: "Equipment & Tools" },
      { id: "c6", name: "Utilities & Bills" },
      { id: "c7", name: "Other Expenses" }
    ],
    "USD",
    { userId: "u1", displayName: "Tester" },
    { headerRowIndex: prepared.headerRowIndex }
  );
  console.log(`\n--- ${name} ---`);
  console.log("headers", prepared.headers);
  console.log("summary", res.summary);
  console.log(
    "totals imported?",
    res.validRecords.filter((r) => /total/i.test(r.vendor || r.source || "")).length
  );
  return res;
}

const exp = testSheet("Expenses", "expenses");
const inc = testSheet("Income", "income");
const sum = testSheet("Cashflow Summary", "income");

console.log("\n=== ASSERTIONS ===");
const a1 = exp.validRecords.length === 60;
const a2 = inc.validRecords.length === 30;
const a3 = exp.summary.skippedNonData >= 1;
const a4 = inc.summary.skippedNonData >= 1;
const a5 = sum.summary != null;
const a6 = parseImportAmount("1,234.56").value === 1234.56;
const a7 = parseImportAmount("(120.00)").value === -120;
console.log("Expenses 60:", a1 ? "PASS" : "FAIL", exp.validRecords.length);
console.log("Income 30:", a2 ? "PASS" : "FAIL", inc.validRecords.length);
console.log("Expenses total excluded:", a3 ? "PASS" : "FAIL");
console.log("Income total excluded:", a4 ? "PASS" : "FAIL");
console.log("Cashflow Summary no crash:", a5 ? "PASS" : "FAIL", "valid=", sum.validRecords.length);
console.log("Amount 1,234.56:", a6 ? "PASS" : "FAIL", parseImportAmount("1,234.56"));
console.log("Amount (120):", a7 ? "PASS" : "FAIL", parseImportAmount("(120.00)"));
console.log("Sheets selectable:", wb.SheetNames.join(", "));

process.exit(a1 && a2 && a3 && a4 && a5 && a6 && a7 ? 0 : 1);
