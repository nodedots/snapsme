# snapsme

**Know where every dollar went. Without chasing anyone for a receipt.**

snapsme is a lightweight expense tracker for small teams (2–10 people). Snap a receipt photo, send a voice note, or log spend manually — AI extracts vendor, amount, date, and category, then the expense lands in a shared real-time feed the whole team can see.

It is **not** a full accounting suite. No invoicing, payroll, or bank sync. One job: capture team expenses the moment they happen, with almost no friction.

---

## Features

| Area | What you get |
|------|----------------|
| **AI receipt capture** | Photo or document → structured expense (vendor, amount, currency, date, category, line items) with per-field confidence |
| **Voice-note entry** | Speak the expense when there is no paper receipt |
| **Manual entry** | Full form for anything AI cannot (or should not) fill |
| **Real-time team feed** | Shared workspace feed; owner and staff see submissions live |
| **Dashboard** | Totals by category, team member, and vendor; budgets and soft alerts |
| **Money movement model** | Personal reimbursement, company card, petty cash, supplier payment — not enterprise approval chains |
| **Offline-first** | Firestore offline persistence + pending-sync UI; demo mode also works offline via localStorage |
| **Chat intake** | Telegram / WhatsApp link flow (bot + Cloud Functions); in-app link code generator |
| **Multi-currency** | Workspace currency + live exchange rates |
| **CSV export** | Clean export for accountants |
| **Duplicate detection** | Flags likely duplicate submissions without blocking save |
| **Marketing site** | Landing, about, help, FAQ, contact, legal pages, and a static **Learn** hub |

---

## Stack

| Layer | Technology |
|-------|------------|
| **App UI** | React 19, Vite 8, Tailwind CSS 4, Motion, Lucide |
| **Dev / API server** | Express 5 (Vite middleware in dev; serves `dist` in production) |
| **AI extraction** | Google Gemini (vision + voice); optional Unlimited-OCR tier |
| **Backend data** | Firebase Auth, Firestore, Storage, Cloud Functions, Hosting |
| **Marketing pages** | Static HTML/CSS/JS under `public/` |
| **Learn hub** | JSON articles in `content/articles/` → static HTML via build script |

---

## Project structure

```
snapsme/
├── src/                    # React app (expense capture, feed, dashboard, settings)
│   ├── components/         # CaptureModal, ExpenseFeed, DashboardView, etc.
│   ├── lib/                # Firebase, Firestore, storage, currencies, compression
│   ├── App.jsx
│   └── main.jsx
├── public/                 # Static marketing site + shared assets
│   ├── home.html, about.html, help.html, …
│   ├── learn/              # Generated Learn hub + articles
│   ├── css/, js/
│   └── assets/
├── content/articles/       # Source JSON for Learn articles
├── scripts/
│   ├── build-articles.js   # Articles → static HTML + sitemap
│   └── copy-public.mjs     # Copy public assets into dist after Vite build
├── functions/              # Firebase Cloud Functions (extract, chat webhooks)
├── server.js               # Express API + static routes + Vite in dev
├── firebase.json
├── firestore.rules
├── storage.rules
└── snapsme dev doc/        # Product / PRD / technical notes
```

---

## Prerequisites

- **Node.js** 18+ (Cloud Functions target Node 20)
- **npm** (or bun — a lockfile is present)
- A **Gemini API key** for AI receipt/voice extraction ([Google AI Studio](https://aistudio.google.com/))
- Optional: Firebase project for auth, multi-user workspaces, and production Cloud Functions

---

## Quick start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the example env file and fill in values:

   ```bash
   cp .env.example .env
   ```

   Minimum for local AI capture:

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

   See [Environment variables](#environment-variables) for the full list.

3. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

   - `/` — React expense app  
   - `/home` — marketing landing  
   - `/learn` — Learn hub  
   - `/api/health` — server health (includes whether `GEMINI_API_KEY` is set)

Without signing into Firebase, the app runs in **demo mode** (localStorage). Sign in with Google (when Firebase is configured) to use a shared Firestore workspace.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express + Vite on port 3000 |
| `npm run build` | Build Learn articles → Vite production build → copy public assets to `dist/` |
| `npm start` | Same entry as dev (`node server.js`); use `NODE_ENV=production` after a build to serve `dist` |
| `npm run lint` | Syntax-check `server.js` |

Cloud Functions (from `functions/`):

```bash
cd functions
npm install
npm run serve    # emulators
npm run deploy   # deploy functions only
```

---

## Environment variables

Copy `.env.example` → `.env`. Do not commit real secrets.

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | For AI | Receipt vision + voice extraction (server + Cloud Functions) |
| `GEMINI_MODEL` | No | Override default model (default: `gemini-2.0-flash`) |
| `VITE_FIREBASE_*` | For cloud mode | Firebase web config (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `MEASUREMENT_ID`) |
| `UNLIMITED_OCR_URL` | No | Optional Tier-1 OCR microservice (`http://localhost:8000/ocr/extract-receipt`) |
| `ENABLE_UNLIMITED_OCR` | No | Toggle Unlimited-OCR tier |
| `EXCHANGE_RATE_API_KEY` | No | Live FX rates |
| `EXCHANGE_RATE_API_URL` | No | Template URL with `{key}` and `{base}` |
| `PORT` | No | Server port (default `3000`) |
| `NODE_ENV` | No | `development` (Vite middleware) vs `production` (serve `dist`) |

**Cloud Functions secrets** (set via Firebase, not the web `.env`):

- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_ACCESS_TOKEN`

---

## Architecture notes

### Capture pipeline (local server)

`POST /api/extract-receipt` uses a 3-tier hybrid:

1. **Unlimited-OCR** (optional local microservice, $0 token cost)  
2. **Gemini vision** (structured JSON + confidence scores)  
3. **Manual fallback** — empty fields + notice so the user enters data

Voice: `POST /api/extract-voice`. Batch: `POST /api/extract-batch`. FX: `GET /api/exchange-rates`.

### Cloud Functions (`functions/`)

- `extractReceipt` / `extractVoiceNote` — callable AI extraction (keys stay server-side)  
- `linkChatAccount` — one-time chat link codes  
- `telegramWebhook` / `whatsappWebhook` — chat intake → same extraction pipeline → team feed  

### Data model (Firestore)

Business-scoped under `businesses/{businessId}`:

- `members` — roles `owner` | `staff`  
- `categories` — per-workspace names + budgets  
- `expenses` — amount, vendor, money movement, source, confidence, sync status, duplicates  
- `chatLinks` — short-lived Telegram/WhatsApp link codes  

### Dual UI surfaces

- **React SPA** (`src/`) — product experience  
- **Static site** (`public/`) — marketing, help, Learn articles  

Dev server serves both; production build lands in `dist/` for Firebase Hosting or Express.

---

## Learn hub (content)

Articles live as JSON in `content/articles/`. The build script generates:

- `public/learn/index.html`  
- `public/learn/[slug].html` (JSON-LD, Open Graph, related posts)  
- `public/sitemap.xml` and `robots.txt`  

Workflow details: [`content/articles/README.md`](content/articles/README.md).

```bash
npm run build   # regenerates articles + full production bundle
```

---

## Deployment

### Firebase Hosting (static)

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` serves `dist/` and rewrites SPA routes to `index.html`.

### Full stack

1. Deploy Hosting as above  
2. Deploy rules: `firebase deploy --only firestore:rules,storage`  
3. Deploy functions: `cd functions && npm run deploy` (set secrets first)  
4. Or run the Express server in production after `npm run build` with `NODE_ENV=production` and env vars set  

---

## Product docs

Design and planning notes (some early docs describe a vanilla-JS approach; the **shipped app is React + Vite + Express + Firebase**):

| Doc | Path |
|-----|------|
| Project overview | `snapsme dev doc/snapsme-project-overview.md` |
| App description | `snapsme dev doc/snapsme-app-description.md` |
| PRD | `snapsme dev doc/snapsme-PRD.md` |
| Technical spec | `snapsme dev doc/snapsme-technical-spec.md` |
| Build plan | `snapsme dev doc/snapsme-build-plan.md` |
| Style reference | `snapsme dev doc/snapsme-style-reference.md` |

---

## Who it’s for

Small businesses where staff spend on the company’s behalf (cash, card, petty cash, reimbursement) and the owner wants visibility without becoming a full-time bookkeeper.

**Success test:** a user should say *“I finally know where my team’s money goes, without chasing anyone for a receipt”* — not merely *“it scans receipts.”*

---

## License

Private / personal project unless otherwise stated.
)
