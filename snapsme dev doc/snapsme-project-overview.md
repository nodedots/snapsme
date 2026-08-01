# snapsme — Project Overview

## 1. The Problem

Small teams (2–10 staff) spend company money constantly — fuel, supplies, transport, small purchases — but almost never track it well in real time. The owner ends up reconstructing spend after the fact from memory, scattered receipts, or a WhatsApp message someone sent three weeks ago. Existing expense tools either assume a solo user (too simple for a team) or assume enterprise structure with formal approval chains (too heavy for a 5-person business). Nobody's building for the shape a small team actually spends in.

## 2. The Wedge

**Zero-friction receipt capture, built for teams.** A staff member snaps a photo of a receipt. AI extracts the vendor, amount, date, and category automatically. It lands in a shared feed the owner can see in real time — no chasing anyone, no end-of-month reconstruction. The capture loop is the entire product at launch; everything else is scaffolding around making that loop fast and trustworthy.

## 3. Target User

- Small businesses with 2–10 staff who spend on the company's behalf
- No formal approval hierarchy — spend happens informally (company card, petty cash, personal reimbursement)
- Owner wants visibility without becoming a bookkeeper
- Currently using nothing, or a shared notes app / spreadsheet that nobody updates consistently

## 4. Positioning

Not "Expense Tracker" — that names the mechanic, not the outcome. snapsme's promise is: **you always know where team money went, without chasing anyone for a receipt.** The name itself (snap + SME) is descriptive of the core action, which keeps the pitch self-evident without needing a tagline to explain the category.

## 5. Core Product Loop

1. Staff member spends money on the business's behalf
2. Photographs the receipt in-app, or forwards it via Telegram or WhatsApp (a bot-based intake channel — see section 8a)
3. AI extracts structured data: vendor, amount, currency, date, suggested category
4. Low-confidence fields are flagged for the submitter to confirm before saving — this protects trust in the data more than raw OCR accuracy does
5. Expense lands in the shared team feed in real time
6. Owner sees running totals by category, by team member, and by vendor — no manual reconciliation

## 6. What v1 Deliberately Excludes

To stay disciplined and shippable:
- **No income/invoicing** — this is an expense tool, not a full accounting suite
- **No bank integration** — CSV import covers the early need
- **No AI-generated insights or forecasting** — those need weeks of accumulated per-business data to be genuinely useful rather than generic; they're a retention feature for later, not a launch feature
- **No formal multi-level approval chains** — most 2–10 person teams don't operate that way

## 7. How Spend Is Modeled

Instead of an enterprise-style `pending → approved → rejected` chain, spend is categorized by **how the money moved**, which reflects how small teams actually operate:
- Personal reimbursement
- Company card
- Petty cash
- Supplier payment (direct)

This is a data-model decision made deliberately up front, since retrofitting it after launch would be costly.

## 8. Feature Set — v1 (Capture + Visibility)

**Capture**
- Manual expense entry
- Receipt photo upload with AI extraction
- Voice-note expense entry — speech-to-text feeding the same extraction pipeline as receipt OCR, for cash purchases where no receipt exists (market vendors, informal transactions)
- Offline-first capture — expenses save locally and sync automatically when connectivity returns, using Firestore's built-in offline persistence, with a visible "pending sync" state
- Confirm/edit flow for low-confidence extracted fields
- Team member invite (owner adds staff by email/phone)
- Business-scoped shared workspace (not user-scoped)

**Visibility**
- Real-time shared expense feed
- Totals by category, by team member, by vendor
- Simple budgets per category with soft alerts
- CSV export for accountants
- Duplicate-submission detection

## 8a. Chat-Based Intake: Telegram + WhatsApp

Beyond in-app capture, staff can submit expenses by sending a photo, voice note, or text directly to a snapsme bot on Telegram or WhatsApp — meeting people where they already coordinate informally, rather than requiring them to open a separate app.

- **Telegram first**: the Bot API is free and requires no business-verification process, making it the realistic v1 starting point
- **WhatsApp second**: requires WhatsApp Business Cloud API approval, so it follows once the flow is proven on Telegram
- **Shared pipeline**: both channels feed the same extraction pipeline already built for in-app photo/voice capture — this is a third input surface, not a separate system
- **Flow**: staff sends receipt/voice note/text → bot replies with parsed result for quick confirm ("Fuel — ₦5,000 — confirm?") → expense lands in the shared team feed exactly like an in-app submission
- **Account linking**: a one-time `/link` command (using a code generated in-app) maps the Telegram/WhatsApp user to the correct team member and business workspace, so submissions attribute correctly

## 9. Future Phases (Not v1)

- **v1.1 candidates**: petty cash reconciliation (starting balance → top-ups → spend-downs → running balance — a data-model addition, not a bolt-on) and a spend-health indicator (traffic-light per category against budget, rather than raw totals)
- **Phase 2 — Intelligence**: anomaly detection ("this is above your normal spend for this category"), recurring-expense detection, duplicate-vendor matching
- **Phase 3 — Automation**: bank/mobile-money statement sync, automatic reconciliation, supplier price-change tracking
- Each phase depends on data accumulated in the phase before it — this sequencing is deliberate, not arbitrary

## 9a. Why Offline-First and Voice Capture Are in v1, Not Later

Both are extensions of the same core capture loop rather than new surface area — voice-note entry reuses the same AI-extraction Cloud Function as receipt OCR, just with a speech-to-text input instead of an image. Offline persistence is largely a Firestore configuration decision plus a "pending sync" UI state, not a parallel system to maintain.

They're included specifically because they target a gap competitors built for card-heavy, always-online, formal-receipt businesses are unlikely to retrofit: teams that spend in cash, don't always get a printed receipt, and don't have reliable connectivity everywhere they spend. This is a more durable point of difference than adding another dashboard or report type — differentiation on this project should come from *who it's built for*, not from feature count.

## 10. Technical Approach

**Stack**: vanilla JavaScript, HTML, CSS, Firebase — no build tooling, no framework.

- **Firestore** — expenses, businesses, members, categories; business-scoped from day one
- **Firebase Storage** — receipt images, client-compressed before upload to control cost and speed
- **Firebase Auth** — email/phone auth, simple owner/staff roles stored on the member document
- **Cloud Functions** — houses the AI OCR call (vision model → structured JSON); keeps API keys server-side and controls cost/rate-limiting
- **Firebase Hosting** — static deploy, no build step

**Why vanilla JS**: keeps the app genuinely lightweight, avoids React/build-tooling overhead for what is, structurally, a CRUD-plus-AI app. Native ES modules and Firebase's modular SDK (import only what's used) keep bundle size small without needing a bundler.

**State management approach**: a single plain-JS state object per view, updated via Firestore's real-time listeners (`onSnapshot`), with one `render()` function per section redrawing from state. Small functions build DOM output per expense row / dashboard card rather than relying on any component framework.

**Weight discipline**:
- No CSS framework — hand-written CSS with custom properties for theming
- No charting library until the dashboard genuinely needs one
- No date library — native `Intl.DateTimeFormat`
- No router library — a simple view-toggle function is enough at this scale
- Cloud Functions kept single-purpose to avoid slow cold starts

## 11. Monetization (Directional)

Freemium shape: free tier for basic manual + limited AI-scanned entries, paid tier unlocks unlimited AI receipt scanning, multi-user access beyond a small cap, and export/reporting. AI parsing cost is the real cost driver, so pricing should track usage of that specifically rather than being a flat seat price alone.

## 12. Open Strategic Questions

- Build first for internal use at Asterverse, or go straight to external SME customers? This determines how much early effort goes into onboarding polish and multi-tenant billing versus just making the capture loop work well for one team.
- Sequencing of Telegram vs WhatsApp bot rollout, and how much effort to put into the WhatsApp Business API approval process versus leaning on Telegram as the primary chat channel longer-term.
- How aggressively to lean into insights/intelligence positioning later versus staying a clean, focused capture-and-visibility tool long-term.

## 13. One-Sentence Test

The product succeeds if a user's honest description of it is: *"I finally know where my team's money goes, without chasing anyone for a receipt."* If the description that comes back is instead *"it scans receipts,"* the product has been reduced to a feature rather than a reason to keep using it.
