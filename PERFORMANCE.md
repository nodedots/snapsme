# snapsme Performance Audit Report

**Date:** 2026-08-11  
**Scope:** Full project page weight, JS loading, CSS, assets, Firestore, Cloud Functions  
**Constraint:** No bundler/framework introduced as a “fix.” Changes stay within the existing architecture (static marketing pages + Vite/React app shell + public vanilla modules).

---

## Executive summary

The original product intent was a lightweight, vanilla, no-build experience. **Marketing pages (`/`, `/learn`, `/about`, …) still match that intent** after fixes. **The workspace app (`/app`) has grown into a React + Vite SPA** with Firebase modular SDK, Tailwind via Vite, and large view components — that is the main architectural weight, and fixing it “back to pure vanilla” would be a large rewrite (flagged, not done unilaterally).

**Biggest real wins this pass:** asset bloat (logo / nodedots / snapshot / favicon) and eager Firebase load on every marketing page via the header.

---

## 1. Page weight audit

### Measured transferred sizes (local, uncompressed HTTP)

| Asset / page | Before | After | Notes |
|---|---:|---:|---|
| `/logo.jpg` | **546,364 B** (~533 KB) | **8,788 B** (~8.6 KB) | Used in every header; was the #1 marketing-page cost |
| `/favicon` path | 546 KB via logo or empty 204 | **1,522 B** `/favicon.jpg` | Server now serves small favicon for `.ico` too |
| `/nodedots.png` | **995,582 B** (~972 KB) | **~3.2 KB** (jpg/png copy) | About-page avatar only |
| `/image/dashboard-snapshot.*` | **88,046 B** PNG | **47,593 B** JPEG | Homepage product preview |
| Homepage HTML | ~23 KB | ~23 KB | Structure unchanged |
| `components.css` | 55.8 KB | 55.8 KB | Shared design system (acceptable) |
| `layout.css` | 19.4 KB | 19.4 KB | |
| `motion.css` | 6.5 KB | 6.5 KB | Landing only |
| `auth.js` (source) | 30.7 KB | 30.7 KB | **No longer loaded on learn articles**; lazy from header |
| Chart.js | — | CDN only when dashboard mounts | Confirmed **not** global |

### Approximate first-paint critical weight — homepage (marketing)

| Layer | Before (est.) | After (est.) |
|---|---:|---:|
| HTML + CSS (comp+layout+motion) | ~105 KB | ~105 KB |
| Logo in header | **533 KB** | **9 KB** |
| Dashboard snapshot | **88 KB** | **48 KB** |
| Header JS (before Firebase) | blocked on auth+Firebase | paints first, auth deferred |
| **Rough image-critical delta** | | **~−564 KB** on first paint assets alone |

### Third-party scripts

| Script | Pattern | Scope | Verdict |
|---|---|---|---|
| Firebase (public pages) | Modular CDN (`firebase-app`, `firebase-auth`, `firebase-firestore` only) | Was every page via `header → auth` | **Modular ✓**; now **lazy after paint** |
| Firebase (app) | Modular npm `firebase/*` | `/app` only | **Modular ✓** |
| Chart.js 4.x | jsDelivr UMD injected by `cashflow-charts.js` | Dashboard view only | **Not global ✓** |
| Google Fonts | Inter + IBM Plex Mono (+ was Space Grotesk on app) | Shared | Space Grotesk **removed** from app (unused; `font-display` maps to Inter) |
| XLSX (CSV import) | CDN lazy in import helpers | Import modal only | OK |

### Firebase SDK style

- **Public:** `import { … } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-*.js"` — modular tree-shakeable endpoints.  
- **App:** `import { … } from "firebase/firestore"` etc. — modular.  
- **Not** using the monolithic `firebase.js` namespaced SDK.

---

## 2. JavaScript loading & execution

### Findings

| Issue | Severity | Fix |
|---|---|---|
| `header.js` top-level imported `auth.js` + Firebase Auth CDN, and awaited `initAuth()` **before painting** | High on marketing pages | Header paints from localStorage first; **dynamic `import("./auth.js")` after paint**; Sign-in click also lazy-loads auth |
| Redundant `<script src="/js/auth.js">` on homepage + every Learn article (header already pulled auth) | Medium | Removed standalone auth scripts from homepage, learn hub, all learn articles, and `build-articles.js` templates |
| Chart setup on every page | — | Confirmed dashboard-only via runtime import of `/js/cashflow-charts.js` |
| Landing `setInterval` feed flash ran forever even off-screen | Low | Interval starts only when preview is **in view** and tab is **visible**; stops otherwise |
| IntersectionObserver reveals | OK | Already `unobserve` after first reveal; reduced-motion early return |
| App Firestore listeners | OK | `subscribeToBusiness` returns combined unsubscribe; `App.jsx` cleans up on unmount |

### Script tags

- `type="module"` scripts are deferred by HTML spec (non-blocking for parse).  
- No blocking classic scripts for core app logic (aside from small inline mobile-menu snippet on landing).

### Chart.js

- Loaded only when Cashflow Overview mounts on the dashboard.  
- Instances destroyed on period change / unmount (no duplicate canvas leak pattern).

---

## 3. CSS audit

| Finding | Action |
|---|---|
| `app.html` linked `components.css` + `layout.css` **and** `src/index.css` re-imports them via Vite | **Removed link tags from `app.html`** — CSS now loads once through Vite |
| `torn-receipt-card` / ledger aliases still present | **Kept** — still referenced by FAQ/contact HTML and components; not dead weight |
| True dead CSS from abandoned design | No large orphaned blocks safe to delete without visual QA; **not bulk-deleted** |
| Duplication of design tokens in `index.css` vs `components.css` | Flagged for future consolidation (low risk / low gain) |

---

## 4. Images & assets

| Check | Result | Fix |
|---|---|---|
| Receipt compression before upload | **Implemented** in `src/lib/imageCompression.js`; used by Capture + Income capture | Improved: was skipping re-encode for any JPEG under 2MB even if **dimensions** were huge; now downscales when over max width/height |
| Hero SVGs | **330–1080 B each** — already lean | No change |
| Brand logo upload | 5MB cap, no dimension resize | Cap **1MB**; canvas resize to **max 256px**, JPEG data URL |
| `logo.jpg` / nodedots / snapshot | Severely oversized for display size | Compressed (see table above); originals kept under `public/assets/originals/` |

---

## 5. Firestore query efficiency

| Check | Result | Fix |
|---|---|---|
| Live expenses/income listeners | `orderBy("createdAt","desc")` with **no limit** — full history | Added **`limit(FEED_QUERY_LIMIT)` (500)** on both listeners |
| Period filtering for charts | Client-side over already-subscribed arrays | OK for small-team volumes; server period queries would need indexes + architectural change |
| Collection group `members` by `userId` | Field override present | OK |
| Collection group `members` by `email` | Used in invite resolve; index not declared | Added **email collection-group field override** in `firestore.indexes.json` |
| Pagination on feeds | None | Cap is a safety net; true cursor pagination = larger UX work (**recommendation**) |

Deploy indexes after pull:

```bash
firebase deploy --only firestore:indexes
```

---

## 6. Cloud Functions efficiency

| Function | Role | Verdict |
|---|---|---|
| `extractReceipt` | Vision → structured JSON | Single-purpose ✓ |
| `extractVoiceNote` | STT → same extraction | Single-purpose ✓ |
| `linkChatAccount` | Link codes | Single-purpose ✓ |
| `telegramWebhook` / `whatsappWebhook` | Chat intake | Single-purpose channels ✓ |
| `apiIncome` / `apiExpenses` | HTTP push APIs | Separate entry points ✓ |

- Secrets stay server-side.  
- No evidence of intentional keep-warm pings.  
- AI path is one model call per request (with model fallback list on server Express path — separate from CF).  
- **Recommendation:** if Express `/api/extract-*` and Cloud Functions both exist, document which is production of record to avoid dual maintenance (not a runtime weight issue).

---

## 7. Real-world load (qualitative)

| Scenario | Expectation after fixes |
|---|---|
| Few hundred expense+income rows | Within 500-doc cap; charts aggregate client-side — should stay responsive on modern phones |
| Slow 3G | Marketing pages no longer wait on Firebase before header paint; logo/snapshot much smaller — faster first contentful paint |
| Dashboard + charts | Chart.js still ~200KB+ gzip CDN on first dashboard visit (one-time); not loaded on landing/learn |

**Not instrumented in CI:** automated Lighthouse. Manual throttling recommended in DevTools after deploy.

---

## Fixes applied (checklist)

1. Compressed `logo.jpg`, favicon, nodedots, dashboard snapshot; kept originals under `public/assets/originals/`.  
2. Favicon links → `/favicon.jpg`; server `/favicon.ico` serves that file.  
3. Lazy Firebase/auth in `public/js/header.js` (paint-first).  
4. Removed redundant `/js/auth.js` script tags from homepage + all learn pages + article generator.  
5. Removed unused Space Grotesk font from `app.html`.  
6. Removed double CSS link on `app.html` (Vite-only CSS path).  
7. Landing motion interval gated by visibility + IntersectionObserver.  
8. Firestore expense/income listeners capped at 500.  
9. Collection-group index override for `members.email`.  
10. Receipt compression always respects max dimensions.  
11. Brand logo upload: 1MB + 256px downscale.  

---

## Honest architecture notes (not “fixed” this pass)

| Topic | Reality | Recommendation |
|---|---|---|
| “Vanilla only, no build” | **Marketing site is vanilla.** **Workspace `/app` is React 19 + Vite 8 + Tailwind.** | Either restate the goal as “vanilla marketing + SPA app,” or plan a multi-sprint port of app shell to public ES modules |
| SettingsView / DashboardView size | 40–100 KB source each | Split views only if profiling shows parse cost; not urgent vs images/Firebase |
| Full history / reports beyond 500 rows | Cap may hide older rows | Cursor pagination + period-scoped queries |
| Chart.js weight | Acceptable deferred cost | Optional lighter canvas charts later if needed |
| Google Fonts | Still external RTT | Optional self-host Inter subset for offline field use |

---

## Before / after — headline numbers

| Metric | Before | After |
|---|---:|---:|
| Header logo bytes | 546 KB | **8.6 KB** (~98% smaller) |
| About avatar (nodedots) | 972 KB | **3.2 KB** (~99% smaller) |
| Homepage product image | 88 KB PNG | **48 KB** JPEG |
| Learn pages: eager auth script tag | Yes (every article) | **No** (lazy via header) |
| App CSS double-fetch | Yes | **No** |
| Firestore feed download | Unbounded | **Max 500** newest each of expense + income |
| Chart.js on homepage | No | No (unchanged, correct) |

---

*This report documents the audit and the fixes committed alongside it. Re-measure with browser Network panel (disable cache, Slow 3G) after deploy for production confirmation.*
