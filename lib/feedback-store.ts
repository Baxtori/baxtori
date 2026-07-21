import { ConvexHttpClient } from "convex/browser";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import type { ReaderStatePayload } from "@/lib/feedback-contract";
import { repositoryInventoryFromLibrary, type RepositoryInventorySource } from "@/lib/repository-inventory";
import type { ThreadQuestionInput, ThreadQuestionUpdate, TopicThreadInput, TopicThreadUpdate } from "@/lib/topic-contract";

const REPOSITORY_INVENTORY_CHUNK_SIZE = 200;
let feedbackClient: ConvexHttpClient | null = null;

function feedbackConfig() {
  const url = process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const secret = process.env.FEEDBACK_API_SECRET?.trim();
  return url && secret ? { secret, url } : null;
}

function getFeedbackClient() {
  const config = feedbackConfig();
  if (!config) throw new Error("Account sync is not configured.");
  if (!feedbackClient) feedbackClient = new ConvexHttpClient(config.url);
  return { client: feedbackClient, secret: config.secret };
}

export function feedbackIsConfigured() {
  return Boolean(feedbackConfig());
}

export async function getReaderFeedback(userId: string) {
  const { client, secret } = getFeedbackClient();
  return client.query(api.feedback.getReaderState, { secret, userId });
}

export async function exportReaderAccount(userId: string) {
  const { client, secret } = getFeedbackClient();
  return client.query(api.feedback.getAccountExport, { secret, userId });
}

export async function deleteReaderAccount(userId: string) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.deleteReaderAccount, { secret, userId });
}

export async function saveReaderFeedback(userId: string, githubLogin: string, payload: ReaderStatePayload, baseRevision?: number) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.saveReaderState, { baseRevision, githubLogin, payload, secret, userId });
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

export async function queueReviewFeedback(userId: string, request: {
  editionId: string;
  guidance: string;
  lensId: string;
  lensInstruction: string;
  lensLabel: string;
  repository: string;
  storyId: string;
  storyTitle: string;
}) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.queueReviewRequest, { ...request, secret, userId });
}

export async function cancelReviewFeedback(userId: string, requestId: string) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.cancelReviewRequest, {
    requestId: requestId as Id<"reviewRequests">,
    secret,
    userId,
  });
}

export async function upsertTopicFeedback(userId: string, thread: TopicThreadInput) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.upsertTopicThread, { ...thread, secret, userId });
}

export async function updateTopicFeedback(userId: string, update: TopicThreadUpdate) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.updateTopicThread, {
    ...update,
    secret,
    threadId: update.threadId as Id<"topicThreads">,
    userId,
  });
}

export async function createQuestionFeedback(userId: string, question: ThreadQuestionInput) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.createThreadQuestion, {
    ...question,
    secret,
    threadId: question.threadId as Id<"topicThreads">,
    userId,
  });
}

export async function updateQuestionFeedback(userId: string, update: ThreadQuestionUpdate) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.updateThreadQuestion, {
    ...update,
    questionId: update.questionId as Id<"threadQuestions">,
    secret,
    userId,
  });
}
