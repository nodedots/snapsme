/**
 * Browser QA for record management: seed local ledger, verify sort/edit/delete/bulk UI.
 */
export default async function run(page, ui) {
  const results = { steps: [] };

  const seed = await page.evaluate(() => {
    const uid = "owner-demo";
    const user = {
      userId: uid,
      uid,
      role: "owner",
      displayName: "Demo Owner",
      email: "demo@snapsme.test"
    };
    const workspace = {
      id: "biz-demo",
      name: "Demo Workspace",
      currency: "USD",
      ownerUid: uid
    };
    const categories = [
      { id: "cat_ops", name: "Operations" },
      { id: "cat_mkt", name: "Marketing" }
    ];
    const now = new Date().toISOString();
    const expenses = [
      {
        id: "exp1",
        vendor: "Office Depot",
        amount: 42.5,
        date: "2026-08-10",
        categoryId: "cat_ops",
        category: "cat_ops",
        categoryName: "Operations",
        moneyMovement: "company_card",
        submittedBy: uid,
        submittedByName: "Demo Owner",
        currency: "USD",
        createdAt: now,
        syncStatus: "synced"
      },
      {
        id: "exp2",
        vendor: "Meta Ads",
        amount: 120,
        date: "2026-08-12",
        categoryId: "cat_mkt",
        category: "cat_mkt",
        categoryName: "Marketing",
        moneyMovement: "personal_reimbursement",
        submittedBy: uid,
        submittedByName: "Demo Owner",
        currency: "USD",
        createdAt: now,
        syncStatus: "synced"
      },
      {
        id: "exp3",
        vendor: "Uber",
        amount: 18.75,
        date: "2026-08-15",
        categoryId: "cat_ops",
        category: "cat_ops",
        categoryName: "Operations",
        moneyMovement: "company_card",
        submittedBy: uid,
        submittedByName: "Demo Owner",
        currency: "USD",
        createdAt: now,
        syncStatus: "synced"
      }
    ];
    const income = [
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
      },
      {
        id: "inc2",
        source: "Walk-in Sale",
        amount: 75.25,
        date: "2026-08-14",
        submittedBy: uid,
        submittedByName: "Demo Owner",
        currency: "USD",
        createdAt: now,
        origin: "manual"
      }
    ];
    localStorage.setItem("snapsme_current_user", JSON.stringify(user));
    localStorage.setItem("snapsme_workspace", JSON.stringify(workspace));
    localStorage.setItem("snapsme_categories", JSON.stringify(categories));
    localStorage.setItem(
      "snapsme_members",
      JSON.stringify([
        {
          userId: uid,
          role: "owner",
          displayName: "Demo Owner",
          email: "demo@snapsme.test"
        }
      ])
    );
    localStorage.setItem("snapsme_expenses", JSON.stringify(expenses));
    localStorage.setItem("snapsme_income", JSON.stringify(income));
    localStorage.setItem("snapsme_onboarding_completed", "true");
    localStorage.setItem("snapsme_onboarding_skipped", "true");
    localStorage.removeItem("snapsme_currentUser"); // legacy typo key
    return { ok: true };
  });
  results.steps.push({ seed });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const afterSeed = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return {
      hasOffice: t.includes("Office Depot"),
      hasMeta: t.includes("Meta Ads"),
      hasUber: t.includes("Uber"),
      hasIncome: t.includes("Client Retainer") || t.includes("Walk-in Sale"),
      hasSort: t.includes("Sort:"),
      hasSelect: /\bSelect\b/.test(t),
      hasTrash: t.includes("Trash"),
      sample: t.slice(0, 900)
    };
  });
  results.steps.push({ afterSeed });

  // Open first expense detail if present
  let detailActions = null;
  if (afterSeed.hasOffice) {
    const snap = await ui.snapshot();
    results.steps.push({ snapPreview: snap.slice(0, 1500) });

    // Click a row title / card containing Office Depot via text
    const office = page.getByText("Office Depot").first();
    if (await office.count()) {
      await office.click();
      await page.waitForTimeout(400);
      const detailText = await page.evaluate(() => document.body.innerText || "");
      detailActions = {
        hasEdit: detailText.includes("Edit Record"),
        hasTrashAction:
          detailText.includes("Move to Trash") || detailText.includes("Delete Forever"),
        hasClose: detailText.includes("Close Details")
      };
      // Close details if open
      const closeBtn = page.getByRole("button", { name: /Close Details/i });
      if (await closeBtn.count()) await closeBtn.click();
    }
  }
  results.steps.push({ detailActions });

  // Try edit pencil via title attribute
  let editModal = null;
  const editBtn = page.locator('button[title="Edit expense"], button[title="Edit income"]').first();
  if (await editBtn.count()) {
    await editBtn.click();
    await page.waitForTimeout(400);
    const modalText = await page.evaluate(() => document.body.innerText || "");
    editModal = {
      opened:
        modalText.includes("Edit expense") ||
        modalText.includes("Edit income") ||
        modalText.includes("Vendor / Merchant")
    };
    const cancel = page.getByRole("button", { name: /Close|Cancel/i }).first();
    if (await cancel.count()) await cancel.click();
  }
  results.steps.push({ editModal });

  // Soft-delete first trash icon
  let softDelete = null;
  const trashBtn = page.locator('button[title="Move to trash"]').first();
  if (await trashBtn.count()) {
    await trashBtn.click();
    await page.waitForTimeout(500);
    softDelete = await page.evaluate(() => {
      const t = document.body.innerText || "";
      return {
        hasUndo: t.includes("Moved") && t.includes("Trash"),
        hasUndoBtn: /Undo/i.test(t)
      };
    });
  }
  results.steps.push({ softDelete });

  // Select mode
  let selectMode = null;
  const selectBtn = page.getByRole("button", { name: /^Select$/i });
  if (await selectBtn.count()) {
    await selectBtn.click();
    await page.waitForTimeout(300);
    selectMode = await page.evaluate(() => {
      const t = document.body.innerText || "";
      return {
        cancelSelect: t.includes("Cancel select"),
        recategorize: /Recategor|category/i.test(t),
        moneyMovement: /Money Movement|company.?card/i.test(t),
        moveToTrash: t.includes("Move to trash") || t.includes("trash")
      };
    });
  }
  results.steps.push({ selectMode });

  results.ok =
    afterSeed.hasOffice &&
    afterSeed.hasSort &&
    (!detailActions || (detailActions.hasEdit && detailActions.hasTrashAction));

  return results;
}
