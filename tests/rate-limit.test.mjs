import assert from "node:assert/strict";
import test from "node:test";
import { consumeRateLimit, rateLimitError, rateLimitHeaders } from "../lib/rate-limit.ts";

test("allows requests through the configured burst and then rejects", async () => {
  const policy = { limit: 2, windowMs: 60_000 };
  const subject = `reader-${crypto.randomUUID()}`;
  const first = consumeRateLimit("test", subject, policy, 1_000);
  const second = consumeRateLimit("test", subject, policy, 1_500);
  const third = consumeRateLimit("test", subject, policy, 2_000);

  assert.deepEqual(
    [first.allowed, second.allowed, third.allowed],
    [true, true, false],
  );
  assert.equal(third.remaining, 0);
  assert.equal(third.retryAfterSeconds, 59);

  const response = rateLimitError(third);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "59");
  assert.deepEqual(await response.json(), { error: "Too many requests. Try again shortly." });
});

test("opens a new window after the reset time", () => {
  const policy = { limit: 1, windowMs: 10_000 };
  const subject = `reader-${crypto.randomUUID()}`;

  assert.equal(consumeRateLimit("test", subject, policy, 5_000).allowed, true);
  assert.equal(consumeRateLimit("test", subject, policy, 5_001).allowed, false);
  const nextWindow = consumeRateLimit("test", subject, policy, 15_000);
  assert.equal(nextWindow.allowed, true);
  assert.equal(nextWindow.remaining, 0);
});

test("exposes standard limit headers for successful responses", () => {
  const result = consumeRateLimit(
    "test",
    `reader-${crypto.randomUUID()}`,
    { limit: 5, windowMs: 1_000 },
    100,
  );
  const headers = rateLimitHeaders(result);

  assert.equal(headers.get("X-RateLimit-Limit"), "5");
  assert.equal(headers.get("X-RateLimit-Remaining"), "4");
  assert.equal(headers.has("Retry-After"), false);
});
