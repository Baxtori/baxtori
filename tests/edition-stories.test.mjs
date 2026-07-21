import assert from "node:assert/strict";
import test from "node:test";
import { storiesForEdition } from "../lib/edition-stories.ts";

test("keeps a quiet published edition empty", () => {
  const previewStories = [{ id: "fixture" }];
  assert.deepEqual(storiesForEdition([], { enabled: false, stories: previewStories }), []);
});

test("uses fixtures only when preview mode is explicit", () => {
  const publishedStories = [{ id: "published" }];
  const previewStories = [{ id: "fixture" }];

  assert.deepEqual(
    storiesForEdition(publishedStories, { enabled: true, stories: previewStories }),
    previewStories,
  );
});
