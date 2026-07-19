import { githubHeaders } from "./github-auth.ts";
import { canonicalRepository } from "./repository-identity.ts";
import type { RepositoryInventoryEntry } from "./repository-inventory.ts";
import type { RepositoryMode } from "./repository-modes.ts";

export const ACTIVITY_COMMIT_LIMIT = 20;
export const ACTIVITY_REQUEST_BUDGET = 12;

export type RepositoryActivityCommit = {
  author: string;
  date: string | null;
  message: string;
  sha: string;
  url: string;
};

export type RepositoryActivityRecord = {
  commits: RepositoryActivityCommit[];
  defaultBranch: string;
  error: string | null;
  mode: RepositoryMode;
  reason: string;
  repository: string;
  status: "active" | "deferred" | "inaccessible" | "quiet" | "rate-limited" | "unavailable";
  truncated: boolean;
};

export type RepositoryActivitySnapshot = {
  deferredCount: number;
  halted: boolean;
  rateLimit: {
    reason: string;
    remaining: number | null;
    resetAt: string | null;
    retryAt: string;
  } | null;
  records: RepositoryActivityRecord[];
  requestBudget: number;
  requestCount: number;
  since: string;
};

type GitHubCommit = {
  author: { login?: string | null } | null;
  commit: {
    author: { date?: string | null; name?: string | null } | null;
    message: string;
  };
  html_url: string;
  sha: string;
};

const MODES = new Set<RepositoryMode>(["automatic", "muted", "pinned"]);

export async function collectRepositoryActivitySnapshot({
  accessToken,
  fetchImpl = fetch,
  now = Date.now(),
  repositories,
  repositoryModes,
  requestBudget = ACTIVITY_REQUEST_BUDGET,
  since,
}: {
  accessToken: string;
  fetchImpl?: typeof fetch;
  now?: number;
  repositories: RepositoryInventoryEntry[];
  repositoryModes: Record<string, RepositoryMode>;
  requestBudget?: number;
  since: string;
}): Promise<RepositoryActivitySnapshot> {
  const parsedSince = Date.parse(since);
  if (!Number.isFinite(parsedSince)) throw new Error("Activity since must be an ISO timestamp.");
  if (!Number.isInteger(requestBudget) || requestBudget < 1 || requestBudget > 50) {
    throw new Error("Activity request budget must be between 1 and 50.");
  }

  const normalized = repositories.map((repository) => {
    const fullName = canonicalRepository(repository.fullName);
    const configuredMode = repositoryModes[fullName];
    const mode = MODES.has(configuredMode) ? configuredMode : repository.archived ? "muted" : "automatic";
    return { ...repository, fullName, mode };
  });
  const eligible = normalized
    .filter((repository) => repository.mode !== "muted" && !repository.archived)
    .sort((left, right) => {
      if (left.mode !== right.mode) return left.mode === "pinned" ? -1 : 1;
      return timestamp(right.pushedAt) - timestamp(left.pushedAt) || left.fullName.localeCompare(right.fullName);
    });
  const mutedOrArchived = normalized.filter((repository) => repository.mode === "muted" || repository.archived);
  const records: RepositoryActivityRecord[] = mutedOrArchived.map((repository) => ({
    commits: [],
    defaultBranch: repository.defaultBranch,
    error: null,
    mode: repository.mode,
    reason: repository.archived
      ? "Archived repositories do not enter the activity pass."
      : "Muted repositories do not enter the activity pass.",
    repository: repository.fullName,
    status: "quiet",
    truncated: false,
  }));
  let requestCount = 0;
  let rateLimit: RepositoryActivitySnapshot["rateLimit"] = null;

  for (let index = 0; index < eligible.length; index += 1) {
    const repository = eligible[index];
    if (!repository.pushedAt || Date.parse(repository.pushedAt) < parsedSince) {
      records.push(record(repository, "quiet", "No repository push was recorded in the review window."));
      continue;
    }
    if (requestCount >= requestBudget) {
      records.push(record(repository, "deferred", "The bounded activity request budget was exhausted before this repository was checked."));
      continue;
    }

    requestCount += 1;
    const endpoint = new URL(`https://api.github.com/repos/${repository.fullName}/commits`);
    endpoint.searchParams.set("per_page", String(ACTIVITY_COMMIT_LIMIT));
    endpoint.searchParams.set("sha", repository.defaultBranch);
    endpoint.searchParams.set("since", new Date(parsedSince).toISOString());
    const response = await fetchImpl(endpoint, {
      cache: "no-store",
      headers: githubHeaders(accessToken),
    });

    if (response.status === 403 || response.status === 429) {
      rateLimit = rateLimitFromResponse(response, now);
      records.push({
        ...record(repository, "rate-limited", rateLimit.reason),
        error: rateLimit.reason,
      });
      for (const pending of eligible.slice(index + 1)) {
        records.push(record(pending, "deferred", `Activity collection stopped until ${rateLimit.retryAt}.`));
      }
      break;
    }
    if (response.status === 409) {
      records.push(record(repository, "quiet", "GitHub reports an empty repository."));
      continue;
    }
    if (response.status === 404) {
      records.push({
        ...record(repository, "inaccessible", "Repository activity is unavailable with the current GitHub authorization."),
        error: "Repository activity is unavailable with the current GitHub authorization.",
      });
      continue;
    }
    if (!response.ok) {
      records.push({
        ...record(repository, "unavailable", `GitHub activity request failed with status ${response.status}.`),
        error: `GitHub activity request failed with status ${response.status}.`,
      });
      continue;
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      records.push({
        ...record(repository, "unavailable", "GitHub returned an invalid activity response."),
        error: "GitHub returned an invalid activity response.",
      });
      continue;
    }
    const commits = (raw as GitHubCommit[]).map((commit) => ({
      author: commit.author?.login ?? commit.commit.author?.name ?? "Unknown author",
      date: commit.commit.author?.date ?? null,
      message: commit.commit.message.split("\n")[0].slice(0, 300),
      sha: commit.sha,
      url: commit.html_url,
    }));
    records.push({
      commits,
      defaultBranch: repository.defaultBranch,
      error: null,
      mode: repository.mode,
      reason: commits.length
        ? "Recent commit metadata is available for review triage; source evidence is still required before publication."
        : "No commits were found in the review window.",
      repository: repository.fullName,
      status: commits.length ? "active" : "quiet",
      truncated: raw.length === ACTIVITY_COMMIT_LIMIT || /rel="next"/.test(response.headers.get("link") ?? ""),
    });
  }

  records.sort((left, right) => {
    if (left.mode !== right.mode) return left.mode === "pinned" ? -1 : right.mode === "pinned" ? 1 : 0;
    return left.repository.localeCompare(right.repository);
  });
  return {
    deferredCount: records.filter((item) => item.status === "deferred").length,
    halted: Boolean(rateLimit),
    rateLimit,
    records,
    requestBudget,
    requestCount,
    since: new Date(parsedSince).toISOString(),
  };
}

function record(
  repository: RepositoryInventoryEntry & { mode: RepositoryMode },
  status: RepositoryActivityRecord["status"],
  reason: string,
): RepositoryActivityRecord {
  return {
    commits: [],
    defaultBranch: repository.defaultBranch,
    error: null,
    mode: repository.mode,
    reason,
    repository: repository.fullName,
    status,
    truncated: false,
  };
}

function rateLimitFromResponse(response: Response, now: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const resetSeconds = Number(response.headers.get("x-ratelimit-reset"));
  const remainingValue = response.headers.get("x-ratelimit-remaining");
  const remaining = remainingValue !== null && Number.isFinite(Number(remainingValue)) ? Number(remainingValue) : null;
  const retryAtMs = Number.isFinite(retryAfter) && retryAfter >= 0
    ? now + retryAfter * 1_000
    : Number.isFinite(resetSeconds) && resetSeconds > 0
      ? resetSeconds * 1_000
      : now + 60_000;
  return {
    reason: "GitHub rate limiting stopped the activity pass; no further repository requests were made.",
    remaining,
    resetAt: Number.isFinite(resetSeconds) && resetSeconds > 0 ? new Date(resetSeconds * 1_000).toISOString() : null,
    retryAt: new Date(retryAtMs).toISOString(),
  };
}

function timestamp(value: string | null) {
  return value ? Date.parse(value) : 0;
}
