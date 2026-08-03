/**
 * SnapSME — Firestore Data Layer
 *
 * Centralizes all Firestore reads/writes for the React app.
 * - Subscribes to real-time snapshots (onSnapshot) for workspace, members,
 *   categories, and expenses scoped to the signed-in user's business.
 * - Provides write helpers that mirror the existing localStorage API so the
 *   app can swap between Firestore (authenticated) and localStorage (demo).
 *
 * Data model (matches firestore.rules):
 *   businesses/{businessId}                          -> workspace doc
 *   businesses/{businessId}/members/{userId}         -> member doc
 *   businesses/{businessId}/categories/{categoryId}  -> category doc
 *   businesses/{businessId}/expenses/{expenseId}     -> expense doc
 */
import { db, auth } from "./firebase.js";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

const businessDoc = (businessId) => doc(db, "businesses", businessId);
const membersCol = (businessId) => collection(db, "businesses", businessId, "members");
const memberDoc = (businessId, userId) => doc(db, "businesses", businessId, "members", userId);
const categoriesCol = (businessId) => collection(db, "businesses", businessId, "categories");
const categoryDoc = (businessId, categoryId) => doc(db, "businesses", businessId, "categories", categoryId);
const expensesCol = (businessId) => collection(db, "businesses", businessId, "expenses");
const expenseDoc = (businessId, expenseId) => doc(db, "businesses", businessId, "expenses", expenseId);

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

  // Expenses subcollection (newest first)
  if (handlers.onExpenses) {
    unsubscribers.push(
      onSnapshot(
        query(expensesCol(businessId), orderBy("createdAt", "desc")),
        (snap) => {
          const list = [];
          snap.forEach((s) => list.push({ id: s.id, ...s.data() }));
          handlers.onExpenses(list);
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
 * Creates a new business workspace + owner member + default categories in a
 * single batched write. Returns the created businessId.
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
  const now = serverTimestamp();

  const batch = writeBatch(db);

  // Workspace doc
  batch.set(businessDoc(businessId), {
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
      showSpendByDay: false
    },
    monthlyBudget: 0,
    notifyAt80: true,
    notifyAt95: true,
    notificationChannel: "both",
    createdAt: now
  });

  // Owner member doc
  batch.set(memberDoc(businessId, ownerUser.uid), {
    role: "owner",
    displayName: ownerUser.displayName || ownerUser.name || "Owner",
    email: ownerUser.email || null,
    phone: ownerUser.phone || null,
    telegramUserId: null,
    whatsappUserId: null,
    invitedAt: now,
    joinedAt: now
  });

  // Default categories
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

  cats.forEach((c, i) => {
    const catId = `cat_${businessId}_${i + 1}`;
    batch.set(categoryDoc(businessId, catId), {
      name: c.name,
      budget: typeof c.budget === "number" ? c.budget : null,
      createdAt: now
    });
  });

  await batch.commit();
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
 */
export async function addMemberFirestore(businessId, member) {
  if (!businessId || !member || !member.userId) {
    throw new Error("Missing businessId or member userId");
  }
  const { userId, ...rest } = member;
  await setDoc(memberDoc(businessId, userId), {
    ...rest,
    invitedAt: rest.invitedAt || serverTimestamp(),
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
    createdAt: serverTimestamp()
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
  const payload = {
    ...rest,
    createdAt: rest.createdAt || serverTimestamp()
  };
  if (id) {
    await setDoc(ref, payload);
    return id;
  }
  const added = await addDoc(expensesCol(businessId), payload);
  return added.id;
}

/**
 * Updates an existing expense (e.g. syncStatus reconciliation).
 */
export async function updateExpenseFirestore(businessId, expenseId, updates) {
  if (!businessId || !expenseId) throw new Error("Missing businessId or expenseId");
  const clean = { ...updates };
  delete clean.id;
  await updateDoc(expenseDoc(businessId, expenseId), clean);
}

/**
 * Deletes an expense.
 */
export async function deleteExpenseFirestore(businessId, expenseId) {
  if (!businessId || !expenseId) throw new Error("Missing businessId or expenseId");
  await deleteDoc(expenseDoc(businessId, expenseId));
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
 * Finds the business(es) a user belongs to by scanning members subcollections.
 * First tries by userId (Firebase UID), then falls back to email matching
 * for pending invites (where the member doc has an email but no userId yet).
 *
 * NOTE: This requires a collection-group query on "members" which needs a
 * matching index/rule. We use it as a best-effort helper for session restore.
 */
export async function findUserBusinesses(uid, email = null) {
  try {
    const { collectionGroup, query, where, getDocs, updateDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
    );
    const results = [];

    // 1. Query by userId (Firebase UID)
    const q = query(collectionGroup(db, "members"), where("userId", "==", uid));
    const snap = await getDocs(q);
    snap.forEach((s) => {
      const businessId = s.ref.parent.parent?.id;
      if (businessId) {
        results.push({ businessId, member: { userId: s.id, ...s.data() } });
      }
    });

    // 2. Fallback: query by email for pending invites (joinedAt is null)
    if (results.length === 0 && email) {
      const qEmail = query(collectionGroup(db, "members"), where("email", "==", email.toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      for (const s of snapEmail.docs) {
        const businessId = s.ref.parent.parent?.id;
        const data = s.data();
        if (businessId && !data.joinedAt) {
          // Accept the invite: set userId to the Firebase UID and mark joined
          try {
            await updateDoc(s.ref, {
              userId: uid,
              joinedAt: new Date().toISOString()
            });
          } catch (err) {
            console.warn("Failed to accept invite:", err.message);
          }
          results.push({
            businessId,
            member: { userId: uid, ...data, joinedAt: new Date().toISOString() }
          });
          break;
        }
      }
    }

    return results;
  } catch (err) {
    console.warn("findUserBusinesses failed (may need collection-group index):", err.message);
    return [];
  }
}
