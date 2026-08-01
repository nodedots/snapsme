# Product Requirements Document — snapsme

**Version**: 1.0 (v1 scope)
**Status**: Draft — pre-development

---

## 1. Overview

snapsme is a lightweight expense-capture and visibility tool for small teams (2–10 staff) who spend company money without a formal bookkeeping process. Staff submit expenses by photo, voice note, or chat message; AI extracts the details automatically; the owner sees a real-time shared view of team spend without chasing anyone for a receipt.

## 2. Problem Statement

Small teams spend constantly — fuel, supplies, transport, small purchases — but rarely track it well. Owners reconstruct spend after the fact from memory or scattered receipts. Existing tools assume either a solo user (too simple for a team) or a formal enterprise approval chain (too heavy for a 5-person business). No product is built for the shape a small team actually spends in: informal, often cash-based, coordinated over chat apps rather than software.

## 3. Goals

- Make expense submission fast enough that staff actually do it in the moment, not days later
- Give the owner real-time visibility into team spend without manual reconciliation
- Support how small teams actually move money — cash, informal reimbursement, no approval chain — rather than forcing an enterprise workflow onto them
- Ship a genuinely lightweight product: fast to load, cheap to run, simple to maintain

## 4. Non-Goals (v1)

- Income tracking or invoicing
- Bank account integration/sync
- Formal multi-level approval workflows
- AI-generated insights, forecasting, or anomaly detection (needs accumulated data first — see Phase 2 in the project overview)
- Payroll, inventory, or any function beyond expense capture and visibility

## 5. Target User

**Primary**: Owner or manager of a 2–10 person business who currently has no reliable way to see team spend in real time.

**Secondary**: Staff members who spend on the business's behalf and need the lowest-possible-friction way to log it.

## 6. User Roles

| Role | Capabilities |
|---|---|
| Owner | Creates workspace, invites/removes staff, sets category budgets, views all spend, exports data |
| Staff | Submits expenses (photo, voice, manual, chat), views own submission history, sees team feed (read access to shared spend) |

## 7. Core User Flows

### 7.1 Onboarding
1. Owner signs up, creates a business workspace
2. Owner invites staff by email or phone
3. Staff accept invite, land in the shared workspace

### 7.2 Expense Submission — In-App
1. Staff opens app, taps "Add Expense"
2. Chooses: photo, voice note, or manual entry
3. For photo/voice: AI extracts vendor, amount, date, suggested category
4. Low-confidence fields are flagged for staff to confirm before saving
5. Staff selects how the money moved: personal reimbursement / company card / petty cash / supplier payment
6. Expense saves, appears instantly in the shared team feed

### 7.3 Expense Submission — Chat Channel (Telegram / WhatsApp)
1. Staff links their Telegram or WhatsApp account to their snapsme profile via a one-time `/link` code from the app
2. Staff sends a photo, voice note, or text message to the snapsme bot
3. Bot runs the same extraction pipeline as in-app capture, replies with the parsed result
4. Staff confirms with a short reply or reaction
5. Expense appears in the shared team feed, attributed to the correct staff member and workspace

### 7.4 Offline Submission
1. Staff submits an expense with no connectivity
2. Expense saves locally, shown with a "pending sync" state
3. On reconnect, expense syncs automatically to the shared feed

### 7.5 Owner Review
1. Owner opens dashboard, sees real-time totals by category, by staff member, by vendor
2. Owner sets or adjusts category budgets, sees soft alerts when a category approaches its limit
3. Owner exports a CSV for an accountant when needed

## 8. Functional Requirements

### 8.1 Capture
- FR1: User can submit an expense via photo upload
- FR2: User can submit an expense via voice note (speech-to-text → same extraction pipeline as photo)
- FR3: User can submit an expense manually (no AI extraction needed)
- FR4: AI extraction returns vendor, amount, currency, date, and a suggested category
- FR5: Fields below a confidence threshold are visually flagged and require user confirmation before save
- FR6: User selects a money-movement type per expense: personal reimbursement / company card / petty cash / supplier payment
- FR7: Expenses submitted offline are queued locally and synced automatically on reconnect, with a visible pending state
- FR8: User can submit an expense via Telegram bot (photo, voice, or text)
- FR9: User can submit an expense via WhatsApp bot (photo, voice, or text) — post-Telegram rollout
- FR10: Chat-channel accounts (Telegram/WhatsApp) are linked to a snapsme profile via a one-time linking code

### 8.2 Team & Workspace
- FR11: Owner can create a business workspace
- FR12: Owner can invite staff by email or phone
- FR13: Owner can remove a staff member
- FR14: All expense data is scoped to the business workspace, not the individual user

### 8.3 Visibility
- FR15: Real-time shared feed of all team expenses, updating live as submissions come in
- FR16: Dashboard shows totals by category, by staff member, and by vendor
- FR17: Owner can set a budget per category
- FR18: System shows a soft alert (not a hard block) when spend in a category approaches its budget
- FR19: User can export expense data as CSV
- FR20: System flags likely duplicate submissions (same amount, vendor, and date within a short window)

## 9. Non-Functional Requirements

- **Performance**: initial app load under 2 seconds on average mobile connections; no build-step bundle bloat (vanilla JS, no framework)
- **Reliability**: offline capture must never lose a submission; sync must be conflict-safe
- **Cost efficiency**: Cloud Functions kept single-purpose to avoid slow cold starts; receipt images compressed client-side before upload
- **Security**: AI/vision API keys never exposed client-side; all extraction calls routed through Cloud Functions
- **Data scoping**: strict business-level data isolation — no cross-workspace data leakage

## 10. Technical Approach (Summary)

- **Frontend**: vanilla JavaScript, HTML, CSS — no framework, no build tooling
- **Backend**: Firebase (Firestore, Storage, Auth, Cloud Functions, Hosting)
- **AI extraction**: vision model call via Cloud Function for photos; speech-to-text + same extraction pipeline for voice notes
- **Chat integration**: Telegram Bot API (v1 priority — no business verification required); WhatsApp Business Cloud API (follows once approved)
- **State management**: single state object per view, updated via Firestore `onSnapshot` listeners, redrawn via per-section render functions

Full technical rationale lives in the companion project overview document.

## 11. Success Metrics (v1)

- % of expenses submitted within 24 hours of the transaction (proxy for "friction is low enough that people actually use it")
- Number of active staff submitters per workspace per week
- Owner dashboard opens per week (proxy for perceived value of visibility)
- Chat-channel submissions as a % of total submissions (validates the "meet people where they are" bet)
- AI extraction confirm-without-edit rate (proxy for extraction quality/trust)

## 12. Open Questions

- Internal-use-first at Asterverse, or external SME customers from the start? Affects onboarding polish and billing priority.
- How much of WhatsApp Business API approval effort to invest early versus leaning on Telegram as the primary chat channel for longer.
- Where petty cash reconciliation and the spend-health indicator land — immediately after v1, or folded into v1 if timeline allows.

## 13. Out of Scope for This Document

Design specifications, detailed data schema, and sprint-level task breakdown are covered in separate documents (technical spec, data model, and build plan) to follow.
