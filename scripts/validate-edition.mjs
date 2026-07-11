import { readFile } from "node:fs/promises";

const edition = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
const requiredEditionFields = ["id", "generatedAt", "periodStart", "periodEnd", "stories", "quietRepositories"];
const requiredStoryFields = [
  "id", "project", "repository", "tone", "timing", "title", "brief", "learningValue", "verdict",
  "whatChanged", "whyItMatters", "verify", "tradeoff", "evidence", "files", "commits",
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
}

console.log(`Edition ${edition.id} is valid with ${edition.stories.length} stories.`);
