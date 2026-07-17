import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthorizedSourcePlan } from "../scripts/lib/authorized-source-plan.mjs";

const configuredSources = [
  { branch: "main", fullName: "teamleaderleo/configured", path: "../configured" },
  { branch: "main", fullName: "teamleaderleo/legacy", path: "../legacy" },
];

function inventory(fullName, overrides = {}) {
  return {
    archived: false,
    defaultBranch: "main",
    fork: false,
    fullName,
    private: true,
    pushedAt: "2026-07-17T09:00:00Z",
    updatedAt: "2026-07-17T09:00:00Z",
    ...overrides,
  };
}

test("authorized plan collects configured caches and records metadata-only sources", () => {
  const plan = buildAuthorizedSourcePlan({
    configuredSources,
    repositoryInventory: [
      inventory("teamleaderleo/configured"),
      inventory("teamleaderleo/inventory-only"),
      inventory("teamleaderleo/muted"),
    ],
    repositoryModes: {
      "teamleaderleo/configured": "automatic",
      "teamleaderleo/inventory-only": "pinned",
      "teamleaderleo/muted": "muted",
    },
    selectedRepositories: ["teamleaderleo/configured", "teamleaderleo/inventory-only"],
  });

  assert.deepEqual(plan.sourcesToCollect.map((source) => source.fullName), ["teamleaderleo/configured"]);
  assert.deepEqual(plan.unconfiguredSelections, ["teamleaderleo/inventory-only"]);
  assert.equal(plan.entries[0].fullName, "teamleaderleo/inventory-only");
  assert.equal(plan.entries[0].sourceStatus, "metadata-only");
  assert.equal(plan.counts.muted, 1);
});

test("a current inventory blocks stale configured selections that lost authorization", () => {
  const plan = buildAuthorizedSourcePlan({
    configuredSources,
    repositoryInventory: [inventory("teamleaderleo/configured")],
    repositoryModes: {
      "teamleaderleo/configured": "automatic",
      "teamleaderleo/legacy": "pinned",
    },
    selectedRepositories: ["teamleaderleo/configured", "teamleaderleo/legacy"],
  });

  assert.deepEqual(plan.sourcesToCollect.map((source) => source.fullName), ["teamleaderleo/configured"]);
  assert.equal(plan.entries.find((entry) => entry.fullName === "teamleaderleo/legacy")?.sourceStatus, "authorization-missing");
});

test("legacy exports preserve configured source behavior before inventory exists", () => {
  const plan = buildAuthorizedSourcePlan({
    configuredSources,
    repositoryInventory: [],
    repositoryModes: { "teamleaderleo/legacy": "pinned" },
    selectedRepositories: ["teamleaderleo/legacy"],
  });

  assert.deepEqual(plan.sourcesToCollect.map((source) => source.fullName), ["teamleaderleo/legacy"]);
  assert.equal(plan.entries[0].sourceStatus, "configured-cache");
  assert.equal(plan.inventoryIsCurrent, false);
});

test("muted repositories never enter scheduled collection", () => {
  const plan = buildAuthorizedSourcePlan({
    configuredSources,
    repositoryInventory: [inventory("teamleaderleo/configured")],
    repositoryModes: { "teamleaderleo/configured": "muted" },
    selectedRepositories: [],
  });

  assert.equal(plan.sourcesToCollect.length, 0);
  assert.equal(plan.entries[0].sourceStatus, "muted");
});
