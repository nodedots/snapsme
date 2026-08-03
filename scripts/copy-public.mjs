/**
 * SnapSME — Copy Vanilla Marketing Pages into dist/
 *
 * The React app builds to dist/ via Vite. The vanilla marketing pages
 * (home.html, help.html, contact.html, privacy.html, terms.html, cookies.html,
 * faq.html, 404.html, plus static assets) live in public/ and need to be
 * copied into dist/ so Firebase Hosting serves them alongside the React app.
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const distDir = join(root, "dist");

// Files/dirs to copy from public/ into dist/
// We skip index.html (Vite generates its own) and favicon.ico (Vite copies it).
const COPY_ITEMS = [
  "404.html",
  "contact.html",
  "cookies.html",
  "faq.html",
  "help.html",
  "home.html",
  "landing.html",
  "logo.jpg",
  "nodedots.png",
  "privacy.html",
  "terms.html",
  "assets",
  "css",
  "image",
  "js"
];

if (!existsSync(distDir)) {
  console.error("[copy-public] dist/ does not exist. Run `vite build` first.");
  process.exit(1);
}

let copied = 0;
for (const item of COPY_ITEMS) {
  const src = join(publicDir, item);
  const dest = join(distDir, item);
  if (!existsSync(src)) {
    console.warn(`[copy-public] Skipping missing: ${item}`);
    continue;
  }
  try {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true, force: true });
    copied++;
    console.log(`[copy-public] Copied: ${item}`);
  } catch (err) {
    console.error(`[copy-public] Failed to copy ${item}:`, err.message);
  }
}

console.log(`[copy-public] Done. Copied ${copied} items into dist/.`);