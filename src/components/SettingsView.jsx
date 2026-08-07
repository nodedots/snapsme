import React, { useState, useEffect } from "react";
import { TornCard } from "./TornCard.jsx";
import { loadActivityLogs } from "../lib/storage.js";
import { WORLD_CURRENCIES, getCurrencySymbol, getCurrencyLabel } from "../lib/currencies.js";
import { applyBrandAccentColor, readLogoFile, DEFAULT_BRAND_ACCENT } from "../lib/brand.js";
import {
  getProfile,
  updateProfile,
  generateChatLink,
  unlinkChatChannel,
  signOutUser
} from "../lib/settings.js";
import {
  isOwner,
  updateWorkspace,
  inviteMember,
  updateMemberInvite,
  removeMember,
  addCategory,
  updateCategory,
  deleteCategory
} from "../lib/workspace.js";
import {
  User,
  Building2,
  Lock,
  ShieldCheck,
  QrCode,
  MessageSquare,
  Copy,
  Check,
  Trash2,
  UserPlus,
  Plus,
  Save,
  Clock,
  LogOut,
  Sparkles,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  History,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Activity,
  Tag,
  Palette,
  Upload,
  Image as ImageIcon,
  Layout,
  LayoutDashboard,
  Key,
  Zap,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { unlinkChatChannelFirestore, saveApiKeyFirestore, regenerateApiKeyFirestore } from "../lib/firestore.js";

export const SettingsView = ({
  currentUser,
  setCurrentUser,
  workspace,
  onUpdateWorkspace,
  members,
  setMembers,
  categories,
  setCategories,
  onBackToDashboard
}) => {
  const userIsOwner = isOwner(currentUser);

  // Collapsible sections state — keys match section IDs, true = collapsed
  const [collapsedSections, setCollapsedSections] = useState({
    profile: false,         // open by default
    aiUsage: true,
    chatBots: true,
    workspace: true,
    categories: true,
    brand: true,
    dashPrefs: true,
    team: false,            // open by default
    inboundApi: true,
    activityLog: true
  });

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Profile Form state
  const [profileName, setProfileName] = useState(currentUser?.displayName || "");
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || "");
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || "");
  const [profileToast, setProfileToast] = useState("");

  // Brand Basics state
  const [brandLogoUrl, setBrandLogoUrl] = useState(workspace?.brand?.logoUrl || null);
  const [brandAccentColor, setBrandAccentColor] = useState(workspace?.brand?.accentColor || DEFAULT_BRAND_ACCENT);
  const [brandToast, setBrandToast] = useState("");

  // Dashboard Preferences state
  const [dashboardPrefs, setDashboardPrefs] = useState({
    showTopVendor: true,
    showTeamLeaderboard: true,
    showBudgetVsActual: true,
    showSpendByDay: false,
    showNetCashFigure: true,
    ...(workspace?.dashboardPreferences || {})
  });
  const [dashPrefsToast, setDashPrefsToast] = useState("");

  // Sync state on workspace changes
  useEffect(() => {
    if (workspace) {
      if (workspace.brand) {
        setBrandLogoUrl(workspace.brand.logoUrl || null);
        setBrandAccentColor(workspace.brand.accentColor || DEFAULT_BRAND_ACCENT);
        applyBrandAccentColor(workspace.brand.accentColor || DEFAULT_BRAND_ACCENT);
      }
      if (workspace.dashboardPreferences) {
        setDashboardPrefs({
          showTopVendor: true,
          showTeamLeaderboard: true,
          showBudgetVsActual: true,
          showSpendByDay: false,
          showNetCashFigure: true,
          ...workspace.dashboardPreferences
        });
      }
    }
  }, [workspace]);

  // Sync profile state on currentUser change
  useEffect(() => {
    setProfileName(currentUser?.displayName || "");
    setProfileEmail(currentUser?.email || "");
    setProfilePhone(currentUser?.phone || "");
  }, [currentUser]);

  // Chat Link Generation state
  const [chatLink, setChatLink] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null); // 'telegram' or 'whatsapp'
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(86400); // 24 hours in seconds

  // Workspace Form state
  const [wsName, setWsName] = useState(workspace.name || "");
  const [wsCurrency, setWsCurrency] = useState(workspace.currency || "USD");
  const [wsToast, setWsToast] = useState("");

  // Invite Member state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Edit Missing Email state
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState("");

  // Category Add/Edit state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catName, setCatName] = useState("");
  const [catBudget, setCatBudget] = useState("");
  const [catError, setCatError] = useState("");

  // API Key state
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyToast, setApiKeyToast] = useState("");
  const [showRegenWarning, setShowRegenWarning] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Activity Log state
  const [activityLogs, setActivityLogs] = useState(() => loadActivityLogs());
  const [logSearch, setLogSearch] = useState("");
  const [logTagFilter, setLogTagFilter] = useState("all");
  const [logActorFilter, setLogActorFilter] = useState("all");

  const refreshLogs = () => {
    setActivityLogs(loadActivityLogs());
  };

  // Filter activity logs
  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      !logSearch ||
      log.description.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.actorName.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.tag && log.tag.toLowerCase().includes(logSearch.toLowerCase()));

    const matchesTag = logTagFilter === "all" || log.tag === logTagFilter;
    const matchesActor = logActorFilter === "all" || log.actorId === logActorFilter;

    return matchesSearch && matchesTag && matchesActor;
  });

  // Unique tags for filter dropdown
  const uniqueTags = Array.from(new Set(activityLogs.map((l) => l.tag).filter(Boolean)));

  // Export Activity Logs as CSV
  const handleExportActivityCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Log ID", "Timestamp", "Actor Name", "Actor Role", "Event Tag", "Description"];
    const escapeCsv = (str) => `"${String(str || "").replace(/"/g, '""')}"`;

    const rows = filteredLogs.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.timestamp),
      escapeCsv(l.actorName),
      escapeCsv(l.actorRole),
      escapeCsv(l.tag),
      escapeCsv(l.description)
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `snapsme_audit_activity_log_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Countdown timer for chat link token
  useEffect(() => {
    if (!chatLink) return;
    const interval = setInterval(() => {
      const expiresAt = new Date(chatLink.expiresAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [chatLink]);

  const formatTimeLeft = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Handle Brand Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await readLogoFile(file);
      setBrandLogoUrl(url);
      const updatedWs = {
        ...workspace,
        brand: {
          logoUrl: url,
          accentColor: brandAccentColor
        }
      };
      onUpdateWorkspace(updatedWs);
      applyBrandAccentColor(brandAccentColor);
      setBrandToast("Brand logo updated!");
      setTimeout(() => setBrandToast(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to upload logo.");
    }
  };

  // Handle Remove Brand Logo
  const handleRemoveLogo = () => {
    setBrandLogoUrl(null);
    const updatedWs = {
      ...workspace,
      brand: {
        logoUrl: null,
        accentColor: brandAccentColor
      }
    };
    onUpdateWorkspace(updatedWs);
    setBrandToast("Logo removed");
    setTimeout(() => setBrandToast(""), 3000);
  };

  // Handle Accent Color Change
  const handleAccentColorChange = (e) => {
    const color = e.target.value;
    setBrandAccentColor(color);
    applyBrandAccentColor(color);
    const updatedWs = {
      ...workspace,
      brand: {
        logoUrl: brandLogoUrl,
        accentColor: color
      }
    };
    onUpdateWorkspace(updatedWs);
    setBrandToast("Accent color saved!");
    setTimeout(() => setBrandToast(""), 2000);
  };

  // Handle Toggle Dashboard Preferences
  const handleToggleDashPref = (key) => {
    const updated = {
      ...dashboardPrefs,
      [key]: !dashboardPrefs[key]
    };
    setDashboardPrefs(updated);
    const updatedWs = {
      ...workspace,
      dashboardPreferences: updated
    };
    onUpdateWorkspace(updatedWs);
    setDashPrefsToast("Preferences saved!");
    setTimeout(() => setDashPrefsToast(""), 2000);
  };

  // Handle Profile Update
  const handleSaveProfile = (e) => {
    e.preventDefault();
    try {
      const updated = updateProfile(
        currentUser.userId,
        { displayName: profileName, email: profileEmail, phone: profilePhone },
        members,
        setMembers,
        setCurrentUser
      );
      setProfileToast("Profile updated successfully!");
      refreshLogs();
      setTimeout(() => setProfileToast(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to update profile");
    }
  };

  // Handle Chat Link Code Generation
  const handleGenerateLink = (channel) => {
    try {
      const link = generateChatLink(currentUser.userId, channel);
      setChatLink(link);
      setActiveChannel(channel);
      setCopiedCode(false);
      refreshLogs();
    } catch (err) {
      alert(err.message || "Failed to generate link code");
    }
  };

  // Copy Link Code to Clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Handle Unlink Channel
  const handleUnlinkChannel = async (channel) => {
    if (confirm(`Are you sure you want to disconnect your ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'} account?`)) {
      const chatUserId = channel === "telegram" ? currentUser.telegramUserId : currentUser.whatsappUserId;
      unlinkChatChannel(currentUser.userId, channel, members, setMembers, setCurrentUser);
      if (activeChannel === channel) {
        setChatLink(null);
        setActiveChannel(null);
      }
      if (workspace && workspace.businessId) {
        try {
          await unlinkChatChannelFirestore(workspace.businessId, currentUser.userId, channel, chatUserId);
        } catch (err) {
          console.warn("Firestore unlink chat channel failed:", err.message);
        }
      }
      refreshLogs();
    }
  };

  // Handle Workspace Update (Owner Only)
  const handleSaveWorkspace = (e) => {
    e.preventDefault();
    try {
      const updated = updateWorkspace(
        workspace,
        { name: wsName, currency: wsCurrency },
        currentUser,
        onUpdateWorkspace
      );
      setWsToast("Workspace settings saved!");
      refreshLogs();
      setTimeout(() => setWsToast(""), 3000);
    } catch (err) {
      alert(err.message || "Owner privileges required.");
    }
  };

  // Handle Invite Member (Owner Only)
  const handleSendInvite = (e) => {
    e.preventDefault();
    setInviteError("");
    try {
      inviteMember(
        members,
        { email: inviteEmail, phone: invitePhone, displayName: inviteName },
        currentUser,
        setMembers
      );
      setShowInviteModal(false);
      setInviteEmail("");
      setInvitePhone("");
      setInviteName("");
      refreshLogs();
    } catch (err) {
      setInviteError(err.message || "Failed to send invitation.");
    }
  };

  // Handle Update Pending Invite Email (Owner Only)
  const handleSaveInviteEmail = (e) => {
    e.preventDefault();
    setEditError("");
    try {
      updateMemberInvite(
        members,
        editingMemberId,
        { email: editEmail },
        currentUser,
        setMembers
      );
      setEditingMemberId(null);
      setEditEmail("");
      refreshLogs();
    } catch (err) {
      setEditError(err.message || "Failed to update invitation email.");
    }
  };
  const handleRemoveMember = (targetUserId) => {
    if (confirm("Are you sure you want to remove this staff member from the workspace?")) {
      try {
        const updated = removeMember(members, targetUserId, currentUser, setMembers);
        refreshLogs();
      } catch (err) {
        alert(err.message || "Owner privileges required.");
      }
    }
  };

  // Handle Add/Edit Category (Owner Only)
  const handleOpenCatModal = (cat = null) => {
    setCatError("");
    if (cat) {
      setEditingCatId(cat.id);
      setCatName(cat.name);
      setCatBudget(cat.budget !== null ? cat.budget.toString() : "");
    } else {
      setEditingCatId(null);
      setCatName("");
      setCatBudget("");
    }
    setShowCatModal(true);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    setCatError("");
    try {
      if (editingCatId) {
        updateCategory(categories, editingCatId, { name: catName, budget: catBudget }, currentUser, setCategories);
      } else {
        addCategory(categories, { name: catName, budget: catBudget }, currentUser, setCategories);
      }
      setShowCatModal(false);
      refreshLogs();
    } catch (err) {
      setCatError(err.message || "Owner privileges required.");
    }
  };

  const handleDeleteCategory = (catId) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        deleteCategory(categories, catId, currentUser, setCategories);
        refreshLogs();
      } catch (err) {
        alert(err.message || "Owner privileges required.");
      }
    }
  };

  const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "CA$",
    AUD: "AU$",
    SGD: "SG$",
    JPY: "¥",
    CHF: "Fr"
  };

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#d9d4c8] rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0f7a52] bg-[#e7f4ec] px-2.5 py-0.5 rounded-full">
              Account & Workspace
            </span>
            {userIsOwner ? (
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0f7a52] bg-[#0f7a52]/10 border border-[#0f7a52]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Owner Role
              </span>
            ) : (
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1c1b19] bg-[#1c1b19]/10 border border-[#1c1b19]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <User className="w-3 h-3" /> Staff Role
              </span>
            )}
          </div>
          <h1 className="font-display font-bold text-2xl text-[#1c1b19] mt-1">
            Settings & User Control
          </h1>
          <p className="text-xs text-[#6b665c] mt-0.5">
            Manage your personal profile, messaging bot connections, workspace details, and team permissions.
          </p>
        </div>

        {/* User Switcher / Reset / Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0f7a52] hover:text-[#0b5f40] bg-[#e7f4ec] hover:bg-[#d5efe0] border border-[#0f7a52]/30 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="Return to the main dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all workspace data and start fresh with a clean slate?")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title="Wipe all local data and start fresh"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset & Start Fresh</span>
          </button>

          <button
            type="button"
            onClick={() => signOutUser(setCurrentUser)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6b665c] hover:text-[#ff5a3c] bg-[#f7f3ea] hover:bg-red-50 border border-[#d9d4c8] px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Grid Layout for Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: User Profile & Identity */}
        <TornCard headerColor="bg-[#0f7a52]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 cursor-pointer select-none" onClick={() => toggleSection('profile')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0f7a52]/10 text-[#0f7a52] flex items-center justify-center font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  My Profile & Identity
                </h2>
                <p className="text-[11px] text-[#6b665c]">Personal credentials and notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profileToast && (
                <span className="text-xs font-mono text-[#0f7a52] bg-[#e7f4ec] px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 animate-fade-in shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {profileToast}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-[#6b665c] transition-transform duration-200 shrink-0 ${collapsedSections.profile ? '-rotate-90' : ''}`} />
            </div>
          </div>

          {!collapsedSections.profile && <form onSubmit={handleSaveProfile} className="space-y-3 mt-4">
            <div>
              <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors min-h-[44px] sm:min-h-0"
                placeholder="e.g. Alex Rivera"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors min-h-[44px] sm:min-h-0"
                  placeholder="alex@acme.com"
                />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors min-h-[44px] sm:min-h-0"
                  placeholder="+1 555-019-2834"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-[11px] text-[#6b665c] font-mono truncate">
                User ID: <span className="font-semibold text-[#1c1b19]">{currentUser?.userId || "Unassigned"}</span>
              </span>
              <button
                type="submit"
                className="w-full sm:w-auto bg-[#0f7a52] hover:bg-[#0b5e3f] text-white font-display font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>}
        </TornCard>

        {/* CARD: AI Feature Usage & Limits */}
        <TornCard headerColor="bg-[#0075de]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 cursor-pointer select-none" onClick={() => toggleSection('aiUsage')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0075de]/10 text-[#0075de] flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  AI Feature Usage & Limits
                </h2>
                <p className="text-[11px] text-[#6b665c]">Monthly allocation for AI receipt & voice capture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-[#0075de] bg-[#0075de]/10 px-2.5 py-1 rounded-md">
                Fair-Use Plan
              </span>
              <ChevronDown className={`w-4 h-4 text-[#6b665c] transition-transform duration-200 shrink-0 ${collapsedSections.aiUsage ? '-rotate-90' : ''}`} />
            </div>
          </div>

          {!collapsedSections.aiUsage && <div className="space-y-4 mt-4">
            <div className="bg-[#f7f3ea]/60 border border-[#d9d4c8] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-[#1c1b19]">
                  {workspace?.aiCaptureUsage?.count || 0} of 150 AI scans used this month
                </span>
                <span className="text-xs font-mono font-semibold text-[#6b665c]">
                  {Math.round(((workspace?.aiCaptureUsage?.count || 0) / 150) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#e8e4da] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0075de] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((workspace?.aiCaptureUsage?.count || 0) / 150) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-[#6b665c] mt-2.5 leading-relaxed">
                AI photo scanning and voice capture reset automatically on the 1st of every calendar month. Manual entry of expenses and income is always 100% free and unlimited.
              </p>
            </div>
          </div>}
        </TornCard>

        {/* CARD 2: Chat Bot Integrations (Telegram & WhatsApp) */}
        <TornCard headerColor="bg-[#ff5a3c]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff5a3c]/10 text-[#ff5a3c] flex items-center justify-center font-bold shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  Chat Bot Integrations
                </h2>
                <p className="text-[11px] text-[#6b665c]">Link Telegram or WhatsApp to snap expenses on the go</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Telegram Channel Status */}
            <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center font-bold text-xs shrink-0">
                  TG
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display font-bold text-xs text-[#1c1b19]">Telegram Bot</span>
                    {currentUser?.telegramUserId ? (
                      <span className="text-[10px] font-mono font-bold bg-[#e7f4ec] text-[#0f7a52] px-2 py-0.2 rounded-full">
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-gray-200 text-[#6b665c] px-2 py-0.2 rounded-full">
                        Not Linked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6b665c]">
                    {currentUser?.telegramUserId ? `@${currentUser.telegramUserId}` : "Snap photos & audio directly to @snapsme_bot"}
                  </p>
                </div>
              </div>

              {currentUser?.telegramUserId ? (
                <button
                  type="button"
                  onClick={() => handleUnlinkChannel("telegram")}
                  className="w-full sm:w-auto text-xs font-semibold text-red-600 hover:text-red-800 bg-white border border-red-200 px-3 py-2 rounded-lg cursor-pointer text-center min-h-[40px] sm:min-h-0"
                >
                  Unlink
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerateLink("telegram")}
                  className="w-full sm:w-auto text-xs font-semibold text-[#0088cc] bg-white border border-[#0088cc]/30 hover:border-[#0088cc] px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 min-h-[40px] sm:min-h-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              )}
            </div>

            {/* WhatsApp Channel Status */}
            <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold text-xs shrink-0">
                  WA
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display font-bold text-xs text-[#1c1b19]">WhatsApp Bot</span>
                    {currentUser?.whatsappUserId ? (
                      <span className="text-[10px] font-mono font-bold bg-[#e7f4ec] text-[#0f7a52] px-2 py-0.2 rounded-full">
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-gray-200 text-[#6b665c] px-2 py-0.2 rounded-full">
                        Not Linked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6b665c]">
                    {currentUser?.whatsappUserId ? currentUser.whatsappUserId : "Send receipts to +1-800-SNAPSME"}
                  </p>
                </div>
              </div>

              {currentUser?.whatsappUserId ? (
                <button
                  type="button"
                  onClick={() => handleUnlinkChannel("whatsapp")}
                  className="w-full sm:w-auto text-xs font-semibold text-red-600 hover:text-red-800 bg-white border border-red-200 px-3 py-2 rounded-lg cursor-pointer text-center min-h-[40px] sm:min-h-0"
                >
                  Unlink
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerateLink("whatsapp")}
                  className="w-full sm:w-auto text-xs font-semibold text-[#0f7a52] bg-white border border-[#0f7a52]/30 hover:border-[#0f7a52] px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 min-h-[40px] sm:min-h-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              )}
            </div>

            {/* Active Link Code Display with Countdown Timer */}
            {chatLink && (
              <div className="bg-[#fff9f0] border-2 border-[#e0982a]/50 rounded-xl p-4 space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-display font-bold text-[#e0982a]">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Active {activeChannel === 'telegram' ? 'Telegram' : 'WhatsApp'} Link Code</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#6b665c]">
                    <Clock className="w-3 h-3 text-[#e0982a]" />
                    <span>Expires in {formatTimeLeft(timeLeft)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white border border-[#d9d4c8] rounded-xl p-3 sm:px-4 sm:py-3 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#6b665c] block">
                      Pairing Code
                    </span>
                    <span className="font-mono font-bold text-xl text-[#1c1b19] tracking-wider">
                      {chatLink.linkCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(chatLink.linkCode)}
                    className="w-full sm:w-auto bg-[#1c1b19] hover:bg-[#ff5a3c] text-white text-xs font-semibold px-3.5 py-2.5 sm:py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#6b665c] leading-relaxed">
                  <strong>Instructions:</strong> Open {activeChannel === 'telegram' ? 'Telegram' : 'WhatsApp'} and send: <code className="bg-[#f7f3ea] px-1.5 py-0.5 rounded font-mono font-bold text-[#1c1b19]">/start {chatLink.linkCode}</code> to automatically pair your expense account.
                </p>
              </div>
            )}
          </div>
        </TornCard>

        {/* CARD 3: Workspace & Default Currency Settings (Owner Only) */}
        <TornCard headerColor="bg-[#e0982a]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#e0982a]/10 text-[#e0982a] flex items-center justify-center font-bold shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  Workspace Settings
                </h2>
                <p className="text-[11px] text-[#6b665c]">Workspace name & financial currency</p>
              </div>
            </div>
            {!userIsOwner && (
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Owner Gated
              </span>
            )}
            {wsToast && (
              <span className="text-xs font-mono text-[#0f7a52] bg-[#e7f4ec] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> {wsToast}
              </span>
            )}
          </div>

          {!userIsOwner ? (
            /* Access Restricted Banner for Staff Users */
            <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-4 text-center space-y-2">
              <Lock className="w-8 h-8 text-[#e0982a] mx-auto" />
              <h3 className="font-display font-bold text-xs text-[#1c1b19]">
                Owner Privileges Required
              </h3>
              <p className="text-[11px] text-[#6b665c] max-w-sm mx-auto">
                Workspace name and currency settings are managed exclusively by the workspace owner.
              </p>
              <div className="bg-white border border-[#d9d4c8] rounded-lg p-2 text-left text-[11px] font-mono space-y-1">
                <div><strong>Current Workspace:</strong> {workspace.name}</div>
                <div><strong>Default Currency:</strong> {workspace.currency} ({getCurrencySymbol(workspace.currency)})</div>
              </div>
            </div>
          ) : (
            /* Owner Editable Form */
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  required
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors min-h-[44px] sm:min-h-0"
                  placeholder="e.g. Acme Agency"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Default Accounting Currency
                </label>
                <select
                  value={wsCurrency}
                  onChange={(e) => setWsCurrency(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2.5 sm:py-2 text-xs font-semibold text-[#1c1b19] focus:outline-none focus:border-[#0f7a52] focus:bg-white transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
                >
                  {WORLD_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {getCurrencyLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#1c1b19] hover:bg-[#ff5a3c] text-white font-display font-semibold text-xs px-4 py-2.5 sm:py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Workspace Settings</span>
                </button>
              </div>
            </form>
          )}
        </TornCard>

        {/* CARD 4: Category & Budget Limits (Owner Only) */}
        <TornCard headerColor="bg-[#1c1b19]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1c1b19]/10 text-[#1c1b19] flex items-center justify-center font-bold shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  Category & Budget Control
                </h2>
                <p className="text-[11px] text-[#6b665c]">Monthly expense categories and spending limits</p>
              </div>
            </div>

            {userIsOwner ? (
              <button
                type="button"
                onClick={() => handleOpenCatModal(null)}
                className="w-full sm:w-auto bg-[#0f7a52] hover:bg-[#0b5e3f] text-white text-xs font-semibold px-3 py-2 sm:py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer min-h-[40px] sm:min-h-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            ) : (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Owner Gated
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-3 sm:p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-display font-bold text-xs text-[#1c1b19] block">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#6b665c]">
                    Budget: {cat.budget ? `${getCurrencySymbol(workspace.currency)}${cat.budget.toLocaleString()}/mo` : "Unlimited"}
                  </span>
                </div>

                {userIsOwner && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-0 border-[#d9d4c8]/50">
                    <button
                      type="button"
                      onClick={() => handleOpenCatModal(cat)}
                      className="text-[11px] font-semibold text-[#0f7a52] hover:underline px-2.5 py-1 bg-white border border-[#d9d4c8] rounded-lg cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TornCard>

        {/* CARD 5: Brand Basics (Owner Only) */}
        <TornCard headerColor="bg-[#0f7a52]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0f7a52]/10 text-[#0f7a52] flex items-center justify-center font-bold shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  Brand Basics
                </h2>
                <p className="text-[11px] text-[#6b665c]">Workspace logo & primary accent color</p>
              </div>
            </div>
            {brandToast && (
              <span className="text-xs font-mono text-[#0f7a52] bg-[#e7f4ec] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> {brandToast}
              </span>
            )}
            {!userIsOwner && (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Owner Gated
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Logo Upload Section */}
            <div>
              <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1.5">
                Business Logo
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-[#d9d4c8] bg-[#f7f3ea] flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {brandLogoUrl ? (
                    <img src={brandLogoUrl} alt="Workspace Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[#6b665c]" />
                  )}
                </div>

                {userIsOwner && (
                  <div className="space-y-1.5 w-full sm:w-auto">
                    <label className="w-full sm:w-auto bg-white hover:bg-gray-50 border border-[#d9d4c8] text-[#1c1b19] text-xs font-semibold px-3 py-2.5 sm:py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[44px] sm:min-h-0">
                      <Upload className="w-3.5 h-3.5 text-[#0f7a52]" />
                      <span>{brandLogoUrl ? "Replace Logo" : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {brandLogoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-xs text-red-600 hover:underline block font-medium cursor-pointer"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Accent Color Picker */}
            <div>
              <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandAccentColor}
                  disabled={!userIsOwner}
                  onChange={handleAccentColorChange}
                  className="w-10 h-10 rounded-lg border border-[#d9d4c8] p-0.5 bg-white cursor-pointer disabled:opacity-60 shrink-0"
                />
                <div>
                  <span className="font-mono text-xs font-bold text-[#1c1b19] block">
                    {brandAccentColor}
                  </span>
                  <span className="text-[10px] text-[#6b665c] block">
                    Controls primary buttons & active nav highlights
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg text-[11px] text-[#6b665c]">
              <strong>Note:</strong> Status alerts, confidence dots, and budget flags remain fixed to carry standard operational meanings.
            </div>
          </div>
        </TornCard>

        {/* CARD 6: Dashboard Card Preferences (Owner Only) */}
        <TornCard headerColor="bg-[#0075de]" tornBottom={true}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d9d4c8]/60 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0075de]/10 text-[#0075de] flex items-center justify-center font-bold shrink-0">
                <Layout className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  Dashboard Card Preferences
                </h2>
                <p className="text-[11px] text-[#6b665c]">Toggle visibility of spend dashboard modules</p>
              </div>
            </div>
            {dashPrefsToast && (
              <span className="text-xs font-mono text-[#0075de] bg-[#e6f3fe] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> {dashPrefsToast}
              </span>
            )}
            {!userIsOwner && (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Owner Gated
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="flex items-start sm:items-center justify-between p-2.5 bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl cursor-pointer gap-2">
              <div className="pr-2">
                <span className="font-display font-bold text-xs text-[#1c1b19] block">Net Cash Figure</span>
                <span className="text-[11px] text-[#6b665c] block">Show income minus expenses for the selected period on the dashboard</span>
              </div>
              <input
                type="checkbox"
                checked={dashboardPrefs.showNetCashFigure !== false}
                disabled={!userIsOwner}
                onChange={() => handleToggleDashPref("showNetCashFigure")}
                className="h-4 w-4 rounded text-[#0075de] focus:ring-[#0075de] border-[#d9d4c8] cursor-pointer mt-0.5 sm:mt-0 shrink-0"
              />
            </label>

            <label className="flex items-start sm:items-center justify-between p-2.5 bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl cursor-pointer gap-2">
              <div className="pr-2">
                <span className="font-display font-bold text-xs text-[#1c1b19] block">Top Vendor Stat</span>
                <span className="text-[11px] text-[#6b665c] block">Show top vendor and spend category summary</span>
              </div>
              <input
                type="checkbox"
                checked={dashboardPrefs.showTopVendor}
                disabled={!userIsOwner}
                onChange={() => handleToggleDashPref("showTopVendor")}
                className="h-4 w-4 rounded text-[#0075de] focus:ring-[#0075de] border-[#d9d4c8] cursor-pointer mt-0.5 sm:mt-0 shrink-0"
              />
            </label>

            <label className="flex items-start sm:items-center justify-between p-2.5 bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl cursor-pointer gap-2">
              <div className="pr-2">
                <span className="font-display font-bold text-xs text-[#1c1b19] block">Team Leaderboard</span>
                <span className="text-[11px] text-[#6b665c] block">Show spend ranking by team member</span>
              </div>
              <input
                type="checkbox"
                checked={dashboardPrefs.showTeamLeaderboard}
                disabled={!userIsOwner}
                onChange={() => handleToggleDashPref("showTeamLeaderboard")}
                className="h-4 w-4 rounded text-[#0075de] focus:ring-[#0075de] border-[#d9d4c8] cursor-pointer mt-0.5 sm:mt-0 shrink-0"
              />
            </label>

            <label className="flex items-start sm:items-center justify-between p-2.5 bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl cursor-pointer gap-2">
              <div className="pr-2">
                <span className="font-display font-bold text-xs text-[#1c1b19] block">Budget vs. Actual</span>
                <span className="text-[11px] text-[#6b665c] block">Show workspace monthly budget & ceiling progress bar</span>
              </div>
              <input
                type="checkbox"
                checked={dashboardPrefs.showBudgetVsActual}
                disabled={!userIsOwner}
                onChange={() => handleToggleDashPref("showBudgetVsActual")}
                className="h-4 w-4 rounded text-[#0075de] focus:ring-[#0075de] border-[#d9d4c8] cursor-pointer mt-0.5 sm:mt-0 shrink-0"
              />
            </label>

            <label className="flex items-start sm:items-center justify-between p-2.5 bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl cursor-pointer gap-2">
              <div className="pr-2">
                <span className="font-display font-bold text-xs text-[#1c1b19] block">Spend by Day of Week</span>
                <span className="text-[11px] text-[#6b665c] block">Show daily spending distribution chart card</span>
              </div>
              <input
                type="checkbox"
                checked={dashboardPrefs.showSpendByDay}
                disabled={!userIsOwner}
                onChange={() => handleToggleDashPref("showSpendByDay")}
                className="h-4 w-4 rounded text-[#0075de] focus:ring-[#0075de] border-[#d9d4c8] cursor-pointer mt-0.5 sm:mt-0 shrink-0"
              />
            </label>
          </div>
        </TornCard>

      </div>

      {/* FULL WIDTH CARD: Team Members & Role Management (Owner Only) */}
      <TornCard headerColor="bg-[#0f7a52]" tornBottom={true}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d9d4c8]/60 mb-4 cursor-pointer select-none" onClick={() => toggleSection('team')}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0f7a52]/10 text-[#0f7a52] flex items-center justify-center font-bold shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#1c1b19]">
                Team Members & Access Control
              </h2>
              <p className="text-[11px] text-[#6b665c]">
                Staff roster, active invitations, and messaging channels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userIsOwner ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInviteError("");
                  setShowInviteModal(true);
                }}
                className="w-full sm:w-auto bg-[#ff5a3c] hover:bg-[#e0482c] text-white text-xs font-semibold px-3.5 py-2.5 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-h-[44px] sm:min-h-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Staff Member</span>
              </button>
            ) : (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Owner Gated
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-[#6b665c] transition-transform duration-200 shrink-0 ${collapsedSections.team ? '-rotate-90' : ''}`} />
          </div>
        </div>

        {!collapsedSections.team && (
          <>
            {/* Desktop Members Roster Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto min-w-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#d9d4c8] text-[11px] font-mono uppercase tracking-wider text-[#6b665c]">
                <th className="pb-2 font-semibold">Member</th>
                <th className="pb-2 font-semibold">Role</th>
                <th className="pb-2 font-semibold">Contact Details</th>
                <th className="pb-2 font-semibold">Connected Bots</th>
                <th className="pb-2 font-semibold text-right">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d9d4c8]/60 text-xs">
              {members.map((m) => {
                const initials = m.displayName
                  ? m.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                  : "U";

                return (
                  <tr key={m.userId} className="hover:bg-[#f7f3ea]/50 transition-colors">
                    {/* Member Name */}
                    <td className="py-3 font-semibold text-[#1c1b19]">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                            m.role === "owner" ? "bg-[#0f7a52]" : "bg-[#1c1b19]"
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-display font-bold">{m.displayName}</div>
                          {m.userId === currentUser.userId && (
                            <span className="text-[10px] font-mono text-[#0f7a52] font-semibold">( You )</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3">
                      {m.role === "owner" ? (
                        <span className="text-[10px] font-mono font-bold bg-[#0f7a52]/10 text-[#0f7a52] border border-[#0f7a52]/20 px-2 py-0.5 rounded-md">
                          OWNER
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold bg-gray-100 text-[#1c1b19] border border-gray-200 px-2 py-0.5 rounded-md">
                          STAFF
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3 text-[#6b665c] font-mono text-[11px]">
                      <div>{m.email || "No email"}</div>
                      {m.phone && <div className="text-[10px] text-[#6b665c]">{m.phone}</div>}
                    </td>

                    {/* Connected Channels */}
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                            m.telegramUserId
                              ? "bg-[#0088cc]/10 text-[#0088cc]"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          TG: {m.telegramUserId ? `@${m.telegramUserId}` : "Off"}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                            m.whatsappUserId
                              ? "bg-[#25D366]/10 text-[#25D366]"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          WA: {m.whatsappUserId ? "On" : "Off"}
                        </span>
                      </div>
                    </td>

                    {/* Status & Actions */}
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!m.joinedAt && !m.email ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-[#ff5a3c] bg-[#fff0ed] border border-[#ff5a3c]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Missing email — this invite can't be completed
                            </span>
                            {userIsOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMemberId(m.userId);
                                  setEditEmail(m.email || "");
                                  setEditError("");
                                }}
                                className="text-xs font-semibold text-[#0075de] hover:underline cursor-pointer"
                              >
                                Add Email
                              </button>
                            )}
                          </div>
                        ) : m.joinedAt ? (
                          <span className="text-[10px] font-mono font-bold text-[#0f7a52] bg-[#e7f4ec] px-2 py-0.5 rounded-full">
                            Joined
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-[#e0982a] bg-[#fbf1de] px-2 py-0.5 rounded-full">
                            Invited
                          </span>
                        )}

                        {userIsOwner && m.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Members Card List (< 768px) */}
        <div className="md:hidden space-y-2.5">
          {members.map((m) => {
            const initials = m.displayName
              ? m.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
              : "U";

            return (
              <div key={m.userId} className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                        m.role === "owner" ? "bg-[#0f7a52]" : "bg-[#1c1b19]"
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <span className="font-display font-bold text-xs text-[#1c1b19] block">{m.displayName}</span>
                      <span className="text-[10px] font-mono text-[#6b665c] block">{m.email || "No email"}</span>
                    </div>
                  </div>

                  {m.role === "owner" ? (
                    <span className="text-[10px] font-mono font-bold bg-[#0f7a52]/10 text-[#0f7a52] border border-[#0f7a52]/20 px-2 py-0.5 rounded-md">
                      OWNER
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold bg-gray-100 text-[#1c1b19] border border-gray-200 px-2 py-0.5 rounded-md">
                      STAFF
                    </span>
                  )}
                </div>

                {!m.joinedAt && !m.email && (
                  <div className="bg-[#fff0ed] border border-[#ff5a3c]/30 rounded-lg p-2 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] font-mono font-bold text-[#ff5a3c] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Missing email — this invite can't be completed
                    </span>
                    {userIsOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMemberId(m.userId);
                          setEditEmail(m.email || "");
                          setEditError("");
                        }}
                        className="text-xs font-bold text-[#0075de] underline cursor-pointer shrink-0"
                      >
                        Add Email
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#d9d4c8]/60 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                        m.telegramUserId
                          ? "bg-[#0088cc]/10 text-[#0088cc]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      TG: {m.telegramUserId ? `@${m.telegramUserId}` : "Off"}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                        m.whatsappUserId
                          ? "bg-[#25D366]/10 text-[#25D366]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      WA: {m.whatsappUserId ? "On" : "Off"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#0f7a52] bg-[#e7f4ec] px-2 py-0.5 rounded-full">
                      {m.joinedAt ? "Joined" : "Invited"}
                    </span>
                    {userIsOwner && m.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.userId)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </TornCard>

      {/* FULL WIDTH CARD: Inbound API & Webhook Automations (Owner Only) */}
      {userIsOwner && (
        <TornCard headerColor="bg-[#0075de]" tornBottom={true}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#d9d4c8]/60 mb-4 cursor-pointer select-none" onClick={() => toggleSection('inboundApi')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0075de]/10 text-[#0075de] flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#1c1b19]">
                  Inbound API & Webhook Automations
                </h3>
                <p className="text-xs text-[#6b665c]">
                  Connect Zapier, Make, or custom scripts to push records into SnapSME
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronDown className={`w-4 h-4 text-[#6b665c] transition-transform duration-200 shrink-0 ${collapsedSections.inboundApi ? '-rotate-90' : ''}`} />
            </div>
          </div>

          {!collapsedSections.inboundApi && (
            <div className="space-y-4">
            <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-display font-bold text-[#1c1b19] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#0075de]" />
                  API Key
                </label>
                {workspace?.apiKey && (
                  <span className="text-[10px] font-mono text-[#6b665c]">
                    Created {workspace.apiKeyCreatedAt ? new Date(workspace.apiKeyCreatedAt).toLocaleDateString() : "—"}
                  </span>
                )}
              </div>

              {workspace?.apiKey ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-[#d9d4c8] rounded-lg px-3 py-2 font-mono text-xs text-[#1c1b19] flex items-center justify-between">
                    <span>
                      {apiKeyVisible
                        ? workspace.apiKey
                        : `sk_live_${'•'.repeat(20)}${workspace.apiKey.slice(-4)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setApiKeyVisible(!apiKeyVisible)}
                      className="text-[#6b665c] hover:text-[#1c1b19] cursor-pointer ml-2"
                      title={apiKeyVisible ? "Hide API key" : "Show API key"}
                    >
                      {apiKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(workspace.apiKey);
                      setApiKeyCopied(true);
                      setTimeout(() => setApiKeyCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-white border border-[#d9d4c8] hover:bg-[#e6f3fe] rounded-lg cursor-pointer transition-colors"
                    title="Copy API key to clipboard"
                  >
                    {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-[#0f7a52]" /> : <Copy className="w-3.5 h-3.5 text-[#0075de]" />}
                    <span>{apiKeyCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#6b665c] italic">
                  No API key generated yet. Generate one below to start accepting data from external tools.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                {!workspace?.apiKey ? (
                  <button
                    type="button"
                    disabled={apiKeyLoading}
                    onClick={async () => {
                      setApiKeyLoading(true);
                      setApiKeyToast("");
                      try {
                        const result = await saveApiKeyFirestore(workspace.businessId);
                        onUpdateWorkspace({ ...workspace, apiKey: result.apiKey, apiKeyCreatedAt: result.createdAt });
                        setApiKeyToast("API key generated! Copy it now — it won't be shown again in full.");
                        setApiKeyVisible(true);
                      } catch (err) {
                        setApiKeyToast(`Error: ${err.message}`);
                      } finally {
                        setApiKeyLoading(false);
                      }
                    }}
                    className="bg-[#0075de] hover:bg-[#0060b8] text-white font-display font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {apiKeyLoading ? "Generating..." : "Generate API Key"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRegenWarning(true)}
                    className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-400 font-display font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate Key
                  </button>
                )}
              </div>

              {apiKeyToast && (
                <div className="bg-[#e6f3fe] border border-[#0075de]/30 text-[#0075de] p-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{apiKeyToast}</span>
                </div>
              )}
            </div>

            {/* How to Connect Guide */}
            <div className="bg-white border border-[#d9d4c8] rounded-xl p-4 space-y-3">
              <h4 className="font-display font-bold text-xs text-[#1c1b19] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#0075de]" />
                How to Connect
              </h4>
              <div className="text-xs text-[#6b665c] space-y-2 font-mono leading-relaxed">
                <p className="font-sans font-medium text-[#1c1b19]">Endpoint URLs:</p>
                <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg p-2.5 space-y-1">
                  <code className="block text-[11px]">POST  /apiIncome   → push income records</code>
                  <code className="block text-[11px]">POST  /apiExpenses → push expense records</code>
                </div>

                <p className="font-sans font-medium text-[#1c1b19] pt-1">Authentication:</p>
                <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg p-2.5">
                  <code className="block text-[11px]">Authorization: Bearer sk_live_your_key_here</code>
                </div>

                <p className="font-sans font-medium text-[#1c1b19] pt-1">Sample JSON Body:</p>
                <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-lg p-2.5">
                  <pre className="text-[11px] whitespace-pre-wrap">{`{
  "amount": 120.50,
  "currency": "USD",
  "source": "Shopify order #1042",
  "date": "2026-08-01",
  "notes": "optional note"
}`}</pre>
                </div>

                <p className="font-sans font-medium text-[#1c1b19] pt-1">Quick Setup (Zapier / Make):</p>
                <ol className="font-sans list-decimal list-inside space-y-1 text-[#6b665c] text-[11px]">
                  <li>Create a new Zap/Scenario with a webhook action (POST)</li>
                  <li>Set the URL to your Cloud Function endpoint above</li>
                  <li>Add the <code className="font-mono bg-[#f7f3ea] px-1 rounded">Authorization: Bearer</code> header with your API key</li>
                  <li>Map your trigger data to the JSON body fields (amount, source, date, notes)</li>
                  <li>Test the connection — a <code className="font-mono bg-[#f7f3ea] px-1 rounded">201</code> response means success</li>
                </ol>

                <p className="font-sans text-[11px] pt-1">
                  <strong>Response codes:</strong> 201 Created, 400 Bad Request (check error details), 401 Unauthorized, 429 Rate Limited (100 req/min)
                </p>
              </div>
            </div>
          </div>
          )}
        </TornCard>
      )}

      {/* Regenerate API Key Warning Modal */}
      {showRegenWarning && (
        <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#1c1b19]">Regenerate API Key?</h3>
                <p className="text-xs text-[#6b665c]">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700 font-medium">
              <strong>Warning:</strong> Any connected automations using the old key will immediately stop working.
              You will need to update the API key in Zapier, Make, or any custom scripts.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenWarning(false)}
                className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={apiKeyLoading}
                onClick={async () => {
                  setApiKeyLoading(true);
                  setApiKeyToast("");
                  try {
                    const result = await regenerateApiKeyFirestore(workspace.businessId, workspace.apiKey);
                    onUpdateWorkspace({ ...workspace, apiKey: result.apiKey, apiKeyCreatedAt: result.createdAt });
                    setApiKeyToast("API key regenerated. Copy the new key — the old one is permanently invalidated.");
                    setApiKeyVisible(true);
                    setShowRegenWarning(false);
                  } catch (err) {
                    setApiKeyToast(`Error: ${err.message}`);
                  } finally {
                    setApiKeyLoading(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${apiKeyLoading ? 'animate-spin' : ''}`} />
                {apiKeyLoading ? "Regenerating..." : "Confirm Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL WIDTH CARD: Activity Log & Audit Trail (Owner Only) */}
      <TornCard headerColor="bg-[#1c1b19]" tornBottom={true}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#d9d4c8]/60 mb-4 cursor-pointer select-none" onClick={() => toggleSection('activityLog')}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1c1b19]/10 text-[#1c1b19] flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-[#1c1b19]">
                  Activity Log & Audit Trail
                </h2>
                <span className="text-[10px] font-mono font-bold bg-[#f7f3ea] text-[#1c1b19] px-2 py-0.5 rounded-full border border-[#d9d4c8]">
                  {activityLogs.length} events recorded
                </span>
              </div>
              <p className="text-[11px] text-[#6b665c]">
                Timestamped history of team invitations, expense approvals, budget changes, and system updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                refreshLogs();
              }}
              className="p-2.5 sm:p-1.5 text-[#6b665c] hover:text-[#1c1b19] bg-[#f7f3ea] hover:bg-white border border-[#d9d4c8] rounded-lg transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-0 flex items-center justify-center"
              title="Refresh activity logs"
            >
              <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {userIsOwner ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportActivityCSV();
                }}
                disabled={filteredLogs.length === 0}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-display font-semibold transition-all shadow-2xs whitespace-nowrap cursor-pointer min-h-[44px] sm:min-h-0 ${
                  filteredLogs.length > 0
                    ? "bg-[#0f7a52] hover:bg-[#0b5f40] text-white"
                    : "bg-[#d9d4c8]/50 text-[#6b665c] cursor-not-allowed"
                }`}
                title="Export audit log entries to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </button>
            ) : (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Owner Restricted
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-[#6b665c] transition-transform duration-200 shrink-0 ${collapsedSections.activityLog ? '-rotate-90' : ''}`} />
          </div>
        </div>

        {!collapsedSections.activityLog && (
          !userIsOwner ? (
          /* Restricted Access View for Staff */
          <div className="bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl p-6 text-center space-y-2">
            <Lock className="w-8 h-8 text-[#e0982a] mx-auto" />
            <h3 className="font-display font-bold text-xs text-[#1c1b19]">
              Audit Trail Restricted to Workspace Owners
            </h3>
            <p className="text-[11px] text-[#6b665c] max-w-md mx-auto">
              The activity log tracks team actions, expense approvals, member additions, and workspace configuration changes for compliance. Only workspace owners have permission to inspect full audit logs.
            </p>
          </div>
        ) : (
          /* Owner Interactive Activity Log Section */
          <div className="space-y-4">
            {/* Log Search & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f7f3ea] p-3 rounded-xl border border-[#d9d4c8]">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b665c]" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs by keyword..."
                  className="w-full bg-white border border-[#d9d4c8] text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-[#0f7a52]"
                />
              </div>

              {/* Tag Selector */}
              <div>
                <select
                  value={logTagFilter}
                  onChange={(e) => setLogTagFilter(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c8] text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Event Types ({uniqueTags.length})</option>
                  {uniqueTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actor Selector */}
              <div>
                <select
                  value={logActorFilter}
                  onChange={(e) => setLogActorFilter(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c8] text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Team Actors</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logs List / Timeline */}
            {filteredLogs.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 divide-y divide-[#d9d4c8]/40">
                {filteredLogs.map((log) => {
                  let tagBg = "bg-gray-100 text-gray-800 border-gray-200";
                  if (log.tag === "Expense Approval") tagBg = "bg-[#e7f4ec] text-[#0f7a52] border-[#0f7a52]/20";
                  else if (log.tag === "Expense Captured") tagBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  else if (log.tag === "Member Invitation") tagBg = "bg-purple-50 text-purple-800 border-purple-200";
                  else if (log.tag === "Member Removal") tagBg = "bg-red-50 text-red-700 border-red-200";
                  else if (log.tag === "Category Change") tagBg = "bg-[#fbf1de] text-[#e0982a] border-[#e0982a]/30";
                  else if (log.tag === "Workspace Config") tagBg = "bg-blue-50 text-blue-800 border-blue-200";
                  else if (log.tag === "Bot Integration") tagBg = "bg-orange-50 text-orange-800 border-orange-200";
                  else if (log.tag === "User Profile") tagBg = "bg-teal-50 text-teal-800 border-teal-200";

                  const formattedDate = new Date(log.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div
                      key={log.id}
                      className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#f7f3ea]/40 p-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0f7a52] mt-1.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-xs text-[#1c1b19]">
                              {log.description}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${tagBg}`}
                            >
                              {log.tag}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#6b665c] font-mono mt-0.5">
                            <span>
                              By: <strong>{log.actorName}</strong> ({log.actorRole})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-[#6b665c] bg-[#f7f3ea] px-2 py-1 rounded-md border border-[#d9d4c8]">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#f7f3ea] border border-dashed border-[#d9d4c8] rounded-xl p-8 text-center space-y-2">
                <History className="w-8 h-8 text-[#6b665c] mx-auto" />
                <h4 className="font-display font-bold text-xs text-[#1c1b19]">
                  No Activity Logs Match Your Search
                </h4>
                <p className="text-[11px] text-[#6b665c]">
                  Try resetting search keywords or changing event filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLogSearch("");
                    setLogTagFilter("all");
                    setLogActorFilter("all");
                  }}
                  className="text-xs text-[#0f7a52] hover:underline font-bold cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ))}
      </TornCard>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#d9d4c8]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#ff5a3c]" />
                <h3 className="font-display font-bold text-lg text-[#1c1b19]">
                  Invite Staff Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-[#6b665c] hover:text-[#1c1b19] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Staff Member Name <span className="text-[#6b665c] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#ff5a3c]"
                  placeholder="e.g. Jordan Lee"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Email Address <span className="text-[#ff5a3c]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#ff5a3c]"
                  placeholder="jordan@acme.com"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-[#6b665c] mb-1">
                  Phone Number <span className="font-normal text-[10px] text-[#6b665c]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#ff5a3c]"
                  placeholder="+1 555-018-9921"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#ff5a3c] hover:bg-[#e0482c] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pending Invite Email Modal */}
      {editingMemberId && (
        <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#d9d4c8]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0075de]" />
                <h3 className="font-display font-bold text-lg text-[#1c1b19]">
                  Add Email to Pending Invite
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMemberId(null)}
                className="text-[#6b665c] hover:text-[#1c1b19] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6b665c]">
              An email address is required so this staff member can sign in and accept their workspace invitation.
            </p>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInviteEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Email Address <span className="text-[#0075de]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0075de]"
                  placeholder="staff@company.com"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMemberId(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0075de] hover:bg-[#0060b8] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  Save & Complete Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#d9d4c8] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#d9d4c8]">
              <h3 className="font-display font-bold text-base text-[#1c1b19]">
                {editingCatId ? "Edit Expense Category" : "Add Expense Category"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="text-[#6b665c] hover:text-[#1c1b19] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {catError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {catError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52]"
                  placeholder="e.g. Client Entertainment"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-[#1c1b19] mb-1">
                  Monthly Budget Limit ({getCurrencySymbol(workspace.currency)})
                </label>
                <input
                  type="number"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  className="w-full bg-[#f7f3ea]/50 border border-[#d9d4c8] rounded-xl px-3 py-2 text-xs font-medium text-[#1c1b19] focus:outline-none focus:border-[#0f7a52]"
                  placeholder="e.g. 1000 (leave blank for unlimited)"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6b665c] hover:bg-[#f7f3ea] rounded-xl border border-[#d9d4c8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0f7a52] hover:bg-[#0b5e3f] text-white font-display font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
