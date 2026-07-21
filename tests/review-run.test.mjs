import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPreparedReviewRun,
  instructionVersion,
  sha256Text,
  validatePreparedReviewRun,
} from "../scripts/lib/review-run.mjs";

const originalModel = process.env.CODEX_MODEL;
const originalRuntime = process.env.CODEX_RUNTIME_VERSION;

test.afterEach(() => {
  if (originalModel === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = originalModel;
  if (originalRuntime === undefined) delete process.env.CODEX_RUNTIME_VERSION;
  else process.env.CODEX_RUNTIME_VERSION = originalRuntime;
});

function preparedRun() {
  process.env.CODEX_MODEL = "gpt-codex-test";
  process.env.CODEX_RUNTIME_VERSION = "codex-test-1";
  const candidates = {
    collectedAt: "2026-07-22T01:02:03.000Z",
    readerFeedback: { reviewRequests: [{ _id: "request-1" }] },
    repositories: [{
      collection: {
        baseSha: "1111111111111111111111111111111111111111",
        headSha: "2222222222222222222222222222222222222222",
        historyRewritten: false,
        mode: "review-cursor",
      },
      commits: [{ sha: "2222222222222222222222222222222222222222" }],
      fetchError: null,
      fullName: "Baxtori/baxtori",
    }],
  };
  const candidateText = `${JSON.stringify(candidates)}\n`;
  const instructionText = "# Review\n\nInstruction version: **7**\n";
  return buildPreparedReviewRun({
    candidates,
    candidateText,
    instructionText,
    now: new Date("2026-07-22T01:05:00.000Z"),
    runtime: { node: "v22.19.0", platform: "linux-x64" },
  });
}

test("hashes review inputs and snapshots source cursors", () => {
  const run = preparedRun();

  assert.equal(run.instruction.version, 7);
  assert.match(run.instruction.sha256, /^[0-9a-f]{64}$/);
  assert.equal(run.input.collectedAt, "2026-07-22T01:02:03.000Z");
  assert.equal(run.sources[0].mode, "review-cursor");
  assert.deepEqual(run.availableFeedbackIds, ["request-1"]);
  assert.equal(run.model, "gpt-codex-test");
  assert.equal(run.runtime.codex, "codex-test-1");
  assert.match(run.runId, /^2026-07-22T01-02-03-000Z-[0-9a-f]{12}$/);
});

test("accepts only processed feedback from the prepared input", () => {
  const run = preparedRun();
  run.processedFeedbackIds = ["request-1"];
  run.humanEdits = ["Tightened the verification step after manual review."];
  assert.doesNotThrow(() => validatePreparedReviewRun(run));

  run.processedFeedbackIds = ["request-not-in-input"];
  assert.throws(() => validatePreparedReviewRun(run), /prepared candidate input/);
});

test("requires model and Codex runtime before finalization", () => {
  const run = preparedRun();
  run.model = null;
  assert.throws(() => validatePreparedReviewRun(run), /model and runtime/);
});

test("parses instruction versions and produces stable hashes", () => {
  assert.equal(instructionVersion("Instruction version: **12**"), 12);
  assert.equal(sha256Text("same"), sha256Text("same"));
  assert.notEqual(sha256Text("same"), sha256Text("different"));
});
