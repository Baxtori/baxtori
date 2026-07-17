import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { repositoryInventoryEntryValidator } from "./validators";

function verifySecret(secret: string) {
  const expected = process.env.FEEDBACK_API_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized repository inventory request.");
}

async function completedInventory(ctx: Parameters<Parameters<typeof query>[0]["handler"]>[0], userId: string) {
  const sync = await ctx.db.query("repositoryInventorySyncs")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!sync || sync.completedRevision < 1) return null;
  const chunks = await ctx.db.query("repositoryInventoryChunks")
    .withIndex("by_user_revision", (q) => q.eq("userId", userId).eq("revision", sync.completedRevision))
    .collect();
  chunks.sort((left, right) => left.chunkIndex - right.chunkIndex);
  const repositories = chunks.flatMap((chunk) => chunk.repositories);
  if (repositories.length !== sync.repositoryCount) throw new Error("Completed repository inventory is inconsistent.");
  return {
    repositories,
    repositoryCount: sync.repositoryCount,
    revision: sync.completedRevision,
    truncated: sync.truncated,
    updatedAt: sync.updatedAt,
  };
}

export const beginInventorySync = mutation({
  args: {
    githubLogin: v.string(),
    secret: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const current = await ctx.db.query("repositoryInventorySyncs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    const revision = Math.max(current?.completedRevision ?? 0, current?.pendingRevision ?? 0) + 1;
    const value = {
      githubLogin: args.githubLogin,
      pendingRevision: revision,
      updatedAt: Date.now(),
      userId: args.userId,
    };
    if (current) {
      await ctx.db.patch(current._id, value);
    } else {
      await ctx.db.insert("repositoryInventorySyncs", {
        ...value,
        completedRevision: 0,
        repositoryCount: 0,
        truncated: false,
      });
    }
    return { revision };
  },
});

export const saveInventoryChunk = mutation({
  args: {
    chunkIndex: v.number(),
    githubLogin: v.string(),
    repositories: v.array(repositoryInventoryEntryValidator),
    revision: v.number(),
    secret: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    if (!Number.isInteger(args.chunkIndex) || args.chunkIndex < 0) throw new Error("Invalid inventory chunk index.");
    if (!Number.isInteger(args.revision) || args.revision < 1) throw new Error("Invalid inventory revision.");
    const sync = await ctx.db.query("repositoryInventorySyncs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!sync || sync.pendingRevision !== args.revision) throw new Error("Repository inventory sync is not active.");
    const existing = await ctx.db.query("repositoryInventoryChunks")
      .withIndex("by_user_revision_chunk", (q) => q
        .eq("userId", args.userId)
        .eq("revision", args.revision)
        .eq("chunkIndex", args.chunkIndex))
      .unique();
    const value = {
      chunkIndex: args.chunkIndex,
      githubLogin: args.githubLogin,
      repositories: args.repositories,
      revision: args.revision,
      updatedAt: Date.now(),
      userId: args.userId,
    };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("repositoryInventoryChunks", value);
    return { chunkIndex: args.chunkIndex, repositoryCount: args.repositories.length };
  },
});

export const completeInventorySync = mutation({
  args: {
    chunkCount: v.number(),
    repositoryCount: v.number(),
    revision: v.number(),
    secret: v.string(),
    truncated: v.boolean(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    if (!Number.isInteger(args.chunkCount) || args.chunkCount < 0) throw new Error("Invalid inventory chunk count.");
    if (!Number.isInteger(args.repositoryCount) || args.repositoryCount < 0) throw new Error("Invalid inventory repository count.");
    const sync = await ctx.db.query("repositoryInventorySyncs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!sync || sync.pendingRevision !== args.revision) throw new Error("Repository inventory sync is not active.");
    const chunks = await ctx.db.query("repositoryInventoryChunks")
      .withIndex("by_user_revision", (q) => q.eq("userId", args.userId).eq("revision", args.revision))
      .collect();
    const indexes = new Set(chunks.map((chunk) => chunk.chunkIndex));
    const storedCount = chunks.reduce((total, chunk) => total + chunk.repositories.length, 0);
    if (chunks.length !== args.chunkCount || indexes.size !== args.chunkCount || storedCount !== args.repositoryCount) {
      throw new Error("Repository inventory chunks are incomplete.");
    }
    for (let index = 0; index < args.chunkCount; index += 1) {
      if (!indexes.has(index)) throw new Error("Repository inventory chunk sequence is incomplete.");
    }
    const updatedAt = Date.now();
    await ctx.db.patch(sync._id, {
      completedRevision: args.revision,
      pendingRevision: null,
      repositoryCount: args.repositoryCount,
      truncated: args.truncated,
      updatedAt,
    });
    const allChunks = await ctx.db.query("repositoryInventoryChunks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const chunk of allChunks) {
      if (chunk.revision !== args.revision) await ctx.db.delete(chunk._id);
    }
    return { repositoryCount: args.repositoryCount, revision: args.revision, truncated: args.truncated, updatedAt };
  },
});

export const getReaderInventory = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    return completedInventory(ctx, args.userId);
  },
});

export const getCompilerInventory = query({
  args: { githubLogin: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    verifySecret(args.secret);
    const syncs = await ctx.db.query("repositoryInventorySyncs")
      .withIndex("by_login", (q) => q.eq("githubLogin", args.githubLogin))
      .collect();
    const sync = syncs.sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
    return sync ? completedInventory(ctx, sync.userId) : null;
  },
});
