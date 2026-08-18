/**
 * SnapSME — Multi-Provider AI Abstraction Layer (Firebase Cloud Functions)
 *
 * Active providers (OpenAI-compatible):
 *   1. Grok (xAI / SpaceXAI) — text + vision  — XAI_API_KEY
 *   2. NVIDIA NIM            — text + vision  — NVIDIA_API_KEY
 *
 * Gemini / DeepSeek removed from the client stack for the same reasons as src/lib/aiProviders.js.
 */

export const AI_PROVIDER_NAMES = ["grok", "nvidia"];

const PROVIDER_DEFAULTS = {
  grok: {
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4.3"
  },
  nvidia: {
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "meta/llama-3.2-11b-vision-instruct"
  }
};

const GROK_MODEL_CANDIDATES = ["grok-4.3", "grok-4.5", "grok-4.6"];
const NVIDIA_VISION_MODELS = [
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct"
];

/**
 * @param {object} secrets — { XAI_API_KEY, NVIDIA_API_KEY, ... }
 */
export function getConfiguredProviders(secrets = {}) {
  const providers = [];

  const xaiKey = secrets.XAI_API_KEY || secrets.GROK_API_KEY;
  if (xaiKey) {
    providers.push({
      name: "grok",
      apiKey: xaiKey,
      baseUrl: secrets.XAI_BASE_URL || PROVIDER_DEFAULTS.grok.baseUrl,
      model: secrets.XAI_MODEL || secrets.GROK_MODEL || PROVIDER_DEFAULTS.grok.model,
      canVision: true,
      canAudio: false
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

  const rawOrder = (secrets.AI_PROVIDER_ORDER || "grok,nvidia")
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

export function parseJsonSafe(text) {
  try {
    return JSON.parse(cleanJson(text));
  } catch {
    return null;
  }
}

function buildPromptText(prompt, transcript) {
  if (transcript) {
    return `Transcript: "${transcript}"\n\n${prompt}`;
  }
  return prompt;
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
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType || "image/jpeg"};base64,${base64Data}`,
              detail: "high"
            }
          }
        ]
      }
    ];
  } else {
    messages = [
      {
        role: "system",
        content:
          "You are an expert financial data extraction assistant. Return ONLY valid JSON matching the requested schema. Do not include markdown, explanation, or commentary."
      },
      {
        role: "user",
        content: buildPromptText(prompt, transcript)
      }
    ];
  }

  const fallbackModels =
    provider.name === "grok"
      ? GROK_MODEL_CANDIDATES
      : provider.name === "nvidia"
        ? NVIDIA_VISION_MODELS
        : [];

  const modelCandidates = [
    ...new Set([provider.model, ...fallbackModels.filter((m) => m !== provider.model)].filter(Boolean))
  ];

  let lastErr = null;
  const timeoutMs = provider.name === "grok" ? 90000 : 45000;
  const formatVariants =
    provider.name === "grok"
      ? [{ response_format: { type: "json_object" } }, {}]
      : [{}];

  for (const modelCandidate of modelCandidates) {
    for (const extra of formatVariants) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const body = {
          model: modelCandidate,
          messages,
          temperature: 0.1,
          max_tokens: provider.name === "grok" ? 4096 : 2048,
          ...extra
        };

        const res = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`
          },
          signal: controller.signal,
          body: JSON.stringify(body)
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          lastErr = new Error(
            `${provider.name} API error ${res.status} (${modelCandidate}): ${errBody.slice(0, 220)}`
          );
          console.warn(`[AI Failover] ${provider.name} model "${modelCandidate}" failed: ${lastErr.message}`);
          continue;
        }

        const json = await res.json();
        const choice = json?.choices?.[0]?.message || {};
        const text =
          (typeof choice.content === "string" && choice.content) ||
          (Array.isArray(choice.content)
            ? choice.content.map((c) => c?.text || c?.content || "").join("")
            : "") ||
          "";

        if (!text || !String(text).trim()) {
          lastErr = new Error(`${provider.name} returned an empty response (${modelCandidate})`);
          continue;
        }

        return { success: true, provider: provider.name, model: modelCandidate, text: String(text) };
      } catch (err) {
        clearTimeout(timeoutId);
        lastErr = err;
        console.warn(`[AI Failover] ${provider.name} model "${modelCandidate}" threw: ${err.message}`);
      }
    }
  }

  throw lastErr || new Error(`${provider.name} all model candidates failed`);
}

export async function extractWithAI(params = {}) {
  const {
    secrets = {},
    prompt,
    imageBase64 = null,
    mimeType = "image/jpeg",
    transcript = null,
    task = "general"
  } = params;

  const providers = getConfiguredProviders(secrets);
  if (providers.length === 0) {
    throw new Error("No AI providers configured. Set XAI_API_KEY and/or NVIDIA_API_KEY.");
  }

  const requiresVision = Boolean(imageBase64);
  if (requiresVision && !providers.some((p) => p.canVision)) {
    throw new Error("Image scanning requested but no configured provider supports vision input.");
  }

  const errors = [];
  for (const provider of providers) {
    if (imageBase64 && !provider.canVision) continue;
    try {
      const result = await callOpenAICompatible(provider, {
        prompt,
        imageBase64,
        mimeType,
        transcript
      });
      if (result?.success && result.text) {
        console.log(`[AI] ${task} extraction succeeded via ${result.provider} (${result.model})`);
        return result;
      }
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      console.warn(`[AI Failover] Provider "${provider.name}" failed for "${task}": ${err.message}`);
    }
  }

  throw new Error(
    `${requiresVision ? "Vision " : ""}${task} extraction failed across all providers: ${errors.join(" | ") || "No eligible providers"}`
  );
}
