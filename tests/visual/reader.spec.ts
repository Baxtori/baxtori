import { expect, test, type Page, type TestInfo } from "@playwright/test";

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ animations: "disabled", fullPage: true, path });
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
  await capture(page, testInfo, "published-briefing");

  await page.getByRole("button", { name: "Open backstory" }).first().click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  expect(errors).toEqual([]);
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
