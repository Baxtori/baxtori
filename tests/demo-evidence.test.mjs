import assert from "node:assert/strict";
import test from "node:test";
import { demoCodeEvidence, demoDiffEvidence } from "../lib/demo-evidence.ts";

const published = {
  base: "cbd7740699209218ceef0a27223d9239f4c99bc5",
  endLine: 81,
  head: "36379892e85bd1e3512663bcc7632a1c6a9a1be5",
  path: "convex/feedback.ts",
  repository: "teamleaderleo/baxtori",
  startLine: 44,
};

test("published demo evidence resolves only its exact allowlisted address", () => {
  const code = demoCodeEvidence({ ...published, commit: published.head });
  const diff = demoDiffEvidence(published);

  assert.equal(code?.lines[0].number, 44);
  assert.equal(code?.lines.at(-1).number, 81);
  assert.equal(diff?.lines[0].kind, "hunk");
  assert.ok(diff?.lines.some((line) => line.kind === "addition"));
});

test("nearby paths, ranges, and commits cannot broaden demo access", () => {
  assert.equal(demoCodeEvidence({ ...published, commit: published.head, path: "convex/schema.ts" }), null);
  assert.equal(demoCodeEvidence({ ...published, commit: published.head, startLine: 43 }), null);
  assert.equal(demoDiffEvidence({ ...published, head: "0000000000000000000000000000000000000000" }), null);
});
