/**
 * SnapSME — Firebase Cloud Functions
 *
 * Single-purpose functions per the technical spec:
 *   - extractReceipt:    image upload → vision model → structured JSON (FR1, FR4)
 *   - extractVoiceNote:  voice upload → speech-to-text → same extraction (FR2)
 *   - linkChatAccount:   generate a one-time linking code (FR10)
 *   - telegramWebhook:   handles /link, photo/voice/text messages (FR8)
 *   - whatsappWebhook:   mirrors telegramWebhook (FR9)
 *
 * All AI/vision API keys stay server-side. No keys are exposed to the client.
 */
import { onCall, onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { GoogleGenAI } from "@google/genai";
import { defineSecret } from "firebase-functions/params";

// ---------------------------------------------------------------------------
// Firebase Admin init
// ---------------------------------------------------------------------------
initializeApp();
const db = getFirestore();
const storage = getStorage();

// Secrets (set via `firebase functions:secrets:set`)
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const WHATSAPP_VERIFY_TOKEN = defineSecret("WHATSAPP_VERIFY_TOKEN");
const WHATSAPP_ACCESS_TOKEN = defineSecret("WHATSAPP_ACCESS_TOKEN");

// Default categories (must match the client-side defaults)
const DEFAULT_CATEGORIES = [
  "Fuel & Transport",
  "Office Supplies",
  "Meals & Food",
  "Equipment & Tools",
  "Utilities & Bills",
  "Software & Subscriptions",
  "Petty Cash Spend",
  "Other Expenses"
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGeminiClient() {
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function cleanJson(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function normalizeCategory(suggested) {
  if (!suggested) return "Other Expenses";
  const lower = suggested.toLowerCase();
  const match = DEFAULT_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match || "Other Expenses";
}

/**
 * Verifies the caller is a member of the given business.
 */
async function isBusinessMember(businessId, uid) {
  if (!businessId || !uid) return false;
  const memberRef = db.doc(`businesses/${businessId}/members/${uid}`);
  const snap = await memberRef.get();
  return snap.exists;
}

/**
 * Extracts structured expense data from an image using Gemini AI Vision.
 */
async function extractFromImage(imageBase64, mimeType) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
  const prompt = `Analyze this receipt image or document and extract structured expense details.
Return strictly valid JSON with no markdown formatting or triple backticks.

JSON Schema:
{
  "vendor": "string or null (name of the merchant/vendor found on the receipt, or null if illegible/absent)",
  "amount": "number or null (total monetary amount paid, e.g. 45.50, or null if illegible/absent)",
  "currency": "string or null (3-letter ISO currency code like USD, EUR, GBP, NGN, KES, CAD, or null if undetermined)",
  "date": "string or null (ISO date YYYY-MM-DD if legible, or null if illegible/absent)",
  "suggestedCategory": "string or null (one of: ${DEFAULT_CATEGORIES.join(", ")}, or null)",
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

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash"
  ].filter(Boolean);

  let response = null;
  let lastErr = null;

  for (const modelCandidate of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: modelCandidate,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });
      if (response && response.text) break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!response || !response.text) {
    throw new Error(`Gemini Vision call failed: ${lastErr?.message || "All model candidates failed"}`);
  }

  const textResponse = response.text || "";
  const parsed = JSON.parse(cleanJson(textResponse));

  if (!parsed || (parsed.vendor === null && parsed.amount === null && parsed.date === null)) {
    return {
      vendor: null,
      amount: null,
      currency: null,
      date: null,
      suggestedCategory: null,
      lineItems: [],
      confidence: { vendor: 0.3, amount: 0.3, date: 0.3, category: 0.3 }
    };
  }

  const confMap = { high: 0.90, medium: 0.75, low: 0.45 };
  const rawConf = parsed.confidence || {};

  const vendorConf = typeof rawConf.vendor === "number" ? rawConf.vendor : (confMap[rawConf.vendor] || (parsed.vendor ? 0.85 : 0.30));
  const amountConf = typeof rawConf.amount === "number" ? rawConf.amount : (confMap[rawConf.amount] || (parsed.amount !== null ? 0.90 : 0.30));
  const dateConf = typeof rawConf.date === "number" ? rawConf.date : (confMap[rawConf.date] || (parsed.date ? 0.85 : 0.30));
  const categoryConf = typeof rawConf.category === "number" ? rawConf.category : (confMap[rawConf.category] || (parsed.suggestedCategory ? 0.80 : 0.30));

  return {
    vendor: (parsed.vendor && typeof parsed.vendor === "string") ? parsed.vendor.trim() : null,
    amount: (typeof parsed.amount === "number" && !isNaN(parsed.amount)) ? parsed.amount : null,
    currency: parsed.currency || null,
    date: parsed.date || null,
    suggestedCategory: parsed.suggestedCategory ? normalizeCategory(parsed.suggestedCategory) : null,
    lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
    confidence: {
      vendor: vendorConf,
      amount: amountConf,
      date: dateConf,
      category: categoryConf
    }
  };
}

/**
 * Extracts structured expense data from a voice transcript.
 */
async function extractFromTranscript(transcript) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const promptText = `Extract structured expense details from this audio/transcript.
Return strictly valid JSON:
{
  "vendor": "string",
  "amount": number,
  "currency": "string (USD, EUR, NGN, GBP)",
  "date": "string (YYYY-MM-DD)",
  "suggestedCategory": "string (${DEFAULT_CATEGORIES.join(", ")})",
  "transcriptText": "string (exact or reconstructed speech)",
  "confidence": { "vendor": number, "amount": number, "date": number, "category": number }
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ text: `Transcript: "${transcript}"\n\n${promptText}` }],
    config: { responseMimeType: "application/json" }
  });

  const textResponse = response.text || "";
  const parsed = JSON.parse(cleanJson(textResponse));

  return {
    vendor: parsed.vendor || "Voice Mentioned Vendor",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    currency: parsed.currency || "USD",
    date: parsed.date || new Date().toISOString().split("T")[0],
    suggestedCategory: normalizeCategory(parsed.suggestedCategory),
    transcriptText: parsed.transcriptText || transcript,
    confidence: parsed.confidence || { vendor: 0.82, amount: 0.88, date: 0.70, category: 0.80 }
  };
}

/**
 * Saves an expense to Firestore under the business's expenses subcollection.
 */
async function saveExpenseToFirestore(businessId, expenseData, submittedBy, submittedByName) {
  const expenseRef = db.collection(`businesses/${businessId}/expenses`).doc();
  await expenseRef.set({
    ...expenseData,
    businessId,
    submittedBy,
    submittedByName,
    submittedByRole: "staff",
    syncStatus: "synced",
    createdAt: new Date().toISOString()
  });
  return expenseRef.id;
}

const MAX_MONTHLY_AI_CAPTURES = 150;

/**
 * Checks and increments AI capture usage for a business doc in Firestore.
 */
async function checkAndIncrementAiUsage(businessId) {
  const now = new Date();
  const currentPeriod = now.toISOString().slice(0, 7) + "-01";

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDateStr = nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (!businessId) {
    return { allowed: true, count: 1, limit: MAX_MONTHLY_AI_CAPTURES, resetDate: resetDateStr };
  }

  try {
    const businessRef = db.doc(`businesses/${businessId}`);
    const snap = await businessRef.get();

    let currentCount = 0;
    if (snap.exists && snap.data().aiCaptureUsage) {
      const usage = snap.data().aiCaptureUsage;
      if (usage.periodStart === currentPeriod) {
        currentCount = usage.count || 0;
      }
    }

    if (currentCount >= MAX_MONTHLY_AI_CAPTURES) {
      return {
        allowed: false,
        count: currentCount,
        limit: MAX_MONTHLY_AI_CAPTURES,
        resetDate: resetDateStr
      };
    }

    const updatedCount = currentCount + 1;
    await businessRef.set({
      aiCaptureUsage: {
        count: updatedCount,
        periodStart: currentPeriod
      }
    }, { merge: true });

    return {
      allowed: true,
      count: updatedCount,
      limit: MAX_MONTHLY_AI_CAPTURES,
      resetDate: resetDateStr
    };
  } catch (err) {
    console.warn("Usage cap check failed, allowing extraction:", err.message);
    return { allowed: true, count: 1, limit: MAX_MONTHLY_AI_CAPTURES, resetDate: resetDateStr };
  }
}

// ---------------------------------------------------------------------------
// 1. extractReceipt — onCall (FR1, FR4)
// ---------------------------------------------------------------------------
export const extractReceipt = onCall(
  { secrets: [GEMINI_API_KEY], maxInstances: 10 },
  async (request) => {
    const { imageBase64, mimeType = "image/jpeg", fileName, businessId } = request.data || {};

    if (!imageBase64) {
      throw new Error("Missing imageBase64 in request data.");
    }
    if (!request.auth) {
      throw new Error("Authentication required.");
    }
    if (businessId && !(await isBusinessMember(businessId, request.auth.uid))) {
      throw new Error("You are not a member of this business.");
    }

    // Check monthly fair-use cap
    const usageCheck = await checkAndIncrementAiUsage(businessId);
    if (!usageCheck.allowed) {
      return {
        success: false,
        code: "ai_limit_reached",
        limit: usageCheck.limit,
        usageCount: usageCheck.count,
        resetDate: usageCheck.resetDate,
        error: `You've used your 150 AI scans for this month — you can still add expenses manually, and your limit resets on ${usageCheck.resetDate}.`
      };
    }

    try {
      const data = await extractFromImage(imageBase64, mimeType);
      return {
        success: true,
        source: "ai_gemini_vision_tier",
        notice: "Processed via Gemini AI Vision",
        aiUsage: { count: usageCheck.count, limit: usageCheck.limit },
        data
      };
    } catch (err) {
      console.error("extractReceipt failed:", err.message);
      return {
        success: false,
        code: err.message.includes("429") || err.message.includes("quota") ? "ai_unavailable" : "ai_error",
        error: "The AI vision service is temporarily busy — you can try again or enter details manually below."
      };
    }
  }
);

// ---------------------------------------------------------------------------
// 2. extractVoiceNote — onCall (FR2)
// ---------------------------------------------------------------------------
export const extractVoiceNote = onCall(
  { secrets: [GEMINI_API_KEY], maxInstances: 10 },
  async (request) => {
    const { transcript, audioBase64, mimeType = "audio/webm", businessId } = request.data || {};

    if (!transcript && !audioBase64) {
      throw new Error("Missing transcript or audioBase64 in request data.");
    }
    if (!request.auth) {
      throw new Error("Authentication required.");
    }
    if (businessId && !(await isBusinessMember(businessId, request.auth.uid))) {
      throw new Error("You are not a member of this business.");
    }

    try {
      // For now, we use the transcript path (speech-to-text is handled
      // client-side via the Web Speech API or a future STT function).
      const data = await extractFromTranscript(transcript || "Voice recording processed");
      return {
        success: true,
        source: "ai_gemini_voice",
        data
      };
    } catch (err) {
      console.error("extractVoiceNote failed:", err.message);
      throw new Error(`AI voice extraction failed: ${err.message}`);
    }
  }
);

// ---------------------------------------------------------------------------
// 3. linkChatAccount — onCall (FR10)
// ---------------------------------------------------------------------------
export const linkChatAccount = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { channel } = request.data || {};

    if (!["telegram", "whatsapp"].includes(channel)) {
      throw new Error("Invalid channel. Must be 'telegram' or 'whatsapp'.");
    }
    if (!request.auth) {
      throw new Error("Authentication required.");
    }

    const linkCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

    await db.collection("chatLinks").doc(linkCode).set({
      userId: request.auth.uid,
      channel,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false
    });

    return {
      success: true,
      linkCode,
      channel,
      expiresAt: expiresAt.toISOString(),
      instructions: `Send '/link ${linkCode}' to the @snapsme_bot on ${channel === "telegram" ? "Telegram" : "WhatsApp"} to connect your account.`
    };
  }
);

// ---------------------------------------------------------------------------
// 4. telegramWebhook — onRequest (FR8)
// ---------------------------------------------------------------------------
export const telegramWebhook = onRequest(
  { secrets: [TELEGRAM_BOT_TOKEN, GEMINI_API_KEY], maxInstances: 10 },
  async (req, res) => {
    try {
      const update = req.body;
      const message = update?.message;

      if (!message) {
        return res.status(200).json({ ok: true });
      }

      const chatId = message.chat?.id;
      const senderId = String(message.from?.id || chatId);
      const text = message.text || "";
      const photo = message.photo;
      const voice = message.voice;

      // Handle /start or /help command
      if (text.startsWith("/start") || text.startsWith("/help")) {
        return res.status(200).json({
          ok: true,
          method: "sendMessage",
          chat_id: chatId,
          text: "👋 Welcome to SnapSME Bot!\n\nTo link your Telegram account to your workspace:\n1. Open the SnapSME app → Settings (or Chat Bot tab)\n2. Generate a 6-digit Link Code\n3. Send /link <code> here (e.g. /link 123456)\n\nOnce linked, simply send:\n• 📷 Receipt or invoice photos\n• 🎤 Voice notes\n• 💬 Text like \"Paid $45 for fuel at Shell\" or \"Received $500 from Acme Corp\""
        });
      }

      // Handle /link command
      if (text.startsWith("/link")) {
        const code = text.split(" ")[1]?.trim();
        if (!code) {
          return res.status(200).json({
            ok: true,
            method: "sendMessage",
            chat_id: chatId,
            text: "Please provide your 6-digit link code. Example: /link 123456"
          });
        }

        const linkSnap = await db.collection("chatLinks").doc(code).get();
        if (!linkSnap.exists) {
          return res.status(200).json({
            ok: true,
            method: "sendMessage",
            chat_id: chatId,
            text: "Invalid or expired link code. Please generate a new one from the SnapSME app."
          });
        }

        const link = linkSnap.data();
        if (link.used || new Date(link.expiresAt) < new Date()) {
          return res.status(200).json({
            ok: true,
            method: "sendMessage",
            chat_id: chatId,
            text: "This link code has expired. Please generate a new one from the SnapSME app."
          });
        }

        // Look up the user's business membership
        let businessId = null;
        let memberRef = null;
        const memberships = await db.collectionGroup("members").where("userId", "==", link.userId).get();
        for (const m of memberships.docs) {
          const bId = m.ref.parent.parent?.id;
          if (bId) {
            businessId = bId;
            memberRef = m.ref;
            break;
          }
        }

        if (!businessId) {
          return res.status(200).json({
            ok: true,
            method: "sendMessage",
            chat_id: chatId,
            text: "Could not find an active workspace for your account. Please create or join a workspace first."
          });
        }

        const existingLinkSnap = await db.collection("telegramLinks").doc(senderId).get();
        let noticeMessage = "✅ You're all set — account linked! You can now send photos, voice notes, or text to log expenses and income.";
        if (existingLinkSnap.exists && existingLinkSnap.data().businessId !== businessId) {
          noticeMessage = "✅ Account linked to business workspace! (Previous workspace link replaced).";
        }

        const nowIso = new Date().toISOString();

        // 1. Authoritative top-level lookup doc write O(1)
        await db.collection("telegramLinks").doc(senderId).set({
          businessId,
          userId: link.userId,
          linkedAt: nowIso
        });

        // 2. Member doc update for Settings UI display
        if (memberRef) {
          await memberRef.update({ telegramUserId: senderId });
        }

        // 3. Mark link code as used
        await linkSnap.ref.update({ used: true, telegramUserId: senderId, linkedAt: nowIso });

        return res.status(200).json({
          ok: true,
          method: "sendMessage",
          chat_id: chatId,
          text: noticeMessage
        });
      }

      // DIRECT O(1) TOP-LEVEL LOOKUP FOR INCOMING MESSAGES
      const linkLookupSnap = await db.collection("telegramLinks").doc(senderId).get();
      if (!linkLookupSnap.exists) {
        return res.status(200).json({
          ok: true,
          method: "sendMessage",
          chat_id: chatId,
          text: "You are not linked to a SnapSME business workspace yet. Please generate a 6-digit link code in the SnapSME app settings and send '/link <code>' here to connect your account."
        });
      }

      const { businessId, userId } = linkLookupSnap.data();

      // Handle photo message
      if (photo && photo.length > 0) {
        const fileId = photo[photo.length - 1].file_id;
        const botToken = TELEGRAM_BOT_TOKEN.value();
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileJson = await fileRes.json();
        const filePath = fileJson?.result?.file_path;

        if (filePath) {
          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
          const imgRes = await fetch(fileUrl);
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const imageBase64 = imgBuffer.toString("base64");

          const data = await extractFromImage(imageBase64, "image/jpeg");
          await saveExpenseToFirestore(businessId, data, userId, "Telegram Bot User");

          return res.status(200).json({
            ok: true,
            method: "sendMessage",
            chat_id: chatId,
            text: `Got your receipt — scanned & saved! 📄\n• Vendor: ${data.vendor || "N/A"}\n• Amount: ${data.amount ? data.amount + " " + (data.currency || "USD") : "Needs review"}\n• Date: ${data.date || "Today"}\n• Category: ${data.suggestedCategory || "Other Expenses"}\nThat's in the books!`
          });
        }
      }

      // Handle voice message
      if (voice) {
        return res.status(200).json({
          ok: true,
          method: "sendMessage",
          chat_id: chatId,
          text: "🎤 Voice note received! Send a voice note or type your entry (e.g. 'Paid $45 for fuel at Shell' or 'Received $500 from Acme Corp')."
        });
      }

      // Handle plain text (treat as expense description)
      if (text && !text.startsWith("/")) {
        const data = await extractFromTranscript(text);
        await saveExpenseToFirestore(businessId, data, userId, "Telegram Bot User");

        return res.status(200).json({
          ok: true,
          method: "sendMessage",
          chat_id: chatId,
          text: `📄 Expense logged!\n• Vendor: ${data.vendor || "N/A"}\n• Amount: ${data.amount ? data.amount + " " + (data.currency || "USD") : "Needs review"}\n• Date: ${data.date || "Today"}\n• Category: ${data.suggestedCategory || "Other Expenses"}`
        });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("telegramWebhook error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// 5. whatsappWebhook — onRequest (FR9)
// ---------------------------------------------------------------------------
export const whatsappWebhook = onRequest(
  { secrets: [WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, GEMINI_API_KEY], maxInstances: 10 },
  async (req, res) => {
    // Webhook verification (GET)
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN.value()) {
        return res.status(200).send(challenge);
      }
      return res.status(403).send("Verification failed");
    }

    // Incoming message (POST)
    try {
      const body = req.body;
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return res.status(200).json({ status: "ok" });
      }

      const msg = messages[0];
      const from = String(msg.from); // phone-based WhatsApp user ID
      const type = msg.type;

      // Handle text messages
      if (type === "text") {
        const text = msg.text?.body || "";

        if (text.startsWith("/link")) {
          const code = text.split(" ")[1]?.trim();
          if (!code) {
            return res.status(200).json({ status: "ok" });
          }

          const linkSnap = await db.collection("chatLinks").doc(code).get();
          if (!linkSnap.exists) {
            return res.status(200).json({ status: "ok" });
          }

          const link = linkSnap.data();
          if (link.used || new Date(link.expiresAt) < new Date()) {
            return res.status(200).json({ status: "ok" });
          }

          let businessId = null;
          let memberRef = null;
          const memberships = await db.collectionGroup("members").where("userId", "==", link.userId).get();
          for (const m of memberships.docs) {
            const bId = m.ref.parent.parent?.id;
            if (bId) {
              businessId = bId;
              memberRef = m.ref;
              break;
            }
          }

          if (!businessId) {
            return res.status(200).json({ status: "ok" });
          }

          const nowIso = new Date().toISOString();

          // 1. Authoritative top-level lookup doc write O(1)
          await db.collection("whatsappLinks").doc(from).set({
            businessId,
            userId: link.userId,
            linkedAt: nowIso
          });

          // 2. Member doc update for Settings UI display
          if (memberRef) {
            await memberRef.update({ whatsappUserId: from });
          }

          // 3. Mark link code as used
          await linkSnap.ref.update({ used: true, whatsappUserId: from, linkedAt: nowIso });

          return res.status(200).json({ status: "ok" });
        }

        // DIRECT O(1) TOP-LEVEL LOOKUP
        const linkLookupSnap = await db.collection("whatsappLinks").doc(from).get();
        if (!linkLookupSnap.exists) {
          console.warn(`WhatsApp sender ${from} is not linked.`);
          return res.status(200).json({ status: "ok" });
        }

        const { businessId, userId } = linkLookupSnap.data();
        const data = await extractFromTranscript(text);
        await saveExpenseToFirestore(businessId, data, userId, "WhatsApp User");

        return res.status(200).json({ status: "ok" });
      }

      // Handle image messages
      if (type === "image") {
        const linkLookupSnap = await db.collection("whatsappLinks").doc(from).get();
        if (!linkLookupSnap.exists) {
          return res.status(200).json({ status: "ok" });
        }

        const { businessId, userId } = linkLookupSnap.data();
        const mediaId = msg.image?.id;
        if (mediaId) {
          const accessToken = WHATSAPP_ACCESS_TOKEN.value();
          const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const mediaJson = await mediaRes.json();
          const mediaUrl = mediaJson?.url;

          if (mediaUrl) {
            const imgRes = await fetch(mediaUrl, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            const imageBase64 = imgBuffer.toString("base64");

            const data = await extractFromImage(imageBase64, "image/jpeg");
            await saveExpenseToFirestore(businessId, data, userId, "WhatsApp User");
            return res.status(200).json({ status: "ok" });
          }
        }
      }

      return res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("whatsappWebhook error:", err);
      return res.status(500).json({ status: "error", error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// 6. One-Time Migration: Move nested member chat IDs to top-level collections
// ---------------------------------------------------------------------------
export async function migrateChatLinksToTopLevel() {
  const membersSnap = await db.collectionGroup("members").get();
  let count = 0;

  for (const mDoc of membersSnap.docs) {
    const data = mDoc.data();
    const businessId = mDoc.ref.parent.parent?.id;
    const userId = data.userId || mDoc.id;

    if (businessId && data.telegramUserId) {
      await db.collection("telegramLinks").doc(String(data.telegramUserId)).set({
        businessId,
        userId,
        linkedAt: data.invitedAt || new Date().toISOString()
      }, { merge: true });
      count++;
    }

    if (businessId && data.whatsappUserId) {
      await db.collection("whatsappLinks").doc(String(data.whatsappUserId)).set({
        businessId,
        userId,
        linkedAt: data.invitedAt || new Date().toISOString()
      }, { merge: true });
      count++;
    }
  }

  console.log(`[Migration] Migrated ${count} chat link mappings to top-level collections.`);
  return { success: true, count };
}

// ---------------------------------------------------------------------------
// 7. Generic Inbound API — POST /api/v1/income & POST /api/v1/expenses
// ---------------------------------------------------------------------------

/**
 * In-memory rate limit store.
 * Key: API key string → { count: number, windowStart: timestamp }
 * Resets per 60-second sliding window. Generous 100 req/min per key.
 */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100;

function checkRateLimit(apiKey) {
  const now = Date.now();
  let entry = rateLimitStore.get(apiKey);

  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(apiKey, entry);
    return true; // allowed
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return false; // rate limited
  }
  return true;
}

/**
 * Validates a JSON payload for an income or expense record.
 * Returns { valid: true, data: {...} } or { valid: false, errors: [...] }
 */
function validateApiPayload(body, type) {
  const errors = [];

  // Amount — required, positive number
  if (body.amount === undefined || body.amount === null) {
    errors.push({ field: "amount", error: "Amount is required." });
  } else {
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push({ field: "amount", error: "Amount must be a positive number." });
    }
  }

  // Date — optional, defaults to today, must be a valid date if provided
  let parsedDate = new Date().toISOString().split("T")[0];
  if (body.date !== undefined && body.date !== null && body.date !== "") {
    const d = new Date(body.date);
    if (isNaN(d.getTime())) {
      errors.push({ field: "date", error: `Invalid date format: "${body.date}". Use YYYY-MM-DD.` });
    } else {
      parsedDate = d.toISOString().split("T")[0];
    }
  }

  // Source (income) or Vendor (expenses) — optional string
  const sourceOrVendor = typeof body.source === "string" ? body.source.trim() : "";

  // Currency — optional, defaults to USD
  const currency = typeof body.currency === "string" && body.currency.trim().length === 3
    ? body.currency.trim().toUpperCase()
    : "USD";

  // Notes — optional string
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  // Category — optional string
  const category = typeof body.category === "string" ? body.category.trim() : "";

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const data = {
    amount: Number(body.amount),
    currency,
    date: parsedDate,
    notes,
    source: "api",
    createdAt: new Date().toISOString(),
    submittedBy: "api",
    submittedByName: "API Integration",
    syncStatus: "synced"
  };

  if (type === "income") {
    data.source = sourceOrVendor || "API Income";
    data.sourceType = "api";
  } else {
    data.vendor = sourceOrVendor || "API Expense";
    data.categoryName = category || "Other Expenses";
    data.moneyMovement = "company_card";
  }

  return { valid: true, data };
}

/**
 * Authenticates an API key from the Authorization header.
 * Returns { businessId } on success, or throws with an HTTP-appropriate message.
 */
async function authenticateApiKey(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: "Missing or malformed Authorization header. Expected: Bearer <apiKey>", status: 401 };
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey || !apiKey.startsWith("sk_live_")) {
    return { error: "Invalid API key format.", status: 401 };
  }

  // O(1) lookup in top-level apiKeys collection
  const lookupDoc = await db.collection("apiKeys").doc(apiKey).get();
  if (!lookupDoc.exists) {
    return { error: "Invalid API key. Generate a new key in SnapSME Settings.", status: 401 };
  }

  // Rate limit check
  if (!checkRateLimit(apiKey)) {
    return {
      error: "Rate limit exceeded (100 requests/minute). Please slow down and retry.",
      status: 429
    };
  }

  return { businessId: lookupDoc.data().businessId, apiKey };
}

/**
 * POST /api/v1/income — push income records via API key auth.
 */
export const apiIncome = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      const authResult = await authenticateApiKey(req);
      if (authResult.error) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { businessId } = authResult;
      const validation = validateApiPayload(req.body, "income");

      if (!validation.valid) {
        return res.status(400).json({
          error: "Invalid payload",
          details: validation.errors
        });
      }

      // Write to Firestore
      const incomeRef = db.collection(`businesses/${businessId}/income`).doc();
      const record = { ...validation.data, id: incomeRef.id };
      await incomeRef.set(record);

      return res.status(201).json({
        status: "created",
        id: incomeRef.id,
        type: "income",
        businessId
      });
    } catch (err) {
      console.error("apiIncome error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * POST /api/v1/expenses — push expense records via API key auth.
 */
export const apiExpenses = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      const authResult = await authenticateApiKey(req);
      if (authResult.error) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { businessId } = authResult;
      const validation = validateApiPayload(req.body, "expenses");

      if (!validation.valid) {
        return res.status(400).json({
          error: "Invalid payload",
          details: validation.errors
        });
      }

      // Write to Firestore
      const expenseRef = db.collection(`businesses/${businessId}/expenses`).doc();
      const record = { ...validation.data, id: expenseRef.id };
      await expenseRef.set(record);

      return res.status(201).json({
        status: "created",
        id: expenseRef.id,
        type: "expense",
        businessId
      });
    } catch (err) {
      console.error("apiExpenses error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);