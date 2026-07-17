import assert from "node:assert/strict";
import test from "node:test";
import { validateEditionSelectionRecord } from "../scripts/lib/edition-selection-record.mjs";

const stories = [
  { id: "alpha", repository: "teamleaderleo/alpha" },
  { id: "beta", repository: "teamleaderleo/beta" },
];
const quietRepositories = ["teamleaderleo/quiet"];

function selection(overrides = {}) {
  return {
    deferred: [{
      estimatedMinutes: 4,
      id: "gamma",
      priority: "useful-comprehension",
      reason: "Qualified, but did not fit.",
      repository: "teamleaderleo/gamma",
      title: "Gamma changed",
    }],
    excluded: [{
      estimatedMinutes: 3,
      id: "delta",
      priority: "optional",
      reason: "The consequence was not established.",
      repository: "teamleaderleo/delta",
      title: "Delta changed",
    }],
    inaccessible: [{ repository: "teamleaderleo/private", reason: "Source access failed." }],
    included: [
      {
        estimatedMinutes: 5,
        priority: "reader-directed",
        reason: "Answers a queued question.",
        repository: "teamleaderleo/alpha",
        storyId: "alpha",
      },
      {
        estimatedMinutes: 6,
        priority: "significant-change",
        reason: "Changes a persistence rule.",
        repository: "teamleaderleo/beta",
        storyId: "beta",
      },
    ],
    inspectedRepositories: 6,
    plannedMinutes: 11,
    quiet: [{ repository: "teamleaderleo/quiet", reason: "No commits in the review window." }],
    readingBudgetMinutes: 15,
    ...overrides,
  };
}

function validate(record = selection(), quiet = quietRepositories) {
  return validateEditionSelectionRecord(record, stories, quiet);
}

test("legacy editions may omit a selection record", () => {
  assert.equal(validateEditionSelectionRecord(undefined, stories), null);
});

test("a complete published selection record validates", () => {
  const validated = validate();
  assert.equal(validated.included.length, 2);
  assert.equal(validated.plannedMinutes, 11);
  assert.equal(validated.deferred[0].id, "gamma");
});

test("every published story must appear exactly once", () => {
  assert.throws(() => validate(selection({
    included: selection().included.slice(0, 1),
    plannedMinutes: 5,
  })), /account for every published story/);

  assert.throws(() => validate(selection({
    included: [selection().included[0], selection().included[0]],
    plannedMinutes: 10,
  })), /duplicate alpha/);
});

test("included repository must match its story", () => {
  const invalid = selection();
  invalid.included[0].repository = "teamleaderleo/other";
  assert.throws(() => validate(invalid), /repository must match story alpha/);
});

test("selection records reject unknown priorities", () => {
  const invalid = selection();
  invalid.deferred[0].priority = "urgent";
  assert.throws(() => validate(invalid), /unknown priority/);
});

test("planned minutes must equal the included estimates", () => {
  assert.throws(() => validate(selection({ plannedMinutes: 10 })), /must equal included estimates/);
});

test("deferred and excluded findings cannot reuse an ID", () => {
  const invalid = selection();
  invalid.excluded[0].id = "gamma";
  assert.throws(() => validate(invalid), /duplicate gamma/);
});

test("quiet and inaccessible repositories cannot overlap", () => {
  const invalid = selection();
  invalid.inaccessible[0].repository = "teamleaderleo/quiet";
  assert.throws(() => validate(invalid), /duplicate teamleaderleo\/quiet/);
});

test("selection quiet repositories must match the edition field", () => {
  assert.throws(() => validate(selection(), ["teamleaderleo/elsewhere"]), /must match exactly/);
});

test("repository decisions require canonical owner/name values", () => {
  const invalid = selection();
  invalid.quiet[0].repository = "not-a-repository";
  assert.throws(() => validate(invalid), /owner\/name repository/);
});
