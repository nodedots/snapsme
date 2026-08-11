/**
 * snapsme — Cashflow Overview charts (vanilla ES module)
 *
 * Three Chart.js visuals driven by one shared period:
 *   1. Line  — net cashflow over time (income − expenses per bucket)
 *   2. Bar   — income vs expense paired bars per bucket
 *   3. Donut — expense breakdown by category
 *
 * Chart.js is the only charting dependency, loaded from CDN on demand
 * (not globally on every page). Functional tokens --color-confirmed-green
 * and --color-review-amber are never used in any chart segment.
 */

import {
  filterEntriesByPeriod,
  getIncomePeriodRange
} from "./income.js";

// ---------------------------------------------------------------------------
// Chart.js CDN (dashboard-only lazy load)
// ---------------------------------------------------------------------------

const CHART_JS_CDN = "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";
let chartJsLoadPromise = null;

/**
 * Loads Chart.js once via CDN script tag. Safe to call repeatedly.
 * @returns {Promise<typeof Chart>}
 */
export function loadChartJs() {
  if (typeof window !== "undefined" && window.Chart) {
    return Promise.resolve(window.Chart);
  }
  if (chartJsLoadPromise) return chartJsLoadPromise;

  chartJsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-snapsme-chartjs]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Chart));
      existing.addEventListener("error", () => reject(new Error("Chart.js failed to load")));
      if (window.Chart) resolve(window.Chart);
      return;
    }
    const script = document.createElement("script");
    script.src = CHART_JS_CDN;
    script.async = true;
    script.dataset.snapsmeChartjs = "1";
    script.onload = () => {
      if (window.Chart) resolve(window.Chart);
      else reject(new Error("Chart.js loaded but window.Chart is missing"));
    };
    script.onerror = () => {
      chartJsLoadPromise = null;
      reject(new Error("Failed to load Chart.js from CDN"));
    };
    document.head.appendChild(script);
  });

  return chartJsLoadPromise;
}

// ---------------------------------------------------------------------------
// CSS token helpers — NEVER reads confirmed-green or review-amber for charts
// ---------------------------------------------------------------------------

function readCssToken(name, fallback) {
  if (typeof window === "undefined" || !document.documentElement) return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

/**
 * Line chart brand color: business brand accent, else Notion blue.
 * Uses --brand-accent / --color-brand-accent, never status greens/ambers.
 */
export function getLineChartColor(workspace) {
  const brand =
    workspace?.brand?.accentColor ||
    workspace?.brand?.accent ||
    null;
  if (brand && String(brand).trim()) return String(brand).trim();

  return (
    readCssToken("--brand-accent", "") ||
    readCssToken("--color-brand-accent", "") ||
    readCssToken("--color-notion-blue", "#0075de") ||
    "#0075de"
  );
}

/** Income bar — co-primary income action token */
export function getIncomeBarColor() {
  return readCssToken("--color-income-action", "#0d8f5e");
}

/** Expense bar — co-primary expense action token */
export function getExpenseBarColor() {
  return readCssToken("--color-expense-action", "#f64932");
}

/**
 * Decorative accent palette for donut slices.
 * Explicitly excludes --color-confirmed-green and --color-review-amber.
 */
export function getDecorativeChartPalette() {
  const tokens = [
    ["--color-marigold", "#ffb110"],
    ["--color-coral", "#f64932"],
    ["--color-sky-wash", "#62aef0"],
    ["--color-notion-blue", "#0075de"],
    ["--color-midnight-ink", "#02093a"],
    ["--color-sky-tint", "#e6f3fe"]
  ];

  // Extra decorative hues from the style system (not functional status tokens)
  const extras = ["#097fe8", "#b18164", "#e32d14", "#62aef0", "#ffb110", "#02093a"];

  const colors = tokens.map(([name, fb]) => readCssToken(name, fb));
  // sky-tint can be too light for fill — darken slightly if it matches the light wash
  return [...colors, ...extras].filter((c, i, arr) => arr.indexOf(c) === i);
}

// Guard: assert no functional status colors slipped into a palette array
function assertNoFunctionalStatusColors(colors, context) {
  const forbidden = [
    readCssToken("--color-confirmed-green", "#1a9c6b").toLowerCase(),
    readCssToken("--color-review-amber", "#e0982a").toLowerCase(),
    "#1a9c6b",
    "#e0982a"
  ];
  for (const c of colors) {
    const lower = String(c || "").toLowerCase();
    if (forbidden.includes(lower)) {
      console.warn(
        `[cashflow-charts] Forbidden functional status color ${c} in ${context} — replacing with notion blue`
      );
    }
  }
  return colors.map((c) => {
    const lower = String(c || "").toLowerCase();
    if (forbidden.includes(lower)) return readCssToken("--color-notion-blue", "#0075de");
    return c;
  });
}

// ---------------------------------------------------------------------------
// Date / period aggregation
// ---------------------------------------------------------------------------

function parseEntryDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === "object" && typeof dateVal.toDate === "function") {
    return dateVal.toDate();
  }
  const str = String(dateVal).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Granularity matching period selector:
 *   this_month / last_30_days → day
 *   all → month (readable over long history)
 */
export function getBucketGranularity(period = "this_month") {
  if (period === "all") return "month";
  return "day";
}

function bucketKeyForDate(d, granularity) {
  if (granularity === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (granularity === "week") {
    return toDateKey(startOfWeek(d));
  }
  return toDateKey(d);
}

function formatBucketLabel(key, granularity) {
  if (granularity === "month") {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  if (granularity === "week") {
    const d = parseEntryDate(key);
    if (!d) return key;
    return `W/o ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  const d = parseEntryDate(key);
  if (!d) return key;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Builds ordered list of bucket keys covering the period range
 * (so empty days still appear on charts when there is some data).
 */
function enumerateBucketKeys(period, granularity, income = [], expenses = []) {
  const { start, end } = getIncomePeriodRange(period);
  let rangeStart = start;
  let rangeEnd = end || new Date();

  if (!rangeStart) {
    // "all" — derive from data min/max
    const allDates = [...income, ...expenses]
      .map((e) => parseEntryDate(e.date))
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (allDates.length === 0) return [];
    rangeStart = allDates[0];
    rangeEnd = allDates[allDates.length - 1];
  }

  const keys = [];
  if (granularity === "month") {
    let cur = startOfMonth(rangeStart);
    const last = startOfMonth(rangeEnd);
    while (cur <= last) {
      keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return keys;
  }

  // day
  let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  // Cap day series to avoid huge "all" charts if someone passes day for long ranges
  let guard = 0;
  while (cur <= last && guard < 400) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return keys;
}

/**
 * Aggregates income & expenses into time buckets for line + bar charts.
 *
 * @returns {{
 *   labels: string[],
 *   keys: string[],
 *   income: number[],
 *   expenses: number[],
 *   net: number[],
 *   granularity: string,
 *   hasData: boolean,
 *   totalIncome: number,
 *   totalExpenses: number
 * }}
 */
export function aggregateCashflowTimeSeries(incomeEntries = [], expenses = [], period = "this_month") {
  const granularity = getBucketGranularity(period);
  const periodIncome = filterEntriesByPeriod(incomeEntries, period);
  const periodExpenses = filterEntriesByPeriod(expenses, period);
  const hasData = periodIncome.length > 0 || periodExpenses.length > 0;

  if (!hasData) {
    return {
      labels: [],
      keys: [],
      income: [],
      expenses: [],
      net: [],
      granularity,
      hasData: false,
      totalIncome: 0,
      totalExpenses: 0
    };
  }

  const keys = enumerateBucketKeys(period, granularity, periodIncome, periodExpenses);
  const incomeMap = Object.create(null);
  const expenseMap = Object.create(null);
  keys.forEach((k) => {
    incomeMap[k] = 0;
    expenseMap[k] = 0;
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const entry of periodIncome) {
    const d = parseEntryDate(entry.date);
    if (!d) continue;
    const key = bucketKeyForDate(d, granularity);
    if (incomeMap[key] === undefined) incomeMap[key] = 0;
    const amt = Number(entry.amount) || 0;
    incomeMap[key] += amt;
    totalIncome += amt;
  }

  for (const entry of periodExpenses) {
    const d = parseEntryDate(entry.date);
    if (!d) continue;
    const key = bucketKeyForDate(d, granularity);
    if (expenseMap[key] === undefined) expenseMap[key] = 0;
    const amt = Number(entry.amount) || 0;
    expenseMap[key] += amt;
    totalExpenses += amt;
  }

  // Ensure any keys created only from data are included
  const allKeys = Array.from(
    new Set([...keys, ...Object.keys(incomeMap), ...Object.keys(expenseMap)])
  ).sort();

  const labels = allKeys.map((k) => formatBucketLabel(k, granularity));
  const income = allKeys.map((k) => Math.round((incomeMap[k] || 0) * 100) / 100);
  const expenseVals = allKeys.map((k) => Math.round((expenseMap[k] || 0) * 100) / 100);
  const net = allKeys.map((_, i) => Math.round((income[i] - expenseVals[i]) * 100) / 100);

  return {
    labels,
    keys: allKeys,
    income,
    expenses: expenseVals,
    net,
    granularity,
    hasData: true,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100
  };
}

/**
 * Expense totals by category for the selected period (donut).
 */
export function aggregateExpenseByCategory(expenses = [], categories = [], period = "this_month") {
  const periodExpenses = filterEntriesByPeriod(expenses, period);
  if (periodExpenses.length === 0) {
    return { labels: [], amounts: [], categoryIds: [], hasData: false, total: 0 };
  }

  const catById = Object.create(null);
  (categories || []).forEach((c) => {
    catById[c.id] = c;
  });

  const totals = Object.create(null);

  for (const e of periodExpenses) {
    const id = e.categoryId || e.category || "_uncategorized";
    const name =
      e.categoryName ||
      catById[id]?.name ||
      (id === "_uncategorized" ? "Uncategorized" : String(id));
    if (!totals[id]) {
      totals[id] = { id, name, amount: 0 };
    }
    totals[id].amount += Number(e.amount) || 0;
  }

  const rows = Object.values(totals)
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return {
    labels: rows.map((r) => r.name),
    amounts: rows.map((r) => Math.round(r.amount * 100) / 100),
    categoryIds: rows.map((r) => r.id),
    hasData: rows.length > 0,
    total: Math.round(total * 100) / 100
  };
}

// ---------------------------------------------------------------------------
// Chart.js theming (tooltips / fonts match Notion-inspired system)
// ---------------------------------------------------------------------------

function chartFontFamily() {
  return (
    readCssToken("--font-notioninter", "") ||
    "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
  );
}

function moneyTooltipLabel(context, currency) {
  const label = context.dataset.label || "";
  const raw = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
  const n = typeof raw === "number" ? raw : Number(raw) || 0;
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2
    }).format(n);
    return `${label}: ${formatted}`;
  } catch {
    return `${label}: ${(currency || "USD")} ${n.toFixed(2)}`;
  }
}

function baseTooltipOptions(currency) {
  return {
    backgroundColor: "#ffffff",
    titleColor: "#000000",
    bodyColor: "#615d59",
    borderColor: "rgba(0,0,0,0.08)",
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
    displayColors: true,
    titleFont: { family: chartFontFamily(), size: 12, weight: "600" },
    bodyFont: { family: chartFontFamily(), size: 12, weight: "500" },
    callbacks: {
      label: (ctx) => moneyTooltipLabel(ctx, currency)
    }
  };
}

function baseLegendOptions(compact) {
  return {
    position: compact ? "bottom" : "bottom",
    labels: {
      boxWidth: compact ? 10 : 12,
      boxHeight: compact ? 10 : 12,
      padding: compact ? 10 : 14,
      font: { family: chartFontFamily(), size: compact ? 11 : 12, weight: "500" },
      color: "#615d59",
      usePointStyle: true,
      pointStyle: "circle"
    }
  };
}

// ---------------------------------------------------------------------------
// Chart instance management
// ---------------------------------------------------------------------------

/**
 * Creates (or replaces) the three charts inside a prepared section host.
 * Always destroy previous instances before create to avoid leaks.
 */
export function createCashflowCharts(Chart, elements, series, categoryData, options = {}) {
  const currency = options.currency || "USD";
  const workspace = options.workspace || null;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const lineColor = getLineChartColor(workspace);
  let incomeColor = getIncomeBarColor();
  let expenseColor = getExpenseBarColor();
  // Ensure bar colors aren't accidentally the functional status tokens
  [incomeColor, expenseColor] = assertNoFunctionalStatusColors(
    [incomeColor, expenseColor],
    "bar chart"
  );

  let donutColors = getDecorativeChartPalette();
  donutColors = assertNoFunctionalStatusColors(donutColors, "donut chart");
  // Expand palette to match slice count
  while (donutColors.length < (categoryData.labels?.length || 0)) {
    donutColors = donutColors.concat(donutColors);
  }
  donutColors = donutColors.slice(0, Math.max(categoryData.labels?.length || 0, 1));
  donutColors = assertNoFunctionalStatusColors(donutColors, "donut chart final");

  // Line chart: also guard brand color if it somehow matches status tokens
  const safeLineColor = assertNoFunctionalStatusColors([lineColor], "line chart")[0];

  const charts = { netLine: null, vsBar: null, categoryDonut: null };

  if (elements.netCanvas) {
    charts.netLine = new Chart(elements.netCanvas, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Net cashflow",
            data: series.net,
            borderColor: safeLineColor,
            backgroundColor: hexToRgba(safeLineColor, 0.12),
            fill: true,
            tension: 0.3,
            pointRadius: isMobile ? 2 : 3,
            pointHoverRadius: 5,
            pointBackgroundColor: safeLineColor,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: baseTooltipOptions(currency)
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: chartFontFamily(), size: isMobile ? 10 : 11 },
              color: "#757575",
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 10
            }
          },
          y: {
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              font: { family: chartFontFamily(), size: 11 },
              color: "#757575",
              callback: (v) => formatAxisTick(v, currency)
            }
          }
        }
      }
    });
  }

  if (elements.barCanvas) {
    charts.vsBar = new Chart(elements.barCanvas, {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Income",
            data: series.income,
            backgroundColor: incomeColor,
            borderRadius: 4,
            maxBarThickness: isMobile ? 16 : 22
          },
          {
            label: "Expenses",
            data: series.expenses,
            backgroundColor: expenseColor,
            borderRadius: 4,
            maxBarThickness: isMobile ? 16 : 22
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: baseLegendOptions(isMobile),
          tooltip: baseTooltipOptions(currency)
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: chartFontFamily(), size: isMobile ? 10 : 11 },
              color: "#757575",
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 10
            }
          },
          y: {
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              font: { family: chartFontFamily(), size: 11 },
              color: "#757575",
              callback: (v) => formatAxisTick(v, currency)
            }
          }
        }
      }
    });
  }

  if (elements.donutCanvas) {
    const donutTooltip = baseTooltipOptions(currency);
    donutTooltip.callbacks = {
      label: (ctx) => {
        const label = ctx.label || "";
        const value = Number(ctx.parsed) || 0;
        const total = (ctx.dataset.data || []).reduce((s, n) => s + (Number(n) || 0), 0);
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        try {
          const formatted = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency || "USD",
            minimumFractionDigits: 2
          }).format(value);
          return `${label}: ${formatted} (${pct}%)`;
        } catch {
          return `${label}: ${value.toFixed(2)} (${pct}%)`;
        }
      }
    };

    charts.categoryDonut = new Chart(elements.donutCanvas, {
      type: "doughnut",
      data: {
        labels: categoryData.labels,
        datasets: [
          {
            data: categoryData.amounts,
            backgroundColor: donutColors,
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            ...baseLegendOptions(true),
            position: isMobile ? "bottom" : "right",
            labels: {
              ...baseLegendOptions(true).labels,
              // Shorter labels on mobile
              generateLabels: (chart) => {
                const data = chart.data;
                if (!data.labels?.length) return [];
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const short =
                    isMobile && String(label).length > 14
                      ? `${String(label).slice(0, 12)}…`
                      : label;
                  return {
                    text: short,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: "#ffffff",
                    lineWidth: 1,
                    hidden: false,
                    index: i,
                    fontColor: "#615d59"
                  };
                });
              }
            }
          },
          tooltip: donutTooltip
        }
      }
    });
  }

  return charts;
}

/**
 * Destroys all Chart.js instances in a charts map.
 */
export function destroyCashflowCharts(charts) {
  if (!charts) return;
  for (const key of Object.keys(charts)) {
    try {
      if (charts[key] && typeof charts[key].destroy === "function") {
        charts[key].destroy();
      }
    } catch (e) {
      // ignore double-destroy
    }
    charts[key] = null;
  }
}

function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return `rgba(0, 117, 222, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatAxisTick(v, currency) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

// ---------------------------------------------------------------------------
// DOM mount — Cashflow Overview section
// ---------------------------------------------------------------------------

const EMPTY_MESSAGE =
  "Not enough data yet for this period — charts will fill in as you go";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Injects Cashflow Overview markup into host (idempotent structure).
 */
export function renderCashflowOverviewMarkup(host, { period = "this_month" } = {}) {
  if (!host) return null;

  if (!host.querySelector("[data-cashflow-overview]")) {
    host.innerHTML = `
      <section class="cashflow-overview" data-cashflow-overview aria-label="Cashflow overview">
        <div class="cashflow-overview-header">
          <div class="cashflow-overview-titles">
            <h3 class="cashflow-overview-title">Cashflow Overview</h3>
            <p class="cashflow-overview-subtitle">How income and expenses are moving over time</p>
          </div>
          <div class="cashflow-period-slot" data-cashflow-period></div>
        </div>

        <div class="cashflow-empty" data-cashflow-empty hidden>
          <div class="cashflow-empty-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>
            </svg>
          </div>
          <p class="cashflow-empty-title">No chart data yet</p>
          <p class="cashflow-empty-copy">${escapeHtml(EMPTY_MESSAGE)}</p>
        </div>

        <div class="cashflow-charts-grid" data-cashflow-grid>
          <div class="cashflow-chart-panel cashflow-chart-panel--line">
            <div class="cashflow-chart-heading">
              <h4 class="cashflow-chart-title">Net cashflow</h4>
              <p class="cashflow-chart-hint">Income minus expenses over time</p>
            </div>
            <div class="cashflow-chart-canvas-wrap">
              <canvas data-chart="net-line" aria-label="Net cashflow line chart"></canvas>
            </div>
          </div>

          <div class="cashflow-chart-panel cashflow-chart-panel--bar">
            <div class="cashflow-chart-heading">
              <h4 class="cashflow-chart-title">Income vs expenses</h4>
              <p class="cashflow-chart-hint">Side-by-side by period</p>
            </div>
            <div class="cashflow-chart-canvas-wrap">
              <canvas data-chart="vs-bar" aria-label="Income versus expenses bar chart"></canvas>
            </div>
          </div>

          <div class="cashflow-chart-panel cashflow-chart-panel--donut">
            <div class="cashflow-chart-heading">
              <h4 class="cashflow-chart-title">Spend by category</h4>
              <p class="cashflow-chart-hint">Share of expenses this period</p>
            </div>
            <div class="cashflow-chart-canvas-wrap cashflow-chart-canvas-wrap--donut">
              <canvas data-chart="category-donut" aria-label="Expense breakdown donut chart"></canvas>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  return host.querySelector("[data-cashflow-overview]");
}

/**
 * Renders period selector into the cashflow header, reusing the same period keys
 * as the Net for Period card (this_month / last_30_days / all).
 */
export function renderCashflowPeriodSelector(container, { period = "this_month", onChange } = {}) {
  if (!container) return;
  const periods = [
    { id: "this_month", label: "This month" },
    { id: "last_30_days", label: "Last 30 days" },
    { id: "all", label: "All time" }
  ];

  container.innerHTML = `
    <div class="dash-period-selector" role="group" aria-label="Cashflow period">
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

/**
 * Mounts the full Cashflow Overview into a host element.
 * Loads Chart.js on demand, aggregates real income/expense data, and
 * properly destroys/recreates charts on period or data changes.
 *
 * @returns {Promise<{ update: Function, destroy: Function }>}
 */
export async function mountCashflowOverview(host, options = {}) {
  if (!host) {
    return { update: () => {}, destroy: () => {} };
  }

  let state = {
    expenses: options.expenses || [],
    incomeEntries: options.incomeEntries || [],
    categories: options.categories || [],
    period: options.period || "this_month",
    currency: options.currency || "USD",
    workspace: options.workspace || null
  };

  let charts = { netLine: null, vsBar: null, categoryDonut: null };
  let Chart = null;
  let destroyed = false;

  renderCashflowOverviewMarkup(host, { period: state.period });

  const periodSlot = host.querySelector("[data-cashflow-period]");
  renderCashflowPeriodSelector(periodSlot, {
    period: state.period,
    onChange: (next) => {
      state.period = next;
      if (typeof options.onPeriodChange === "function") {
        options.onPeriodChange(next);
      }
      refresh();
    }
  });

  try {
    Chart = await loadChartJs();
  } catch (err) {
    console.error("[cashflow-charts]", err);
    const emptyEl = host.querySelector("[data-cashflow-empty]");
    const gridEl = host.querySelector("[data-cashflow-grid]");
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.querySelector(".cashflow-empty-copy").textContent =
        "Charts could not load. Check your connection and try again.";
    }
    if (gridEl) gridEl.hidden = true;
    return {
      update: () => {},
      destroy: () => {
        destroyed = true;
        host.innerHTML = "";
      }
    };
  }

  if (destroyed) return { update: () => {}, destroy: () => {} };

  function getCanvases() {
    return {
      netCanvas: host.querySelector('canvas[data-chart="net-line"]'),
      barCanvas: host.querySelector('canvas[data-chart="vs-bar"]'),
      donutCanvas: host.querySelector('canvas[data-chart="category-donut"]')
    };
  }

  function refresh() {
    if (destroyed || !Chart) return;

    // Always destroy previous instances first (period changes must not leak)
    destroyCashflowCharts(charts);

    // Fresh canvases: Chart.js can leave dead canvases; re-create canvas nodes
    const wrapNet = host.querySelector(".cashflow-chart-panel--line .cashflow-chart-canvas-wrap");
    const wrapBar = host.querySelector(".cashflow-chart-panel--bar .cashflow-chart-canvas-wrap");
    const wrapDonut = host.querySelector(".cashflow-chart-panel--donut .cashflow-chart-canvas-wrap");
    if (wrapNet) wrapNet.innerHTML = `<canvas data-chart="net-line" aria-label="Net cashflow line chart"></canvas>`;
    if (wrapBar) wrapBar.innerHTML = `<canvas data-chart="vs-bar" aria-label="Income versus expenses bar chart"></canvas>`;
    if (wrapDonut) {
      wrapDonut.innerHTML = `<canvas data-chart="category-donut" aria-label="Expense breakdown donut chart"></canvas>`;
    }

    const series = aggregateCashflowTimeSeries(
      state.incomeEntries,
      state.expenses,
      state.period
    );
    const categoryData = aggregateExpenseByCategory(
      state.expenses,
      state.categories,
      state.period
    );

    const emptyEl = host.querySelector("[data-cashflow-empty]");
    const gridEl = host.querySelector("[data-cashflow-grid]");
    const hasAny = series.hasData;

    if (!hasAny) {
      if (emptyEl) emptyEl.hidden = false;
      if (gridEl) gridEl.hidden = true;
      charts = { netLine: null, vsBar: null, categoryDonut: null };
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (gridEl) gridEl.hidden = false;

    // Donut empty but series has data (income only) — still show line/bar
    const elements = getCanvases();
    if (!categoryData.hasData && elements.donutCanvas) {
      // leave donut empty with a zero dataset message via empty panel class
      const donutPanel = host.querySelector(".cashflow-chart-panel--donut");
      if (donutPanel) {
        const wrap = donutPanel.querySelector(".cashflow-chart-canvas-wrap");
        if (wrap) {
          wrap.innerHTML = `<div class="cashflow-panel-empty">No expenses in this period to break down by category.</div>`;
        }
        elements.donutCanvas = null;
      }
    }

    charts = createCashflowCharts(Chart, elements, series, categoryData, {
      currency: state.currency,
      workspace: state.workspace
    });

    // Sync period selector active state
    if (periodSlot) {
      periodSlot.querySelectorAll(".dash-period-btn").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-period") === state.period);
      });
    }
  }

  refresh();

  // Resize: Chart.js responds via responsive:true; also re-render on large layout shifts
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => refresh(), 200);
  };
  window.addEventListener("resize", onResize);

  return {
    update(next = {}) {
      if (destroyed) return;
      state = {
        ...state,
        expenses: next.expenses !== undefined ? next.expenses : state.expenses,
        incomeEntries: next.incomeEntries !== undefined ? next.incomeEntries : state.incomeEntries,
        categories: next.categories !== undefined ? next.categories : state.categories,
        period: next.period !== undefined ? next.period : state.period,
        currency: next.currency !== undefined ? next.currency : state.currency,
        workspace: next.workspace !== undefined ? next.workspace : state.workspace
      };
      if (next.period !== undefined && periodSlot) {
        renderCashflowPeriodSelector(periodSlot, {
          period: state.period,
          onChange: (p) => {
            state.period = p;
            if (typeof options.onPeriodChange === "function") options.onPeriodChange(p);
            refresh();
          }
        });
      }
      refresh();
    },
    destroy() {
      destroyed = true;
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      destroyCashflowCharts(charts);
      charts = { netLine: null, vsBar: null, categoryDonut: null };
      host.innerHTML = "";
    }
  };
}
