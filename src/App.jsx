import React, { useState, useEffect, useCallback } from "react";
import { convertCurrency } from "./lib/currencies.js";
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
  findUserBusinesses
} from "./lib/firestore.js";
import { Header } from "./components/Header.jsx";
import { OfflineBanner } from "./components/OfflineBanner.jsx";
import { ExpenseFeed } from "./components/ExpenseFeed.jsx";
import { DashboardView } from "./components/DashboardView.jsx";
import { ChatIntakeModal } from "./components/ChatIntakeModal.jsx";
import { TeamWorkspaceModal } from "./components/TeamWorkspaceModal.jsx";
import { SettingsView } from "./components/SettingsView.jsx";
import { CaptureModal } from "./components/CaptureModal.jsx";
import { OnboardingFlowModal } from "./components/OnboardingFlowModal.jsx";
import { Camera, Receipt, ShieldCheck, Building2, AlertTriangle } from "lucide-react";

export function App() {
  // Demo (localStorage) state — used when not signed in
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [categories, setCategories] = useState(loadCategories);
  const [members, setMembers] = useState(loadMembers);
  const [expenses, setExpenses] = useState(loadExpenses);
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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

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
  // Firebase Auth session restore
  // -------------------------------------------------------------------------
  useEffect(() => {
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
          } else {
            // Signed in but no workspace yet — show onboarding
            setIsFirestoreMode(false);
            setBusinessId(null);
            setCurrentUser(null);
            setIsOnboardingOpen(true);
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

      // Respect the "Skip onboarding" flag unless the user explicitly requests it
      const wasSkipped = localStorage.getItem("snapsme_onboarding_skipped") === "true";
      const explicitRequest =
        params.get("onboarding") === "true" ||
        params.get("start") === "true" ||
        params.get("action") === "signup" ||
        hash === "#onboarding" ||
        hash === "#signup";

      if (explicitRequest) {
        // User explicitly requested onboarding — clear the skip flag and open it
        localStorage.removeItem("snapsme_onboarding_skipped");
        setIsOnboardingOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (!isFirestoreMode && (!workspace || !workspace.id) && !wasSkipped) {
        setIsOnboardingOpen(true);
      } else if (params.get("auth") === "signin" || hash === "#signin") {
        setIsOnboardingOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("view")) {
        const v = params.get("view");
        if (["feed", "dashboard", "chat", "team", "settings"].includes(v)) {
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

    // Onboarding completed — clear the skip flag
    try {
      localStorage.removeItem("snapsme_onboarding_skipped");
    } catch (e) {
      // ignore
    }

    // If signed in with Firebase, create the workspace in Firestore
    if (firebaseUser) {
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
        // The onSnapshot listener will update the feed automatically
        return;
      } catch (err) {
        console.error("Failed to save expense to Firestore:", err);
        // Fall back to local optimistic write so the user doesn't lose the entry
        const updated = [candidate, ...expenses];
        setExpenses(updated);
        return;
      }
    }

    // Demo mode: local optimistic write
    const updated = [candidate, ...expenses];
    setExpenses(updated);
  }, [workspace, categories, expenses, isFirestoreMode, businessId, currentUser, firebaseUser, isOfflineMode]);

  // -------------------------------------------------------------------------
  // Workspace update — Firestore or localStorage
  // -------------------------------------------------------------------------
  const handleUpdateWorkspace = useCallback(async (updates) => {
    if (isFirestoreMode && businessId) {
      try {
        await updateWorkspaceFirestore(businessId, updates);
        // Snapshot will update state
        return;
      } catch (err) {
        console.error("Failed to update workspace in Firestore:", err);
      }
    }
    setWorkspace(updates);
  }, [isFirestoreMode, businessId]);

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
        onOpenOnboarding={() => {
          localStorage.removeItem("snapsme_onboarding_skipped");
          setIsOnboardingOpen(true);
        }}
      />

      {/* Welcome Banner (Firestore mode) */}
      {isFirestoreMode && (
        <div className="bg-[#e7f4ec] border-b border-[#0f7a52]/20 text-[#0f7a52] text-xs px-4 py-2 text-center font-medium">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          {workspace?.name ? (
            <>Welcome to <span className="font-bold">{workspace.name}</span> — your expenses stay in sync in real time. Happy tracking!</>
          ) : (
            <>You're all set — your team expenses stay in sync in real time. Happy tracking!</>
          )}
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
                Zero-Friction Team Expense Capture
              </span>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1c1b19] leading-tight">
                Never lose track of team spend again
              </h1>
              <p className="text-xs sm:text-sm text-[#6b665c] leading-relaxed">
                No more chasing receipts. Your team snaps a photo or sends a quick voice note — we handle the rest, and you see it all as it happens.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10 flex-wrap">
              <button
                onClick={() => {
                  localStorage.removeItem("snapsme_onboarding_skipped");
                  setIsOnboardingOpen(true);
                }}
                className="bg-[#f7f3ea] hover:bg-white text-[#1c1b19] border border-[#d9d4c8] hover:border-[#0f7a52] font-display font-semibold text-xs sm:text-sm px-4 py-3 rounded-[10px] shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Building2 className="w-4 h-4 text-[#0f7a52]" />
                Onboard Workspace
              </button>
              <button
                onClick={() => setIsCaptureOpen(true)}
                className="bg-[#ff5a3c] hover:bg-[#e0482c] text-white font-display font-semibold text-xs sm:text-sm px-5 py-3 rounded-[10px] shadow-sm flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Snap Expense
              </button>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {currentView === "feed" && (
          <ExpenseFeed
            expenses={expenses}
            categories={categories}
            members={members}
            onOpenCapture={() => setIsCaptureOpen(true)}
            currency={workspace?.currency || "USD"}
          />
        )}

        {currentView === "dashboard" && (
          <DashboardView
            expenses={expenses}
            categories={categories}
            members={members}
            currency={workspace?.currency || "USD"}
            isOwner={currentUser?.role === "owner"}
            workspace={workspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            onOpenSettings={() => setCurrentView("settings")}
          />
        )}

        {currentView === "chat" && (
          <ChatIntakeModal
            currentUser={currentUser}
            categories={categories}
            onSaveExpense={handleSaveExpense}
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

      {/* Onboarding Flow Modal */}
      <OnboardingFlowModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleteOnboarding={handleCompleteOnboarding}
        saveWorkspaceFn={setWorkspace}
        saveMembersFn={setMembers}
        saveCurrentUserFn={setCurrentUser}
        saveCategoriesFn={setCategories}
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