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

  const progressSpecimen = page.locator("[data-botanical-progress]");
  const fernGrowth = () => progressSpecimen.evaluate((element) => Number(element.getAttribute("data-growth") ?? 0));
  await expect(progressSpecimen).toBeVisible();
  const progressBox = await progressSpecimen.boundingBox();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  expect(progressBox).not.toBeNull();
  expect(progressBox?.width ?? 0).toBeGreaterThanOrEqual(viewportWidth);
  const fernPlate = page.locator("svg[data-botanical-plate]");
  await expect(fernPlate).toBeVisible();
  const fernBox = await fernPlate.boundingBox();
  expect(fernBox?.x ?? 0).toBeLessThan(0);
  expect(fernBox?.width ?? 0).toBeGreaterThan(viewportWidth * 0.75);
  await expect(page.locator("svg[data-botanical-bloom]")).toBeVisible();
  expect(await page.locator("[data-fern-pinna]").count()).toBeGreaterThan(20);
  expect(await page.locator("[data-bloom-petal]").count()).toBeGreaterThan(10);
  const openingGrowth = await fernGrowth();
  await expect(page.getByRole("heading", { name: "What changed." })).toBeVisible();
  await page.getByRole("button", { name: "Repository access and reader attention became explicit plans.", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Repository access and reader attention became explicit plans." })).toBeVisible();
  const storySpecimen = page.locator("[data-botanical-detail]").first();
  await expect(storySpecimen).toBeVisible();
  const storySpecimenBox = await storySpecimen.boundingBox();
  expect(storySpecimenBox).not.toBeNull();
  expect(storySpecimenBox?.width ?? 0).toBeGreaterThan(180);
  expect(storySpecimenBox?.height ?? 0).toBeGreaterThan(200);
  await expect.poll(fernGrowth).toBeGreaterThan(openingGrowth);
  await page.getByRole("button", { name: "Evidence", exact: true }).first().click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  await capture(page, testInfo, "field-journal-trail", true, "allow");

  await page.locator("#trail-end").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Caught up." })).toBeVisible();
  await expect(page.getByText("Quiet repos")).toBeVisible();
  await expect(page.getByText("5 of 5")).toBeVisible();
  await capture(page, testInfo, "field-journal-clearing", false, "allow");
  const endGrowth = await fernGrowth();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await expect.poll(fernGrowth).toBeLessThan(endGrowth);
  expect(errors).toEqual([]);
});

test("the botanical trail becomes a complete static specimen with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1&reader=trail");

  const specimen = page.locator("[data-botanical-progress]");
  await expect(specimen).toBeVisible();
  await expect(specimen).toHaveAttribute("data-growth", "1.000");
  expect(await page.locator("[data-fern-stem]").evaluate((element) => getComputedStyle(element).strokeDashoffset)).toBe("0px");
  expect(await page.locator("[data-bloom-petal]").first().evaluate((element) => getComputedStyle(element).scale)).toBe("1");
});

test("memory makes a concern legible across real editions", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: /Memory/ }).click();

  await expect(page.getByRole("heading", { name: "4 archived editions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Longest living thread · 3 editions/ })).toBeVisible();
  await expect(page.getByText("Thread · 3 editions").first()).toBeVisible();
  await capture(page, testInfo, "working-memory");
  expect(errors).toEqual([]);
});
