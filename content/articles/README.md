# SnapSME Learn — Article Publishing Workflow

This directory contains the source definitions for all static articles published in the **SnapSME Learn** hub (`/learn/`).

## How to Add a New Article (Repeatable Workflow)

Follow these 5 simple steps whenever you want to publish a new guide or article:

### Step 1: Create a JSON file in `/content/articles/`
Create a new file named `[your-article-slug].json` in this directory (e.g. `managing-petty-cash-for-small-teams.json`).

Use the following template:

```json
{
  "slug": "managing-petty-cash-for-small-teams",
  "title": "How to Manage Petty Cash Without Losing Track of Cash Flow",
  "summary": "A practical guide for small business owners on setting up a simple, accountable petty cash system for day-to-day team expenses.",
  "category": "Cash Flow & Control",
  "publishDate": "2026-08-04",
  "readTime": "5 min read",
  "author": "The SnapSME Team",
  "keywords": ["petty cash", "small business expense tracking", "receipt capture", "cash flow"],
  "sections": [
    {
      "heading": "Why Petty Cash Quickly Becomes a Black Hole",
      "content": [
        "Small teams often rely on cash for quick daily purchases — parking fees, emergency office hardware, or driver fuel. Without a simple logging routine, cash receipts get lost and owners end up guessing where the money went.",
        "Establishing clear rules and digital photo receipt capture prevents discrepancies before month-end reviews."
      ],
      "callout": "Never hand out cash without requiring an immediate photo receipt snap."
    },
    {
      "heading": "3 Simple Rules for Petty Cash Accountability",
      "content": "Keep your cash fund small and predictable by enforcing these 3 practical rules:",
      "bullets": [
        "Set a strict single-purchase cap (e.g. $50 max per cash transaction).",
        "Require team members to snap a photo receipt within 24 hours of spending.",
        "Reconcile the physical cash box weekly against logged digital receipts."
      ]
    }
  ]
}
```

---

### Step 2: Build Static Pages & Hub Index
Run the static generator command in your terminal:

```bash
npm run build
```

This automatically:
1. Compiles every JSON file in `content/articles/` into a fully rendered static HTML page under `public/learn/[slug].html` complete with **schema.org Article JSON-LD**, **Open Graph meta tags**, and **Related Articles**.
2. Updates `public/learn/index.html` (the main Learn hub page).
3. Updates `public/sitemap.xml` and `public/robots.txt`.
4. Copies all assets into `dist/` for production deployment.

---

### Step 3: Verify the New Article
Start the server or run `npm run dev`:

```bash
npm run dev
```

Visit:
- `http://localhost:3000/learn/` (Check that your new article appears in the search/filter grid)
- `http://localhost:3000/learn/[your-article-slug].html` (Check article typography, reading time, and related guides)

---

### Step 4: Add Natural Internal Links (Optional but Recommended for SEO)
Where natural, add links to your new article from related pages (such as `/help.html`, `/faq.html`, or other articles).

---

### Step 5: Deploy to Production
Deploy your updated repository or push to Firebase Hosting. Your new article is 100% pre-rendered static HTML, requiring zero client-side fetching or headless CMS dependencies!
