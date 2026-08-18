/**
 * Browser QA: capture modals + extract API from the app origin.
 */
export default async function run(page, ui) {
  const seed = () => {
    const uid = "owner-demo";
    const user = {
      userId: uid,
      uid,
      role: "owner",
      displayName: "Demo Owner",
      email: "demo@snapsme.test"
    };
    localStorage.setItem("snapsme_current_user", JSON.stringify(user));
    localStorage.setItem(
      "snapsme_workspace",
      JSON.stringify({ id: "biz-demo", name: "Demo Workspace", currency: "USD", ownerUid: uid })
    );
    localStorage.setItem(
      "snapsme_categories",
      JSON.stringify([
        { id: "cat_ops", name: "Operations" },
        { id: "cat_meals", name: "Meals & Food" },
        { id: "cat_fuel", name: "Fuel & Transport" }
      ])
    );
    localStorage.setItem(
      "snapsme_members",
      JSON.stringify([{ userId: uid, role: "owner", displayName: "Demo Owner" }])
    );
    localStorage.setItem("snapsme_expenses", "[]");
    localStorage.setItem("snapsme_income", "[]");
    localStorage.setItem("snapsme_onboarding_completed", "true");
    localStorage.setItem("snapsme_onboarding_skipped", "true");
  };

  await page.addInitScript(seed);
  await page.evaluate(seed);
  await page.reload({ waitUntil: "networkidle" }).catch(() => page.reload({ waitUntil: "domcontentloaded" }));
  await page.waitForTimeout(2500);

  const out = {
    boot: await page.evaluate(() => (document.body.innerText || "").slice(0, 300)),
    steps: []
  };

  // API checks first (does not depend on UI)
  out.steps.push({
    apis: await page.evaluate(async () => {
      const health = await fetch("/api/health")
        .then(async (r) => ({ ok: r.ok, body: await r.json() }))
        .catch((e) => ({ ok: false, error: e.message }));
      const voice = await fetch("/api/extract-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "Paid 15 dollars at Uber" })
      })
        .then(async (r) => ({ ok: r.ok, body: await r.json() }))
        .catch((e) => ({ ok: false, error: e.message }));
      const incomeVoice = await fetch("/api/extract-income-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "Received 90 dollars from Blue Sky LLC" })
      })
        .then(async (r) => ({ ok: r.ok, body: await r.json() }))
        .catch((e) => ({ ok: false, error: e.message }));
      return { health, voice, incomeVoice };
    })
  });

  // Manual expense via UI if app booted past loading
  const booted = !/Loading SnapSME|Restoring session/i.test(out.boot);
  out.steps.push({ booted });

  if (booted) {
    await page.keyboard.press("Escape");
    await page.locator('button:has-text("Record Expense")').first().click({ force: true, timeout: 10000 });
    await page.waitForTimeout(400);
    await page.locator('input[placeholder*="Shell Gas Station"]').fill("QA Cafe");
    await page.locator('input[placeholder="0.00"]').first().fill("19.50");
    await page.locator('button:has-text("Save Expense Entry")').click({ force: true });
    await page.waitForTimeout(700);

    out.steps.push({
      afterExpenseSave: await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("snapsme_expenses") || "[]");
        return {
          hasQACafe: stored.some((e) => e.vendor === "QA Cafe"),
          expenseCount: stored.length,
          source: stored[0]?.source || null
        };
      })
    });

    await page.locator('button:has-text("Add Income")').first().click({ force: true, timeout: 10000 });
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Acme"]').fill("QA Client");
    await page.locator('input[placeholder="0.00"]').first().fill("250");
    await page.locator('button:has-text("Save Income Entry")').click({ force: true });
    await page.waitForTimeout(700);

    out.steps.push({
      afterIncomeSave: await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("snapsme_income") || "[]");
        return {
          hasQAClient: stored.some((e) => e.source === "QA Client"),
          incomeCount: stored.length,
          origin: stored[0]?.origin || null
        };
      })
    });

    // Confirm modality tabs
    await page.locator('button:has-text("Record Expense")').first().click({ force: true });
    await page.waitForTimeout(300);
    out.steps.push({
      tabs: await page.evaluate(() => {
        const t = document.body.innerText || "";
        return {
          photo: /Photo|Scan|Upload|Camera/i.test(t),
          voice: /\bVoice\b/i.test(t),
          manual: /\bManual\b/i.test(t)
        };
      })
    });
  }

  out.ok =
    out.steps.some((s) => s.apis?.health?.ok && s.apis?.voice?.ok && s.apis?.incomeVoice?.ok) &&
    (!booted ||
      (out.steps.some((s) => s.afterExpenseSave?.hasQACafe) &&
        out.steps.some((s) => s.afterIncomeSave?.hasQAClient)));

  return out;
}
