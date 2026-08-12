import React, { useState, useEffect, useCallback } from "react";
import { convertCurrency, reconvertCashflowRecords } from "./lib/currencies.js";
import { applyBrandAccentColor } from "./lib/brand.js";
import {
  loadWorkspace,
  saveWorkspace,
  loadCategories,
  saveCategories,
  loadMembers,
  saveMembers,
  loadExpenses,
  saveExpenses,
  loadIncomeEntries,
  saveIncomeEntries,
  loadCurrentUser,
  saveCurrentUser,
  loadOfflineSimMode,
  saveOfflineSimMode,
  checkForDuplicate
} from "./lib/storage.js";
import {
  subscribeToAuth,
  subscribeToBusiness,
  createBusinessWorkspaceFirestore,
  updateWorkspaceFirestore,
  addMemberFirestore,
  removeMemberFirestore,
  addCategoryFirestore,
  updateCategoryFirestore,
  deleteCategoryFirestore,
  addExpenseFirestore,
  updateExpenseFirestore,
  deleteExpenseFirestore,
  addIncomeFirestore,
  updateIncomeFirestore,
  deleteIncomeFirestore,
  softDeleteExpenseFirestore,
  softDeleteIncomeFirestore,
  restoreExpenseFirestore,
  restoreIncomeFirestore,
  findUserBusinesses
} from "./lib/firestore.js";
import {
  canEditRecord,
  canDeleteRecord,
  canRestoreRecord,
  canBulkManage,
  filterActiveRecords
} from "./lib/recordPermissions.js";
import { RecordEditModal } from "./components/RecordEditModal.jsx";
import { auth } from "./lib/firebase.js";
import { getRedirectResult } from "firebase/auth";
import { Header } from "./components/Header.jsx";
import { OfflineBanner } from "./components/OfflineBanner.jsx";
import { ExpenseFeed } from "./components/ExpenseFeed.jsx";
import { IncomeFeed } from "./components/IncomeFeed.jsx";
import { IncomeFormModal } from "./components/IncomeFormModal.jsx";
import { IncomeCaptureModal } from "./components/IncomeCaptureModal.jsx";
import { DashboardView } from "./components/DashboardView.jsx";
import { ChatIntakeModal } from "./components/ChatIntakeModal.jsx";
import { TeamWorkspaceModal } from "./components/TeamWorkspaceModal.jsx";
import { SettingsView } from "./components/SettingsView.jsx";
import { CaptureModal } from "./components/CaptureModal.jsx";
import { OnboardingFlowModal } from "./components/OnboardingFlowModal.jsx";
import { ImportModal } from "./components/ImportModal.jsx";
import { Camera, Receipt, ShieldCheck, Building2, AlertTriangle, TrendingUp, LayoutDashboard } from "lucide-react";

export function App() {
  // Demo (localStorage) state — used when not signed in
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [categories, setCategories] = useState(loadCategories);
  const [members, setMembers] = useState(loadMembers);
  const [expenses, setExpenses] = useState(loadExpenses);
  const [incomeEntries, setIncomeEntries] = useState(loadIncomeEntries);
  const [currentUser, setCurrentUser] = useState(loadCurrentUser);
  const [isOfflineMode, setIsOfflineMode] = useState(loadOfflineSimMode);

  // Firebase auth / Firestore mode state
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [isFirestoreMode, setIsFirestoreMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState(null);

  const [currentView, setCurrentView] = useState("feed");
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [isIncomeCaptureOpen, setIsIncomeCaptureOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  /** Which step-1 pane to show: "signin" | "signup" (Create Workspace / Sign up) */
  const [onboardingAuthMode, setOnboardingAuthMode] = useState("signup");
  /** { type: "expense"|"income", record } for edit modal */
  const [editingRecord, setEditingRecord] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState("expenses");

  // -------------------------------------------------------------------------
  // Demo-mode persistence (localStorage) — only used when NOT in Firestore mode
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isFirestoreMode) {
      saveWorkspace(workspace);
      if (workspace?.brand?.accentColor) {
        applyBrandAccentColor(workspace.brand.accentColor);
      }
    }
  }, [workspace, isFirestoreMode]);

  useEffect(() => {
    if (!isFirestoreMode) saveCategories(categories);
  }, [categories, isFirestoreMode]);

  useEffect(() => {
    if (!isFirestoreMode) saveMembers(members);
  }, [members, isFirestoreMode]);

  useEffect(() => {
    if (!isFirestoreMode) saveExpenses(expenses);
  }, [expenses, isFirestoreMode]);

  useEffect(() => {
    if (!isFirestoreMode) saveIncomeEntries(incomeEntries);
  }, [incomeEntries, isFirestoreMode]);

  useEffect(() => {
    if (!isFirestoreMode) saveCurrentUser(currentUser);
  }, [currentUser, isFirestoreMode]);

  useEffect(() => {
    saveOfflineSimMode(isOfflineMode);
  }, [isOfflineMode]);

  // Purge any legacy sample/dummy data from previous sessions to start with a clean slate
  useEffect(() => {
    if (!isFirestoreMode && expenses && expenses.length > 0 && expenses.some(e => e.id === "exp_101" || e.vendor === "Shell Petroleum" || e.vendor === "Staples Business Center")) {
      setExpenses([]);
      saveExpenses([]);
    }
  }, [expenses, isFirestoreMode]);

  // -------------------------------------------------------------------------
  // Firebase Auth session restore & redirect result processing
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Process redirect authentication (e.g., mobile Google Sign-In fallback)
    getRedirectResult(auth).catch((err) => {
      console.warn("Firebase redirect auth result error:", err.message);
    });

    const unsubscribe = subscribeToAuth(async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Signed in — try to resolve their business workspace
        try {
          const businesses = await findUserBusinesses(user.uid, user.email);
          if (businesses && businesses.length > 0) {
            const first = businesses[0];
            setBusinessId(first.businessId);
            setCurrentUser(first.member);
            setIsFirestoreMode(true);
            try {
              localStorage.setItem("snapsme_onboarding_completed", "true");
              localStorage.setItem("snapsme_onboarding_skipped", "true");
            } catch (e) {}
          } else {
            // Signed in but no workspace yet — only show onboarding if not already completed
            setIsFirestoreMode(false);
            setBusinessId(null);
            const wasCompleted = localStorage.getItem("snapsme_onboarding_completed") === "true";
            if (!wasCompleted) {
              setOnboardingAuthMode("signup");
              setIsOnboardingOpen(true);
            }
          }
        } catch (err) {
          console.warn("Failed to resolve user business:", err.message);
          setFirestoreError(err.message);
          setIsFirestoreMode(false);
        }
      } else {
        // Signed out — fall back to demo mode
        setBusinessId(null);
        setIsFirestoreMode(false);
        setCurrentUser(loadCurrentUser());
      }

      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // Firestore real-time subscriptions (when in Firestore mode)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isFirestoreMode || !businessId) return;

    const unsubscribe = subscribeToBusiness(
      businessId,
      {
        onWorkspace: (ws) => {
          if (ws) {
            setWorkspace(ws);
            if (ws.brand?.accentColor) {
              applyBrandAccentColor(ws.brand.accentColor);
            }
          }
        },
        onMembers: (list) => {
          setMembers(list);
          // Keep currentUser in sync with the member list
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const updated = list.find((m) => m.userId === prev.userId);
            return updated || prev;
          });
        },
        onCategories: (list) => setCategories(list),
        onExpenses: (list) => setExpenses(list),
        onIncome: (list) => setIncomeEntries(list),
        onError: (err) => {
          console.warn("Firestore subscription error:", err.message);
          setFirestoreError(err.message);
        }
      }
    );

    return () => unsubscribe();
  }, [isFirestoreMode, businessId]);

  // Check URL parameters or uninitialized workspace status on load to launch onboarding
  useEffect(() => {
    if (isAuthLoading) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      // Respect the "Skip onboarding" or "Completed onboarding" flag unless explicitly requested
      const wasCompleted =
        localStorage.getItem("snapsme_onboarding_skipped") === "true" ||
        localStorage.getItem("snapsme_onboarding_completed") === "true";

      const wantsSignIn =
        params.get("auth") === "signin" ||
        params.get("signin") === "true" ||
        hash === "#signin";

      const wantsSignUpOrWorkspace =
        params.get("onboarding") === "true" ||
        params.get("start") === "true" ||
        params.get("action") === "signup" ||
        params.get("auth") === "signup" ||
        params.get("signup") === "true" ||
        hash === "#onboarding" ||
        hash === "#signup";

      if (wantsSignIn) {
        // Sign in only — do NOT start Create Workspace flow
        setOnboardingAuthMode("signin");
        setIsOnboardingOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (wantsSignUpOrWorkspace) {
        // Explicit Create Workspace / Sign up
        localStorage.removeItem("snapsme_onboarding_skipped");
        localStorage.removeItem("snapsme_onboarding_completed");
        setOnboardingAuthMode("signup");
        setIsOnboardingOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (!isFirestoreMode && (!workspace || !workspace.id) && !wasCompleted) {
        // First-time visitor: account creation path
        setOnboardingAuthMode("signup");
        setIsOnboardingOpen(true);
      } else if (params.get("view")) {
        const v = params.get("view");
        if (["feed", "dashboard", "income", "chat", "team", "settings"].includes(v)) {
          setCurrentView(v);
        }
      }
    } catch (e) {
      console.warn("Could not parse URL params for auth/onboarding launch:", e);
    }
  }, [workspace?.id, isAuthLoading, isFirestoreMode]);

  // -------------------------------------------------------------------------
  // Onboarding completion — creates workspace in Firestore (if signed in)
  // or localStorage (demo mode)
  // -------------------------------------------------------------------------
  const handleCompleteOnboarding = useCallback(async (result) => {
    if (!result) return;

    // Mark onboarding as completed in localStorage so it NEVER opens automatically again
    try {
      localStorage.setItem("snapsme_onboarding_completed", "true");
      localStorage.setItem("snapsme_onboarding_skipped", "true");
    } catch (e) {
      // ignore
    }

    setIsOnboardingOpen(false);

    if (firebaseUser) {
      // ── Returning user: workspace already exists in Firestore ──────────────
      // result.businessId is present when the modal detected an existing workspace
      // (Google Sign-In or email Sign-In for a returning user). Activate it directly
      // instead of calling createBusinessWorkspaceFirestore, which would create a
      // brand-new blank workspace and discard all existing data.
      if (result.businessId) {
        setBusinessId(result.businessId);
        if (result.ownerMember) setCurrentUser(result.ownerMember);
        setIsFirestoreMode(true);
        setCurrentView("dashboard");
        return;
      }

      // ── New user: create the workspace in Firestore ─────────────────────────
      try {
        const ownerUser = {
          uid: firebaseUser.uid,
          displayName: result.ownerMember?.displayName || firebaseUser.displayName || "Owner",
          email: result.ownerMember?.email || firebaseUser.email || null,
          phone: result.ownerMember?.phone || null
        };

        const defaultCategories = (result.categories || []).map((c) => ({
          name: c.name,
          budget: c.budget
        }));

        const newBusinessId = await createBusinessWorkspaceFirestore(
          ownerUser,
          {
            name: result.workspace?.name || "My Workspace",
            currency: result.workspace?.currency || "USD",
            businessType: result.workspace?.businessType || null
          },
          defaultCategories
        );

        setBusinessId(newBusinessId);
        setIsFirestoreMode(true);

        // Invite staff members if provided
        if (result.members && result.members.length > 1) {
          const staff = result.members.filter((m) => m.role !== "owner");
          for (const s of staff) {
            try {
              await addMemberFirestore(newBusinessId, {
                userId: s.userId,
                role: "staff",
                displayName: s.displayName,
                email: s.email || null,
                phone: s.phone || null,
                telegramUserId: null,
                whatsappUserId: null
              });
            } catch (err) {
              console.warn("Failed to invite staff member:", err.message);
            }
          }
        }

        setCurrentView("dashboard");
        return;
      } catch (err) {
        console.error("Failed to create Firestore workspace:", err);
        setFirestoreError(err.message);
        // Fall through to demo mode so the user isn't stuck
      }
    }

    // Demo mode (localStorage)
    if (result.workspace) setWorkspace(result.workspace);
    if (result.members) setMembers(result.members);
    if (result.ownerMember) setCurrentUser(result.ownerMember);
    if (result.categories && result.categories.length > 0) {
      setCategories(result.categories);
    }
    setCurrentView("dashboard");
  }, [firebaseUser]);


  // -------------------------------------------------------------------------
  // Expense save — writes to Firestore when in Firestore mode
  // -------------------------------------------------------------------------
  const handleSaveExpense = useCallback(async (newExpData) => {
    const id = `exp_${Date.now()}`;
    const createdAt = new Date().toISOString();

    let finalCategoryId = newExpData.categoryId;
    let finalCategoryName = newExpData.categoryName;

    // Heuristic category auto-suggest based on merchant/vendor name
    if (newExpData.vendor && newExpData.vendor.trim() !== "") {
      const v = newExpData.vendor.toLowerCase();

      const heuristicMap = [
        {
          keywords: ["shell", "chevron", "exxon", "bp", "gas", "fuel", "uber", "lyft", "taxi", "parking", "transit", "metro", "hertz", "enterprise", "carwash"],
          categoryKeywords: ["fuel", "transport", "travel", "auto"]
        },
        {
          keywords: ["staples", "office depot", "amazon", "paper", "print", "supplies", "fedex", "ups", "dhl", "post", "target", "walmart"],
          categoryKeywords: ["office", "supplies"]
        },
        {
          keywords: ["starbucks", "mcdonald", "cafe", "coffee", "restaurant", "diner", "bistro", "food", "grill", "doordash", "ubereats", "pizza", "sushi", "bakery", "subway", "chipotle"],
          categoryKeywords: ["meal", "entertainment", "food", "dining"]
        },
        {
          keywords: ["hotel", "airbnb", "marriott", "hilton", "hyatt", "booking", "expedia", "flight", "airline", "delta", "united", "american air", "jetblue"],
          categoryKeywords: ["travel", "lodging", "hotel"]
        },
        {
          keywords: ["github", "aws", "google cloud", "azure", "vercel", "slack", "zoom", "notion", "adobe", "figma", "openai", "software", "saas", "atlassian", "godaddy", "domain"],
          categoryKeywords: ["software", "subscriptions", "it", "tech"]
        }
      ];

      for (const h of heuristicMap) {
        if (h.keywords.some((k) => v.includes(k))) {
          const matchedCategory = categories.find((c) =>
            h.categoryKeywords.some((ck) => c.name.toLowerCase().includes(ck))
          );
          if (matchedCategory) {
            if (
              !finalCategoryId ||
              finalCategoryName === "General" ||
              finalCategoryName === "Other" ||
              finalCategoryName === "Uncategorized" ||
              finalCategoryId === "cat_general"
            ) {
              finalCategoryId = matchedCategory.id;
              finalCategoryName = matchedCategory.name;
            }
            break;
          }
        }
      }
    }

    // Guarantee Default Accounting Currency conversion for all snapped expenses
    const defaultAccountingCurrency = workspace?.currency || "USD";
    const srcCurrency = newExpData.originalCurrency || newExpData.currency || defaultAccountingCurrency;
    const rawCapturedAmount = newExpData.originalAmount !== undefined ? newExpData.originalAmount : newExpData.amount;

    const conversion = convertCurrency(rawCapturedAmount, srcCurrency, defaultAccountingCurrency);

    const candidate = {
      ...newExpData,
      amount: conversion.convertedAmount,
      currency: defaultAccountingCurrency,
      originalAmount: parseFloat(rawCapturedAmount),
      originalCurrency: srcCurrency,
      exchangeRate: conversion.exchangeRate,
      isConverted: conversion.isConverted,
      categoryId: finalCategoryId,
      categoryName: finalCategoryName,
      id,
      createdAt
    };

    // Duplicate detection logic per PRD FR20
    const duplicateId = checkForDuplicate(candidate, expenses);
    candidate.duplicateOf = duplicateId;

    // Optimistically update local state immediately so feed updates with 0 delay
    setExpenses((prev) => [candidate, ...prev.filter((e) => e.id !== candidate.id)]);

    // Firestore mode: write to the business expenses subcollection
    if (isFirestoreMode && businessId) {
      try {
        const expensePayload = {
          ...candidate,
          businessId,
          submittedBy: currentUser?.userId || firebaseUser?.uid || "usr_guest",
          submittedByName: currentUser?.displayName || firebaseUser?.displayName || "Guest User",
          submittedByRole: currentUser?.role || "owner",
          syncStatus: isOfflineMode ? "pending" : "synced"
        };
        await addExpenseFirestore(businessId, expensePayload);
      } catch (err) {
        console.error("Failed to save expense to Firestore:", err);
      }
      return;
    }

    // Backup persistence to local storage
    try {
      const stored = localStorage.getItem("snapsme_expenses");
      const currentArr = stored ? JSON.parse(stored) : [];
      localStorage.setItem("snapsme_expenses", JSON.stringify([candidate, ...currentArr.filter(e => e.id !== candidate.id)]));
    } catch (e) {}
  }, [workspace, categories, expenses, isFirestoreMode, businessId, currentUser, firebaseUser, isOfflineMode]);

  // -------------------------------------------------------------------------
  // Income save/delete — Firestore or localStorage (FR-I1)
  // -------------------------------------------------------------------------
  const handleSaveIncome = useCallback(async (incomeInput) => {
    const defaultAccountingCurrency = workspace?.currency || "USD";
    const srcCurrency = incomeInput.originalCurrency || incomeInput.currency || defaultAccountingCurrency;
    const rawCapturedAmount = incomeInput.originalAmount !== undefined ? incomeInput.originalAmount : incomeInput.amount;

    const conversion = convertCurrency(rawCapturedAmount, srcCurrency, defaultAccountingCurrency);

    const entry = {
      ...incomeInput,
      amount: conversion.convertedAmount,
      currency: defaultAccountingCurrency,
      originalAmount: parseFloat(rawCapturedAmount),
      originalCurrency: srcCurrency,
      exchangeRate: conversion.exchangeRate,
      isConverted: conversion.isConverted
    };

    // Optimistically update local state immediately
    setIncomeEntries((prev) => [entry, ...(prev || []).filter((e) => e.id !== entry.id)]);

    // Firestore mode: write to the business income subcollection
    if (isFirestoreMode && businessId) {
      try {
        const incomePayload = {
          ...entry,
          businessId,
          submittedBy: currentUser?.userId || firebaseUser?.uid || "usr_guest",
          submittedByName: currentUser?.displayName || firebaseUser?.displayName || "Team member"
        };
        await addIncomeFirestore(businessId, incomePayload);
      } catch (err) {
        console.error("Failed to save income to Firestore:", err);
      }
      return;
    }

    // Backup persistence to local storage
    try {
      const stored = localStorage.getItem("snapsme_income");
      const currentArr = stored ? JSON.parse(stored) : [];
      localStorage.setItem("snapsme_income", JSON.stringify([entry, ...currentArr.filter(e => e.id !== entry.id)]));
    } catch (e) {}
  }, [workspace, isFirestoreMode, businessId, currentUser, firebaseUser]);

  // -------------------------------------------------------------------------
  // Record management — edit / soft-delete / restore / permanent delete / bulk
  // -------------------------------------------------------------------------
  const handleUpdateExpense = useCallback(async (expenseId, updates) => {
    const rec = expenses.find((e) => e.id === expenseId);
    const perm = canEditRecord(rec, currentUser);
    if (!perm.allowed) throw new Error(perm.reason || "Not allowed to edit this expense.");

    setExpenses((prev) =>
      (prev || []).map((e) => (e.id === expenseId ? { ...e, ...updates } : e))
    );

    if (isFirestoreMode && businessId) {
      try {
        await updateExpenseFirestore(businessId, expenseId, updates);
      } catch (err) {
        console.error("Failed to update expense:", err);
        throw err;
      }
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("snapsme_expenses") || "[]");
      localStorage.setItem(
        "snapsme_expenses",
        JSON.stringify(stored.map((e) => (e.id === expenseId ? { ...e, ...updates } : e)))
      );
    } catch (e) {}
  }, [expenses, currentUser, isFirestoreMode, businessId]);

  const handleUpdateIncome = useCallback(async (incomeId, updates) => {
    const rec = (incomeEntries || []).find((e) => e.id === incomeId);
    const perm = canEditRecord(rec, currentUser);
    if (!perm.allowed) throw new Error(perm.reason || "Not allowed to edit this income entry.");

    setIncomeEntries((prev) =>
      (prev || []).map((e) => (e.id === incomeId ? { ...e, ...updates } : e))
    );

    if (isFirestoreMode && businessId) {
      try {
        await updateIncomeFirestore(businessId, incomeId, updates);
      } catch (err) {
        console.error("Failed to update income:", err);
        throw err;
      }
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("snapsme_income") || "[]");
      localStorage.setItem(
        "snapsme_income",
        JSON.stringify(stored.map((e) => (e.id === incomeId ? { ...e, ...updates } : e)))
      );
    } catch (e) {}
  }, [incomeEntries, currentUser, isFirestoreMode, businessId]);

  /** Soft-delete (default). permanent=true hard-deletes. */
  const handleDeleteExpense = useCallback(async (expenseId, { permanent = false } = {}) => {
    const rec = expenses.find((e) => e.id === expenseId);
    const perm = canDeleteRecord(rec, currentUser);
    if (!perm.allowed) {
      console.warn(perm.reason);
      return;
    }

    if (permanent) {
      setExpenses((prev) => (prev || []).filter((e) => e.id !== expenseId));
      if (isFirestoreMode && businessId) {
        try {
          await deleteExpenseFirestore(businessId, expenseId);
        } catch (err) {
          console.error("Failed to permanently delete expense:", err);
        }
        return;
      }
      try {
        const stored = JSON.parse(localStorage.getItem("snapsme_expenses") || "[]");
        localStorage.setItem(
          "snapsme_expenses",
          JSON.stringify(stored.filter((e) => e.id !== expenseId))
        );
      } catch (e) {}
      return;
    }

    const deletedAt = new Date().toISOString();
    setExpenses((prev) =>
      (prev || []).map((e) => (e.id === expenseId ? { ...e, deletedAt } : e))
    );
    if (isFirestoreMode && businessId) {
      try {
        await softDeleteExpenseFirestore(businessId, expenseId);
      } catch (err) {
        console.error("Failed to soft-delete expense:", err);
      }
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("snapsme_expenses") || "[]");
      localStorage.setItem(
        "snapsme_expenses",
        JSON.stringify(stored.map((e) => (e.id === expenseId ? { ...e, deletedAt } : e)))
      );
    } catch (e) {}
  }, [expenses, currentUser, isFirestoreMode, businessId]);

  const handleDeleteIncome = useCallback(async (incomeId, { permanent = false } = {}) => {
    const rec = (incomeEntries || []).find((e) => e.id === incomeId);
    const perm = canDeleteRecord(rec, currentUser);
    if (!perm.allowed) {
      console.warn(perm.reason);
      return;
    }

    if (permanent) {
      setIncomeEntries((prev) => (prev || []).filter((e) => e.id !== incomeId));
      if (isFirestoreMode && businessId) {
        try {
          await deleteIncomeFirestore(businessId, incomeId);
        } catch (err) {
          console.error("Failed to permanently delete income:", err);
        }
        return;
      }
      try {
        const stored = JSON.parse(localStorage.getItem("snapsme_income") || "[]");
        localStorage.setItem(
          "snapsme_income",
          JSON.stringify(stored.filter((e) => e.id !== incomeId))
        );
      } catch (e) {}
      return;
    }

    const deletedAt = new Date().toISOString();
    setIncomeEntries((prev) =>
      (prev || []).map((e) => (e.id === incomeId ? { ...e, deletedAt } : e))
    );
    if (isFirestoreMode && businessId) {
      try {
        await softDeleteIncomeFirestore(businessId, incomeId);
      } catch (err) {
        console.error("Failed to soft-delete income:", err);
      }
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("snapsme_income") || "[]");
      localStorage.setItem(
        "snapsme_income",
        JSON.stringify(stored.map((e) => (e.id === incomeId ? { ...e, deletedAt } : e)))
      );
    } catch (e) {}
  }, [incomeEntries, currentUser, isFirestoreMode, businessId]);

  const handleRestoreExpense = useCallback(async (expenseId) => {
    const rec = expenses.find((e) => e.id === expenseId);
    if (!canRestoreRecord(rec, currentUser).allowed) return;
    setExpenses((prev) =>
      (prev || []).map((e) => (e.id === expenseId ? { ...e, deletedAt: null } : e))
    );
    if (isFirestoreMode && businessId) {
      try {
        await restoreExpenseFirestore(businessId, expenseId);
      } catch (err) {
        console.error("Failed to restore expense:", err);
      }
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("snapsme_expenses") || "[]");
      localStorage.setItem(
        "snapsme_expenses",
        JSON.stringify(stored.map((e) => (e.id === expenseId ? { ...e, deletedAt: null } : e)))
      );
    } catch (e) {}
  }, [expenses, currentUser, isFirestoreMode, businessId]);

  const handleRestoreIncome = useCallback(async (incomeId) => {
    const rec = (incomeEntries || []).find((e) => e.id === incomeId);
    if (!canRestoreRecord(rec, currentUser).allowed) return;
    setIncomeEntries((prev) =>
      (prev || []).map((e) => (e.id === incomeId ? { ...e, deletedAt: null } : e))
    );
    if (isFirestoreMode && businessId) {
      try {
        await restoreIncomeFirestore(businessId, incomeId);
      } catch (err) {
        console.error("Failed to restore income:", err);
      }
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("snapsme_income") || "[]");
      localStorage.setItem(
        "snapsme_income",
        JSON.stringify(stored.map((e) => (e.id === incomeId ? { ...e, deletedAt: null } : e)))
      );
    } catch (e) {}
  }, [incomeEntries, currentUser, isFirestoreMode, businessId]);

  const handleBulkDeleteExpenses = useCallback(async (ids, { permanent = false } = {}) => {
    if (!canBulkManage(currentUser)) return;
    for (const id of ids) {
      await handleDeleteExpense(id, { permanent });
    }
  }, [currentUser, handleDeleteExpense]);

  const handleBulkDeleteIncome = useCallback(async (ids, { permanent = false } = {}) => {
    if (!canBulkManage(currentUser)) return;
    for (const id of ids) {
      await handleDeleteIncome(id, { permanent });
    }
  }, [currentUser, handleDeleteIncome]);

  const handleBulkRecategorizeExpenses = useCallback(async (ids, category) => {
    if (!canBulkManage(currentUser)) return;
    const updates = {
      categoryId: category?.id || null,
      category: category?.id || null,
      categoryName: category?.name || "Other Expenses",
      updatedAt: new Date().toISOString()
    };
    for (const id of ids) {
      await handleUpdateExpense(id, updates);
    }
  }, [currentUser, handleUpdateExpense]);

  const handleBulkMoneyMovement = useCallback(async (ids, moneyMovement) => {
    if (!canBulkManage(currentUser)) return;
    const updates = { moneyMovement, updatedAt: new Date().toISOString() };
    for (const id of ids) {
      await handleUpdateExpense(id, updates);
    }
  }, [currentUser, handleUpdateExpense]);

  // -------------------------------------------------------------------------
  // Workspace update — Firestore or localStorage
  // -------------------------------------------------------------------------
  const handleUpdateWorkspace = useCallback(async (updates) => {
    const oldCurrency = workspace?.currency || "USD";
    const newCurrency = updates.currency ? updates.currency.trim().toUpperCase() : oldCurrency;
    const isCurrencyChanged = Boolean(newCurrency && newCurrency !== oldCurrency);

    const updatedWorkspace = {
      ...workspace,
      ...updates,
      currency: newCurrency
    };

    if (isCurrencyChanged) {
      // Reconverts all existing cashflow records (expenses & income) and budget limits to new currency equivalent
      const {
        expenses: updatedExpenses,
        incomeEntries: updatedIncome,
        categories: updatedCategories
      } = reconvertCashflowRecords(expenses, incomeEntries, categories, oldCurrency, newCurrency);

      if (updatedWorkspace.monthlyBudget) {
        const budgetConv = convertCurrency(updatedWorkspace.monthlyBudget, oldCurrency, newCurrency);
        updatedWorkspace.monthlyBudget = budgetConv.convertedAmount;
      }

      // Optimistically update local React states so feeds, cards & dashboards adjust in real-time
      setExpenses(updatedExpenses);
      saveExpenses(updatedExpenses);

      setIncomeEntries(updatedIncome);
      saveIncomeEntries(updatedIncome);

      setCategories(updatedCategories);
      saveCategories(updatedCategories);

      if (isFirestoreMode && businessId) {
        try {
          for (const exp of updatedExpenses) {
            await updateExpenseFirestore(businessId, exp.id, exp);
          }
          for (const inc of updatedIncome) {
            await updateIncomeFirestore(businessId, inc.id, inc);
          }
          for (const cat of updatedCategories) {
            await updateCategoryFirestore(businessId, cat.id, cat);
          }
        } catch (err) {
          console.error("Firestore currency batch conversion error:", err);
        }
      }
    }

    if (isFirestoreMode && businessId) {
      try {
        await updateWorkspaceFirestore(businessId, updatedWorkspace);
      } catch (err) {
        console.error("Failed to update workspace in Firestore:", err);
      }
    }

    setWorkspace(updatedWorkspace);
    saveWorkspace(updatedWorkspace);
  }, [workspace, expenses, incomeEntries, categories, isFirestoreMode, businessId]);

  // -------------------------------------------------------------------------
  // Member add/remove — Firestore or localStorage
  // -------------------------------------------------------------------------
  const handleAddMember = useCallback(async (member) => {
    if (isFirestoreMode && businessId) {
      try {
        await addMemberFirestore(businessId, member);
        return;
      } catch (err) {
        console.error("Failed to add member to Firestore:", err);
      }
    }
    setMembers((prev) => [...prev, member]);
  }, [isFirestoreMode, businessId]);

  const handleRemoveMember = useCallback(async (userId) => {
    if (isFirestoreMode && businessId) {
      try {
        await removeMemberFirestore(businessId, userId);
        return;
      } catch (err) {
        console.error("Failed to remove member from Firestore:", err);
      }
    }
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }, [isFirestoreMode, businessId]);

  // -------------------------------------------------------------------------
  // Category add/update/delete — Firestore or localStorage
  // -------------------------------------------------------------------------
  const handleAddCategory = useCallback(async (category) => {
    if (isFirestoreMode && businessId) {
      try {
        await addCategoryFirestore(businessId, category);
        return;
      } catch (err) {
        console.error("Failed to add category to Firestore:", err);
      }
    }
    setCategories((prev) => [...prev, category]);
  }, [isFirestoreMode, businessId]);

  const handleUpdateCategory = useCallback(async (categoryId, updates) => {
    if (isFirestoreMode && businessId) {
      try {
        await updateCategoryFirestore(businessId, categoryId, updates);
        return;
      } catch (err) {
        console.error("Failed to update category in Firestore:", err);
      }
    }
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c)));
  }, [isFirestoreMode, businessId]);

  const handleDeleteCategory = useCallback(async (categoryId) => {
    if (isFirestoreMode && businessId) {
      try {
        await deleteCategoryFirestore(businessId, categoryId);
        return;
      } catch (err) {
        console.error("Failed to delete category from Firestore:", err);
      }
    }
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }, [isFirestoreMode, businessId]);

  // Sync all pending offline items to online
  const handleForceSync = useCallback(async () => {
    if (isFirestoreMode && businessId) {
      const pending = expenses.filter((e) => e.syncStatus === "pending");
      for (const exp of pending) {
        try {
          await updateExpenseFirestore(businessId, exp.id, { syncStatus: "synced" });
        } catch (err) {
          console.warn("Failed to sync expense:", exp.id, err.message);
        }
      }
      return;
    }
    const updated = expenses.map((exp) =>
      exp.syncStatus === "pending" ? { ...exp, syncStatus: "synced" } : exp
    );
    setExpenses(updated);
    setIsOfflineMode(false);
  }, [isFirestoreMode, businessId, expenses]);

  // Auto-sync on reconnect (Phase 4 — Offline-First Capture)
  // When the browser regains connectivity, automatically reconcile any
  // pending-sync expenses in Firestore mode.
  useEffect(() => {
    if (!isFirestoreMode || !businessId) return;

    const handleOnline = () => {
      console.info("[snapsme] Network reconnected — auto-syncing pending expenses.");
      handleForceSync();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isFirestoreMode, businessId, handleForceSync]);

  const pendingSyncCount = expenses.filter((e) => e.syncStatus === "pending").length;

  // Loading state while auth resolves
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f7f3ea] text-[#1c1b19] font-body flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#d9d4c8] shadow-sm mx-auto animate-pulse">
            <img src="/logo.jpg" alt="SnapSME Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-display font-bold text-lg text-[#1c1b19]">
              Snap<span className="text-[#0075de]">SME</span>
            </p>
            <p className="text-xs text-[#6b665c] font-mono mt-1">Loading SnapSME...</p>
            <p className="text-[11px] text-[#6b665c] font-mono">Restoring session</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#1c1b19] font-body flex flex-col">
      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        workspace={workspace}
        members={members}
        expensesCount={expenses.length}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        pendingSyncCount={pendingSyncCount}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onAddIncome={() => setIsIncomeCaptureOpen(true)}
        onOpenOnboarding={() => {
          localStorage.removeItem("snapsme_onboarding_skipped");
          setOnboardingAuthMode("signup");
          setIsOnboardingOpen(true);
        }}
      />

      {/* Welcome Banner (Firestore mode) */}
      {isFirestoreMode && (
        <div className="bg-[#e7f4ec] border-b border-[#0f7a52]/20 text-[#0f7a52] text-xs px-4 py-2 text-center font-medium">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Your team's income and expenses stay in sync in real time. Happy cashflow tracking!
        </div>
      )}

      {/* Sync Error Banner */}
      {firestoreError && (
        <div className="bg-[#fbf1de] border-b border-[#e0982a]/40 text-[#1c1b19] text-[11px] font-mono px-4 py-1.5 text-center">
          <AlertTriangle className="w-3 h-3 inline mr-1 text-[#e0982a]" />
          Something went wrong while syncing: {firestoreError}
        </div>
      )}

      {/* Offline Simulator Warning Banner */}
      <OfflineBanner
        isOfflineMode={isOfflineMode}
        pendingSyncCount={pendingSyncCount}
        onForceSync={handleForceSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1120px] w-full mx-auto px-4 sm:px-6 py-6">
        {/* Top Hero Banner */}
        {currentView === "feed" && (
          <div className="mb-6 bg-white border border-[#d9d4c8] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="space-y-1 z-10 max-w-xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0f7a52] bg-[#e7f4ec] px-2.5 py-0.5 rounded-full inline-block mb-1">
                Your team's money, all in one place
              </span>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1c1b19] leading-tight">
                Every penny in. Every penny out. Nothing slips through.
              </h1>
              <p className="text-xs sm:text-sm text-[#6b665c] leading-relaxed">
                Snap a receipt, say it out loud, or type it in — expenses and income land in your shared ledger instantly. No chasing, no guessing, no spreadsheet nightmares.
              </p>
            </div>

            {/* Co-primary action pair + tertiary navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 z-10 w-full sm:w-auto">
              {/* Record Expense — expense outflow action */}
              <button
                onClick={() => setIsCaptureOpen(true)}
                aria-label="Record an expense"
                className="flex items-center justify-center gap-2 font-display font-semibold text-sm px-5 py-3 rounded-[10px] text-white shadow-sm cursor-pointer transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--color-expense-action)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-expense-action-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-expense-action)'}
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>Record Expense</span>
              </button>
              {/* Add Income — income inflow action */}
              <button
                onClick={() => setIsIncomeCaptureOpen(true)}
                aria-label="Add an income entry"
                className="flex items-center justify-center gap-2 font-display font-semibold text-sm px-5 py-3 rounded-[10px] text-white shadow-sm cursor-pointer transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--color-income-action)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-income-action-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-income-action)'}
              >
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                <span>Add Income</span>
              </button>
              {/* Spend Dashboard navigation */}
              <button
                onClick={() => setCurrentView("dashboard")}
                aria-label="Open owner & team spend dashboard"
                className="flex items-center justify-center gap-2 bg-[#f7f3ea] hover:bg-white text-[#1c1b19] border border-[#d9d4c8] hover:border-[#0075de] font-display font-medium text-xs px-4 py-3 rounded-[10px] shadow-2xs cursor-pointer transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-[#0075de]" aria-hidden="true" />
                <span>Dashboard</span>
              </button>
              {/* Workspace Settings */}
              <button
                onClick={() => setCurrentView("settings")}
                aria-label="Open workspace settings"
                className="flex items-center justify-center gap-2 bg-[#f7f3ea] hover:bg-white text-[#1c1b19] border border-[#d9d4c8] hover:border-[#615d59] font-display font-medium text-xs px-4 py-3 rounded-[10px] shadow-2xs cursor-pointer transition-all"
              >
                <Building2 className="w-4 h-4 text-[#615d59]" aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {currentView === "feed" && (
          <ExpenseFeed
            expenses={expenses}
            incomeEntries={incomeEntries}
            categories={categories}
            members={members}
            currentUser={currentUser}
            onOpenCapture={() => setIsCaptureOpen(true)}
            onAddIncome={() => setIsIncomeCaptureOpen(true)}
            onOpenDashboard={() => setCurrentView("dashboard")}
            onOpenImport={(type) => { setImportType(type); setIsImportOpen(true); }}
            onEditExpense={(rec) => setEditingRecord({ type: "expense", record: rec })}
            onDeleteExpense={handleDeleteExpense}
            onRestoreExpense={handleRestoreExpense}
            onBulkDelete={handleBulkDeleteExpenses}
            onBulkRecategorize={handleBulkRecategorizeExpenses}
            onBulkMoneyMovement={handleBulkMoneyMovement}
            currency={workspace?.currency || "USD"}
          />
        )}

        {currentView === "income" && (
          <IncomeFeed
            incomeEntries={incomeEntries}
            members={members}
            currentUser={currentUser}
            currency={workspace?.currency || "USD"}
            onAddIncome={() => setIsIncomeOpen(true)}
            onOpenIncomeCapture={() => setIsIncomeCaptureOpen(true)}
            onOpenDashboard={() => setCurrentView("dashboard")}
            onOpenImport={(type) => { setImportType(type); setIsImportOpen(true); }}
            onEditIncome={(rec) => setEditingRecord({ type: "income", record: rec })}
            onDeleteIncome={handleDeleteIncome}
            onRestoreIncome={handleRestoreIncome}
            onBulkDelete={handleBulkDeleteIncome}
            isOwner={currentUser?.role === "owner"}
          />
        )}

        {currentView === "dashboard" && (
          <DashboardView
            expenses={filterActiveRecords(expenses)}
            incomeEntries={filterActiveRecords(incomeEntries)}
            categories={categories}
            members={members}
            currency={workspace?.currency || "USD"}
            isOwner={currentUser?.role === "owner"}
            workspace={workspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            onOpenSettings={() => setCurrentView("settings")}
            onAddIncome={() => setIsIncomeCaptureOpen(true)}
            onOpenCapture={() => setIsCaptureOpen(true)}
            onOpenImport={(type) => { setImportType(type || "expenses"); setIsImportOpen(true); }}
          />
        )}

        {currentView === "chat" && (
          <ChatIntakeModal
            currentUser={currentUser}
            categories={categories}
            onSaveExpense={handleSaveExpense}
            onSaveIncome={handleSaveIncome}
            currency={workspace?.currency || "USD"}
            workspaceCurrency={workspace?.currency || "USD"}
          />
        )}

        {currentView === "team" && (
          <TeamWorkspaceModal
            workspace={workspace}
            members={members}
            categories={categories}
            expenses={expenses}
            currentUser={currentUser}
            onUpdateWorkspace={handleUpdateWorkspace}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onUpdateCategories={handleAddCategory}
          />
        )}

        {currentView === "settings" && (
          <SettingsView
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            workspace={workspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            members={members}
            setMembers={setMembers}
            categories={categories}
            setCategories={setCategories}
            onBackToDashboard={() => setCurrentView("dashboard")}
          />
        )}
      </main>

      {/* Capture Modal */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        categories={categories}
        currentUser={currentUser}
        workspaceCurrency={workspace?.currency || "USD"}
        isOfflineMode={isOfflineMode}
        onSaveExpense={handleSaveExpense}
        businessId={businessId}
      />

      {/* Income Form Modal (FR-I1) — lightweight quick log */}
      <IncomeFormModal
        isOpen={isIncomeOpen}
        onClose={() => setIsIncomeOpen(false)}
        currency={workspace?.currency || "USD"}
        currentUser={currentUser}
        onSaveIncome={handleSaveIncome}
      />

      {/* Income Capture Modal (FR-I1) — full capture flow: scan/upload, voice, manual */}
      <IncomeCaptureModal
        isOpen={isIncomeCaptureOpen}
        onClose={() => setIsIncomeCaptureOpen(false)}
        currentUser={currentUser}
        workspaceCurrency={workspace?.currency || "USD"}
        isOfflineMode={isOfflineMode}
        onSaveIncome={handleSaveIncome}
        businessId={businessId}
      />

      {/* Onboarding Flow Modal */}
      <OnboardingFlowModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleteOnboarding={handleCompleteOnboarding}
        initialAuthMode={onboardingAuthMode}
        currentUser={currentUser}
        saveWorkspaceFn={setWorkspace}
        saveMembersFn={setMembers}
        saveCurrentUserFn={setCurrentUser}
        saveCategoriesFn={setCategories}
      />

      {/* Bulk CSV/Excel Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type={importType}
        businessId={businessId}
        categories={categories}
        currency={workspace?.currency || "USD"}
        currentUser={currentUser}
        onImportComplete={() => { /* Firestore real-time listeners auto-refresh */ }}
      />

      {/* Record edit modal (expense or income) */}
      <RecordEditModal
        isOpen={Boolean(editingRecord)}
        record={editingRecord?.record || null}
        recordType={editingRecord?.type || "expense"}
        categories={categories}
        currency={workspace?.currency || "USD"}
        onClose={() => setEditingRecord(null)}
        onSave={async (id, updates) => {
          if (editingRecord?.type === "income") {
            await handleUpdateIncome(id, updates);
          } else {
            await handleUpdateExpense(id, updates);
          }
        }}
      />

      {/* Footer */}
      <footer className="border-t border-[#d9d4c8] bg-[#f7f3ea] py-4 text-center text-xs text-[#6b665c]">
        <p className="font-mono text-[11px]">
          SnapSME v1.0 — Receipt & Voice AI Expense Capture · <span className="font-bold text-[#1c1b19]">{workspace?.name || "My Workspace"}</span>
        </p>
      </footer>
    </div>
  );
}