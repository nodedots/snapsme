# snapsme

**Track what comes in and what goes out. See your full money picture in one shared view.**

`snapsme` is a friction-free finance tracking application for small teams (2–10 people). Snap a receipt photo, speak a voice note, or log entries manually — AI extracts details, placing expenses and income into a real-time team feed visible to workspace owners and staff.

It is **not** a heavy enterprise accounting suite. No complex approval workflows or bank syncing. One job: capture expenses and income the moment they happen with minimal friction.

---

## Features

| Area | Feature & Capability |
|------|----------------------|
| **AI Receipt Vision** | Real Gemini Vision extraction (`gemini-2.0-flash-lite`) returning structured expense data (vendor, amount, currency, date, category) with per-field confidence scores (`0.90` high, `0.75` medium, `0.45` low) and `null` field preservation for unreadable items. |
| **Sustainable AI Usage Cap** | Bounded 150 AI-assisted photo/voice captures per business per calendar month (resetting automatically on the 1st of each month). Unlimited manual entry is always free and uncapped. |
| **Voice Note Entry** | Speak expense details when no paper receipt is available. |
| **Manual Entry** | Unlimited manual logging form for full control. |
| **Required Email Staff Invites** | Required email address validation for all staff invitations (`Email Address *`) ensuring invited team members can authenticate via Email/Password or Google Sign-In. Includes inline flagging and email editing for pending invites missing an email. |
| **Top-Level Chat Intake ($O(1)$)** | Telegram & WhatsApp bot webhooks using top-level lookup collections (`telegramLinks/{telegramUserId}` and `whatsappLinks/{whatsappUserId}`) for direct $O(1)$ message identity resolution across workspaces. |
| **Real-Time Team Feed** | Shared workspace feed with live updates for owners and staff. |
| **Dashboard Analytics** | Expense totals by category, staff member, and vendor with budget tracking and soft threshold alerts. |
| **Money Movement Model** | Personal reimbursement, company card, petty cash, and supplier payment tags. |
| **Multi-Currency** | Workspace default currency + live exchange rates conversion. |
| **CSV Export** | Clean CSV exports for accounting and bookkeeping. |
| **Duplicate Detection** | Flags potential duplicate submissions within a configurable time window without blocking saving. |
| **Marketing & Legal Site** | Landing page, help articles, interactive Learn hub, and updated legal pages (`privacy.html`, `terms.html`) detailing Gemini AI processing and data privacy terms. |

---

## Stack

| Layer | Technology |
|-------|------------|
| **App UI** | React 19, Vite 8, Tailwind CSS 4, Motion, Lucide Icons |
| **Server / API** | Express 5 (Vite middleware in dev; serves `dist` in production) |
| **AI Vision & NLP** | Google Gemini API (`gemini-2.0-flash-lite`) with structured JSON schema |
| **Backend & Database** | Firebase Auth, Firestore, Cloud Storage, Cloud Functions (Node 20), Hosting |
| **Marketing & Legal** | Static HTML/CSS/JS under `public/` (privacy, terms, about, help, landing) |
| **Learn Hub** | JSON source in `content/articles/` → generated static HTML & sitemap |

---

## Project Structure

```
snapsme/
├── src/                    # React application
│   ├── components/         # CaptureModal, ExpenseFeed, DashboardView, SettingsView, etc.
│   ├── lib/                # Firestore, Auth, Workspace, Settings, Onboarding, Currencies
│   ├── App.jsx
│   └── main.jsx
├── public/                 # Static marketing site + shared assets
│   ├── home.html, privacy.html, terms.html, help.html, about.html
│   ├── learn/              # Generated Learn hub static pages
│   ├── css/, js/
│   └── assets/
├── content/articles/       # Source JSON for Learn hub articles
├── scripts/                # Article build and public asset copy scripts
├── functions/              # Firebase Cloud Functions (Gemini vision, chat webhooks, lookups)
│   └── index.js
├── server.js               # Express API + local AI extraction endpoints + dev Vite middleware
├── firebase.json           # Hosting & Cloud Functions config
├── firestore.rules         # Security rules (including telegramLinks & whatsappLinks lookup rules)
├── storage.rules           # Storage bucket rules
└── snapsme dev doc/        # Product requirements, PRD, and technical spec
```

---

## Technical Architecture Highlights

### 1. Gemini AI Vision & Sustainable Usage Model

- **Vision Extraction**: `/api/extract-receipt` and `extractReceipt` Cloud Function invoke Gemini Vision with a structured prompt. When fields are unreadable or missing from a receipt photo, `null` is returned rather than fabricated values.
- **150 Scans/Month Cap**: Tracked server-side under `businesses/{businessId}` document (`aiCaptureUsage: { count, periodStart }`). When the limit is reached, server returns status `429` (`ai_limit_reached`) or `503` (`ai_unavailable`).
- **Manual Entry Guarantee**: Manual expense/income entry is unlimited and 100% free with zero dependency on AI quotas.
- **Settings Visibility**: Workspace owners can view monthly AI scan progress via the **AI Feature Usage & Limits** card in `SettingsView.jsx`.

### 2. Required Email Staff Invites & Pending Invite Resolution

- **Email-First Invites**: All staff invitations require a valid email address (`Email Address *`). Phone numbers are optional secondary contact fields.
- **Firestore Invite Lookup**: `findUserBusinesses` matches pending invites strictly by lowercase email (`email.toLowerCase()`) using a Firestore `collectionGroup("members")` query.
- **Missing-Email Invite Flagging**: Any legacy pending invite missing an email address is flagged with `"Missing email — this invite can't be completed"` in Settings, offering an **Add Email** modal (`updateMemberInvite`) for workspace owners to update the invite.

### 3. Top-Level Chat Link Lookups ($O(1)$ Direct Resolution)

Webhook identity resolution uses top-level lookup collections instead of scanning subcollections:
- `telegramLinks/{telegramUserId}`: `{ businessId, userId, linkedAt }`
- `whatsappLinks/{whatsappUserId}`: `{ businessId, userId, linkedAt }`

- **Webhook Execution**: `telegramWebhook` and `whatsappWebhook` perform a single $O(1)$ direct document read (`telegramLinks/{senderId}`) to route photo, voice, or text submissions directly to the correct business workspace.
- **Atomic Unlinking**: Unlinking in Settings (`unlinkChatChannelFirestore`) deletes the top-level lookup document and clears the member document status simultaneously.
- **Firestore Security Rules**: Direct client reads/writes to `telegramLinks` and `whatsappLinks` are blocked (`allow read, write: if false;`), restricting mutations to Cloud Functions via the Firebase Admin SDK.
- **Data Migration**: `migrateChatLinksToTopLevel()` migrates legacy nested member chat IDs into top-level lookup collections.

---

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and fill in credentials:

   ```bash
   cp .env.example .env
   ```

   Minimum environment requirement for AI extraction:

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run the local dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

   - `/` — React expense tracking application
   - `/home` — Marketing landing page
   - `/privacy.html` — Privacy policy & AI data disclosure
   - `/terms.html` — Terms of service & fair-use AI terms
   - `/learn` — Content & article hub
   - `/api/health` — Server health endpoint

---

## Available Scripts

| Script | Action |
|--------|--------|
| `npm run dev` | Starts Express server with Vite dev middleware on port 3000 |
| `npm run build` | Builds Learn articles, compiles Vite app to `dist/`, and copies public assets |
| `npm start` | Runs Express server in production mode (`NODE_ENV=production`) |
| `npm run lint` | Runs syntax check on `server.js` |

Cloud Functions (from `functions/`):

```bash
cd functions
npm install
npm run serve    # Runs Firebase emulators
npm run deploy   # Deploys Cloud Functions to Firebase
```

---

## Legal & Privacy Disclosures

- **Privacy Policy (`public/privacy.html`)**: Details Gemini AI vision processing, data privacy policies, third-party subprocessor terms, Google API data usage terms, and the 150 monthly scan cap.
- **Terms of Service (`public/terms.html`)**: Outlines fair-use AI capture limits, service availability, and manual logging guarantees.

---

## License

Private / Personal Project. All rights reserved.
