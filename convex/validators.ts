import { v } from "convex/values";

export const repositoryModeValidator = v.union(
  v.literal("automatic"),
  v.literal("muted"),
  v.literal("pinned"),
);

export const repositoryInventoryEntryValidator = v.object({
  archived: v.boolean(),
  defaultBranch: v.string(),
  fork: v.boolean(),
  fullName: v.string(),
  id: v.number(),
  private: v.boolean(),
  pushedAt: v.union(v.string(), v.null()),
  updatedAt: v.string(),
});

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
  repositoryModes: v.record(v.string(), repositoryModeValidator),
  selectedRepositories: v.array(v.string()),
  states: v.record(v.string(), storyStateValidator),
  version: v.literal(1),
  view: v.union(v.literal("briefing"), v.literal("history"), v.literal("map"), v.literal("repositories"), v.literal("timeline")),
});

export const reviewStatusValidator = v.union(
  v.literal("canceled"),
  v.literal("processed"),
  v.literal("queued"),
  v.literal("superseded"),
);

export const evidenceAddressValidator = v.object({
  baseCommit: v.string(),
  endLine: v.number(),
  headCommit: v.string(),
  path: v.string(),
  repository: v.string(),
  startLine: v.number(),
});

export const topicOriginValidator = v.union(v.literal("question"), v.literal("watch"));
export const topicStatusValidator = v.union(v.literal("active"), v.literal("resolved"), v.literal("snoozed"));
export const questionStatusValidator = v.union(v.literal("open"), v.literal("resolved"), v.literal("snoozed"));
export const questionReviewStateValidator = v.union(v.literal("considered"), v.literal("private"), v.literal("queued"));
