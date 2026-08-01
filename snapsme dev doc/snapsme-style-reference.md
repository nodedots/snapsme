# snapsme — Style Reference
> Torn receipt paper meets a clean ledger

**Theme:** light

---

## Design Rationale

Magicbeans borrows Notion's document-native language — warm canvas, hairline borders, color-as-confetti. That's the right instinct for a whiteboard-adjacent product, but snapsme isn't a whiteboard. It's a receipt. The design should feel like the physical object at the center of the product: paper, ink, a printed ledger line, something torn off and handed over. That's the axis this system pulls on instead of squiggles.

The signature move: cards end in a **torn perforated edge** instead of a clean rounded corner — literally the shape of a receipt torn from a roll. Amounts and dates are set in monospace, the way a thermal printer actually renders them, while everything else stays in a warm humanist sans. Color is used functionally, not decoratively — green and amber map directly to the AI-confidence states already in the product (confirmed vs. needs-review), so the palette does real work instead of just adding personality.

---

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Ink | `#1c1b19` | `--color-ink` | Primary text, headline color, primary button background |
| Ledger Green | `#0f7a52` | `--color-ledger-green` | Primary action color, confirmed/success states, positive balance indicators |
| Snap Coral | `#ff5a3c` | `--color-snap-coral` | Capture action (camera/voice buttons), the one warm accent reserved for "add an expense" |
| Amber Flag | `#e0982a` | `--color-amber-flag` | Needs-review / low-confidence AI extraction states, budget-approaching alerts |
| Fiber Gray | `#d9d4c8` | `--color-fiber-gray` | Card borders, perforation dots, dividers — the thermal-paper fiber line |
| Ink Fade | `#6b665c` | `--color-ink-fade` | Secondary/body text, muted labels, placeholder text |
| Paper | `#f7f3ea` | `--color-paper` | Page background — warm, slightly toothy off-white, evokes receipt stock rather than sterile SaaS white |
| Pure White | `#ffffff` | `--color-pure-white` | Card surfaces, elevated receipt cards |
| Mint Wash | `#e7f4ec` | `--color-mint-wash` | Confirmed-expense row background, success toast background |
| Amber Wash | `#fbf1de` | `--color-amber-wash` | Needs-review row background, alert banner background |

## Tokens — Typography

### Space Grotesk — Headlines & UI labels
Geometric but slightly technical — reads as fintech-adjacent without tipping into cold corporate. Used with restraint: headlines and nav/button labels only. · `--font-display`
- **Substitute:** 'Segoe UI', system-ui, sans-serif
- **Weights:** 500, 600, 700
- **Sizes:** 15, 16, 24, 40, 56

### Inter — Body text
Neutral, highly legible workhorse for paragraphs, form labels, and descriptions — carries no personality of its own so it doesn't compete with the display face or the mono accents. · `--font-body`
- **Substitute:** system-ui, -apple-system, 'Segoe UI', sans-serif
- **Weights:** 400, 500
- **Sizes:** 14, 15, 16, 17

### IBM Plex Mono — Amounts, dates, receipt line items
The subject-matter face. Every number that represents money or a date is set in mono, so a dashboard row visually echoes a printed receipt line — this is the single typographic decision that ties the whole system back to the product's real-world object. · `--font-mono`
- **Substitute:** 'Courier New', monospace
- **Weights:** 400, 500
- **Sizes:** 14, 16, 20, 28
- **Role:** Reserved exclusively for currency amounts, dates, and category codes — never used for prose. This restriction is what keeps it feeling intentional rather than decorative.

### Type Scale

| Role | Size | Font | Line Height | Token |
|------|------|------|-------------|-------|
| caption | 14px | Inter | 1.5 | `--text-caption` |
| body | 16px | Inter | 1.5 | `--text-body` |
| label | 15px | Space Grotesk 500 | 1.3 | `--text-label` |
| amount-sm | 16px | IBM Plex Mono | 1.3 | `--text-amount-sm` |
| amount-lg | 28px | IBM Plex Mono | 1.2 | `--text-amount-lg` |
| subheading | 24px | Space Grotesk 600 | 1.3 | `--text-subheading` |
| heading | 40px | Space Grotesk 600 | 1.15 | `--text-heading` |
| display | 56px | Space Grotesk 700 | 1.05 | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 8px
**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 96 | 96px | `--spacing-96` |

### Border Radius

| Element | Value |
|---------|-------|
| nav | 8px |
| tags / status pills | 9999px |
| buttons | 10px |
| inputs | 8px |
| cards (top corners) | 12px |
| cards (bottom edge) | 0 — replaced by the torn-perforation signature, not a radius |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| card | `rgba(28,27,25,0.04) 0px 1px 2px 0px, rgba(28,27,25,0.03) 0px 8px 16px 0px` | `--shadow-card` |
| none | Flat cards used everywhere else — the perforated edge and hairline border do the structural work, not elevation | — |

### Layout

- **Page max-width:** 1120px
- **Section gap:** 64-96px
- **Card padding:** 24-32px
- **Element gap:** 8-16px

## Components

### Torn Receipt Card *(signature component)*
**Role:** The core content container — used for feature blocks, expense-row groupings, and pricing tiers

Background `#ffffff`, top corners radius 12px, 1px solid `--color-fiber-gray` border on the sides and top. The **bottom edge is a jagged perforated line** rendered as an SVG mask (a repeating triangular zigzag, ~10px period) instead of a straight edge or radius — the literal shape of paper torn from a roll. A row of small `--color-fiber-gray` dots sits just above the tear, echoing perforation holes. This is the one component every other card in the system derives from.

### Snap Button
**Role:** The primary capture action — "add an expense," always the loudest button on any screen

Background `--color-snap-coral`, text `#ffffff`, Space Grotesk 500 at 16px, border-radius 10px, padding 14px 28px. Optional small camera-shutter icon inline. This is the only place coral appears as a fill — everywhere else it's reserved for this one action, so it stays recognizable as "the button that captures a receipt."

### Ledger Primary Button
**Role:** Secondary primary actions — confirm, save, export

Background `--color-ledger-green`, text `#ffffff`, Space Grotesk 500 at 16px, border-radius 10px, padding 12px 24px.

### Ghost Text Link
**Role:** Tertiary navigation and inline links

Text only, Inter 400-500 at 14-16px in `--color-ink`. Hover opacity 0.7.

### Confidence Dot
**Role:** Inline indicator of AI-extraction confidence on a field or row

8px filled circle: `--color-ledger-green` for confirmed/high-confidence, `--color-amber-flag` for needs-review. Sits immediately left of the field it describes. This is a functional color use, not decorative — it should always map to a real confidence state in the product, never used ornamentally.

### Amount Chip
**Role:** Displays a currency amount inline in lists, feeds, and cards

IBM Plex Mono 500, sized per context (`--text-amount-sm` in list rows, `--text-amount-lg` in summary cards), color `--color-ink`. No background or border — the monospace treatment alone is what distinguishes it as data rather than prose.

### Status Pill
**Role:** Small labeled state indicator (pending sync, needs review, reimbursed)

Background `--color-mint-wash` or `--color-amber-wash` depending on state, text in the corresponding `--color-ledger-green` or `--color-amber-flag`, Inter 500 at 13px, border-radius 9999px, padding 4px 12px.

### Nav Bar
**Role:** Top navigation — minimal, asymmetric

Logo left (wordmark "snapsme" in Space Grotesk 600, small torn-corner glyph as the mark), 2-3 text links right. Background transparent over `--color-paper`. Height ~60px, no border, no shadow.

### Feature Icon Set
**Role:** Small outlined icons for feature lists

Stroke-only, 1.5-2px stroke weight, color `--color-ink`, 20-24px. Never filled.

## Do's and Don'ts

### Do
- Set every currency amount and date in IBM Plex Mono — this is the single most important rule in the system, since it's what ties the UI back to the receipt subject matter
- Use the torn-perforation edge on primary content cards; reserve plain hairline-bordered rectangles for minor/utility surfaces only
- Reserve Snap Coral exclusively for the capture action — if it starts appearing on multiple buttons per screen, it's been overused
- Use Ledger Green and Amber Flag functionally, tied to real confidence/status states — never as generic decoration
- Keep the page background warm (`--color-paper`), never pure white
- Set body copy in Inter, headlines in Space Grotesk — don't mix the two within the same text role

### Don't
- Don't use IBM Plex Mono for any prose, labels, or headlines — it's reserved for numbers and dates only, or the signature loses its meaning
- Don't apply the torn-perforation edge to more than one card type per screen — it's a signature, not a default border-radius replacement
- Don't use Snap Coral as a background fill anywhere except the capture button
- Don't add drop-shadows to cards beyond the single flat `--shadow-card` value — elevation stays quiet, the perforation carries the visual interest
- Don't introduce additional accent colors outside Ledger Green, Snap Coral, and Amber Flag
- Don't use border-radius above 12px on cards, or introduce fully rounded (9999px) card corners — that reads as generic SaaS, not receipt paper

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper | `#f7f3ea` | Page background |
| 1 | Pure White | `#ffffff` | Card surfaces |
| 2 | Mint Wash | `#e7f4ec` | Confirmed/success states |
| 2 | Amber Wash | `#fbf1de` | Needs-review/alert states |
| 3 | Ink | `#1c1b19` | Headlines, primary text, dark UI accents |

## Elevation

- **Torn Receipt Card:** `rgba(28,27,25,0.04) 0px 1px 2px 0px, rgba(28,27,25,0.03) 0px 8px 16px 0px` — deliberately subtle; the perforated edge is the visual event, not the shadow

## Imagery

No photography. The product screenshot (dashboard/expense feed) is shown inside a Torn Receipt Card, reinforcing the paper metaphor even for the UI-chrome-heavy hero image. No hand-drawn decorative squiggles — the perforation motif and confidence dots carry the personality instead, kept functional rather than purely ornamental. Icons are thin-stroke line icons in `--color-ink`, never filled.

## Layout

Max-width 1120px centered. Hero: centered single-column stack — headline in Space Grotesk 56px with one inline mono-set example amount, body subtext in Inter 17px, Snap Coral capture-style CTA below. Directly under the hero, a single Torn Receipt Card containing the product screenshot, full-bleed image with the perforated bottom edge cutting across it. Feature sections use Torn Receipt Cards in a 3-column grid on desktop, single column on mobile. Generous vertical rhythm — 64-96px section gaps.

## Agent Prompt Guide

**Quick Color Reference**
- text: `#1c1b19`
- background: `#f7f3ea`
- card surface: `#ffffff`
- border: `#d9d4c8`
- capture action: `#ff5a3c`
- confirm/primary action: `#0f7a52`
- needs-review flag: `#e0982a`

**Example Component Prompts**

1. Create a hero section: background `#f7f3ea`. Headline "Know where every dollar went" at 56px Space Grotesk 700, color `#1c1b19`, line-height 1.05, centered, with the amount word set in IBM Plex Mono 700 to visually echo a receipt amount. Subtext at 17px Inter 400, color `#6b665c`, max-width 520px, centered, 20px below headline. Coral capture button below: bg `#ff5a3c`, text `#ffffff`, Space Grotesk 500 16px, border-radius 10px, padding 14px 28px, small camera-shutter icon inline, 28px gap above.

2. Create a torn receipt card: container background `#ffffff`, top corners radius 12px, 1px solid `#d9d4c8` border on sides/top, bottom edge clipped with a repeating triangular zigzag mask (10px period, 6px depth) instead of a straight edge, row of 4px `#d9d4c8` dots positioned 4px above the tear line. Shadow: `rgba(28,27,25,0.04) 0px 1px 2px 0px, rgba(28,27,25,0.03) 0px 8px 16px 0px`. Padding 32px (0 at the very bottom to let the tear read cleanly).

3. Create an expense row: flex row, left side shows vendor name in Inter 500 16px `#1c1b19` with an 8px confidence dot to its left (`#0f7a52` if confirmed, `#e0982a` if needs review), right side shows the amount in IBM Plex Mono 500 16px `#1c1b19`. Category shown below vendor name as a Status Pill (bg `#e7f4ec`, text `#0f7a52`, Inter 500 13px, radius 9999px, padding 4px 12px).

4. Create a top nav: background transparent over `#f7f3ea`, height 60px, padding 0 24px, flexbox with wordmark left ("snapsme" in Space Grotesk 600 16px `#1c1b19`) and 2-3 text links right (Inter 400 14px `#1c1b19`, 24px gap between them).

## Similar Brands

- **Wave / Ramp** — Same functional-color-first restraint (green/amber map to real states, not decoration), though snapsme adds the physical-paper metaphor those products skip entirely
- **Monzo (early brand era)** — Same instinct to make a financial product feel warm and tactile rather than corporate, through material metaphor rather than illustration
- **Notion / Magicbeans** — Shares the warm-canvas, hairline-border restraint, but replaces confetti squiggles with a subject-native signature (the torn edge) tied directly to what the product actually does

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-ink: #1c1b19;
  --color-ledger-green: #0f7a52;
  --color-snap-coral: #ff5a3c;
  --color-amber-flag: #e0982a;
  --color-fiber-gray: #d9d4c8;
  --color-ink-fade: #6b665c;
  --color-paper: #f7f3ea;
  --color-pure-white: #ffffff;
  --color-mint-wash: #e7f4ec;
  --color-amber-wash: #fbf1de;

  /* Typography — Font Families */
  --font-display: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', 'Courier New', monospace;

  /* Typography — Scale */
  --text-caption: 14px;
  --text-body: 16px;
  --text-label: 15px;
  --text-amount-sm: 16px;
  --text-amount-lg: 28px;
  --text-subheading: 24px;
  --text-heading: 40px;
  --text-display: 56px;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 8px;
  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-96: 96px;

  /* Layout */
  --page-max-width: 1120px;
  --section-gap: 64-96px;
  --card-padding: 24-32px;

  /* Border Radius */
  --radius-nav: 8px;
  --radius-buttons: 10px;
  --radius-inputs: 8px;
  --radius-cards-top: 12px;
  --radius-pills: 9999px;

  /* Shadows */
  --shadow-card: rgba(28,27,25,0.04) 0px 1px 2px 0px, rgba(28,27,25,0.03) 0px 8px 16px 0px;

  /* Surfaces */
  --surface-paper: #f7f3ea;
  --surface-pure-white: #ffffff;
  --surface-mint-wash: #e7f4ec;
  --surface-amber-wash: #fbf1de;
  --surface-ink: #1c1b19;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-ink: #1c1b19;
  --color-ledger-green: #0f7a52;
  --color-snap-coral: #ff5a3c;
  --color-amber-flag: #e0982a;
  --color-fiber-gray: #d9d4c8;
  --color-ink-fade: #6b665c;
  --color-paper: #f7f3ea;
  --color-pure-white: #ffffff;
  --color-mint-wash: #e7f4ec;
  --color-amber-wash: #fbf1de;

  /* Typography */
  --font-display: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', 'Courier New', monospace;

  /* Typography — Scale */
  --text-caption: 14px;
  --text-body: 16px;
  --text-label: 15px;
  --text-amount-sm: 16px;
  --text-amount-lg: 28px;
  --text-subheading: 24px;
  --text-heading: 40px;
  --text-display: 56px;

  /* Spacing */
  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-96: 96px;

  /* Border Radius */
  --radius-nav: 8px;
  --radius-buttons: 10px;
  --radius-inputs: 8px;
  --radius-cards-top: 12px;
  --radius-pills: 9999px;

  /* Shadows */
  --shadow-card: rgba(28,27,25,0.04) 0px 1px 2px 0px, rgba(28,27,25,0.03) 0px 8px 16px 0px;
}
```
