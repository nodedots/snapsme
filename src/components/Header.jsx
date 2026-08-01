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
  Settings
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-3 pb-2 space-y-3">
        {/* Top Control Bar: Brand + Workspace + Profile & Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Workspace Info */}
          <div className="flex items-center gap-3">
            <a
              href="/home"
              className="flex items-center gap-2 cursor-pointer group no-underline"
              title="Go to SnapSME Marketing Homepage"
            >
              <div className="w-8 h-8 bg-[#0075de] text-white flex items-center justify-center rounded-lg overflow-hidden shadow-xs group-hover:scale-105 transition-transform">
                <img src="/logo.jpg" alt="SnapSME Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-display font-bold text-xl tracking-tight text-[#000000]">
                  Snap<span className="text-[#0075de]">SME</span>
                </span>
                <p className="text-[10px] text-[#757575] font-medium tracking-wider uppercase -mt-1 hidden sm:block">
                  Team Expense Capture
                </p>
              </div>
            </a>

            <div className="h-5 w-[1px] bg-black/10 hidden sm:block mx-1" />

            {/* Workspace badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white border border-black/10 px-2.5 py-1 rounded-lg text-xs font-medium text-[#000000]">
              <Building2 className="w-3.5 h-3.5 text-[#0075de]" />
              <span className="truncate max-w-[140px] md:max-w-[190px]">{workspace.name}</span>
            </div>
          </div>

          {/* Right Action Controls: Offline Switch + User Dropdown + Primary CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Offline simulator toggle */}
            <button
              type="button"
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title={isOfflineMode ? "Click to switch back Online" : "Click to test Offline mode"}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                isOfflineMode
                  ? "bg-[#ffb110]/20 text-[#000000] border-[#ffb110]"
                  : "bg-white text-[#0075de] border-black/10 hover:border-[#0075de]"
              }`}
            >
              {isOfflineMode ? (
                <WifiOff className="w-3.5 h-3.5 text-[#e32d14]" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-[#0075de]" />
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

            {/* User Profile Selector with Avatar Pill */}
            <div className="relative flex items-center bg-white border border-black/10 rounded-lg p-1">
              <div
                className={`w-6 h-6 rounded-md text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                  currentUser.role === "owner" ? "bg-[#0075de]" : "bg-[#111111]"
                }`}
              >
                {getInitials(currentUser.displayName)}
              </div>
              <select
                value={currentUser.userId}
                onChange={(e) => {
                  const found = members.find((m) => m.userId === e.target.value);
                  if (found) setCurrentUser(found);
                }}
                className="bg-transparent border-none text-xs font-semibold text-[#000000] pr-1 pl-1.5 focus:outline-none cursor-pointer max-w-[100px] sm:max-w-[130px] truncate"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName} ({m.role === "owner" ? "Owner" : "Member"})
                  </option>
                ))}
              </select>
            </div>

            {/* Create Workspace / Onboarding Button */}
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
              className="flex items-center gap-1.5 sm:gap-2 bg-[#0075de] hover:bg-[#0060b8] text-white font-medium text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Expense</span>
            </button>
          </div>
        </div>

        {/* Scrolling Navigation Track Section */}
        <div className="relative flex items-center pt-1 border-t border-[#d9d4c8]/60">
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
