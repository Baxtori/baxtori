import assert from "node:assert/strict";
import test from "node:test";
import { buildEditionLedgerView } from "../lib/edition-ledger.ts";

const stories = [
  { id: "alpha", repository: "teamleaderleo/alpha", title: "Alpha changed" },
  { id: "beta", repository: "teamleaderleo/beta", title: "Beta changed" },
];

test("legacy editions label missing selection information as unknown", () => {
  const view = buildEditionLedgerView({ quietRepositories: [], stories });
  assert.equal(view.recorded, false);
  assert.equal(view.headline, "2 published findings");
  assert.equal(view.metrics.find((metric) => metric.label === "Omission record")?.value, "Unavailable");
  assert.ok(view.description.includes("not every review decision"));
  assert.ok(view.unknownFields.includes("Qualifying findings deferred"));
});

test("recorded selection reports reviewed, published, and deferred counts", () => {
  const view = buildEditionLedgerView({
    quietRepositories: [],
    selection: {
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
          estimatedMinutes: 5,
          priority: "significant-change",
          reason: "Changes a persistence rule.",
          repository: "teamleaderleo/beta",
          storyId: "beta",
        },
      ],
      inspectedRepositories: 6,
      plannedMinutes: 10,
      quiet: [{ repository: "teamleaderleo/quiet", reason: "No commits in the review window." }],
      readingBudgetMinutes: 15,
    },
    stories,
  });

  assert.equal(view.recorded, true);
  assert.equal(view.headline, "2 of 4 reviewed findings published");
  assert.equal(view.metrics.find((metric) => metric.label === "Repositories inspected")?.value, 6);
  assert.equal(view.metrics.find((metric) => metric.label === "Deferred")?.value, 1);
  assert.match(view.description, /10 of 15/);
});

test("an oversized first finding explains the target overrun", () => {
  const view = buildEditionLedgerView({
    quietRepositories: [],
    selection: {
      deferred: [],
      excluded: [],
      inaccessible: [],
      included: [{
        estimatedMinutes: 20,
        priority: "reader-directed",
        reason: "Highest-priority finding.",
        repository: "teamleaderleo/alpha",
        storyId: "alpha",
      }],
      inspectedRepositories: 1,
      plannedMinutes: 20,
      quiet: [],
      readingBudgetMinutes: 15,
    },
    stories: stories.slice(0, 1),
  });

  assert.match(view.description, /first story exceeded/);
});
