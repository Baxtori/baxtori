import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeEvidencePath,
  isSafeEvidenceRepository,
} from "../scripts/lib/git-evidence-validation.mjs";

test("accepts canonical and historical Baxtori repository identities", () => {
  assert.equal(isSafeEvidenceRepository("Baxtori/baxtori"), true);
  assert.equal(isSafeEvidenceRepository("teamleaderleo/baxtori"), true);
  assert.equal(isSafeEvidenceRepository("teamleaderleo/glimpse"), true);
});

test("rejects malformed repository identities", () => {
  assert.equal(isSafeEvidenceRepository("not-a-repository"), false);
  assert.equal(isSafeEvidenceRepository("../baxtori"), false);
  assert.equal(isSafeEvidenceRepository("Baxtori/.."), false);
  assert.equal(isSafeEvidenceRepository("Baxtori/repo/name"), false);
});

test("accepts bounded repository-relative evidence paths", () => {
  assert.equal(isSafeEvidencePath("app/api/github/diff/route.ts"), true);
  assert.equal(isSafeEvidencePath("README.md"), true);
});

test("rejects absolute, traversing, empty, NUL, and oversized evidence paths", () => {
  assert.equal(isSafeEvidencePath("/etc/passwd"), false);
  assert.equal(isSafeEvidencePath("../secret"), false);
  assert.equal(isSafeEvidencePath("app/../secret"), false);
  assert.equal(isSafeEvidencePath("app//route.ts"), false);
  assert.equal(isSafeEvidencePath("app/\u0000route.ts"), false);
  assert.equal(isSafeEvidencePath("a".repeat(501)), false);
});
