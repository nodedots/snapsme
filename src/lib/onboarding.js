/**
 * snapsme — Business Onboarding Flow ES Module
 * Deliverable: /public/js/onboarding.js
 * 
 * Handles multi-step onboarding flow logic (Auth signup, business workspace creation,
 * optional staff invitations, and handoff to main app).
 */

import { createBusinessWorkspace, inviteMember } from "./workspace.js";
import { recordActivityLog } from "../../src/lib/storage.js";

/**
 * Validates Step 1 Signup Form inputs.
 */
export function validateSignUp({ displayName, emailOrPhone, password }) {
  if (!displayName || !displayName.trim()) {
    throw new Error("Please enter your full name.");
  }

  if (!emailOrPhone || !emailOrPhone.trim()) {
    throw new Error("Please enter a valid email address or phone number.");
  }

  const trimmed = emailOrPhone.trim();
  const isEmail = trimmed.includes("@") && trimmed.includes(".");
  const isPhone = /^[+\d\s-]{7,18}$/.test(trimmed);

  if (!isEmail && !isPhone) {
    throw new Error("Please enter a valid email address (e.g., owner@acme.com) or phone number (+1 555-0192).");
  }

  if (password && password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  return {
    displayName: displayName.trim(),
    email: isEmail ? trimmed : null,
    phone: isPhone ? trimmed : null,
    password: password || "password123"
  };
}

/**
 * Validates Step 2 Workspace Creation inputs.
 */
export function validateWorkspaceInfo({ name, currency }) {
  if (!name || !name.trim()) {
    throw new Error("Please enter your Business or Team name.");
  }

  if (!currency || !currency.trim()) {
    throw new Error("Please select a default accounting currency.");
  }

  return {
    name: name.trim(),
    currency: currency.trim().toUpperCase()
  };
}

/**
 * Validates Step 3 Staff Invite item.
 */
export function validateStaffInvite({ email, phone, displayName }) {
  const trimmedEmail = email ? email.trim() : null;
  const trimmedPhone = phone ? phone.trim() : null;

  if (!trimmedEmail && !trimmedPhone) {
    throw new Error("Please provide at least an email or phone number for the team member.");
  }

  if (trimmedEmail && (!trimmedEmail.includes("@") || !trimmedEmail.includes("."))) {
    throw new Error("Invalid staff email address format.");
  }

  if (trimmedPhone && !/^[+\d\s-]{7,18}$/.test(trimmedPhone)) {
    throw new Error("Invalid staff phone number format.");
  }

  return {
    displayName: displayName ? displayName.trim() : null,
    email: trimmedEmail,
    phone: trimmedPhone
  };
}

/**
 * Executes full onboarding pipeline:
 * 1. Simulates/Creates Auth User
 * 2. Writes businesses/{businessId} & members/{userId} (role: owner)
 * 3. Writes optional staff members
 * 4. Records audit log
 */
export function executeOnboardingPipeline(
  { signUpData, workspaceData, staffInvites = [] },
  { saveWorkspaceFn, saveMembersFn, saveCurrentUserFn }
) {
  // Step 1: Create Owner User
  const ownerUserId = `usr_owner_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const ownerUser = {
    userId: ownerUserId,
    role: "owner",
    displayName: signUpData.displayName,
    email: signUpData.email,
    phone: signUpData.phone,
    telegramUserId: null,
    whatsappUserId: null,
    joinedAt: new Date().toISOString()
  };

  // Step 2: Create Business Workspace & Owner Member
  const { workspace, ownerMember } = createBusinessWorkspace(
    ownerUser,
    workspaceData,
    saveWorkspaceFn,
    saveMembersFn,
    saveCurrentUserFn
  );

  let currentMembers = [ownerMember];

  // Step 3: Invite Staff Members if provided
  if (staffInvites && staffInvites.length > 0) {
    staffInvites.forEach((invite) => {
      try {
        const invited = inviteMember(
          currentMembers,
          {
            email: invite.email,
            phone: invite.phone,
            displayName: invite.displayName
          },
          ownerMember,
          (updatedMembers) => {
            currentMembers = updatedMembers;
            if (saveMembersFn) saveMembersFn(updatedMembers);
          }
        );
      } catch (err) {
        console.warn("Skipped inviting staff member:", err.message);
      }
    });
  }

  // Step 4: Record Completion Log
  recordActivityLog({
    actorId: ownerMember.userId,
    actorName: ownerMember.displayName,
    actorRole: "owner",
    actionType: "ONBOARDING_COMPLETED",
    description: `Completed business onboarding for "${workspace.name}" with ${currentMembers.length} initial team member(s)`,
    tag: "Workspace Config"
  });

  return {
    workspace,
    ownerMember,
    members: currentMembers
  };
}
