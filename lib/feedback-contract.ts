import { canonicalRepository, canonicalizeRepositoryList, canonicalizeRepositoryStateRecord } from "./repository-identity.ts";
import type { RepositoryMode } from "./repository-modes.ts";

export type ReaderStoryState = {
  expanded: boolean;
  locked: boolean;
  muted: boolean;
  reviewGuidance: string;
  reviewLens: string;
  reviewRequestedAt: string | null;
  revising: boolean;
  understood: boolean;
  watching: boolean;
};

export type ReaderStatePayload = {
  activeMapRepository: string;
  editionId: string;
  hideUnderstood: boolean;
  mapStates: Record<string, "introduced" | "revisit" | "skipped" | "understood" | "unexplored">;
  questionStates: Record<string, "irrelevant" | "open" | "resolved">;
  repositoryModes: Record<string, RepositoryMode>;
  selectedRepositories: string[];
  states: Record<string, ReaderStoryState>;
  version: 1;
  view: "briefing" | "map" | "repositories" | "timeline";
};

export type ReviewRequest = {
  _id: string;
  createdAt: number;
  editionId: string;
  guidance: string;
  lensId: string;
  lensInstruction: string;
  lensLabel: string;
  repository: string;
  status: "canceled" | "processed" | "queued" | "superseded";
  storyId: string;
  storyTitle: string;
  updatedAt: number;
  userId: string;
};

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MAX_REPOSITORY_STATE_ENTRIES = 5_000;
const MAP_STATES = new Set(["introduced", "revisit", "skipped", "understood", "unexplored"]);
const QUESTION_STATES = new Set(["irrelevant", "open", "resolved"]);
const REPOSITORY_MODES = new Set(["automatic", "muted", "pinned"]);
const VIEWS = new Set(["briefing", "map", "repositories", "timeline"]);

export function parseReaderState(input: unknown): ReaderStatePayload {
  if (!isRecord(input) || input.version !== 1) throw new Error("Invalid reader state version.");
  const states = parseRecord(input.states, 250, (value) => {
    if (!isRecord(value)) throw new Error("Invalid story state.");
    return {
      expanded: readBoolean(value.expanded),
      locked: readBoolean(value.locked),
      muted: readBoolean(value.muted),
      reviewGuidance: readString(value.reviewGuidance, 2_000),
      reviewLens: readString(value.reviewLens, 80),
      reviewRequestedAt: value.reviewRequestedAt === null ? null : readString(value.reviewRequestedAt, 80),
      revising: readBoolean(value.revising),
      understood: readBoolean(value.understood),
      watching: readBoolean(value.watching),
    };
  });
  const repositoryModes = canonicalizeRepositoryStateRecord(parseEnumRecord<RepositoryMode>(input.repositoryModes ?? {}, REPOSITORY_MODES, MAX_REPOSITORY_STATE_ENTRIES));
  if (!Object.keys(repositoryModes).every((repository) => REPOSITORY_PATTERN.test(repository))) throw new Error("Invalid repository mode target.");
  const selectedRepositories = canonicalizeRepositoryList(readStringArray(input.selectedRepositories, MAX_REPOSITORY_STATE_ENTRIES, 200));
  if (!selectedRepositories.every((repository) => REPOSITORY_PATTERN.test(repository))) throw new Error("Invalid selected repository.");
  const view = readString(input.view, 20);
  if (!VIEWS.has(view)) throw new Error("Invalid reader view.");

  return {
    activeMapRepository: canonicalRepository(readString(input.activeMapRepository, 200)),
    editionId: readString(input.editionId, 100),
    hideUnderstood: readBoolean(input.hideUnderstood),
    mapStates: canonicalizeRepositoryStateRecord(parseEnumRecord<ReaderStatePayload["mapStates"][string]>(input.mapStates, MAP_STATES)),
    questionStates: canonicalizeRepositoryStateRecord(parseEnumRecord<ReaderStatePayload["questionStates"][string]>(input.questionStates, QUESTION_STATES)),
    repositoryModes,
    selectedRepositories,
    states,
    version: 1,
    view: view as ReaderStatePayload["view"],
  };
}

export function parseReviewRequest(input: unknown) {
  if (!isRecord(input)) throw new Error("Invalid review request.");
  const repository = canonicalRepository(readString(input.repository, 200));
  if (!REPOSITORY_PATTERN.test(repository)) throw new Error("Invalid review repository.");
  return {
    editionId: readString(input.editionId, 100),
    guidance: readString(input.guidance, 2_000),
    lensId: readString(input.lensId, 80),
    lensInstruction: readString(input.lensInstruction, 1_000),
    lensLabel: readString(input.lensLabel, 120),
    repository,
    storyId: readString(input.storyId, 160),
    storyTitle: readString(input.storyTitle, 300),
  };
}

function parseEnumRecord<T extends string>(input: unknown, allowed: Set<string>, maximumEntries = 500) {
  return parseRecord(input, maximumEntries, (value) => {
    const parsed = readString(value, 40);
    if (!allowed.has(parsed)) throw new Error("Invalid reader disposition.");
    return parsed as T;
  });
}

function parseRecord<T>(input: unknown, maximumEntries: number, parseValue: (value: unknown) => T) {
  if (!isRecord(input)) throw new Error("Invalid reader state record.");
  const entries = Object.entries(input);
  if (entries.length > maximumEntries) throw new Error("Reader state is too large.");
  return Object.fromEntries(entries.map(([key, value]) => {
    if (!key || key.length > 300 || key.startsWith("_") || key.startsWith("$")) throw new Error("Invalid reader state key.");
    return [key, parseValue(value)];
  }));
}

function readBoolean(value: unknown) {
  if (typeof value !== "boolean") throw new Error("Invalid boolean reader state.");
  return value;
}

function readString(value: unknown, maximumLength: number) {
  if (typeof value !== "string" || value.length > maximumLength) throw new Error("Invalid reader state text.");
  return value;
}

function readStringArray(value: unknown, maximumItems: number, maximumLength: number) {
  if (!Array.isArray(value) || value.length > maximumItems) throw new Error("Invalid reader state list.");
  return value.map((item) => readString(item, maximumLength));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
