import { writeFile } from "node:fs/promises";
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

const url = process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
const secret = process.env.FEEDBACK_API_SECRET?.trim();
const githubLogin = process.env.FEEDBACK_GITHUB_LOGIN?.trim();
if (!url || !secret || !githubLogin) throw new Error("Feedback export needs CONVEX_URL, FEEDBACK_API_SECRET, and FEEDBACK_GITHUB_LOGIN.");

const client = new ConvexHttpClient(url);
const input = await client.query(api.feedback.getCompilerInput, { githubLogin, secret });
const output = {
  exportedAt: new Date().toISOString(),
  readerState: input.readerState,
  reviewRequests: input.reviewRequests.sort((a, b) => a.createdAt - b.createdAt),
};

await writeFile(resolve(root, "data/feedback-input.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Exported reader state and ${output.reviewRequests.length} queued review requests.`);
