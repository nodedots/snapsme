# Build Plan — snapsme

**Version**: 1.0
**Companion to**: snapsme PRD v1.0, Technical Spec v1.0

---

## Approach

Each phase below produces something usable and testable on its own before the next begins — no phase depends on unfinished work from a later phase. Phase 1 gets a single user capturing and viewing their own expenses; by Phase 4 the product matches the full v1 scope in the PRD.

---

## Phase 0 — Project Setup

- Initialize Firebase project (Firestore, Auth, Storage, Functions, Hosting)
- Set up `/public` folder structure per the technical spec (no build tooling)
- Configure `firestore.rules` and `storage.rules` with business-scoped access as a placeholder (tighten in Phase 1)
- Deploy a blank Hosting page to confirm the pipeline works end to end
- Apply the style reference tokens as a base `base.css` (colors, type, spacing custom properties)

**Done when**: an empty but styled page is live on Firebase Hosting.

---

## Phase 1 — Auth, Workspace, and Manual Expense Entry

Goal: a single owner can sign up, create a workspace, and log expenses manually.

- Firebase Auth integration (email/phone)
- `businesses/{businessId}` and `members/{userId}` creation on signup (FR11)
- Manual expense entry form → Firestore write (FR3)
- Basic category creation (owner-defined, per business)
- Real-time expense feed for the signed-in user's own business, via `onSnapshot` (FR15, scoped to one user for now)
- Firestore security rules enforced: only members of a business can read/write that business's data

**Done when**: an owner can create a workspace, add categories, log an expense manually, and see it appear instantly in a feed.

---

## Phase 2 — Team Invites and Shared Feed

Goal: more than one person can submit into the same workspace.

- Owner can invite staff by email/phone (FR12); invite acceptance flow creates a `members` entry
- Owner can remove a staff member (FR13)
- Role handling: owner vs. staff permissions enforced in security rules (budget-setting, member removal restricted to owner)
- Shared feed now shows submissions from all members of the workspace, attributed by name
- Money-movement field added to expense entry: personal reimbursement / company card / petty cash / supplier payment (FR6)

**Done when**: an owner invites a staff member, that staff member logs in and submits an expense, and it appears in the owner's shared feed correctly attributed.

---

## Phase 3 — AI Capture: Photo and Voice

Goal: the core wedge — zero-friction receipt capture — is live.

- `extractReceipt` Cloud Function: image upload → vision model → structured JSON (FR1, FR4)
- Client-side image compression before upload
- Confirm/edit UI for extracted fields, with confidence-based flagging (FR5) — this is also where the Confidence Dot component from the style reference gets used for the first time
- `extractVoiceNote` Cloud Function: voice upload → speech-to-text → same extraction pipeline (FR2)
- `correctedFields` tracking on save, to start building the per-business category-learning signal described in the project overview

**Done when**: a user can snap a receipt photo or record a voice note, review the AI's extraction, correct it if needed, and save it as an expense — matching flow 7.2 in the PRD.

---

## Phase 4 — Offline-First Capture

Goal: submissions never get lost to bad connectivity.

- Enable Firestore offline persistence on the client (FR7)
- Local optimistic write with `syncStatus: "pending"`, reconciled to `"synced"` on confirmed write
- Pending-sync visual state in the feed UI
- Manual test pass: submit expenses in airplane mode, confirm they queue and sync correctly on reconnect

**Done when**: an expense submitted with no network connection appears immediately in the local feed as pending, and syncs automatically once connectivity returns.

---

## Phase 5 — Visibility: Dashboard, Budgets, Export

Goal: the owner gets real value from having the data, not just a feed.

- Dashboard: totals by category, by staff member, by vendor (FR16)
- Owner-settable category budgets (FR17)
- Soft alert when a category approaches its budget (FR18)
- CSV export (FR19)
- Duplicate-submission detection: match on amount + vendor + date window, non-blocking flag (FR20)

**Done when**: an owner can open a dashboard and answer "where did our money go this month" without opening the raw feed, and can export a CSV for their accountant.

---

## Phase 6 — Telegram Bot Intake

Goal: expenses can be submitted from Telegram without opening the app.

- `linkChatAccount` Cloud Function + in-app UI to generate a linking code (FR10)
- `telegramWebhook` Cloud Function: handles `/link`, routes photo/voice/text messages to the existing extraction pipeline (FR8)
- Bot confirmation flow (reply to confirm a parsed expense before it saves)
- End-to-end test: link a Telegram account, send a receipt photo to the bot, confirm it lands correctly in the shared feed

**Done when**: a linked staff member can send a photo to the Telegram bot and see the expense appear in the app's shared feed, matching flow 7.3 in the PRD.

---

## Phase 7 — WhatsApp Bot Intake

Goal: the second chat channel, once WhatsApp Business API approval is in hand.

- WhatsApp Business Cloud API application/approval (this has external lead time — worth starting early, even before Phase 6 finishes, since approval isn't in your control)
- `whatsappWebhook` Cloud Function, mirroring `telegramWebhook`'s logic (FR9)
- Same linking and confirmation flow as Telegram, adapted to WhatsApp's message format

**Done when**: the same end-to-end test from Phase 6 passes on WhatsApp.

---

## Phase 8 — Polish and Launch Readiness

- Full pass against the style reference: torn-card component, mono amount treatment, confidence dots, status pills applied consistently across every screen
- Mobile responsiveness pass (given the target user is often on a phone, not a desktop)
- Performance check against the non-functional requirements (sub-2-second load, compressed images, single-purpose Cloud Functions)
- Empty-state and error-state copy pass
- Basic analytics/logging for the success metrics defined in the PRD (submission timing, chat-channel %, extraction confirm-without-edit rate)

**Done when**: the product matches the full v1 PRD scope and is ready for real users — internal team first, per the open question on internal-vs-external launch.

---

## Sequencing Notes

- Phases 1-2 can be built and tested by one person alone before any real team is involved
- Phase 3 (AI capture) is the highest-risk phase technically — budget the most buffer time here, and consider validating the vision-model extraction quality against real, messy receipts before building the full confirm/edit UI around it
- WhatsApp approval (Phase 7) has external turnaround time outside your control — starting that application during Phase 5 or 6 avoids it becoming the final bottleneck
- v1.1 items (petty cash reconciliation, spend-health indicator) intentionally sit outside this plan — revisit once Phase 8 ships
