import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BAXTORI_REPOSITORY,
  LEGACY_BAXTORI_REPOSITORY,
  PREVIOUS_BAXTORI_REPOSITORY,
  canonicalRepository,
  canonicalRepositoryStateKey,
  canonicalizeRepositoryList,
  canonicalizeRepositoryStateRecord,
} from "../scripts/lib/repository-identity.mjs";
import { buildMapImpact } from "../scripts/lib/map-impact.mjs";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("maps every historical Baxtori repository identity to the organization repository", () => {
  for (const alias of [PREVIOUS_BAXTORI_REPOSITORY, LEGACY_BAXTORI_REPOSITORY]) {
    assert.equal(canonicalRepository(alias), BAXTORI_REPOSITORY);
    assert.equal(
      canonicalRepositoryStateKey(`${alias}:reading-loop`),
      `${BAXTORI_REPOSITORY}:reading-loop`,
    );
  }
  assert.equal(canonicalRepository("owner/other"), "owner/other");
});

test("deduplicates repository selections after canonicalization", () => {
  assert.deepEqual(
    canonicalizeRepositoryList([
      LEGACY_BAXTORI_REPOSITORY,
      "owner/other",
      PREVIOUS_BAXTORI_REPOSITORY,
      BAXTORI_REPOSITORY,
    ]),
    [BAXTORI_REPOSITORY, "owner/other"],
  );
});

test("preserves canonical state when historical and current keys coexist", () => {
  assert.deepEqual(
    canonicalizeRepositoryStateRecord({
      [`${LEGACY_BAXTORI_REPOSITORY}:area`]: "oldest",
      [`${PREVIOUS_BAXTORI_REPOSITORY}:area`]: "previous",
      [`${BAXTORI_REPOSITORY}:area`]: "current",
      unnamespaced: "preserved",
    }),
    {
      [`${BAXTORI_REPOSITORY}:area`]: "current",
      unnamespaced: "preserved",
    },
  );
});

test("matches a historical map identity to the canonical collected source", () => {
  const impact = buildMapImpact({
    areas: [{ confidence: 80, evidence: ["src/index.ts"], freshness: 70, id: "core", name: "Core" }],
    generatedAt: "2026-07-10T00:00:00Z",
    repository: PREVIOUS_BAXTORI_REPOSITORY,
  }, [{
    commits: [{
      date: "2026-07-11T00:00:00Z",
      files: [{ path: "src/index.ts" }],
      sha: "abcdef123456",
      shortSha: "abcdef1",
      subject: "Change core",
      url: `https://github.com/${BAXTORI_REPOSITORY}/commit/abcdef123456`,
    }],
    fullName: BAXTORI_REPOSITORY,
  }]);

  assert.equal(impact.error, null);
  assert.equal(impact.repository, BAXTORI_REPOSITORY);
  assert.equal(impact.affectedAreas[0].repository, BAXTORI_REPOSITORY);
});

test("keeps every active repository configuration canonical", async () => {
  const [scope, sources, registry, repositoryMap] = await Promise.all([
    readJson("data/review-scope.json"),
    readJson("baxtori.sources.json"),
    readJson("data/repository-maps.json"),
    readJson("data/repo-map.json"),
  ]);

  for (const repository of scope.repositories) {
    assert.equal(repository.fullName, canonicalRepository(repository.fullName));
  }
  for (const repository of sources.repositories) {
    assert.equal(repository.fullName, canonicalRepository(repository.fullName));
  }
  for (const entry of registry.maps) {
    assert.equal(entry.repository, canonicalRepository(entry.repository));
  }

  assert.equal(canonicalRepository(repositoryMap.repository), BAXTORI_REPOSITORY);
});
