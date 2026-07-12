import assert from "node:assert/strict";
import test from "node:test";
import { buildGitHubContentsUrl, parseCodeEvidenceRequest, selectCodeLines } from "../lib/code-evidence.ts";

test("parses a bounded, commit-addressed code excerpt", () => {
  const request = parseCodeEvidenceRequest(new URL("https://baxtori.test/api/github/code?repo=teamleaderleo%2Fglimpse&commit=05a5bfe&path=lib%2Fgithub-auth.ts&start=57&end=88"));
  assert.deepEqual(request, {
    commit: "05a5bfe",
    endLine: 88,
    path: "lib/github-auth.ts",
    repository: "teamleaderleo/glimpse",
    startLine: 57,
  });
});

test("rejects path traversal and oversized excerpts", () => {
  assert.throws(() => parseCodeEvidenceRequest(new URL("https://baxtori.test/api/github/code?repo=teamleaderleo%2Fglimpse&commit=05a5bfe&path=..%2Fsecret&start=1&end=5")), /Invalid file path/);
  assert.throws(() => parseCodeEvidenceRequest(new URL("https://baxtori.test/api/github/code?repo=teamleaderleo%2Fglimpse&commit=05a5bfe&path=lib%2Fgithub-auth.ts&start=1&end=200")), /Invalid line range/);
});

test("selects stable line numbers and builds a commit-addressed GitHub URL", () => {
  assert.deepEqual(selectCodeLines("zero\none\ntwo\nthree", { startLine: 2, endLine: 3 }), [
    { number: 2, text: "one" },
    { number: 3, text: "two" },
  ]);
  assert.equal(
    buildGitHubContentsUrl("teamleaderleo/glimpse", "app/a file.ts", "05a5bfe").toString(),
    "https://api.github.com/repos/teamleaderleo/glimpse/contents/app/a%20file.ts?ref=05a5bfe",
  );
});
