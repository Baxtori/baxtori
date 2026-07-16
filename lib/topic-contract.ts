import { canonicalRepository } from "./repository-identity.ts";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const SAFE_PATH_SEGMENT = /^[^\0/]+$/;
const THREAD_ORIGINS = new Set(["question", "watch"]);
const THREAD_STATUSES = new Set(["active", "resolved", "snoozed"]);
const QUESTION_STATUSES = new Set(["open", "resolved", "snoozed"]);
const READER_REVIEW_STATES = new Set(["private", "queued"]);

export type EvidenceAddress = {
  baseCommit: string;
  endLine: number;
  headCommit: string;
  path: string;
  repository: string;
  startLine: number;
};

export type TopicThreadOrigin = "question" | "watch";
export type TopicThreadStatus = "active" | "resolved" | "snoozed";
export type ThreadQuestionStatus = "open" | "resolved" | "snoozed";
export type QuestionReviewState = "considered" | "private" | "queued";

export type TopicThreadInput = {
  areaId?: string;
  editionId: string;
  evidence: EvidenceAddress;
  origin: TopicThreadOrigin;
  sourceKey: string;
  storyId: string;
  storyTitle: string;
  title: string;
};

export type TopicThreadUpdate = {
  snoozedUntil: number | null;
  status: TopicThreadStatus;
  threadId: string;
};

export type ThreadQuestionInput = {
  editionId: string;
  evidence: EvidenceAddress;
  guidance: string;
  lensId: string;
  question: string;
  reviewState: QuestionReviewState;
  storyId: string;
  storyTitle: string;
  threadId: string;
};

export type ThreadQuestionUpdate = {
  guidance?: string;
  lensId?: string;
  question?: string;
  questionId: string;
  reviewState?: QuestionReviewState;
  snoozedUntil?: number | null;
  status?: ThreadQuestionStatus;
};

export type CompilerTopicThread = {
  _id: string;
  evidence: EvidenceAddress;
  origin: TopicThreadOrigin;
  status: TopicThreadStatus;
};

export type CompilerThreadQuestion = {
  evidence: EvidenceAddress;
  reviewState: QuestionReviewState;
  status: ThreadQuestionStatus;
  threadId: string;
};

export function parseEvidenceAddress(input: unknown): EvidenceAddress {
  if (!isRecord(input)) throw new Error("Invalid evidence address.");
  const repository = canonicalRepository(readString(input.repository, 200, "repository"));
  const baseCommit = readString(input.baseCommit, 40, "base commit");
  const headCommit = readString(input.headCommit, 40, "head commit");
  const path = readString(input.path, 500, "file path");
  const startLine = readInteger(input.startLine, "start line");
  const endLine = readInteger(input.endLine, "end line");

  if (!REPOSITORY_PATTERN.test(repository)) throw new Error("Invalid evidence repository.");
  if (!COMMIT_PATTERN.test(baseCommit) || !COMMIT_PATTERN.test(headCommit)) throw new Error("Invalid evidence commit.");
  if (!isSafeRepositoryPath(path)) throw new Error("Invalid evidence path.");
  if (startLine < 1 || endLine < startLine || endLine - startLine >= 160) throw new Error("Invalid evidence line range.");

  return { baseCommit, endLine, headCommit, path, repository, startLine };
}

export function parseTopicThread(input: unknown): TopicThreadInput {
  if (!isRecord(input)) throw new Error("Invalid topic thread.");
  const origin = readEnum(input.origin, THREAD_ORIGINS, "topic origin") as TopicThreadOrigin;
  const areaId = input.areaId === undefined ? undefined : readString(input.areaId, 160, "map area");
  return {
    areaId: areaId || undefined,
    editionId: readString(input.editionId, 100, "edition"),
    evidence: parseEvidenceAddress(input.evidence),
    origin,
    sourceKey: readNonEmptyString(input.sourceKey, 300, "source key"),
    storyId: readNonEmptyString(input.storyId, 160, "story"),
    storyTitle: readNonEmptyString(input.storyTitle, 300, "story title"),
    title: readNonEmptyString(input.title, 300, "topic title"),
  };
}

export function parseTopicThreadUpdate(input: unknown): TopicThreadUpdate {
  if (!isRecord(input)) throw new Error("Invalid topic thread update.");
  const status = readEnum(input.status, THREAD_STATUSES, "topic status") as TopicThreadStatus;
  const snoozedUntil = readOptionalTimestamp(input.snoozedUntil, "snooze date");
  if (status === "snoozed" && !snoozedUntil) throw new Error("A snoozed topic needs a snooze date.");
  return {
    snoozedUntil: status === "snoozed" ? snoozedUntil : null,
    status,
    threadId: readNonEmptyString(input.threadId, 100, "topic thread ID"),
  };
}

export function parseThreadQuestion(input: unknown): ThreadQuestionInput {
  if (!isRecord(input)) throw new Error("Invalid thread question.");
  return {
    editionId: readString(input.editionId, 100, "edition"),
    evidence: parseEvidenceAddress(input.evidence),
    guidance: readString(input.guidance, 2_000, "question guidance"),
    lensId: readString(input.lensId, 80, "review lens"),
    question: readNonEmptyString(input.question, 2_000, "question"),
    reviewState: readEnum(input.reviewState, READER_REVIEW_STATES, "question review state") as QuestionReviewState,
    storyId: readNonEmptyString(input.storyId, 160, "story"),
    storyTitle: readNonEmptyString(input.storyTitle, 300, "story title"),
    threadId: readNonEmptyString(input.threadId, 100, "topic thread ID"),
  };
}

export function parseThreadQuestionUpdate(input: unknown): ThreadQuestionUpdate {
  if (!isRecord(input)) throw new Error("Invalid question update.");
  const update: ThreadQuestionUpdate = {
    questionId: readNonEmptyString(input.questionId, 100, "question ID"),
  };
  if (Object.hasOwn(input, "question")) update.question = readNonEmptyString(input.question, 2_000, "question");
  if (Object.hasOwn(input, "guidance")) update.guidance = readString(input.guidance, 2_000, "question guidance");
  if (Object.hasOwn(input, "lensId")) update.lensId = readString(input.lensId, 80, "review lens");
  if (Object.hasOwn(input, "reviewState")) update.reviewState = readEnum(input.reviewState, READER_REVIEW_STATES, "question review state") as QuestionReviewState;
  if (Object.hasOwn(input, "status")) update.status = readEnum(input.status, QUESTION_STATUSES, "question status") as ThreadQuestionStatus;
  if (Object.hasOwn(input, "snoozedUntil")) update.snoozedUntil = readOptionalTimestamp(input.snoozedUntil, "snooze date");
  if (Object.hasOwn(input, "snoozedUntil") && !update.status) throw new Error("A snooze date needs a question status.");
  if (update.status === "snoozed" && !update.snoozedUntil) throw new Error("A snoozed question needs a snooze date.");
  if (update.status && update.status !== "snoozed") update.snoozedUntil = null;
  if (Object.keys(update).length === 1) throw new Error("Question update is empty.");
  return update;
}

export function selectCompilerTopicInput<
  TThread extends CompilerTopicThread,
  TQuestion extends CompilerThreadQuestion,
>(threads: TThread[], questions: TQuestion[]) {
  const queuedQuestions = questions.filter((question) => question.status === "open" && question.reviewState === "queued");
  const queuedThreadIds = new Set(queuedQuestions.map((question) => question.threadId));
  return {
    activeThreads: threads.filter((thread) => thread.status === "active" && (thread.origin === "watch" || queuedThreadIds.has(thread._id))),
    queuedQuestions,
  };
}

export function canonicalizeEvidenceAddress(evidence: EvidenceAddress): EvidenceAddress {
  return { ...evidence, repository: canonicalRepository(evidence.repository) };
}

function isSafeRepositoryPath(path: string) {
  if (!path || path.startsWith("/") || path.length > 500) return false;
  const segments = path.split("/");
  return segments.every((segment) => segment !== "." && segment !== ".." && SAFE_PATH_SEGMENT.test(segment));
}

function readOptionalTimestamp(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  const parsed = readInteger(value, label);
  if (parsed <= 0) throw new Error(`Invalid ${label}.`);
  return parsed;
}

function readEnum(value: unknown, allowed: Set<string>, label: string) {
  const parsed = readString(value, 40, label);
  if (!allowed.has(parsed)) throw new Error(`Invalid ${label}.`);
  return parsed;
}

function readNonEmptyString(value: unknown, maximumLength: number, label: string) {
  const parsed = readString(value, maximumLength, label).trim();
  if (!parsed) throw new Error(`Invalid ${label}.`);
  return parsed;
}

function readString(value: unknown, maximumLength: number, label: string) {
  if (typeof value !== "string" || value.length > maximumLength) throw new Error(`Invalid ${label}.`);
  return value;
}

function readInteger(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(`Invalid ${label}.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
