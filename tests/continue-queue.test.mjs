import assert from "node:assert/strict";
import test from "node:test";
import { buildContinueQueue, planContinueQueue } from "../lib/continue-queue.ts";

const stories = [{
  id: "auth-story",
  learningValue: 5,
  project: "Auth",
  repository: "owner/repo",
  title: "Authentication moved to one boundary.",
}, {
  id: "cache-story",
  learningValue: 3,
  project: "Cache",
  repository: "owner/repo",
  title: "Cache invalidation is explicit.",
}];

const repositoryMaps = [{
  repository: "owner/repo",
  areas: [{
    freshness: 90,
    id: "auth",
    importance: 5,
    name: "Authentication",
    purpose: "Understand the request boundary.",
    walkthrough: { estimatedMinutes: 12, outcome: "Follow one signed request." },
  }, {
    freshness: 70,
    id: "cache",
    importance: 3,
    name: "Caching",
    purpose: "Understand invalidation.",
  }],
  questions: [{
    areaId: "auth",
    id: "session-expiry",
    question: "What happens when a session expires mid-request?",
    status: "open",
    whyItMatters: "The fallback path is not yet explicit.",
  }],
}];

function build(overrides = {}) {
  return buildContinueQueue({
    mapStates: {},
    questionStates: {},
    repositoryMaps,
    reviewRequests: [],
    stories,
    storyStates: {},
    ...overrides,
  });
}

test("ranks one deterministic queue across stories, map areas, and questions", () => {
  const queue = build({
    mapStates: { "owner/repo:auth": "revisit" },
    storyStates: { "cache-story": { understood: true, watching: true } },
  });

  assert.deepEqual(queue.slice(0, 4).map((item) => item.id), [
    "story:auth-story",
    "area:owner/repo:auth",
    "question:owner/repo:session-expiry",
    "area:owner/repo:cache",
  ]);
  assert.equal(queue[0].reason, "Unread story from the current edition.");
  assert.equal(queue.find((item) => item.kind === "area")?.minutes, 5);
});

test("keeps understood watches in memory without making them permanent Continue work", () => {
  const queue = build({
    mapStates: { auth: "understood", cache: "skipped" },
    questionStates: { "owner/repo:session-expiry": "resolved" },
    storyStates: {
      "auth-story": { understood: true, watching: true },
      "cache-story": { understood: true },
    },
  });

  assert.deepEqual(queue, []);
});

test("honors dismiss, lock, understanding, and question dispositions", () => {
  const queue = build({
    mapStates: { auth: "understood", cache: "skipped" },
    questionStates: { "owner/repo:session-expiry": "resolved" },
    storyStates: {
      "auth-story": { muted: true },
      "cache-story": { locked: true, muted: true },
    },
  });

  assert.deepEqual(queue.map((item) => item.id), ["story:cache-story"]);
  assert.match(queue[0].reason, /pinned/i);
});

test("surfaces queued re-reviews only when they still need context", () => {
  const request = {
    guidance: "",
    repository: "owner/repo",
    status: "queued",
    storyId: "auth-story",
    storyTitle: "Authentication moved to one boundary.",
  };
  const queue = build({
    reviewRequests: [request, { ...request, guidance: "Check token rotation.", storyId: "cache-story" }],
    storyStates: {
      "auth-story": { understood: true },
      "cache-story": { understood: true },
    },
  });

  assert.equal(queue.filter((item) => item.kind === "review").length, 1);
  assert.equal(queue.find((item) => item.kind === "review")?.targetId, "auth-story");
});

test("packs the ranked queue into a selected time budget", () => {
  const queue = build();
  const fiveMinutes = planContinueQueue(queue, 5);
  const fifteenMinutes = planContinueQueue(queue, 15);

  assert.equal(fiveMinutes.plannedMinutes, 5);
  assert.equal(fiveMinutes.items.length, 1);
  assert.ok(fifteenMinutes.plannedMinutes <= 15);
  assert.ok(fifteenMinutes.items.length > fiveMinutes.items.length);
  assert.deepEqual(fifteenMinutes.items, queue.slice(0, fifteenMinutes.items.length));
});

test("canonicalizes legacy Baxtori repository identities at the queue boundary", () => {
  const queue = build({
    repositoryMaps: [{ ...repositoryMaps[0], repository: "teamleaderleo/glimpse" }],
    stories: [],
  });

  assert.equal(queue[0].repository, "teamleaderleo/baxtori");
  assert.match(queue[0].id, /teamleaderleo\/baxtori/);
});
