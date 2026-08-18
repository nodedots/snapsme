/**
 * Shared extract handlers for Express (server.js) and Vercel serverless (api/*).
 * Keeps receipt/income AI + local fallback logic in one place.
 */
import { extractWithAI, getProviderStatus, getConfiguredProviders } from "../../src/lib/aiProviders.js";

const MAX_MONTHLY_AI_CAPTURES = 150;
const serverUsageTracker = new Map();
const exchangeRateCache = new Map();

function stripDataUrl(base64Data = "") {
  return String(base64Data).replace(/^data:[^;]+;base64,/, "");
}

function parseModelJson(textResponse = "") {
  const cleanJson = String(textResponse).replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJson);
}

function checkServerAiUsage(businessId = "default") {
  const now = new Date();
  const currentPeriod = now.toISOString().slice(0, 7) + "-01";
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDateStr = nextMonth.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const record = serverUsageTracker.get(businessId) || { count: 0, periodStart: currentPeriod };
  if (record.periodStart !== currentPeriod) {
    record.count = 0;
    record.periodStart = currentPeriod;
  }

  if (record.count >= MAX_MONTHLY_AI_CAPTURES) {
    return {
      allowed: false,
      count: record.count,
      limit: MAX_MONTHLY_AI_CAPTURES,
      resetDate: resetDateStr
    };
  }

  record.count += 1;
  serverUsageTracker.set(businessId, record);

  return {
    allowed: true,
    count: record.count,
    limit: MAX_MONTHLY_AI_CAPTURES,
    resetDate: resetDateStr
  };
}

export function smartExtractReceiptFromBuffer(base64Data = "", fileName = "") {
  let textContent = "";
  try {
    const rawBuffer = Buffer.from(stripDataUrl(base64Data), "base64");
    const asciiStrings = rawBuffer.toString("utf8").match(/[\x20-\x7E]{2,}/g) || [];
    textContent = asciiStrings.join(" ");
  } catch {
    textContent = "";
  }

  const fullText = (fileName + " " + textContent).replace(/[-_.]/g, " ");

  let vendor = "";
  const vendorPatterns = [
    { name: "Shell Petroleum", regex: /shell/i },
    { name: "Total Energies", regex: /total/i },
    { name: "Chevron Station", regex: /chevron/i },
    { name: "ExxonMobil", regex: /exxon|mobil/i },
    { name: "Uber Ride", regex: /uber/i },
    { name: "Bolt Transport", regex: /bolt/i },
    { name: "Staples Office", regex: /staples/i },
    { name: "Office Depot", regex: /office\s*depot/i },
    { name: "Starbucks Coffee", regex: /starbucks/i },
    { name: "McDonald's", regex: /mcdonald|mcdonalds/i },
    { name: "Amazon", regex: /amazon/i },
    { name: "Walmart", regex: /walmart/i },
    { name: "Target Store", regex: /target/i },
    { name: "Shoprite Supermarket", regex: /shoprite/i },
    { name: "FedEx Express", regex: /fedex/i },
    { name: "UPS Logistics", regex: /ups/i },
    { name: "GitHub", regex: /github/i },
    { name: "AWS Cloud", regex: /aws|amazon\s*web/i },
    { name: "Google Cloud", regex: /google\s*cloud/i },
    { name: "Slack", regex: /slack/i },
    { name: "Zoom", regex: /zoom/i }
  ];

  for (const p of vendorPatterns) {
    if (p.regex.test(fullText)) {
      vendor = p.name;
      break;
    }
  }

  if (!vendor) {
    const words = fullText.split(/\s+/).filter((w) => /^[A-Z][a-zA-Z0-9']{2,}$/.test(w));
    const filtered = words.filter(
      (w) => !/receipt|invoice|total|amount|payment|date|image|photo|doc|pdf|jpeg|png/i.test(w)
    );
    if (filtered.length > 0) vendor = filtered.slice(0, 2).join(" ");
  }

  let amount = 0;
  const totalMatch = fullText.match(
    /(?:total|amount|paid|grand\s*total|due|sum|net)\s*[:=]?\s*([$€£₦]?\s*\d+(?:\.\d{1,2})?)/i
  );
  if (totalMatch) {
    amount = parseFloat(totalMatch[1].replace(/[$€£₦\s]/g, "")) || 0;
  }
  if (!amount) {
    const allNums = fullText.match(/\b\d+\.\d{2}\b/g);
    if (allNums?.length) {
      const parsedNums = allNums.map((n) => parseFloat(n)).filter((n) => n > 0 && n < 100000);
      if (parsedNums.length) amount = Math.max(...parsedNums);
    }
  }
  if (!amount) {
    const numInName = fileName.match(/\d+(?:\.\d{1,2})?/);
    if (numInName) amount = parseFloat(numInName[0]) || 0;
  }

  let currency = null;
  if (/€|eur|euro/i.test(fullText)) currency = "EUR";
  else if (/£|gbp|pound/i.test(fullText)) currency = "GBP";
  else if (/₦|ngn|naira/i.test(fullText)) currency = "NGN";
  else if (/\$|usd|dollar/i.test(fullText)) currency = "USD";

  let date = null;
  const dateMatch = fullText.match(
    /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/
  );
  if (dateMatch) {
    try {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) date = d.toISOString().split("T")[0];
    } catch {
      /* ignore */
    }
  }

  let suggestedCategory = null;
  const searchStr = (fullText + " " + vendor).toLowerCase();
  if (/fuel|gas|petrol|diesel|station|uber|bolt|taxi|cab|parking|transport|transit/i.test(searchStr)) {
    suggestedCategory = "Fuel & Transport";
  } else if (/staples|office|paper|supplies|print|post|fedex|ups|stationery/i.test(searchStr)) {
    suggestedCategory = "Office Supplies";
  } else if (/starbucks|mcdonald|cafe|coffee|restaurant|diner|food|meal|lunch|dinner|buka/i.test(searchStr)) {
    suggestedCategory = "Meals & Food";
  } else if (/tool|hardware|equipment|repair|camera|laptop|device|spares/i.test(searchStr)) {
    suggestedCategory = "Equipment & Tools";
  } else if (/bill|utility|electric|power|water|internet|zoom|slack|aws|software|cloud|subscription/i.test(searchStr)) {
    suggestedCategory = "Software & Subscriptions";
  }

  return {
    vendor: vendor || null,
    amount: amount > 0 ? amount : null,
    currency,
    date,
    suggestedCategory,
    lineItems:
      amount > 0 && vendor
        ? [{ description: `${suggestedCategory || "Expense"} - ${vendor}`, amount }]
        : [],
    confidence: {
      vendor: vendor ? 0.7 : 0.3,
      amount: amount > 0 ? 0.75 : 0.3,
      date: date ? 0.7 : 0.3,
      category: suggestedCategory ? 0.7 : 0.3
    }
  };
}

export function smartExtractIncomeFromBuffer(base64Data = "", fileName = "") {
  let textContent = "";
  try {
    const rawBuffer = Buffer.from(stripDataUrl(base64Data), "base64");
    const asciiStrings = rawBuffer.toString("utf8").match(/[\x20-\x7E]{2,}/g) || [];
    textContent = asciiStrings.join(" ");
  } catch {
    textContent = "";
  }

  const fullText = (fileName + " " + textContent).replace(/[-_.]/g, " ");

  let source = null;
  if (/acme|corp|inc|llc|client|customer|agency/i.test(fullText)) {
    const match = fullText.match(
      /([A-Z][a-zA-Z0-9']+(?:\s+[A-Z][a-zA-Z0-9']+)?\s+(?:Corp|Inc|LLC|Client|Agency|Group))/i
    );
    source = match ? match[1] : "Client Payment";
  } else if (/sales|product|order|store|shop/i.test(fullText)) {
    source = "Product Sales";
  } else if (/refund|return|reversal/i.test(fullText)) {
    source = "Refund Received";
  } else if (/transfer|bank|wire|deposit|credit/i.test(fullText)) {
    source = "Bank Transfer";
  }

  let amount = 0;
  const totalMatch = fullText.match(
    /(?:total|amount|received|paid|credit|sum|net)\s*[:=]?\s*([$€£₦]?\s*\d+(?:\.\d{1,2})?)/i
  );
  if (totalMatch) {
    amount = parseFloat(totalMatch[1].replace(/[$€£₦\s]/g, "")) || 0;
  }
  if (!amount) {
    const allNums = fullText.match(/\b\d+\.\d{2}\b/g);
    if (allNums?.length) {
      const parsedNums = allNums.map((n) => parseFloat(n)).filter((n) => n > 0 && n < 1000000);
      if (parsedNums.length) amount = Math.max(...parsedNums);
    }
  }
  if (!amount) {
    const numInName = fileName.match(/\d+(?:\.\d{1,2})?/);
    if (numInName) amount = parseFloat(numInName[0]) || 0;
  }

  let currency = null;
  if (/€|eur|euro/i.test(fullText)) currency = "EUR";
  else if (/£|gbp|pound/i.test(fullText)) currency = "GBP";
  else if (/₦|ngn|naira/i.test(fullText)) currency = "NGN";
  else if (/\$|usd|dollar/i.test(fullText)) currency = "USD";

  let date = null;
  const dateMatch = fullText.match(
    /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/
  );
  if (dateMatch) {
    try {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) date = d.toISOString().split("T")[0];
    } catch {
      /* ignore */
    }
  }

  return {
    source,
    amount: amount > 0 ? amount : null,
    currency,
    date,
    notes: fileName ? `Scanned from ${fileName}` : null,
    confidence: {
      source: source ? 0.75 : 0.3,
      amount: amount > 0 ? 0.8 : 0.3,
      date: date ? 0.7 : 0.3
    }
  };
}

function parseVoiceExpenseLocal(transcript = "") {
  const text = String(transcript || "").trim();
  if (!text) {
    return {
      vendor: null,
      amount: null,
      currency: null,
      date: null,
      suggestedCategory: null,
      transcriptText: "",
      confidence: { vendor: 0.2, amount: 0.2, date: 0.2, category: 0.2 }
    };
  }

  let amount = null;
  const amountMatch = text.match(/(\$|€|£|₦)?\s*(\d+(?:\.\d{1,2})?)/);
  if (amountMatch) amount = parseFloat(amountMatch[2]);

  let currency = null;
  if (/euro|eur|€/i.test(text)) currency = "EUR";
  else if (/pound|gbp|£/i.test(text)) currency = "GBP";
  else if (/naira|ngn|₦/i.test(text)) currency = "NGN";
  else if (/dollar|usd|\$/i.test(text)) currency = "USD";

  let vendor = null;
  const fromMatch = text.match(
    /(?:from|at)\s+([A-Za-z0-9\s'-]+?)(?:\s+for|\s+on|\s+with|\s+\$|\s+paid|\s+received|$)/i
  );
  if (fromMatch?.[1]?.trim()) vendor = fromMatch[1].trim().replace(/\s+/g, " ").slice(0, 40);
  else if (/shell/i.test(text)) vendor = "Shell Fuel";
  else if (/staples/i.test(text)) vendor = "Staples";
  else if (/uber/i.test(text)) vendor = "Uber";

  let suggestedCategory = null;
  if (/fuel|gas|diesel|cab|uber|taxi|drive/i.test(text)) suggestedCategory = "Fuel & Transport";
  else if (/lunch|dinner|breakfast|food|coffee|cafe|bistro/i.test(text)) suggestedCategory = "Meals & Food";
  else if (/paper|print|pen|office|supplies/i.test(text)) suggestedCategory = "Office Supplies";
  else if (/tool|hardware|equipment/i.test(text)) suggestedCategory = "Equipment & Tools";

  return {
    vendor,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency,
    date: new Date().toISOString().split("T")[0],
    suggestedCategory,
    transcriptText: text,
    confidence: {
      vendor: vendor ? 0.75 : 0.35,
      amount: amount ? 0.85 : 0.3,
      date: 0.6,
      category: suggestedCategory ? 0.7 : 0.35
    }
  };
}

function parseVoiceIncomeLocal(transcript = "") {
  const text = String(transcript || "").trim();
  if (!text) {
    return {
      source: null,
      amount: null,
      currency: null,
      date: null,
      notes: null,
      transcriptText: "",
      confidence: { source: 0.2, amount: 0.2, date: 0.2 }
    };
  }

  let amount = null;
  const amountMatch = text.match(/(\$|€|£|₦)?\s*(\d+(?:\.\d{1,2})?)/);
  if (amountMatch) amount = parseFloat(amountMatch[2]);

  let currency = null;
  if (/euro|eur|€/i.test(text)) currency = "EUR";
  else if (/pound|gbp|£/i.test(text)) currency = "GBP";
  else if (/naira|ngn|₦/i.test(text)) currency = "NGN";
  else if (/dollar|usd|\$/i.test(text)) currency = "USD";

  let source = null;
  const fromMatch = text.match(
    /(?:from|received from|paid by)\s+([A-Za-z0-9\s'-]+?)(?:\s+for|\s+on|\s+with|\s+\$|\s+received|$)/i
  );
  if (fromMatch?.[1]?.trim()) source = fromMatch[1].trim().replace(/\s+/g, " ").slice(0, 40);
  else if (/sales|product/i.test(text)) source = "Product Sales";
  else if (/refund|return/i.test(text)) source = "Refund Received";
  else if (/transfer|bank|deposit/i.test(text)) source = "Bank Transfer";

  return {
    source,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency,
    date: new Date().toISOString().split("T")[0],
    notes: null,
    transcriptText: text,
    confidence: {
      source: source ? 0.75 : 0.35,
      amount: amount ? 0.85 : 0.3,
      date: 0.6
    }
  };
}

/** @returns {{ status: number, body: object }} */
export async function handleHealth(query = {}) {
  const body = {
    status: "ok",
    providers: getProviderStatus(),
    activeProviders: getConfiguredProviders().map((p) => p.name),
    timestamp: new Date().toISOString()
  };

  // Optional live probe: /api/health?probe=1 — returns first-provider ping result (no secrets)
  if (String(query.probe || "") === "1") {
    try {
      const result = await extractWithAI({
        prompt:
          'Return strictly valid JSON only: {"ok":true,"vendor":"Probe Cafe","amount":1}',
        transcript: "Paid 1 dollar at Probe Cafe",
        task: "health-probe"
      });
      body.probe = {
        ok: true,
        provider: result.provider,
        model: result.model,
        preview: String(result.text || "").slice(0, 160)
      };
    } catch (err) {
      body.probe = {
        ok: false,
        error: err?.message || String(err)
      };
    }
  }

  return { status: 200, body };
}

/** @returns {{ status: number, body: object }} */
export async function handleExtractReceipt(body = {}) {
  try {
    const { imageBase64, mimeType = "image/jpeg", fileName, businessId } = body;
    if (!imageBase64) {
      return { status: 400, body: { success: false, error: "Missing imageBase64 in request body" } };
    }

    const usageCheck = checkServerAiUsage(businessId || "default");
    if (!usageCheck.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          code: "ai_limit_reached",
          limit: usageCheck.limit,
          usageCount: usageCheck.count,
          resetDate: usageCheck.resetDate,
          error: `You've used your 150 AI scans for this month — you can still add expenses manually, and your limit resets on ${usageCheck.resetDate}.`
        }
      };
    }

    try {
      const prompt = `Analyze this receipt image or document and extract structured expense details.
Return strictly valid JSON with no markdown formatting or triple backticks.

JSON Schema:
{
  "vendor": "string or null (name of merchant/vendor found on receipt, or null if illegible/absent)",
  "amount": "number or null (total monetary amount paid, e.g. 45.50, or null if illegible/absent)",
  "currency": "string or null (3-letter ISO code like USD, EUR, GBP, NGN, KES, CAD, or null)",
  "date": "string or null (ISO date YYYY-MM-DD if legible, or null if illegible/absent)",
  "suggestedCategory": "string or null (one of: Fuel & Transport, Office Supplies, Meals & Food, Equipment & Tools, Utilities & Bills, Software & Subscriptions, Petty Cash Spend, Other Expenses, or null)",
  "lineItems": [
    { "description": "string", "amount": "number" }
  ],
  "confidence": {
    "vendor": "high" | "medium" | "low",
    "amount": "high" | "medium" | "low",
    "date": "high" | "medium" | "low",
    "category": "high" | "medium" | "low"
  }
}

IMPORTANT: Return null for any field that you cannot clearly determine from the receipt image. Do NOT guess, fabricate, or hallucinate values.`;

      const aiResult = await extractWithAI({
        prompt,
        imageBase64,
        mimeType,
        task: "receipt"
      });

      if (aiResult?.text) {
        const parsed = parseModelJson(aiResult.text);
        const providerName = aiResult.provider || "unknown";
        if (!parsed || (parsed.vendor == null && parsed.amount == null && parsed.date == null)) {
          return {
            status: 422,
            body: {
              success: false,
              code: "ai_unreadable",
              error:
                "The AI vision service could not read legible details from that image. Please enter details manually."
            }
          };
        }

        const confMap = { high: 0.9, medium: 0.75, low: 0.45 };
        const rawConf = parsed.confidence || {};
        const vendorConf =
          typeof rawConf.vendor === "number"
            ? rawConf.vendor
            : confMap[rawConf.vendor] || (parsed.vendor ? 0.85 : 0.3);
        const amountConf =
          typeof rawConf.amount === "number"
            ? rawConf.amount
            : confMap[rawConf.amount] || (parsed.amount != null ? 0.9 : 0.3);
        const dateConf =
          typeof rawConf.date === "number"
            ? rawConf.date
            : confMap[rawConf.date] || (parsed.date ? 0.85 : 0.3);
        const categoryConf =
          typeof rawConf.category === "number"
            ? rawConf.category
            : confMap[rawConf.category] || (parsed.suggestedCategory ? 0.8 : 0.3);

        return {
          status: 200,
          body: {
            success: true,
            source: `ai_${providerName}_vision_tier`,
            aiUsage: { count: usageCheck.count, limit: usageCheck.limit },
            notice:
              vendorConf < 0.7 || amountConf < 0.7 || !parsed.vendor || !parsed.amount
                ? "We had trouble reading some details on this receipt — please check and fill in the missing fields below."
                : "Receipt scanned! Please review the auto-populated fields below.",
            data: {
              vendor:
                parsed.vendor && typeof parsed.vendor === "string" ? parsed.vendor.trim() : null,
              amount:
                typeof parsed.amount === "number" && !isNaN(parsed.amount) ? parsed.amount : null,
              currency: parsed.currency || null,
              date: parsed.date || null,
              suggestedCategory: parsed.suggestedCategory || null,
              lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
              confidence: {
                vendor: vendorConf,
                amount: amountConf,
                date: dateConf,
                category: categoryConf
              }
            }
          }
        };
      }
    } catch (aiError) {
      console.error("AI provider error during receipt extraction:", aiError?.message || aiError);
    }

    try {
      const localResult = smartExtractReceiptFromBuffer(imageBase64, fileName || "");
      if (localResult && (localResult.amount > 0 || localResult.vendor)) {
        return {
          status: 200,
          body: {
            success: true,
            source: "local_smart_parser_tier",
            aiUsage: { count: usageCheck.count, limit: usageCheck.limit },
            notice:
              "AI vision was unavailable — used local receipt parser. Please review the extracted details below.",
            data: localResult
          }
        };
      }
    } catch (localErr) {
      console.warn("Local smart parser fallback failed:", localErr?.message || localErr);
    }

    return {
      status: 503,
      body: {
        success: false,
        code: "ai_unavailable",
        error:
          "The AI vision service is temporarily busy — you can try again or enter details manually below."
      }
    };
  } catch (error) {
    console.error("Error in handleExtractReceipt:", error);
    return {
      status: 500,
      body: { success: false, error: error?.message || "Failed to extract receipt" }
    };
  }
}

/** @returns {{ status: number, body: object }} */
export async function handleExtractVoice(body = {}) {
  try {
    const { transcript, audioBase64, mimeType = "audio/webm" } = body;

    if (getConfiguredProviders().length > 0 && (audioBase64 || transcript)) {
      try {
        const promptText = `Extract structured expense details from this audio/transcript.
Return strictly valid JSON. Use null for any field you cannot determine — do NOT invent amounts or vendors.
{
  "vendor": "string or null",
  "amount": "number or null",
  "currency": "string or null (USD, EUR, NGN, GBP)",
  "date": "string or null (YYYY-MM-DD)",
  "suggestedCategory": "string or null",
  "transcriptText": "string",
  "confidence": { "vendor": number, "amount": number, "date": number, "category": number }
}`;

        const aiResult = await extractWithAI({
          prompt: promptText,
          transcript,
          audioBase64,
          audioMimeType: mimeType,
          task: "voice-expense"
        });

        if (aiResult?.text) {
          const parsed = parseModelJson(aiResult.text);
          const providerName = aiResult.provider || "unknown";
          return {
            status: 200,
            body: {
              success: true,
              source: `ai_${providerName}_voice`,
              data: {
                vendor: parsed.vendor || null,
                amount: typeof parsed.amount === "number" ? parsed.amount : null,
                currency: parsed.currency || null,
                date: parsed.date || new Date().toISOString().split("T")[0],
                suggestedCategory: parsed.suggestedCategory || null,
                transcriptText: parsed.transcriptText || transcript || "",
                confidence: parsed.confidence || {
                  vendor: 0.7,
                  amount: 0.7,
                  date: 0.6,
                  category: 0.6
                }
              }
            }
          };
        }
      } catch (aiErr) {
        console.warn("AI voice extraction failed, using local parser:", aiErr?.message);
      }
    }

    const local = parseVoiceExpenseLocal(transcript);
    return {
      status: 200,
      body: {
        success: true,
        source: "local_voice_parser",
        notice: getConfiguredProviders().length
          ? "Parsed voice note locally — please review fields."
          : "Voice parsed locally. Add an AI provider key for better extraction.",
        data: local
      }
    };
  } catch (error) {
    console.error("Error processing voice note:", error);
    return {
      status: 500,
      body: { success: false, error: error?.message || "Failed to process voice note" }
    };
  }
}

/** @returns {{ status: number, body: object }} */
export async function handleExtractIncomeDoc(body = {}) {
  try {
    const { imageBase64, mimeType = "image/jpeg", fileName, businessId } = body;
    if (!imageBase64) {
      return { status: 400, body: { success: false, error: "Missing imageBase64 in request body" } };
    }

    const usageCheck = checkServerAiUsage(businessId || "default");
    if (!usageCheck.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          code: "ai_limit_reached",
          limit: usageCheck.limit,
          usageCount: usageCheck.count,
          resetDate: usageCheck.resetDate,
          error: `You've used your 150 AI scans for this month — you can still add income manually, and your limit resets on ${usageCheck.resetDate}.`
        }
      };
    }

    try {
      const prompt = `Analyze this income document (invoice, payment receipt, bank transfer confirmation, sales receipt, or payment notification) and extract structured income details.
Return strictly valid JSON with no markdown formatting or triple backticks.
Use null for any field you cannot clearly determine — do NOT invent values.
JSON Schema:
{
  "source": "string or null (payer/client/source of income)",
  "amount": "number or null",
  "currency": "string or null (USD, EUR, GBP, NGN, KES, CAD)",
  "date": "string or null (YYYY-MM-DD)",
  "notes": "string or null",
  "confidence": {
    "source": number between 0.0 and 1.0,
    "amount": number between 0.0 and 1.0,
    "date": number between 0.0 and 1.0
  }
}`;

      const aiResult = await extractWithAI({
        prompt,
        imageBase64,
        mimeType,
        task: "income-doc"
      });

      if (aiResult?.text) {
        const parsed = parseModelJson(aiResult.text);
        const providerName = aiResult.provider || "unknown";
        if (!parsed || (typeof parsed.amount !== "number" && !parsed.source)) {
          return {
            status: 422,
            body: {
              success: false,
              error:
                "The vision model could not read legible income details from that image. Please enter details manually."
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            source: `ai_${providerName}_vision_tier`,
            aiUsage: { count: usageCheck.count, limit: usageCheck.limit },
            notice: "Income document scanned! Please review the extracted fields below.",
            data: {
              source: parsed.source || null,
              amount: typeof parsed.amount === "number" ? parsed.amount : null,
              currency: parsed.currency || null,
              date: parsed.date || null,
              notes: parsed.notes || null,
              confidence: parsed.confidence || {
                source: parsed.source ? 0.9 : 0.4,
                amount: typeof parsed.amount === "number" && parsed.amount > 0 ? 0.92 : 0.3,
                date: parsed.date ? 0.85 : 0.5
              }
            }
          }
        };
      }
    } catch (aiError) {
      console.error("AI provider error during income extraction:", aiError?.message || aiError);
    }

    try {
      const localResult = smartExtractIncomeFromBuffer(imageBase64, fileName || "");
      if (localResult && (localResult.amount > 0 || localResult.source)) {
        return {
          status: 200,
          body: {
            success: true,
            source: "local_smart_parser_tier",
            aiUsage: { count: usageCheck.count, limit: usageCheck.limit },
            notice:
              "AI vision was unavailable — used local income parser. Please review the extracted details below.",
            data: localResult
          }
        };
      }
    } catch (localErr) {
      console.warn("Local smart income parser fallback failed:", localErr?.message || localErr);
    }

    return {
      status: 503,
      body: {
        success: false,
        error: "Could not read income document using AI Vision. Please enter details manually."
      }
    };
  } catch (error) {
    console.error("Error extracting income document:", error);
    return {
      status: 500,
      body: { success: false, error: error?.message || "Failed to extract income document" }
    };
  }
}

/** @returns {{ status: number, body: object }} */
export async function handleExtractIncomeVoice(body = {}) {
  try {
    const { transcript, audioBase64, mimeType = "audio/webm" } = body;

    if (getConfiguredProviders().length > 0 && (audioBase64 || transcript)) {
      try {
        const promptText = `Extract structured income details from this audio/transcript.
Return strictly valid JSON. Use null for any field you cannot determine — do NOT invent amounts or sources.
{
  "source": "string or null",
  "amount": "number or null",
  "currency": "string or null (USD, EUR, NGN, GBP)",
  "date": "string or null (YYYY-MM-DD)",
  "notes": "string or null",
  "transcriptText": "string",
  "confidence": { "source": number, "amount": number, "date": number }
}`;

        const aiResult = await extractWithAI({
          prompt: promptText,
          transcript,
          audioBase64,
          audioMimeType: mimeType,
          task: "voice-income"
        });

        if (aiResult?.text) {
          const parsed = parseModelJson(aiResult.text);
          const providerName = aiResult.provider || "unknown";
          return {
            status: 200,
            body: {
              success: true,
              source: `ai_${providerName}_voice`,
              data: {
                source: parsed.source || null,
                amount: typeof parsed.amount === "number" ? parsed.amount : null,
                currency: parsed.currency || null,
                date: parsed.date || new Date().toISOString().split("T")[0],
                notes: parsed.notes || null,
                transcriptText: parsed.transcriptText || transcript || "",
                confidence: parsed.confidence || { source: 0.7, amount: 0.7, date: 0.6 }
              }
            }
          };
        }
      } catch (aiErr) {
        console.warn("AI income voice extraction failed, using local parser:", aiErr?.message);
      }
    }

    const local = parseVoiceIncomeLocal(transcript);
    return {
      status: 200,
      body: {
        success: true,
        source: "local_voice_parser",
        notice: getConfiguredProviders().length
          ? "Parsed income voice note locally — please review fields."
          : "Voice parsed locally. Add an AI provider key for better extraction.",
        data: local
      }
    };
  } catch (error) {
    console.error("Error processing income voice note:", error);
    return {
      status: 500,
      body: { success: false, error: error?.message || "Failed to process income voice note" }
    };
  }
}

/** @returns {{ status: number, body: object }} */
export async function handleExchangeRates(query = {}) {
  try {
    const base = String(query.base || "USD").toUpperCase();
    const now = Date.now();

    if (exchangeRateCache.has(base)) {
      const cached = exchangeRateCache.get(base);
      if (now - cached.timestamp < 12 * 60 * 60 * 1000) {
        return { status: 200, body: cached.data };
      }
    }

    const apiKey = process.env.EXCHANGE_RATE_API_KEY || "";
    if (!apiKey) {
      return {
        status: 503,
        body: { success: false, error: "Exchange rate API key not configured", fallback: true }
      };
    }

    let apiUrl =
      process.env.EXCHANGE_RATE_API_URL || "https://v6.exchangerate-api.com/v6/{key}/latest/{base}";
    if (apiUrl.includes("{key}")) apiUrl = apiUrl.replace("{key}", apiKey);
    else if (apiUrl.includes("/v6/latest/")) {
      apiUrl = apiUrl.replace("/v6/latest/", `/v6/${apiKey}/latest/`);
    }
    apiUrl = apiUrl.replace("{base}", base);

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`ExchangeRate API error: ${response.statusText}`);

    const data = await response.json();
    const payload = {
      success: true,
      base: data.base_code || base,
      rates: data.rates || data.conversion_rates || {},
      updatedAt: new Date().toISOString()
    };

    exchangeRateCache.set(base, { timestamp: now, data: payload });
    return { status: 200, body: payload };
  } catch (error) {
    console.warn("Live exchange rate fetch failed:", error.message);
    return {
      status: 500,
      body: { error: "Failed to fetch live exchange rates", fallback: true }
    };
  }
}

export function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}
