export function formatEditionDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatReviewCursor(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value));
}

export function formatRelativeDate(value: string | null) {
  if (!value) return "No recent push";
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
  if (days === 0) return "Pushed today";
  if (days === 1) return "Pushed yesterday";
  if (days < 14) return `Pushed ${days} days ago`;
  if (days < 60) return `Pushed ${Math.round(days / 7)} weeks ago`;
  return `Pushed ${Math.round(days / 30)} months ago`;
}
