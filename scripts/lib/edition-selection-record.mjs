import { EDITION_SELECTION_PRIORITIES } from "./edition-selection.mjs";

const PRIORITIES = new Set(EDITION_SELECTION_PRIORITIES);
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value;
}

function requireArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value;
}

function requireString(value, field, maximum = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`${field} must be a non-empty string no longer than ${maximum} characters.`);
  }
  return value;
}

function requireRepository(value, field) {
  const repository = requireString(value, field, 200);
  if (!REPOSITORY_PATTERN.test(repository)) throw new Error(`${field} must be an owner/name repository.`);
  return repository;
}

function requireInteger(value, field, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) throw new Error(`${field} must be an integer of at least ${minimum}.`);
  return value;
}

function validatePriority(value, field) {
  const priority = requireString(value, field, 40);
  if (!PRIORITIES.has(priority)) throw new Error(`${field} has an unknown priority.`);
  return priority;
}

function validateIncludedFinding(value, index, storyById) {
  const finding = requireObject(value, `selection.included[${index}]`);
  const storyId = requireString(finding.storyId, `selection.included[${index}].storyId`, 160);
  const story = storyById.get(storyId);
  if (!story) throw new Error(`selection.included[${index}] references an unknown story ${storyId}.`);
  const repository = requireRepository(finding.repository, `selection.included[${index}].repository`);
  if (repository !== story.repository) {
    throw new Error(`selection.included[${index}] repository must match story ${storyId}.`);
  }
  return {
    estimatedMinutes: requireInteger(finding.estimatedMinutes, `selection.included[${index}].estimatedMinutes`, 1),
    priority: validatePriority(finding.priority, `selection.included[${index}].priority`),
    reason: requireString(finding.reason, `selection.included[${index}].reason`),
    repository,
    storyId,
  };
}

function validateSelectionFinding(value, index, collection) {
  const finding = requireObject(value, `selection.${collection}[${index}]`);
  return {
    estimatedMinutes: requireInteger(finding.estimatedMinutes, `selection.${collection}[${index}].estimatedMinutes`, 1),
    id: requireString(finding.id, `selection.${collection}[${index}].id`, 160),
    priority: validatePriority(finding.priority, `selection.${collection}[${index}].priority`),
    reason: requireString(finding.reason, `selection.${collection}[${index}].reason`),
    repository: requireRepository(finding.repository, `selection.${collection}[${index}].repository`),
    title: requireString(finding.title, `selection.${collection}[${index}].title`, 180),
  };
}

function validateRepositoryDecision(value, index, collection) {
  const decision = requireObject(value, `selection.${collection}[${index}]`);
  return {
    reason: requireString(decision.reason, `selection.${collection}[${index}].reason`),
    repository: requireRepository(decision.repository, `selection.${collection}[${index}].repository`),
  };
}

function assertUnique(values, field) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${field} contains duplicate ${value}.`);
    seen.add(value);
  }
}

function assertSameValues(left, right, field) {
  const leftValues = [...left].sort();
  const rightValues = [...right].sort();
  if (leftValues.length !== rightValues.length || leftValues.some((value, index) => value !== rightValues[index])) {
    throw new Error(`${field} must match exactly.`);
  }
}

export function validateEditionSelectionRecord(selection, stories, quietRepositories = []) {
  if (selection === undefined) return null;
  requireObject(selection, "selection");
  if (!Array.isArray(stories)) throw new Error("stories must be an array before validating selection.");
  if (!Array.isArray(quietRepositories)) throw new Error("quietRepositories must be an array before validating selection.");

  const storyById = new Map(stories.map((story) => {
    const id = requireString(story?.id, "Story ID", 160);
    const repository = requireRepository(story?.repository, `Story ${id} repository`);
    return [id, { id, repository }];
  }));
  if (storyById.size !== stories.length) throw new Error("Story IDs must be unique before validating selection.");

  const included = requireArray(selection.included, "selection.included")
    .map((finding, index) => validateIncludedFinding(finding, index, storyById));
  const deferred = requireArray(selection.deferred, "selection.deferred")
    .map((finding, index) => validateSelectionFinding(finding, index, "deferred"));
  const excluded = requireArray(selection.excluded, "selection.excluded")
    .map((finding, index) => validateSelectionFinding(finding, index, "excluded"));
  const quiet = requireArray(selection.quiet, "selection.quiet")
    .map((decision, index) => validateRepositoryDecision(decision, index, "quiet"));
  const inaccessible = requireArray(selection.inaccessible, "selection.inaccessible")
    .map((decision, index) => validateRepositoryDecision(decision, index, "inaccessible"));

  assertUnique(included.map((finding) => finding.storyId), "selection.included");
  if (included.length !== stories.length || included.some((finding) => !storyById.has(finding.storyId))) {
    throw new Error("selection.included must account for every published story exactly once.");
  }
  assertUnique([...deferred, ...excluded].map((finding) => finding.id), "selection deferred/excluded findings");
  assertUnique([...quiet, ...inaccessible].map((decision) => decision.repository), "selection quiet/inaccessible repositories");

  const validatedQuietRepositories = quietRepositories.map((repository, index) => requireRepository(repository, `quietRepositories[${index}]`));
  assertUnique(validatedQuietRepositories, "quietRepositories");
  assertSameValues(quiet.map((decision) => decision.repository), validatedQuietRepositories, "selection.quiet and quietRepositories");

  const plannedMinutes = requireInteger(selection.plannedMinutes, "selection.plannedMinutes");
  const calculatedMinutes = included.reduce((total, finding) => total + finding.estimatedMinutes, 0);
  if (plannedMinutes !== calculatedMinutes) {
    throw new Error(`selection.plannedMinutes must equal included estimates (${calculatedMinutes}).`);
  }

  return {
    deferred,
    excluded,
    inaccessible,
    included,
    inspectedRepositories: requireInteger(selection.inspectedRepositories, "selection.inspectedRepositories"),
    plannedMinutes,
    quiet,
    readingBudgetMinutes: requireInteger(selection.readingBudgetMinutes, "selection.readingBudgetMinutes", 1),
  };
}
