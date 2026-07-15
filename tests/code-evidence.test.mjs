import assert from "node:assert/strict";
import test from "node:test";
import { buildGitHubContentsUrl, parseCodeEvidenceRequest, selectCodeLines } from "../lib/code-evidence.ts";
import { highlightCodeLines } from "../lib/code-highlight.ts";

test("parses a bounded, commit-addressed code excerpt", () => {
  const request = parseCodeEvidenceRequest(new URL("https://baxtori.test/api/github/code?repo=teamleaderleo%2Fglimpse&commit=05a5bfe&path=lib%2Fgithub-auth.ts&start=57&end=88"));
  assert.deepEqual(request, {
    commit: "05a5bfe",
    endLine: 88,
    path: "lib/github-auth.ts",
    repository: "teamleaderleo/baxtori",
    startLine: 57,
  });
});

test("rejects path traversal and oversized excerpts", () => {
  assert.throws(() => parseCodeEvidenceRequest(new URL("https://baxtori.test/api/github/code?repo=teamleaderleo%2Fglimpse&commit=05a5bfe&path=..%2Fsecret&start=1&end=5")), /Invalid file path/);
  assert.throws(() => parseCodeEvidenceRequest(new URL("https://baxtori.test/api/github/code?repo=teamleaderleo%2Fglimpse&commit=05a5bfe&path=lib%2Fgithub-auth.ts&start=1&end=200")), /Invalid line range/);
});

test("selects stable line numbers and builds a canonical commit-addressed GitHub URL", () => {
  assert.deepEqual(selectCodeLines("zero\none\ntwo\nthree", { startLine: 2, endLine: 3 }), [
    { number: 2, text: "one" },
    { number: 3, text: "two" },
  ]);
  assert.equal(
    buildGitHubContentsUrl("teamleaderleo/glimpse", "app/a file.ts", "05a5bfe").toString(),
    "https://api.github.com/repos/teamleaderleo/baxtori/contents/app/a%20file.ts?ref=05a5bfe",
  );
});

test("colors source tokens without changing the source text", () => {
  const source = [
    { number: 12, text: "const total = calculate(price, 2); // exact source" },
    { number: 13, text: "return { total, safe: true };" },
  ];
  const highlighted = highlightCodeLines(source, "typescript");
  assert.equal(highlighted.map((line) => line.tokens.map((token) => token.text).join("")).join("\n"), source.map((line) => line.text).join("\n"));
  assert.ok(highlighted[0].tokens.some((token) => token.kind === "keyword" && token.text === "const"));
  assert.ok(highlighted[0].tokens.some((token) => token.kind === "function" && token.text === "calculate"));
  assert.ok(highlighted[0].tokens.some((token) => token.kind === "comment" && token.text === "// exact source"));
  assert.ok(highlighted[1].tokens.some((token) => token.kind === "literal" && token.text === "true"));
});

test("keeps multiline comments and template strings colored across lines", () => {
  const highlighted = highlightCodeLines([
    { number: 1, text: "/* first" },
    { number: 2, text: "second */ const message = `hello" },
    { number: 3, text: "world`;" },
  ], "typescript");
  assert.equal(highlighted[1].tokens[0].kind, "comment");
  assert.ok(highlighted[1].tokens.some((token) => token.kind === "string"));
  assert.equal(highlighted[2].tokens[0].kind, "string");
});
