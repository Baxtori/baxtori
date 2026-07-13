import { v } from "convex/values";

export const storyStateValidator = v.object({
  expanded: v.boolean(),
  locked: v.boolean(),
  muted: v.boolean(),
  reviewGuidance: v.string(),
  reviewLens: v.string(),
  reviewRequestedAt: v.union(v.string(), v.null()),
  revising: v.boolean(),
  understood: v.boolean(),
  watching: v.boolean(),
});

export const readerStateValidator = v.object({
  activeMapRepository: v.string(),
  editionId: v.string(),
  hideUnderstood: v.boolean(),
  mapStates: v.record(v.string(), v.union(
    v.literal("introduced"),
    v.literal("revisit"),
    v.literal("skipped"),
    v.literal("understood"),
    v.literal("unexplored"),
  )),
  questionStates: v.record(v.string(), v.union(
    v.literal("irrelevant"),
    v.literal("open"),
    v.literal("resolved"),
  )),
  selectedRepositories: v.array(v.string()),
  states: v.record(v.string(), storyStateValidator),
  version: v.literal(1),
  view: v.union(v.literal("briefing"), v.literal("map"), v.literal("repositories"), v.literal("timeline")),
});

export const reviewStatusValidator = v.union(
  v.literal("canceled"),
  v.literal("processed"),
  v.literal("queued"),
  v.literal("superseded"),
);
