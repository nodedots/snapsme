/**
 * SnapSME — Static Article Generator & Learn Hub Builder
 *
 * Reads article definitions from content/articles/*.json
 * Generates:
 *   - /public/learn/index.html (Learn Hub Page)
 *   - /public/learn/[slug].html (Static HTML Article Pages with JSON-LD, Open Graph, & Related Posts)
 *   - /public/sitemap.xml & /public/robots.txt
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const articlesDir = join(rootDir, "content", "articles");
const publicDir = join(rootDir, "public");
const learnDir = join(publicDir, "learn");

// Ensure output directory exists
if (!existsSync(learnDir)) {
  mkdirSync(learnDir, { recursive: true });
}

// 1. Read all article JSON files
const articleFiles = readdirSync(articlesDir).filter((f) => f.endsWith(".json"));
const articles = [];

for (const file of articleFiles) {
  try {
    const raw = readFileSync(join(articlesDir, file), "utf-8");
    const article = JSON.parse(raw);
    articles.push(article);
  } catch (err) {
    console.error(`[build-articles] Error reading ${file}:`, err.message);
  }
}

// Sort articles by publish date descending
articles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

console.log(`[build-articles] Loaded ${articles.length} articles.`);

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Helper: Render paragraphs & headers from article body array
function renderArticleBody(sections) {
  return sections
    .map((section) => {
      let html = `<div class="article-section" style="margin-bottom: 32px;">`;
      if (section.heading) {
        html += `<h2 style="font-family: var(--font-notioninter); font-size: 22px; font-weight: 700; color: #1c1b19; margin: 0 0 14px 0; line-height: 1.35; letter-spacing: -0.02em;">${escapeHtml(section.heading)}</h2>`;
      }
      if (Array.isArray(section.content)) {
        section.content.forEach((paragraph) => {
          html += `<p style="font-family: var(--font-notioninter); font-size: 16px; line-height: 1.7; color: var(--color-graphite, #45433f); margin: 0 0 16px 0;">${paragraph}</p>`;
        });
      } else if (typeof section.content === "string") {
        html += `<p style="font-family: var(--font-notioninter); font-size: 16px; line-height: 1.7; color: var(--color-graphite, #45433f); margin: 0 0 16px 0;">${section.content}</p>`;
      }
      if (Array.isArray(section.bullets)) {
        html += `<ul style="margin: 0 0 20px 20px; padding: 0; list-style-type: disc;">`;
        section.bullets.forEach((bullet) => {
          html += `<li style="font-family: var(--font-notioninter); font-size: 15px; line-height: 1.6; color: var(--color-graphite, #45433f); margin-bottom: 8px;">${bullet}</li>`;
        });
        html += `</ul>`;
      }
      if (section.callout) {
        html += `<div style="background-color: #f7f3ea; border-left: 4px solid var(--color-notion-blue, #0075de); border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; font-family: var(--font-notioninter); font-size: 15px; line-height: 1.6; color: #1c1b19;">
          <strong>Tip:</strong> ${section.callout}
        </div>`;
      }
      html += `</div>`;
      return html;
    })
    .join("\n");
}

// 2. Generate Individual Article HTML Files
articles.forEach((art) => {
  const slug = art.slug;
  const canonicalUrl = `https://snapsme.com/learn/${slug}`;
  const relatedArticles = articles
    .filter((a) => a.slug !== slug)
    .slice(0, 3);

  const articleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(art.title)} — SnapSME Learn</title>

  <!-- SEO & Meta Tags -->
  <meta name="description" content="${escapeHtml(art.summary)}" />
  <meta name="keywords" content="${escapeHtml(art.keywords ? art.keywords.join(", ") : "small business expense tracking, receipt management, finance guide")}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(art.title)}" />
  <meta property="og:description" content="${escapeHtml(art.summary)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="SnapSME" />
  <meta property="article:published_time" content="${art.publishDate}" />
  <meta property="article:author" content="${escapeHtml(art.author || "The SnapSME Team")}" />
  <meta property="article:section" content="${escapeHtml(art.category || "Expense Management")}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(art.title)}" />
  <meta name="twitter:description" content="${escapeHtml(art.summary)}" />

  <!-- Structured Data / JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(art.title)},
    "description": ${JSON.stringify(art.summary)},
    "datePublished": ${JSON.stringify(art.publishDate)},
    "author": {
      "@type": "Organization",
      "name": ${JSON.stringify(art.author || "The SnapSME Team")}
    },
    "publisher": {
      "@type": "Organization",
      "name": "SnapSME",
      "logo": {
        "@type": "ImageObject",
        "url": "https://snapsme.com/logo.jpg"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": ${JSON.stringify(canonicalUrl)}
    }
  }
  </script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://snapsme.com/home"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Learn",
        "item": "https://snapsme.com/learn/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": ${JSON.stringify(art.title)},
        "item": ${JSON.stringify(canonicalUrl)}
      }
    ]
  }
  </script>

  <!-- Fonts & Styles -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="icon" type="image/jpeg" href="/logo.jpg">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/css/layout.css">
</head>
<body class="bg-[#f6f5f4] text-[#000000] font-body min-h-screen antialiased selection:bg-[#0075de]/20 selection:text-[#000000]">

  <!-- Header Container -->
  <div id="snapsme-header"></div>

  <!-- Document Main Wrapper -->
  <div class="document-container" style="max-width: 760px; margin: 0 auto; padding: 40px 20px 80px 20px;">
    
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" style="margin-bottom: 24px; font-family: var(--font-notioninter); font-size: 13px; color: #6b665c;">
      <a href="/home" style="color: #6b665c; text-decoration: none;">Home</a>
      <span style="margin: 0 8px; color: #d9d4c8;">/</span>
      <a href="/learn/" style="color: #6b665c; text-decoration: none;">Learn</a>
      <span style="margin: 0 8px; color: #d9d4c8;">/</span>
      <span style="color: #1c1b19; font-weight: 500;">${escapeHtml(art.category)}</span>
    </nav>

    <!-- Article Header Card -->
    <header class="notion-card-white" style="padding: 36px 32px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; margin-bottom: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div style="display: inline-block; background-color: #e6f3fe; color: #0075de; font-family: var(--font-notioninter); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.04em;">
        ${escapeHtml(art.category)}
      </div>

      <h1 style="font-family: var(--font-notioninter); font-size: 32px; font-weight: 700; color: #1c1b19; line-height: 1.25; margin: 0 0 16px 0; letter-spacing: -0.03em;">
        ${escapeHtml(art.title)}
      </h1>

      <p style="font-family: var(--font-notioninter); font-size: 17px; line-height: 1.6; color: #615d59; margin: 0 0 24px 0;">
        ${escapeHtml(art.summary)}
      </p>

      <!-- Byline Metadata -->
      <div style="display: flex; align-items: center; gap: 14px; padding-top: 18px; border-top: 1px solid #f0eee9; font-family: var(--font-notioninter); font-size: 13px; color: #6b665c;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #0f7a52; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">
          ${(art.author || "ST")[0]}
        </div>
        <div>
          <span style="font-weight: 600; color: #1c1b19;">${escapeHtml(art.author || "The SnapSME Team")}</span>
          <span style="margin: 0 6px;">•</span>
          <span>${art.publishDate}</span>
          <span style="margin: 0 6px;">•</span>
          <span>${art.readTime || "5 min read"}</span>
        </div>
      </div>
    </header>

    <!-- Main Article Body -->
    <article class="notion-card-white" style="padding: 40px 36px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; margin-bottom: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      ${renderArticleBody(art.sections)}
    </article>

    <!-- Call to Action Banner -->
    <div style="background-color: #0f7a52; color: #ffffff; border-radius: 16px; padding: 36px; text-align: center; margin-bottom: 48px; box-shadow: 0 4px 14px rgba(15, 122, 82, 0.25);">
      <h3 style="font-family: var(--font-notioninter); font-size: 22px; font-weight: 700; margin: 0 0 10px 0; color: #ffffff;">Ready to see your full money picture?</h3>
      <p style="font-family: var(--font-notioninter); font-size: 15px; opacity: 0.9; margin: 0 0 24px 0; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.5;">
        Track expenses and income in one shared view with receipt photo OCR, voice notes, and real-time cash flow tracking. SnapSME is completely free to use.
      </p>
      <a href="/?onboarding=true" style="display: inline-block; background-color: #ffffff; color: #0f7a52; font-family: var(--font-notioninter); font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-decoration: none; transition: transform 0.15s ease;">
        Create Your Free Workspace &rarr;
      </a>
    </div>

    <!-- Related Articles Section -->
    <section>
      <div style="display: flex; align-items: center; justify-between; margin-bottom: 20px;">
        <h3 style="font-family: var(--font-notioninter); font-size: 20px; font-weight: 700; color: #1c1b19; margin: 0;">Related Guides & Articles</h3>
        <a href="/learn/" style="font-family: var(--font-notioninter); font-size: 14px; font-weight: 600; color: #0075de; text-decoration: none; margin-left: auto;">View all guides &rarr;</a>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
        ${relatedArticles
          .map(
            (rel) => `
          <a href="/learn/${rel.slug}" style="display: flex; flex-direction: column; background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 20px; text-decoration: none; transition: border-color 0.15s ease, transform 0.15s ease;" class="hover:border-[#0075de]">
            <span style="font-family: var(--font-notioninter); font-size: 11px; font-weight: 700; color: #0075de; text-transform: uppercase; margin-bottom: 8px;">${escapeHtml(rel.category)}</span>
            <h4 style="font-family: var(--font-notioninter); font-size: 15px; font-weight: 700; color: #1c1b19; line-height: 1.4; margin: 0 0 8px 0;">${escapeHtml(rel.title)}</h4>
            <span style="font-family: var(--font-notioninter); font-size: 12px; color: #6b665c; margin-top: auto;">${rel.readTime || "5 min read"}</span>
          </a>
        `
          )
          .join("\n")}
      </div>
    </section>

  </div>

  <!-- Footer Container -->
  <div id="snapsme-footer"></div>

  <script type="module" src="/js/header.js"></script>
  <script type="module" src="/js/auth.js"></script>
  <script type="module" src="/js/footer.js"></script>
</body>
</html>`;

  writeFileSync(join(learnDir, `${slug}.html`), articleHtml, "utf-8");
  console.log(`[build-articles] Generated: /public/learn/${slug}.html`);
});

// 3. Generate Learn Hub Page (/public/learn/index.html)
const categoriesSet = new Set(articles.map((a) => a.category));
const categoriesList = ["All", ...Array.from(categoriesSet)];

const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SnapSME Learn — Practical Small Business Expense Guides</title>

  <!-- SEO Meta -->
  <meta name="description" content="Free, jargon-free expense tracking and cash flow guides for small team owners, managers, and entrepreneurs." />
  <meta name="keywords" content="small business expenses, receipt management, expense tracking guide, small business cash flow" />
  <link rel="canonical" href="https://snapsme.com/learn/" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="SnapSME Learn — Practical Small Business Expense Guides" />
  <meta property="og:description" content="Free, jargon-free guides on tracking team spend, managing receipts, and keeping your business cash flow organized." />
  <meta property="og:url" content="https://snapsme.com/learn/" />
  <meta property="og:site_name" content="SnapSME" />

  <!-- Fonts & Styles -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="icon" type="image/jpeg" href="/logo.jpg">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/css/layout.css">
  <!-- Responsive Mobile CSS -->
  <style>
    @media (max-width: 640px) {
      .document-container {
        padding: 24px 16px 60px 16px !important;
      }
      #learn-articles-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .learn-article-card {
        padding: 20px !important;
      }
      h1 {
        font-size: 26px !important;
      }
      .learn-cat-btn {
        padding: 6px 12px !important;
        font-size: 12px !important;
      }
    }
  </style>
</head>
<body class="bg-[#f6f5f4] text-[#000000] font-body min-h-screen antialiased selection:bg-[#0075de]/20 selection:text-[#000000]">

  <!-- Header -->
  <div id="snapsme-header"></div>

  <!-- Learn Hub Container -->
  <div class="document-container" style="max-width: 1040px; margin: 0 auto; padding: 40px 20px 80px 20px;">
    
    <!-- Hero Section -->
    <div style="text-align: center; margin-bottom: 36px;">
      <div style="display: inline-block; background-color: #e6f3fe; color: #0075de; font-family: var(--font-notioninter); font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.04em;">
        Knowledge Base & Guides
      </div>
      <h1 style="font-family: var(--font-notioninter); font-size: 36px; font-weight: 700; color: #1c1b19; margin: 0 0 12px 0; letter-spacing: -0.03em;">
        SnapSME Learn
      </h1>
      <p style="font-family: var(--font-notioninter); font-size: 16px; color: #615d59; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        Simple, actionable guides to help small team owners control spend, organize receipts, and stay financially clear.
      </p>
    </div>

    <!-- Search & Category Filter Controls -->
    <div style="margin-bottom: 36px; display: flex; flex-direction: column; gap: 16px; align-items: center;">
      <!-- Search Input -->
      <div style="width: 100%; max-width: 520px; position: relative;">
        <input
          type="text"
          id="learn-search-input"
          placeholder="Search guides (e.g. receipts, budget, categories)..."
          style="width: 100%; padding: 12px 18px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.15); font-family: var(--font-notioninter); font-size: 14px; background: #ffffff; color: #1c1b19; outline: none; box-sizing: border-box; box-shadow: 0 1px 4px rgba(0,0,0,0.03);"
        />
      </div>

      <!-- Category Filter Pills -->
      <div id="learn-category-tabs" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
        ${categoriesList
          .map(
            (cat, idx) => `
          <button
            type="button"
            class="learn-cat-btn ${idx === 0 ? "active" : ""}"
            data-category="${escapeHtml(cat)}"
            style="padding: 7px 16px; border-radius: 9999px; font-family: var(--font-notioninter); font-size: 13px; font-weight: 600; border: 1px solid ${idx === 0 ? "#0075de" : "rgba(0,0,0,0.1)"}; background-color: ${idx === 0 ? "#0075de" : "#ffffff"}; color: ${idx === 0 ? "#ffffff" : "#1c1b19"}; cursor: pointer; transition: all 0.15s ease;"
          >
            ${escapeHtml(cat)}
          </button>
        `
          )
          .join("\n")}
      </div>
    </div>

    <!-- Articles Grid -->
    <div id="learn-articles-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
      ${articles
        .map(
          (art) => `
        <article
          class="learn-article-card notion-card-white"
          data-title="${escapeHtml(art.title.toLowerCase())}"
          data-summary="${escapeHtml(art.summary.toLowerCase())}"
          data-category="${escapeHtml(art.category)}"
          style="display: flex; flex-direction: column; background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 28px; text-decoration: none; color: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.04);"
        >
          <div style="display: flex; align-items: center; justify-between; margin-bottom: 12px;">
            <span style="font-family: var(--font-notioninter); font-size: 11px; font-weight: 700; color: #0075de; text-transform: uppercase; letter-spacing: 0.04em;">${escapeHtml(art.category)}</span>
            <span style="font-family: var(--font-notioninter); font-size: 12px; color: #6b665c; margin-left: auto;">${art.readTime || "5 min read"}</span>
          </div>

          <h2 style="font-family: var(--font-notioninter); font-size: 19px; font-weight: 700; color: #1c1b19; line-height: 1.35; margin: 0 0 10px 0; letter-spacing: -0.01em;">
            <a href="/learn/${art.slug}" style="color: inherit; text-decoration: none;">${escapeHtml(art.title)}</a>
          </h2>

          <p style="font-family: var(--font-notioninter); font-size: 14px; line-height: 1.6; color: #615d59; margin: 0 0 20px 0; flex-grow: 1;">
            ${escapeHtml(art.summary)}
          </p>

          <div style="display: flex; align-items: center; justify-between; pt: 14px; border-top: 1px solid #f0eee9;">
            <span style="font-family: var(--font-notioninter); font-size: 12px; color: #6b665c;">${art.publishDate}</span>
            <a href="/learn/${art.slug}" style="font-family: var(--font-notioninter); font-size: 13px; font-weight: 700; color: #0f7a52; text-decoration: none; margin-left: auto;">Read guide &rarr;</a>
          </div>
        </article>
      `
        )
        .join("\n")}
    </div>

    <!-- Empty State -->
    <div id="learn-empty-state" style="display: none; text-align: center; padding: 60px 20px;">
      <p style="font-family: var(--font-notioninter); font-size: 16px; color: #6b665c;">No articles found matching your search. Try different keywords or filter categories.</p>
    </div>

  </div>

  <!-- Footer -->
  <div id="snapsme-footer"></div>

  <script type="module" src="/js/header.js"></script>
  <script type="module" src="/js/auth.js"></script>
  <script type="module" src="/js/footer.js"></script>
  <script type="module" src="/js/learn.js"></script>
</body>
</html>`;

writeFileSync(join(learnDir, "index.html"), hubHtml, "utf-8");
console.log(`[build-articles] Generated: /public/learn/index.html`);

// 4. Generate sitemap.xml
const sitemapUrls = [
  "https://snapsme.com/",
  "https://snapsme.com/about",
  "https://snapsme.com/help",
  "https://snapsme.com/faq",
  "https://snapsme.com/contact",
  "https://snapsme.com/privacy",
  "https://snapsme.com/terms",
  "https://snapsme.com/cookies",
  "https://snapsme.com/learn/"
];

articles.forEach((art) => {
  sitemapUrls.push(`https://snapsme.com/learn/${art.slug}`);
});

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.includes("/learn/") ? "0.8" : "0.7"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

writeFileSync(join(publicDir, "sitemap.xml"), sitemapXml, "utf-8");
console.log(`[build-articles] Generated: /public/sitemap.xml`);

// 5. Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /
Allow: /learn/
Allow: /about
Allow: /help
Allow: /faq

Sitemap: https://snapsme.com/sitemap.xml
`;

writeFileSync(join(publicDir, "robots.txt"), robotsTxt, "utf-8");
console.log(`[build-articles] Generated: /public/robots.txt`);

console.log("[build-articles] All articles, hub, sitemap, and robots.txt built successfully.");
