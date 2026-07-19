import assert from "node:assert/strict";
import test from "node:test";
import { collectRepositoryActivitySnapshot } from "../lib/repository-activity-snapshot.ts";

function repository(fullName, overrides = {}) {
  return {
    archived: false,
    defaultBranch: "main",
    fork: false,
    fullName,
    id: Math.abs([...fullName].reduce((sum, character) => sum + character.charCodeAt(0), 0)),
    private: true,
    pushedAt: "2026-07-17T08:00:00Z",
    updatedAt: "2026-07-17T08:00:00Z",
    ...overrides,
  };
}

function commit(sha, message = `Commit ${sha}`) {
  return {
    author: { login: "leo" },
    commit: { author: { date: "2026-07-17T08:00:00Z", name: "Leo" }, message },
    html_url: `https://github.com/teamleaderleo/repository/commit/${sha}`,
    sha,
  };
}

test("pinned repositories are requested before automatic repositories", async () => {
  const calls = [];
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async (url) => {
      calls.push(new URL(url).pathname);
      return Response.json([commit(String(calls.length).repeat(40))]);
    },
    repositories: [repository("teamleaderleo/automatic"), repository("teamleaderleo/pinned")],
    repositoryModes: {
      "teamleaderleo/automatic": "automatic",
      "teamleaderleo/pinned": "pinned",
    },
    since: "2026-07-10T00:00:00Z",
  });

  assert.match(calls[0], /teamleaderleo\/pinned/);
  assert.equal(result.records[0].repository, "teamleaderleo/pinned");
  assert.equal(result.records[0].status, "active");
});

test("muted, archived, and stale repositories use no GitHub requests", async () => {
  let requests = 0;
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async () => {
      requests += 1;
      return Response.json([]);
    },
    repositories: [
      repository("teamleaderleo/muted"),
      repository("teamleaderleo/archived", { archived: true }),
      repository("teamleaderleo/stale", { pushedAt: "2026-06-01T00:00:00Z" }),
    ],
    repositoryModes: { "teamleaderleo/muted": "muted" },
    since: "2026-07-10T00:00:00Z",
  });

  assert.equal(requests, 0);
  assert.deepEqual(result.records.map((entry) => entry.status), ["quiet", "quiet", "quiet"]);
});

test("the request budget defers remaining active repositories", async () => {
  let requests = 0;
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async () => {
      requests += 1;
      return Response.json([]);
    },
    repositories: [repository("teamleaderleo/a"), repository("teamleaderleo/b"), repository("teamleaderleo/c")],
    repositoryModes: {},
    requestBudget: 2,
    since: "2026-07-10T00:00:00Z",
  });

  assert.equal(requests, 2);
  assert.equal(result.requestCount, 2);
  assert.equal(result.deferredCount, 1);
  assert.equal(result.records.find((entry) => entry.repository === "teamleaderleo/c")?.status, "deferred");
});

test("rate limiting stops later repository requests and records retry guidance", async () => {
  let requests = 0;
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async () => {
      requests += 1;
      return new Response("", {
        headers: {
          "retry-after": "120",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1784282520",
        },
        status: 429,
      });
    },
    now: Date.parse("2026-07-17T09:00:00Z"),
    repositories: [repository("teamleaderleo/a"), repository("teamleaderleo/b")],
    repositoryModes: {},
    since: "2026-07-10T00:00:00Z",
  });

  assert.equal(requests, 1);
  assert.equal(result.halted, true);
  assert.equal(result.rateLimit?.remaining, 0);
  assert.equal(result.rateLimit?.retryAt, "2026-07-17T09:02:00.000Z");
  assert.equal(result.records.find((entry) => entry.repository === "teamleaderleo/b")?.status, "deferred");
});

test("an inaccessible repository does not stop later repositories", async () => {
  let requests = 0;
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async () => {
      requests += 1;
      return requests === 1 ? new Response("", { status: 404 }) : Response.json([]);
    },
    repositories: [repository("teamleaderleo/a"), repository("teamleaderleo/b")],
    repositoryModes: {},
    since: "2026-07-10T00:00:00Z",
  });

  assert.equal(requests, 2);
  assert.equal(result.records.find((entry) => entry.repository === "teamleaderleo/a")?.status, "inaccessible");
  assert.equal(result.records.find((entry) => entry.repository === "teamleaderleo/b")?.status, "quiet");
});

test("commit metadata is bounded and never claims source evidence", async () => {
  const messages = Array.from({ length: 20 }, (_, index) => commit(String(index).padStart(40, "a"), `Subject ${index}\nbody`));
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async () => Response.json(messages, { headers: { link: '<next>; rel="next"' } }),
    repositories: [repository("teamleaderleo/active")],
    repositoryModes: {},
    since: "2026-07-10T00:00:00Z",
  });
  const active = result.records[0];
  assert.equal(active.commits.length, 20);
  assert.equal(active.commits[0].message.includes("\n"), false);
  assert.equal(active.truncated, true);
  assert.match(active.reason, /source evidence is still required/);
});
