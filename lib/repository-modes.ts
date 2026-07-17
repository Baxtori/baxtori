import { canonicalRepository, canonicalizeRepositoryList, canonicalizeRepositoryStateRecord } from "./repository-identity.ts";

export type RepositoryMode = "automatic" | "muted" | "pinned";
export type RepositoryPreferenceSource = "explicit" | "legacy";

export type RepositoryModeDescriptor = {
  archived: boolean;
  fullName: string;
};

export const REPOSITORY_MODE_LABELS: Readonly<Record<RepositoryMode, string>> = {
  automatic: "Automatic",
  muted: "Muted",
  pinned: "Pinned",
};

export const REPOSITORY_MODE_DESCRIPTIONS: Readonly<Record<RepositoryMode, string>> = {
  automatic: "Check recent activity and review only when the evidence clears the publication threshold.",
  muted: "Keep this repository in the library without checking it during scheduled reviews.",
  pinned: "Check this repository first and give meaningful candidates priority when attention is limited.",
};

export function initializeRepositoryModes({
  legacySelectedRepositories,
  repositories,
  source,
  storedModes,
}: {
  legacySelectedRepositories: string[];
  repositories: RepositoryModeDescriptor[];
  source: RepositoryPreferenceSource;
  storedModes: Record<string, RepositoryMode>;
}) {
  const next = canonicalizeRepositoryStateRecord(storedModes);
  const legacySelected = new Set(canonicalizeRepositoryList(legacySelectedRepositories));

  if (source === "legacy") {
    for (const repository of legacySelected) next[repository] = "automatic";
    for (const repository of repositories) {
      const canonical = canonicalRepository(repository.fullName);
      if (!(canonical in next)) next[canonical] = legacySelected.has(canonical) ? "automatic" : "muted";
    }
    return next;
  }

  for (const repository of repositories) {
    const canonical = canonicalRepository(repository.fullName);
    if (!(canonical in next)) next[canonical] = repository.archived ? "muted" : "automatic";
  }
  return next;
}

export function repositoryModeFor(
  modes: Record<string, RepositoryMode>,
  repository: string,
  fallback: RepositoryMode = "automatic",
) {
  return modes[canonicalRepository(repository)] ?? fallback;
}

export function withRepositoryMode(
  modes: Record<string, RepositoryMode>,
  repository: string,
  mode: RepositoryMode,
) {
  return { ...modes, [canonicalRepository(repository)]: mode };
}

export function reviewRepositoriesFromModes(modes: Record<string, RepositoryMode>) {
  return Object.entries(canonicalizeRepositoryStateRecord(modes))
    .filter(([, mode]) => mode !== "muted")
    .sort(([repositoryA, modeA], [repositoryB, modeB]) => {
      if (modeA !== modeB) return modeA === "pinned" ? -1 : 1;
      return repositoryA.localeCompare(repositoryB);
    })
    .map(([repository]) => repository);
}

export function restorePublishedRepositoryModes({
  modes,
  publishedRepositories,
  repositories,
}: {
  modes: Record<string, RepositoryMode>;
  publishedRepositories: string[];
  repositories: RepositoryModeDescriptor[];
}) {
  const published = new Set(canonicalizeRepositoryList(publishedRepositories));
  const known = new Set([
    ...Object.keys(canonicalizeRepositoryStateRecord(modes)),
    ...repositories.map((repository) => canonicalRepository(repository.fullName)),
    ...published,
  ]);
  return Object.fromEntries([...known].map((repository) => [
    repository,
    published.has(repository) ? "automatic" : "muted",
  ])) as Record<string, RepositoryMode>;
}

export function repositoryModeCounts(
  repositories: RepositoryModeDescriptor[],
  modes: Record<string, RepositoryMode>,
) {
  return repositories.reduce((counts, repository) => {
    counts[repositoryModeFor(modes, repository.fullName, repository.archived ? "muted" : "automatic")] += 1;
    return counts;
  }, { automatic: 0, muted: 0, pinned: 0 } as Record<RepositoryMode, number>);
}

export function sortRepositoriesByMode<T extends RepositoryModeDescriptor>(
  repositories: T[],
  modes: Record<string, RepositoryMode>,
) {
  const rank: Record<RepositoryMode, number> = { pinned: 0, automatic: 1, muted: 2 };
  return [...repositories].sort((left, right) => {
    const modeDifference = rank[repositoryModeFor(modes, left.fullName)] - rank[repositoryModeFor(modes, right.fullName)];
    if (modeDifference) return modeDifference;
    return left.fullName.localeCompare(right.fullName);
  });
}
