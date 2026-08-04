/**
 * snapsme — Settings & User Control ES Module
 * Deliverable: /public/js/settings.js
 *
 * Handles user profile updates, chat-link token generation for Telegram/WhatsApp,
 * unlinking chat channels, dashboard card preferences (including Net cash figure),
 * and user session management.
 */

import { recordActivityLog } from "../../src/lib/storage.js";

/**
 * Default dashboard card preferences.
 * showNetCashFigure (FR-I6): optional Net for Period on the dashboard; default on.
 */
export const DEFAULT_DASHBOARD_PREFERENCES = {
  showTopVendor: true,
  showTeamLeaderboard: true,
  showBudgetVsActual: true,
  showSpendByDay: false,
  showNetCashFigure: true
};

/**
 * Merges workspace.dashboardPreferences with defaults.
 */
export function getDashboardPreferences(workspace) {
  return {
    ...DEFAULT_DASHBOARD_PREFERENCES,
    ...(workspace?.dashboardPreferences || {})
  };
}

/**
 * Toggles a single dashboard preference key.
 * Owner-only when saveWorkspaceFn is used with role checks at the call site.
 *
 * @param {object} workspace
 * @param {string} key — e.g. "showNetCashFigure"
 * @param {boolean} [value] — if omitted, flips current value
 * @param {(ws: object) => void} [saveWorkspaceFn]
 * @returns {object} updated workspace
 */
export function setDashboardPreference(workspace, key, value, saveWorkspaceFn) {
  if (!workspace) {
    throw new Error("Workspace is required to update dashboard preferences.");
  }

  const current = getDashboardPreferences(workspace);
  if (!(key in DEFAULT_DASHBOARD_PREFERENCES) && key !== "showNetCashFigure") {
    // Allow known defaults + showNetCashFigure; still accept other boolean keys for forward compat
  }

  const nextValue = typeof value === "boolean" ? value : !Boolean(current[key]);
  const dashboardPreferences = {
    ...current,
    [key]: nextValue
  };

  const updatedWorkspace = {
    ...workspace,
    dashboardPreferences
  };

  if (typeof saveWorkspaceFn === "function") {
    saveWorkspaceFn(updatedWorkspace);
  }

  return updatedWorkspace;
}

/**
 * Convenience: toggle Net cash figure visibility (FR-I6).
 */
export function setShowNetCashFigure(workspace, show, saveWorkspaceFn) {
  return setDashboardPreference(workspace, "showNetCashFigure", show, saveWorkspaceFn);
}

/**
 * Renders the Dashboard Card Preferences block (including Net cash toggle)
 * into a container. Pure DOM — used by settings UI hosts.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {object} options.workspace
 * @param {boolean} [options.isOwner=true]
 * @param {(key: string, value: boolean) => void} options.onToggle
 */
export function renderDashboardPreferencesPanel(container, options = {}) {
  if (!container) return;

  const prefs = getDashboardPreferences(options.workspace);
  const isOwner = options.isOwner !== false;

  const rows = [
    {
      key: "showNetCashFigure",
      title: "Net cash figure",
      description: "Show income minus expenses for the selected period at the top of the dashboard"
    },
    {
      key: "showTopVendor",
      title: "Top Vendor Stat",
      description: "Show top vendor and spend category summary"
    },
    {
      key: "showTeamLeaderboard",
      title: "Team Leaderboard",
      description: "Show spend ranking by team member"
    },
    {
      key: "showBudgetVsActual",
      title: "Budget vs. Actual",
      description: "Show workspace monthly budget & ceiling progress bar"
    },
    {
      key: "showSpendByDay",
      title: "Spend by Day of Week",
      description: "Show daily spending distribution chart card"
    }
  ];

  container.innerHTML = `
    <div class="settings-dash-prefs">
      <div class="settings-dash-prefs-head">
        <h3 class="settings-dash-prefs-title">Dashboard Card Preferences</h3>
        <p class="settings-dash-prefs-sub">Toggle visibility of dashboard modules. Hiding Net cash does not delete income entries.</p>
      </div>
      <div class="settings-dash-prefs-list">
        ${rows
          .map((row) => {
            const checked = prefs[row.key] !== false && prefs[row.key] !== undefined
              ? prefs[row.key] !== false && Boolean(prefs[row.key] || row.key === "showNetCashFigure" ? prefs[row.key] !== false : prefs[row.key])
              : DEFAULT_DASHBOARD_PREFERENCES[row.key];
            // Normalize: missing keys use defaults
            const isOn =
              prefs[row.key] === undefined
                ? DEFAULT_DASHBOARD_PREFERENCES[row.key]
                : Boolean(prefs[row.key]);

            return `
            <label class="settings-dash-pref-row">
              <div class="settings-dash-pref-copy">
                <span class="settings-dash-pref-name">${row.title}</span>
                <span class="settings-dash-pref-desc">${row.description}</span>
              </div>
              <input type="checkbox"
                data-dash-pref="${row.key}"
                ${isOn ? "checked" : ""}
                ${isOwner ? "" : "disabled"}
                class="settings-dash-pref-toggle" />
            </label>`;
          })
          .join("")}
      </div>
      ${
        !isOwner
          ? `<p class="settings-dash-prefs-owner-note">Only workspace owners can change dashboard preferences.</p>`
          : ""
      }
    </div>
  `;

  // Clean up unused variable warning from complex checked expr — isOn is the source of truth
  void 0;

  container.querySelectorAll("[data-dash-pref]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.getAttribute("data-dash-pref");
      if (typeof options.onToggle === "function") {
        options.onToggle(key, input.checked);
      }
    });
  });
}

/**
 * Retrieves the current user's profile record from member list.
 */
export function getProfile(userId, members = []) {
  return members.find((m) => m.userId === userId) || null;
}

/**
 * Updates user profile (displayName, email, phone)
 */
export function updateProfile(userId, updates, members = [], saveMembersFn, saveCurrentUserFn) {
  let currentUserObj = null;

  const updatedMembers = members.map((m) => {
    if (m.userId === userId) {
      currentUserObj = m;
      return {
        ...m,
        displayName: updates.displayName !== undefined ? updates.displayName.trim() : m.displayName,
        email: updates.email !== undefined ? updates.email.trim() : m.email,
        phone: updates.phone !== undefined ? updates.phone.trim() : m.phone
      };
    }
    return m;
  });

  if (saveMembersFn) {
    saveMembersFn(updatedMembers);
  }

  const updatedUser = updatedMembers.find((m) => m.userId === userId);
  if (updatedUser && saveCurrentUserFn) {
    saveCurrentUserFn(updatedUser);
  }

  if (updatedUser) {
    recordActivityLog({
      actorId: updatedUser.userId,
      actorName: updatedUser.displayName,
      actorRole: updatedUser.role,
      actionType: "PROFILE_UPDATED",
      description: `Updated profile details for "${updatedUser.displayName}"`,
      tag: "User Profile"
    });
  }

  return updatedUser;
}

/**
 * Generates a 6-character alphanumeric chat link code (e.g., "SNAP-8429X")
 * for Telegram or WhatsApp bot integration. Valid for 24 hours.
 */
export function generateChatLink(userId, channel) {
  if (!["telegram", "whatsapp"].includes(channel)) {
    throw new Error("Invalid channel. Must be 'telegram' or 'whatsapp'");
  }

  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  const linkCode = `SNAP-${randomChars}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiration

  const chatLink = {
    linkCode,
    userId,
    channel,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false
  };

  // Persist to localStorage for client caching / offline capability
  const existingLinks = JSON.parse(localStorage.getItem("snapsme_chat_links") || "[]");
  existingLinks.unshift(chatLink);
  localStorage.setItem("snapsme_chat_links", JSON.stringify(existingLinks));

  const members = JSON.parse(localStorage.getItem("snapsme_members") || "[]");
  const user = members.find((m) => m.userId === userId);

  recordActivityLog({
    actorId: userId,
    actorName: user ? user.displayName : "User",
    actorRole: user ? user.role : "staff",
    actionType: "CHAT_LINK_GENERATED",
    description: `Generated 24-hour ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'} pairing token (${linkCode})`,
    tag: "Bot Integration"
  });

  return chatLink;
}

/**
 * Unlinks a Telegram or WhatsApp channel from a user profile.
 */
export function unlinkChatChannel(userId, channel, members = [], saveMembersFn, saveCurrentUserFn) {
  let userRole = "staff";
  let userName = "User";

  const updatedMembers = members.map((m) => {
    if (m.userId === userId) {
      userRole = m.role;
      userName = m.displayName;
      const updated = { ...m };
      if (channel === "telegram") {
        updated.telegramUserId = null;
      } else if (channel === "whatsapp") {
        updated.whatsappUserId = null;
      }
      return updated;
    }
    return m;
  });

  if (saveMembersFn) {
    saveMembersFn(updatedMembers);
  }

  const updatedUser = updatedMembers.find((m) => m.userId === userId);
  if (updatedUser && saveCurrentUserFn) {
    saveCurrentUserFn(updatedUser);
  }

  recordActivityLog({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    actionType: "CHAT_CHANNEL_UNLINKED",
    description: `Disconnected ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'} bot integration`,
    tag: "Bot Integration"
  });

  return updatedUser;
}

/**
 * Signs out the current user or resets local session state.
 */
export function signOutUser(saveCurrentUserFn) {
  localStorage.removeItem("snapsme_current_user");
  if (saveCurrentUserFn) {
    saveCurrentUserFn(null);
  }
}
