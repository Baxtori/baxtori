import assert from "node:assert/strict";
import test from "node:test";
import {
  activeWatchThreadFor,
  storyTopicSourceKey,
  storyWatchInput,
} from "../lib/story-topics.ts";

const firstEditionStory = {
  codeEvidence: [
    {
      baseCommit: "1234567",
      commit: "abcdef0",
      endLine: 24,
      path: "src/retries.ts",
      startLine: 10,
    },
  ],
  id: "edition-one-story",
  repository: "teamleaderleo/glimpse",
  title: "Retries explain themselves.",
  topicId: "retry-policy",
};

test("watch identity survives story IDs and repository aliases", () => {
  const laterStory = {
    ...firstEditionStory,
    id: "edition-two-follow-up",
    repository: "teamleaderleo/baxtori",
    title: "Retry exhaustion now closes cleanly.",
  };
  assert.equal(
    storyTopicSourceKey(firstEditionStory),
    "watch:Baxtori/baxtori:retry-policy",
  );
  assert.equal(
    storyTopicSourceKey(laterStory),
    storyTopicSourceKey(firstEditionStory),
  );
});

test("watch input preserves the exact originating evidence address", () => {
  assert.deepEqual(storyWatchInput(firstEditionStory, "2026-07-13"), {
    editionId: "2026-07-13",
    evidence: {
      baseCommit: "1234567",
      endLine: 24,
      headCommit: "abcdef0",
      path: "src/retries.ts",
      repository: "Baxtori/baxtori",
      startLine: 10,
    },
    origin: "watch",
    sourceKey: "watch:Baxtori/baxtori:retry-policy",
    storyId: "edition-one-story",
    storyTitle: "Retries explain themselves.",
    title: "Retries explain themselves.",
  });
});

test("watch input waits for an exact evidence excerpt", () => {
  assert.equal(storyWatchInput({ ...firstEditionStory, codeEvidence: [] }, "2026-07-13"), null);
});

test("active watch lookup ignores resolved and unrelated threads", () => {
  const active = {
    _id: "active",
    evidence: storyWatchInput(firstEditionStory, "2026-07-13").evidence,
    origin: "watch",
    sourceKey: "watch:Baxtori/baxtori:retry-policy",
    status: "active",
  };
  const resolved = { ...active, _id: "resolved", status: "resolved" };
  assert.equal(
    activeWatchThreadFor([resolved, active], firstEditionStory)?._id,
    "active",
  );
  assert.equal(activeWatchThreadFor([resolved], firstEditionStory), undefined);
});
