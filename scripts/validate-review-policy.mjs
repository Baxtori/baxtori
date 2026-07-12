import { readFile } from "node:fs/promises";

const policy = JSON.parse(await readFile(new URL("../data/review-policy.json", import.meta.url), "utf8"));

if (!Number.isInteger(policy.version) || policy.version < 1 || !Date.parse(policy.updatedAt)) {
  throw new Error("Review policy needs a positive version and valid update time.");
}
if (!Array.isArray(policy.lenses) || policy.lenses.length < 2 || !Array.isArray(policy.preservedRules) || !policy.preservedRules.length) {
  throw new Error("Review policy needs multiple lenses and at least one preserved rule.");
}
const ids = new Set();
for (const lens of policy.lenses) {
  if (!lens.id || ids.has(lens.id) || !lens.label || !lens.instruction) throw new Error(`Invalid or duplicate review lens: ${lens.id}`);
  ids.add(lens.id);
}
if (!ids.has(policy.defaultLens)) throw new Error("Default review lens is not defined.");

console.log(`Review policy v${policy.version} is valid with ${ids.size} lenses.`);
