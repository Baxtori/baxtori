import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { readerStateValidator, reviewStatusValidator } from "./validators";

export default defineSchema({
  readerStates: defineTable({
    githubLogin: v.string(),
    payload: readerStateValidator,
    revision: v.number(),
    updatedAt: v.number(),
    userId: v.string(),
  }).index("by_user", ["userId"]),
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
