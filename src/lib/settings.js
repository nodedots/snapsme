/**
 * snapsme — Settings & User Control ES Module
 * Deliverable: /public/js/settings.js
 * 
 * Handles user profile updates, chat-link token generation for Telegram/WhatsApp,
 * unlinking chat channels, and user session management.
 */

import { recordActivityLog } from "./storage.js";
import { auth } from "./firebase.js";
import { signOut } from "firebase/auth";

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
 * Signs out quickly: clear local session immediately, race Firebase signOut
 * against a short timeout, then navigate home. Avoids hanging on slow network.
 */
export async function signOutUser(saveCurrentUserFn) {
  // 1) Instant local clear so UI never looks stuck
  try {
    localStorage.removeItem("snapsme_current_user");
  } catch (_) {
    /* ignore */
  }
  if (typeof saveCurrentUserFn === "function") {
    try {
      saveCurrentUserFn(null);
    } catch (_) {
      /* ignore */
    }
  }

  // 2) Best-effort Firebase sign-out, never wait more than ~350ms
  try {
    if (auth) {
      await Promise.race([
        signOut(auth).catch((e) => {
          console.warn("Firebase signout error:", e);
        }),
        new Promise((resolve) => setTimeout(resolve, 350))
      ]);
    }
  } catch (e) {
    console.warn("Firebase signout error:", e);
  }

  // 3) Hard navigate to landing (replace avoids back-button into a signed-in shell)
  window.location.replace("/");
}
