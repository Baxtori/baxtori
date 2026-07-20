const PRIORITY_ORDER = [
  "reader-directed",
  "significant-change",
  "useful-comprehension",
  "optional",
];

const PRIORITY_RANK = new Map(PRIORITY_ORDER.map((priority, index) => [priority, index]));
const REPOSITORY_MODES = new Set(["automatic", "muted", "pinned"]);

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string.`);
  return value.trim();
}

function requirePositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${field} must be a positive integer.`);
  return value;
}

function normalizedCandidate(candidate, index) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error(`Candidate ${index + 1} must be an object.`);
  }
  const priority = requireNonEmptyString(candidate.priority, `Candidate ${index + 1} priority`);
  if (!PRIORITY_RANK.has(priority)) throw new Error(`Candidate ${index + 1} has an unknown priority.`);
  if (typeof candidate.qualifies !== "boolean") throw new Error(`Candidate ${index + 1} must declare whether it qualifies.`);
  const reason = requireNonEmptyString(candidate.reason, `Candidate ${index + 1} reason`);
  return {
    ...candidate,
    estimatedMinutes: requirePositiveInteger(candidate.estimatedMinutes, `Candidate ${index + 1} estimatedMinutes`),
    id: requireNonEmptyString(candidate.id, `Candidate ${index + 1} id`),
    priority,
    qualifies: candidate.qualifies,
    reason,
    repository: requireNonEmptyString(candidate.repository, `Candidate ${index + 1} repository`),
    title: requireNonEmptyString(candidate.title, `Candidate ${index + 1} title`),
    _index: index,
  };
}

function publicCandidate(candidate, selectionReason) {
  const value = { ...candidate };
  delete value._index;
  return selectionReason ? { ...value, selectionReason } : value;
}

export function packEditionCandidates(candidates, readingBudgetMinutes) {
  if (!Array.isArray(candidates)) throw new Error("Edition candidates must be an array.");
  requirePositiveInteger(readingBudgetMinutes, "readingBudgetMinutes");
  const normalized = candidates.map(normalizedCandidate);
  const qualified = normalized
    .filter((candidate) => candidate.qualifies)
    .sort((left, right) => PRIORITY_RANK.get(left.priority) - PRIORITY_RANK.get(right.priority) || left._index - right._index);
  const excluded = normalized
    .filter((candidate) => !candidate.qualifies)
    .map((candidate) => publicCandidate(candidate, "Did not meet the publication threshold."));
  const included = [];
  const deferred = [];
  let plannedMinutes = 0;

  for (const candidate of qualified) {
    if (!included.length) {
      included.push(publicCandidate(candidate, candidate.estimatedMinutes > readingBudgetMinutes
        ? "Highest-priority qualifying finding; included alone despite exceeding the target budget."
        : "Highest-priority qualifying finding."));
      plannedMinutes += candidate.estimatedMinutes;
      continue;
    }
    if (plannedMinutes + candidate.estimatedMinutes <= readingBudgetMinutes) {
      included.push(publicCandidate(candidate, "Fits the remaining reading budget after higher-priority findings."));
      plannedMinutes += candidate.estimatedMinutes;
    } else {
      deferred.push(publicCandidate(candidate, "Qualified, but did not fit after higher-priority findings."));
    }
  }

  return {
    deferred,
    excluded,
    included,
    overBudgetMinutes: Math.max(0, plannedMinutes - readingBudgetMinutes),
    plannedMinutes,
    readingBudgetMinutes,
    qualifyingCount: qualified.length,
  };
}

function repositoryModeFor(repositoryModes, repository) {
  const mode = repositoryModes?.[repository] ?? "automatic";
  return REPOSITORY_MODES.has(mode) ? mode : "automatic";
}

function repositoryDecision(repository, repositoryModes) {
  const mode = repositoryModeFor(repositoryModes, repository.fullName);
  if (mode === "muted") {
    return {
      mode,
      reason: "Muted by the reader before scheduled collection.",
      repository: repository.fullName,
      status: "quiet",
    };
  }
  if (repository.error) {
    return {
      mode,
      reason: repository.error,
      repository: repository.fullName,
      status: "inaccessible",
    };
  }
  if (!repository.commits?.length) {
    return {
      mode,
      reason: "No commits were found in the review window.",
      repository: repository.fullName,
      status: "quiet",
    };
  }
  if (repository.routineOnly) {
    return {
      mode,
      reason: "Only routine lockfile or documentation activity was detected.",
      repository: repository.fullName,
      status: "quiet",
    };
  }
  return {
    commitCount: repository.commits.length,
    mode,
    reason: mode === "pinned"
      ? "Pinned repository with potentially meaningful activity; inspect first."
      : "Potentially meaningful activity requires evidence review.",
    repository: repository.fullName,
    status: "review-candidate",
    touchedFileCount: repository.touchedFiles?.length ?? 0,
  };
}

export function buildRepositoryReviewLedger({
  repositories,
  repositoryModes = {},
  unconfiguredSelections = [],
}) {
  if (!Array.isArray(repositories)) throw new Error("repositories must be an array.");
  if (!Array.isArray(unconfiguredSelections)) throw new Error("unconfiguredSelections must be an array.");
  const decisions = repositories.map((repository) => repositoryDecision(repository, repositoryModes));
  const configured = new Set(decisions.map((decision) => decision.repository));
  for (const repository of unconfiguredSelections) {
    const fullName = requireNonEmptyString(repository, "Unconfigured repository");
    if (configured.has(fullName)) continue;
    decisions.push({
      mode: repositoryModeFor(repositoryModes, fullName),
      reason: "Selected by the reader, but no configured source can provide inspectable code evidence.",
      repository: fullName,
      status: "inaccessible",
    });
  }
  const rank = { "review-candidate": 0, inaccessible: 1, quiet: 2 };
  decisions.sort((left, right) => {
    if (left.mode !== right.mode) {
      if (left.mode === "pinned") return -1;
      if (right.mode === "pinned") return 1;
    }
    return rank[left.status] - rank[right.status] || left.repository.localeCompare(right.repository);
  });
  const counts = decisions.reduce((result, decision) => {
    result[decision.status] += 1;
    return result;
  }, { inaccessible: 0, quiet: 0, "review-candidate": 0 });
  return {
    counts,
    decisions,
    inspectedCount: repositories.length,
    requestedCount: decisions.length,
  };
}

export const EDITION_SELECTION_PRIORITIES = [...PRIORITY_ORDER];
