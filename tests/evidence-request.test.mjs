import assert from "node:assert/strict";
import test from "node:test";
import { parseCodeDiffRequest } from "../lib/code-diff.ts";
import { parseCodeEvidenceRequest } from "../lib/code-evidence.ts";
import {
  isValidCommitReference,
  parseEvidencePathRange,
  parseEvidenceRepository,
} from "../lib/evidence-request.ts";

function requestUrl(path = "src/example.ts", start = "1", end = "4") {
  const url = new URL("https://baxtori.test/api/github/code");
  url.searchParams.set("repo", "teamleaderleo/glimpse");
  url.searchParams.set("path", path);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  return url;
}

function codeUrl(path, start = "1", end = "4") {
  const url = requestUrl(path, start, end);
  url.searchParams.set("commit", "1234567");
  return url;
}

function diffUrl(path, start = "1", end = "4") {
  const url = requestUrl(path, start, end);
  url.pathname = "/api/github/diff";
  url.searchParams.set("base", "1234567");
  url.searchParams.set("head", "89abcde");
  return url;
}

test("shared evidence parsing canonicalizes repositories and preserves bounded locations", () => {
  const url = requestUrl("src/a file.ts", "3", "162");
  assert.equal(parseEvidenceRepository(url), "Baxtori/baxtori");
  assert.deepEqual(parseEvidencePathRange(url), {
    endLine: 162,
    path: "src/a file.ts",
    startLine: 3,
  });
});

test("commit references accept only abbreviated or full hexadecimal object IDs", () => {
  assert.equal(isValidCommitReference("1234567"), true);
  assert.equal(isValidCommitReference("a".repeat(40)), true);
  for (const invalid of ["123456", "a".repeat(41), "main", "12345xz"]) {
    assert.equal(isValidCommitReference(invalid), false, invalid);
  }
});

test("code and diff requests reject the same unsafe repository paths", () => {
  const unsafePaths = [
    "",
    "/absolute.ts",
    ".",
    "..",
    "src/../secret.ts",
    "src//empty.ts",
    "src/\0secret.ts",
    "a".repeat(501),
  ];
  for (const path of unsafePaths) {
    assert.throws(() => parseCodeEvidenceRequest(codeUrl(path)), /Invalid file path/, `code: ${JSON.stringify(path)}`);
    assert.throws(() => parseCodeDiffRequest(diffUrl(path)), /Invalid file path/, `diff: ${JSON.stringify(path)}`);
  }
});

test("code and diff requests enforce the same inclusive 160-line range", () => {
  assert.equal(parseCodeEvidenceRequest(codeUrl("src/example.ts", "1", "160")).endLine, 160);
  assert.equal(parseCodeDiffRequest(diffUrl("src/example.ts", "1", "160")).endLine, 160);

  const invalidRanges = [
    ["0", "1"],
    ["2", "1"],
    ["1", "161"],
    ["1.5", "2"],
    ["one", "two"],
  ];
  for (const [start, end] of invalidRanges) {
    assert.throws(() => parseCodeEvidenceRequest(codeUrl("src/example.ts", start, end)), /Invalid line range/);
    assert.throws(() => parseCodeDiffRequest(diffUrl("src/example.ts", start, end)), /Invalid line range/);
  }
});
