/**
 * Rewrite .env keeping only keys the app actually reads.
 * Does not print secret values.
 */
import fs from "fs";

const raw = fs.readFileSync(".env", "utf8");
const map = new Map();
for (const line of raw.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1);
  // Prefer a non-empty value if duplicates exist
  if (!map.has(k) || (v && !map.get(k))) map.set(k, v);
}

const KEEP = new Set([
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "XAI_API_KEY",
  "XAI_MODEL",
  "XAI_BASE_URL",
  "NVIDIA_API_KEY",
  "NVIDIA_MODEL",
  "NVIDIA_BASE_URL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "AI_PROVIDER_ORDER",
  "EXCHANGE_RATE_API_KEY",
  "EXCHANGE_RATE_API_URL",
  "PORT",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_BOT_USERNAME",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN"
]);

const removed = [...map.keys()].filter((k) => !KEEP.has(k));
const get = (k, fallback = "") => (map.has(k) && map.get(k) !== "" ? map.get(k) : fallback);
// For keys that may legitimately be empty string but present, preserve presence
const getOrEmpty = (k, fallback = "") => (map.has(k) ? map.get(k) : fallback);

const exchangeUrlDefault = "https://v6.exchangerate-api.com/v6/{key}/latest/{base}";

let out = `# ==============================================================================
# SnapSME Environment Variables
# Only keys actually read by the app / server / Vercel APIs.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. FIREBASE (Vite client + /api/firebase-config)
# ------------------------------------------------------------------------------
VITE_FIREBASE_API_KEY=${getOrEmpty("VITE_FIREBASE_API_KEY")}
VITE_FIREBASE_AUTH_DOMAIN=${getOrEmpty("VITE_FIREBASE_AUTH_DOMAIN")}
VITE_FIREBASE_PROJECT_ID=${getOrEmpty("VITE_FIREBASE_PROJECT_ID")}
VITE_FIREBASE_STORAGE_BUCKET=${getOrEmpty("VITE_FIREBASE_STORAGE_BUCKET")}
VITE_FIREBASE_MESSAGING_SENDER_ID=${getOrEmpty("VITE_FIREBASE_MESSAGING_SENDER_ID")}
VITE_FIREBASE_APP_ID=${getOrEmpty("VITE_FIREBASE_APP_ID")}
VITE_FIREBASE_MEASUREMENT_ID=${getOrEmpty("VITE_FIREBASE_MEASUREMENT_ID")}

# ------------------------------------------------------------------------------
# 2. AI EXTRACT (failover: Grok → NVIDIA → Gemini)
# ------------------------------------------------------------------------------
XAI_API_KEY=${getOrEmpty("XAI_API_KEY")}
XAI_MODEL=${get("XAI_MODEL", "grok-4.3")}

NVIDIA_API_KEY=${getOrEmpty("NVIDIA_API_KEY")}
NVIDIA_MODEL=${get("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")}
NVIDIA_BASE_URL=${get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")}

GEMINI_API_KEY=${getOrEmpty("GEMINI_API_KEY")}
GEMINI_MODEL=${get("GEMINI_MODEL", "gemini-3.5-flash")}

AI_PROVIDER_ORDER=${get("AI_PROVIDER_ORDER", "grok,nvidia,gemini")}

# ------------------------------------------------------------------------------
# 3. EXCHANGE RATES (/api/exchange-rates)
# ------------------------------------------------------------------------------
EXCHANGE_RATE_API_KEY=${getOrEmpty("EXCHANGE_RATE_API_KEY")}
EXCHANGE_RATE_API_URL=${get("EXCHANGE_RATE_API_URL", exchangeUrlDefault)}

# ------------------------------------------------------------------------------
# 4. SERVER
# ------------------------------------------------------------------------------
PORT=${get("PORT", "3000")}

# ------------------------------------------------------------------------------
# 5. CHAT BOTS (optional — Express / Cloud Functions)
# ------------------------------------------------------------------------------
TELEGRAM_BOT_TOKEN=${getOrEmpty("TELEGRAM_BOT_TOKEN")}
TELEGRAM_BOT_USERNAME=${getOrEmpty("TELEGRAM_BOT_USERNAME")}
`;

if (
  map.has("WHATSAPP_ACCESS_TOKEN") ||
  map.has("WHATSAPP_PHONE_NUMBER_ID") ||
  map.has("WHATSAPP_VERIFY_TOKEN")
) {
  out += `WHATSAPP_ACCESS_TOKEN=${getOrEmpty("WHATSAPP_ACCESS_TOKEN")}
WHATSAPP_PHONE_NUMBER_ID=${getOrEmpty("WHATSAPP_PHONE_NUMBER_ID")}
WHATSAPP_VERIFY_TOKEN=${getOrEmpty("WHATSAPP_VERIFY_TOKEN")}
`;
}

fs.writeFileSync(".env", out);
console.log(
  JSON.stringify(
    {
      removed,
      keptPresent: [...KEEP].filter((k) => map.has(k)),
      note: "Values preserved; DeepSeek/Perplexity and other unused keys removed."
    },
    null,
    2
  )
);
