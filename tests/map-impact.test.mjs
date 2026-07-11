import assert from "node:assert/strict";
import test from "node:test";
import { buildMapImpact } from "../scripts/lib/map-impact.mjs";

const map = {
  generatedAt: "2026-07-10T00:00:00Z",
  repository: "owner/repo",
  areas: [{
    confidence: 90,
    evidence: ["src/auth.ts", "app/api/auth"],
    freshness: 80,
    id: "auth",
    name: "Authentication",
  }],
};

test("connects changed evidence to its mapped area", () => {
  const impact = buildMapImpact(map, [{
    fullName: "owner/repo",
    touchedFiles: ["src/auth.ts", "app/api/auth/callback.ts", "README.md"],
    commits: [{
      date: "2026-07-11T00:00:00Z",
      files: [{ path: "src/auth.ts" }, { path: "README.md" }],
      sha: "abcdef123456",
      shortSha: "abcdef1",
      subject: "Change auth",
      url: "https://github.com/owner/repo/commit/abcdef123456",
    }, {
      date: "2026-07-11T01:00:00Z",
      files: [{ path: "app/api/auth/callback.ts" }],
      sha: "123456abcdef",
      shortSha: "123456a",
      subject: "Change callback",
      url: "https://github.com/owner/repo/commit/123456abcdef",
    }],
  }]);

  assert.equal(impact.affectedAreas.length, 1);
  assert.deepEqual(impact.affectedAreas[0].changedFiles, ["src/auth.ts", "app/api/auth/callback.ts"]);
  assert.deepEqual(impact.unmappedFiles, ["README.md"]);
});

test("does not reopen map areas for commits already included in the map", () => {
  const impact = buildMapImpact({ ...map, generatedAt: "2026-07-12T00:00:00Z" }, [{
    fullName: "owner/repo",
    touchedFiles: ["src/auth.ts"],
    commits: [{
      date: "2026-07-11T00:00:00Z",
      files: [{ path: "src/auth.ts" }],
      sha: "abcdef123456",
      shortSha: "abcdef1",
      subject: "Already reviewed",
      url: "https://github.com/owner/repo/commit/abcdef123456",
    }],
  }]);

  assert.equal(impact.affectedAreas.length, 0);
  assert.deepEqual(impact.unmappedFiles, []);
});

test("reports a missing mapped repository without inventing impact", () => {
  const impact = buildMapImpact(map, []);
  assert.equal(impact.affectedAreas.length, 0);
  assert.match(impact.error, /No collected source/);
});
