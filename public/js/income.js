/**
 * snapsme — Income Log (vanilla ES module)
 *
 * Lightweight money-in log for owners and staff. NOT invoicing:
 * no customers, invoices, due dates, payment status, or billing.
 *
 * Data model: businesses/{businessId}/income/{incomeId}
 *   submittedBy, amount, currency, source, date, notes, createdAt
 */

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const INCOME_STORAGE_KEY = "snapsme_income";

// ---------------------------------------------------------------------------
// Local persistence (demo / offline)
// ---------------------------------------------------------------------------

export function loadIncomeEntries() {
  try {
    const raw = localStorage.getItem(INCOME_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIncomeEntries(entries) {
  localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(Array.isArray(entries) ? entries : []));
}

// ---------------------------------------------------------------------------
// Validation & create
// ---------------------------------------------------------------------------

/**
 * Validates income form fields. Throws with a user-facing message on failure.
 * @returns {{ amount: number, source: string, date: string, notes: string|null, currency: string }}
 */
export function validateIncomeForm({ amount, source, date, notes, currency }) {
  const parsedAmount = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Enter a valid amount greater than zero.");
  }

  const trimmedSource = source != null ? String(source).trim() : "";
  if (!trimmedSource) {
    throw new Error("Enter a short source (e.g. Product sales, Client payment).");
  }

  const dateStr = date != null ? String(date).trim() : "";
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Pick a valid date.");
  }

  const notesTrimmed = notes != null ? String(notes).trim() : "";
  const currencyCode = (currency || "USD").toString().trim().toUpperCase() || "USD";

  return {
    amount: Math.round(parsedAmount * 100) / 100,
    source: trimmedSource,
    date: dateStr,
    notes: notesTrimmed || null,
    currency: currencyCode
  };
}

/**
 * Builds a new income entry document (does not persist).
 */
export function buildIncomeEntry({ amount, source, date, notes, currency }, currentUser) {
  const valid = validateIncomeForm({ amount, source, date, notes, currency });
  const now = new Date().toISOString();
  const userId = currentUser?.userId || currentUser?.uid || "usr_guest";

  return {
    id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    submittedBy: userId,
    submittedByName: currentUser?.displayName || "Team member",
    amount: valid.amount,
    currency: valid.currency,
    source: valid.source,
    date: valid.date,
    notes: valid.notes,
    createdAt: now
  };
}

/**
 * Adds an income entry to a local array and optionally persists via saveFn.
 * @returns {{ entries: object[], entry: object }}
 */
export function addIncomeEntry(entries = [], formData, currentUser, saveFn) {
  const entry = buildIncomeEntry(formData, currentUser);
  const updated = [entry, ...(Array.isArray(entries) ? entries : [])];
  if (typeof saveFn === "function") {
    saveFn(updated);
  } else {
    saveIncomeEntries(updated);
  }
  return { entries: updated, entry };
}

/**
 * Removes an income entry by id (local).
 */
export function removeIncomeEntry(entries = [], incomeId, saveFn) {
  const updated = (entries || []).filter((e) => e.id !== incomeId);
  if (typeof saveFn === "function") {
    saveFn(updated);
  } else {
    saveIncomeEntries(updated);
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Firestore helpers (optional businessId)
// ---------------------------------------------------------------------------

function incomeCol(db, businessId) {
  return collection(db, "businesses", businessId, "income");
}

function incomeDoc(db, businessId, incomeId) {
  return doc(db, "businesses", businessId, "income", incomeId);
}

/**
 * Writes one income entry under businesses/{businessId}/income/{id}.
 */
export async function addIncomeFirestore(db, businessId, entry) {
  if (!db || !businessId || !entry || !entry.id) {
    throw new Error("Missing db, businessId, or income entry.");
  }
  const { id, ...rest } = entry;
  await setDoc(incomeDoc(db, businessId, id), {
    ...rest,
    submittedBy: rest.submittedBy || "usr_guest",
    amount: Number(rest.amount),
    currency: rest.currency || "USD",
    source: rest.source || "",
    date: rest.date,
    notes: rest.notes ?? null,
    createdAt: rest.createdAt || new Date().toISOString()
  });
  return id;
}

/**
 * Real-time subscription to income entries (newest first).
 * Falls back gracefully if orderBy index is missing.
 */
export function subscribeToIncome(db, businessId, onList, onError) {
  if (!db || !businessId) return () => {};

  const handleSnap = (snap) => {
    const list = [];
    snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
    // Ensure newest-first even without orderBy
    list.sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));
    onList(list);
  };

  const handleErr = (err) => {
    if (typeof onError === "function") onError(err);
  };

  try {
    return onSnapshot(
      query(incomeCol(db, businessId), orderBy("createdAt", "desc")),
      handleSnap,
      (err) => {
        // Retry without orderBy if composite/index issues
        return onSnapshot(incomeCol(db, businessId), handleSnap, handleErr);
      }
    );
  } catch (e) {
    return onSnapshot(incomeCol(db, businessId), handleSnap, handleErr);
  }
}

export async function deleteIncomeFirestore(db, businessId, incomeId) {
  if (!db || !businessId || !incomeId) return;
  await deleteDoc(incomeDoc(db, businessId, incomeId));
}

// ---------------------------------------------------------------------------
// Period helpers (shared with dashboard net figure)
// ---------------------------------------------------------------------------

/**
 * @param {"this_month"|"last_30_days"|"all"} period
 * @returns {{ start: Date|null, end: Date|null, label: string }}
 */
export function getIncomePeriodRange(period = "this_month") {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === "last_30_days") {
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "Last 30 days" };
  }

  if (period === "all") {
    return { start: null, end: null, label: "All time" };
  }

  // this_month (default)
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { start, end, label: "This month" };
}

/**
 * Filters entries whose `date` (YYYY-MM-DD) falls in the period.
 */
export function filterEntriesByPeriod(entries = [], period = "this_month") {
  const { start, end } = getIncomePeriodRange(period);
  if (!start && !end) return entries.slice();

  return (entries || []).filter((e) => {
    const d = parseEntryDate(e.date);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function parseEntryDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  // Firestore Timestamp-like
  if (typeof dateVal === "object" && typeof dateVal.toDate === "function") {
    return dateVal.toDate();
  }
  const str = String(dateVal).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function sumIncomeAmount(entries = []) {
  return (entries || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMoney(amount, currency = "USD") {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  } catch {
    return `${currency || "USD"} ${n.toFixed(2)}`;
  }
}

export function formatDisplayDate(dateStr) {
  const d = parseEntryDate(dateStr);
  if (!d) return dateStr || "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(d);
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// DOM: income list item
// ---------------------------------------------------------------------------

/**
 * Renders a single income row (hairline white card + green left accent).
 */
export function renderIncomeListItem(entry, currency = "USD") {
  const cur = entry.currency || currency;
  const notesHtml = entry.notes
    ? `<p class="income-row-notes">${escapeHtml(entry.notes)}</p>`
    : "";

  return `
    <article class="income-row" data-income-id="${escapeHtml(entry.id)}" role="listitem">
      <div class="income-row-accent" aria-hidden="true"></div>
      <div class="income-row-body">
        <div class="income-row-main">
          <div class="income-row-icon" aria-hidden="true" title="Income">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
            </svg>
          </div>
          <div class="income-row-text">
            <p class="income-row-source">${escapeHtml(entry.source)}</p>
            <p class="income-row-meta">
              <span>${escapeHtml(formatDisplayDate(entry.date))}</span>
              <span class="income-row-dot">·</span>
              <span>${escapeHtml(entry.submittedByName || "Team")}</span>
            </p>
            ${notesHtml}
          </div>
        </div>
        <div class="income-row-amount">
          <span class="income-amount-value">${escapeHtml(formatMoney(entry.amount, cur))}</span>
          <span class="income-type-pill">Income</span>
        </div>
      </div>
    </article>
  `;
}

/**
 * Renders the full income list into a container element.
 */
export function renderIncomeList(container, entries = [], options = {}) {
  if (!container) return;
  const currency = options.currency || "USD";
  const emptyMessage =
    options.emptyMessage ||
    "No income logged yet. Use + Add Income when money comes in.";

  if (!entries || entries.length === 0) {
    container.innerHTML = `
      <div class="income-list-empty">
        <div class="income-list-empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
          </svg>
        </div>
        <p class="income-list-empty-title">Income log is empty</p>
        <p class="income-list-empty-copy">${escapeHtml(emptyMessage)}</p>
      </div>
    `;
    return;
  }

  const total = sumIncomeAmount(entries);
  container.innerHTML = `
    <div class="income-list-header">
      <div>
        <h3 class="income-list-title">Income log</h3>
        <p class="income-list-subtitle">${entries.length} entr${entries.length === 1 ? "y" : "ies"} · separate from expenses</p>
      </div>
      <p class="income-list-total">${escapeHtml(formatMoney(total, currency))}</p>
    </div>
    <div class="income-list" role="list">
      ${entries.map((e) => renderIncomeListItem(e, currency)).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// DOM: simple income form modal (fastest form in the app — no AI)
// ---------------------------------------------------------------------------

/**
 * Opens a minimal income form modal.
 * @param {object} options
 * @param {string} [options.currency]
 * @param {object} [options.currentUser]
 * @param {(entry: object) => void|Promise<void>} options.onSubmit
 * @param {() => void} [options.onClose]
 * @returns {{ close: () => void }}
 */
export function openIncomeFormModal(options = {}) {
  const currency = options.currency || "USD";
  const today = new Date().toISOString().slice(0, 10);

  // Remove any existing instance
  const existing = document.getElementById("snapsme-income-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "snapsme-income-modal";
  overlay.className = "income-modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "income-modal-title");

  overlay.innerHTML = `
    <div class="income-modal-card">
      <div class="income-modal-header">
        <div>
          <h2 id="income-modal-title" class="income-modal-title">Log income</h2>
          <p class="income-modal-subtitle">Record money that came in — not an invoice.</p>
        </div>
        <button type="button" class="income-modal-close" data-income-close aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <form class="income-form" data-income-form novalidate>
        <label class="income-field">
          <span class="income-field-label">Amount <span class="income-required">*</span></span>
          <div class="income-amount-input-wrap">
            <span class="income-currency-prefix">${escapeHtml(currency)}</span>
            <input type="number" name="amount" inputmode="decimal" min="0.01" step="0.01" required placeholder="0.00" class="income-input" autocomplete="off" />
          </div>
        </label>
        <label class="income-field">
          <span class="income-field-label">Source <span class="income-required">*</span></span>
          <input type="text" name="source" required maxlength="120" placeholder="e.g. Product sales, Client payment — Acme" class="income-input" autocomplete="off" />
        </label>
        <label class="income-field">
          <span class="income-field-label">Date <span class="income-required">*</span></span>
          <input type="date" name="date" required value="${today}" class="income-input" />
        </label>
        <label class="income-field">
          <span class="income-field-label">Notes <span class="income-optional">(optional)</span></span>
          <textarea name="notes" rows="2" maxlength="400" placeholder="Anything worth remembering" class="income-input income-textarea"></textarea>
        </label>
        <p class="income-form-error" data-income-error hidden></p>
        <div class="income-form-actions">
          <button type="button" class="btn-notion-ghost income-btn-cancel" data-income-close>Cancel</button>
          <button type="submit" class="btn-income-secondary" data-income-submit>Save income</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  // Focus amount for speed
  const amountInput = overlay.querySelector('input[name="amount"]');
  if (amountInput) {
    setTimeout(() => amountInput.focus(), 30);
  }

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (typeof options.onClose === "function") options.onClose();
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelectorAll("[data-income-close]").forEach((btn) => {
    btn.addEventListener("click", close);
  });

  const form = overlay.querySelector("[data-income-form]");
  const errorEl = overlay.querySelector("[data-income-error]");
  const submitBtn = overlay.querySelector("[data-income-submit]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    errorEl.textContent = "";

    const fd = new FormData(form);
    try {
      const entry = buildIncomeEntry(
        {
          amount: fd.get("amount"),
          source: fd.get("source"),
          date: fd.get("date"),
          notes: fd.get("notes"),
          currency
        },
        options.currentUser
      );

      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";

      if (typeof options.onSubmit === "function") {
        await options.onSubmit(entry);
      }

      close();
    } catch (err) {
      errorEl.hidden = false;
      errorEl.textContent = err?.message || "Could not save income entry.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Save income";
    }
  });

  return { close };
}

/**
 * Renders a secondary-styled "+ Add Income" button (not the primary Snap CTA).
 */
export function renderAddIncomeButton(container, { onClick, label = "+ Add Income" } = {}) {
  if (!container) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-add-income";
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
    </svg>
    <span>${escapeHtml(label)}</span>
  `;
  if (typeof onClick === "function") {
    btn.addEventListener("click", onClick);
  }
  container.appendChild(btn);
  return btn;
}

/**
 * Mounts the full income view (header + add button + list) into a host element.
 * @returns {{ refresh: (entries: object[]) => void, destroy: () => void, openForm: () => void }}
 */
export function mountIncomeView(host, options = {}) {
  if (!host) return { refresh: () => {}, destroy: () => {}, openForm: () => {} };

  const currency = options.currency || "USD";
  let entries = Array.isArray(options.entries) ? options.entries : [];

  host.innerHTML = `
    <section class="income-view">
      <div class="income-view-toolbar">
        <div>
          <h2 class="income-view-heading">Income</h2>
          <p class="income-view-lede">A simple log of money in — not invoices or customer billing.</p>
        </div>
        <div class="income-view-actions" data-income-actions></div>
      </div>
      <div data-income-list-root></div>
    </section>
  `;

  const listRoot = host.querySelector("[data-income-list-root]");
  const actions = host.querySelector("[data-income-actions]");

  const openForm = () => {
    openIncomeFormModal({
      currency,
      currentUser: options.currentUser,
      onSubmit: async (entry) => {
        if (typeof options.onSave === "function") {
          await options.onSave(entry);
        }
      }
    });
  };

  renderAddIncomeButton(actions, { onClick: openForm });
  renderIncomeList(listRoot, entries, { currency });

  return {
    refresh(nextEntries) {
      entries = Array.isArray(nextEntries) ? nextEntries : [];
      renderIncomeList(listRoot, entries, { currency: options.currency || currency });
    },
    destroy() {
      host.innerHTML = "";
    },
    openForm
  };
}
