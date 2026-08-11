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
/**
 * Reads a logo file with 1MB input cap and 256px max dimension downscale.
 * Avoids storing multi-megabyte data URLs in workspace brand settings.
 */
export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No image file provided."));
    }
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file (PNG, JPG, SVG, WebP)."));
    }
    if (file.size > 1 * 1024 * 1024) {
      return reject(new Error("Logo image size must be under 1MB. Try a smaller square image."));
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 256;
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to process logo image."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image file."));
    };
    img.src = url;
  });
}
