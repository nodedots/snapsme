import { INITIAL_EXPENSES, INITIAL_CATEGORIES, INITIAL_MEMBERS, INITIAL_WORKSPACE, INITIAL_ACTIVITY_LOGS } from "../data/mockInitialData.js";

const STORAGE_KEYS = {
  WORKSPACE: "snapsme_workspace",
  CATEGORIES: "snapsme_categories",
  MEMBERS: "snapsme_members",
  EXPENSES: "snapsme_expenses",
  CURRENT_USER: "snapsme_current_user",
  IS_OFFLINE_MODE: "snapsme_offline_sim",
  ACTIVITY_LOGS: "snapsme_activity_logs"
};

export function loadWorkspace() {
  const data = localStorage.getItem(STORAGE_KEYS.WORKSPACE);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(INITIAL_WORKSPACE));
    return INITIAL_WORKSPACE;
  }
  return JSON.parse(data);
}

export function saveWorkspace(workspace) {
  localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(workspace));
}

export function loadCategories() {
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  }
  return JSON.parse(data);
}

export function saveCategories(categories) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

export function loadMembers() {
  const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
    return INITIAL_MEMBERS;
  }
  return JSON.parse(data);
}

export function saveMembers(members) {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

export function loadExpenses() {
  const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    return INITIAL_EXPENSES;
  }
  return JSON.parse(data);
}

export function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

export function loadCurrentUser() {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!data) {
    const defaultUser = INITIAL_MEMBERS[0]; // Alex Rivera (Owner)
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
    return defaultUser;
  }
  return JSON.parse(data);
}

export function saveCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function loadOfflineSimMode() {
  return localStorage.getItem(STORAGE_KEYS.IS_OFFLINE_MODE) === "true";
}

export function saveOfflineSimMode(isOffline) {
  localStorage.setItem(STORAGE_KEYS.IS_OFFLINE_MODE, isOffline ? "true" : "false");
}

export function loadActivityLogs() {
  const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(INITIAL_ACTIVITY_LOGS));
    return INITIAL_ACTIVITY_LOGS;
  }
  return JSON.parse(data);
}

export function saveActivityLogs(logs) {
  localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
}

export function recordActivityLog({ actorId, actorName, actorRole, actionType, description, tag }) {
  const currentLogs = loadActivityLogs();
  const newLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    actorId: actorId || "system",
    actorName: actorName || "System",
    actorRole: actorRole || "system",
    actionType: actionType || "GENERAL",
    description,
    tag: tag || "Workspace Event",
    timestamp: new Date().toISOString()
  };
  const updatedLogs = [newLog, ...currentLogs];
  saveActivityLogs(updatedLogs);
  return updatedLogs;
}

// Check for potential duplicate expense within 48h (matching amount + vendor)
export function checkForDuplicate(newExpense, existingExpenses) {
  if (!newExpense.amount || !newExpense.vendor) return null;

  const targetVendor = newExpense.vendor.trim().toLowerCase();
  const targetAmount = Number(newExpense.amount);
  const targetDate = new Date(newExpense.date || new Date().toISOString().split("T")[0]).getTime();

  for (const exp of existingExpenses) {
    if (exp.id === newExpense.id) continue;
    const expVendor = exp.vendor.trim().toLowerCase();
    const expAmount = Number(exp.amount);
    const expDate = new Date(exp.date).getTime();

    // Vendor similarity & exact amount
    const vendorMatches = expVendor.includes(targetVendor) || targetVendor.includes(expVendor);
    const amountMatches = Math.abs(expAmount - targetAmount) < 0.01;
    const timeDiffHours = Math.abs(targetDate - expDate) / (1000 * 60 * 60);

    if (vendorMatches && amountMatches && timeDiffHours <= 48) {
      return exp.id;
    }
  }

  return null;
}
