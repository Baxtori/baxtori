import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  evidenceAddressValidator,
  questionReviewStateValidator,
  questionStatusValidator,
  readerStateValidator,
  repositoryInventoryEntryValidator,
  reviewStatusValidator,
  topicOriginValidator,
  topicStatusValidator,
} from "./validators";

export default defineSchema({
  readerStates: defineTable({
    githubLogin: v.string(),
    payload: readerStateValidator,
    revision: v.number(),
    updatedAt: v.number(),
    userId: v.string(),
  }).index("by_user", ["userId"]),
  repositoryInventoryChunks: defineTable({
    chunkIndex: v.number(),
    githubLogin: v.string(),
    repositories: v.array(repositoryInventoryEntryValidator),
    revision: v.number(),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_revision", ["userId", "revision"])
    .index("by_user_revision_chunk", ["userId", "revision", "chunkIndex"]),
  repositoryInventorySyncs: defineTable({
    completedRevision: v.number(),
    githubLogin: v.string(),
    pendingRevision: v.union(v.number(), v.null()),
    repositoryCount: v.number(),
    truncated: v.boolean(),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_login", ["githubLogin"]),
  topicThreads: defineTable({
    areaId: v.optional(v.string()),
    createdAt: v.number(),
    editionId: v.string(),
    evidence: evidenceAddressValidator,
    origin: topicOriginValidator,
    resolvedAt: v.union(v.number(), v.null()),
    snoozedUntil: v.union(v.number(), v.null()),
    sourceKey: v.string(),
    status: topicStatusValidator,
    storyId: v.string(),
    storyTitle: v.string(),
    title: v.string(),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_source", ["userId", "sourceKey"])
    .index("by_user_status", ["userId", "status"]),
  threadQuestions: defineTable({
    createdAt: v.number(),
    editionId: v.string(),
    evidence: evidenceAddressValidator,
    guidance: v.string(),
    lensId: v.string(),
    question: v.string(),
    resolvedAt: v.union(v.number(), v.null()),
    reviewState: questionReviewStateValidator,
    snoozedUntil: v.union(v.number(), v.null()),
    status: questionStatusValidator,
    storyId: v.string(),
    storyTitle: v.string(),
    threadId: v.id("topicThreads"),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_thread", ["threadId"])
    .index("by_user", ["userId"])
    .index("by_user_review", ["userId", "reviewState"])
    .index("by_user_status", ["userId", "status"]),
  reviewRequests: defineTable({
    createdAt: v.number(),
    editionId: v.string(),
    guidance: v.string(),
    lensId: v.string(),
    lensInstruction: v.string(),
    lensLabel: v.string(),
    repository: v.string(),
    status: reviewStatusValidator,
    storyId: v.string(),
    storyTitle: v.string(),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"]),
});
