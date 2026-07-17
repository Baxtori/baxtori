import { canonicalRepository } from "./repository-identity.mjs";

const MODES = new Set(["automatic", "muted", "pinned"]);
const STATUS_ORDER = new Map([
  ["configured-cache", 0],
  ["metadata-only", 1],
  ["authorization-missing", 2],
  ["muted", 3],
]);

function uniqueRepositories(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(canonicalRepository))];
}

function normalizedMode(repositoryModes, repository, archived = false) {
  const mode = repositoryModes?.[repository];
  if (MODES.has(mode)) return mode;
  return archived ? "muted" : "automatic";
}

export function buildAuthorizedSourcePlan({
  configuredSources,
  repositoryInventory = [],
  repositoryModes = {},
  selectedRepositories = null,
}) {
  if (!Array.isArray(configuredSources)) throw new Error("configuredSources must be an array.");
  if (!Array.isArray(repositoryInventory)) throw new Error("repositoryInventory must be an array.");

  const configuredByRepository = new Map(configuredSources.map((source) => [canonicalRepository(source.fullName), source]));
  const inventoryByRepository = new Map(repositoryInventory.map((entry) => {
    const fullName = canonicalRepository(entry.fullName);
    return [fullName, { ...entry, fullName }];
  }));
  const inventoryIsCurrent = repositoryInventory.length > 0;
  const requested = Array.isArray(selectedRepositories)
    ? uniqueRepositories(selectedRepositories)
    : inventoryIsCurrent
      ? [...inventoryByRepository.values()]
        .filter((entry) => normalizedMode(repositoryModes, entry.fullName, entry.archived) !== "muted")
        .map((entry) => entry.fullName)
      : [...configuredByRepository.keys()];
  const requestedSet = new Set(requested);
  const entries = [];

  for (const entry of inventoryByRepository.values()) {
    const mode = normalizedMode(repositoryModes, entry.fullName, entry.archived);
    const configuredSource = configuredByRepository.get(entry.fullName) ?? null;
    const eligible = requestedSet.has(entry.fullName) && mode !== "muted";
    if (!eligible) {
      entries.push({
        archived: entry.archived,
        collect: false,
        defaultBranch: entry.defaultBranch,
        fork: entry.fork,
        fullName: entry.fullName,
        mode,
        private: entry.private,
        pushedAt: entry.pushedAt,
        reason: mode === "muted"
          ? "Muted repositories remain in the authorized library but do not enter scheduled collection."
          : "This repository is not in the current scheduled review set.",
        sourceStatus: "muted",
      });
      continue;
    }
    if (configuredSource) {
      entries.push({
        archived: entry.archived,
        collect: true,
        defaultBranch: entry.defaultBranch,
        fork: entry.fork,
        fullName: entry.fullName,
        mode,
        private: entry.private,
        pushedAt: entry.pushedAt,
        reason: "Authorized repository with a configured inspectable source cache.",
        sourceStatus: "configured-cache",
      });
      continue;
    }
    entries.push({
      archived: entry.archived,
      collect: false,
      defaultBranch: entry.defaultBranch,
      fork: entry.fork,
      fullName: entry.fullName,
      mode,
      private: entry.private,
      pushedAt: entry.pushedAt,
      reason: "Authorized metadata is available, but no source cache can yet provide exact code evidence.",
      sourceStatus: "metadata-only",
    });
  }

  for (const repository of requested) {
    if (inventoryByRepository.has(repository)) continue;
    const configuredSource = configuredByRepository.get(repository) ?? null;
    const mode = normalizedMode(repositoryModes, repository);
    const canUseLegacyCache = !inventoryIsCurrent && configuredSource && mode !== "muted";
    entries.push({
      archived: false,
      collect: Boolean(canUseLegacyCache),
      defaultBranch: configuredSource?.branch ?? null,
      fork: false,
      fullName: repository,
      mode,
      private: null,
      pushedAt: null,
      reason: canUseLegacyCache
        ? "No authorized inventory has been exported yet; preserving the existing configured-cache behavior."
        : inventoryIsCurrent
          ? "The repository is selected in saved state but absent from the latest authorized inventory."
          : "Selected repository has no configured source cache and no authorized inventory metadata.",
      sourceStatus: canUseLegacyCache ? "configured-cache" : "authorization-missing",
    });
  }

  const modeRank = { pinned: 0, automatic: 1, muted: 2 };
  entries.sort((left, right) =>
    modeRank[left.mode] - modeRank[right.mode]
    || STATUS_ORDER.get(left.sourceStatus) - STATUS_ORDER.get(right.sourceStatus)
    || left.fullName.localeCompare(right.fullName));

  const collectedNames = new Set(entries.filter((entry) => entry.collect).map((entry) => entry.fullName));
  const sourcesToCollect = configuredSources.filter((source) => collectedNames.has(canonicalRepository(source.fullName)));
  const unconfiguredSelections = entries
    .filter((entry) => requestedSet.has(entry.fullName) && ["metadata-only", "authorization-missing"].includes(entry.sourceStatus))
    .map((entry) => entry.fullName);
  const counts = entries.reduce((result, entry) => {
    result[entry.sourceStatus] += 1;
    return result;
  }, { "authorization-missing": 0, "configured-cache": 0, "metadata-only": 0, muted: 0 });

  return {
    counts,
    entries,
    inventoryIsCurrent,
    requestedRepositories: requested,
    sourcesToCollect,
    unconfiguredSelections,
  };
}
