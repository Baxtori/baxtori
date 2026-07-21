export const CAPTURE_WINDOWS = ["since-review", "7d", "14d", "30d", "90d"] as const;

export type CaptureWindow = (typeof CAPTURE_WINDOWS)[number];

export const DEFAULT_CAPTURE_WINDOW: CaptureWindow = "since-review";

export const CAPTURE_WINDOW_LABELS: Record<CaptureWindow, string> = {
  "since-review": "Since the last edition",
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function isCaptureWindow(value: unknown): value is CaptureWindow {
  return typeof value === "string" && (CAPTURE_WINDOWS as readonly string[]).includes(value);
}

export function captureWindowSearch(window: CaptureWindow, lastReviewedAt: string) {
  const search = new URLSearchParams();
  if (window === "since-review") search.set("since", lastReviewedAt);
  else search.set("days", window.slice(0, -1));
  return search;
}

export function captureWindowEmptyLabel(window: CaptureWindow, lastReviewedAt: string) {
  return window === "since-review"
    ? `No commits since ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(lastReviewedAt))}.`
    : `No commits in the ${CAPTURE_WINDOW_LABELS[window].toLowerCase()}.`;
}
