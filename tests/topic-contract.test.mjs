import assert from "node:assert/strict";
import test from "node:test";
import {
  parseEvidenceAddress,
  parseThreadQuestion,
  parseThreadQuestionUpdate,
  parseTopicThread,
  parseTopicThreadUpdate,
  selectCompilerTopicInput,
} from "../lib/topic-contract.ts";

const evidence = {
  baseCommit: "1234567",
  endLine: 42,
  headCommit: "abcdef0",
  path: "src/retries/classify.ts",
  repository: "teamleaderleo/glimpse",
  startLine: 20,
};

test("evidence addresses canonicalize repository aliases and preserve exact history", () => {
  assert.deepEqual(parseEvidenceAddress(evidence), {
    ...evidence,
    repository: "Baxtori/baxtori",
  });
});

test("evidence addresses reject traversal, invalid commits, and oversized ranges", () => {
  assert.throws(() => parseEvidenceAddress({ ...evidence, path: "../secrets" }), /path/i);
  assert.throws(() => parseEvidenceAddress({ ...evidence, headCommit: "main" }), /commit/i);
  assert.throws(() => parseEvidenceAddress({ ...evidence, endLine: 200 }), /range/i);
});

test("topic threads retain a stable source identity independent of an edition story ID", () => {
  const thread = parseTopicThread({
    areaId: "retry-policy",
    editionId: "2026-07-13",
    evidence,
    origin: "watch",
    sourceKey: "watch:retry-policy",
    storyId: "retry-story",
    storyTitle: "Retries explain themselves",
    title: "Retry exhaustion policy",
  });
  assert.equal(thread.sourceKey, "watch:retry-policy");
  assert.equal(thread.evidence.repository, "Baxtori/baxtori");
});

test("snoozed threads and questions require a wake date", () => {
  assert.throws(() => parseTopicThreadUpdate({ status: "snoozed", threadId: "thread" }), /snooze date/i);
  assert.throws(() => parseThreadQuestionUpdate({ questionId: "question", status: "snoozed" }), /snooze date/i);
  assert.deepEqual(parseTopicThreadUpdate({ snoozedUntil: 1_800_000_000_000, status: "snoozed", threadId: "thread" }), {
    snoozedUntil: 1_800_000_000_000,
    status: "snoozed",
    threadId: "thread",
  });
});

test("questions preserve their own evidence address and explicit compiler disposition", () => {
  const question = parseThreadQuestion({
    editionId: "2026-07-13",
    evidence,
    guidance: "Inspect the terminal retry path.",
    lensId: "failure-modes",
    question: "Can an exhausted retry remain queued?",
    reviewState: "queued",
    storyId: "retry-story",
    storyTitle: "Retries explain themselves",
    threadId: "thread-id",
  });
  assert.equal(question.reviewState, "queued");
  assert.equal(question.evidence.path, evidence.path);
  assert.throws(() => parseThreadQuestion({
    ...question,
    evidence,
    reviewState: "considered",
  }), /review state/i);
});

test("compiler input includes active watches and only explicitly queued open questions", () => {
  const threadEvidence = parseEvidenceAddress(evidence);
  const result = selectCompilerTopicInput(
    [
      { _id: "watch-thread", evidence: threadEvidence, origin: "watch", status: "active", title: "watch" },
      { _id: "queued-thread", evidence: threadEvidence, origin: "question", status: "active", title: "queued question topic" },
      { _id: "private-thread", evidence: threadEvidence, origin: "question", status: "active", title: "private question topic" },
      { _id: "snoozed-thread", evidence: threadEvidence, origin: "watch", status: "snoozed", title: "snoozed" },
      { _id: "resolved-thread", evidence: threadEvidence, origin: "watch", status: "resolved", title: "resolved" },
    ],
    [
      { evidence: threadEvidence, reviewState: "queued", status: "open", threadId: "queued-thread", title: "queued" },
      { evidence: threadEvidence, reviewState: "private", status: "open", threadId: "private-thread", title: "private" },
      { evidence: threadEvidence, reviewState: "queued", status: "resolved", threadId: "resolved-thread", title: "resolved" },
      { evidence: threadEvidence, reviewState: "considered", status: "open", threadId: "queued-thread", title: "considered" },
    ],
  );
  assert.deepEqual(result.activeThreads.map((thread) => thread.title), ["watch", "queued question topic"]);
  assert.deepEqual(result.queuedQuestions.map((question) => question.title), ["queued"]);
});
