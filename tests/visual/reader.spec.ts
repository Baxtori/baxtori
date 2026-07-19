import { expect, test, type Page, type TestInfo } from "@playwright/test";

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
  fullPage = true,
  animations: "allow" | "disabled" = "disabled",
) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ animations, fullPage, path });
  await testInfo.attach(name, { contentType: "image/png", path });
}

test("the public entrance explains the product before asking for trust", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Understand what you're becoming." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Explore the published review/ })).toBeVisible();
  await capture(page, testInfo, "public-entrance");
  expect(errors).toEqual([]);
});

test("the published demo exposes a calm briefing and exact evidence", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");

  await expect(page.getByRole("heading", { name: "What deserves attention." })).toBeVisible();
  await expect(page.getByText("Published demo · 3 repositories.")).toBeVisible();
  const attentionWindow = page.getByLabel("Your attention window");
  await expect(attentionWindow).toHaveValue("15");
  await attentionWindow.fill("30");
  await expect(page.getByText("30 minutes", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Your attention window")).toHaveValue("30");
  await capture(page, testInfo, "published-briefing");

  await page.getByRole("button", { name: "Open backstory" }).first().click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the trail turns the same review into a finite field journal", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1&reader=trail");

  const rachis = page.locator("[data-botanical-rachis]");
  const firstFrond = page.locator("[data-botanical-frond]").first();
  await expect(page.locator("[data-botanical-progress]")).toBeVisible();
  const openingRachisOffset = await rachis.evaluate((element) => Number.parseFloat(getComputedStyle(element).strokeDashoffset));
  const openingFrondOpacity = await firstFrond.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  await expect(page.getByRole("heading", { name: "Stay close to the code without living inside it." })).toBeVisible();
  await expect(page.getByRole("button", { name: /First on the trail/ })).toBeVisible();
  await page.getByRole("button", { name: /First on the trail/ }).click();

  await expect(page.getByRole("heading", { name: "Reader choices now constrain the next review." })).toBeVisible();
  await expect.poll(() => rachis.evaluate((element) => Number.parseFloat(getComputedStyle(element).strokeDashoffset))).toBeLessThan(openingRachisOffset);
  await expect.poll(() => firstFrond.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity))).toBeGreaterThan(openingFrondOpacity);
  await page.getByRole("button", { name: "Evidence", exact: true }).first().click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  await capture(page, testInfo, "field-journal-trail", true, "allow");

  await page.locator("#trail-end").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "You reached the end of this walk." })).toBeVisible();
  await expect(page.getByText("Quiet repositories")).toBeVisible();
  await expect(page.getByText("5 of 5")).toBeVisible();
  await capture(page, testInfo, "field-journal-clearing", false, "allow");
  expect(errors).toEqual([]);
});

test("the botanical trail becomes a complete static specimen with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1&reader=trail");

  const rachis = page.locator("[data-botanical-rachis]");
  const frond = page.locator("[data-botanical-frond]").first();
  await expect(rachis).toBeVisible();
  expect(await rachis.evaluate((element) => Number.parseFloat(getComputedStyle(element).strokeDashoffset))).toBe(0);
  expect(await frond.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity))).toBeGreaterThan(0.7);
});

test("memory makes a concern legible across real editions", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: /Memory/ }).click();

  await expect(page.getByRole("heading", { name: "3 archived editions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Longest living thread · 3 editions/ })).toBeVisible();
  await expect(page.getByText("Thread · 3 editions").first()).toBeVisible();
  await capture(page, testInfo, "working-memory");
  expect(errors).toEqual([]);
});
