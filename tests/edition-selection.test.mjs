import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRepositoryReviewLedger,
  EDITION_SELECTION_PRIORITIES,
  packEditionCandidates,
} from "../scripts/lib/edition-selection.mjs";

function candidate(id, overrides = {}) {
  return {
    estimatedMinutes: 5,
    id,
    priority: "useful-comprehension",
    qualifies: true,
    reason: "Reviewed evidence supports a useful explanation.",
    repository: `teamleaderleo/${id}`,
    title: `Finding ${id}`,
    ...overrides,
  };
}

test("edition selection has an explicit priority order", () => {
  assert.deepEqual(EDITION_SELECTION_PRIORITIES, [
    "reader-directed",
    "significant-change",
    "useful-comprehension",
    "optional",
  ]);
});

test("edition packing uses a reading budget without a story-count ceiling", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => candidate(`story-${index}`, { estimatedMinutes: 1 }));
  const result = packEditionCandidates(candidates, 15);
  assert.equal(result.included.length, 12);
  assert.equal(result.deferred.length, 0);
  assert.equal(result.plannedMinutes, 12);
});

test("higher-priority findings are packed before lower-priority findings", () => {
  const result = packEditionCandidates([
    candidate("optional", { priority: "optional" }),
    candidate("reader", { priority: "reader-directed" }),
    candidate("significant", { priority: "significant-change" }),
  ], 10);
  assert.deepEqual(result.included.map((item) => item.id), ["reader", "significant"]);
  assert.deepEqual(result.deferred.map((item) => item.id), ["optional"]);
});

test("one important finding can exceed the target budget without disappearing", () => {
  const result = packEditionCandidates([
    candidate("large", { estimatedMinutes: 20, priority: "reader-directed" }),
    candidate("small", { estimatedMinutes: 3, priority: "significant-change" }),
  ], 15);
  assert.deepEqual(result.included.map((item) => item.id), ["large"]);
  assert.deepEqual(result.deferred.map((item) => item.id), ["small"]);
  assert.equal(result.overBudgetMinutes, 5);
});

test("unqualified findings are excluded rather than consuming the budget", () => {
  const result = packEditionCandidates([
    candidate("weak", { qualifies: false, reason: "Evidence is incomplete." }),
    candidate("strong", { estimatedMinutes: 7, priority: "significant-change" }),
  ], 10);
  assert.deepEqual(result.included.map((item) => item.id), ["strong"]);
  assert.deepEqual(result.excluded.map((item) => item.id), ["weak"]);
});

test("candidate validation rejects unknown priorities and invalid estimates", () => {
  assert.throws(() => packEditionCandidates([candidate("bad", { priority: "urgent" })], 15), /unknown priority/);
  assert.throws(() => packEditionCandidates([candidate("bad", { estimatedMinutes: 0 })], 15), /positive integer/);
  assert.throws(() => packEditionCandidates([], 0), /positive integer/);
});

test("repository ledger distinguishes review candidates, quiet work, and inaccessible sources", () => {
  const ledger = buildRepositoryReviewLedger({
    repositories: [
      {
        commits: [{ sha: "a" }],
        error: null,
        fullName: "teamleaderleo/pinned",
        routineOnly: false,
        touchedFiles: ["src/index.ts"],
      },
      {
        commits: [],
        error: null,
        fullName: "teamleaderleo/quiet",
        routineOnly: false,
        touchedFiles: [],
      },
      {
        commits: [{ sha: "b" }],
        error: null,
        fullName: "teamleaderleo/routine",
        routineOnly: true,
        touchedFiles: ["README.md"],
      },
      {
        commits: [],
        error: "origin/main is unavailable.",
        fullName: "teamleaderleo/broken",
        routineOnly: false,
        touchedFiles: [],
      },
    ],
    repositoryModes: {
      "teamleaderleo/pinned": "pinned",
    },
    unconfiguredSelections: ["teamleaderleo/not-configured"],
  });

  assert.deepEqual(ledger.counts, {
    inaccessible: 2,
    quiet: 2,
    "review-candidate": 1,
  });
  assert.equal(ledger.inspectedCount, 4);
  assert.equal(ledger.requestedCount, 5);
  assert.equal(ledger.decisions[0].repository, "teamleaderleo/pinned");
  assert.equal(ledger.decisions[0].status, "review-candidate");
  assert.equal(ledger.decisions.find((item) => item.repository === "teamleaderleo/not-configured")?.status, "inaccessible");
});

test("muted collected repositories remain quiet", () => {
  const ledger = buildRepositoryReviewLedger({
    repositories: [{
      commits: [{ sha: "a" }],
      error: null,
      fullName: "teamleaderleo/muted",
      routineOnly: false,
      touchedFiles: ["src/index.ts"],
    }],
    repositoryModes: { "teamleaderleo/muted": "muted" },
  });
  assert.equal(ledger.decisions[0].status, "quiet");
  assert.match(ledger.decisions[0].reason, /Muted/);
});
