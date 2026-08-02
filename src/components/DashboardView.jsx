import React, { useState, useEffect } from "react";
import { getCurrencySymbol } from "../lib/currencies.js";
import {
  Download,
  AlertTriangle,
  TrendingUp,
  Users,
  Wallet,
  CreditCard,
  PieChart,
  ShieldAlert,
  Target,
  Save,
  Check,
  Bell,
  BellRing,
  Mail,
  Globe
} from "lucide-react";

export const DashboardView = ({
  expenses,
  categories,
  members,
  currency,
  isOwner,
  workspace,
  onUpdateWorkspace
}) => {
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState(
    workspace.monthlyBudget ?? 3000
  );
  const [notifyAt80, setNotifyAt80] = useState(workspace.notifyAt80 ?? true);
  const [notifyAt95, setNotifyAt95] = useState(workspace.notifyAt95 ?? true);
  const [notificationChannel, setNotificationChannel] = useState(
    workspace.notificationChannel ?? "both"
  );
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [testAlertToast, setTestAlertToast] = useState(null);

  const prefs = {
    showTopVendor: true,
    showTeamLeaderboard: true,
    showBudgetVsActual: true,
    showSpendByDay: false,
    ...(workspace?.dashboardPreferences || {})
  };

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const spendByDayMap = daysOfWeek.map((dayName, dayIdx) => {
    const dayExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getDay() === dayIdx;
    });
    const total = dayExpenses.reduce((s, e) => s + e.amount, 0);
    return {
      day: dayName,
      short: dayName.slice(0, 3),
      total,
      count: dayExpenses.length
    };
  });
  useEffect(() => {
    if (workspace.monthlyBudget !== undefined && workspace.monthlyBudget !== null) {
      setMonthlyBudgetInput(workspace.monthlyBudget);
    }
    setNotifyAt80(workspace.notifyAt80 ?? true);
    setNotifyAt95(workspace.notifyAt95 ?? true);
    setNotificationChannel(workspace.notificationChannel ?? "both");
  }, [workspace]);

  const totalWorkspaceSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate current month expenses
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentMonthStr));
  const currentMonthSpend =
    currentMonthExpenses.length > 0
      ? currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
      : totalWorkspaceSpend;

  const monthlyBudget =
    typeof monthlyBudgetInput === "number" ? monthlyBudgetInput : workspace.monthlyBudget ?? 0;
  const percentOfMonthlyBudget = monthlyBudget > 0 ? (currentMonthSpend / monthlyBudget) * 100 : 0;
  const remainingMonthlyBudget = monthlyBudget - currentMonthSpend;

  const isMonthlyOverBudget = monthlyBudget > 0 && currentMonthSpend >= monthlyBudget;
  const isMonthlyNearLimit =
    monthlyBudget > 0 && percentOfMonthlyBudget >= 80 && percentOfMonthlyBudget < 100;

  const handleSaveMonthlyBudget = () => {
    const val = monthlyBudgetInput === "" ? null : Number(monthlyBudgetInput);
    onUpdateWorkspace({
      ...workspace,
      monthlyBudget: val,
      notifyAt80,
      notifyAt95,
      notificationChannel
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleToggle80 = (checked) => {
    setNotifyAt80(checked);
    onUpdateWorkspace({
      ...workspace,
      notifyAt80: checked
    });
  };

  const handleToggle95 = (checked) => {
    setNotifyAt95(checked);
    onUpdateWorkspace({
      ...workspace,
      notifyAt95: checked
    });
  };

  const handleToggleChannel = (channel) => {
    setNotificationChannel(channel);
    onUpdateWorkspace({
      ...workspace,
      notificationChannel: channel
    });

    if ((channel === "browser" || channel === "both") && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  };

  const handleTestNotification = () => {
    const message = `[SnapSME Test Alert] Workspace spend reached ${Math.round(percentOfMonthlyBudget)}% of monthly budget ($${currentMonthSpend.toFixed(2)} / $${monthlyBudget.toFixed(2)}).`;
    setTestAlertToast(message);

    if (
      (notificationChannel === "browser" || notificationChannel === "both") &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("SnapSME Budget Notification", {
        body: message,
        icon: "/favicon.ico"
      });
    }

    setTimeout(() => setTestAlertToast(null), 4000);
  };

  // Spend totals by Category
  const categorySpendMap = categories.map((cat) => {
    const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
    const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = cat.budget || 0;
    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      category: cat,
      spent,
      budget,
      percentUsed,
      count: catExpenses.length
    };
  });

  // Spend totals by Staff Member
  const memberSpendMap = members.map((m) => {
    const mExpenses = expenses.filter((e) => e.submittedBy === m.userId);
    const spent = mExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      member: m,
      spent,
      count: mExpenses.length
    };
  });

  // Spend totals by Money Movement
  const mmTypes = [
    { id: "company_card", label: "Company Card" },
    { id: "personal_reimbursement", label: "Personal Reimbursement" },
    { id: "petty_cash", label: "Petty Cash" },
    { id: "supplier_payment", label: "Supplier Direct" }
  ];

  const mmSpendMap = mmTypes.map((mm) => {
    const mmExpenses = expenses.filter((e) => e.moneyMovement === mm.id);
    const spent = mmExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      ...mm,
      spent,
      count: mmExpenses.length
    };
  });

  // CSV Export Function per PRD FR19
  const handleExportCSV = () => {
    const headers = [
      "Expense ID",
      "Date",
      "Vendor",
      "Amount",
      "Currency",
      "Category",
      "Money Movement",
      "Submitted By",
      "Source",
      "Sync Status",
      "Notes"
    ];

    const rows = expenses.map((e) => [
      e.id,
      e.date,
      `"${e.vendor.replace(/"/g, '""')}"`,
      e.amount,
      e.currency,
      `"${e.categoryName.replace(/"/g, '""')}"`,
      e.moneyMovement,
      `"${e.submittedByName.replace(/"/g, '""')}"`,
      e.source,
      e.syncStatus,
      `"${(e.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `snapsme_expenses_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#000000]">Owner & Team Spend Dashboard</h2>
          <p className="text-xs text-[#615d59]">Real-time visibility into team expenses, category budgets, and money movement</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto bg-[#0075de] hover:bg-[#0060b8] text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Export CSV for Accountant</span>
        </button>
      </div>

      {/* Workspace Monthly Budget Overview Card */}
      {prefs.showBudgetVsActual && (
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-black/10 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-black/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#e6f3fe] border border-black/10 flex items-center justify-center text-[#0075de] shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#000000]">Workspace Monthly Budget</h3>
                <p className="text-xs text-[#615d59]">Set a global monthly ceiling to control team-wide spending</p>
              </div>
            </div>

            {/* Monthly Budget Input Form */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-44">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#6b665c]">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyBudgetInput}
                  onChange={(e) => setMonthlyBudgetInput(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Monthly Budget"
                  disabled={!isOwner}
                  className="w-full bg-[#f7f3ea] border border-[#d9d4c8] font-mono text-sm font-bold text-[#1c1b19] rounded-lg pl-7 pr-3 py-2.5 sm:py-2 focus:outline-none focus:border-[#0f7a52] disabled:opacity-60 min-h-[44px] sm:min-h-0"
                />
              </div>
              {isOwner && (
                <button
                  onClick={handleSaveMonthlyBudget}
                  className="w-full sm:w-auto bg-[#0f7a52] hover:bg-[#0b5f40] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95 shrink-0 min-h-[44px] sm:min-h-0"
                >
                  {isSavedNotice ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                  <span>{isSavedNotice ? "Saved!" : "Set Budget"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Visual Indicators */}
          {monthlyBudget > 0 ? (
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-[#1c1b19] text-sm">{getCurrencySymbol(currency)}{currentMonthSpend.toFixed(2)}</span>
                  <span className="text-[#6b665c]">spent of</span>
                  <span className="font-bold text-[#1c1b19] text-sm">{getCurrencySymbol(currency)}{monthlyBudget.toFixed(2)}</span>
                  <span className="text-[#6b665c] font-sans">({currency})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#1c1b19]">
                    {percentOfMonthlyBudget.toFixed(1)}% Used
                  </span>
                  {isMonthlyOverBudget ? (
                    <span className="bg-[#ff5a3c]/10 text-[#ff5a3c] border border-[#ff5a3c]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Budget Exceeded
                    </span>
                  ) : isMonthlyNearLimit ? (
                    <span className="bg-[#e0982a]/10 text-[#e0982a] border border-[#e0982a]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Near Limit
                    </span>
                  ) : (
                    <span className="bg-[#0f7a52]/10 text-[#0f7a52] border border-[#0f7a52]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> On Track
                    </span>
                  )}
                </div>
              </div>

            {/* Soft Warning Banner */}
            {isMonthlyOverBudget && (
              <div className="bg-[#fbf1de] border border-[#ff5a3c]/40 p-3 rounded-lg flex items-center gap-2 text-xs text-[#ff5a3c] font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Soft Alert:</strong> Total workspace expenses (${currentMonthSpend.toFixed(2)}) have exceeded the monthly budget (${monthlyBudget.toFixed(2)}) by ${(currentMonthSpend - monthlyBudget).toFixed(2)}.
                </span>
              </div>
            )}
            {isMonthlyNearLimit && (
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg flex items-center gap-2 text-xs text-[#e0982a] font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Warning:</strong> Total workspace spend is at {Math.round(percentOfMonthlyBudget)}% of the monthly budget limit. ${remainingMonthlyBudget.toFixed(2)} remaining.
                </span>
              </div>
            )}

            {/* Notification Settings Toggle Block */}
            <div className="pt-3 border-t border-[#d9d4c8]/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-[#0f7a52]" />
                  <span className="font-display font-semibold text-xs text-[#1c1b19]">
                    Budget Threshold Alert Notifications
                  </span>
                </div>

                {/* Channel selection pill */}
                <div className="flex items-center gap-1 bg-[#f7f3ea] p-1 rounded-lg border border-[#d9d4c8] text-[11px]">
                  <span className="text-[#6b665c] font-medium px-1">Channel:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("email")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      notificationChannel === "email"
                        ? "bg-[#0f7a52] text-white shadow-xs"
                        : "text-[#6b665c] hover:text-[#1c1b19]"
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("browser")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      notificationChannel === "browser"
                        ? "bg-[#0f7a52] text-white shadow-xs"
                        : "text-[#6b665c] hover:text-[#1c1b19]"
                    }`}
                  >
                    Browser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("both")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      notificationChannel === "both"
                        ? "bg-[#0f7a52] text-white shadow-xs"
                        : "text-[#6b665c] hover:text-[#1c1b19]"
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 80% Threshold Toggle */}
                <label
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    notifyAt80
                      ? "bg-[#e7f4ec]/60 border-[#0f7a52]/40"
                      : "bg-[#f7f3ea]/50 border-[#d9d4c8] opacity-75"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#1c1b19]">
                      <span>80% Budget Threshold Alert</span>
                      <span className="text-[10px] font-mono font-bold text-[#0f7a52] bg-white px-1.5 py-0.5 rounded border border-[#0f7a52]/20">
                        ${(monthlyBudget * 0.8).toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b665c]">
                      Notify owner & team when monthly spend reaches 80% of budget limit
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAt80}
                    disabled={!isOwner}
                    onChange={(e) => handleToggle80(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-[#0f7a52] focus:ring-[#0f7a52] border-[#d9d4c8] cursor-pointer"
                  />
                </label>

                {/* 95% Threshold Toggle */}
                <label
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    notifyAt95
                      ? "bg-[#fbf1de]/70 border-[#e0982a]/50"
                      : "bg-[#f7f3ea]/50 border-[#d9d4c8] opacity-75"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#1c1b19]">
                      <span>95% Critical Budget Alert</span>
                      <span className="text-[10px] font-mono font-bold text-[#e0982a] bg-white px-1.5 py-0.5 rounded border border-[#e0982a]/20">
                        ${(monthlyBudget * 0.95).toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b665c]">
                      Notify urgent warning when monthly spend reaches 95% threshold
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAt95}
                    disabled={!isOwner}
                    onChange={(e) => handleToggle95(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-[#0f7a52] focus:ring-[#0f7a52] border-[#d9d4c8] cursor-pointer"
                  />
                </label>
              </div>

              {/* Active Threshold Trigger Notification Badge */}
              {percentOfMonthlyBudget >= 80 && (
                <div className="bg-[#e7f4ec] border border-[#0f7a52]/30 p-3 rounded-xl flex items-center justify-between text-xs text-[#1c1b19]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#0f7a52] shrink-0" />
                    <div>
                      <span className="font-bold text-[#0f7a52]">
                        {percentOfMonthlyBudget >= 95 ? "95% Alert Active" : "80% Alert Active"}
                      </span>
                      <span className="text-[#6b665c] text-[11px] block">
                        {(percentOfMonthlyBudget >= 95 ? notifyAt95 : notifyAt80)
                          ? `Notifications enabled via ${notificationChannel} channel.`
                          : "Notifications currently disabled for this threshold."}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="text-[11px] font-semibold text-[#0f7a52] hover:underline bg-white px-2.5 py-1 rounded-md border border-[#0f7a52]/30 cursor-pointer shrink-0"
                  >
                    Test Alert
                  </button>
                </div>
              )}

              {/* Toast confirmation for testing notifications */}
              {testAlertToast && (
                <div className="bg-[#1c1b19] text-white p-2.5 rounded-lg text-xs flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                    {testAlertToast}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-sans">Sent</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#f7f3ea] rounded-lg border border-dashed border-[#d9d4c8] text-center text-xs text-[#6b665c]">
            No overall workspace monthly budget set. Enter a budget above to enable monthly budget tracking and progress alerts.
          </div>
        )}
      </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#d9d4c8]">
          <div className="flex items-center justify-between text-[#6b665c] mb-1">
            <span className="text-xs font-medium">Total Workspace Spend</span>
            <Wallet className="w-4 h-4 text-[#0f7a52]" />
          </div>
          <p className="font-mono text-2xl font-bold text-[#1c1b19]">
            ${totalWorkspaceSpend.toFixed(2)} <span className="text-xs text-[#6b665c] font-normal">{currency}</span>
          </p>
          <p className="text-[11px] text-[#0f7a52] mt-1 font-medium">{expenses.length} total logged transactions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#d9d4c8]">
          <div className="flex items-center justify-between text-[#6b665c] mb-1">
            <span className="text-xs font-medium">Active Submitters</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-mono text-2xl font-bold text-[#1c1b19]">{members.length} Members</p>
          <p className="text-[11px] text-[#6b665c] mt-1 font-medium">1 Owner, {members.length - 1} Staff members</p>
        </div>

        {prefs.showTopVendor && (
          <div className="bg-white p-4 rounded-xl border border-[#d9d4c8]">
            <div className="flex items-center justify-between text-[#6b665c] mb-1">
              <span className="text-xs font-medium">Top Spend Category</span>
              <TrendingUp className="w-4 h-4 text-[#ff5a3c]" />
            </div>
            {(() => {
              const sorted = [...categorySpendMap].sort((a, b) => b.spent - a.spent);
              const top = sorted[0];
              return (
                <>
                  <p className="font-display font-bold text-lg text-[#1c1b19] truncate">{top?.category.name || "N/A"}</p>
                  <p className="font-mono text-xs text-[#ff5a3c] font-bold mt-1">${top?.spent.toFixed(2) || "0.00"}</p>
                </>
              );
            })()}
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-[#d9d4c8]">
          <div className="flex items-center justify-between text-[#6b665c] mb-1">
            <span className="text-xs font-medium">Reimbursements Due</span>
            <CreditCard className="w-4 h-4 text-[#e0982a]" />
          </div>
          {(() => {
            const reim = expenses
              .filter((e) => e.moneyMovement === "personal_reimbursement")
              .reduce((s, e) => s + e.amount, 0);
            return (
              <>
                <p className="font-mono text-2xl font-bold text-[#e0982a]">${reim.toFixed(2)}</p>
                <p className="text-[11px] text-[#6b665c] mt-1 font-medium">Personal funds spent by staff</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Category Budgets & Soft Alert System per PRD FR17, FR18 */}
      <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] space-y-4">
        <div className="flex items-center justify-between border-b border-[#d9d4c8] pb-3">
          <h3 className="font-display font-bold text-base text-[#1c1b19] flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#0f7a52]" /> Category Budgets & Soft Alerts
          </h3>
          <span className="text-xs text-[#6b665c]">Owner-configured category limits</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorySpendMap.map((item) => {
            const isNearLimit = item.percentUsed >= 80 && item.percentUsed < 100;
            const isExceeded = item.percentUsed >= 100;

            return (
              <div
                key={item.category.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isExceeded
                    ? "bg-[#fbf1de] border-[#e0982a]"
                    : isNearLimit
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-[#f7f3ea]/50 border-[#d9d4c8]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display font-semibold text-xs text-[#1c1b19]">
                    {item.category.name}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1c1b19]">
                    ${item.spent.toFixed(2)}{" "}
                    <span className="text-[#6b665c] font-normal">
                      / {item.budget ? `$${item.budget}` : "No Limit"}
                    </span>
                  </span>
                </div>

                {/* Progress Bar */}
                {item.budget > 0 && (
                  <div className="w-full h-2 bg-[#d9d4c8]/50 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded ? "bg-[#ff5a3c]" : isNearLimit ? "bg-[#e0982a]" : "bg-[#0f7a52]"
                      }`}
                      style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                    />
                  </div>
                )}

                {/* Soft Alert Banner */}
                {isExceeded && (
                  <p className="text-[11px] text-[#ff5a3c] font-semibold flex items-center gap-1 mt-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Soft Alert: Category budget exceeded by ${(item.spent - item.budget).toFixed(2)}
                  </p>
                )}
                {isNearLimit && (
                  <p className="text-[11px] text-[#e0982a] font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Soft Alert: Approaching limit ({Math.round(item.percentUsed)}% used)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spend Breakdown by Staff & Money Movement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spend by Team Member (Leaderboard) */}
        {prefs.showTeamLeaderboard && (
          <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] space-y-3">
            <h3 className="font-display font-bold text-sm text-[#1c1b19] uppercase tracking-wider">
              Spend by Team Member
            </h3>
            <div className="space-y-2.5">
              {memberSpendMap.map((m) => (
                <div key={m.member.userId} className="flex items-center justify-between text-xs p-2.5 bg-[#f7f3ea] rounded-lg">
                  <div>
                    <p className="font-semibold text-[#1c1b19]">{m.member.displayName}</p>
                    <span className="text-[10px] text-[#6b665c] font-mono">{m.count} submissions</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#1c1b19]">
                    ${m.spent.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spend by Money Movement Type */}
        <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] space-y-3">
          <h3 className="font-display font-bold text-sm text-[#1c1b19] uppercase tracking-wider">
            Spend by Money Movement
          </h3>
          <div className="space-y-2.5">
            {mmSpendMap.map((mm) => (
              <div key={mm.id} className="flex items-center justify-between text-xs p-2.5 bg-[#f7f3ea] rounded-lg">
                <div>
                  <p className="font-semibold text-[#1c1b19]">{mm.label}</p>
                  <span className="text-[10px] text-[#6b665c] font-mono">{mm.count} transactions</span>
                </div>
                <span className="font-mono text-sm font-bold text-[#1c1b19]">
                  ${mm.spent.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spend by Day of Week Card (Optional) */}
      {prefs.showSpendByDay && (
        <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] space-y-3">
          <h3 className="font-display font-bold text-sm text-[#1c1b19] uppercase tracking-wider">
            Spend Breakdown by Day of Week
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1 text-center">
            {spendByDayMap.map((d) => (
              <div key={d.day} className="bg-[#f7f3ea] p-3 rounded-xl border border-[#d9d4c8] space-y-1">
                <span className="text-[11px] font-bold text-[#6b665c] uppercase tracking-wider block">{d.short}</span>
                <span className="font-mono text-sm font-bold text-[#1c1b19] block">${d.total.toFixed(2)}</span>
                <span className="text-[10px] text-[#6b665c] font-mono block">{d.count} txns</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
