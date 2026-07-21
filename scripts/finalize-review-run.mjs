import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  instructionVersion,
  sha256Text,
  validatePreparedReviewRun,
} from "./lib/review-run.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "data/review-run.json");
const candidatePath = resolve(root, "data/candidates.json");
const instructionPath = resolve(root, "codex/review-instructions.md");
const latestPath = resolve(root, "data/latest.json");
const [manifestText, candidateText, instructionText, latestText] = await Promise.all([
  readFile(manifestPath, "utf8"),
  readFile(candidatePath, "utf8"),
  readFile(instructionPath, "utf8"),
  readFile(latestPath, "utf8"),
]);
const manifest = JSON.parse(manifestText);
const candidates = JSON.parse(candidateText);
const edition = JSON.parse(latestText);
validatePreparedReviewRun(manifest);

if (manifest.input.sha256 !== sha256Text(candidateText) || manifest.input.collectedAt !== candidates.collectedAt) {
  throw new Error("Candidate input changed after the review run was prepared.");
}
if (manifest.instruction.sha256 !== sha256Text(instructionText) || manifest.instruction.version !== instructionVersion(instructionText)) {
  throw new Error("Codex review instructions changed after the review run was prepared.");
}

async function runValidation(name, script, env = {}) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
    windowsHide: true,
  });
  return {
    command: `node ${script}`,
    name,
    output: `${stdout}${stderr}`.trim(),
    status: "passed",
  };
}

const validations = [];
validations.push(await runValidation("edition", "scripts/validate-edition.mjs", { STRICT_EVIDENCE_VALIDATION: "1" }));
validations.push(await runValidation("repository maps", "scripts/validate-repo-map.mjs"));
validations.push(await runValidation("review scope", "scripts/validate-review-scope.mjs"));
validations.push(await runValidation("review policy", "scripts/validate-review-policy.mjs"));

if (!edition.id || !/^\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?$/i.test(edition.id)) {
  throw new Error("Edition ID is not safe for an archive filename.");
}
const archiveRelativePath = `data/editions/${edition.id}.json`;
const archivePath = resolve(root, archiveRelativePath);
let archiveText = null;
try {
  archiveText = await readFile(archivePath, "utf8");
} catch (error) {
  if (!error || typeof error !== "object" || error.code !== "ENOENT") throw error;
}
if (archiveText !== null && sha256Text(archiveText) !== sha256Text(latestText)) {
  throw new Error(`${archiveRelativePath} already exists with different content.`);
}
if (archiveText === null) await writeFile(archivePath, latestText);

const completed = {
  ...manifest,
  completedAt: new Date().toISOString(),
  output: {
    archivePath: archiveRelativePath,
    editionId: edition.id,
    path: "data/latest.json",
    sha256: sha256Text(latestText),
  },
  validations,
};
const runsDirectory = resolve(root, "data/review-runs");
await mkdir(runsDirectory, { recursive: true });
const finalPath = resolve(runsDirectory, `${manifest.runId}.json`);
await writeFile(finalPath, `${JSON.stringify(completed, null, 2)}\n`, { flag: "wx" });

console.log(`Finalized review run ${manifest.runId} for edition ${edition.id}.`);
console.log(`Manifest: data/review-runs/${manifest.runId}.json`);
