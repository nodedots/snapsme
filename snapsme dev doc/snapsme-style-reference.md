# SnapSME — Style Reference
> Warm paper notebook under afternoon sun

**Theme:** light

---

## Design Rationale

SnapSME reads like a well-loved paper notebook under afternoon light: a warm off-white canvas (`#f6f5f4`) that feels tactile rather than clinical, generous sans typography that gives editorial weight to product copy, and color used as sparse punctuation — peachy pills highlight verbs, a single blue anchors the primary action, and a rotating cast of accent hues (coral, amber, sky, midnight) paints the feature card backgrounds like sticky notes. Cards sit on the canvas with 1px hairline borders (`rgba(0,0,0,0.08)`) and 12px corners — no shadows, no chrome — like ruled sections in a Moleskine. Motion is playful and springy, with 200ms ease transitions and bouncy character-mark animations that make the interface feel alive without ever being decorative.

---

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Notion Blue | `#0075de` | `--color-notion-blue` | Primary CTA fill, active nav accent, filled action buttons — the single chromatic commitment in a near-monochrome system, saturated enough to read as a switch |
| Paper Warmth | `#f6f5f4` | `--color-paper-warmth` | Page canvas, hero background, section backgrounds — warm off-white gives the system its tactile analog feel |
| Pure White | `#ffffff` | `--color-pure-white` | Card surfaces, elevated panels, logo-wall background, contrast text on dark cards |
| Ink Black | `#000000` | `--color-ink-black` | Primary text, nav links, headings — deployed at varying alpha (100%, 95%, 90%, 60%, 40%, 20%) to build hierarchy without adding new colors |
| Charcoal | `#111111` | `--color-charcoal` | Dark text variant for specific UI moments where pure black would feel too harsh |
| Stone | `#757575` | `--color-stone` | Secondary nav text, muted helper text, deactivated button labels — the 60% alpha of ink |
| Graphite | `#615d59` | `--color-graphite` | Body text with warm cast — the brown-tinted gray that harmonizes with the warm canvas |
| Slate | `#696969` | `--color-slate` | Card body text, secondary content within cards — slightly lighter than Stone |
| Sky Tint | `#e6f3fe` | `--color-sky-tint` | Ghost CTA background, soft blue wash for secondary actions, tinted hover states |
| Marigold | `#ffb110` | `--color-marigold` | Hero pill highlights, Agent feature card background, warm accent for callouts — the first color the eye finds |
| Coral | `#f64932` | `--color-coral` | Decorative card backgrounds, hero pill alternates, warm-to-hot accent in the rotating cast |
| Saffron | `#e89d01` | `--color-saffron` | Body-section accent panels, secondary warm yellow for background washes |
| Vermillion | `#e32d14` | `--color-vermillion` | Deep coral for saturated body-section backgrounds, signal-warm accent |
| Mocha | `#b18164` | `--color-mocha` | Warm brown accent for body-section panels — the earthy member of the accent cast |
| Signal Blue | `#097fe8` | `--color-signal-blue` | Decorative card backgrounds, hero decorative highlights, secondary blue for visual variety |
| Sky Wash | `#62aef0` | `--color-sky-wash` | Lightest blue in the cast — decorative backgrounds, heading accent highlights, airy washes |
| Midnight Ink | `#02093a` | `--color-midnight-ink` | Violet wash for highlight backgrounds, decorative bands, and soft emphasis behind content. |

---

## Tokens — Typography

### NotionInter — Primary sans-serif
Geometric humanist with slight quirks, deployed at 400 for body, 500 for nav/UI, 600-700 for display headings. The type-scale uses aggressive negative letter-spacing at large sizes (-4.6px at 96px, -2px at 72px) that tightens the headline to feel confident and compact rather than airy. · `--font-notioninter`
- **Substitute:** Inter, ui-sans-serif, system-ui, sans-serif
- **Weights:** 400, 500, 600, 700
- **Sizes:** 12px, 14px, 16px, 20px, 22px, 24px, 40px, 42px, 48px, 54px, 72px, 96px

### Lyon Text — Editorial serif
Reserved for specific body-text moments and section intros — used sparingly to give voice a literary weight, like a pull-quote in a magazine layout. Functions as a system accent, not a parallel hierarchy. · `--font-lyon-text`
- **Substitute:** Source Serif Pro, Georgia, serif
- **Weights:** 400
- **Sizes:** 18px, 32px

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.33 | 0.12px | `--text-caption` |
| body-sm | 14px | 1.43 | — | `--text-body-sm` |
| body | 16px | 1.5 | — | `--text-body` |
| subheading | 20px | 1 | — | `--text-subheading` |
| heading-sm | 22px | 1.27 | -0.242px | `--text-heading-sm` |
| heading | 40px | 1.5 | — | `--text-heading` |
| heading-lg | 48px | 1.5 | — | `--text-heading-lg` |
| display-sm | 54px | 1.04 | -1.89px | `--text-display-sm` |
| display | 72px | 1.21 | -2.016px | `--text-display` |
| display-lg | 96px | 1.04 | -4.608px | `--text-display-lg` |

---

## Tokens — Spacing & Shapes

**Base unit:** 4px
**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 32 | 32px | `--spacing-32` |
| 36 | 36px | `--spacing-36` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |

### Border Radius

| Element | Value |
|---------|-------|
| cards | 12px |
| pills | 9999px |
| small | 4px |
| buttons | 8px |

### Layout

- **Page max-width:** 1440px
- **Section gap:** 80px
- **Card padding:** 24px
- **Element gap:** 8px

---

## Components

### Primary CTA Button
**Role:** Filled blue action button for the main conversion goal  
Background `#0075de`, text `#ffffff` at 14px NotionInter weight 500, border-radius 8px, padding `6px 15px`.

### Ghost CTA Button
**Role:** Secondary action with a subtle blue tint  
Background `#e6f3fe` (sky tint), text `#0075de` at 14px weight 500, border-radius 8px, padding `6px 15px`.

### Ghost Text Button
**Role:** Minimal action button with no fill or border  
Background transparent, text `#000000` at 95% alpha, border-radius 8px, padding `6px 15px`.

### White Feature Card
**Role:** Standard content card on warm canvas  
Background `#ffffff`, border-radius 12px, padding 24px, 1px solid border at `rgba(0,0,0,0.08)`, no shadow.

### Accent Feature Card
**Role:** Full-bleed colored card for feature blocks  
Background one of the accent hues (`#ffb110`, `#f64932`, `#62aef0`, `#e6f3fe`), border-radius 12px, padding 24px, no border.

### Dark Feature Card
**Role:** Inverted card for dark-on-light contrast moments  
Background `#02093a` (midnight), text `#ffffff`, border-radius 12px, padding 24px.

### Hero Highlight Pill
**Role:** Colored pill placed behind a verb in hero copy  
Background accent color (peach `#f6d5b8`, yellow `#ffb110`, or coral `#f64932`), text `#000000`, border-radius 9999px, padding `8px 24px`.

---

## Do's and Don'ts

### Do
- Use `#f6f5f4` as the page canvas and `#ffffff` for card surfaces
- Reserve `#0075de` for the single primary action per screen
- Apply negative letter-spacing to display sizes (`-4.6px` at 96px, `-2px` at 72px)
- Use 1px solid borders at `rgba(0,0,0,0.08)` instead of shadows to separate cards
- Use 12px border-radius for cards and 8px for buttons

### Don't
- Do not use pure `#ffffff` as the page background — the warm `#f6f5f4` canvas is signature
- Do not add shadows to content cards — hairline borders only
- Do not use multiple chromatic button colors in the same view — `#0075de` is the primary fill
