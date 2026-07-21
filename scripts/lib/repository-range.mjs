import { canonicalRepository } from "./repository-identity.mjs";

const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/i;

export function repositoryReviewCursor(repositoryMaps, repository) {
  const canonical = canonicalRepository(repository);
  const map = repositoryMaps.find((candidate) => canonicalRepository(candidate.repository) === canonical);
  if (!map || !Array.isArray(map.reviews)) return null;

  const reviews = [...map.reviews]
    .filter((review) => Date.parse(review.reviewedAt) && FULL_COMMIT_SHA.test(review.throughCommit?.sha ?? ""))
    .sort((left, right) => Date.parse(right.reviewedAt) - Date.parse(left.reviewedAt));
  const latest = reviews[0];
  if (!latest) return null;

  return {
    reviewedAt: latest.reviewedAt,
    sha: latest.throughCommit.sha,
  };
}

export function repositoryLogPlan({ cursor, cursorAvailable, cursorIsAncestor, reviewRef, since }) {
  if (cursor && cursorAvailable && cursorIsAncestor) {
    return {
      baseSha: cursor.sha,
      historyRewritten: false,
      logTarget: `${cursor.sha}..${reviewRef}`,
      mode: "review-cursor",
      reviewedAt: cursor.reviewedAt,
    };
  }

  return {
    baseSha: cursor?.sha ?? null,
    historyRewritten: Boolean(cursor && cursorAvailable && !cursorIsAncestor),
    logTarget: reviewRef,
    mode: cursor && cursorAvailable ? "history-rewrite-fallback" : "time-window-fallback",
    reviewedAt: cursor?.reviewedAt ?? null,
    since,
  };
}
