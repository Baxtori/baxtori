import assert from "node:assert/strict";
import test from "node:test";
import { buildFollowUpCandidates } from "../scripts/lib/follow-up-candidates.mjs";

const thread = {
  _id: "thread-1",
  areaId: "feedback-loop",
  evidence: {
    baseCommit: "1111111",
    endLine: 24,
    headCommit: "2222222",
    path: "convex/feedback.ts",
    repository: "teamleaderleo/glimpse",
    startLine: 10,
  },
  origin: "watch",
  sourceKey: "watch:teamleaderleo/baxtori:reader-review-loop",
  status: "active",
  title: "Reader review loop",
};

function commit(sha, path, date = "2026-07-16T00:00:00Z") {
  return {
    date,
    files: [{ path }],
    sha,
    shortSha: sha.slice(0, 7),
    subject: `Change ${path}`,
    url: `https://github.com/teamleaderleo/baxtori/commit/${sha}`,
  };
}

test("creates a strong candidate when a new commit changes the exact retained file", () => {
  const result = buildFollowUpCandidates({
    queuedQuestions: [{ _id: "question-1", threadId: "thread-1" }],
    repositories: [{
      commits: [
        commit("2222222", "convex/feedback.ts"),
        commit("3333333", "convex/feedback.ts"),
      ],
      fullName: "teamleaderleo/baxtori",
    }],
    topicThreads: [thread],
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].matchStrength, "exact-path");
  assert.deepEqual(result.candidates[0].commits.map((item) => item.sha), ["3333333"]);
  assert.deepEqual(result.candidates[0].questionIds, ["question-1"]);
  assert.equal(result.candidates[0].readerFacing, false);
});

test("same filename in another directory remains outside candidates", () => {
  const result = buildFollowUpCandidates({
    repositories: [{
      commits: [commit("3333333", "archive/feedback.ts")],
      fullName: "teamleaderleo/baxtori",
    }],
    topicThreads: [thread],
  });

  assert.deepEqual(result.candidates, []);
  assert.equal(result.unmatchedThreads[0].reason, "no-related-collected-change");
});

test("explicit mapped-area impact creates a review candidate without claiming a conclusion", () => {
  const result = buildFollowUpCandidates({
    mapImpact: {
      affectedAreas: [{
        areaId: "feedback-loop",
        areaName: "Reader feedback loop",
        changedFiles: ["scripts/export-feedback.mjs"],
        commits: [commit("4444444", "scripts/export-feedback.mjs")],
        repository: "teamleaderleo/baxtori",
      }],
    },
    repositories: [{ commits: [], fullName: "teamleaderleo/baxtori" }],
    topicThreads: [thread],
  });

  assert.equal(result.candidates[0].matchStrength, "mapped-area");
  assert.equal(result.candidates[0].needsReview, true);
  assert.deepEqual(result.candidates[0].changedFiles, ["scripts/export-feedback.mjs"]);
});

test("mapped-area matching requires the thread to name that area", () => {
  const result = buildFollowUpCandidates({
    mapImpact: {
      affectedAreas: [{
        areaId: "feedback-loop",
        areaName: "Reader feedback loop",
        changedFiles: ["scripts/export-feedback.mjs"],
        commits: [commit("4444444", "scripts/export-feedback.mjs")],
        repository: "teamleaderleo/baxtori",
      }],
    },
    repositories: [{ commits: [], fullName: "teamleaderleo/baxtori" }],
    topicThreads: [{ ...thread, areaId: undefined }],
  });

  assert.deepEqual(result.candidates, []);
});

test("reports active topics whose repositories were outside collection", () => {
  const result = buildFollowUpCandidates({ topicThreads: [thread] });
  assert.equal(result.unmatchedThreads[0].reason, "repository-not-collected");
  assert.equal(result.unmatchedThreads[0].repository, "Baxtori/baxtori");
});
