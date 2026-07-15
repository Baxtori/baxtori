import { canonicalRepository } from "./repository-identity.mjs";

function normalized(path) {
  return path.replace(/^\.\//, "").replace(/\/$/, "");
}

function evidenceMatches(file, evidence) {
  const changed = normalized(file);
  const mapped = normalized(evidence);
  return changed === mapped || changed.startsWith(`${mapped}/`);
}

export function buildMapImpact(repositoryMap, repositories) {
  const mapRepository = canonicalRepository(repositoryMap.repository);
  const repository = repositories.find((item) => canonicalRepository(item.fullName) === mapRepository);
  if (!repository) {
    return {
      affectedAreas: [],
      error: `No collected source matches ${mapRepository}.`,
      repository: mapRepository,
      unmappedFiles: [],
    };
  }

  const reviewedThrough = Date.parse(repositoryMap.generatedAt ?? "");
  const commitsSinceReview = repository.commits.filter((commit) =>
    !Number.isFinite(reviewedThrough) || Date.parse(commit.date) > reviewedThrough,
  );
  const touchedSinceReview = [...new Set(commitsSinceReview.flatMap((commit) => commit.files.map((file) => file.path)))];
  const coveredFiles = new Set();
  const affectedAreas = repositoryMap.areas.flatMap((area) => {
    const commits = commitsSinceReview.filter((commit) =>
      commit.files.some((file) => area.evidence.some((evidence) => evidenceMatches(file.path, evidence))),
    );
    if (!commits.length) return [];

    const changedFiles = [...new Set(commits.flatMap((commit) =>
      commit.files
        .filter((file) => area.evidence.some((evidence) => evidenceMatches(file.path, evidence)))
        .map((file) => file.path),
    ))];
    changedFiles.forEach((file) => coveredFiles.add(file));

    return [{
      areaId: area.id,
      areaName: area.name,
      changedFiles,
      commits: commits.map(({ date, sha, shortSha, subject, url }) => ({ date, sha, shortSha, subject, url })),
      previousConfidence: area.confidence,
      previousFreshness: area.freshness,
      repository: mapRepository,
      reviewReason: `${changedFiles.length} mapped evidence ${changedFiles.length === 1 ? "file has" : "files have"} changed since the collection window opened.`,
    }];
  });

  return {
    affectedAreas,
    error: null,
    repository: mapRepository,
    reviewedThrough: repositoryMap.generatedAt ?? null,
    unmappedFiles: touchedSinceReview.filter((file) => !coveredFiles.has(file)),
  };
}

export function buildMapImpacts(repositoryMaps, repositories) {
  const repositoryImpacts = repositoryMaps.map((repositoryMap) => buildMapImpact(repositoryMap, repositories));
  return {
    affectedAreas: repositoryImpacts.flatMap((impact) => impact.affectedAreas),
    errors: repositoryImpacts.flatMap((impact) => impact.error ? [{ error: impact.error, repository: impact.repository }] : []),
    repositories: repositoryImpacts,
    unmappedFiles: repositoryImpacts.flatMap((impact) => impact.unmappedFiles.map((path) => ({ path, repository: impact.repository }))),
  };
}
