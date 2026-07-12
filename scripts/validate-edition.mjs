import { readFile } from "node:fs/promises";

const edition = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
const requiredEditionFields = ["id", "generatedAt", "periodStart", "periodEnd", "stories", "quietRepositories"];
const requiredStoryFields = [
  "id", "project", "repository", "tone", "timing", "title", "brief", "learningValue", "verdict",
  "whatChanged", "whyItMatters", "verify", "tradeoff", "evidence", "files", "codeEvidence", "commits",
];

for (const field of requiredEditionFields) {
  if (!(field in edition)) throw new Error(`Edition is missing ${field}.`);
}
if (!Array.isArray(edition.stories) || edition.stories.length > 5) {
  throw new Error("Edition stories must be an array with at most five entries.");
}
for (const story of edition.stories) {
  for (const field of requiredStoryFields) {
    if (!(field in story)) throw new Error(`${story.id ?? "Story"} is missing ${field}.`);
  }
  if (!["blue", "green", "rust"].includes(story.tone)) throw new Error(`${story.id} has an invalid tone.`);
  if (!Number.isInteger(story.learningValue) || story.learningValue < 1 || story.learningValue > 5) {
    throw new Error(`${story.id} has an invalid learning value.`);
  }
  if (!story.files.length || !story.commits.length) throw new Error(`${story.id} lacks evidence.`);
  if (!Array.isArray(story.codeEvidence) || !story.codeEvidence.length || story.codeEvidence.length > 4) {
    throw new Error(`${story.id} must include one to four code excerpts.`);
  }
  if (!story.commits.every((commit) => /^[0-9a-f]{7,40}$/i.test(commit.sha) && commit.url.includes(`github.com/${story.repository}/commit/`))) {
    throw new Error(`${story.id} has commit evidence that does not match its repository.`);
  }
  for (const excerpt of story.codeEvidence) {
    const validCommit = /^[0-9a-f]{7,40}$/i.test(excerpt.commit) && story.commits.some((commit) => commit.sha.startsWith(excerpt.commit) || excerpt.commit.startsWith(commit.sha));
    const validBaseCommit = /^[0-9a-f]{7,40}$/i.test(excerpt.baseCommit) && excerpt.baseCommit !== excerpt.commit;
    const validRange = Number.isInteger(excerpt.startLine) && Number.isInteger(excerpt.endLine) && excerpt.startLine >= 1 && excerpt.endLine >= excerpt.startLine && excerpt.endLine - excerpt.startLine < 160;
    if (!excerpt.title || !excerpt.why || !excerpt.path || !excerpt.language || !validBaseCommit || !validCommit || !validRange) {
      throw new Error(`${story.id} has invalid code evidence.`);
    }
  }
  if (story.title.length > 110 || story.brief.length > 320) {
    throw new Error(`${story.id} is too verbose for the briefing.`);
  }
}

console.log(`Edition ${edition.id} is valid with ${edition.stories.length} stories.`);
