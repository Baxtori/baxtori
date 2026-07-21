import assert from "node:assert/strict";
import test from "node:test";
import { matchPublishedDemoEvidence } from "../lib/demo-evidence-match.ts";

const canonicalEvidence = {
  repository: "Baxtori/baxtori",
  path: "scripts/example.mjs",
};

test("matches a published fixture that predates the organization transfer", () => {
  const attempts = [];
  const matched = matchPublishedDemoEvidence(canonicalEvidence, (candidate) => {
    attempts.push(candidate.repository);
    return candidate.repository === "teamleaderleo/baxtori"
      ? { ...candidate, lines: ["example"] }
      : null;
  });

  assert.deepEqual(attempts, ["Baxtori/baxtori", "teamleaderleo/baxtori"]);
  assert.deepEqual(matched, {
    repository: "Baxtori/baxtori",
    path: "scripts/example.mjs",
    lines: ["example"],
  });
});

test("does not rewrite unrelated repositories", () => {
  const evidence = { repository: "owner/repository", path: "src/index.ts" };
  const matched = matchPublishedDemoEvidence(evidence, (candidate) => ({ ...candidate, lines: [] }));

  assert.deepEqual(matched, { ...evidence, lines: [] });
});
