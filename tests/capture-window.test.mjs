import assert from "node:assert/strict";
import test from "node:test";
import {
  captureWindowEmptyLabel,
  captureWindowSearch,
  isCaptureWindow,
} from "../lib/capture-window.ts";

test("capture windows select either the edition cursor or a rolling duration", () => {
  assert.equal(captureWindowSearch("since-review", "2026-07-20T00:00:00Z").toString(), "since=2026-07-20T00%3A00%3A00Z");
  assert.equal(captureWindowSearch("30d", "2026-07-20T00:00:00Z").toString(), "days=30");
});

test("capture windows reject arbitrary query fragments", () => {
  assert.equal(isCaptureWindow("7d"), true);
  assert.equal(isCaptureWindow("365d"), false);
  assert.equal(isCaptureWindow("since=1970"), false);
});

test("empty labels explain the active evidence boundary", () => {
  assert.match(captureWindowEmptyLabel("since-review", "2026-07-20T00:00:00Z"), /since Jul 20/i);
  assert.equal(captureWindowEmptyLabel("14d", "2026-07-20T00:00:00Z"), "No commits in the last 14 days.");
});
