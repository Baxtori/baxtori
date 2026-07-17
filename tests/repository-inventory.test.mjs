import assert from "node:assert/strict";
import test from "node:test";
import { parseReaderState } from "../lib/feedback-contract.ts";
import { parseRepositoryInventory } from "../lib/repository-inventory.ts";

function inventoryEntry(overrides = {}) {
  return {
    archived: false,
    defaultBranch: "main",
    fork: false,
    fullName: "teamleaderleo/alpha",
    id: 1,
    private: true,
    pushedAt: "2026-07-17T09:00:00Z",
    updatedAt: "2026-07-17T09:00:00Z",
    ...overrides,
  };
}

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

test("repository inventory canonicalizes, deduplicates, and sorts by recent push", () => {
  const parsed = parseRepositoryInventory([
    inventoryEntry({ fullName: "teamleaderleo/glimpse", id: 10, pushedAt: "2026-07-16T09:00:00Z", updatedAt: "2026-07-16T09:00:00Z" }),
    inventoryEntry({ fullName: "teamleaderleo/baxtori", id: 10, pushedAt: "2026-07-17T09:00:00Z", updatedAt: "2026-07-17T09:00:00Z" }),
    inventoryEntry({ fullName: "teamleaderleo/beta", id: 20, pushedAt: null, updatedAt: "2026-07-15T09:00:00Z" }),
  ]);

  assert.deepEqual(parsed.map((entry) => entry.fullName), ["teamleaderleo/baxtori", "teamleaderleo/beta"]);
  assert.equal(parsed[0].pushedAt, "2026-07-17T09:00:00Z");
});

test("legacy reader state defaults to an empty inventory", () => {
  assert.deepEqual(parseReaderState(readerState()).repositoryInventory, []);
});

test("reader state retains sanitized repository inventory", () => {
  const parsed = parseReaderState(readerState({ repositoryInventory: [inventoryEntry()] }));
  assert.equal(parsed.repositoryInventory[0].fullName, "teamleaderleo/alpha");
  assert.equal(parsed.repositoryInventory[0].private, true);
});

test("repository inventory rejects malformed metadata", () => {
  assert.throws(() => parseRepositoryInventory([inventoryEntry({ pushedAt: "yesterday" })]), /ISO timestamp/);
  assert.throws(() => parseRepositoryInventory([inventoryEntry({ id: 0 })]), /positive integer/);
  assert.throws(() => parseRepositoryInventory([inventoryEntry({ fullName: "not-a-repository" })]), /Invalid repository inventory target/);
});
