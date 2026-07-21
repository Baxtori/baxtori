import assert from "node:assert/strict";
import test from "node:test";
import { buildReaderTrail } from "../lib/reader-trail.ts";

const story = {
  brief: "A cache now survives repeated work.",
  codeEvidence: [{ endLine: 42, path: "lib/cache.ts", startLine: 12, title: "Memoize the parse" }],
  evidence: "One exact commit",
  files: ["lib/cache.ts"],
  id: "cache-story",
  project: "Baxtori",
  repository: "owner/repo",
  timing: "Jul 19",
  title: "The parser grew a memory.",
  tradeoff: "The cache needs an eviction boundary.",
  verify: "Run the parser twice.",
  verdict: "Worth understanding",
  whatChanged: "Parsing is memoized.",
  whyItMatters: "Repeated work becomes cheaper.",
};

const storyItem = {
  id: "story:cache-story",
  kind: "story",
  minutes: 4,
  priority: 100,
  reason: "This is the highest-value unread change.",
  repository: "owner/repo",
  targetId: "cache-story",
  title: story.title,
  view: "briefing",
};

function build(overrides = {}) {
  return buildReaderTrail({
    budgetMinutes: 10,
    editionId: "2026-07-19",
    items: [storyItem],
    plannedMinutes: 4,
    quietRepositories: ["owner/quiet"],
    stories: [story],
    totalItemCount: 3,
    ...overrides,
  });
}

test("builds a finite opening, reading path, and end", () => {
  const trail = build();

  assert.deepEqual(trail.scenes.map((scene) => scene.kind), ["opening", "story", "end"]);
  assert.equal(trail.scenes[0].nextTitle, story.title);
  assert.equal(trail.scenes[2].deferredCount, 2);
  assert.deepEqual(trail.scenes[2].quietRepositories, ["owner/quiet"]);
});

test("snapshots story and queue data instead of retaining mutable input", () => {
  const stories = [structuredClone(story)];
  const items = [structuredClone(storyItem)];
  const trail = build({ items, stories });

  stories[0].title = "Changed later";
  stories[0].files.push("lib/other.ts");
  items[0].title = "Changed later";

  const scene = trail.scenes[1];
  assert.equal(scene.kind, "story");
  assert.equal(scene.story.title, "The parser grew a memory.");
  assert.deepEqual(scene.story.files, ["lib/cache.ts"]);
  assert.equal(scene.item.title, "The parser grew a memory.");
});

test("keeps non-story Continue work as an explicit side path", () => {
  const area = {
    ...storyItem,
    id: "area:owner/repo:auth",
    kind: "area",
    targetId: "auth",
    title: "Authentication boundary",
    view: "map",
  };
  const trail = build({ items: [area], plannedMinutes: 5, stories: [] });

  assert.equal(trail.scenes[1].kind, "study");
  assert.equal(trail.scenes[1].item.title, "Authentication boundary");
});

test("makes a quiet edition a complete two-scene trail", () => {
  const trail = build({ items: [], plannedMinutes: 0, totalItemCount: 0 });

  assert.deepEqual(trail.scenes.map((scene) => scene.kind), ["opening", "end"]);
  assert.equal(trail.scenes[0].nextTitle, null);
  assert.match(trail.id, /quiet$/);
});
