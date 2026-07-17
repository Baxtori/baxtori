import assert from "node:assert/strict";
import test from "node:test";
import { parseRepositoryInventory, repositoryInventoryFromLibrary } from "../lib/repository-inventory.ts";

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

test("repository inventory canonicalizes, deduplicates, and sorts by recent push", () => {
  const parsed = parseRepositoryInventory([
    inventoryEntry({ fullName: "teamleaderleo/glimpse", id: 10, pushedAt: "2026-07-16T09:00:00Z", updatedAt: "2026-07-16T09:00:00Z" }),
    inventoryEntry({ fullName: "teamleaderleo/baxtori", id: 10, pushedAt: "2026-07-17T09:00:00Z", updatedAt: "2026-07-17T09:00:00Z" }),
    inventoryEntry({ fullName: "teamleaderleo/beta", id: 20, pushedAt: null, updatedAt: "2026-07-15T09:00:00Z" }),
  ]);

  assert.deepEqual(parsed.map((entry) => entry.fullName), ["teamleaderleo/baxtori", "teamleaderleo/beta"]);
  assert.equal(parsed[0].pushedAt, "2026-07-17T09:00:00Z");
});

test("library conversion keeps only compiler-safe metadata", () => {
  const parsed = repositoryInventoryFromLibrary([{
    ...inventoryEntry(),
    description: "not exported",
    language: "TypeScript",
    openIssues: 12,
    url: "https://github.com/teamleaderleo/alpha",
  }]);
  assert.deepEqual(Object.keys(parsed[0]).sort(), [
    "archived",
    "defaultBranch",
    "fork",
    "fullName",
    "id",
    "private",
    "pushedAt",
    "updatedAt",
  ]);
});

test("repository inventory rejects malformed metadata", () => {
  assert.throws(() => parseRepositoryInventory([inventoryEntry({ pushedAt: "yesterday" })]), /ISO timestamp/);
  assert.throws(() => parseRepositoryInventory([inventoryEntry({ id: 0 })]), /positive integer/);
  assert.throws(() => parseRepositoryInventory([inventoryEntry({ fullName: "not-a-repository" })]), /Invalid repository inventory target/);
});
