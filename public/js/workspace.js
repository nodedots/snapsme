/**
 * snapsme — Workspace & Team Control ES Module
 * Deliverable: /public/js/workspace.js
 * 
 * Handles owner-only workspace configuration, team member invitation & revocation,
 * category budget limits, and role permission validation.
 */

import { recordActivityLog } from "../../src/lib/storage.js";

/**
 * Creates a new business workspace document and initial owner member record.
 * Matching Firestore schema:
 * businesses/{businessId}: { name, createdAt, ownerUid, currency }
 * businesses/{businessId}/members/{userId}: { role: "owner", displayName, email, phone, invitedAt, joinedAt }
 */
export function createBusinessWorkspace(ownerUser, { name, currency = "USD" }, saveWorkspaceFn, saveMembersFn, saveCurrentUserFn) {
  if (!name || !name.trim()) {
    throw new Error("Business name is required to create a workspace.");
  }

  const businessId = `biz_${Date.now()}`;
  const now = new Date().toISOString();

  const workspaceDoc = {
    businessId,
    name: name.trim(),
    createdAt: now,
    ownerUid: ownerUser.userId || ownerUser.uid,
    currency: currency.trim().toUpperCase()
  };

  const ownerMemberDoc = {
    userId: ownerUser.userId || ownerUser.uid,
    role: "owner",
    displayName: ownerUser.displayName || ownerUser.name || "Owner",
    email: ownerUser.email || null,
    phone: ownerUser.phone || null,
    telegramUserId: ownerUser.telegramUserId || null,
    whatsappUserId: ownerUser.whatsappUserId || null,
    invitedAt: now,
    joinedAt: now
  };

  if (saveWorkspaceFn) {
    saveWorkspaceFn(workspaceDoc);
  }

  if (saveMembersFn) {
    saveMembersFn([ownerMemberDoc]);
  }

  if (saveCurrentUserFn) {
    saveCurrentUserFn(ownerMemberDoc);
  }

  recordActivityLog({
    actorId: ownerMemberDoc.userId,
    actorName: ownerMemberDoc.displayName,
    actorRole: "owner",
    actionType: "WORKSPACE_CREATED",
    description: `Created new business workspace "${workspaceDoc.name}" (${workspaceDoc.currency})`,
    tag: "Workspace Config"
  });

  return { workspace: workspaceDoc, ownerMember: ownerMemberDoc };
}

/**
 * Checks whether the given user has owner permissions.
 */
export function isOwner(currentUser) {
  return Boolean(currentUser && currentUser.role === "owner");
}

/**
 * Updates workspace settings (name, default currency).
 * Owner-only capability.
 */
export function updateWorkspace(workspace, updates, currentUser, saveWorkspaceFn) {
  if (!isOwner(currentUser)) {
    throw new Error("Access Denied: Only workspace owners can modify workspace settings.");
  }

  const updatedWorkspace = {
    ...workspace,
    name: updates.name !== undefined ? updates.name.trim() : workspace.name,
    currency: updates.currency !== undefined ? updates.currency.trim().toUpperCase() : workspace.currency
  };

  if (saveWorkspaceFn) {
    saveWorkspaceFn(updatedWorkspace);
  }

  recordActivityLog({
    actorId: currentUser?.userId,
    actorName: currentUser?.displayName || "Owner",
    actorRole: currentUser?.role || "owner",
    actionType: "WORKSPACE_UPDATED",
    description: `Updated workspace configuration (Name: "${updatedWorkspace.name}", Currency: ${updatedWorkspace.currency})`,
    tag: "Workspace Config"
  });

  return updatedWorkspace;
}

/**
 * Invites a staff member by email or phone.
 * Writes to member collection with role: "staff", invitedAt: timestamp, joinedAt: null.
 * Owner-only capability.
 */
export function inviteMember(members = [], { email = null, phone = null, displayName = null }, currentUser, saveMembersFn) {
  if (!isOwner(currentUser)) {
    throw new Error("Access Denied: Only workspace owners can invite team members.");
  }

  if (!email && !phone) {
    throw new Error("Please provide at least an email or phone number to invite.");
  }

  const newMemberId = `usr_${Date.now()}`;
  const now = new Date().toISOString();

  const nameToUse = displayName && displayName.trim() ? displayName.trim() : (email || phone);

  const newMember = {
    userId: newMemberId,
    role: "staff",
    displayName: nameToUse,
    email: email ? email.trim() : null,
    phone: phone ? phone.trim() : null,
    telegramUserId: null,
    whatsappUserId: null,
    invitedAt: now,
    joinedAt: null
  };

  const updatedMembers = [...members, newMember];

  if (saveMembersFn) {
    saveMembersFn(updatedMembers);
  }

  recordActivityLog({
    actorId: currentUser?.userId,
    actorName: currentUser?.displayName || "Owner",
    actorRole: currentUser?.role || "owner",
    actionType: "MEMBER_INVITED",
    description: `Invited team member "${nameToUse}" (${email || phone}) as Staff`,
    tag: "Member Invitation"
  });

  return newMember;
}

/**
 * Revokes an invitation or removes a staff member from the workspace.
 * Owner-only capability.
 */
export function removeMember(members = [], targetUserId, currentUser, saveMembersFn) {
  if (!isOwner(currentUser)) {
    throw new Error("Access Denied: Only workspace owners can remove team members.");
  }

  const targetMember = members.find((m) => m.userId === targetUserId);
  if (!targetMember) {
    throw new Error("Member not found.");
  }

  if (targetMember.role === "owner") {
    throw new Error("Cannot remove the primary workspace owner.");
  }

  const updatedMembers = members.filter((m) => m.userId !== targetUserId);

  if (saveMembersFn) {
    saveMembersFn(updatedMembers);
  }

  recordActivityLog({
    actorId: currentUser?.userId,
    actorName: currentUser?.displayName || "Owner",
    actorRole: currentUser?.role || "owner",
    actionType: "MEMBER_REMOVED",
    description: `Removed staff member "${targetMember.displayName}" from workspace`,
    tag: "Member Removal"
  });

  return updatedMembers;
}

/**
 * Adds a new expense category with an optional budget limit.
 * Owner-only capability.
 */
export function addCategory(categories = [], { name, budget = null }, currentUser, saveCategoriesFn) {
  if (!isOwner(currentUser)) {
    throw new Error("Access Denied: Only workspace owners can manage categories.");
  }

  if (!name || !name.trim()) {
    throw new Error("Category name is required.");
  }

  const newCategoryId = `cat_${Date.now()}`;
  const budgetNum = budget !== null && budget !== "" ? Number(budget) : null;
  const newCategory = {
    id: newCategoryId,
    name: name.trim(),
    budget: budgetNum
  };

  const updatedCategories = [...categories, newCategory];

  if (saveCategoriesFn) {
    saveCategoriesFn(updatedCategories);
  }

  recordActivityLog({
    actorId: currentUser?.userId,
    actorName: currentUser?.displayName || "Owner",
    actorRole: currentUser?.role || "owner",
    actionType: "CATEGORY_CREATED",
    description: `Created new category "${newCategory.name}"${budgetNum ? ` with $${budgetNum}/mo budget` : ''}`,
    tag: "Category Change"
  });

  return updatedCategories;
}

/**
 * Updates an existing category's name and budget limit.
 * Owner-only capability.
 */
export function updateCategory(categories = [], categoryId, { name, budget }, currentUser, saveCategoriesFn) {
  if (!isOwner(currentUser)) {
    throw new Error("Access Denied: Only workspace owners can manage categories.");
  }

  let updatedCatName = "";
  let updatedCatBudget = null;

  const updatedCategories = categories.map((cat) => {
    if (cat.id === categoryId) {
      updatedCatName = name !== undefined ? name.trim() : cat.name;
      updatedCatBudget = budget !== undefined ? (budget !== null && budget !== "" ? Number(budget) : null) : cat.budget;
      return {
        ...cat,
        name: updatedCatName,
        budget: updatedCatBudget
      };
    }
    return cat;
  });

  if (saveCategoriesFn) {
    saveCategoriesFn(updatedCategories);
  }

  recordActivityLog({
    actorId: currentUser?.userId,
    actorName: currentUser?.displayName || "Owner",
    actorRole: currentUser?.role || "owner",
    actionType: "CATEGORY_UPDATED",
    description: `Updated category "${updatedCatName}"${updatedCatBudget ? ` budget to $${updatedCatBudget}/mo` : ''}`,
    tag: "Category Change"
  });

  return updatedCategories;
}

/**
 * Deletes a category.
 * Owner-only capability.
 */
export function deleteCategory(categories = [], categoryId, currentUser, saveCategoriesFn) {
  if (!isOwner(currentUser)) {
    throw new Error("Access Denied: Only workspace owners can delete categories.");
  }

  const targetCat = categories.find((c) => c.id === categoryId);
  const updatedCategories = categories.filter((cat) => cat.id !== categoryId);

  if (saveCategoriesFn) {
    saveCategoriesFn(updatedCategories);
  }

  if (targetCat) {
    recordActivityLog({
      actorId: currentUser?.userId,
      actorName: currentUser?.displayName || "Owner",
      actorRole: currentUser?.role || "owner",
      actionType: "CATEGORY_DELETED",
      description: `Deleted category "${targetCat.name}"`,
      tag: "Category Change"
    });
  }

  return updatedCategories;
}
