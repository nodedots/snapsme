# Technical Specification — snapsme

**Version**: 1.0 (v1 scope)
**Companion to**: snapsme PRD v1.0

---

## 1. Stack Summary

- **Frontend**: vanilla JavaScript (ES modules), HTML, CSS — no framework, no build tooling
- **Backend**: Firebase — Firestore, Storage, Auth, Cloud Functions, Hosting
- **AI extraction**: vision model (photo) + speech-to-text (voice), called server-side via Cloud Functions
- **Chat channels**: Telegram Bot API (v1), WhatsApp Business Cloud API (post-v1)

## 2. Project Folder Structure

```
/public
  index.html
  /css
    base.css
    layout.css
    components.css
  /js
    firebase-config.js
    auth.js
    state.js
    render.js
    expenses.js
    receipts.js
    dashboard.js
    workspace.js
  /assets
/functions
  index.js
  extractReceipt.js
  extractVoiceNote.js
  telegramWebhook.js
  whatsappWebhook.js       (post-Telegram)
  linkChatAccount.js
firebase.json
firestore.rules
storage.rules
```

No bundler, no `package.json`-driven build for `/public` — deployed as-is to Firebase Hosting. Cloud Functions live in their own Node environment as usual.

## 3. Data Model (Firestore)

Business-scoped from the root. All collections nest under a `businesses/{businessId}` document to enforce data isolation.

```
businesses/{businessId}
  name: string
  createdAt: timestamp
  ownerUid: string
  currency: string (default currency for the workspace)
  aiCaptureUsage: { count: number, periodStart: timestamp }  // 150 monthly AI scan cap tracking

  members/{userId}
    role: "owner" | "staff"
    displayName: string
    email: string (required for authentication)
    phone: string | null (optional secondary contact)
    telegramUserId: string | null
    whatsappUserId: string | null
    invitedAt: timestamp
    joinedAt: timestamp | null

  categories/{categoryId}
    name: string
    budget: number | null
    createdAt: timestamp

  expenses/{expenseId}
    submittedBy: string (userId)
    amount: number
    currency: string
    vendor: string
    category: categoryId
    moneyMovement: "personal_reimbursement" | "company_card" | "petty_cash" | "supplier_payment"
    date: timestamp
    source: "manual" | "photo" | "voice" | "telegram" | "whatsapp"
    receiptImageUrl: string | null
    aiConfidence: { vendor: number, amount: number, date: number, category: number } | null
    correctedFields: string[]   // fields the user edited after AI extraction
    syncStatus: "synced" | "pending"   // for offline-first tracking
    duplicateOf: string | null  // expenseId if flagged as a likely duplicate
    createdAt: timestamp

chatLinks/{linkCode}
  userId: string
  channel: "telegram" | "whatsapp"
  createdAt: timestamp
  expiresAt: timestamp
  used: boolean

// Authoritative top-level lookup tables for O(1) webhook identity resolution
telegramLinks/{telegramUserId}
  businessId: string
  userId: string
  linkedAt: timestamp

whatsappLinks/{whatsappUserId}
  businessId: string
  userId: string
  linkedAt: timestamp
```

**Design notes**:
- `telegramLinks` and `whatsappLinks` top-level lookup collections provide direct $O(1)$ constant time document lookups for incoming Telegram and WhatsApp webhook messages, replacing collection-group searches.
- `aiCaptureUsage` tracks monthly AI vision/voice extractions up to a 150 fair-use cap per business per calendar month. Manual logging remains 100% unlimited and free.
- `email` is mandatory for all member documents to guarantee auth compatibility with Firebase Auth and Google Sign-In.
- `categories` are per-business, not global, so each workspace's categorization can diverge.
- `moneyMovement` is a required field per FR6 — reflects the deliberate move away from an approval-chain model.
- `source` on each expense preserves which intake channel was used.

## 4. Cloud Functions

### 4.1 `extractReceipt`
- **Trigger**: HTTPS callable, invoked after a receipt image is uploaded to Storage
- **Input**: Storage path to the image
- **Process**: calls vision model, returns structured JSON (vendor, amount, currency, date, suggested category, per-field confidence)
- **Output**: JSON matching the `expenses` document shape, unsaved — client confirms before writing to Firestore

### 4.2 `extractVoiceNote`
- **Trigger**: HTTPS callable, invoked after a voice note is uploaded to Storage
- **Process**: speech-to-text, then the transcribed text is passed through the same structured-extraction step used by `extractReceipt`
- **Output**: same JSON shape as `extractReceipt`, so the client-side confirm/edit UI is shared between both entry points

### 4.3 `telegramWebhook`
- **Trigger**: HTTPS endpoint registered as the Telegram bot's webhook
- **Process**:
  - `/link <code>` messages resolve against `chatLinks` and attach the Telegram user ID to the matching member document
  - Photo/voice/text messages from a linked user are routed to `extractReceipt` / `extractVoiceNote` / manual-parse respectively
  - Bot replies with the parsed result for confirmation; a confirming reply triggers the Firestore write
- **Unlinked users**: bot replies with instructions to generate a link code in-app

### 4.4 `whatsappWebhook` (post-Telegram rollout)
- Same responsibilities as `telegramWebhook`, adapted to the WhatsApp Business Cloud API's message format and verification requirements

### 4.5 `linkChatAccount`
- **Trigger**: HTTPS callable, invoked from the app when a user requests a link code
- **Process**: generates a short-lived code, writes it to `chatLinks`, returns it to display in-app

## 5. Security Rules (Summary)

- **Firestore**: all reads/writes to `businesses/{businessId}/**` require the requesting user to be listed in that business's `members` subcollection; `owner`-only fields (category budgets, member removal) additionally check `role == "owner"`
- **Storage**: receipt/voice uploads are scoped to `businesses/{businessId}/uploads/{userId}/...` paths, writable only by an authenticated member of that business
- **Cloud Functions**: AI/vision/speech API keys are stored as Function environment config, never exposed to the client; chat webhook endpoints verify the request signature (Telegram secret token / WhatsApp signature header) before processing

## 6. Offline Handling

- Firestore's offline persistence is enabled on the client (`enableIndexedDbPersistence` or the modular SDK equivalent)
- Expense writes made offline are queued by Firestore automatically; the client sets `syncStatus: "pending"` optimistically in local state and reconciles once Firestore confirms the write
- UI shows a distinct visual state (e.g. a small pending indicator) for unsynced expenses in the feed

## 7. Duplicate Detection Logic

On write, a lightweight query checks for existing expenses in the same business with matching amount + vendor within a configurable time window (e.g. 48 hours). A match sets `duplicateOf` on the newer document and surfaces a non-blocking flag in the UI rather than preventing submission — false positives shouldn't block a legitimate expense.

## 8. Out of Scope for This Document

UI/visual design, detailed API request/response payloads for third-party APIs (vision model, speech-to-text, Telegram/WhatsApp), and the build/sprint plan are covered separately.
