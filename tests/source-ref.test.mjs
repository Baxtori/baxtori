import assert from "node:assert/strict";
import test from "node:test";
import { sourceReviewRef } from "../scripts/lib/source-ref.mjs";

test("resolves review work to the GitHub remote-tracking branch", () => {
  assert.deepEqual(sourceReviewRef({ branch: "main", fullName: "owner/repo" }), {
    branch: "main",
    reviewRef: "refs/remotes/origin/main",
  });
});

test("allows a nested GitHub branch without accepting ref traversal", () => {
  assert.equal(sourceReviewRef({ branch: "release/v2", fullName: "owner/repo" }).reviewRef, "refs/remotes/origin/release/v2");
  assert.throws(() => sourceReviewRef({ branch: "../main", fullName: "owner/repo" }), /Invalid GitHub branch/);
});
