from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {old[:80]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "convex/schema.ts",
    "  readerStateValidator,\n  reviewStatusValidator,",
    "  readerStateValidator,\n  repositoryInventoryEntryValidator,\n  reviewStatusValidator,",
)
replace_once(
    "convex/schema.ts",
    '''  readerStates: defineTable({
    githubLogin: v.string(),
    payload: readerStateValidator,
    revision: v.number(),
    updatedAt: v.number(),
    userId: v.string(),
  }).index("by_user", ["userId"]),
  topicThreads: defineTable({''',
    '''  readerStates: defineTable({
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
  topicThreads: defineTable({''',
)

replace_once(
    "lib/feedback-store.ts",
    'import type { ReaderStatePayload } from "@/lib/feedback-contract";\n',
    'import type { ReaderStatePayload } from "@/lib/feedback-contract";\nimport { repositoryInventoryFromLibrary, type RepositoryInventorySource } from "@/lib/repository-inventory";\n',
)
replace_once(
    "lib/feedback-store.ts",
    "let feedbackClient: ConvexHttpClient | null = null;\n",
    "const REPOSITORY_INVENTORY_CHUNK_SIZE = 200;\nlet feedbackClient: ConvexHttpClient | null = null;\n",
)
replace_once(
    "lib/feedback-store.ts",
    '''export async function saveReaderFeedback(userId: string, githubLogin: string, payload: ReaderStatePayload) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.saveReaderState, { githubLogin, payload, secret, userId });
}
''',
    '''export async function saveReaderFeedback(userId: string, githubLogin: string, payload: ReaderStatePayload) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.saveReaderState, { githubLogin, payload, secret, userId });
}

export async function saveAuthorizedRepositoryInventory(userId: string, githubLogin: string, repositories: RepositoryInventorySource[], truncated: boolean) {
  const inventory = repositoryInventoryFromLibrary(repositories);
  const { client, secret } = getFeedbackClient();
  const { revision } = await client.mutation(api.repositoryInventory.beginInventorySync, { githubLogin, secret, userId });
  const chunks = Array.from(
    { length: Math.ceil(inventory.length / REPOSITORY_INVENTORY_CHUNK_SIZE) },
    (_, index) => inventory.slice(index * REPOSITORY_INVENTORY_CHUNK_SIZE, (index + 1) * REPOSITORY_INVENTORY_CHUNK_SIZE),
  );
  for (const [chunkIndex, chunk] of chunks.entries()) {
    await client.mutation(api.repositoryInventory.saveInventoryChunk, {
      chunkIndex,
      githubLogin,
      repositories: chunk,
      revision,
      secret,
      userId,
    });
  }
  return client.mutation(api.repositoryInventory.completeInventorySync, {
    chunkCount: chunks.length,
    repositoryCount: inventory.length,
    revision,
    secret,
    truncated,
    userId,
  });
}
''',
)

replace_once(
    "app/api/github/repos/route.ts",
    'import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";\n',
    'import { feedbackIsConfigured, saveAuthorizedRepositoryInventory } from "@/lib/feedback-store";\nimport { getGitHubSession, withSessionCookie } from "@/lib/github-auth";\n',
)
replace_once(
    "app/api/github/repos/route.ts",
    '''    const library = await fetchGitHubRepositoryLibrary(session.accessToken);
    return withSessionCookie(Response.json(
      library,
''',
    '''    const library = await fetchGitHubRepositoryLibrary(session.accessToken);
    let inventorySaved = false;
    if (feedbackIsConfigured()) {
      try {
        await saveAuthorizedRepositoryInventory(String(session.user.id), session.user.login, library.repositories, library.truncated);
        inventorySaved = true;
      } catch {
        // Repository browsing remains available when account-backed inventory sync needs attention.
      }
    }
    return withSessionCookie(Response.json(
      { ...library, inventorySaved },
''',
)
replace_once(
    "app/api/github/repos/route.ts",
    '        repositories: [],\n        truncated: false,',
    '        inventorySaved: false,\n        repositories: [],\n        truncated: false,',
)

replace_once(
    "scripts/export-feedback.mjs",
    'const input = await client.query(api.feedback.getCompilerInput, { githubLogin, secret });',
    '''const [input, repositoryInventory] = await Promise.all([
  client.query(api.feedback.getCompilerInput, { githubLogin, secret }),
  client.query(api.repositoryInventory.getCompilerInventory, { githubLogin, secret }),
]);''',
)
replace_once(
    "scripts/export-feedback.mjs",
    '''  queuedQuestions,
  readerState,
  reviewRequests,
''',
    '''  queuedQuestions,
  readerState,
  repositoryInventory,
  reviewRequests,
''',
)
replace_once(
    "scripts/export-feedback.mjs",
    'console.log(`Exported reader state, ${output.topicThreads.length} active topics, ${output.queuedQuestions.length} queued questions, and ${output.reviewRequests.length} queued review requests.`);',
    'console.log(`Exported reader state, ${repositoryInventory?.repositoryCount ?? 0} authorized repositories, ${output.topicThreads.length} active topics, ${output.queuedQuestions.length} queued questions, and ${output.reviewRequests.length} queued review requests.`);',
)

replace_once(
    "scripts/lib/authorized-source-plan.mjs",
    '''  configuredSources,
  repositoryInventory = [],
  repositoryModes = {},''',
    '''  configuredSources,
  inventoryAvailable = repositoryInventory.length > 0,
  repositoryInventory = [],
  repositoryModes = {},''',
)
replace_once(
    "scripts/lib/authorized-source-plan.mjs",
    "  const inventoryIsCurrent = repositoryInventory.length > 0;",
    "  const inventoryIsCurrent = Boolean(inventoryAvailable);",
)

replace_once(
    "scripts/collect-backstory.mjs",
    'import { buildRepositoryReviewLedger, EDITION_SELECTION_PRIORITIES } from "./lib/edition-selection.mjs";\n',
    'import { buildAuthorizedSourcePlan } from "./lib/authorized-source-plan.mjs";\nimport { buildRepositoryReviewLedger, EDITION_SELECTION_PRIORITIES } from "./lib/edition-selection.mjs";\n',
)
replace_once(
    "scripts/collect-backstory.mjs",
    '''const requestedRepositories = readerFeedback?.readerState?.payload?.selectedRepositories;
const repositoryModes = readerFeedback?.readerState?.payload?.repositoryModes ?? {};
const selectedRepositorySet = Array.isArray(requestedRepositories) ? new Set(requestedRepositories) : null;
const configuredSources = selectedRepositorySet
  ? config.repositories.filter((source) => selectedRepositorySet.has(source.fullName))
  : config.repositories;
const unconfiguredSelections = Array.isArray(requestedRepositories)
  ? requestedRepositories.filter((repository) => !config.repositories.some((source) => source.fullName === repository))
  : [];
const repositories = configuredSources.map(collectRepository);''',
    '''const requestedRepositories = readerFeedback?.readerState?.payload?.selectedRepositories;
const repositoryModes = readerFeedback?.readerState?.payload?.repositoryModes ?? {};
const repositoryInventory = readerFeedback?.repositoryInventory ?? null;
const sourcePlan = buildAuthorizedSourcePlan({
  configuredSources: config.repositories,
  inventoryAvailable: repositoryInventory !== null,
  repositoryInventory: repositoryInventory?.repositories ?? [],
  repositoryModes,
  selectedRepositories: requestedRepositories,
});
const configuredSources = sourcePlan.sourcesToCollect;
const unconfiguredSelections = sourcePlan.unconfiguredSelections;
const repositories = configuredSources.map(collectRepository);''',
)
replace_once(
    "scripts/collect-backstory.mjs",
    '''  reviewLedger,
  periodEnd: new Date().toISOString().slice(0, 10),''',
    '''  reviewLedger,
  sourcePlan: {
    counts: sourcePlan.counts,
    entries: sourcePlan.entries,
    inventory: repositoryInventory ? {
      repositoryCount: repositoryInventory.repositoryCount,
      revision: repositoryInventory.revision,
      truncated: repositoryInventory.truncated,
      updatedAt: repositoryInventory.updatedAt,
    } : null,
    inventoryIsCurrent: sourcePlan.inventoryIsCurrent,
    requestedRepositories: sourcePlan.requestedRepositories,
  },
  periodEnd: new Date().toISOString().slice(0, 10),''',
)
replace_once(
    "scripts/collect-backstory.mjs",
    'console.log(`Collected ${reviewLedger.inspectedCount} configured repositories from ${reviewLedger.requestedCount} requested sources.`);',
    'console.log(`Source plan: ${sourcePlan.counts["configured-cache"]} configured caches; ${sourcePlan.counts["metadata-only"]} metadata-only; ${sourcePlan.counts["authorization-missing"]} missing authorization; ${sourcePlan.counts.muted} not scheduled.`);\nconsole.log(`Collected ${reviewLedger.inspectedCount} configured repositories from ${reviewLedger.requestedCount} requested sources.`);',
)
