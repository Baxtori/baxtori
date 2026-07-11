import assert from "node:assert/strict";
import test from "node:test";
import { resolveActivityWindow } from "../lib/github-activity.ts";

const now = Date.parse("2026-07-12T00:00:00.000Z");

test("uses a valid review cursor instead of a rolling window", () => {
  const window = resolveActivityWindow({ now, requestedDays: 14, requestedSince: "2026-07-11T00:00:00.000Z" });
  assert.equal(window.since, "2026-07-11T00:00:00.000Z");
  assert.equal(window.window, "since-review");
});

test("falls back to a bounded rolling window for an invalid cursor", () => {
  const window = resolveActivityWindow({ now, requestedDays: 500, requestedSince: "not-a-date" });
  assert.equal(window.days, 90);
  assert.equal(window.since, "2026-04-13T00:00:00.000Z");
  assert.equal(window.window, "rolling");
});

test("rejects future review cursors", () => {
  const window = resolveActivityWindow({ now, requestedDays: 7, requestedSince: "2026-07-13T00:00:00.000Z" });
  assert.equal(window.since, "2026-07-05T00:00:00.000Z");
  assert.equal(window.window, "rolling");
});
