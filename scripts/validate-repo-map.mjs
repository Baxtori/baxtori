import { readFile } from "node:fs/promises";

const map = JSON.parse(await readFile(new URL("../data/repo-map.json", import.meta.url), "utf8"));
const requiredSignals = ["breadth", "depth", "confidence", "freshness"];

if (!map.repository?.includes("/") || !map.summary || !Array.isArray(map.areas) || !map.areas.length) {
  throw new Error("Repository map needs a repository, summary, and at least one mapped area.");
}

const ids = new Set();
for (const area of map.areas) {
  if (!area.id || ids.has(area.id)) throw new Error(`Duplicate or missing area id: ${area.id}`);
  ids.add(area.id);
  if (!area.name || !area.kind || !area.purpose || !area.verdict) throw new Error(`${area.id} lacks explanatory context.`);
  if (!Number.isInteger(area.importance) || area.importance < 1 || area.importance > 5) throw new Error(`${area.id} has invalid importance.`);
  if (!requiredSignals.every((signal) => Number.isFinite(area[signal]) && area[signal] >= 0 && area[signal] <= 100)) {
    throw new Error(`${area.id} has an invalid coverage signal.`);
  }
  if (!area.evidence?.length || !area.concepts?.length) throw new Error(`${area.id} lacks evidence or surfaced concepts.`);
}

console.log(`Repository map is valid with ${map.areas.length} areas.`);
