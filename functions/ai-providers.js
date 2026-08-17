/**
 * SnapSME — Multi-Provider AI Abstraction Layer (Firebase Cloud Functions)
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
  nvidia:    { baseUrl: "https://integrate.api.nvidia.com/v1", model: "nvidia/llama-3.1-8b-vision-instruct" },
  deepseek:  { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  perplexity:{ baseUrl: "https://api.perplexity.ai", model: "sonar-pro" }
};

/**
 * Builds the provider list from a secrets object.
 * @param {object} secrets — { GEMINI_API_KEY, NVIDIA_API_KEY, DEEPSEEK_API_KEY, PERPLEXITY_API_KEY, ... }
 */
export function getConfiguredProviders(secrets = {}) {
  const providers = [];

  if (secrets.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      apiKey: secrets.GEMINI_API_KEY,
      baseUrl: null,
      model: secrets.GEMINI_MODEL || PROVIDER_DEFAULTS.gemini.model,
      canVision: true,
      canAudio: true
    });
  }

  if (secrets.NVIDIA_API_KEY) {
    providers.push({
      name: "nvidia",
      apiKey: secrets.NVIDIA_API_KEY,
      baseUrl: secrets.NVIDIA_BASE_URL || PROVIDER_DEFAULTS.nvidia.baseUrl,
      model: secrets.NVIDIA_MODEL || PROVIDER_DEFAULTS.nvidia.model,
      canVision: true,
      canAudio: false
    });
  }

  if (secrets.DEEPSEEK_API_KEY) {
    providers.push({
      name: "deepseek",
      apiKey: secrets.DEEPSEEK_API_KEY,
      baseUrl: secrets.DEEPSEEK_BASE_URL || PROVIDER_DEFAULTS.deepseek.baseUrl,
      model: secrets.DEEPSEEK_MODEL || PROVIDER_DEFAULTS.deepseek.model,
      canVision: false,
      canAudio: false
    });
  }

  if (secrets.PERPLEXITY_API_KEY) {
    providers.push({
      name: "perplexity",
      apiKey: secrets.PERPLEXITY_API_KEY,
      baseUrl: secrets.PERPLEXITY_BASE_URL || PROVIDER_DEFAULTS.perplexity.baseUrl,
      model: secrets.PERPLEXITY_MODEL || PROVIDER_DEFAULTS.perplexity.model,
      canVision: false,
      canAudio: false
    });
  }

  // Honour AI_PROVIDER_ORDER override
  const rawOrder = (secrets.AI_PROVIDER_ORDER || "")
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

export function cleanJson(text) {
  if (!text) return "";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function buildPromptText(prompt, transcript) {
  if (transcript) {
    return `Transcript: "${transcript}"\n\n${prompt}`;
  }
  return prompt;
}

// ---------------------------------------------------------------------------
// Provider callers
// ---------------------------------------------------------------------------

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
    provider.model,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash"
  ].filter(Boolean);

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

async function callOpenAICompatible(provider, { prompt, imageBase64, mimeType, transcript }) {
  let messages;

  if (imageBase64) {
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
        model: provider.model,
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 2048
      })
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`${provider.name} API error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "";

    if (!text) {
      throw new Error(`${provider.name} returned an empty response`);
    }

    return { success: true, provider: provider.name, model: provider.model, text };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Main entrypoint — failover across all configured providers
// ---------------------------------------------------------------------------

/**
 * Attempts extraction across all configured AI providers in priority order.
 *
 * @param {object} params
 * @param {object} params.secrets — object of env/secret values.
 * @param {string} params.prompt  — Full JSON-schema prompt.
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
  secrets = {},
  prompt,
  imageBase64 = null,
  mimeType = "image/jpeg",
  transcript = null,
  audioBase64 = null,
  audioMimeType = "audio/webm",
  task = "general"
}) {
  const providers = getConfiguredProviders(secrets);

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