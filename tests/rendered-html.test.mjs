import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
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

test("keeps GitHub credentials in an encrypted server session", async () => {
  const [page, authLibrary, callbackRoute, repositoriesRoute, activityRoute, envExample, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/github-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/github/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/github/repos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/github/activity/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /accessToken|GITHUB_CLIENT_SECRET|GITHUB_SESSION_SECRET/);
  assert.match(authLibrary, /AES-GCM/);
  assert.match(authLibrary, /HttpOnly; SameSite=Lax/);
  assert.match(callbackRoute, /sealSession/);
  assert.match(repositoriesRoute, /getGitHubSession/);
  assert.match(activityRoute, /getGitHubSession/);
  assert.match(envExample, /^GITHUB_CLIENT_ID=$/m);
  assert.match(envExample, /^GITHUB_CLIENT_SECRET=$/m);
  assert.match(envExample, /^GITHUB_APP_SLUG=$/m);
  assert.match(envExample, /^GITHUB_SESSION_SECRET=$/m);
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
});
