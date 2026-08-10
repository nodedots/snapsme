import dotenv from "dotenv";
import https from "node:https";
import process from "node:process";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const action = process.argv[2];
const param = process.argv[3];

if (!token || token.includes("YOUR_TELEGRAM_BOT_TOKEN")) {
  console.error("\n❌ Error: TELEGRAM_BOT_TOKEN is not configured in .env file.");
  console.error("Please edit .env and set a valid bot token from @BotFather on Telegram.\n");
  process.exit(1);
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse JSON response: " + data));
        }
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function getBotStatus() {
  console.log("\n🔍 Checking Telegram Bot configuration...\n");
  try {
    // 1. Verify Bot Token via getMe
    const meData = await requestJson(`https://api.telegram.org/bot${token}/getMe`);

    if (!meData.ok) {
      console.error("❌ Bot Token Verification Failed!");
      console.error(`   Reason: ${meData.description} (Error Code: ${meData.error_code})`);
      console.error("\n👉 How to fix:");
      console.error("1. Open Telegram and chat with @BotFather");
      console.error("2. Send /newbot (or /token for existing bot) to generate a valid bot token");
      console.error("3. Paste the new token into .env as TELEGRAM_BOT_TOKEN=<YOUR_NEW_TOKEN>\n");
      return;
    }

    console.log("✅ Bot Verified successfully!");
    console.log(`   • Name:     ${meData.result.first_name}`);
    console.log(`   • Username: @${meData.result.username}`);
    console.log(`   • Bot ID:   ${meData.result.id}\n`);

    // 2. Check Webhook Info
    const hookData = await requestJson(`https://api.telegram.org/bot${token}/getWebhookInfo`);

    if (hookData.ok) {
      console.log("📡 Webhook Status:");
      console.log(`   • Registered URL:      ${hookData.result.url || "(None set)"}`);
      console.log(`   • Pending Update Count: ${hookData.result.pending_update_count}`);
      if (hookData.result.last_error_message) {
        console.log(`   • Last Error Date:     ${new Date(hookData.result.last_error_date * 1000).toLocaleString()}`);
        console.log(`   • Last Error Message:  ${hookData.result.last_error_message}`);
      }
    } else {
      console.error("⚠️ Could not retrieve webhook status:", hookData.description);
    }
  } catch (err) {
    console.error("❌ Network or API error:", err.message);
  }
}

async function setWebhook(url) {
  if (!url) {
    console.error("\n❌ Error: Missing webhook URL argument.");
    console.error("Usage: node scripts/telegram-setup.js set-webhook <FUNCTION_URL>\n");
    process.exit(1);
  }

  console.log(`\n🔗 Registering Telegram Webhook to URL: ${url}...\n`);
  try {
    const postData = new URLSearchParams({ url }).toString();
    const data = await requestJson(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData)
      },
      body: postData
    });

    if (data.ok) {
      console.log("✅ Webhook registered successfully!");
      console.log(`Response: ${JSON.stringify(data)}\n`);
    } else {
      console.error("❌ Failed to set webhook!");
      console.error(`Reason: ${data.description} (Error Code: ${data.error_code})\n`);
    }
  } catch (err) {
    console.error("❌ Error registering webhook:", err.message);
  }
}

if (action === "set-webhook" || action === "setWebhook") {
  setWebhook(param);
} else {
  getBotStatus();
}
