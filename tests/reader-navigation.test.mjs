import assert from "node:assert/strict";
import test from "node:test";
import {
  focusTargetFor,
  planStoryOpening,
  shouldClearReviewMarker,
} from "../lib/reader-navigation.ts";

test("opening an understood hidden story clears the filter and restores a dismissed story", () => {
  assert.deepEqual(planStoryOpening({ muted: true, understood: true }, true), {
    hideUnderstood: false,
    patch: { expanded: true, muted: false, revising: false },
  });
});

test("opening a visible unread story preserves the understood filter", () => {
  assert.deepEqual(
    planStoryOpening({ muted: false, understood: false }, true, true),
    {
      hideUnderstood: true,
      patch: { expanded: true, muted: false, revising: true },
    },
  );
});

test("destinations resolve to stable focus targets", () => {
  assert.deepEqual(focusTargetFor({ kind: "story", targetId: "auth" }), {
    elementId: "story-auth",
  });
  assert.deepEqual(
    focusTargetFor({
      kind: "question",
      repository: "owner/repo",
      targetId: "expiry",
    }),
    { elementId: "question-expiry" },
  );
  assert.deepEqual(focusTargetFor({ kind: "repositories" }), {
    elementId: "repository-controls",
  });
  assert.deepEqual(
    focusTargetFor({
      kind: "area",
      repository: "owner/repo",
      targetId: "sessions",
    }),
    {
      detailsIds: ["area-sessions", "walkthrough-sessions"],
      elementId: "walkthrough-sessions",
    },
  );
});

test("canceling the final queued request clears its story marker", () => {
  const requests = [
    { _id: "cancel-me", status: "queued", storyId: "auth" },
    { _id: "other-story", status: "queued", storyId: "cache" },
  ];
  assert.equal(shouldClearReviewMarker(requests, "cancel-me"), true);
});

test("canceling one of several queued requests preserves the story marker", () => {
  const requests = [
    { _id: "cancel-me", status: "queued", storyId: "auth" },
    { _id: "newer", status: "queued", storyId: "auth" },
  ];
  assert.equal(shouldClearReviewMarker(requests, "cancel-me"), false);
  assert.equal(shouldClearReviewMarker(requests, "missing"), null);
});
