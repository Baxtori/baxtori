import assert from "node:assert/strict";
import test from "node:test";
import { buildEditionHistory, filterEditionHistory } from "../lib/edition-history.ts";

const current = {
  generatedAt: "2026-07-14T00:00:00Z",
  id: "2026-07-14",
  periodEnd: "2026-07-14",
  periodStart: "2026-07-07",
  stories: [{
    id: "reader-loop",
    project: "baxtori",
    repository: "teamleaderleo/baxtori",
    title: "Reader choices constrain review",
    topicId: "reader-review-loop",
  }],
};

const legacyCopy = {
  ...current,
  stories: [{
    ...current.stories[0],
    project: "glimpse",
    repository: "teamleaderleo/glimpse",
    title: "Legacy title that must not win",
  }],
};

const older = {
  generatedAt: "2026-07-07T00:00:00Z",
  id: "2026-07-07",
  periodEnd: "2026-07-07",
  periodStart: "2026-06-30",
  stories: [{
    id: "auth-boundary",
    project: "ourchival",
    repository: "teamleaderleo/ourchival",
    title: "Authentication has one boundary",
    topicId: "auth-boundary",
  }],
};

test("builds a newest-first index without duplicating archived copies", () => {
  const history = buildEditionHistory([current, legacyCopy, older]);

  assert.deepEqual(history.map((entry) => entry.story.title), [
    "Reader choices constrain review",
    "Authentication has one boundary",
  ]);
  assert.equal(history[0].edition, current);
  assert.equal(history[0].story, current.stories[0]);
});

test("canonicalizes legacy repository filters without rewriting evidence", () => {
  const distinctLegacyEdition = { ...legacyCopy, id: "2026-07-13" };
  const history = buildEditionHistory([distinctLegacyEdition]);
  const matches = filterEditionHistory(history, {
    repository: "teamleaderleo/baxtori",
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].repository, "teamleaderleo/baxtori");
  assert.equal(matches[0].story.repository, "teamleaderleo/glimpse");
});

test("filters history by repository, topic, and normalized search text", () => {
  const history = buildEditionHistory([current, older]);

  assert.deepEqual(
    filterEditionHistory(history, { query: "  AUTHENTICATION " }).map((entry) => entry.story.id),
    ["auth-boundary"],
  );
  assert.deepEqual(
    filterEditionHistory(history, { topicId: "reader-review-loop" }).map((entry) => entry.story.id),
    ["reader-loop"],
  );
  assert.deepEqual(
    filterEditionHistory(history, { repository: "teamleaderleo/ourchival" }).map((entry) => entry.story.id),
    ["auth-boundary"],
  );
  assert.deepEqual(
    filterEditionHistory(history, { since: "2026-07-08" }).map((entry) => entry.story.id),
    ["reader-loop"],
  );
});
