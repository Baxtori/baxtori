export const BAXTORI_REPOSITORY = "teamleaderleo/baxtori";
export const LEGACY_BAXTORI_REPOSITORY = "teamleaderleo/glimpse";

const REPOSITORY_ALIASES = new Map([
  [LEGACY_BAXTORI_REPOSITORY, BAXTORI_REPOSITORY],
]);

export function canonicalRepository(repository) {
  return REPOSITORY_ALIASES.get(repository) ?? repository;
}

export function canonicalRepositoryStateKey(key) {
  for (const [legacy, canonical] of REPOSITORY_ALIASES) {
    if (key === legacy) return canonical;
    if (key.startsWith(`${legacy}:`)) return `${canonical}:${key.slice(legacy.length + 1)}`;
  }
  return key;
}

export function canonicalizeRepositoryList(repositories) {
  return [...new Set(repositories.map(canonicalRepository))];
}

export function canonicalizeRepositoryStateRecord(record) {
  const canonical = new Map();
  for (const [key, value] of Object.entries(record ?? {})) {
    const nextKey = canonicalRepositoryStateKey(key);
    if (!canonical.has(nextKey) || nextKey === key) canonical.set(nextKey, value);
  }
  return Object.fromEntries(canonical);
}
