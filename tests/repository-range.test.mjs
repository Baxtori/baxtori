import assert from "node:assert/strict";
import test from "node:test";
import {
  repositoryLogPlan,
  repositoryReviewCursor,
} from "../scripts/lib/repository-range.mjs";

const cursor = {
  reviewedAt: "2026-07-20T00:00:00.000Z",
  sha: "1111111111111111111111111111111111111111",
};

test("finds the newest full review cursor across repository aliases", () => {
  const maps = [{
    repository: "teamleaderleo/baxtori",
    reviews: [
      {
        reviewedAt: "2026-07-18T00:00:00.000Z",
        throughCommit: { sha: "2222222222222222222222222222222222222222" },
      },
      {
        reviewedAt: cursor.reviewedAt,
        throughCommit: { sha: cursor.sha },
      },
      {
        reviewedAt: "2026-07-21T00:00:00.000Z",
        throughCommit: { sha: "abcdef1" },
      },
    ],
  }];

  assert.deepEqual(repositoryReviewCursor(maps, "Baxtori/baxtori"), cursor);
});

test("uses the reviewed commit range when the cursor is still an ancestor", () => {
  assert.deepEqual(repositoryLogPlan({
    cursor,
    cursorAvailable: true,
    cursorIsAncestor: true,
    reviewRef: "origin/main",
    since: "2026-07-15T00:00:00.000Z",
  }), {
    baseSha: cursor.sha,
    historyRewritten: false,
    logTarget: `${cursor.sha}..origin/main`,
    mode: "review-cursor",
    reviewedAt: cursor.reviewedAt,
  });
});

test("records a history rewrite before falling back to a time window", () => {
  assert.deepEqual(repositoryLogPlan({
    cursor,
    cursorAvailable: true,
    cursorIsAncestor: false,
    reviewRef: "origin/main",
    since: "2026-07-15T00:00:00.000Z",
  }), {
    baseSha: cursor.sha,
    historyRewritten: true,
    logTarget: "origin/main",
    mode: "history-rewrite-fallback",
    reviewedAt: cursor.reviewedAt,
    since: "2026-07-15T00:00:00.000Z",
  });
});

test("uses the bounded time window when no reviewed cursor exists", () => {
  assert.deepEqual(repositoryLogPlan({
    cursor: null,
    cursorAvailable: false,
    cursorIsAncestor: false,
    reviewRef: "origin/main",
    since: "2026-07-15T00:00:00.000Z",
  }), {
    baseSha: null,
    historyRewritten: false,
    logTarget: "origin/main",
    mode: "time-window-fallback",
    reviewedAt: null,
    since: "2026-07-15T00:00:00.000Z",
  });
});
