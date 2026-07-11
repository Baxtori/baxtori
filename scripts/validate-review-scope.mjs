import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const scope = JSON.parse(await readFile(new URL("data/review-scope.json", root), "utf8"));
const sources = JSON.parse(await readFile(new URL("baxtori.sources.json", root), "utf8"));
const repositoryMap = JSON.parse(await readFile(new URL("data/repo-map.json", root), "utf8"));

if (!Date.parse(scope.updatedAt) || !Date.parse(scope.lastReviewedAt) || !scope.schedule || !Number.isInteger(scope.windowDays)) {
  throw new Error("Review scope needs valid timestamps, a schedule label, and an integer window.");
}
if (!Array.isArray(scope.repositories) || !scope.repositories.length) {
  throw new Error("Review scope needs at least one repository.");
}

const scheduled = new Set();
for (const repository of scope.repositories) {
  if (!repository.fullName?.includes("/") || !repository.name || scheduled.has(repository.fullName)) {
    throw new Error(`Invalid or duplicate scoped repository: ${repository.fullName}`);
  }
  if (!["core", "normal", "low"].includes(repository.priority) || !["mapped", "unmapped"].includes(repository.mapStatus)) {
    throw new Error(`${repository.fullName} has an invalid priority or map status.`);
  }
  if (repository.mapStatus === "mapped" && repository.fullName !== repositoryMap.repository) {
    throw new Error(`${repository.fullName} claims a map that is not present in data/repo-map.json.`);
  }
  scheduled.add(repository.fullName);
}

const configured = new Set(sources.repositories.map((repository) => repository.fullName));
const missingFromCollector = [...scheduled].filter((repository) => !configured.has(repository));
const missingFromScope = [...configured].filter((repository) => !scheduled.has(repository));
if (missingFromCollector.length || missingFromScope.length) {
  throw new Error(`Review scope and collector sources differ. Missing from collector: ${missingFromCollector.join(", ") || "none"}; missing from scope: ${missingFromScope.join(", ") || "none"}.`);
}

console.log(`Review scope is valid with ${scheduled.size} scheduled repositories.`);
