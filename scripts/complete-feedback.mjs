import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env.local"));
} catch {
  // The explicit process environment remains available in automation and CI.
}

const input = JSON.parse(await readFile(resolve(root, "data/feedback-input.json"), "utf8"));
const requestedIds = new Set(process.argv.slice(2));
const requestIds = (input.reviewRequests ?? [])
  .filter((request) => requestedIds.has(request._id))
  .map((request) => request._id);
const questionIds = (input.queuedQuestions ?? [])
  .filter((question) => requestedIds.has(question._id))
  .map((question) => question._id);
const matchedIds = new Set([...requestIds, ...questionIds]);
if (!matchedIds.size) {
  console.log("No matching queued feedback to complete.");
  process.exit(0);
}
if (matchedIds.size !== requestedIds.size) throw new Error("A completion ID was not present in the exported feedback queue.");

const url = process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
const secret = process.env.FEEDBACK_API_SECRET?.trim();
if (!url || !secret) throw new Error("Feedback completion needs CONVEX_URL and FEEDBACK_API_SECRET.");

const client = new ConvexHttpClient(url);
if (requestIds.length) await client.mutation(api.feedback.markReviewRequestsProcessed, { requestIds, secret });
if (questionIds.length) await client.mutation(api.feedback.markThreadQuestionsConsidered, { questionIds, secret });
console.log(`Completed ${requestIds.length} review requests and marked ${questionIds.length} questions considered.`);
