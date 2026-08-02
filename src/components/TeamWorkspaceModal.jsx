import React, { useState } from "react";
import { WORLD_CURRENCIES, getCurrencyLabel } from "../lib/currencies.js";
import {
  Users,
  Building2,
  Plus,
  Trash2,
  Shield,
  UserCheck,
  Mail,
  Phone,
  Check,
  Award,
  TrendingUp,
  Receipt,
  Crown
} from "lucide-react";

export const TeamWorkspaceModal = ({
  workspace,
  members,
  categories,
  expenses,
  currentUser,
  onUpdateWorkspace,
  onAddMember,
  onRemoveMember,
  onUpdateCategories
}) => {
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceCurrency, setWorkspaceCurrency] = useState(workspace.currency);
  const [isSavedWorkspace, setIsSavedWorkspace] = useState(false);

  // New member form
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("staff");

  // Leaderboard filter
  const [leaderboardFilter, setLeaderboardFilter] = useState("month");

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");

  const isOwner = currentUser?.role === "owner";

  // Calculate leaderboard statistics for team members
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const memberStats = members.map((m) => {
    const memberExpenses = expenses.filter((e) => e.submittedBy === m.userId);

    const monthExpenses = memberExpenses.filter((e) => e.date.startsWith(currentMonthStr));

    const totalSpendAllTime = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSpendMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const countAllTime = memberExpenses.length;
    const countMonth = monthExpenses.length;

    return {
      member: m,
      totalSpend: leaderboardFilter === "month" ? totalSpendMonth : totalSpendAllTime,
      count: leaderboardFilter === "month" ? countMonth : countAllTime,
      totalSpendAllTime,
      countAllTime
    };
  });

  // Sort leaderboard descending by spend
  const sortedLeaderboard = [...memberStats].sort((a, b) => b.totalSpend - a.totalSpend);

  const handleSaveWorkspace = (e) => {
    e.preventDefault();
    onUpdateWorkspace({
      ...workspace,
      name: workspaceName,
      currency: workspaceCurrency
    });
    setIsSavedWorkspace(true);
    setTimeout(() => setIsSavedWorkspace(false), 2000);
  };

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newM = {
      userId: `usr_staff_${Date.now()}`,
      businessId: workspace.id,
      role: newMemberRole,
      displayName: newMemberName.trim(),
      email: newMemberEmail.trim() || undefined,
      phone: newMemberPhone.trim() || undefined,
      joinedAt: new Date().toISOString(),
      avatarColor: ["#0f7a52", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"][Math.floor(Math.random() * 5)]
    };

    onAddMember(newM);
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberPhone("");
  };

  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat = {
      id: `cat_${Date.now()}`,
      businessId: workspace.id,
      name: newCatName.trim(),
      budget: newCatBudget ? parseFloat(newCatBudget) : 0,
      createdAt: new Date().toISOString()
    };

    onUpdateCategories([...categories, newCat]);
    setNewCatName("");
    setNewCatBudget("");
  };

  const handleRemoveCategory = (id) => {
    onUpdateCategories(categories.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Leaderboard Section */}
      <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d9d4c8] pb-3">
          <div>
            <h2 className="font-display font-bold text-lg text-[#1c1b19] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#ff5a3c]" /> Team Expense Leaderboard & Spend Summary
            </h2>
            <p className="text-xs text-[#6b665c]">
              See who has submitted the most expenses and total spend ranking across the workspace
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#f7f3ea] p-1 rounded-lg border border-[#d9d4c8] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLeaderboardFilter("month")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                leaderboardFilter === "month"
                  ? "bg-[#0f7a52] text-white shadow-2xs"
                  : "text-[#6b665c] hover:text-[#1c1b19]"
              }`}
            >
              This Month ({currentMonthStr})
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardFilter("all")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                leaderboardFilter === "all"
                  ? "bg-[#0f7a52] text-white shadow-2xs"
                  : "text-[#6b665c] hover:text-[#1c1b19]"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedLeaderboard.map((item, idx) => {
            const isFirst = idx === 0 && item.totalSpend > 0;
            return (
              <div
                key={item.member.userId}
                className={`p-4 rounded-xl border relative transition-all ${
                  isFirst
                    ? "bg-[#fbf1de]/60 border-[#e0982a] shadow-xs"
                    : "bg-[#f7f3ea]/40 border-[#d9d4c8]"
                }`}
              >
                {/* Crown / Rank Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isFirst
                        ? "bg-[#e0982a] text-white border-[#e0982a]"
                        : "bg-white text-[#6b665c] border-[#d9d4c8]"
                    }`}
                  >
                    #{idx + 1} Submitter
                  </span>

                  {isFirst && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#e0982a]">
                      <Crown className="w-4 h-4 fill-amber-400 text-amber-600" /> Top Spender
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.member.avatarColor || "#0f7a52" }}
                  >
                    {item.member.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-display font-bold text-sm text-[#1c1b19] truncate">
                      {item.member.displayName}
                    </p>
                    <p className="text-[11px] text-[#6b665c] capitalize">
                      {item.member.role === "owner" ? "Business Owner" : "Staff Member"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#d9d4c8]/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6b665c]">
                      {leaderboardFilter === "month" ? "Month Spend:" : "All-time Spend:"}
                    </span>
                    <span className="font-mono font-bold text-[#1c1b19]">
                      ${item.totalSpend.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#6b665c]">Submissions:</span>
                    <span className="font-mono font-semibold text-[#0f7a52]">
                      {item.count} expenses
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Settings Header */}
      <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#d9d4c8] pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0f7a52]" />
            <h3 className="font-display font-bold text-base text-[#1c1b19]">
              Workspace Configuration
            </h3>
          </div>
          <span className="text-xs text-[#6b665c] font-mono">
            ID: {workspace.id}
          </span>
        </div>

        <form onSubmit={handleSaveWorkspace} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-[#1c1b19] block mb-1">
              Business Workspace Name
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-[#f7f3ea] border border-[#d9d4c8] font-medium rounded-lg px-3 py-2 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="font-semibold text-[#1c1b19] block mb-1">
              Primary Currency
            </label>
            <select
              disabled={!isOwner}
              value={workspaceCurrency}
              onChange={(e) => setWorkspaceCurrency(e.target.value)}
              className="w-full bg-[#f7f3ea] border border-[#d9d4c8] font-mono font-bold rounded-lg px-3 py-2 focus:outline-none disabled:opacity-60 cursor-pointer"
            >
              {WORLD_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {getCurrencyLabel(c)}
                </option>
              ))}
            </select>
          </div>

          {isOwner && (
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {isSavedWorkspace ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                <span>{isSavedWorkspace ? "Saved!" : "Update Workspace Settings"}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Members List & Add Form */}
        <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#d9d4c8] pb-3">
            <h3 className="font-display font-bold text-base text-[#1c1b19] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0f7a52]" /> Active Team Members ({members.length})
            </h3>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between p-2.5 bg-[#f7f3ea] rounded-xl text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg text-white font-mono font-bold text-[10px] flex items-center justify-center"
                    style={{ backgroundColor: m.avatarColor || "#0f7a52" }}
                  >
                    {m.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1b19]">{m.displayName}</p>
                    <p className="text-[10px] text-[#6b665c] font-mono">
                      {m.role === "owner" ? "Owner / Admin" : "Staff Submitter"}
                    </p>
                  </div>
                </div>

                {isOwner && m.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(m.userId)}
                    className="text-rose-600 hover:text-rose-800 p-1 rounded-md cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Staff Member */}
          {isOwner && (
            <form onSubmit={handleAddMemberSubmit} className="pt-3 border-t border-[#d9d4c8] space-y-2 text-xs">
              <p className="font-semibold text-[#1c1b19]">Add New Staff Member:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Full Name *"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-2.5 py-1.5 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-2 py-1.5 focus:outline-none text-xs font-semibold cursor-pointer"
                >
                  <option value="staff">Staff Submitter</option>
                  <option value="owner">Co-Owner / Admin</option>
                </select>

                <button
                  type="submit"
                  className="flex-1 bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-semibold text-xs rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Member
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Categories Manager */}
        <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#d9d4c8] pb-3">
            <h3 className="font-display font-bold text-base text-[#1c1b19]">
              Expense Categories & Monthly Budgets
            </h3>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 bg-[#f7f3ea] rounded-xl text-xs"
              >
                <span className="font-semibold text-[#1c1b19]">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#0f7a52] font-bold">
                    {c.budget ? `$${c.budget}/mo` : "No limit"}
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(c.id)}
                      className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Category Form */}
          {isOwner && (
            <form onSubmit={handleAddCategorySubmit} className="pt-3 border-t border-[#d9d4c8] space-y-2 text-xs">
              <p className="font-semibold text-[#1c1b19]">Add Custom Category:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Category Name *"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-2.5 py-1.5 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Budget ($)"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className="w-24 bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg px-2.5 py-1.5 font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-semibold text-xs rounded-lg px-3 py-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
