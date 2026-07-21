import {
  BAXTORI_REPOSITORY,
  LEGACY_BAXTORI_REPOSITORY,
  PREVIOUS_BAXTORI_REPOSITORY,
  canonicalRepository,
} from "./repository-identity.ts";

type RepositoryEvidence = {
  repository: string;
};

function repositoryCandidates(repository: string) {
  const canonical = canonicalRepository(repository);
  return canonical === BAXTORI_REPOSITORY
    ? [BAXTORI_REPOSITORY, PREVIOUS_BAXTORI_REPOSITORY, LEGACY_BAXTORI_REPOSITORY]
    : [canonical];
}

/**
 * Matches immutable demo fixtures across repository renames while exposing the
 * current canonical repository identity to the reader.
 */
export function matchPublishedDemoEvidence<T extends RepositoryEvidence, R extends RepositoryEvidence>(
  evidence: T,
  lookup: (candidate: T) => R | null,
) {
  for (const repository of repositoryCandidates(evidence.repository)) {
    const published = lookup({ ...evidence, repository });
    if (published) return { ...published, repository: canonicalRepository(published.repository) };
  }
  return null;
}
