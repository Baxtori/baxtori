import assert from "node:assert/strict";
import test from "node:test";
import { packEditionCandidates } from "../scripts/lib/edition-selection.mjs";

test("a quiet edition remains empty when no finding qualifies", () => {
  const result = packEditionCandidates([
    {
      estimatedMinutes: 3,
      id: "routine",
      priority: "optional",
      qualifies: false,
      reason: "Routine-only activity.",
      repository: "teamleaderleo/routine",
      title: "Routine activity",
    },
    {
      estimatedMinutes: 5,
      id: "unclear",
      priority: "useful-comprehension",
      qualifies: false,
      reason: "The consequence is not established.",
      repository: "teamleaderleo/unclear",
      title: "Unclear change",
    },
  ], 15);

  assert.deepEqual(result.included, []);
  assert.deepEqual(result.deferred, []);
  assert.equal(result.excluded.length, 2);
  assert.equal(result.plannedMinutes, 0);
});
