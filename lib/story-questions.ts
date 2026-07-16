import { canonicalRepository } from "./repository-identity.ts";
import { parseEvidenceAddress, type EvidenceAddress, type QuestionReviewState, type ThreadQuestionInput, type ThreadQuestionStatus } from "./topic-contract.ts";
import type { StoryTopic } from "./story-topics.ts";

export type ThreadQuestionRecord = {
  _id: string;
  createdAt: number;
  editionId: string;
  evidence: EvidenceAddress;
  guidance: string;
  lensId: string;
  question: string;
  resolvedAt: number | null;
  reviewState: QuestionReviewState;
  snoozedUntil: number | null;
  status: ThreadQuestionStatus;
  storyId: string;
  storyTitle: string;
  threadId: string;
  updatedAt: number;
  userId?: string;
};

export type QuestionEvidence = {
  baseCommit: string;
  commit: string;
  endLine: number;
  path: string;
  startLine: number;
};

export function questionEvidenceAddress(
  evidence: QuestionEvidence,
  repository: string,
  selectedStartLine: number,
  selectedEndLine: number,
): EvidenceAddress {
  if (!Number.isSafeInteger(selectedStartLine) || !Number.isSafeInteger(selectedEndLine)) {
    throw new Error("Question lines must be whole numbers.");
  }
  if (
    selectedStartLine < evidence.startLine ||
    selectedEndLine > evidence.endLine ||
    selectedEndLine < selectedStartLine
  ) {
    throw new Error("Question lines must stay inside the active evidence excerpt.");
  }
  return {
    baseCommit: evidence.baseCommit,
    endLine: selectedEndLine,
    headCommit: evidence.commit,
    path: evidence.path,
    repository: canonicalRepository(repository),
    startLine: selectedStartLine,
  };
}

export function storyQuestionInput({
  editionId,
  evidence,
  guidance,
  lensId,
  question,
  repository,
  reviewState,
  selectedEndLine,
  selectedStartLine,
  story,
  threadId,
}: {
  editionId: string;
  evidence: QuestionEvidence;
  guidance: string;
  lensId: string;
  question: string;
  repository: string;
  reviewState: Extract<QuestionReviewState, "private" | "queued">;
  selectedEndLine: number;
  selectedStartLine: number;
  story: Pick<StoryTopic, "id" | "title">;
  threadId: string;
}): ThreadQuestionInput {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) throw new Error("Write a question first.");
  return {
    editionId,
    evidence: questionEvidenceAddress(evidence, repository, selectedStartLine, selectedEndLine),
    guidance: guidance.trim(),
    lensId,
    question: trimmedQuestion,
    reviewState,
    storyId: story.id,
    storyTitle: story.title,
    threadId,
  };
}

export function questionsForEvidence<T extends Pick<ThreadQuestionRecord, "evidence">>(
  questions: T[],
  evidence: QuestionEvidence,
  repository: string,
) {
  const canonical = canonicalRepository(repository);
  return questions.filter((question) =>
    canonicalRepository(question.evidence.repository) === canonical &&
    question.evidence.baseCommit === evidence.baseCommit &&
    question.evidence.headCommit === evidence.commit &&
    question.evidence.path === evidence.path &&
    question.evidence.startLine >= evidence.startLine &&
    question.evidence.endLine <= evidence.endLine
  );
}

export function localQuestionRecord(
  input: ThreadQuestionInput,
  now = Date.now(),
): ThreadQuestionRecord {
  const id = `local:${globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(16).slice(2)}`}`;
  return {
    _id: id,
    createdAt: now,
    editionId: input.editionId,
    evidence: input.evidence,
    guidance: input.guidance,
    lensId: input.lensId,
    question: input.question,
    resolvedAt: null,
    reviewState: "private",
    snoozedUntil: null,
    status: "open",
    storyId: input.storyId,
    storyTitle: input.storyTitle,
    threadId: input.threadId,
    updatedAt: now,
  };
}

export function parseStoredQuestionRecords(input: unknown): ThreadQuestionRecord[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    try {
      const id = readLocalString(record._id, 160);
      if (!id.startsWith("local:")) return [];
      const status = readLocalEnum(record.status, ["open", "resolved", "snoozed"] as const);
      const reviewState = readLocalEnum(record.reviewState, ["private", "queued", "considered"] as const);
      return [{
        _id: id,
        createdAt: readLocalNumber(record.createdAt),
        editionId: readLocalString(record.editionId, 100),
        evidence: parseEvidenceAddress(record.evidence),
        guidance: readLocalString(record.guidance, 2_000),
        lensId: readLocalString(record.lensId, 80),
        question: readLocalString(record.question, 2_000),
        resolvedAt: readLocalOptionalNumber(record.resolvedAt),
        reviewState,
        snoozedUntil: readLocalOptionalNumber(record.snoozedUntil),
        status,
        storyId: readLocalString(record.storyId, 160),
        storyTitle: readLocalString(record.storyTitle, 300),
        threadId: readLocalString(record.threadId, 400),
        updatedAt: readLocalNumber(record.updatedAt),
      }];
    } catch {
      return [];
    }
  });
}

function readLocalString(value: unknown, maximumLength: number) {
  if (typeof value !== "string" || value.length > maximumLength) throw new Error("Invalid local question text.");
  return value;
}

function readLocalNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid local question number.");
  return value;
}

function readLocalOptionalNumber(value: unknown) {
  return value === null ? null : readLocalNumber(value);
}

function readLocalEnum<T extends string>(value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error("Invalid local question state.");
  return value as T;
}
