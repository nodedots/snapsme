import { createBusinessWorkspace, inviteMember } from "./workspace.js";
import { recordActivityLog, saveCategories } from "../../src/lib/storage.js";

export const BUSINESS_TYPES = [
  {
    id: "retail",
    name: "Retail",
    description: "Physical or online storefronts, inventory, and merchandise",
    defaultCategories: [
      { name: "Inventory & Stock", budget: 600 },
      { name: "Fuel & Transport", budget: 400 },
      { name: "Rent & Utilities", budget: 800 },
      { name: "Marketing", budget: 300 },
      { name: "Equipment & Supplies", budget: 500 }
    ]
  },
  {
    id: "services",
    name: "Services",
    description: "Agencies, professional service firms, and client work",
    defaultCategories: [
      { name: "Fuel & Transport", budget: 500 },
      { name: "Office Supplies", budget: 300 },
      { name: "Client Entertainment", budget: 400 },
      { name: "Software & Subscriptions", budget: 350 },
      { name: "Equipment", budget: 600 }
    ]
  },
  {
    id: "food_beverage",
    name: "Food & Beverage",
    description: "Restaurants, cafes, food trucks, and catering services",
    defaultCategories: [
      { name: "Ingredients & Supplies", budget: 1000 },
      { name: "Fuel & Transport", budget: 350 },
      { name: "Equipment & Maintenance", budget: 500 },
      { name: "Utilities", budget: 600 },
      { name: "Packaging", budget: 400 }
    ]
  },
  {
    id: "construction",
    name: "Construction",
    description: "Contractors, trade services, build projects, and sites",
    defaultCategories: [
      { name: "Materials", budget: 1200 },
      { name: "Fuel & Transport", budget: 700 },
      { name: "Equipment & Tools", budget: 800 },
      { name: "Labor/Contractor Payments", budget: 1500 },
      { name: "Permits & Fees", budget: 300 }
    ]
  },
  {
    id: "freelance",
    name: "Freelance/Consulting",
    description: "Solo operators, consultants, and independent contractors",
    defaultCategories: [
      { name: "Software & Subscriptions", budget: 300 },
      { name: "Fuel & Transport", budget: 250 },
      { name: "Office Supplies", budget: 200 },
      { name: "Client Entertainment", budget: 350 },
      { name: "Equipment", budget: 500 }
    ]
  },
  {
    id: "other",
    name: "Other",
    description: "General business operations or custom category setup",
    defaultCategories: [
      { name: "General Supplies", budget: 400 },
      { name: "Fuel & Transport", budget: 400 },
      { name: "Equipment", budget: 500 },
      { name: "Utilities", budget: 400 },
      { name: "Miscellaneous", budget: 300 }
    ]
  }
];

/**
 * Returns pre-populated category records for a selected business type.
 */
export function getPresetCategoriesForBusinessType(businessTypeId, businessId = "biz_default") {
  const matched = BUSINESS_TYPES.find((b) => b.id === businessTypeId);
  if (!matched || !matched.defaultCategories) return [];

  const now = new Date().toISOString();
  return matched.defaultCategories.map((c, index) => ({
    id: `cat_${businessTypeId}_${index + 1}_${Date.now()}`,
    businessId,
    name: c.name,
    budget: c.budget,
    createdAt: now
  }));
}

/**
 * Validates Step 1 Signup Form inputs.
 * Password is required and must be explicitly provided.
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

  if (!password || password.length < 6) {
    throw new Error("Password is required and must be at least 6 characters long.");
  }

  return {
    displayName: displayName.trim(),
    email: isEmail ? trimmed : null,
    phone: isPhone ? trimmed : null,
    password: password
  };
}

/**
 * Validates Sign In Form inputs (Lighter validation, no password strength rule).
 */
export function validateSignIn({ emailOrPhone, password }) {
  if (!emailOrPhone || !emailOrPhone.trim()) {
    throw new Error("Please enter your email address or phone number.");
  }

  const trimmed = emailOrPhone.trim();
  const isEmail = trimmed.includes("@") && trimmed.includes(".");
  const isPhone = /^[+\d\s-]{7,18}$/.test(trimmed);

  if (!isEmail && !isPhone) {
    throw new Error("Please enter a valid email address or phone number.");
  }

  if (!password) {
    throw new Error("Please enter your password.");
  }

  return {
    email: isEmail ? trimmed : null,
    phone: isPhone ? trimmed : null,
    password: password
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
 * Gets the current resumable onboarding step from local storage.
 */
export function getResumableOnboardingStep() {
  try {
    const isCompleted = localStorage.getItem("snapsme_onboarding_completed") === "true";
    if (isCompleted) return 5;
    const step = localStorage.getItem("snapsme_onboarding_step");
    return step ? parseInt(step, 10) : 1;
  } catch (e) {
    return 1;
  }
}

/**
 * Saves current onboarding step to local storage for crash/browser-close resilience.
 */
export function saveOnboardingStepProgress(stepNumber) {
  try {
    localStorage.setItem("snapsme_onboarding_step", String(stepNumber));
  } catch (e) {}
}

/**
 * Modular Step 1: Create Owner User Record
 */
export function createOwnerAccountStep({ signUpData, saveCurrentUserFn }) {
  const ownerUserId = signUpData.userId || `usr_owner_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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

  if (saveCurrentUserFn) saveCurrentUserFn(ownerUser);
  saveOnboardingStepProgress(2);
  return ownerUser;
}

/**
 * Modular Step 2: Create Business Workspace & Owner Member
 */
export function createWorkspaceStep({ ownerUser, workspaceData, saveWorkspaceFn, saveMembersFn, saveCurrentUserFn }) {
  const extendedWorkspaceData = {
    ...workspaceData,
    brand: {
      logoUrl: null,
      accentColor: "#0f7a52"
    },
    dashboardPreferences: {
      showTopVendor: true,
      showTeamLeaderboard: true,
      showBudgetVsActual: true,
      showSpendByDay: false
    }
  };

  const result = createBusinessWorkspace(
    ownerUser,
    extendedWorkspaceData,
    saveWorkspaceFn,
    saveMembersFn,
    saveCurrentUserFn
  );

  saveOnboardingStepProgress(3);
  return result;
}

/**
 * Modular Step 3: Apply Business Type Template Categories
 */
export function applyBusinessTypeStep({ businessType, workspaceId, saveCategoriesFn }) {
  let createdCategories = [];
  if (businessType) {
    createdCategories = getPresetCategoriesForBusinessType(businessType, workspaceId || "biz_default");
    if (saveCategoriesFn) {
      saveCategoriesFn(createdCategories);
    } else {
      saveCategories(createdCategories);
    }
  }
  saveOnboardingStepProgress(4);
  return createdCategories;
}

/**
 * Modular Step 4: Invite Staff Members
 */
export function inviteStaffStep({ staffInvites = [], currentMembers = [], ownerMember, saveMembersFn }) {
  let updatedMembers = [...currentMembers];
  if (staffInvites && staffInvites.length > 0) {
    staffInvites.forEach((invite) => {
      try {
        inviteMember(
          updatedMembers,
          {
            email: invite.email,
            phone: invite.phone,
            displayName: invite.displayName
          },
          ownerMember,
          (newMemberList) => {
            updatedMembers = newMemberList;
            if (saveMembersFn) saveMembersFn(newMemberList);
          }
        );
      } catch (err) {
        console.warn("Skipped inviting staff member:", err.message);
      }
    });
  }

  saveOnboardingStepProgress(5);
  try {
    localStorage.setItem("snapsme_onboarding_completed", "true");
  } catch (e) {}

  return updatedMembers;
}

/**
 * Executes full onboarding pipeline sequentially (preserves backward compatibility).
 */
export function executeOnboardingPipeline(
  { signUpData, workspaceData, businessType = null, staffInvites = [] },
  { saveWorkspaceFn, saveMembersFn, saveCurrentUserFn, saveCategoriesFn }
) {
  // Step 1: Owner User
  const ownerUser = createOwnerAccountStep({ signUpData, saveCurrentUserFn });

  // Step 2: Workspace Creation
  const { workspace, ownerMember } = createWorkspaceStep({
    ownerUser,
    workspaceData,
    saveWorkspaceFn,
    saveMembersFn,
    saveCurrentUserFn
  });

  // Step 3: Categories
  const createdCategories = applyBusinessTypeStep({
    businessType,
    workspaceId: workspace.businessId || workspace.id,
    saveCategoriesFn
  });

  // Step 4: Staff Invites
  const finalMembers = inviteStaffStep({
    staffInvites,
    currentMembers: [ownerMember],
    ownerMember,
    saveMembersFn
  });

  // Step 5: Audit Log
  recordActivityLog({
    actorId: ownerMember.userId,
    actorName: ownerMember.displayName,
    actorRole: "owner",
    actionType: "ONBOARDING_COMPLETED",
    description: `Completed business onboarding for "${workspace.name}" (${businessType || "Custom"}) with ${finalMembers.length} member(s) & ${createdCategories.length} category template(s)`,
    tag: "Workspace Config"
  });

  return {
    workspace,
    ownerMember,
    members: finalMembers,
    categories: createdCategories
  };
}
