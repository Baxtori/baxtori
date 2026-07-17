import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import {
  canonicalRepository,
  canonicalizeRepositoryList,
  canonicalizeRepositoryStateRecord,
} from "./lib/repository-identity.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env.local"));
} catch {
  // The explicit process environment remains available in automation and CI.
}

const url = process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
const secret = process.env.FEEDBACK_API_SECRET?.trim();
const githubLogin = process.env.FEEDBACK_GITHUB_LOGIN?.trim();
if (!url || !secret || !githubLogin) throw new Error("Feedback export needs CONVEX_URL, FEEDBACK_API_SECRET, and FEEDBACK_GITHUB_LOGIN.");

const client = new ConvexHttpClient(url);
const [input, repositoryActivity, repositoryInventory] = await Promise.all([
  client.query(api.feedback.getCompilerInput, { githubLogin, secret }),
  client.query(api.repositoryActivity.getCompilerActivity, { githubLogin, secret }),
  client.query(api.repositoryInventory.getCompilerInventory, { githubLogin, secret }),
]);
const readerState = input.readerState ? {
  ...input.readerState,
  payload: {
    ...input.readerState.payload,
    activeMapRepository: canonicalRepository(input.readerState.payload.activeMapRepository),
    mapStates: canonicalizeRepositoryStateRecord(input.readerState.payload.mapStates),
    questionStates: canonicalizeRepositoryStateRecord(input.readerState.payload.questionStates),
    selectedRepositories: canonicalizeRepositoryList(input.readerState.payload.selectedRepositories),
  },
} : null;
const reviewRequests = input.reviewRequests
  .map((request) => ({ ...request, repository: canonicalRepository(request.repository) }))
  .sort((a, b) => a.createdAt - b.createdAt);
const topicThreads = input.topicThreads
  .map((thread) => ({
    ...thread,
    evidence: { ...thread.evidence, repository: canonicalRepository(thread.evidence.repository) },
  }))
  .sort((a, b) => a.createdAt - b.createdAt);
const queuedQuestions = input.queuedQuestions
  .map((question) => ({
    ...question,
    evidence: { ...question.evidence, repository: canonicalRepository(question.evidence.repository) },
  }))
  .sort((a, b) => a.createdAt - b.createdAt);
const output = {
  exportedAt: new Date().toISOString(),
  queuedQuestions,
  readerState,
  repositoryActivity,
  repositoryInventory,
  reviewRequests,
  topicThreads,
};

await writeFile(resolve(root, "data/feedback-input.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Exported reader state, ${repositoryInventory?.repositoryCount ?? 0} authorized repositories, ${repositoryActivity?.repositoryCount ?? 0} activity decisions, ${output.topicThreads.length} active topics, ${output.queuedQuestions.length} queued questions, and ${output.reviewRequests.length} queued review requests.`);
