import React, { useRef, useState, useEffect } from "react";
import {
  Camera,
  Wifi,
  WifiOff,
  Users,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Building2,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut
} from "lucide-react";
import { motion } from "motion/react";

export const Header = ({
  currentView,
  setCurrentView,
  workspace,
  members,
  expensesCount = 0,
  currentUser,
  setCurrentUser,
  isOfflineMode,
  setIsOfflineMode,
  pendingSyncCount,
  onOpenCapture,
  onOpenOnboarding
}) => {
  const scrollRef = useRef(null);
  const dropdownRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check scroll position to show/hide gradient indicators and arrows
  const checkScrollability = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, []);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -220, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 220, behavior: "smooth" });
    }
  };

  const navItems = [
    {
      id: "feed",
      label: "Shared Feed",
      icon: <Receipt className="w-4 h-4" />,
      badge: expensesCount > 0 ? expensesCount : undefined,
      badgeColor: "bg-[#0f7a52]/10 text-[#0f7a52]"
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: "Analytics",
      badgeColor: "bg-amber-500/10 text-amber-700"
    },
    {
      id: "chat",
      label: "Chat Bot",
      icon: <MessageSquare className="w-4 h-4" />,
      badge: "AI Assistant",
      badgeColor: "bg-[#0f7a52]/15 text-[#0f7a52]",
      pulse: true
    },
    {
      id: "team",
      label: "Team",
      icon: <Users className="w-4 h-4" />,
      badge: members.length > 0 ? `${members.length} members` : undefined,
      badgeColor: "bg-[#1c1b19]/10 text-[#1c1b19]"
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
      badge: currentUser ? (currentUser.role === "owner" ? "Owner" : "Staff") : undefined,
      badgeColor: currentUser && currentUser.role === "owner" ? "bg-[#0f7a52]/10 text-[#0f7a52]" : "bg-gray-200 text-[#1c1b19]"
    }
  ];

  // Helper for initials
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#f6f5f4]/95 backdrop-blur-md border-b border-black/10 shadow-2xs">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 md:px-8 pt-2.5 pb-2 space-y-2.5">
        {/* Top Control Bar: Stacks into 2 clean rows on Mobile (< 640px), single row on Desktop (>= 640px) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 w-full">
          {/* Row 1 (Mobile) / Left Group (Desktop): App Logo & Network/User Controls */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Brand Logo & Wordmark */}
            <a
              href="/home"
              className="flex items-center gap-1.5 cursor-pointer group no-underline shrink-0"
              title="Go to SnapSME Marketing Homepage"
            >
              <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-[#0075de] text-white flex items-center justify-center rounded-lg overflow-hidden shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <img src={workspace?.brand?.logoUrl || "/logo.jpg"} alt="SnapSME Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-[#000000] shrink-0">
                Snap<span className="text-[#0075de]">SME</span>
              </span>
            </a>

            {/* Mobile Controls: Network Button & Profile Avatar (< 640px) */}
            <div className="flex sm:hidden items-center gap-2">
              {/* Network / Offline Switch */}
              <button
                type="button"
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                title={isOfflineMode ? "Click to switch back Online" : "Click to test Offline mode"}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  isOfflineMode
                    ? "bg-[#ffb110]/20 text-[#000000] border-[#ffb110]"
                    : "bg-white text-[#0075de] border-black/10 hover:border-[#0075de]"
                }`}
              >
                {isOfflineMode ? (
                  <WifiOff className="w-3.5 h-3.5 text-[#e32d14] shrink-0" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-[#0075de] shrink-0" />
                )}
                <span className="font-semibold text-[11px]">
                  {isOfflineMode ? "Offline" : "Online"}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="bg-[#f64932] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {pendingSyncCount}
                  </span>
                )}
              </button>

              {/* User Profile Avatar (Mobile) */}
              {currentUser && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="w-8 h-8 rounded-full bg-[#e7f4ec] text-[#0f7a52] border border-[#d9d4c8] hover:border-[#0f7a52] font-display font-bold text-xs flex items-center justify-center cursor-pointer transition-all overflow-hidden select-none shadow-xs shrink-0"
                    title={currentUser.displayName || currentUser.email}
                  >
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(currentUser.displayName || currentUser.email)}</span>
                    )}
                  </button>

                  {/* Dropdown Menu Pane */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#d9d4c8] rounded-xl shadow-xl z-50 py-1.5 font-sans text-xs">
                      <div className="px-3.5 py-2 border-b border-[#d9d4c8]/60 space-y-0.5">
                        <p className="font-display font-bold text-xs text-[#1c1b19] truncate">
                          {currentUser.displayName || "User"}
                        </p>
                        {currentUser.email && (
                          <p className="text-[11px] text-[#6b665c] truncate">
                            {currentUser.email}
                          </p>
                        )}
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0f7a52]/10 text-[#0f7a52]">
                          {currentUser.role === "owner" ? "Workspace Owner" : "Team Member"}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setCurrentView("settings");
                          }}
                          className="w-full px-3.5 py-2 text-left font-medium text-[#1c1b19] hover:bg-[#f7f3ea] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#6b665c]" />
                          <span>Settings</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setIsUserDropdownOpen(false);
                            localStorage.removeItem("snapsme_current_user");
                            window.location.href = "/home";
                          }}
                          className="w-full px-3.5 py-2 text-left font-medium text-[#e32d14] hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-[#e32d14]" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2 (Mobile) / Right Controls (Desktop): Workspace Badge & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Business / Workspace Badge */}
            <div className="flex items-center gap-1.5 bg-white border border-[#d9d4c8] text-[#1c1b19] px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs min-w-0 flex-1 sm:flex-none">
              <Building2 className="w-3.5 h-3.5 text-[#0075de] shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[190px]">
                {workspace?.name || "My Workspace"}
              </span>
            </div>

            {/* Desktop Only Network Switch & User Profile (>= 640px) */}
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Network / Offline Switch */}
              <button
                type="button"
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                title={isOfflineMode ? "Click to switch back Online" : "Click to test Offline mode"}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  isOfflineMode
                    ? "bg-[#ffb110]/20 text-[#000000] border-[#ffb110]"
                    : "bg-white text-[#0075de] border-black/10 hover:border-[#0075de]"
                }`}
              >
                {isOfflineMode ? (
                  <WifiOff className="w-3.5 h-3.5 text-[#e32d14] shrink-0" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-[#0075de] shrink-0" />
                )}
                <span className="hidden md:inline font-semibold">
                  {isOfflineMode ? "Offline" : "Online"}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="bg-[#f64932] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {pendingSyncCount}
                  </span>
                )}
              </button>

              {/* User Profile Avatar (Desktop) */}
              {currentUser && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="w-8.5 h-8.5 rounded-full bg-[#e7f4ec] text-[#0f7a52] border border-[#d9d4c8] hover:border-[#0f7a52] font-display font-bold text-xs flex items-center justify-center cursor-pointer transition-all overflow-hidden select-none shadow-xs shrink-0"
                    title={currentUser.displayName || currentUser.email}
                  >
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(currentUser.displayName || currentUser.email)}</span>
                    )}
                  </button>

                  {/* Dropdown Menu Pane */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#d9d4c8] rounded-xl shadow-xl z-50 py-1.5 font-sans text-xs">
                      <div className="px-3.5 py-2 border-b border-[#d9d4c8]/60 space-y-0.5">
                        <p className="font-display font-bold text-xs text-[#1c1b19] truncate">
                          {currentUser.displayName || "User"}
                        </p>
                        {currentUser.email && (
                          <p className="text-[11px] text-[#6b665c] truncate">
                            {currentUser.email}
                          </p>
                        )}
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0f7a52]/10 text-[#0f7a52]">
                          {currentUser.role === "owner" ? "Workspace Owner" : "Team Member"}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setCurrentView("settings");
                          }}
                          className="w-full px-3.5 py-2 text-left font-medium text-[#1c1b19] hover:bg-[#f7f3ea] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#6b665c]" />
                          <span>Settings</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setIsUserDropdownOpen(false);
                            localStorage.removeItem("snapsme_current_user");
                            window.location.href = "/home";
                          }}
                          className="w-full px-3.5 py-2 text-left font-medium text-[#e32d14] hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-[#e32d14]" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Create Workspace / Onboarding Button (Desktop) */}
            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                title="Create a new business workspace & onboarding flow"
                className="hidden lg:flex items-center gap-1.5 bg-[#e6f3fe] hover:bg-[#d8ebfd] text-[#0075de] text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#0075de]" />
                <span>+ New Workspace</span>
              </button>
            )}

            {/* Primary Notion Blue "Snap Expense" Button */}
            <button
              type="button"
              onClick={onOpenCapture}
              className="flex items-center justify-center gap-1.5 bg-[#0075de] hover:bg-[#0060b8] text-white font-semibold text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0 min-h-[38px] shadow-xs"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Snap Expense</span>
            </button>
          </div>
        </div>

        {/* Navigation View Selector Section */}
        {/* Mobile Dropdown View Selector (< 768px) */}
        <div className="md:hidden pt-2 pb-1 border-t border-[#d9d4c8]/60">
          <label htmlFor="mobile-app-view-select" className="sr-only">Select View</label>
          <div className="relative">
            <select
              id="mobile-app-view-select"
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value)}
              className="w-full bg-white border border-[#d9d4c8] text-[#1c1b19] font-display font-semibold text-sm rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:border-[#0075de] cursor-pointer shadow-2xs pr-10"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} {item.badge !== undefined ? `(${item.badge})` : ""}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#6b665c]">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>
        </div>

        {/* Desktop Navigation Track Section (>= 768px) */}
        <div className="hidden md:flex relative items-center pt-1 border-t border-[#d9d4c8]/60">
          {/* Scroll Left Button Indicator */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={handleScrollLeft}
              className="absolute left-0 z-10 p-1 bg-white/90 hover:bg-white text-[#1c1b19] border border-[#d9d4c8] rounded-full shadow-md backdrop-blur-xs transition-opacity cursor-pointer"
              title="Scroll tabs left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Edge Gradient Blur */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#f7f3ea] to-transparent pointer-events-none z-5" />
          )}

          {/* Scrollable Tabs Container */}
          <nav
            ref={scrollRef}
            onScroll={checkScrollability}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full py-1 snap-x snap-mandatory"
          >
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-display text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 snap-start cursor-pointer select-none ${
                    isActive
                      ? "text-[#1c1b19] font-bold"
                      : "text-[#6b665c] hover:text-[#1c1b19] hover:bg-white/60"
                  }`}
                >
                  {/* Animated Active Pill Background using motion */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-white border border-[#d9d4c8] rounded-xl shadow-xs -z-0"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  <span className={`relative z-10 transition-colors ${isActive ? "text-[#0f7a52]" : ""}`}>
                    {item.icon}
                  </span>

                  <span className="relative z-10">{item.label}</span>

                  {/* Badge info */}
                  {item.badge !== undefined && (
                    <span
                      className={`relative z-10 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-current/10 ${
                        isActive
                          ? "bg-[#0f7a52]/10 text-[#0f7a52]"
                          : item.badgeColor || "bg-[#d9d4c8]/50 text-[#6b665c]"
                      }`}
                    >
                      {item.pulse && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f7a52] animate-ping" />
                      )}
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Edge Gradient Blur */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f7f3ea] to-transparent pointer-events-none z-5" />
          )}

          {/* Scroll Right Button Indicator */}
          {canScrollRight && (
            <button
              type="button"
              onClick={handleScrollRight}
              className="absolute right-0 z-10 p-1 bg-white/90 hover:bg-white text-[#1c1b19] border border-[#d9d4c8] rounded-full shadow-md backdrop-blur-xs transition-opacity cursor-pointer"
              title="Scroll tabs right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
