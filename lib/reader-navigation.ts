import type { ReaderStoryState, ReviewRequest } from "./feedback-contract.ts";

export type ReaderDestination =
  | { kind: "area"; repository: string; targetId: string }
  | { kind: "question"; repository: string; targetId: string }
  | { kind: "repositories" }
  | { kind: "story"; targetId: string };

export type FocusTarget = {
  detailsIds?: string[];
  elementId: string;
};

export function planStoryOpening(
  current: Pick<ReaderStoryState, "muted" | "understood">,
  hideUnderstood: boolean,
  revising = false,
) {
  return {
    hideUnderstood:
      hideUnderstood && current.understood ? false : hideUnderstood,
    patch: {
      expanded: true,
      muted: false,
      revising,
    } satisfies Partial<ReaderStoryState>,
  };
}

export function focusTargetFor(destination: ReaderDestination): FocusTarget {
  if (destination.kind === "story")
    return { elementId: `story-${destination.targetId}` };
  if (destination.kind === "question")
    return { elementId: `question-${destination.targetId}` };
  if (destination.kind === "repositories")
    return { elementId: "repository-controls" };
  return {
    detailsIds: [
      `area-${destination.targetId}`,
      `walkthrough-${destination.targetId}`,
    ],
    elementId: `walkthrough-${destination.targetId}`,
  };
}

export function shouldClearReviewMarker(
  requests: Pick<ReviewRequest, "_id" | "status" | "storyId">[],
  canceledRequestId: string,
) {
  const canceled = requests.find(
    (request) => request._id === canceledRequestId,
  );
  if (!canceled) return null;
  return !requests.some(
    (request) =>
      request._id !== canceledRequestId &&
      request.storyId === canceled.storyId &&
      request.status === "queued",
  );
}
