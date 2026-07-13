import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Baxtori briefing", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Baxtori — The backstory behind your code<\/title>/i);
  assert.match(html, /Opening your code backstory/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps GitHub credentials and feedback storage behind the server session", async () => {
  const [page, authLibrary, callbackRoute, repositoriesRoute, activityRoute, diffRoute, feedbackStateRoute, feedbackReviewsRoute, feedbackStore, envExample, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/github-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/github/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/github/repos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/github/activity/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/github/diff/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/feedback/state/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/feedback/reviews/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/feedback-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /accessToken|GITHUB_CLIENT_SECRET|GITHUB_SESSION_SECRET/);
  assert.match(authLibrary, /AES-GCM/);
  assert.match(authLibrary, /HttpOnly; SameSite=Lax/);
  assert.match(callbackRoute, /sealSession/);
  assert.match(repositoriesRoute, /getGitHubSession/);
  assert.match(activityRoute, /getGitHubSession/);
  assert.match(diffRoute, /getGitHubSession/);
  assert.match(feedbackStateRoute, /getGitHubSession/);
  assert.match(feedbackReviewsRoute, /getGitHubSession/);
  assert.match(feedbackStore, /FEEDBACK_API_SECRET/);
  assert.doesNotMatch(page, /FEEDBACK_API_SECRET|CONVEX_URL|ConvexHttpClient/);
  assert.match(envExample, /^GITHUB_CLIENT_ID=$/m);
  assert.match(envExample, /^GITHUB_CLIENT_SECRET=$/m);
  assert.match(envExample, /^GITHUB_APP_SLUG=$/m);
  assert.match(envExample, /^GITHUB_SESSION_SECRET=$/m);
  assert.match(envExample, /^CONVEX_URL=$/m);
  assert.match(envExample, /^FEEDBACK_API_SECRET=$/m);
  assert.match(envExample, /^FEEDBACK_GITHUB_LOGIN=$/m);
  assert.doesNotMatch(envExample, /GITHUB_TOKEN/);
  assert.doesNotMatch(hosting, /token|secret|github/i);
});

test("requires GitHub authentication before repository access", async () => {
  const statusResponse = await render("/api/auth/github/status");
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.deepEqual(status, {
    appSlug: null,
    authenticated: false,
    configured: false,
    user: null,
  });

  const repositoriesResponse = await render("/api/github/repos");
  assert.equal(repositoriesResponse.status, 401);

  const diffResponse = await render("/api/github/diff");
  assert.equal(diffResponse.status, 401);

  const feedbackStateResponse = await render("/api/feedback/state");
  assert.equal(feedbackStateResponse.status, 401);

  const reviewQueueResponse = await render("/api/feedback/reviews", { method: "POST" });
  assert.equal(reviewQueueResponse.status, 401);
});
