export default async function run(page, ui) {
  await page.evaluate(() => {
    const uid = "owner-demo";
    const user = {
      userId: uid,
      uid,
      role: "owner",
      displayName: "Demo Owner",
      email: "demo@snapsme.test"
    };
    const now = new Date().toISOString();
    localStorage.setItem("snapsme_current_user", JSON.stringify(user));
    localStorage.setItem(
      "snapsme_workspace",
      JSON.stringify({
        id: "biz-demo",
        name: "Demo Workspace",
        currency: "USD",
        ownerUid: uid
      })
    );
    localStorage.setItem("snapsme_onboarding_completed", "true");
    localStorage.setItem("snapsme_onboarding_skipped", "true");
    localStorage.setItem(
      "snapsme_categories",
      JSON.stringify([
        { id: "cat_ops", name: "Operations" },
        { id: "cat_mkt", name: "Marketing" }
      ])
    );
    localStorage.setItem(
      "snapsme_members",
      JSON.stringify([{ userId: uid, role: "owner", displayName: "Demo Owner" }])
    );
    localStorage.setItem(
      "snapsme_expenses",
      JSON.stringify([
        {
          id: "exp1",
          vendor: "Office Depot",
          amount: 42.5,
          date: "2026-08-10",
          categoryId: "cat_ops",
          categoryName: "Operations",
          moneyMovement: "company_card",
          submittedBy: uid,
          submittedByName: "Demo Owner",
          currency: "USD",
          createdAt: now,
          syncStatus: "synced",
          deletedAt: now
        },
        {
          id: "exp2",
          vendor: "Meta Ads",
          amount: 120,
          date: "2026-08-12",
          categoryId: "cat_mkt",
          categoryName: "Marketing",
          moneyMovement: "personal_reimbursement",
          submittedBy: uid,
          submittedByName: "Demo Owner",
          currency: "USD",
          createdAt: now,
          syncStatus: "synced"
        }
      ])
    );
    localStorage.setItem(
      "snapsme_income",
      JSON.stringify([
        {
          id: "inc1",
          source: "Client Retainer",
          amount: 500,
          date: "2026-08-11",
          submittedBy: uid,
          submittedByName: "Demo Owner",
          currency: "USD",
          createdAt: now,
          origin: "manual"
        }
      ])
    );
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const out = {};

  // Trash view
  const trashBtn = page.getByRole("button", { name: /Open trash/i });
  if (await trashBtn.count()) {
    await trashBtn.click();
    await page.waitForTimeout(500);
    out.trash = await page.evaluate(() => {
      const t = document.body.innerText || "";
      return {
        hasOffice: t.includes("Office Depot"),
        hasRestore: /Restore/i.test(t),
        hasEmpty: /Empty trash|Delete forever|Permanently/i.test(t)
      };
    });
  }

  // Back to feed then Control Centre for Spend by Money Movement
  const dashBtn = page.getByRole("button", { name: /Control Centre|Open the Financial/i }).first();
  if (await dashBtn.count()) {
    await dashBtn.click();
    await page.waitForTimeout(800);
    out.dashboard = await page.evaluate(() => {
      const t = document.body.innerText || "";
      return {
        hasMoneyMovement: t.includes("Spend by Money Movement"),
        hasCompanyCard: /Company Card/i.test(t),
        hasReimburse: /Personal Reimbursement/i.test(t)
      };
    });
  }

  // Desktop nav uses buttons; mobile uses a select. Prefer visible Income button.
  const incomeBtn = page.getByRole("button", { name: /^Income/i }).first();
  if (await incomeBtn.isVisible().catch(() => false)) {
    await incomeBtn.click();
    await page.waitForTimeout(700);
  } else {
    await page.locator("#mobile-app-view-select").selectOption("income", { force: true });
    await page.waitForTimeout(700);
  }

  out.incomeView = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return {
      hasRetainer: t.includes("Client Retainer"),
      hasSort: t.includes("Sort:") || /Sort by/i.test(t),
      hasSelect: /\bSelect\b/.test(t),
      sample: t.slice(0, 400)
    };
  });

  out.ok =
    Boolean(out.trash?.hasOffice && out.trash?.hasRestore) &&
    Boolean(out.dashboard?.hasMoneyMovement) &&
    Boolean(out.incomeView?.hasRetainer);

  return out;
}
