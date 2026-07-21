import assert from "node:assert/strict";
import test from "node:test";
import { buildStoryOrientation } from "../lib/story-orientation.ts";

const maps = [{
  repository: "teamleaderleo/glimpse",
  summary: "A small evidence-backed reader.",
  areas: [{
    breadth: 66,
    concepts: ["reader state", "review queue"],
    confidence: 91,
    depth: 52,
    evidence: ["convex/feedback.ts", "scripts/export-feedback.mjs"],
    freshness: 100,
    id: "feedback-loop",
    importance: 5,
    kind: "Control plane",
    name: "Account-backed review feedback loop",
    purpose: "Carries reader intent into a scheduled review.",
  }, {
    breadth: 64,
    concepts: ["collector"],
    confidence: 90,
    depth: 42,
    evidence: ["scripts/export-feedback.mjs", "scripts/collect-backstory.mjs"],
    freshness: 100,
    id: "rundown-engine",
    importance: 5,
    kind: "Workflow",
    name: "Weekly rundown engine",
    purpose: "Collects exact repository evidence.",
  }],
}];

const story = {
  brief: "Reader choices now constrain the next review.",
  codeEvidence: [{ endLine: 81, path: "convex/feedback.ts", startLine: 44 }],
  files: ["convex/feedback.ts", "scripts/export-feedback.mjs"],
  learningValue: 5,
  title: "Reader choices now constrain the next review.",
  verdict: "Worth studying",
};

test("places an exact excerpt inside its canonical repository map area", () => {
  const orientation = buildStoryOrientation({
    active: story.codeEvidence[0],
    maps,
    repository: "teamleaderleo/baxtori",
    story,
  });

  assert.equal(orientation.repository, "teamleaderleo/baxtori");
  assert.equal(orientation.area?.id, "feedback-loop");
  assert.equal(orientation.area?.position, 1);
  assert.equal(orientation.area?.totalAreas, 2);
  assert.equal(orientation.area?.evidencePosition, 1);
});

test("shows connected mapped areas through exact shared paths", () => {
  const orientation = buildStoryOrientation({
    active: story.codeEvidence[0],
    maps,
    repository: "teamleaderleo/baxtori",
    story,
  });

  assert.deepEqual(orientation.connections, [{
    id: "rundown-engine",
    kind: "Workflow",
    name: "Weekly rundown engine",
    sharedPaths: ["scripts/export-feedback.mjs"],
  }]);
});

test("keeps same filenames in other directories outside the map match", () => {
  const orientation = buildStoryOrientation({
    active: { endLine: 20, path: "archive/feedback.ts", startLine: 1 },
    maps,
    repository: "teamleaderleo/baxtori",
    story: {
      ...story,
      codeEvidence: [{ endLine: 20, path: "archive/feedback.ts", startLine: 1 }],
      files: ["archive/feedback.ts"],
    },
  });

  assert.equal(orientation.area, null);
  assert.deepEqual(orientation.connections, []);
});

test("explains selection without exposing internal scores", () => {
  const orientation = buildStoryOrientation({
    active: story.codeEvidence[0],
    maps,
    repository: "teamleaderleo/baxtori",
    story,
  });

  assert.match(orientation.selection.explanation, /included in the edition/i);
  assert.doesNotMatch(orientation.selection.explanation, /score|percentage/i);
  assert.deepEqual(orientation.selection.signals, [
    "1 code excerpt",
    "Mapped to Account-backed review feedback loop",
  ]);
});
