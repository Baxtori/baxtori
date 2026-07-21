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

test("the published demo opens directly into the calm reading trail", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");

  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Baxtori navigation" })).toBeVisible();
  await expect(page.getByLabel("Attention window")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "In this edition" })).toBeVisible();
  await capture(page, testInfo, "published-briefing");

  await page.getByRole("list", { name: "In this edition" }).getByRole("button", { name: /Repository access and reader attention became explicit plans\./ }).click();
  await page.getByRole("button", { name: "Evidence", exact: true }).first().click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the default reader turns the review into a finite field journal", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");

  const progressSpecimen = page.locator("[data-botanical-progress]");
  const fernGrowth = () => progressSpecimen.evaluate((element) => Number(element.getAttribute("data-growth") ?? 0));
  const fernDash = () => progressSpecimen.evaluate((element) => Number(element.style.getPropertyValue("--fern-dash") || 1));
  await expect(progressSpecimen).toBeVisible();
  const progressBox = await progressSpecimen.boundingBox();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  expect(progressBox).not.toBeNull();
  expect(progressBox?.width ?? 0).toBeGreaterThanOrEqual(viewportWidth);
  const fernFrame = progressSpecimen.locator("[data-fern-frame]");
  const fernFrameBox = await fernFrame.boundingBox();
  expect(fernFrameBox).not.toBeNull();
  expect(fernFrameBox?.width ?? 0).toBeGreaterThanOrEqual(viewportWidth - 20);
  const fernPlate = progressSpecimen.locator("[data-botanical-plate]");
  await expect(fernPlate).toBeVisible();
  const fernBox = await fernPlate.boundingBox();
  expect(fernBox).not.toBeNull();
  expect(fernBox?.x ?? 0).toBeLessThan(0);
  expect(fernBox?.width ?? 0).toBeGreaterThan(viewportWidth * 0.7);
  const fernCenter = (fernBox?.x ?? 0) + (fernBox?.width ?? 0) / 2;
  expect(fernCenter).toBeLessThan(viewportWidth * (viewportWidth <= 760 ? 0.08 : 0.16));
  expect((fernBox?.x ?? 0) + (fernBox?.width ?? 0)).toBeGreaterThan(viewportWidth * 0.4);
  await expect(fernPlate.locator("image")).toHaveAttribute("href", "/botanical/fern-frond.webp");
  const navigation = page.getByRole("complementary", { name: "Baxtori navigation" });
  const navigationBox = await navigation.boundingBox();
  expect(navigationBox?.x ?? -1).toBe(0);
  const openingGrowth = await fernGrowth();
  const openingDash = await fernDash();
  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  await page.getByRole("list", { name: "In this edition" }).getByRole("button", { name: /Repository access and reader attention became explicit plans\./ }).click();

  await expect(page.getByRole("heading", { name: "Repository access and reader attention became explicit plans." })).toBeVisible();
  await expect(page.locator("[data-botanical-detail]")).toHaveCount(0);
  await expect.poll(fernGrowth).toBeGreaterThan(openingGrowth);
  await expect.poll(fernDash).toBeLessThan(openingDash);
  await page.getByRole("button", { name: "Evidence", exact: true }).first().click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  await capture(page, testInfo, "field-journal-trail", true, "allow");

  await page.locator("#trail-end").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Caught up." })).toBeVisible();
  await expect(page.getByText("Quiet repos")).toBeVisible();
  await expect(page.getByText("5 of 5")).toContainText("5 of 5");
  await capture(page, testInfo, "field-journal-clearing", false, "allow");
  const endGrowth = await fernGrowth();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await expect.poll(fernGrowth).toBeLessThan(endGrowth);
  expect(errors).toEqual([]);
});

test("the botanical trail becomes a complete static specimen with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1");

  const specimen = page.locator("[data-botanical-progress]");
  await expect(specimen).toBeVisible();
  await expect(specimen).toHaveAttribute("data-growth", "1.000");
  expect(await specimen.evaluate((element) => element.style.getPropertyValue("--fern-reveal"))).toBe("1.000");
  expect(await specimen.evaluate((element) => element.style.getPropertyValue("--fern-dash"))).toBe("0.000");
});

test("memory makes a concern legible across real editions", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");
  await page.getByLabel("Primary").getByRole("button", { name: "Memory", exact: true }).click();

  await expect(page.getByRole("heading", { name: "4 archived editions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Longest living thread · 3 editions/ })).toBeVisible();
  await expect(page.getByText("Thread · 3 editions").first()).toBeVisible();
  await capture(page, testInfo, "working-memory");
  expect(errors).toEqual([]);
});
