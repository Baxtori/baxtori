import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { repositoryActivityRecordValidator } from "./validators";

function verifySecret(secret: string) {
  const expected = process.env.FEEDBACK_API_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized repository activity request.");
}

export const beginActivitySync = mutation({
  args: {
    githubLogin: v.string(),
    secret: v.string(),
    since: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const current = await ctx.db.query("repositoryActivitySyncs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    const revision = Math.max(current?.completedRevision ?? 0, current?.pendingRevision ?? 0) + 1;
    const value = {
      githubLogin: args.githubLogin,
      pendingRevision: revision,
      since: args.since,
      updatedAt: Date.now(),
      userId: args.userId,
    };
    if (current) {
      await ctx.db.patch(current._id, value);
    } else {
      await ctx.db.insert("repositoryActivitySyncs", {
        ...value,
        completedRevision: 0,
        deferredCount: 0,
        halted: false,
        rateLimitReason: null,
        rateLimitRemaining: null,
        rateLimitResetAt: null,
        rateLimitRetryAt: null,
        repositoryCount: 0,
        requestBudget: 0,
        requestCount: 0,
      });
    }
    return { revision };
  },
});

export const saveActivityChunk = mutation({
  args: {
    chunkIndex: v.number(),
    githubLogin: v.string(),
    records: v.array(repositoryActivityRecordValidator),
    revision: v.number(),
    secret: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    if (!Number.isInteger(args.chunkIndex) || args.chunkIndex < 0) throw new Error("Invalid activity chunk index.");
    const sync = await ctx.db.query("repositoryActivitySyncs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!sync || sync.pendingRevision !== args.revision) throw new Error("Repository activity sync is not active.");
    const existing = await ctx.db.query("repositoryActivityChunks")
      .withIndex("by_user_revision_chunk", (q) => q
        .eq("userId", args.userId)
        .eq("revision", args.revision)
        .eq("chunkIndex", args.chunkIndex))
      .unique();
    const value = {
      chunkIndex: args.chunkIndex,
      githubLogin: args.githubLogin,
      records: args.records,
      revision: args.revision,
      updatedAt: Date.now(),
      userId: args.userId,
    };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("repositoryActivityChunks", value);
    return { chunkIndex: args.chunkIndex, repositoryCount: args.records.length };
  },
});

export const completeActivitySync = mutation({
  args: {
    chunkCount: v.number(),
    deferredCount: v.number(),
    halted: v.boolean(),
    rateLimitReason: v.union(v.string(), v.null()),
    rateLimitRemaining: v.union(v.number(), v.null()),
    rateLimitResetAt: v.union(v.string(), v.null()),
    rateLimitRetryAt: v.union(v.string(), v.null()),
    repositoryCount: v.number(),
    requestBudget: v.number(),
    requestCount: v.number(),
    revision: v.number(),
    secret: v.string(),
    since: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const integers = [args.chunkCount, args.deferredCount, args.repositoryCount, args.requestBudget, args.requestCount, args.revision];
    if (integers.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("Invalid activity sync totals.");
    const sync = await ctx.db.query("repositoryActivitySyncs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!sync || sync.pendingRevision !== args.revision) throw new Error("Repository activity sync is not active.");
    const chunks = await ctx.db.query("repositoryActivityChunks")
      .withIndex("by_user_revision", (q) => q.eq("userId", args.userId).eq("revision", args.revision))
      .collect();
    const indexes = new Set(chunks.map((chunk) => chunk.chunkIndex));
    const storedCount = chunks.reduce((total, chunk) => total + chunk.records.length, 0);
    if (chunks.length !== args.chunkCount || indexes.size !== args.chunkCount || storedCount !== args.repositoryCount) {
      throw new Error("Repository activity chunks are incomplete.");
    }
    for (let index = 0; index < args.chunkCount; index += 1) {
      if (!indexes.has(index)) throw new Error("Repository activity chunk sequence is incomplete.");
    }
    const updatedAt = Date.now();
    await ctx.db.patch(sync._id, {
      completedRevision: args.revision,
      deferredCount: args.deferredCount,
      halted: args.halted,
      pendingRevision: null,
      rateLimitReason: args.rateLimitReason,
      rateLimitRemaining: args.rateLimitRemaining,
      rateLimitResetAt: args.rateLimitResetAt,
      rateLimitRetryAt: args.rateLimitRetryAt,
      repositoryCount: args.repositoryCount,
      requestBudget: args.requestBudget,
      requestCount: args.requestCount,
      since: args.since,
      updatedAt,
    });
    const allChunks = await ctx.db.query("repositoryActivityChunks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const chunk of allChunks) {
      if (chunk.revision !== args.revision) await ctx.db.delete(chunk._id);
    }
    return { repositoryCount: args.repositoryCount, revision: args.revision, updatedAt };
  },
});

export const getCompilerActivity = query({
  args: { githubLogin: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const syncs = await ctx.db.query("repositoryActivitySyncs")
      .withIndex("by_login", (q) => q.eq("githubLogin", args.githubLogin))
      .collect();
    const sync = syncs.sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
    if (!sync || sync.completedRevision < 1) return null;
    const chunks = await ctx.db.query("repositoryActivityChunks")
      .withIndex("by_user_revision", (q) => q.eq("userId", sync.userId).eq("revision", sync.completedRevision))
      .collect();
    chunks.sort((left, right) => left.chunkIndex - right.chunkIndex);
    const records = chunks.flatMap((chunk) => chunk.records);
    if (records.length !== sync.repositoryCount) throw new Error("Completed repository activity is inconsistent.");
    return {
      deferredCount: sync.deferredCount,
      halted: sync.halted,
      rateLimit: sync.rateLimitRetryAt ? {
        reason: sync.rateLimitReason,
        remaining: sync.rateLimitRemaining,
        resetAt: sync.rateLimitResetAt,
        retryAt: sync.rateLimitRetryAt,
      } : null,
      records,
      repositoryCount: sync.repositoryCount,
      requestBudget: sync.requestBudget,
      requestCount: sync.requestCount,
      revision: sync.completedRevision,
      since: sync.since,
      updatedAt: sync.updatedAt,
    };
  },
});
