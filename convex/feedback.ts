import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { readerStateValidator } from "./validators";

function verifySecret(secret: string) {
  const expected = process.env.FEEDBACK_API_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized feedback request.");
}

export const getReaderState = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const state = await ctx.db.query("readerStates").withIndex("by_user", (q) => q.eq("userId", args.userId)).unique();
    const reviewRequests = await ctx.db.query("reviewRequests").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc").take(25);
    return { reviewRequests, state };
  },
});

export const saveReaderState = mutation({
  args: {
    githubLogin: v.string(),
    payload: readerStateValidator,
    secret: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const current = await ctx.db.query("readerStates").withIndex("by_user", (q) => q.eq("userId", args.userId)).unique();
    const revision = (current?.revision ?? 0) + 1;
    const value = {
      githubLogin: args.githubLogin,
      payload: args.payload,
      revision,
      updatedAt: Date.now(),
      userId: args.userId,
    };
    if (current) await ctx.db.patch(current._id, value);
    else await ctx.db.insert("readerStates", value);
    return { revision, updatedAt: value.updatedAt };
  },
});

export const queueReviewRequest = mutation({
  args: {
    editionId: v.string(),
    guidance: v.string(),
    lensId: v.string(),
    lensInstruction: v.string(),
    lensLabel: v.string(),
    repository: v.string(),
    secret: v.string(),
    storyId: v.string(),
    storyTitle: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const queued = await ctx.db.query("reviewRequests").withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "queued")).collect();
    const now = Date.now();
    for (const request of queued) {
      if (request.storyId === args.storyId && request.editionId === args.editionId) {
        await ctx.db.patch(request._id, { status: "superseded", updatedAt: now });
      }
    }
    const requestId = await ctx.db.insert("reviewRequests", {
      createdAt: now,
      editionId: args.editionId,
      guidance: args.guidance,
      lensId: args.lensId,
      lensInstruction: args.lensInstruction,
      lensLabel: args.lensLabel,
      repository: args.repository,
      status: "queued",
      storyId: args.storyId,
      storyTitle: args.storyTitle,
      updatedAt: now,
      userId: args.userId,
    });
    return await ctx.db.get(requestId);
  },
});

export const cancelReviewRequest = mutation({
  args: { requestId: v.id("reviewRequests"), secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.userId !== args.userId) throw new Error("Review request not found.");
    if (request.status === "queued") await ctx.db.patch(request._id, { status: "canceled", updatedAt: Date.now() });
    return request._id;
  },
});

export const getCompilerInput = query({
  args: { githubLogin: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const matchingStates = (await ctx.db.query("readerStates").collect())
      .filter((state) => state.githubLogin.toLowerCase() === args.githubLogin.toLowerCase())
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const readerState = matchingStates[0] ?? null;
    const reviewRequests = readerState
      ? await ctx.db.query("reviewRequests").withIndex("by_user_status", (q) => q.eq("userId", readerState.userId).eq("status", "queued")).collect()
      : [];
    return { readerState, reviewRequests };
  },
});

export const markReviewRequestsProcessed = mutation({
  args: { requestIds: v.array(v.id("reviewRequests")), secret: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const now = Date.now();
    for (const requestId of args.requestIds) {
      const request = await ctx.db.get(requestId);
      if (request?.status === "queued") await ctx.db.patch(requestId, { status: "processed", updatedAt: now });
    }
    return args.requestIds.length;
  },
});
