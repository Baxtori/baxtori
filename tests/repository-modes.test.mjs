import assert from "node:assert/strict";
import test from "node:test";
import {
  initializeRepositoryModes,
  repositoryModeCounts,
  restorePublishedRepositoryModes,
  reviewRepositoriesFromModes,
  sortRepositoriesByMode,
} from "../lib/repository-modes.ts";
import { parseReaderState } from "../lib/feedback-contract.ts";

const repositories = [
  { archived: false, fullName: "teamleaderleo/alpha" },
  { archived: false, fullName: "teamleaderleo/beta" },
  { archived: true, fullName: "teamleaderleo/old" },
];

function readerState(overrides = {}) {
  return {
    activeMapRepository: "teamleaderleo/baxtori",
    editionId: "2026-07-17",
    hideUnderstood: false,
    mapStates: {},
    questionStates: {},
    repositoryModes: {},
    selectedRepositories: [],
    states: {},
    version: 1,
    view: "repositories",
    ...overrides,
  };
}

test("legacy selection migrates without silently adding repositories", () => {
  assert.deepEqual(initializeRepositoryModes({
    legacySelectedRepositories: ["teamleaderleo/alpha"],
    repositories,
    source: "legacy",
    storedModes: {},
  }), {
    "teamleaderleo/alpha": "automatic",
    "teamleaderleo/beta": "muted",
    "teamleaderleo/old": "muted",
  });
});

test("new repositories default to automatic after explicit modes exist", () => {
  assert.deepEqual(initializeRepositoryModes({
    legacySelectedRepositories: [],
    repositories,
    source: "explicit",
    storedModes: { "teamleaderleo/alpha": "pinned" },
  }), {
    "teamleaderleo/alpha": "pinned",
    "teamleaderleo/beta": "automatic",
    "teamleaderleo/old": "muted",
  });
});

test("review scope is pinned first and excludes muted repositories", () => {
  assert.deepEqual(reviewRepositoriesFromModes({
    "teamleaderleo/alpha": "automatic",
    "teamleaderleo/beta": "pinned",
    "teamleaderleo/old": "muted",
  }), ["teamleaderleo/beta", "teamleaderleo/alpha"]);
});

test("restoring published scope mutes everything outside it", () => {
  assert.deepEqual(restorePublishedRepositoryModes({
    modes: { "teamleaderleo/beta": "pinned" },
    publishedRepositories: ["teamleaderleo/alpha"],
    repositories,
  }), {
    "teamleaderleo/alpha": "automatic",
    "teamleaderleo/beta": "muted",
    "teamleaderleo/old": "muted",
  });
});

test("mode counts and sorting use the visible repository library", () => {
  const modes = { "teamleaderleo/alpha": "automatic", "teamleaderleo/beta": "pinned" };
  assert.deepEqual(repositoryModeCounts(repositories, modes), { automatic: 1, muted: 1, pinned: 1 });
  assert.deepEqual(sortRepositoriesByMode(repositories, modes).map((repository) => repository.fullName), [
    "teamleaderleo/beta",
    "teamleaderleo/alpha",
    "teamleaderleo/old",
  ]);
});

test("reader state accepts and canonicalizes repository modes", () => {
  const parsed = parseReaderState(readerState({
    repositoryModes: {
      "teamleaderleo/glimpse": "pinned",
      "teamleaderleo/old": "muted",
    },
    selectedRepositories: ["teamleaderleo/glimpse"],
  }));
  assert.deepEqual(parsed.repositoryModes, {
    "Baxtori/baxtori": "pinned",
    "teamleaderleo/old": "muted",
  });
  assert.deepEqual(parsed.selectedRepositories, ["Baxtori/baxtori"]);
  assert.equal(parsed.activeMapRepository, "Baxtori/baxtori");
});

test("reader state preserves the edition history destination", () => {
  assert.equal(parseReaderState(readerState({ view: "history" })).view, "history");
});

test("reader chooses a persistent attention budget without breaking legacy state", () => {
  assert.equal(parseReaderState(readerState()).continueBudgetMinutes, 15);
  assert.equal(parseReaderState(readerState({ continueBudgetMinutes: 45 })).continueBudgetMinutes, 45);
  assert.throws(() => parseReaderState(readerState({ continueBudgetMinutes: 17 })), /Invalid attention budget/);
});

test("reader state persists a bounded capture window without breaking legacy state", () => {
  assert.equal(parseReaderState(readerState()).captureWindow, "since-review");
  assert.equal(parseReaderState(readerState({ captureWindow: "30d" })).captureWindow, "30d");
  assert.equal(parseReaderState(readerState({ captureWindow: "365d" })).captureWindow, "since-review");
});

test("version-one reader state remains valid before repository modes existed", () => {
  const legacy = readerState({ selectedRepositories: ["teamleaderleo/glimpse"] });
  delete legacy.repositoryModes;
  const parsed = parseReaderState(legacy);
  assert.deepEqual(parsed.repositoryModes, {});
  assert.deepEqual(parsed.selectedRepositories, ["Baxtori/baxtori"]);
});

test("reader state rejects unknown repository modes", () => {
  assert.throws(() => parseReaderState(readerState({
    repositoryModes: { "teamleaderleo/alpha": "urgent" },
  })), /Invalid reader disposition/);
});
