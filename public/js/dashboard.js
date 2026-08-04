/**
 * snapsme — Dashboard helpers (vanilla ES module)
 *
 * Net for Period (income − expenses), period filtering, Net card rendering,
 * and combined CSV export (expenses + income, clearly typed).
 */

import {
  filterEntriesByPeriod,
  getIncomePeriodRange,
  sumIncomeAmount,
  formatMoney
} from "./income.js";
import { getDashboardPreferences } from "./settings.js";

// ---------------------------------------------------------------------------
// Period totals
// ---------------------------------------------------------------------------

/**
 * Filters expenses by the same period keys used for income.
 * Expects expense.date as YYYY-MM-DD (or ISO string).
 */
export function filterExpensesByPeriod(expenses = [], period = "this_month") {
  return filterEntriesByPeriod(expenses, period);
}

export function sumExpenseAmount(expenses = []) {
  return (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Computes net cash for a period: total income − total expenses.
 *
 * @param {object[]} incomeEntries
 * @param {object[]} expenses
 * @param {"this_month"|"last_30_days"|"all"} [period]
 * @returns {{
 *   period: string,
 *   periodLabel: string,
 *   totalIncome: number,
 *   totalExpenses: number,
 *   net: number,
 *   isPositive: boolean,
 *   isNegative: boolean,
 *   isZero: boolean,
 *   incomeCount: number,
 *   expenseCount: number
 * }}
 */
export function calculateNetForPeriod(incomeEntries = [], expenses = [], period = "this_month") {
  const { label } = getIncomePeriodRange(period);
  const periodIncome = filterEntriesByPeriod(incomeEntries, period);
  const periodExpenses = filterExpensesByPeriod(expenses, period);
  const totalIncome = sumIncomeAmount(periodIncome);
  const totalExpenses = sumExpenseAmount(periodExpenses);
  const net = Math.round((totalIncome - totalExpenses) * 100) / 100;

  return {
    period,
    periodLabel: label,
    totalIncome,
    totalExpenses,
    net,
    isPositive: net > 0,
    isNegative: net < 0,
    isZero: net === 0,
    incomeCount: periodIncome.length,
    expenseCount: periodExpenses.length
  };
}

/**
 * Human label under the big net numeral (e.g. "Net this month").
 */
export function getNetPeriodCaption(period = "this_month") {
  if (period === "last_30_days") return "Net last 30 days";
  if (period === "all") return "Net all time";
  return "Net this month";
}

/**
 * Functional color class for net (reuses confirmed-green / review-amber tokens).
 * Positive → confirmed green; negative → review amber; zero → neutral ink.
 */
export function getNetAmountClass(net) {
  if (net > 0) return "net-amount--positive";
  if (net < 0) return "net-amount--negative";
  return "net-amount--zero";
}

// ---------------------------------------------------------------------------
// DOM: Net for Period card
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the Net for Period card HTML string.
 */
export function buildNetForPeriodCardHtml(stats, currency = "USD") {
  const amountClass = getNetAmountClass(stats.net);
  const caption = getNetPeriodCaption(stats.period);
  const signPrefix = stats.net > 0 ? "+" : "";

  return `
    <div class="net-period-card" data-net-period-card>
      <div class="net-period-card-top">
        <div class="net-period-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <p class="net-period-kicker">Cash position</p>
      </div>
      <p class="net-period-amount ${amountClass}" data-net-amount>
        ${escapeHtml(signPrefix + formatMoney(stats.net, currency))}
      </p>
      <p class="net-period-label" data-net-label>${escapeHtml(caption)}</p>
      <div class="net-period-breakdown">
        <span class="net-breakdown-item net-breakdown-income">
          In ${escapeHtml(formatMoney(stats.totalIncome, currency))}
          <span class="net-breakdown-count">(${stats.incomeCount})</span>
        </span>
        <span class="net-breakdown-sep" aria-hidden="true">−</span>
        <span class="net-breakdown-item net-breakdown-expense">
          Out ${escapeHtml(formatMoney(stats.totalExpenses, currency))}
          <span class="net-breakdown-count">(${stats.expenseCount})</span>
        </span>
      </div>
    </div>
  `;
}

/**
 * Renders (or clears) the Net for Period card into a container.
 * Honors dashboardPreferences.showNetCashFigure (default true).
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {object[]} options.incomeEntries
 * @param {object[]} options.expenses
 * @param {string} [options.currency]
 * @param {"this_month"|"last_30_days"|"all"} [options.period]
 * @param {object} [options.workspace] — for dashboardPreferences
 * @param {boolean} [options.forceShow] — override preference
 */
export function renderNetForPeriodCard(container, options = {}) {
  if (!container) return null;

  const prefs = getDashboardPreferences(options.workspace);
  const show =
    options.forceShow === true
      ? true
      : options.forceShow === false
        ? false
        : prefs.showNetCashFigure !== false;

  if (!show) {
    container.innerHTML = "";
    container.hidden = true;
    return null;
  }

  container.hidden = false;
  const period = options.period || "this_month";
  const currency = options.currency || options.workspace?.currency || "USD";
  const stats = calculateNetForPeriod(
    options.incomeEntries || [],
    options.expenses || [],
    period
  );

  container.innerHTML = buildNetForPeriodCardHtml(stats, currency);
  return stats;
}

/**
 * Builds a period selector control (this month / last 30 days / all).
 * Calls onChange(period) when the user picks a period.
 */
export function renderPeriodSelector(container, { period = "this_month", onChange } = {}) {
  if (!container) return;

  const periods = [
    { id: "this_month", label: "This month" },
    { id: "last_30_days", label: "Last 30 days" },
    { id: "all", label: "All time" }
  ];

  container.innerHTML = `
    <div class="dash-period-selector" role="group" aria-label="Dashboard period">
      ${periods
        .map(
          (p) => `
        <button type="button"
          class="dash-period-btn${p.id === period ? " is-active" : ""}"
          data-period="${p.id}">
          ${escapeHtml(p.label)}
        </button>`
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-period");
      container.querySelectorAll(".dash-period-btn").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-period") === next);
      });
      if (typeof onChange === "function") onChange(next);
    });
  });
}

// ---------------------------------------------------------------------------
// CSV export (expenses + income, clearly typed)
// ---------------------------------------------------------------------------

function escapeCsvCell(val) {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Builds a combined CSV string with a Type column (Expense | Income).
 * Income and expense rows share a common column set so accountants can filter.
 *
 * FR-I5: separate section headers + type column.
 */
export function buildCombinedCsv(expenses = [], incomeEntries = [], currency = "USD") {
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

  const expenseRows = (expenses || []).map((e) =>
    [
      "Expense",
      e.id || "",
      e.date || "",
      e.vendor || "",
      e.amount ?? "",
      e.currency || currency,
      e.categoryName || "",
      e.moneyMovement || "",
      e.submittedByName || "",
      e.source || "",
      e.syncStatus || "",
      e.notes || ""
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  const incomeRows = (incomeEntries || []).map((i) =>
    [
      "Income",
      i.id || "",
      i.date || "",
      i.source || "",
      i.amount ?? "",
      i.currency || currency,
      "", // no category on income
      "", // no money movement
      i.submittedByName || "",
      "manual",
      "",
      i.notes || ""
    ]
      .map(escapeCsvCell)
      .join(",")
  );

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

  return lines.join("\n");
}

/**
 * Triggers a browser download of the combined CSV.
 */
export function downloadCombinedCsv(expenses = [], incomeEntries = [], currency = "USD", filename) {
  const csv = buildCombinedCsv(expenses, incomeEntries, currency);
  const name =
    filename ||
    `snapsme_export_${new Date().toISOString().split("T")[0]}.csv`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Expense-only CSV (legacy shape) — kept for callers that only want expenses.
 * Prefer downloadCombinedCsv when income is in scope.
 */
export function downloadExpensesCsv(expenses = [], currency = "USD") {
  downloadCombinedCsv(expenses, [], currency, `snapsme_expenses_export_${new Date().toISOString().split("T")[0]}.csv`);
}
