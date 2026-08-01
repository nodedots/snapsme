import React, { useState, useEffect } from "react";
import { convertCurrency } from "./lib/currencies.js";
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
import { Header } from "./components/Header.jsx";
import { OfflineBanner } from "./components/OfflineBanner.jsx";
import { ExpenseFeed } from "./components/ExpenseFeed.jsx";
import { DashboardView } from "./components/DashboardView.jsx";
import { ChatIntakeModal } from "./components/ChatIntakeModal.jsx";
import { TeamWorkspaceModal } from "./components/TeamWorkspaceModal.jsx";
import { SettingsView } from "./components/SettingsView.jsx";
import { CaptureModal } from "./components/CaptureModal.jsx";
import { OnboardingFlowModal } from "./components/OnboardingFlowModal.jsx";
import { Camera, Sparkles, Receipt, CheckCircle, ShieldCheck, Building2, ArrowRight } from "lucide-react";

export function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [categories, setCategories] = useState(loadCategories);
  const [members, setMembers] = useState(loadMembers);
  const [expenses, setExpenses] = useState(loadExpenses);
  const [currentUser, setCurrentUser] = useState(loadCurrentUser);
  const [isOfflineMode, setIsOfflineMode] = useState(loadOfflineSimMode);

  const [currentView, setCurrentView] = useState("feed");
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Sync state changes to storage
  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveMembers(members);
  }, [members]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveOfflineSimMode(isOfflineMode);
  }, [isOfflineMode]);

  // Check URL parameters and hash on load to launch onboarding / signin directly from landing page CTAs
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      if (
        params.get("onboarding") === "true" ||
        params.get("start") === "true" ||
        params.get("action") === "signup" ||
        hash === "#onboarding" ||
        hash === "#signup"
      ) {
        setIsOnboardingOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
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
  }, []);

  // Handle onboarding completion
  const handleCompleteOnboarding = (result) => {
    if (result) {
      if (result.workspace) setWorkspace(result.workspace);
      if (result.members) setMembers(result.members);
      if (result.ownerMember) setCurrentUser(result.ownerMember);
      setCurrentView("dashboard");
    }
  };

  // Handle adding a new expense
  const handleSaveExpense = (newExpData) => {
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
            // Auto-assign if unassigned, generic, or default General
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

    const updated = [candidate, ...expenses];
    setExpenses(updated);
  };

  // Sync all pending offline items to online
  const handleForceSync = () => {
    const updated = expenses.map((exp) =>
      exp.syncStatus === "pending" ? { ...exp, syncStatus: "synced" } : exp
    );
    setExpenses(updated);
    setIsOfflineMode(false);
  };

  const pendingSyncCount = expenses.filter((e) => e.syncStatus === "pending").length;

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
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

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
                Know where every dollar went.
              </h1>
              <p className="text-xs sm:text-sm text-[#6b665c] leading-relaxed">
                Without chasing anyone for a receipt. Snap photos, record voice notes, or submit straight from Telegram & WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10 flex-wrap">
              <button
                onClick={() => setIsOnboardingOpen(true)}
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
            currency={workspace.currency}
          />
        )}

        {currentView === "dashboard" && (
          <DashboardView
            expenses={expenses}
            categories={categories}
            members={members}
            currency={workspace.currency}
            isOwner={currentUser.role === "owner"}
            workspace={workspace}
            onUpdateWorkspace={setWorkspace}
          />
        )}

        {currentView === "chat" && (
          <ChatIntakeModal
            currentUser={currentUser}
            categories={categories}
            onSaveExpense={handleSaveExpense}
            currency={workspace.currency}
          />
        )}

        {currentView === "team" && (
          <TeamWorkspaceModal
            workspace={workspace}
            members={members}
            categories={categories}
            expenses={expenses}
            currentUser={currentUser}
            onUpdateWorkspace={setWorkspace}
            onAddMember={(m) => setMembers([...members, m])}
            onRemoveMember={(id) => setMembers(members.filter((m) => m.userId !== id))}
            onUpdateCategories={setCategories}
          />
        )}

        {currentView === "settings" && (
          <SettingsView
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            workspace={workspace}
            onUpdateWorkspace={setWorkspace}
            members={members}
            setMembers={setMembers}
            categories={categories}
            setCategories={setCategories}
          />
        )}
      </main>

      {/* Capture Modal */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        categories={categories}
        currentUser={currentUser}
        workspaceCurrency={workspace.currency}
        isOfflineMode={isOfflineMode}
        onSaveExpense={handleSaveExpense}
      />

      {/* Onboarding Flow Modal */}
      <OnboardingFlowModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleteOnboarding={handleCompleteOnboarding}
        saveWorkspaceFn={setWorkspace}
        saveMembersFn={setMembers}
        saveCurrentUserFn={setCurrentUser}
      />

      {/* Footer */}
      <footer className="border-t border-[#d9d4c8] bg-[#f7f3ea] py-4 text-center text-xs text-[#6b665c]">
        <p className="font-mono text-[11px]">
          snapsme v1.0 — Receipt & Voice AI Expense Capture · Scoped to <span className="font-bold text-[#1c1b19]">{workspace.name}</span>
        </p>
      </footer>
    </div>
  );
}
