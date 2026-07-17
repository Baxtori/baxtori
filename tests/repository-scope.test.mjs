import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "../lib/async-pool.ts";
import { parseReaderState } from "../lib/feedback-contract.ts";

function readerState(selectedRepositories) {
  return {
    activeMapRepository: "teamleaderleo/baxtori",
    editionId: "2026-07-17",
    hideUnderstood: false,
    mapStates: {},
    questionStates: {},
    selectedRepositories,
    states: {},
    version: 1,
    view: "repositories",
  };
}

test("reader state accepts a broad repository library", () => {
  const repositories = Array.from({ length: 64 }, (_, index) => `teamleaderleo/project-${index}`);
  assert.deepEqual(parseReaderState(readerState(repositories)).selectedRepositories, repositories);
});

test("repository activity work remains concurrency-bounded without truncating results", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency(Array.from({ length: 25 }, (_, index) => index), 4, async (index) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    return index * 2;
  });

  assert.equal(peak, 4);
  assert.deepEqual(results, Array.from({ length: 25 }, (_, index) => index * 2));
});

test("an empty repository scope completes without starting workers", async () => {
  let calls = 0;
  const results = await mapWithConcurrency([], 4, async () => {
    calls += 1;
    return "unexpected";
  });

  assert.deepEqual(results, []);
  assert.equal(calls, 0);
});

test("repository activity rejects an invalid concurrency", async () => {
  await assert.rejects(() => mapWithConcurrency([1], 0, async (value) => value), /positive integer/);
});
