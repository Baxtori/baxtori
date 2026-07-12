import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("data/repository-maps.json", root), "utf8"));
const requiredSignals = ["breadth", "depth", "confidence", "freshness"];

function validateMap(map, expectedRepository) {
  if (map.repository !== expectedRepository || !map.repository?.includes("/") || !map.summary || !Array.isArray(map.areas) || !map.areas.length) {
    throw new Error(`${expectedRepository} needs a matching repository, summary, and at least one mapped area.`);
  }

  if (!Array.isArray(map.questions)) throw new Error(`${map.repository} needs a question ledger.`);
  const areaIds = new Set(map.areas.map((area) => area.id));
  if (!Array.isArray(map.reviews)) throw new Error(`${map.repository} needs an append-only review history.`);
  for (const review of map.reviews) {
    const referencedAreas = [...(review.affectedAreaIds ?? []), ...(review.newAreaIds ?? [])];
    if (!review.id || !Date.parse(review.reviewedAt) || !review.summary || !review.throughCommit?.sha || !review.throughCommit?.url) {
      throw new Error(`Invalid map review in ${map.repository}: ${review.id}`);
    }
    if (!referencedAreas.length || referencedAreas.some((areaId) => !areaIds.has(areaId)) || !Array.isArray(review.unmappedFilesReviewed)) {
      throw new Error(`${review.id} has invalid area or unmapped-file references.`);
    }
  }
  for (const question of map.questions) {
    if (!question.id || !areaIds.has(question.areaId) || !question.question || !question.whyItMatters) {
      throw new Error(`Invalid repository question in ${map.repository}: ${question.id}`);
    }
    if (!["open", "resolved"].includes(question.status) || !question.evidence?.length) {
      throw new Error(`${question.id} lacks a valid status or evidence.`);
    }
  }

  const ids = new Set();
  for (const area of map.areas) {
    if (!area.id || ids.has(area.id)) throw new Error(`Duplicate or missing area id in ${map.repository}: ${area.id}`);
    ids.add(area.id);
    if (!area.name || !area.kind || !area.purpose || !area.verdict) throw new Error(`${area.id} lacks explanatory context.`);
    if (!Number.isInteger(area.importance) || area.importance < 1 || area.importance > 5) throw new Error(`${area.id} has invalid importance.`);
    if (!requiredSignals.every((signal) => Number.isFinite(area[signal]) && area[signal] >= 0 && area[signal] <= 100)) {
      throw new Error(`${area.id} has an invalid coverage signal.`);
    }
    if (!area.evidence?.length || !area.concepts?.length) throw new Error(`${area.id} lacks evidence or surfaced concepts.`);
    if (area.walkthrough) {
      if (!area.walkthrough.title || !area.walkthrough.outcome || !Number.isInteger(area.walkthrough.estimatedMinutes)) {
        throw new Error(`${area.id} has an invalid walkthrough summary.`);
      }
      if (!Array.isArray(area.walkthrough.steps) || area.walkthrough.steps.length < 2 || area.walkthrough.steps.some((step) =>
        !step.label || !step.file || !step.explanation || !step.invariant
      )) throw new Error(`${area.id} has an incomplete walkthrough.`);
      if (new Set(area.walkthrough.steps.map((step) => step.label)).size !== area.walkthrough.steps.length) {
        throw new Error(`${area.id} has duplicate walkthrough step labels.`);
      }
    }
  }
}

if (!Array.isArray(registry.maps) || !registry.maps.length) throw new Error("Repository map registry is empty.");
const repositories = new Set();
for (const entry of registry.maps) {
  if (!entry.repository?.includes("/") || !entry.path || repositories.has(entry.repository)) {
    throw new Error(`Invalid or duplicate map registry entry: ${entry.repository}`);
  }
  const map = JSON.parse(await readFile(new URL(entry.path, root), "utf8"));
  validateMap(map, entry.repository);
  repositories.add(entry.repository);
}

console.log(`Repository maps are valid for ${repositories.size} repositories.`);
