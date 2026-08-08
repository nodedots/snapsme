# Telegram & WhatsApp Bot — Setup & Workflow Guide

**Project:** SnapSME  
**Scope:** Developer / Workspace Owner setup reference  
**Last Updated:** August 2026

---

## Overview

SnapSME supports two chat-based intake channels that let your team log expenses and income without opening the app. Staff simply send a message, photo, or voice note to the bot from their favourite messaging app, and the entry appears in the shared workspace feed in real time.

| Channel | Status | Entry point |
|---|---|---|
| **Telegram** | ✅ Production | `@snapsme_bot` |
| **WhatsApp** | ✅ Production | WhatsApp Business number |

Both channels share the same account-linking flow and Firestore data model. The only differences are the API provider and the webhook format.

---

## How It Works (High-Level Flow)

```
Staff opens Telegram / WhatsApp
        │
        ▼
Sends message to bot
(photo, voice, or text)
        │
        ▼
Firebase Cloud Function (telegramWebhook / whatsappWebhook)
        │
        ├─ O(1) lookup in telegramLinks / whatsappLinks
        │   → resolves sender → businessId + userId
        │
        ├─ Photo → AI vision (Gemini) → structured JSON
        ├─ Text  → AI text extraction → structured JSON
        │
        ▼
Expense written to Firestore
businesses/{businessId}/expenses/{id}
        │
        ▼
Appears in workspace feed (real-time)
```

---

## Part 1 — Telegram Bot Setup

### Step 1.1 — Create the Bot via BotFather

1. Open Telegram and search for **@BotFather** (the official bot creation account — blue checkmark).
2. Send `/newbot` and follow the prompts:
   - **Bot display name:** `SnapSME`
   - **Bot username:** `snapsme_bot` (must end in `bot`)
3. BotFather replies with a **bot token** that looks like:
   ```
   5512345678:AAHdqTcvCH1vGWJxfSeofSz2wzLxFABCDEF
   ```
4. Copy and store this token securely. You will use it in Step 1.3.

### Step 1.2 — (Optional) Customise the Bot

Still in BotFather, run these commands to polish the bot:

```
/setdescription   → "Send a receipt photo or type an expense — e.g. 'Paid 45 dollars for fuel at Shell' — to log it to your SnapSME workspace."
/setuserpic       → upload the SnapSME logo
/setcommands      → /link - Connect your SnapSME account
```

### Step 1.3 — Store the Token as a Firebase Secret

The token must never be in source code or `.env` files committed to version control. Store it as a Cloud Functions secret:

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# Paste the token when prompted
```

Verify it is set:

```bash
firebase functions:secrets:access TELEGRAM_BOT_TOKEN
```

### Step 1.4 — Deploy the Cloud Function

The `telegramWebhook` function is already implemented in `functions/index.js`. Deploy it:

```bash
firebase deploy --only functions:telegramWebhook
```

After deployment, the Firebase console will show the function's HTTPS endpoint URL. It looks like:

```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/telegramWebhook
```

Copy this URL — you need it for the next step.

### Step 1.5 — Register the Webhook with Telegram

Tell Telegram's servers where to send updates (replace both placeholder values):

```bash
curl -s -X POST \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=YOUR_CLOUD_FUNCTION_URL"
```

**Expected success response:**
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

**Verify the webhook is active:**
```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

The `url` field in the response should match your Cloud Function URL.

> **Important:** Telegram requires the webhook URL to use **HTTPS**. Firebase Cloud Function URLs are HTTPS by default — no additional certificate setup needed.

---

## Part 2 — WhatsApp Bot Setup

WhatsApp uses the **Meta Business Cloud API**, which requires a verified Meta Business account. This is a slightly longer process than Telegram.

### Step 2.1 — Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Click **My Apps → Create App**.
3. Choose **Business** as the app type.
4. Give it a name (e.g., "SnapSME Bot") and attach it to your Meta Business account.

### Step 2.2 — Add the WhatsApp Product

1. Inside your new app's dashboard, click **Add Products**.
2. Find **WhatsApp** and click **Set Up**.
3. Navigate to **WhatsApp → Getting Started** in the left sidebar.

You will see:
- A **temporary test phone number** (free, usable immediately for dev/testing)
- A **permanent phone number** section (requires verification for production)

### Step 2.3 — Get Your Access Token & Phone Number ID

From the WhatsApp **Getting Started** page:

- **Temporary access token** — shown on the page (expires in 24 hours for testing)
- **Permanent token** — generate from System Users in Meta Business Manager
- **Phone Number ID** — shown on the same page, looks like `102123456789`

### Step 2.4 — Store Secrets as Firebase Secrets

```bash
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
# Paste the permanent access token

firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
# Choose any random string (e.g. a UUID) — you will use it in Step 2.5
```

### Step 2.5 — Deploy the Cloud Function

```bash
firebase deploy --only functions:whatsappWebhook
```

Get the resulting HTTPS endpoint URL from the Firebase console.

### Step 2.6 — Register the Webhook in Meta Dashboard

1. In your Meta app dashboard go to **WhatsApp → Configuration → Webhook**.
2. Click **Edit** and fill in:
   - **Callback URL:** your `whatsappWebhook` Cloud Function URL
   - **Verify Token:** the same random string you set as `WHATSAPP_VERIFY_TOKEN` in Step 2.4
3. Click **Verify and Save**.

Meta will make a `GET` request to your function with a `hub.challenge` parameter. The function echoes it back to confirm ownership. If the verify token matches, the webhook is accepted.

4. In the **Webhook Fields** section, subscribe to the **`messages`** field.

### Step 2.7 — (Production Only) Verify Your Business Phone Number

For a permanent production number:

1. Go to **WhatsApp → Phone Numbers** and add a real business phone number.
2. Complete Meta's verification process (you receive an OTP via call or SMS).
3. Replace the temporary test number with the verified number in your app configuration.

> **Note:** During development, Meta's test number supports messaging to up to **5 whitelisted numbers**. Add tester phone numbers in **WhatsApp → API Setup → To**.

---

## Part 3 — Account Linking (User-Facing Flow)

This is the same flow for both Telegram and WhatsApp. Each team member must link their chat account to their SnapSME profile once before they can submit via bot.

### Step 3.1 — Generate a Link Code in SnapSME

1. The user opens the SnapSME app and goes to **Settings → Integrations**.
2. They click **Connect Telegram** or **Connect WhatsApp**.
3. The app calls the `linkChatAccount` Cloud Function, which:
   - Generates a random **6-digit numeric code** (e.g., `847291`)
   - Writes it to `chatLinks/{code}` in Firestore with a **24-hour expiry**
   - Returns the code and instructions to the UI

The user sees:

```
Your link code: 847291
Send  /link 847291  to @snapsme_bot on Telegram
(Expires in 24 hours)
```

### Step 3.2 — Send the Link Command in the Chat App

**Telegram:**
1. Open Telegram and search for `@snapsme_bot`
2. Start the chat and send:
   ```
   /link 847291
   ```

**WhatsApp:**
1. Save the SnapSME WhatsApp business number to contacts
2. Send a message to that number:
   ```
   /link 847291
   ```

### Step 3.3 — What Happens on the Server

The webhook function receives the `/link` message and:

1. Looks up `chatLinks/{847291}` in Firestore.
2. Validates that the code exists, has not been used, and has not expired.
3. Does a collection-group query to find the user's `businessId` from the `members` subcollection.
4. Writes a **top-level lookup document** for O(1) identity resolution on future messages:
   - **Telegram:** `telegramLinks/{telegramUserId}` → `{ businessId, userId, linkedAt }`
   - **WhatsApp:** `whatsappLinks/{whatsappPhoneNumber}` → `{ businessId, userId, linkedAt }`
5. Updates the member's document with `telegramUserId` or `whatsappUserId` (for display in Settings).
6. Marks the link code as `used: true`.
7. Replies to the user:
   ```
   ✅ Account linked! You can now send receipt photos or voice notes to log expenses.
   ```

> **Note:** Each link code is single-use and expires after 24 hours. If a user sends `/link` with an expired or already-used code, the bot asks them to generate a new one from the app.

---

## Part 4 — Submitting Expenses via Bot

Once linked, the user can submit expenses in three ways:

### Method A — Receipt Photo

1. User takes a photo of a paper receipt.
2. Sends the photo directly to the bot chat.
3. The webhook function:
   - Fetches the image from Telegram's servers (`getFile` → download URL) or Meta's CDN (using the access token).
   - Converts the image to base64.
   - Sends it to **Gemini Vision AI** for OCR extraction.
   - Receives structured JSON: `vendor`, `amount`, `currency`, `date`, `suggestedCategory`.
   - Writes the expense to `businesses/{businessId}/expenses/{id}` with `source: "telegram"` or `source: "whatsapp"`.
4. Bot replies:
   ```
   📄 Receipt scanned & saved!
   • Vendor: Shell Petroleum
   • Amount: 45.00 USD
   • Date: 2026-08-08
   • Category: Fuel & Transport
   ```

### Method B — Text Description

1. User types a plain-text description:
   ```
   Paid 3500 naira for office printing at the business centre
   ```
2. The webhook function passes the text to Gemini for structured extraction.
3. Expense is saved and bot replies with a summary.

> **Important:** Text messages that start with `/` (slash commands) are treated as commands, not expense descriptions. Plain text only.

### Method C — Voice Note (Telegram)

Currently, Telegram voice notes prompt the user to type instead:
```
🎤 Voice notes are supported! Please type your expense description (e.g. 'Paid 45 dollars for fuel at Shell').
```

Full voice-to-text transcription via Gemini is ready in the architecture and can be enabled when needed.

---

## Part 5 — Firestore Data Model Reference

```
chatLinks/{linkCode}               ← Temporary linking codes
  userId:    string
  channel:   "telegram" | "whatsapp"
  createdAt: ISO string
  expiresAt: ISO string (24h TTL)
  used:      boolean

telegramLinks/{telegramUserId}     ← Authoritative O(1) identity lookup (Telegram)
  businessId: string
  userId:     string
  linkedAt:   ISO string

whatsappLinks/{whatsappUserId}     ← Authoritative O(1) identity lookup (WhatsApp)
  businessId: string
  userId:     string
  linkedAt:   ISO string

businesses/{businessId}/members/{userId}
  telegramUserId:  string | null   ← shown in Settings UI
  whatsappUserId:  string | null   ← shown in Settings UI

businesses/{businessId}/expenses/{expenseId}
  source:      "telegram" | "whatsapp"
  submittedBy: userId
  ...          (all standard expense fields)
```

**Why two separate top-level lookup collections?**

The `telegramLinks` and `whatsappLinks` top-level collections allow each incoming bot message to resolve the sender's `businessId` and `userId` with a **single document read (O(1))**, regardless of how many businesses or members exist. Without them, each webhook call would require a collection-group query scanning all `members` subcollections across every workspace — an O(n) scan that degrades as the platform grows.

---

## Part 6 — Security

| Concern | How it's handled |
|---|---|
| Bot token exposure | Stored as Firebase Secret (`TELEGRAM_BOT_TOKEN`), never in code or committed `.env` files |
| WhatsApp access token | Stored as Firebase Secret (`WHATSAPP_ACCESS_TOKEN`) |
| WhatsApp webhook verification | Verify-token handshake on `GET` before Meta starts sending `POST` messages |
| Firestore access | `telegramLinks` and `whatsappLinks` are **blocked** to client reads/writes (`allow read, write: if false;`) — only Cloud Functions (Admin SDK) can write to them |
| Link code expiry | 24-hour TTL, single-use — expired or used codes are rejected |
| Unlinked sender | Messages from unlinked accounts are silently dropped or answered with link instructions |
| AI key exposure | `GEMINI_API_KEY` bound to functions at deploy time — never returned to client browsers |

---

## Part 7 — Environment Variables & Secrets Summary

| Secret name | How to set | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `firebase functions:secrets:set TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `WHATSAPP_ACCESS_TOKEN` | `firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN` | Meta permanent system user token |
| `WHATSAPP_VERIFY_TOKEN` | `firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN` | Any random string for Meta webhook verification |
| `GEMINI_API_KEY` | `firebase functions:secrets:set GEMINI_API_KEY` | Google Gemini Vision AI key for OCR extraction |

---

## Part 8 — Deployment Checklist

### Telegram

- [ ] Created bot via @BotFather and copied token
- [ ] Stored token: `firebase functions:secrets:set TELEGRAM_BOT_TOKEN`
- [ ] Deployed function: `firebase deploy --only functions:telegramWebhook`
- [ ] Registered webhook: `curl -X POST https://api.telegram.org/botTOKEN/setWebhook -d url=FUNCTION_URL`
- [ ] Verified webhook: `curl https://api.telegram.org/botTOKEN/getWebhookInfo`
- [ ] Tested linking: generated code in app → sent `/link CODE` to bot → received confirmation
- [ ] Tested expense: sent a receipt photo to the bot → expense appeared in workspace feed

### WhatsApp

- [ ] Created Meta Developer app with WhatsApp product
- [ ] Stored secrets: `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_VERIFY_TOKEN`
- [ ] Deployed function: `firebase deploy --only functions:whatsappWebhook`
- [ ] Registered webhook in Meta dashboard (Callback URL + Verify Token)
- [ ] Subscribed to `messages` webhook field in Meta dashboard
- [ ] (Production) Verified business phone number in Meta
- [ ] Tested linking: generated code in app → sent `/link CODE` to WhatsApp number → received confirmation
- [ ] Tested expense: sent a receipt photo → expense appeared in workspace feed

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/link` returns "Invalid or expired code" | Code was already used or > 24 hours old | Generate a new code from Settings |
| Bot doesn't respond at all | Webhook not registered or URL is wrong | Re-run `setWebhook` with the correct function URL |
| "Could not find active workspace" | User is not in any `members` subcollection | Ensure the user has completed onboarding and joined a workspace |
| WhatsApp webhook verification fails | Verify token mismatch | Ensure `WHATSAPP_VERIFY_TOKEN` secret matches exactly what was entered in Meta dashboard |
| Receipt scan returns no data / generic values | Image too blurry, or Gemini quota reached | Ask user to retake photo; check Gemini API quota in GCP console |
| Expense doesn't appear in feed | Firestore write failed silently | Check Cloud Function logs: `firebase functions:log --only telegramWebhook` |
| WhatsApp messages not received during dev | Test number whitelist not configured | Add tester phone numbers in Meta → WhatsApp → API Setup → To |
