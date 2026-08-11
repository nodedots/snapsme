/**
 * SnapSME — Firestore Data Layer
 *
 * Centralizes all Firestore reads/writes for the React app.
 * - Subscribes to real-time snapshots (onSnapshot) for workspace, members,
 *   categories, and expenses scoped to the signed-in user's business.
 * - Session restore uses the users/{uid} indirection pattern (single doc read,
 *   no composite index / collection-group query required).
 *
 * Data model (matches firestore.rules):
 *   users/{uid}                                   -> { businessId, role, displayName, email }
 *   businesses/{businessId}                       -> workspace doc
 *   businesses/{businessId}/members/{userId}      -> member doc (doc ID == userId, also stores userId field)
 *   businesses/{businessId}/categories/{categoryId} -> category doc
 *   businesses/{businessId}/expenses/{expenseId}  -> expense doc
 */
import { db, auth } from "./firebase.js";
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Safety cap for live expense/income listeners.
 * Small teams rarely exceed a few hundred rows; unbounded listeners would
 * transfer multi-year history on every dashboard open. Raise or add
 * cursor pagination if a workspace regularly exceeds this.
 */
export const FEED_QUERY_LIMIT = 500;

// ---------------------------------------------------------------------------
// Auth session helpers
// ---------------------------------------------------------------------------

/**
 * Subscribes to Firebase Auth state changes.
 * @param {(user: object|null) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/**
 * Returns the currently signed-in Firebase user (or null).
 */
export function getCurrentFirebaseUser() {
  return auth.currentUser;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const userDoc = (uid) => doc(db, "users", uid);
const businessDoc = (businessId) => doc(db, "businesses", businessId);
const membersCol = (businessId) => collection(db, "businesses", businessId, "members");
const memberDoc = (businessId, userId) => doc(db, "businesses", businessId, "members", userId);
const categoriesCol = (businessId) => collection(db, "businesses", businessId, "categories");
const categoryDoc = (businessId, categoryId) => doc(db, "businesses", businessId, "categories", categoryId);
const expensesCol = (businessId) => collection(db, "businesses", businessId, "expenses");
const expenseDoc = (businessId, expenseId) => doc(db, "businesses", businessId, "expenses", expenseId);
const incomeCol = (businessId) => collection(db, "businesses", businessId, "income");
const incomeDoc = (businessId, incomeId) => doc(db, "businesses", businessId, "income", incomeId);

// ---------------------------------------------------------------------------
// User workspace reference (users/{uid} indirection)
// ---------------------------------------------------------------------------

/**
 * Writes (or updates) the users/{uid} reference document.
 * This is the single source of truth for "which business does this user belong to?"
 * @param {string} uid - Firebase Auth UID
 * @param {{ businessId: string, role: string, displayName: string, email?: string|null }} data
 */
export async function upsertUserReference(uid, data) {
  if (!uid || !data || !data.businessId) {
    throw new Error("Missing uid or businessId for user reference.");
  }
  await setDoc(userDoc(uid), {
    businessId: data.businessId,
    role: data.role || "staff",
    displayName: data.displayName || "User",
    email: data.email || null,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Reads the users/{uid} reference document.
 * @returns {Promise<{businessId: string, role: string, displayName: string, email: string|null}|null>}
 */
export async function getUserReference(uid) {
  if (!uid) return null;
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// ---------------------------------------------------------------------------
// Snapshot subscription
// ---------------------------------------------------------------------------

/**
 * Subscribes to all business-scoped data for a given businessId.
 * Calls the provided callbacks whenever any of the collections change.
 *
 * @param {string} businessId
 * @param {{
 *   onWorkspace?: (data: object|null) => void,
 *   onMembers?: (data: object[]) => void,
 *   onCategories?: (data: object[]) => void,
 *   onExpenses?: (data: object[]) => void,
 *   onError?: (err: Error) => void
 * }} handlers
 * @returns {() => void} unsubscribe function (call to detach all listeners)
 */
export function subscribeToBusiness(businessId, handlers = {}) {
  if (!businessId) return () => {};

  const unsubscribers = [];

  // Workspace doc
  if (handlers.onWorkspace) {
    unsubscribers.push(
      onSnapshot(
        businessDoc(businessId),
        (snap) => {
          if (snap.exists()) {
            // Normalize: always provide both `id` and `businessId` so components
            // work regardless of whether the workspace came from Firestore or localStorage.
            handlers.onWorkspace({ id: snap.id, businessId: snap.id, ...snap.data() });
          } else {
            handlers.onWorkspace(null);
          }
        },
        (err) => handlers.onError?.(err)
      )
    );
  }

  // Members subcollection
  if (handlers.onMembers) {
    unsubscribers.push(
      onSnapshot(
        membersCol(businessId),
        (snap) => {
          const list = [];
          snap.forEach((s) => list.push({ userId: s.id, ...s.data() }));
          handlers.onMembers(list);
        },
        (err) => handlers.onError?.(err)
      )
    );
  }

  // Categories subcollection
  if (handlers.onCategories) {
    unsubscribers.push(
      onSnapshot(
        categoriesCol(businessId),
        (snap) => {
          const list = [];
          snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
          handlers.onCategories(list);
        },
        (err) => handlers.onError?.(err)
      )
    );
  }

  // Expenses subcollection (newest first, capped for transfer size)
  if (handlers.onExpenses) {
    unsubscribers.push(
      onSnapshot(
        query(expensesCol(businessId), orderBy("createdAt", "desc"), limit(FEED_QUERY_LIMIT)),
        (snap) => {
          const list = [];
          snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
          handlers.onExpenses(list);
        },
        (err) => handlers.onError?.(err)
      )
    );
  }

  // Income subcollection (newest first, capped) — money-in log, NOT invoicing
  if (handlers.onIncome) {
    unsubscribers.push(
      onSnapshot(
        query(incomeCol(businessId), orderBy("createdAt", "desc"), limit(FEED_QUERY_LIMIT)),
        (snap) => {
          const list = [];
          snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
          handlers.onIncome(list);
        },
        (err) => handlers.onError?.(err)
      )
    );
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}

// ---------------------------------------------------------------------------
// Workspace writes
// ---------------------------------------------------------------------------

/**
 * Creates a new business workspace + owner member + default categories.
 *
 * IMPORTANT: Uses SEQUENTIAL writes (not one batch) so Firestore security
 * rules can evaluate each write independently. A batch that creates the
 * business doc AND categories atomically can fail rule evaluation because
 * categories require isBusinessOwner, which requires reading the business doc
 * that only exists in the same batch.
 *
 * @param {object} ownerUser  { uid, displayName, email, phone }
 * @param {{ name: string, currency: string, businessType?: string|null }} data
 * @param {object[]} [defaultCategories]  [{ name, budget }]
 * @returns {Promise<string>} businessId
 */
export async function createBusinessWorkspaceFirestore(ownerUser, data, defaultCategories = []) {
  if (!ownerUser || !ownerUser.uid) {
    throw new Error("You must be signed in to create a workspace.");
  }
  if (!data || !data.name || !data.name.trim()) {
    throw new Error("Business name is required.");
  }

  const businessId = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Step 1: Create the business doc (rule: allow create if authenticated)
  await setDoc(businessDoc(businessId), {
    name: data.name.trim(),
    currency: (data.currency || "USD").toUpperCase(),
    ownerUid: ownerUser.uid,
    businessType: data.businessType || null,
    brand: {
      logoUrl: null,
      accentColor: "#0f7a52"
    },
    dashboardPreferences: {
      showTopVendor: true,
      showTeamLeaderboard: true,
      showBudgetVsActual: true,
      showSpendByDay: false,
      showNetCashFigure: true
    },
    monthlyBudget: 0,
    notifyAt80: true,
    notifyAt95: true,
    notificationChannel: "both",
    createdAt: new Date().toISOString()
  });

  // Step 2: Create the owner member doc (rule: allow create if isUser(userId))
  // NOTE: doc ID == ownerUid, AND we store userId as a field for query-ability.
  await setDoc(memberDoc(businessId, ownerUser.uid), {
    userId: ownerUser.uid,
    role: "owner",
    displayName: ownerUser.displayName || ownerUser.name || "Owner",
    email: ownerUser.email || null,
    phone: ownerUser.phone || null,
    telegramUserId: null,
    whatsappUserId: null,
    invitedAt: new Date().toISOString(),
    joinedAt: new Date().toISOString()
  });

  // Step 3: Write the users/{uid} reference doc (owns the workspace now)
  await upsertUserReference(ownerUser.uid, {
    businessId,
    role: "owner",
    displayName: ownerUser.displayName || ownerUser.name || "Owner",
    email: ownerUser.email || null
  });

  // Step 4: Create default categories sequentially (rule: owner only)
  const cats = Array.isArray(defaultCategories) && defaultCategories.length > 0
    ? defaultCategories
    : [
        { name: "Fuel & Transport", budget: 400 },
        { name: "Office Supplies", budget: 300 },
        { name: "Meals & Food", budget: 300 },
        { name: "Equipment & Tools", budget: 500 },
        { name: "Utilities & Bills", budget: 400 },
        { name: "Software & Subscriptions", budget: 300 },
        { name: "Petty Cash Spend", budget: 200 },
        { name: "Other Expenses", budget: 200 }
      ];

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const catId = `cat_${businessId}_${i + 1}`;
    await setDoc(categoryDoc(businessId, catId), {
      name: cat.name,
      budget: typeof cat.budget === "number" ? cat.budget : null,
      createdAt: new Date().toISOString()
    });
  }

  return businessId;
}

/**
 * Updates workspace fields (name, currency, brand, dashboardPreferences, etc.).
 */
export async function updateWorkspaceFirestore(businessId, updates) {
  if (!businessId) throw new Error("Missing businessId");
  const clean = { ...updates };
  delete clean.id;
  delete clean.businessId;
  await updateDoc(businessDoc(businessId), clean);
}

// ---------------------------------------------------------------------------
// Member writes
// ---------------------------------------------------------------------------

/**
 * Adds a staff member to the business (invite).
 * Also stores the userId field inside the member doc (doc ID == userId too).
 */
export async function addMemberFirestore(businessId, member) {
  if (!businessId || !member || !member.userId) {
    throw new Error("Missing businessId or member userId");
  }
  const { userId, ...rest } = member;
  await setDoc(memberDoc(businessId, userId), {
    ...rest,
    userId,
    invitedAt: rest.invitedAt || new Date().toISOString(),
    joinedAt: rest.joinedAt || null
  });
}

/**
 * Removes a member from the business.
 */
export async function removeMemberFirestore(businessId, userId) {
  if (!businessId || !userId) throw new Error("Missing businessId or userId");
  await deleteDoc(memberDoc(businessId, userId));
}

/**
 * Updates a member's profile fields.
 */
export async function updateProfileFirestore(businessId, userId, updates) {
  if (!businessId || !userId) throw new Error("Missing businessId or userId");
  const clean = { ...updates };
  delete clean.userId;
  delete clean.id;
  await updateDoc(memberDoc(businessId, userId), clean);
}

/**
 * Unlinks a Telegram or WhatsApp channel:
 * 1. Clears telegramUserId / whatsappUserId on the member document.
 * 2. Deletes the top-level telegramLinks/{telegramUserId} or whatsappLinks/{whatsappUserId} lookup document.
 */
export async function unlinkChatChannelFirestore(businessId, userId, channel, chatUserId) {
  if (!businessId || !userId) return;

  const updateObj = {};
  if (channel === "telegram") updateObj.telegramUserId = null;
  if (channel === "whatsapp") updateObj.whatsappUserId = null;

  try {
    await updateDoc(memberDoc(businessId, userId), updateObj);
  } catch (err) {
    console.warn("Could not update member doc during unlinking:", err.message);
  }

  if (chatUserId) {
    try {
      const colName = channel === "telegram" ? "telegramLinks" : "whatsappLinks";
      await deleteDoc(doc(db, colName, String(chatUserId)));
    } catch (err) {
      console.warn(`Could not delete top-level ${channel} link lookup doc:`, err.message);
    }
  }
}

/**
 * Accepts a pending staff invite: sets joinedAt + userId on the member doc,
 * and writes the users/{uid} reference so the invited user can resolve their workspace.
 */
export async function acceptInviteFirestore(uid, businessId, memberData = {}) {
  if (!uid || !businessId) {
    throw new Error("Missing uid or businessId for invite acceptance.");
  }
  const now = new Date().toISOString();

  // 1. Update the member doc: mark joined + ensure userId field is set
  await updateDoc(memberDoc(businessId, uid), {
    userId: uid,
    joinedAt: now
  });

  // 2. Write the users/{uid} reference so session restore is a single doc read
  await upsertUserReference(uid, {
    businessId,
    role: memberData.role || "staff",
    displayName: memberData.displayName || "Team Member",
    email: memberData.email || null
  });
}

// ---------------------------------------------------------------------------
// Category writes
// ---------------------------------------------------------------------------

export async function addCategoryFirestore(businessId, category) {
  if (!businessId || !category || !category.name) {
    throw new Error("Missing businessId or category name");
  }
  const catId = category.id || `cat_${Date.now()}`;
  await setDoc(categoryDoc(businessId, catId), {
    name: category.name.trim(),
    budget: typeof category.budget === "number" ? category.budget : null,
    createdAt: new Date().toISOString()
  });
  return catId;
}

export async function updateCategoryFirestore(businessId, categoryId, updates) {
  if (!businessId || !categoryId) throw new Error("Missing businessId or categoryId");
  const clean = { ...updates };
  delete clean.id;
  delete clean.businessId;
  await updateDoc(categoryDoc(businessId, categoryId), clean);
}

export async function deleteCategoryFirestore(businessId, categoryId) {
  if (!businessId || !categoryId) throw new Error("Missing businessId or categoryId");
  await deleteDoc(categoryDoc(businessId, categoryId));
}

// ---------------------------------------------------------------------------
// Expense writes
// ---------------------------------------------------------------------------

/**
 * Adds a new expense to the business expenses subcollection.
 * Returns the created expense id.
 */
export async function addExpenseFirestore(businessId, expense) {
  if (!businessId) throw new Error("Missing businessId");
  const { id, ...rest } = expense;
  const ref = id ? expenseDoc(businessId, id) : doc(expensesCol(businessId));
  const rawPayload = {
    ...rest,
    createdAt: rest.createdAt || new Date().toISOString()
  };

  // Convert any undefined values to null to prevent Firestore setDoc errors
  const payload = Object.fromEntries(
    Object.entries(rawPayload).map(([k, v]) => [k, v === undefined ? null : v])
  );

  await setDoc(ref, payload);
  return ref.id || id;
}

/**
 * Updates an existing expense (e.g. syncStatus reconciliation).
 */
export async function updateExpenseFirestore(businessId, expenseId, updates) {
  if (!businessId || !expenseId) throw new Error("Missing businessId or expenseId");
  const clean = { ...updates };
  delete clean.id;
  const payload = Object.fromEntries(
    Object.entries(clean).map(([k, v]) => [k, v === undefined ? null : v])
  );
  await updateDoc(expenseDoc(businessId, expenseId), payload);
}

/**
 * Deletes an expense.
 */
export async function deleteExpenseFirestore(businessId, expenseId) {
  if (!businessId || !expenseId) throw new Error("Missing businessId or expenseId");
  await deleteDoc(expenseDoc(businessId, expenseId));
}

// ---------------------------------------------------------------------------
// Income writes (lightweight money-in log — NOT invoicing)
// ---------------------------------------------------------------------------

/**
 * Adds a new income entry to the business income subcollection.
 * Returns the created income id.
 */
export async function addIncomeFirestore(businessId, income) {
  if (!businessId) throw new Error("Missing businessId");
  const { id, ...rest } = income;
  const ref = id ? incomeDoc(businessId, id) : doc(incomeCol(businessId));
  const rawPayload = {
    ...rest,
    createdAt: rest.createdAt || new Date().toISOString()
  };

  // Convert any undefined values to null to prevent Firestore setDoc errors
  const payload = Object.fromEntries(
    Object.entries(rawPayload).map(([k, v]) => [k, v === undefined ? null : v])
  );

  await setDoc(ref, payload);
  return ref.id || id;
}

/**
 * Updates an existing income entry.
 */
export async function updateIncomeFirestore(businessId, incomeId, updates) {
  if (!businessId || !incomeId) throw new Error("Missing businessId or incomeId");
  const clean = { ...updates };
  delete clean.id;
  const payload = Object.fromEntries(
    Object.entries(clean).map(([k, v]) => [k, v === undefined ? null : v])
  );
  await updateDoc(incomeDoc(businessId, incomeId), payload);
}

/**
 * Soft-deletes a record by setting deletedAt (owner restore possible).
 */
export async function softDeleteExpenseFirestore(businessId, expenseId) {
  await updateExpenseFirestore(businessId, expenseId, {
    deletedAt: new Date().toISOString()
  });
}

export async function softDeleteIncomeFirestore(businessId, incomeId) {
  await updateIncomeFirestore(businessId, incomeId, {
    deletedAt: new Date().toISOString()
  });
}

export async function restoreExpenseFirestore(businessId, expenseId) {
  await updateExpenseFirestore(businessId, expenseId, { deletedAt: null });
}

export async function restoreIncomeFirestore(businessId, incomeId) {
  await updateIncomeFirestore(businessId, incomeId, { deletedAt: null });
}

/**
 * Permanently deletes an income entry.
 */
export async function deleteIncomeFirestore(businessId, incomeId) {
  if (!businessId || !incomeId) throw new Error("Missing businessId or incomeId");
  await deleteDoc(incomeDoc(businessId, incomeId));
}

// ---------------------------------------------------------------------------
// One-time reads (for initial hydration / invite acceptance)
// ---------------------------------------------------------------------------

/**
 * Fetches the business doc for a given businessId.
 */
export async function getBusinessDoc(businessId) {
  const snap = await getDoc(businessDoc(businessId));
  return snap.exists() ? { id: snap.id, businessId: snap.id, ...snap.data() } : null;
}

/**
 * Fetches all members of a business.
 */
export async function getMembersOnce(businessId) {
  const snap = await getDocs(membersCol(businessId));
  const list = [];
  snap.forEach((s) => list.push({ userId: s.id, ...s.data() }));
  return list;
}

/**
 * Fetches all categories of a business.
 */
export async function getCategoriesOnce(businessId) {
  const snap = await getDocs(categoriesCol(businessId));
  const list = [];
  snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
  return list;
}

/**
 * Fetches all expenses of a business (newest first).
 */
export async function getExpensesOnce(businessId) {
  const snap = await getDocs(query(expensesCol(businessId), orderBy("createdAt", "desc")));
  const list = [];
  snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
  return list;
}

/**
 * Fetches all income entries of a business (newest first).
 */
export async function getIncomeOnce(businessId) {
  const snap = await getDocs(query(incomeCol(businessId), orderBy("createdAt", "desc")));
  const list = [];
  snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
  return list;
}

// ---------------------------------------------------------------------------
// Session restore — users/{uid} indirection (no composite index needed)
// ---------------------------------------------------------------------------

/**
 * Finds the business(es) a user belongs to.
 *
 * Strategy (robust, no composite index required):
 *   1. Read users/{uid} reference doc (single doc read — always allowed by rules)
 *   2. If it exists, resolve the business id + role and return immediately.
 *   3. Fallback: collection-group query on members by userId field (best-effort)
 *   4. Fallback: collection-group query on members by email (pending invite),
 *      auto-accept the invite and write the users/{uid} reference.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {string|null} [email] - User's email (for invite matching)
 * @returns {Promise<Array<{businessId: string, member: object}>>}
 */
export async function findUserBusinesses(uid, email = null) {
  const results = [];

  if (!uid) return results;

  // ---- Stage 1: users/{uid} indirection (single doc read — instant restore) ----
  try {
    const ref = await getUserReference(uid);
    if (ref && ref.businessId) {
      results.push({
        businessId: ref.businessId,
        member: { userId: uid, role: ref.role || "staff", displayName: ref.displayName || "User", email: ref.email || email || null }
      });
      return results;
    }
  } catch (err) {
    console.warn("users/{uid} read failed:", err.message);
  }

  // ---- Stage 2: collection-group by userId field (member docs store userId) ----
  try {
    const q = query(collectionGroup(db, "members"), where("userId", "==", uid));
    const snap = await getDocs(q);
    snap.forEach((s) => {
      const businessId = s.ref.parent.parent?.id;
      if (businessId) {
        results.push({ businessId, member: { userId: uid, ...s.data() } });
      }
    });
    if (results.length > 0) {
      // Cache into users/{uid} for future fast restores
      const first = results[0];
      try {
        await upsertUserReference(uid, {
          businessId: first.businessId,
          role: first.member.role || "staff",
          displayName: first.member.displayName || "User",
          email: first.member.email || email || null
        });
      } catch (e) {
        // non-fatal
      }
      return results;
    }
  } catch (err) {
    console.warn("findUserBusinesses member query failed (may need index):", err.message);
  }

  // ---- Stage 3: collection-group by email (pending invite) ----
  if (email) {
    try {
      const qEmail = query(collectionGroup(db, "members"), where("email", "==", email.toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      for (const s of snapEmail.docs) {
        const businessId = s.ref.parent.parent?.id;
        const data = s.data();
        if (businessId && !data.joinedAt) {
          // Accept the invite: mark joined + write users/{uid} reference
          try {
            await acceptInviteFirestore(uid, businessId, data);
          } catch (acceptErr) {
            console.warn("Failed to accept invite:", acceptErr.message);
          }
          results.push({
            businessId,
            member: { userId: uid, ...data, joinedAt: new Date().toISOString() }
          });
          break;
        } else if (businessId && data.joinedAt) {
          // Already joined but user reference missing — sync it
          try {
            await upsertUserReference(uid, {
              businessId,
              role: data.role || "staff",
              displayName: data.displayName || "User",
              email: data.email || email
            });
          } catch (e) {
            // non-fatal
          }
          results.push({ businessId, member: { userId: uid, ...data } });
          break;
        }
      }
    } catch (err) {
      console.warn("findUserBusinesses email query failed:", err.message);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// API Key Management (Part 2 — Generic Inbound Webhook/API)
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random API key with the `sk_live_` prefix.
 * Uses `crypto.getRandomValues` — no guessable derivation from businessId.
 */
export function generateApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sk_live_${hex}`;
}

/**
 * Saves a new API key on the business doc and creates a top-level lookup doc.
 * Returns the plain-text key (should be shown once to the owner).
 */
export async function saveApiKeyFirestore(businessId) {
  if (!businessId) throw new Error("Missing businessId for API key generation.");

  const apiKey = generateApiKey();
  const now = new Date().toISOString();

  const batch = writeBatch(db);

  // Set key on business doc
  const bizRef = doc(db, "businesses", businessId);
  batch.update(bizRef, { apiKey, apiKeyCreatedAt: now });

  // Create top-level lookup: apiKeys/{apiKey} → { businessId, createdAt }
  const lookupRef = doc(db, "apiKeys", apiKey);
  batch.set(lookupRef, { businessId, createdAt: now });

  await batch.commit();

  return { apiKey, createdAt: now };
}

/**
 * Regenerates the API key for a business. Deletes old top-level lookup,
 * creates new key and new lookup atomically.
 */
export async function regenerateApiKeyFirestore(businessId, oldApiKey) {
  if (!businessId) throw new Error("Missing businessId for API key regeneration.");

  const newApiKey = generateApiKey();
  const now = new Date().toISOString();

  const batch = writeBatch(db);

  // Delete old lookup if present
  if (oldApiKey) {
    const oldLookupRef = doc(db, "apiKeys", oldApiKey);
    batch.delete(oldLookupRef);
  }

  // Update business doc with new key
  const bizRef = doc(db, "businesses", businessId);
  batch.update(bizRef, { apiKey: newApiKey, apiKeyCreatedAt: now });

  // Create new top-level lookup
  const newLookupRef = doc(db, "apiKeys", newApiKey);
  batch.set(newLookupRef, { businessId, createdAt: now });

  await batch.commit();

  return { apiKey: newApiKey, createdAt: now };
}