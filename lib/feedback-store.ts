import { ConvexHttpClient } from "convex/browser";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import type { ReaderStatePayload } from "@/lib/feedback-contract";

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

export async function saveReaderFeedback(userId: string, githubLogin: string, payload: ReaderStatePayload) {
  const { client, secret } = getFeedbackClient();
  return client.mutation(api.feedback.saveReaderState, { githubLogin, payload, secret, userId });
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
