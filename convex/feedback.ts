import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  evidenceAddressValidator,
  questionReviewStateValidator,
  questionStatusValidator,
  readerStateValidator,
  topicOriginValidator,
  topicStatusValidator,
} from "./validators";

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
    const topicThreads = await ctx.db.query("topicThreads").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc").take(100);
    const threadQuestions = await ctx.db.query("threadQuestions").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc").take(200);
    return { reviewRequests, state, threadQuestions, topicThreads };
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

export const upsertTopicThread = mutation({
  args: {
    areaId: v.optional(v.string()),
    editionId: v.string(),
    evidence: evidenceAddressValidator,
    origin: topicOriginValidator,
    secret: v.string(),
    sourceKey: v.string(),
    storyId: v.string(),
    storyTitle: v.string(),
    title: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const existing = await ctx.db.query("topicThreads")
      .withIndex("by_user_source", (q) => q.eq("userId", args.userId).eq("sourceKey", args.sourceKey))
      .unique();
    const now = Date.now();
    const value = {
      ...(args.areaId ? { areaId: args.areaId } : {}),
      editionId: args.editionId,
      evidence: args.evidence,
      origin: args.origin,
      resolvedAt: null,
      snoozedUntil: null,
      sourceKey: args.sourceKey,
      status: "active" as const,
      storyId: args.storyId,
      storyTitle: args.storyTitle,
      title: args.title,
      updatedAt: now,
      userId: args.userId,
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return await ctx.db.get(existing._id);
    }
    const threadId = await ctx.db.insert("topicThreads", { ...value, createdAt: now });
    return await ctx.db.get(threadId);
  },
});

export const updateTopicThread = mutation({
  args: {
    secret: v.string(),
    snoozedUntil: v.union(v.number(), v.null()),
    status: topicStatusValidator,
    threadId: v.id("topicThreads"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== args.userId) throw new Error("Topic thread not found.");
    if (args.status === "snoozed" && !args.snoozedUntil) throw new Error("A snoozed topic needs a snooze date.");
    const now = Date.now();
    await ctx.db.patch(thread._id, {
      resolvedAt: args.status === "resolved" ? now : null,
      snoozedUntil: args.status === "snoozed" ? args.snoozedUntil : null,
      status: args.status,
      updatedAt: now,
    });
    return await ctx.db.get(thread._id);
  },
});

export const createThreadQuestion = mutation({
  args: {
    editionId: v.string(),
    evidence: evidenceAddressValidator,
    guidance: v.string(),
    lensId: v.string(),
    question: v.string(),
    reviewState: questionReviewStateValidator,
    secret: v.string(),
    storyId: v.string(),
    storyTitle: v.string(),
    threadId: v.id("topicThreads"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== args.userId) throw new Error("Topic thread not found.");
    if (args.reviewState === "considered") throw new Error("Only the compiler may mark a question considered.");
    if (thread.evidence.repository !== args.evidence.repository) throw new Error("Question evidence must stay in its topic repository.");
    const now = Date.now();
    const questionId = await ctx.db.insert("threadQuestions", {
      createdAt: now,
      editionId: args.editionId,
      evidence: args.evidence,
      guidance: args.guidance,
      lensId: args.lensId,
      question: args.question,
      resolvedAt: null,
      reviewState: args.reviewState,
      snoozedUntil: null,
      status: "open",
      storyId: args.storyId,
      storyTitle: args.storyTitle,
      threadId: args.threadId,
      updatedAt: now,
      userId: args.userId,
    });
    if (thread.status !== "active") {
      await ctx.db.patch(thread._id, { resolvedAt: null, snoozedUntil: null, status: "active", updatedAt: now });
    }
    return await ctx.db.get(questionId);
  },
});

export const updateThreadQuestion = mutation({
  args: {
    guidance: v.optional(v.string()),
    lensId: v.optional(v.string()),
    question: v.optional(v.string()),
    questionId: v.id("threadQuestions"),
    reviewState: v.optional(questionReviewStateValidator),
    secret: v.string(),
    snoozedUntil: v.optional(v.union(v.number(), v.null())),
    status: v.optional(questionStatusValidator),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const questionRecord = await ctx.db.get(args.questionId);
    if (!questionRecord || questionRecord.userId !== args.userId) throw new Error("Thread question not found.");
    if (args.reviewState === "considered") throw new Error("Only the compiler may mark a question considered.");
    if (args.status === "snoozed" && !args.snoozedUntil) throw new Error("A snoozed question needs a snooze date.");
    const now = Date.now();
    const patch: {
      guidance?: string;
      lensId?: string;
      question?: string;
      resolvedAt?: number | null;
      reviewState?: "considered" | "private" | "queued";
      snoozedUntil?: number | null;
      status?: "open" | "resolved" | "snoozed";
      updatedAt: number;
    } = { updatedAt: now };
    if (args.guidance !== undefined) patch.guidance = args.guidance;
    if (args.lensId !== undefined) patch.lensId = args.lensId;
    if (args.question !== undefined) patch.question = args.question;
    if (args.reviewState !== undefined) patch.reviewState = args.reviewState;
    if (args.status !== undefined) {
      patch.status = args.status;
      patch.resolvedAt = args.status === "resolved" ? now : null;
      patch.snoozedUntil = args.status === "snoozed" ? (args.snoozedUntil ?? null) : null;
    } else if (args.snoozedUntil !== undefined) {
      patch.snoozedUntil = args.snoozedUntil;
    }
    await ctx.db.patch(questionRecord._id, patch);
    return await ctx.db.get(questionRecord._id);
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
    const queuedQuestions = readerState
      ? (await ctx.db.query("threadQuestions").withIndex("by_user_review", (q) => q.eq("userId", readerState.userId).eq("reviewState", "queued")).collect())
        .filter((question) => question.status === "open")
      : [];
    const queuedThreadIds = new Set(queuedQuestions.map((question) => String(question.threadId)));
    const topicThreads = readerState
      ? (await ctx.db.query("topicThreads").withIndex("by_user_status", (q) => q.eq("userId", readerState.userId).eq("status", "active")).collect())
        .filter((thread) => thread.origin === "watch" || queuedThreadIds.has(String(thread._id)))
      : [];
    return { queuedQuestions, readerState, reviewRequests, topicThreads };
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

export const markThreadQuestionsConsidered = mutation({
  args: { questionIds: v.array(v.id("threadQuestions")), secret: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const now = Date.now();
    let considered = 0;
    for (const questionId of args.questionIds) {
      const questionRecord = await ctx.db.get(questionId);
      if (questionRecord?.reviewState === "queued" && questionRecord.status === "open") {
        await ctx.db.patch(questionId, { reviewState: "considered", updatedAt: now });
        considered += 1;
      }
    }
    return considered;
  },
});
