/**
 * SnapSME — Brand Basics ES Module
 * Deliverable: /public/js/brand.js
 *
 * Handles brand logo upload, accent color setting, and CSS custom property injection.
 */

export const DEFAULT_BRAND_ACCENT = "#0f7a52";

/**
 * Dynamically applies the brand accent color via CSS custom property injection.
 * ONLY overrides action colors (--color-brand-accent), NEVER functional status tokens.
 * Functional tokens (--color-ledger-green, --color-amber-flag) remain untouched.
 */
export function applyBrandAccentColor(color = DEFAULT_BRAND_ACCENT) {
  const hexColor = color && color.trim() ? color.trim() : DEFAULT_BRAND_ACCENT;

  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--color-brand-accent", hexColor);
    document.documentElement.style.setProperty("--brand-accent", hexColor);

    let styleTag = document.getElementById("snapsme-brand-style");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "snapsme-brand-style";
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      :root {
        --color-brand-accent: ${hexColor};
        --brand-accent: ${hexColor};
      }
      .bg-brand-accent {
        background-color: var(--color-brand-accent) !important;
      }
      .text-brand-accent {
        color: var(--color-brand-accent) !important;
      }
      .border-brand-accent {
        border-color: var(--color-brand-accent) !important;
      }
      .btn-brand-accent {
        background-color: var(--color-brand-accent) !important;
        color: #ffffff !important;
      }
      .btn-brand-accent:hover {
        filter: brightness(0.92);
      }
    `;
  }
}

/**
 * Reads and encodes image file to Data URL for logo preview & storage.
 */
export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No image file provided."));
    }
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file (PNG, JPG, SVG, WebP)."));
    }
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error("Logo image size must be under 5MB."));
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}
