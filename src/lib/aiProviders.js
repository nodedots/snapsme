/**
 * SnapSME — Multi-Provider AI Abstraction Layer
 *
 * Supports four AI providers with automatic failover to ensure zero downtime:
 *   1. Gemini (Google)     — vision + text + audio
 *   2. NVIDIA NIM          — vision + text (OpenAI-compatible)
 *   3. DeepSeek            — text-only   (OpenAI-compatible)
 *   4. Perplexity          — text-only   (OpenAI-compatible)
 *
 * Non-Gemini providers use the OpenAI-compatible /chat/completions format,
 * which NVIDIA, DeepSeek and Perplexity all support.
 */

import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

export const AI_PROVIDER_NAMES = ["gemini", "nvidia", "deepseek", "perplexity"];

const PROVIDER_DEFAULTS = {
  gemini:    { baseUrl: null, model: "gemini-2.0-flash" },
  // Prefer currently available NIM vision models first (older nvidia/* ids often 404)
  nvidia:    { baseUrl: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.2-11b-vision-instruct" },
  deepseek:  { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  perplexity:{ baseUrl: "https://api.perplexity.ai", model: "sonar-pro" }
};

// NVIDIA vision-capable model candidates to try in order (fallback chain)
const NVIDIA_VISION_MODELS = [
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "nvidia/llama-3.1-8b-vision-instruct",
  "nvidia/llama-3.1-70b-vision-instruct"
];

/**
 * Returns the list of configured providers in failover priority order.
 * The order can be customised via AI_PROVIDER_ORDER=gemini,nvidia,deepseek,perplexity
 * (unlisted providers are appended at the end).
 */
export function getConfiguredProviders() {
  const providers = [];

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: null,
      model: process.env.GEMINI_MODEL || PROVIDER_DEFAULTS.gemini.model,
      canVision: true,
      canAudio: true
    });
  }

  if (process.env.NVIDIA_API_KEY) {
    providers.push({
      name: "nvidia",
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl: process.env.NVIDIA_BASE_URL || PROVIDER_DEFAULTS.nvidia.baseUrl,
      model: process.env.NVIDIA_MODEL || PROVIDER_DEFAULTS.nvidia.model,
      canVision: true,
      canAudio: false
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || PROVIDER_DEFAULTS.deepseek.baseUrl,
      model: process.env.DEEPSEEK_MODEL || PROVIDER_DEFAULTS.deepseek.model,
      canVision: false,
      canAudio: false
    });
  }

  if (process.env.PERPLEXITY_API_KEY) {
    providers.push({
      name: "perplexity",
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseUrl: process.env.PERPLEXITY_BASE_URL || PROVIDER_DEFAULTS.perplexity.baseUrl,
      model: process.env.PERPLEXITY_MODEL || PROVIDER_DEFAULTS.perplexity.model,
      canVision: false,
      canAudio: false
    });
  }

  // Honour AI_PROVIDER_ORDER override (e.g. "nvidia,gemini,deepseek,perplexity")
  const rawOrder = (process.env.AI_PROVIDER_ORDER || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (rawOrder.length > 0) {
    providers.sort((a, b) => {
      const ia = rawOrder.indexOf(a.name);
      const ib = rawOrder.indexOf(b.name);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }

  return providers;
}

/**
 * Returns true if at least one configured provider supports image/vision input.
 */
export function hasVisionProvider() {
  return getConfiguredProviders().some((p) => p.canVision);
}

/**
 * Returns per-provider key presence for the /api/health endpoint.
 */
export function getProviderStatus() {
  const providers = getConfiguredProviders();
  const status = {};
  for (const name of AI_PROVIDER_NAMES) {
    status[name] = Boolean(providers.find((p) => p.name === name));
  }
  // Convenience summary used by client UI
  status.anyConfigured = providers.length > 0;
  status.visionAvailable = providers.some((p) => p.canVision);
  return status;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function cleanJson(text) {
  if (!text) return "";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export function parseJsonSafe(text) {
  try {
    return JSON.parse(cleanJson(text));
  } catch (e) {
    return null;
  }
}

// Convert a simple string prompt / model response into a standard shape.
function buildPromptText(prompt, transcript) {
  if (transcript) {
    return `Transcript: "${transcript}"\n\n${prompt}`;
  }
  return prompt;
}

// ---------------------------------------------------------------------------
// Provider callers
// ---------------------------------------------------------------------------

/**
 * Calls Google Gemini (via @google/genai SDK).
 */
async function callGemini(provider, { prompt, imageBase64, mimeType, transcript, audioBase64, audioMimeType }) {
  const ai = new GoogleGenAI({ apiKey: provider.apiKey });

  let contents;
  if (imageBase64) {
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    contents = [
      prompt,
      { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
    ];
  } else if (audioBase64) {
    const cleanAudio = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
    contents = [
      { inlineData: { mimeType: audioMimeType || "audio/webm", data: cleanAudio } },
      { text: prompt }
    ];
  } else {
    contents = [{ text: buildPromptText(prompt, transcript) }];
  }

  const candidateModels = [
    ...new Set(
      [
        provider.model,
        process.env.GEMINI_MODEL,
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite"
      ].filter(Boolean)
    )
  ];

  let lastErr = null;
  for (const modelCandidate of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelCandidate,
        contents,
        config: { responseMimeType: "application/json" }
      });
      if (response && response.text) {
        return { success: true, provider: "gemini", model: modelCandidate, text: response.text };
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(lastErr?.message || "All Gemini model candidates failed");
}

/**
 * Calls any OpenAI-compatible provider (NVIDIA, DeepSeek, Perplexity)
 * via their chat/completions REST endpoint.
 */
async function callOpenAICompatible(provider, { prompt, imageBase64, mimeType, transcript }) {
  let messages;

  if (imageBase64) {
    // Only NVIDIA supports vision in this group.
    if (!provider.canVision) {
      throw new Error(`${provider.name} does not support image/vision input`);
    }

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${base64Data}` } }
        ]
      }
    ];
  } else {
    messages = [
      {
        role: "system",
        content: "You are an expert financial data extraction assistant. Return ONLY valid JSON matching the requested schema. Do not include markdown, explanation, or commentary."
      },
      {
        role: "user",
        content: buildPromptText(prompt, transcript)
      }
    ];
  }

  // Determine model fallback chain: configured model first, then provider defaults
  const modelCandidates = [
    provider.model,
    ...(provider.name === "nvidia" ? NVIDIA_VISION_MODELS.filter((m) => m !== provider.model) : [])
  ].filter(Boolean);

  let lastErr = null;

  for (const modelCandidate of modelCandidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelCandidate,
          messages,
          temperature: 0.1,
          response_format: { type: "json_object" },
          max_tokens: 2048
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        lastErr = new Error(`${provider.name} API error ${res.status} (${modelCandidate}): ${errBody.slice(0, 200)}`);
        console.warn(`[AI Failover] ${provider.name} model "${modelCandidate}" failed: ${lastErr.message}`);
        continue;
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content || "";

      if (!text) {
        lastErr = new Error(`${provider.name} returned an empty response (${modelCandidate})`);
        console.warn(`[AI Failover] ${provider.name} model "${modelCandidate}" empty response`);
        continue;
      }

      return { success: true, provider: provider.name, model: modelCandidate, text };
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      console.warn(`[AI Failover] ${provider.name} model "${modelCandidate}" threw: ${err.message}`);
    }
  }

  throw lastErr || new Error(`${provider.name} all model candidates failed`);
}

// ---------------------------------------------------------------------------
// Main entrypoint — failover across all configured providers
// ---------------------------------------------------------------------------

/**
 * Attempts extraction across all configured AI providers in priority order.
 *
 * @param {object} params
 * @param {string} params.prompt            — Full JSON-schema prompt.
 * @param {string|null} [params.imageBase64] — base64 image (vision providers only).
 * @param {string} [params.mimeType]         — image mime type (default image/jpeg).
 * @param {string|null} [params.transcript]  — text transcript for voice extraction.
 * @param {string|null} [params.audioBase64] — base64 audio blob for Gemini audio support.
 * @param {string|null} [params.task]        — label like "receipt", "income-doc" for logs.
 *
 * @returns {Promise<{provider:string, model:string, text:string}>}
 * @throws {Error} if every configured provider fails.
 */
export async function extractWithAI({
  prompt,
  imageBase64 = null,
  mimeType = "image/jpeg",
  transcript = null,
  audioBase64 = null,
  audioMimeType = "audio/webm",
  task = "general"
}) {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI providers configured. Set GEMINI_API_KEY, NVIDIA_API_KEY, DEEPSEEK_API_KEY, or PERPLEXITY_API_KEY."
    );
  }

  const requiresVision = Boolean(imageBase64);
  if (requiresVision && !providers.some((p) => p.canVision)) {
    throw new Error("Image scanning requested but no configured provider supports vision input.");
  }

  const errors = [];

  for (const provider of providers) {
    // Skip providers that cannot handle the modality.
    if (imageBase64 && !provider.canVision) continue;
    if (audioBase64 && !provider.canAudio) continue;

    try {
      let result;
      if (provider.name === "gemini") {
        result = await callGemini(provider, {
          prompt,
          imageBase64,
          mimeType,
          transcript,
          audioBase64,
          audioMimeType
        });
      } else {
        result = await callOpenAICompatible(provider, {
          prompt,
          imageBase64,
          mimeType,
          transcript
        });
      }

      if (result && result.success && result.text) {
        console.log(`[AI] ${task} extraction succeeded via ${result.provider} (${result.model})`);
        return result;
      }
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      console.warn(`[AI Failover] Provider "${provider.name}" failed for "${task}": ${err.message}`);
    }
  }

  const prefix = requiresVision ? `Vision ${task} extraction failed across all providers` : `${task} extraction failed across all providers`;
  const detail = errors.join(" | ") || "No eligible providers";
  console.error(`[AI Failover] ${prefix}: ${detail}`);
  throw new Error(`${prefix}: ${detail}`);
}