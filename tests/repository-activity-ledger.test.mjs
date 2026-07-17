import assert from "node:assert/strict";
import test from "node:test";
import { buildRepositoryReviewLedger } from "../scripts/lib/edition-selection.mjs";

const baseEntry = {
  activityCandidate: false,
  activityCommitCount: 0,
  activityReason: "No completed activity snapshot is available.",
  activityStatus: "unknown",
  fullName: "teamleaderleo/metadata",
  mode: "automatic",
  reason: "No source cache is configured.",
  sourceStatus: "metadata-only",
};

test("active metadata-only repositories become review candidates without source claims", () => {
  const ledger = buildRepositoryReviewLedger({
    repositories: [],
    repositoryModes: { "teamleaderleo/metadata": "pinned" },
    sourcePlanEntries: [{ ...baseEntry, activityCandidate: true, activityCommitCount: 2, activityStatus: "active", mode: "pinned" }],
    unconfiguredSelections: ["teamleaderleo/metadata"],
  });
  assert.equal(ledger.decisions[0].status, "review-candidate");
  assert.equal(ledger.decisions[0].commitCount, 2);
  assert.equal(ledger.decisions[0].touchedFileCount, 0);
  assert.match(ledger.decisions[0].reason, /exact source evidence is not cached/);
});

test("quiet metadata-only repositories remain quiet", () => {
  const ledger = buildRepositoryReviewLedger({
    repositories: [],
    sourcePlanEntries: [{ ...baseEntry, activityReason: "No repository push was recorded in the review window.", activityStatus: "quiet" }],
    unconfiguredSelections: ["teamleaderleo/metadata"],
  });
  assert.equal(ledger.decisions[0].status, "quiet");
});

test("deferred activity remains explicit", () => {
  const ledger = buildRepositoryReviewLedger({
    repositories: [],
    sourcePlanEntries: [{ ...baseEntry, activityReason: "The bounded activity request budget was exhausted.", activityStatus: "deferred" }],
    unconfiguredSelections: ["teamleaderleo/metadata"],
  });
  assert.equal(ledger.decisions[0].status, "inaccessible");
  assert.match(ledger.decisions[0].reason, /request budget/);
});
