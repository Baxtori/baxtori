import type { BrowserContext } from "@playwright/test";
import { sealSession, SESSION_COOKIE } from "../../lib/github-auth";

export const VISUAL_GITHUB_ENV = {
  GITHUB_CLIENT_ID: "playwright-client",
  GITHUB_CLIENT_SECRET: "playwright-client-secret",
  GITHUB_SESSION_SECRET: "baxtori-playwright-session-secret-2026",
  PLAYWRIGHT_VISUAL_AUTH: "1",
};

export async function authenticateVisualReader(context: BrowserContext) {
  process.env.GITHUB_SESSION_SECRET = VISUAL_GITHUB_ENV.GITHUB_SESSION_SECRET;
  const value = await sealSession({
    accessToken: "playwright-access-token",
    user: { avatarUrl: "", id: 42, login: "reader", name: "Reader" },
  });
  await context.addCookies([{
    httpOnly: true,
    name: SESSION_COOKIE,
    sameSite: "Lax",
    url: "http://127.0.0.1:4173",
    value,
  }]);
}
