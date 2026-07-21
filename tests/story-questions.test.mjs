import assert from "node:assert/strict";
import test from "node:test";
import {
  localQuestionRecord,
  parseStoredQuestionRecords,
  questionEvidenceAddress,
  questionsForEvidence,
  storyQuestionInput,
} from "../lib/story-questions.ts";

const evidence = {
  baseCommit: "1234567",
  commit: "abcdef0",
  endLine: 40,
  path: "src/retries.ts",
  startLine: 10,
};

const story = {
  id: "retry-story",
  title: "Retries explain themselves.",
};

test("questions retain a selected range inside the active exact evidence", () => {
  assert.deepEqual(questionEvidenceAddress(evidence, "teamleaderleo/glimpse", 18, 24), {
    baseCommit: "1234567",
    endLine: 24,
    headCommit: "abcdef0",
    path: "src/retries.ts",
    repository: "Baxtori/baxtori",
    startLine: 18,
  });
});

test("question ranges cannot escape the active evidence", () => {
  assert.throws(() => questionEvidenceAddress(evidence, "owner/repo", 9, 24), /inside the active evidence/i);
  assert.throws(() => questionEvidenceAddress(evidence, "owner/repo", 20, 41), /inside the active evidence/i);
  assert.throws(() => questionEvidenceAddress(evidence, "owner/repo", 25, 24), /inside the active evidence/i);
});

test("question input preserves private or explicitly queued intent", () => {
  const input = storyQuestionInput({
    editionId: "2026-07-13",
    evidence,
    guidance: "  Inspect the exhausted state.  ",
    lensId: "skeptical",
    question: "  Can this retry remain queued?  ",
    repository: "owner/repo",
    reviewState: "queued",
    selectedEndLine: 24,
    selectedStartLine: 18,
    story,
    threadId: "thread-id",
  });
  assert.equal(input.question, "Can this retry remain queued?");
  assert.equal(input.guidance, "Inspect the exhausted state.");
  assert.equal(input.reviewState, "queued");
  assert.equal(input.threadId, "thread-id");
});

test("question input rejects blank text", () => {
  assert.throws(() => storyQuestionInput({
    editionId: "2026-07-13",
    evidence,
    guidance: "",
    lensId: "same",
    question: "   ",
    repository: "owner/repo",
    reviewState: "private",
    selectedEndLine: 24,
    selectedStartLine: 18,
    story,
    threadId: "thread-id",
  }), /write a question/i);
});

test("evidence filtering returns questions attached to the active excerpt", () => {
  const inside = {
    evidence: questionEvidenceAddress(evidence, "owner/repo", 18, 24),
    id: "inside",
  };
  const anotherCommit = {
    evidence: { ...inside.evidence, headCommit: "7654321" },
    id: "other",
  };
  assert.deepEqual(questionsForEvidence([inside, anotherCommit], evidence, "owner/repo").map((item) => item.id), ["inside"]);
});

test("local private questions survive validated device storage", () => {
  const input = storyQuestionInput({
    editionId: "2026-07-13",
    evidence,
    guidance: "",
    lensId: "same",
    question: "What closes the retry?",
    repository: "owner/repo",
    reviewState: "private",
    selectedEndLine: 24,
    selectedStartLine: 18,
    story,
    threadId: "local:topic",
  });
  const record = localQuestionRecord(input, 1_800_000_000_000);
  assert.equal(record.reviewState, "private");
  assert.deepEqual(parseStoredQuestionRecords([record]), [record]);
  assert.deepEqual(parseStoredQuestionRecords([{ ...record, _id: "remote-id" }, { broken: true }]), []);
});
