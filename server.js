import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { convertCurrency, getCurrencySymbol } from "./src/lib/currencies.js";
import {
  handleHealth,
  handleExtractReceipt,
  handleExtractVoice,
  handleExtractIncomeDoc,
  handleExtractIncomeVoice,
  handleExchangeRates,
  sendResult
} from "./api/_lib/extractCore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

// Brand assets BEFORE static — public/favicon.ico is a huge legacy file (546KB)
app.get(["/favicon.ico", "/favicon.jpg"], (_req, res) => {
  const fav = path.join(process.cwd(), "public", "favicon.jpg");
  if (fs.existsSync(fav)) {
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.type("image/jpeg").sendFile(fav);
  } else {
    res.status(204).end();
  }
});

app.get("/logo.jpg", (_req, res) => {
  const logo = path.join(process.cwd(), "public", "logo.jpg");
  if (fs.existsSync(logo)) {
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.type("image/jpeg").sendFile(logo);
  } else {
    res.status(404).end();
  }
});

app.use(express.static(path.join(process.cwd(), "public")));

// Default categories
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

// 1. Health check
app.get("/api/health", async (_req, res) => {
  const result = await handleHealth();
  sendResult(res, result);
});

// 1b. Firebase client config endpoint (keeps API key out of client-side source code)
app.get("/api/firebase-config", (_req, res) => {
  res.json({
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "",
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || ""
  });
});

// Extract / health / rates — shared with Vercel serverless (api/_lib/extractCore.js)
app.post("/api/extract-receipt", async (req, res) => {
  sendResult(res, await handleExtractReceipt(req.body || {}));
});

app.get("/api/exchange-rates", async (req, res) => {
  sendResult(res, await handleExchangeRates(req.query || {}));
});

app.post("/api/extract-batch", async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing or empty items array" });
    }
    const results = items.map((item) => ({ fileName: item.fileName, status: "queued" }));
    return res.json({
      success: true,
      count: results.length,
      results,
      notice: "Batch extract is queued for sequential processing."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/extract-voice", async (req, res) => {
  sendResult(res, await handleExtractVoice(req.body || {}));
});

app.post("/api/extract-income-doc", async (req, res) => {
  sendResult(res, await handleExtractIncomeDoc(req.body || {}));
});

app.post("/api/extract-income-voice", async (req, res) => {
  sendResult(res, await handleExtractIncomeVoice(req.body || {}));
});

// 4. Chat Link Code Generator & Simulator
app.post("/api/chat/generate-link", (req, res) => {
  const { userId, channel = "telegram" } = req.body;
  const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
  res.json({
    success: true,
    linkCode: randomCode,
    channel,
    instructions: `Send '/link ${randomCode}' to the @snapsme_bot on ${channel === "telegram" ? "Telegram" : "WhatsApp"} to connect your account.`
  });
});

// ---------------------------------------------------------------------------
// 5. REAL TELEGRAM & WHATSAPP BOT INTEGRATION
// ---------------------------------------------------------------------------

// In-memory bot pairing store: { linkCode -> { userId, channel, businessId, displayName } }
const botPairings = new Map();
// In-memory bot session store: { chatId -> { userId, businessId, displayName, channel, captureType } }
const botSessions = new Map();

// Helper: Send a Telegram message via Bot API
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Telegram API error: ${err.description || res.statusText}`);
  }
  return res.json();
}

// Helper: Send a WhatsApp message via WhatsApp Business Cloud API
async function sendWhatsAppMessage(phoneNumberId, accessToken, to, text) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`WhatsApp API error: ${err.error?.message || res.statusText}`);
  }
  return res.json();
}

// Helper: Parse a text message into structured expense/income data
function parseBotMessage(text, captureType) {
  const amountMatch = text.match(/(\$|€|£|₦)?\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[2]) : null;

  let currency = "USD";
  if (/euro|eur|€/i.test(text)) currency = "EUR";
  else if (/pound|gbp|£/i.test(text)) currency = "GBP";
  else if (/naira|ngn|₦/i.test(text)) currency = "NGN";
  else if (/dollar|usd|\$/i.test(text)) currency = "USD";

  let label = captureType === "expense" ? "Merchant" : "Client Payment";

  if (captureType === "expense") {
    if (/fuel|gas|diesel|uber|cab|taxi|transport/i.test(text)) label = "Fuel & Transport";
    else if (/lunch|dinner|breakfast|food|coffee|cafe|restaurant/i.test(text)) label = "Meals & Dining";
    else if (/paper|print|pen|office|supplies/i.test(text)) label = "Office Supplies";
    else if (/tool|hardware|equipment/i.test(text)) label = "Equipment & Tools";
    else if (/bill|utility|power|water|electric|internet/i.test(text)) label = "Utilities & Bills";
    else if (/software|saas|subscription|cloud/i.test(text)) label = "Software & Subscriptions";
  } else {
    if (/sales|product|order|shop/i.test(text)) label = "Product Sales";
    else if (/client|invoice|payment received/i.test(text)) label = "Client Payment";
    else if (/refund|return|reversal/i.test(text)) label = "Refund Received";
    else if (/transfer|bank|deposit|wire/i.test(text)) label = "Bank Transfer";
  }

  return { amount, currency, label };
}

// Helper: Build the bot reply text
function buildBotReply(parsed, captureType, channel, workspaceCurrency = "USD") {
  const { amount, currency, label } = parsed;
  if (!amount) {
    return `❌ I couldn't find an amount in your message.\n\nTry something like:\n• Expense: "Paid $45 for fuel at Shell"\n• Income: "Received $500 from Acme Corp for sales"`;
  }
  const conversion = convertCurrency(amount, currency, workspaceCurrency);
  return `Saved! That's in the books. 📑\n✅ ${captureType === "expense" ? "Expense" : "Income"} Captured!\n• ${captureType === "expense" ? "Vendor" : "Source"}: ${label}\n• Original: ${getCurrencySymbol(currency)}${amount.toFixed(2)} ${currency}\n• Accounting Ledger: ${getCurrencySymbol(workspaceCurrency)}${conversion.convertedAmount.toFixed(2)} ${workspaceCurrency}\n• Source: ${channel}\nSaved to your workspace feed!`;
}

// Helper: Process an incoming bot message (shared by Telegram & WhatsApp)
async function processBotMessage({ chatId, text, channel, botToken, phoneNumberId, accessToken }) {
  const session = botSessions.get(chatId);
  if (!session) {
    const reply = "🔗 *Welcome to SnapSME Bot!*\n\nYou haven't linked your account yet.\n\n1. Open the SnapSME app → Chat Bot tab\n2. Click *Generate 6-Digit Link Code*\n3. Send /link <code> here to connect.\n\nOnce linked, you can send:\n• 📷 Receipt photos\n• 🎤 Voice notes\n• 💬 Text like \"Paid $45 for fuel\" or \"Received $500 from Acme\"";
    if (channel === "telegram") {
      await sendTelegramMessage(botToken, chatId, reply);
    } else {
      await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
    }
    return { success: true, handled: true };
  }

  // Handle /link command
  if (text.trim().startsWith("/link")) {
    const code = text.trim().split(/\s+/)[1];
    if (!code) {
      const reply = "❌ Please provide a link code. Example: /link 123456";
      if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
      else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
      return { success: true, handled: true };
    }
    const pairing = botPairings.get(code);
    if (!pairing) {
      const reply = "❌ Invalid or expired link code. Please generate a new one in the SnapSME app.";
      if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
      else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
      return { success: true, handled: true };
    }
    // Link the chat to the user's workspace
    botSessions.set(chatId, {
      userId: pairing.userId,
      businessId: pairing.businessId,
      displayName: pairing.displayName,
      channel,
      captureType: "expense"
    });
    botPairings.delete(code);
    const reply = `✅ *Account Linked!*\n\nWelcome, ${pairing.displayName}!\n\nYou can now send:\n• 📷 Receipt photos\n• 🎤 Voice notes\n• 💬 Text messages\n\nUse /expense or /income to switch capture type.\n\nCurrent mode: *Expense*`;
    if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
    else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
    return { success: true, handled: true };
  }

  // Handle /expense and /income commands
  if (text.trim() === "/expense" || text.trim() === "/income") {
    session.captureType = text.trim() === "/expense" ? "expense" : "income";
    const reply = `✅ Capture mode set to *${session.captureType === "expense" ? "Expense" : "Income"}*.\n\nSend a message, photo, or voice note now.`;
    if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
    else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
    return { success: true, handled: true };
  }

  // Handle /help command
  if (text.trim() === "/help" || text.trim() === "/start") {
    const reply = `📖 *SnapSME Bot Help*\n\nCommands:\n• /link <code> — Link your account\n• /expense — Switch to expense capture\n• /income — Switch to income capture\n• /help — Show this help\n\nExamples:\n• "Paid $45 for fuel at Shell"\n• "Received $500 from Acme Corp for sales"\n\nYou can also send receipt photos or voice notes!`;
    if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
    else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
    return { success: true, handled: true };
  }

  // Parse and capture the message
  const parsed = parseBotMessage(text, session.captureType);
  if (!parsed.amount) {
    const reply = "❌ I couldn't find an amount in your message.\n\nTry something like:\n• Expense: \"Paid $45 for fuel at Shell\"\n• Income: \"Received $500 from Acme Corp for sales\"";
    if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
    else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);
    return { success: true, handled: true };
  }

  const reply = buildBotReply(parsed, session.captureType, channel, "USD");
  if (channel === "telegram") await sendTelegramMessage(botToken, chatId, reply);
  else await sendWhatsAppMessage(phoneNumberId, accessToken, chatId, reply);

  return {
    success: true,
    handled: true,
    data: {
      ...parsed,
      captureType: session.captureType,
      userId: session.userId,
      businessId: session.businessId,
      displayName: session.displayName,
      channel
    }
  };
}

// Register a bot pairing code (called by the app when generating a link)
app.post("/api/bot/register-pairing", (req, res) => {
  const { userId, businessId, displayName, channel = "telegram" } = req.body;
  if (!userId || !businessId) {
    return res.status(400).json({ error: "Missing userId or businessId" });
  }
  const linkCode = Math.floor(100000 + Math.random() * 900000).toString();
  botPairings.set(linkCode, { userId, businessId, displayName: displayName || "User", channel });
  // Auto-expire after 10 minutes
  setTimeout(() => botPairings.delete(linkCode), 10 * 60 * 1000);
  res.json({ success: true, linkCode, expiresIn: 600 });
});

// Get bot connection status
app.get("/api/bot/status", (req, res) => {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  res.json({
    success: true,
    telegram: {
      configured: Boolean(telegramToken),
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null
    },
    whatsapp: {
      configured: Boolean(whatsappToken && whatsappPhoneId),
      phoneNumberId: whatsappPhoneId || null
    }
  });
});

// Telegram Bot Webhook Endpoint
app.post("/api/bot/telegram/webhook", async (req, res) => {
  try {
    const update = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(503).json({ error: "Telegram bot not configured" });
    }

    // Handle message updates
    if (update.message) {
      const chatId = String(update.message.chat.id);
      const text = update.message.text || "";

      // Handle photo messages
      if (update.message.photo && update.message.photo.length > 0) {
        const fileId = update.message.photo[update.message.photo.length - 1].file_id;
        const reply = "📷 *Photo received!*\n\nI've noted your receipt photo. For now, please also send the amount as text (e.g. \"Paid $45 for fuel\") so I can log it accurately.\n\nFull photo OCR is coming soon!";
        await sendTelegramMessage(botToken, chatId, reply);
        return res.json({ success: true, handled: true });
      }

      // Handle voice messages
      if (update.message.voice) {
        const reply = "🎤 *Voice note received!*\n\nI've noted your voice note. For now, please also send the amount as text (e.g. \"Received $500 from Acme\") so I can log it accurately.\n\nFull voice transcription is coming soon!";
        await sendTelegramMessage(botToken, chatId, reply);
        return res.json({ success: true, handled: true });
      }

      if (text) {
        const result = await processBotMessage({
          chatId,
          text,
          channel: "telegram",
          botToken
        });
        return res.json(result);
      }
    }

    res.json({ success: true, handled: false });
  } catch (err) {
    console.error("Telegram webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp Business Cloud API Webhook Endpoint
app.post("/api/bot/whatsapp/webhook", async (req, res) => {
  try {
    const body = req.body;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!accessToken || !phoneNumberId) {
      return res.status(503).json({ error: "WhatsApp bot not configured" });
    }

    // WhatsApp webhook verification (GET)
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }
      return res.status(403).send("Verification failed");
    }

    // Handle incoming messages
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          for (const msg of change.value?.messages || []) {
            const chatId = msg.from;
            const text = msg.text?.body || "";

            if (text) {
              const result = await processBotMessage({
                chatId,
                text,
                channel: "whatsapp",
                botToken: null,
                phoneNumberId,
                accessToken
              });
              return res.json(result);
            }
          }
        }
      }
    }

    res.json({ success: true, handled: false });
  } catch (err) {
    console.error("WhatsApp webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp webhook verification (GET)
app.get("/api/bot/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Verification failed");
});

// Send a test message via Telegram
app.post("/api/bot/telegram/send", async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(503).json({ error: "Telegram bot not configured" });
    if (!chatId || !text) return res.status(400).json({ error: "Missing chatId or text" });
    const result = await sendTelegramMessage(botToken, chatId, text);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a test message via WhatsApp
app.post("/api/bot/whatsapp/send", async (req, res) => {
  try {
    const { to, text } = req.body;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!accessToken || !phoneNumberId) return res.status(503).json({ error: "WhatsApp bot not configured" });
    if (!to || !text) return res.status(400).json({ error: "Missing to or text" });
    const result = await sendWhatsAppMessage(phoneNumberId, accessToken, to, text);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static page routes
app.get(["/home", "/home.html", "/landing", "/landing.html"], (_req, res) => {
  res.redirect("/");
});

app.get(["/about", "/about.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "about.html"));
});

app.get(["/learn", "/learn/", "/learn/index.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "learn", "index.html"));
});

app.get("/learn/:slug", (req, res) => {
  const slug = req.params.slug.replace(/\.html$/, "");
  const file = path.join(process.cwd(), "public", "learn", `${slug}.html`);
  res.sendFile(file, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(process.cwd(), "public", "404.html"));
    }
  });
});

app.get(["/help", "/help.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "help.html"));
});

app.get(["/faq", "/faq.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "faq.html"));
});

app.get(["/about", "/about.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "about.html"));
});

app.get(["/contact", "/contact.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "contact.html"));
});

app.get(["/privacy", "/privacy.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "privacy.html"));
});

app.get(["/terms", "/terms.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "terms.html"));
});

app.get(["/cookies", "/cookies.html"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "cookies.html"));
});

app.get("/sitemap.xml", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "sitemap.xml"));
});

app.get("/robots.txt", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "robots.txt"));
});

app.get("/404", (_req, res) => {
  res.status(404).sendFile(path.join(process.cwd(), "public", "404.html"));
});

// Start Express server with Vite middleware in dev or static serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });

    // Vite must handle /src, /@vite, /@react-refresh, etc. Register early so
    // module transforms never fall through as Express "Cannot GET" 404s.
    app.use(vite.middlewares);

    // Serve landing page
    app.get(["/", "/index.html"], async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

    // Serve React App
    app.get("/app", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.join(process.cwd(), "app.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    
    app.get("/app.html", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.join(process.cwd(), "app.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.get("/app", (_req, res) => {
      res.sendFile(path.join(distPath, "app.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[snapsme] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
