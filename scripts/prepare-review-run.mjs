import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { arch, platform } from "node:process";
import { fileURLToPath } from "node:url";
import { buildPreparedReviewRun } from "./lib/review-run.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const candidatePath = resolve(root, "data/candidates.json");
const instructionPath = resolve(root, "codex/review-instructions.md");
const outputPath = resolve(root, "data/review-run.json");
const [candidateText, instructionText] = await Promise.all([
  readFile(candidatePath, "utf8"),
  readFile(instructionPath, "utf8"),
]);
const candidates = JSON.parse(candidateText);
const manifest = buildPreparedReviewRun({
  candidates,
  candidateText,
  instructionText,
  now: new Date(),
  runtime: {
    node: process.version,
    platform: `${platform}-${arch}`,
  },
});

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared review run ${manifest.runId} for ${manifest.sources.length} collected repositories.`);
console.log("Record model, Codex runtime, processed feedback IDs, and human edits before finalizing.");
