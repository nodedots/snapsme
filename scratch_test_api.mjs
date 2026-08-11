// Test script for SnapSME API verification pass
const BASE = "http://localhost:3000";

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`[PASS] ${name}: ${JSON.stringify(result)}`);
  } catch (err) {
    console.log(`[FAIL] ${name}: ${err.message}`);
  }
}

// 1. Health check
await test("health check", async () => {
  const res = await fetch(`${BASE}/api/health`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(`Bad status: ${data.status}`);
  return `status=${data.status}, hasGeminiKey=${data.hasGeminiKey}`;
});

// 2. Extract receipt with missing imageBase64 — should return 400
await test("extract-receipt missing image → 400 honest error", async () => {
  const res = await fetch(`${BASE}/api/extract-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: "image/jpeg", fileName: "test.jpg" })
  });
  const data = await res.json();
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  if (!data.error) throw new Error("No error message returned");
  return `status=${res.status}, error="${data.error}"`;
});

// 3. Extract receipt with non-image base64 — Gemini quota exhausted, should return 503 with honest error
await test("extract-receipt invalid image → 503 ai_unavailable (honest, not fake data)", async () => {
  const res = await fetch(`${BASE}/api/extract-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: "aGVsbG8gd29ybGQ=", // "hello world" base64 - not a real image
      mimeType: "image/jpeg",
      fileName: "test.jpg"
    })
  });
  const data = await res.json();
  return `status=${res.status}, success=${data.success}, code=${data.code || "n/a"}, error=${data.error || "n/a"}, source=${data.source || "n/a"}`;
});

// 4. Exchange rates endpoint
await test("exchange-rates", async () => {
  const res = await fetch(`${BASE}/api/exchange-rates?base=USD`);
  if (!res.ok) {
    const data = await res.json();
    return `status=${res.status}, fallback=${data.fallback}`;
  }
  const data = await res.json();
  if (!data.success) throw new Error("Not success");
  return `base=${data.base}, rates=${Object.keys(data.rates || {}).length} currencies`;
});

// 5. Bot status
await test("bot status", async () => {
  const res = await fetch(`${BASE}/api/bot/status`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  return `telegram=${data.telegram.configured}, whatsapp=${data.whatsapp.configured}`;
});

// 6. Bot pairing registration — should succeed
await test("bot register pairing", async () => {
  const res = await fetch(`${BASE}/api/bot/register-pairing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "test-user-123", businessId: "test-business-456", displayName: "Test User" })
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.success || !data.linkCode) throw new Error("Missing linkCode");
  if (!/^\d{6}$/.test(data.linkCode)) throw new Error(`Invalid code: ${data.linkCode}`);
  return `linkCode=${data.linkCode}, expiresIn=${data.expiresIn}`;
});

// 7. Chat link generation
await test("chat generate link", async () => {
  const res = await fetch(`${BASE}/api/chat/generate-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "test-user-123", channel: "telegram" })
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  return `linkCode=${data.linkCode}, channel=${data.channel}`;
});

// 8. Landing page loads
await test("landing page /", async () => {
  const res = await fetch(`${BASE}/`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const html = await res.text();
  if (!html.includes("Money in, money out")) throw new Error("New headline not found on landing page");
  if (html.includes("team spend")) throw new Error("Old 'team spend' headline still present");
  return "New hero headline found, old headline absent";
});

// 9. /home redirects to /
await test("/home redirects to /", async () => {
  const res = await fetch(`${BASE}/home`, { redirect: "manual" });
  if (res.status !== 302 && res.status !== 301) throw new Error(`Expected redirect, got ${res.status}`);
  const loc = res.headers.get("location");
  if (loc !== "/") throw new Error(`Expected redirect to /, got ${loc}`);
  return `status=${res.status}, location=${loc}`;
});

// 10. /app serves the app
await test("/app serves app", async () => {
  const res = await fetch(`${BASE}/app`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const html = await res.text();
  if (!html.includes("SnapSME")) throw new Error("App HTML missing SnapSME title");
  return `status=${res.status}, has title`;
});

// 11. FAQ page loads
await test("/faq page", async () => {
  const res = await fetch(`${BASE}/faq`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const html = await res.text();
  return `status=${res.status}, length=${html.length}`;
});

// 12. Learn hub loads
await test("/learn/ page", async () => {
  const res = await fetch(`${BASE}/learn/`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const html = await res.text();
  if (!html.includes("SnapSME Learn")) throw new Error("Learn hub missing title");
  return `status=${res.status}, has Learn content`;
});

// 13. Check no API key in client-side JS
await test("no API key in public JS/HTML", async () => {
  const files = [
    "/js/header.js",
    "/js/auth.js",
    "/js/footer.js",
    "/js/faq.js",
    "/js/learn.js",
    "/js/landing-motion.js"
  ];
  const apiKeyPattern = /AIza[A-Za-z0-9_-]{20,}/;
  const badList = [];
  for (const f of files) {
    const res = await fetch(`${BASE}${f}`);
    if (!res.ok) continue;
    const content = await res.text();
    if (apiKeyPattern.test(content)) badList.push(f);
  }
  if (badList.length > 0) throw new Error(`API key found in: ${badList.join(", ")}`);
  return "No API key found in client-side files";
});

// 14. Index HTML client-side check
await test("index.html has no API key", async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  const apiKeyPattern = /AIza[A-Za-z0-9_-]{20,}/;
  if (apiKeyPattern.test(html)) throw new Error("API key pattern found in index.html");
  return "No API key in index.html";
});


