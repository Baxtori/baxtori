import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEditionSelectionRecord } from "./lib/edition-selection-record.mjs";
import { validateEditionGitEvidence } from "./lib/git-evidence-validation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [edition, sources] = await Promise.all([
  readFile(resolve(root, "data/latest.json"), "utf8").then(JSON.parse),
  readFile(resolve(root, "baxtori.sources.json"), "utf8").then(JSON.parse),
]);
const requiredEditionFields = ["id", "generatedAt", "periodStart", "periodEnd", "stories", "quietRepositories"];
const requiredStoryFields = [
  "id", "topicId", "project", "repository", "tone", "timing", "title", "brief", "learningValue", "verdict",
  "whatChanged", "whyItMatters", "verify", "tradeoff", "evidence", "files", "codeEvidence", "commits",
];
const fullCommitSha = /^[0-9a-f]{40}$/i;

for (const field of requiredEditionFields) {
  if (!(field in edition)) throw new Error(`Edition is missing ${field}.`);
}
if (!Array.isArray(edition.stories)) {
  throw new Error("Edition stories must be an array.");
}
const storyIds = new Set();
validateEditionSelectionRecord(edition.selection, edition.stories, edition.quietRepositories);

for (const story of edition.stories) {
  for (const field of requiredStoryFields) {
    if (!(field in story)) throw new Error(`${story.id ?? "Story"} is missing ${field}.`);
  }
  if (storyIds.has(story.id)) throw new Error(`Edition contains duplicate story ID ${story.id}.`);
  storyIds.add(story.id);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story.topicId) || story.topicId.length > 120) throw new Error(`${story.id} has an invalid topic ID.`);
  if (!["blue", "green", "rust"].includes(story.tone)) throw new Error(`${story.id} has an invalid tone.`);
  if (!Number.isInteger(story.learningValue) || story.learningValue < 1 || story.learningValue > 5) {
    throw new Error(`${story.id} has an invalid learning value.`);
  }
  if (!story.files.length || !story.commits.length) throw new Error(`${story.id} lacks evidence.`);
  if (!Array.isArray(story.codeEvidence) || !story.codeEvidence.length || story.codeEvidence.length > 4) {
    throw new Error(`${story.id} must include one to four code excerpts.`);
  }
  if (!story.commits.every((commit) => fullCommitSha.test(commit.sha) && commit.url.includes(`github.com/${story.repository}/commit/`))) {
    throw new Error(`${story.id} has commit evidence that does not match its repository or use a full commit hash.`);
  }
  for (const excerpt of story.codeEvidence) {
    const validCommit = fullCommitSha.test(excerpt.commit) && story.commits.some((commit) => commit.sha === excerpt.commit);
    const validBaseCommit = fullCommitSha.test(excerpt.baseCommit) && excerpt.baseCommit !== excerpt.commit;
    const validRange = Number.isInteger(excerpt.startLine) && Number.isInteger(excerpt.endLine) && excerpt.startLine >= 1 && excerpt.endLine >= excerpt.startLine && excerpt.endLine - excerpt.startLine < 160;
    if (!excerpt.title || !excerpt.why || !excerpt.path || !excerpt.language || !validBaseCommit || !validCommit || !validRange) {
      throw new Error(`${story.id} has invalid code evidence.`);
    }
  }
  if (story.title.length > 110 || story.brief.length > 320) {
    throw new Error(`${story.id} is too verbose for the briefing.`);
  }
}

const gitEvidence = await validateEditionGitEvidence({
  edition,
  root,
  sources,
  strict: process.env.STRICT_EVIDENCE_VALIDATION === "1",
});

console.log(`Edition ${edition.id} is valid with ${edition.stories.length} stories and ${gitEvidence.excerptCount} Git-checked excerpts.`);
if (gitEvidence.skippedRepositories.length) {
  console.warn(`Git evidence skipped for unavailable caches: ${gitEvidence.skippedRepositories.join(", ")}. Run edition:validate:strict before publishing.`);
}
