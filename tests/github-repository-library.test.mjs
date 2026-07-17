import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchGitHubRepositoryLibrary,
  GitHubRepositoryLibraryError,
} from "../lib/github-repository-library.ts";

function repository(id, overrides = {}) {
  return {
    archived: false,
    default_branch: "main",
    description: null,
    fork: false,
    full_name: `teamleaderleo/repository-${id}`,
    html_url: `https://github.com/teamleaderleo/repository-${id}`,
    id,
    language: "TypeScript",
    name: `repository-${id}`,
    open_issues_count: 0,
    private: true,
    pushed_at: `2026-07-${String(10 + id).padStart(2, "0")}T09:00:00Z`,
    updated_at: `2026-07-${String(10 + id).padStart(2, "0")}T09:00:00Z`,
    ...overrides,
  };
}

test("repository library follows pages and deduplicates repository IDs", async () => {
  const calls = [];
  const pages = [
    [repository(1), repository(2)],
    [repository(2, { full_name: "teamleaderleo/renamed" }), repository(3)],
    [],
  ];
  const result = await fetchGitHubRepositoryLibrary("token", {
    pageSize: 2,
    fetchImpl: async (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      calls.push(page);
      return Response.json(pages[page - 1]);
    },
  });

  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(result.pagesFetched, 3);
  assert.equal(result.repositories.length, 3);
  assert.equal(result.repositories.some((entry) => entry.fullName === "teamleaderleo/renamed"), true);
  assert.equal(result.truncated, false);
});

test("repository library reports an explicit page-window truncation", async () => {
  const result = await fetchGitHubRepositoryLibrary("token", {
    maxPages: 1,
    pageSize: 1,
    fetchImpl: async () => Response.json([repository(1)]),
  });
  assert.equal(result.truncated, true);
  assert.equal(result.pagesFetched, 1);
});

test("repository library preserves GitHub access failures", async () => {
  await assert.rejects(
    fetchGitHubRepositoryLibrary("token", {
      fetchImpl: async () => new Response("", { status: 403 }),
    }),
    (error) => error instanceof GitHubRepositoryLibraryError && error.status === 403,
  );
});
