/**
 * snapsme — Settings & User Control ES Module
 * Deliverable: /public/js/settings.js
 * 
 * Handles user profile updates, chat-link token generation for Telegram/WhatsApp,
 * unlinking chat channels, and user session management.
 */

import { recordActivityLog } from "../../src/lib/storage.js";

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
