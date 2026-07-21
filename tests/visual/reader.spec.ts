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

async function waitForReader(page: Page) {
  await expect(page.locator("[data-reader-ready='true']")).toBeVisible();
}

test("the public home opens the published journal before asking for trust", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  await waitForReader(page);
  await capture(page, testInfo, "public-journal");
  expect(errors).toEqual([]);
});

test("the published demo opens directly into the calm reading trail", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");

  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  await waitForReader(page);
  await expect(page.getByRole("complementary", { name: "Baxtori navigation" })).toBeVisible();
  await expect(page.getByLabel("Attention window")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "In this edition" })).toBeVisible();
  await capture(page, testInfo, "published-briefing");

  await page.getByRole("list", { name: "In this edition" }).getByRole("button", { name: /Repository access and reader attention became explicit plans\./ }).click();
  await expect(page.getByRole("heading", { name: "Repository access and reader attention became explicit plans." })).toBeVisible();
  const evidence = page.getByRole("button", { name: "Evidence", exact: true }).first();
  await evidence.scrollIntoViewIfNeeded();
  await evidence.click();
  await expect(page.getByText("Code evidence 1/3")).toBeVisible();
  await expect(page.locator(".diff-line.is-addition").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("account hydration never exposes the retired dashboard", async ({ page }) => {
  await page.addInitScript(() => {
    const trackedWindow = window as unknown as { __sawRetiredReader: boolean };
    trackedWindow.__sawRetiredReader = false;
    const inspect = () => {
      if (document.body?.innerText.includes("What deserves attention.")) trackedWindow.__sawRetiredReader = true;
    };
    new MutationObserver(inspect).observe(document.documentElement, { childList: true, subtree: true });
  });
  await page.route("**/api/auth/github/status", (route) => route.fulfill({
    body: JSON.stringify({
      appSlug: "baxtori-test",
      authenticated: true,
      configured: true,
      user: { avatarUrl: "", id: 42, login: "reader", name: "Reader" },
    }),
    contentType: "application/json",
  }));
  await page.route("**/api/feedback/state", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      body: JSON.stringify({ configured: false, reviewRequests: [], revision: 0, state: null, threadQuestions: [], topicThreads: [] }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/github/repos", (route) => route.fulfill({
    body: JSON.stringify({ repositories: [], truncated: false }),
    contentType: "application/json",
  }));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  await waitForReader(page);
  await waitForReader(page);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => (window as unknown as { __sawRetiredReader: boolean }).__sawRetiredReader)).toBe(false);
  await expect(page.getByText("More", { exact: true })).toHaveCount(0);
});

test("repository modes persist and newly selected sources enter the system honestly", async ({ page }) => {
  const savedStates: Array<Record<string, unknown>> = [];
  const repository = {
    archived: false,
    defaultBranch: "main",
    description: "A newly connected personal repository",
    fork: false,
    fullName: "reader/new-garden",
    id: 991,
    language: "TypeScript",
    name: "new-garden",
    openIssues: 0,
    private: true,
    pushedAt: "2026-07-21T10:00:00Z",
    updatedAt: "2026-07-21T10:00:00Z",
    url: "https://github.com/reader/new-garden",
  };

  await page.route("**/api/auth/github/status", (route) => route.fulfill({
    body: JSON.stringify({
      appSlug: "baxtori-test",
      authenticated: true,
      configured: true,
      user: { avatarUrl: "", id: 42, login: "reader", name: "Reader" },
    }),
    contentType: "application/json",
  }));
  await page.route("**/api/feedback/state", async (route) => {
    if (route.request().method() === "PUT") {
      savedStates.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ body: JSON.stringify({ configured: true, revision: savedStates.length }), contentType: "application/json" });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ configured: true, reviewRequests: [], revision: 0, state: null, threadQuestions: [], topicThreads: [] }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/github/repos", (route) => route.fulfill({
    body: JSON.stringify({ inventorySaved: true, repositories: [repository], truncated: false }),
    contentType: "application/json",
  }));
  await page.route("**/api/github/activity?**", (route) => route.fulfill({
    body: JSON.stringify({ commits: [], repository: repository.fullName, truncated: false }),
    contentType: "application/json",
  }));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  const sourcesButton = page.locator("button:visible").filter({ hasText: "Sources" });
  await expect(sourcesButton).toHaveCount(1);
  await sourcesButton.click();
  const modeControl = page.getByRole("group", { name: `Review mode for ${repository.fullName}` }).first();
  await expect(modeControl).toBeVisible();
  await modeControl.getByRole("button", { name: "Pinned" }).click();

  await expect.poll(() => savedStates.some((state) =>
    (state.repositoryModes as Record<string, string> | undefined)?.[repository.fullName] === "pinned"
  )).toBe(true);
  await expect(page.getByText("Modes saved to account")).toBeVisible();

  await page.getByLabel("Primary").getByRole("button", { name: /^Now/ }).click();
  await page.getByLabel("Primary").getByRole("button", { name: "System", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Know the system." })).toBeVisible();
  await expect(page.getByRole("tab", { name: /new-garden Not mapped/ })).toBeVisible();
  await expect(page.getByText("No invented coverage.")).toBeVisible();
});

test("the default reader turns the review into a finite field journal", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");
  await waitForReader(page);

  const progressSpecimen = page.locator("[data-botanical-progress]");
  const fernGrowth = () => page.evaluate(() => {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return window.scrollY / range;
  });
  const fernStage = (index: number) => progressSpecimen.locator(`[data-fern-pinna='${index}']`).evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (transform === "none") return 1;
    return Number.parseFloat(transform.match(/matrix\(([^,]+)/)?.[1] ?? "0");
  });
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
  await expect(progressSpecimen).toHaveAttribute("data-growth-mode", /native-scroll|direct-scroll/);
  const fernBox = await fernPlate.boundingBox();
  expect(fernBox).not.toBeNull();
  expect(fernBox?.x ?? 0).toBeLessThan(0);
  expect(fernBox?.width ?? 0).toBeGreaterThan(viewportWidth * 0.7);
  const fernCenter = (fernBox?.x ?? 0) + (fernBox?.width ?? 0) / 2;
  expect(fernCenter).toBeLessThan(viewportWidth * (viewportWidth <= 760 ? 0.08 : 0.16));
  expect((fernBox?.x ?? 0) + (fernBox?.width ?? 0)).toBeGreaterThan(viewportWidth * 0.4);
  await expect(fernPlate.locator("image")).toHaveCount(1);
  await expect(fernPlate.locator("image")).toHaveAttribute("href", "/botanical/fern-frond.webp");
  await expect(fernPlate.locator("[data-fern-growth-stroke]")).toHaveCount(0);
  await expect(fernPlate.locator("[data-fern-pinna]")).toHaveCount(16);
  await expect(fernPlate.locator("#fern-growth-mask")).toHaveCount(1);
  await expect(fernPlate.locator("clipPath")).toHaveCount(0);
  await expect(fernPlate.locator("feGaussianBlur")).toHaveCount(0);
  await expect(fernPlate.locator("[data-fern-feather='outer']")).toHaveCount(16);
  await expect(fernPlate.locator("[data-fern-feather='inner']")).toHaveCount(16);
  await expect(fernPlate.locator("[data-fern-branchlet='lower-left']")).toHaveCount(1);
  await expect(fernPlate.locator("[data-fern-branchlet='crozier']")).toHaveCount(1);
  await expect(fernPlate.locator("[data-fern-pinna='0']")).toHaveAttribute(
    "style",
    /var\(--fern-stage-opacity-0, 0\.66\).*var\(--fern-stage-0, 0\.38\)/,
  );
  await expect(fernPlate.locator("[data-fern-pinna='15']")).toHaveAttribute(
    "style",
    /var\(--fern-stage-opacity-15, 0\).*var\(--fern-stage-15, 0\.08\)/,
  );
  const navigation = page.getByRole("complementary", { name: "Baxtori navigation" });
  const navigationBox = await navigation.boundingBox();
  expect(navigationBox?.x ?? -1).toBe(0);
  await expect(navigation.locator(".botanical-brand-mark svg")).toHaveCount(1);
  const openingGrowth = await fernGrowth();
  const openingLowerPinna = await fernStage(0);
  const openingMiddlePinna = await fernStage(3);
  await expect(page.getByRole("heading", { name: "Notes from the repositories." })).toBeVisible();
  await page.getByRole("list", { name: "In this edition" }).getByRole("button", { name: /Repository access and reader attention became explicit plans\./ }).click();

  await expect(page.getByRole("heading", { name: "Repository access and reader attention became explicit plans." })).toBeVisible();
  await expect(page.locator("[data-botanical-detail]")).toHaveCount(0);
  await expect.poll(fernGrowth).toBeGreaterThan(openingGrowth);
  await expect.poll(() => fernStage(0)).toBeGreaterThan(openingLowerPinna);
  await expect.poll(() => fernStage(3)).toBeGreaterThanOrEqual(openingMiddlePinna);
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
  await expect.poll(() => fernStage(15)).toBeGreaterThan(0.99);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await expect.poll(fernGrowth).toBeLessThan(endGrowth);
  expect(errors).toEqual([]);
});

test("the botanical trail becomes a complete static specimen with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1");
  await waitForReader(page);

  const specimen = page.locator("[data-botanical-progress]");
  await expect(specimen).toBeVisible();
  await expect(specimen).toHaveAttribute("data-growth", "1.000");
  await expect(specimen.locator("[data-fern-growth-stroke]")).toHaveCount(0);
  expect(Number(await specimen.evaluate((element) => element.style.getPropertyValue("--fern-stage-0")))).toBe(1);
  expect(Number(await specimen.evaluate((element) => element.style.getPropertyValue("--fern-stage-15")))).toBe(1);
});

test("memory makes a concern legible across real editions", async ({ page }, testInfo) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/?demo=1");
  await waitForReader(page);
  await page.getByLabel("Primary").getByRole("button", { name: "Memory", exact: true }).click();

  await expect(page.getByRole("heading", { name: "4 archived editions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Longest living thread · 3 editions/ })).toBeVisible();
  await expect(page.getByText("Thread · 3 editions").first()).toBeVisible();
  await capture(page, testInfo, "working-memory");
  expect(errors).toEqual([]);
});
