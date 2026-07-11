const DAY_MS = 24 * 60 * 60 * 1000;

type ActivityWindowInput = {
  now?: number;
  requestedDays: number;
  requestedSince: string;
};

export function resolveActivityWindow({ now = Date.now(), requestedDays, requestedSince }: ActivityWindowInput) {
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.round(requestedDays), 1), 90)
    : 14;
  const parsedSince = Date.parse(requestedSince);
  const earliestAllowed = now - 90 * DAY_MS;
  const usesReviewCursor = requestedSince.length > 0 && Number.isFinite(parsedSince) && parsedSince >= earliestAllowed && parsedSince <= now;

  return {
    days,
    since: usesReviewCursor ? new Date(parsedSince).toISOString() : new Date(now - days * DAY_MS).toISOString(),
    window: usesReviewCursor ? "since-review" as const : "rolling" as const,
  };
}
