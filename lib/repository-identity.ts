export const BAXTORI_REPOSITORY = "teamleaderleo/baxtori";
export const LEGACY_BAXTORI_REPOSITORY = "teamleaderleo/glimpse";

const REPOSITORY_ALIASES: Readonly<Record<string, string>> = {
  [LEGACY_BAXTORI_REPOSITORY]: BAXTORI_REPOSITORY,
};

const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function canonicalRepository(repository: string) {
  return REPOSITORY_ALIASES[repository] ?? repository;
}

export function isValidRepositoryName(repository: string) {
  if (!REPOSITORY_NAME_PATTERN.test(repository)) return false;
  // "." and ".." pass the character class but would let a crafted repository
  // name traverse out of /repos/{owner}/{name} when spliced into an API URL.
  return repository.split("/").every((segment) => segment !== "." && segment !== "..");
}

export function canonicalRepositoryStateKey(key: string) {
  for (const [legacy, canonical] of Object.entries(REPOSITORY_ALIASES)) {
    if (key === legacy) return canonical;
    if (key.startsWith(`${legacy}:`)) return `${canonical}:${key.slice(legacy.length + 1)}`;
  }
  return key;
}

export function canonicalizeRepositoryList(repositories: string[]) {
  return [...new Set(repositories.map(canonicalRepository))];
}

export function canonicalizeRepositoryStateRecord<T>(record: Record<string, T>) {
  const canonical = new Map<string, T>();
  for (const [key, value] of Object.entries(record)) {
    const nextKey = canonicalRepositoryStateKey(key);
    if (!canonical.has(nextKey) || nextKey === key) canonical.set(nextKey, value);
  }
  return Object.fromEntries(canonical) as Record<string, T>;
}
