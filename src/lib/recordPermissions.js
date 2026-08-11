/**
 * Record management permissions for expenses & income.
 *
 * Owner: full edit / delete / bulk always.
 * Staff: may edit or soft-delete their own records within STAFF_OWN_WINDOW_MS
 *        (default 48 hours from createdAt).
 */

export const STAFF_OWN_WINDOW_MS = 48 * 60 * 60 * 1000;

export function isOwnerUser(user) {
  return Boolean(user && user.role === "owner");
}

function recordAgeMs(record) {
  const raw = record?.createdAt || record?.date;
  if (!raw) return Infinity;
  const t = new Date(raw).getTime();
  if (isNaN(t)) return Infinity;
  return Date.now() - t;
}

export function isOwnRecord(record, user) {
  if (!record || !user) return false;
  const uid = user.userId || user.uid;
  if (!uid) return false;
  return record.submittedBy === uid;
}

export function isWithinStaffWindow(record, windowMs = STAFF_OWN_WINDOW_MS) {
  return recordAgeMs(record) <= windowMs;
}

/** Soft-deleted rows carry deletedAt ISO string */
export function isSoftDeleted(record) {
  return Boolean(record && record.deletedAt);
}

/**
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canEditRecord(record, user) {
  if (!record || !user) return { allowed: false, reason: "Not signed in" };
  if (isSoftDeleted(record)) return { allowed: false, reason: "Restore this record before editing" };
  if (isOwnerUser(user)) return { allowed: true };
  if (isOwnRecord(record, user) && isWithinStaffWindow(record)) return { allowed: true };
  if (isOwnRecord(record, user)) {
    return { allowed: false, reason: "Staff can only edit their own entries within 48 hours" };
  }
  return { allowed: false, reason: "Only the owner or the submitter can edit this entry" };
}

/**
 * Soft-delete permission (same rules as edit for staff).
 */
export function canDeleteRecord(record, user) {
  if (!record || !user) return { allowed: false, reason: "Not signed in" };
  if (isSoftDeleted(record)) {
    // Permanent delete: owner only
    return isOwnerUser(user)
      ? { allowed: true }
      : { allowed: false, reason: "Only the owner can permanently delete" };
  }
  if (isOwnerUser(user)) return { allowed: true };
  if (isOwnRecord(record, user) && isWithinStaffWindow(record)) return { allowed: true };
  if (isOwnRecord(record, user)) {
    return { allowed: false, reason: "Staff can only delete their own entries within 48 hours" };
  }
  return { allowed: false, reason: "Only the owner or the submitter can delete this entry" };
}

export function canRestoreRecord(record, user) {
  if (!record || !user || !isSoftDeleted(record)) return { allowed: false };
  return isOwnerUser(user)
    ? { allowed: true }
    : { allowed: false, reason: "Only the owner can restore deleted records" };
}

export function canBulkManage(user) {
  return isOwnerUser(user);
}

/** Active (non-deleted) records for feeds/dashboard */
export function filterActiveRecords(list = []) {
  return (list || []).filter((r) => !isSoftDeleted(r));
}

export function filterDeletedRecords(list = []) {
  return (list || []).filter((r) => isSoftDeleted(r));
}

/**
 * Sort helper for expense/income lists.
 * @param {"date"|"amount"|"vendor"|"source"|"submittedBy"|"createdAt"} sortKey
 * @param {"asc"|"desc"} sortDir
 */
export function sortRecords(list = [], sortKey = "date", sortDir = "desc") {
  const dir = sortDir === "asc" ? 1 : -1;
  const copy = [...(list || [])];

  const vendorOrSource = (r) =>
    String(r.vendor || r.source || "").toLowerCase();

  copy.sort((a, b) => {
    let av;
    let bv;
    switch (sortKey) {
      case "amount":
        av = Number(a.amount) || 0;
        bv = Number(b.amount) || 0;
        return (av - bv) * dir;
      case "vendor":
      case "source":
        av = vendorOrSource(a);
        bv = vendorOrSource(b);
        return av.localeCompare(bv) * dir;
      case "submittedBy":
        av = String(a.submittedByName || "").toLowerCase();
        bv = String(b.submittedByName || "").toLowerCase();
        return av.localeCompare(bv) * dir;
      case "createdAt":
        av = new Date(a.createdAt || a.date || 0).getTime();
        bv = new Date(b.createdAt || b.date || 0).getTime();
        return (av - bv) * dir;
      case "date":
      default:
        av = String(a.date || "");
        bv = String(b.date || "");
        if (av === bv) {
          const ac = new Date(a.createdAt || 0).getTime();
          const bc = new Date(b.createdAt || 0).getTime();
          return (ac - bc) * dir;
        }
        return av.localeCompare(bv) * dir;
    }
  });
  return copy;
}
