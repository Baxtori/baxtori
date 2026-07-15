import assert from "node:assert/strict";
import test from "node:test";
import { buildGitHubCompareUrl, parseCodeDiffRequest, parseGitHubPatch } from "../lib/code-diff.ts";

test("parses an exact commit comparison request", () => {
  const request = parseCodeDiffRequest(new URL("https://baxtori.test/api/github/diff?repo=teamleaderleo%2Fglimpse&base=5c813ff&head=05a5bfe&path=lib%2Fgithub-auth.ts&start=57&end=88"));
  assert.deepEqual(request, {
    base: "5c813ff",
    endLine: 88,
    head: "05a5bfe",
    path: "lib/github-auth.ts",
    repository: "teamleaderleo/baxtori",
    startLine: 57,
  });
  assert.equal(
    buildGitHubCompareUrl("teamleaderleo/glimpse", "5c813ff", "05a5bfe").toString(),
    "https://api.github.com/repos/teamleaderleo/baxtori/compare/5c813ff...05a5bfe",
  );
});

test("rejects unsafe paths and a comparison without two commits", () => {
  assert.throws(() => parseCodeDiffRequest(new URL("https://baxtori.test/api/github/diff?repo=teamleaderleo%2Fglimpse&base=05a5bfe&head=05a5bfe&path=lib%2Fauth.ts&start=1&end=4")), /Invalid comparison/);
  assert.throws(() => parseCodeDiffRequest(new URL("https://baxtori.test/api/github/diff?repo=teamleaderleo%2Fglimpse&base=5c813ff&head=05a5bfe&path=..%2Fsecret&start=1&end=4")), /Invalid file path/);
});

test("selects the hunk intersecting an excerpt and keeps both line numbers", () => {
  const patch = [
    "@@ -4,3 +4,4 @@ unrelated",
    " same",
    "-before",
    "+after",
    "+extra",
    " end",
    "@@ -56,4 +57,5 @@ session",
    " context",
    "-const value = oldSession();",
    "+const value = sealSession();",
    "+return value;",
    " done",
  ].join("\n");
  const lines = parseGitHubPatch(patch, { startLine: 57, endLine: 63 });
  assert.equal(lines[0].kind, "hunk");
  assert.equal(lines[0].text, "@@ -56,4 +57,5 @@ session");
  assert.deepEqual(lines.slice(1, 5).map(({ kind, newNumber, oldNumber, text }) => ({ kind, newNumber, oldNumber, text })), [
    { kind: "context", newNumber: 57, oldNumber: 56, text: "context" },
    { kind: "deletion", newNumber: null, oldNumber: 57, text: "const value = oldSession();" },
    { kind: "addition", newNumber: 58, oldNumber: null, text: "const value = sealSession();" },
    { kind: "addition", newNumber: 59, oldNumber: null, text: "return value;" },
  ]);
  assert.ok(lines.every((line) => !line.text.includes("unrelated")));
});

test("fails closed when the requested excerpt does not intersect the patch", () => {
  assert.throws(
    () => parseGitHubPatch("@@ -1,2 +1,2 @@\n-old\n+new", { startLine: 100, endLine: 110 }),
    /No changed lines intersect/,
  );
});
