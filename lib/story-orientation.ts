import { canonicalRepository } from "./repository-identity.ts";

export type OrientationEvidence = {
  endLine: number;
  path: string;
  startLine: number;
};

export type OrientationArea = {
  breadth: number;
  concepts: string[];
  confidence: number;
  depth: number;
  evidence: string[];
  freshness: number;
  id: string;
  importance: number;
  kind: string;
  name: string;
  purpose: string;
};

export type OrientationMap = {
  areas: OrientationArea[];
  repository: string;
  summary: string;
};

export type OrientationStory = {
  brief: string;
  codeEvidence?: OrientationEvidence[];
  files: string[];
  learningValue: number;
  title: string;
  verdict: string;
};

export type StoryConnection = {
  id: string;
  kind: string;
  name: string;
  sharedPaths: string[];
};

export type StoryOrientation = {
  area: null | {
    breadth: number;
    concepts: string[];
    confidence: number;
    coverageEstimate: number;
    depth: number;
    evidenceCount: number;
    evidencePosition: number | null;
    freshness: number;
    id: string;
    kind: string;
    name: string;
    position: number;
    purpose: string;
    totalAreas: number;
  };
  connections: StoryConnection[];
  currentPath: string;
  pathParts: string[];
  repository: string;
  repositorySummary: string | null;
  selection: {
    explanation: string;
    headline: string;
    signals: string[];
  };
};

function normalizePath(path: string) {
  return path.trim().replace(/^\.\//, "").replace(/\/$/, "");
}

function areaCoverageEstimate(area: OrientationArea) {
  return Math.round(
    area.breadth * 0.35 +
    area.depth * 0.35 +
    area.confidence * 0.2 +
    area.freshness * 0.1,
  );
}

function intersectPaths(left: Set<string>, right: string[]) {
  return right.map(normalizePath).filter((path) => left.has(path));
}

export function buildStoryOrientation({
  active,
  maps,
  repository,
  story,
}: {
  active: OrientationEvidence;
  maps: OrientationMap[];
  repository: string;
  story: OrientationStory;
}): StoryOrientation {
  const canonical = canonicalRepository(repository);
  const repositoryMap = maps.find((candidate) => canonicalRepository(candidate.repository) === canonical) ?? null;
  const currentPath = normalizePath(active.path);
  const storyPaths = new Set([
    currentPath,
    ...story.files.map(normalizePath),
    ...(story.codeEvidence ?? []).map((item) => normalizePath(item.path)),
  ]);
  const matches = (repositoryMap?.areas ?? []).map((area, index) => {
    const sharedPaths = intersectPaths(storyPaths, area.evidence);
    const exactCurrentPath = area.evidence.map(normalizePath).includes(currentPath);
    return {
      area,
      exactCurrentPath,
      index,
      score: (exactCurrentPath ? 1_000 : 0) + sharedPaths.length * 20 + area.importance,
      sharedPaths,
    };
  }).filter((match) => match.sharedPaths.length > 0);

  matches.sort((left, right) =>
    right.score - left.score ||
    left.index - right.index ||
    left.area.id.localeCompare(right.area.id),
  );

  const primary = matches[0] ?? null;
  const evidencePosition = primary
    ? primary.area.evidence.map(normalizePath).findIndex((path) => path === currentPath)
    : -1;
  const excerptCount = story.codeEvidence?.length ?? 0;
  const signals = [
    `${story.learningValue}/5 editorial learning value`,
    `${excerptCount} exact ${excerptCount === 1 ? "excerpt" : "excerpts"}`,
    primary ? `${primary.area.name} map area` : "outside the current repository map",
  ];

  return {
    area: primary ? {
      breadth: primary.area.breadth,
      concepts: primary.area.concepts,
      confidence: primary.area.confidence,
      coverageEstimate: areaCoverageEstimate(primary.area),
      depth: primary.area.depth,
      evidenceCount: primary.area.evidence.length,
      evidencePosition: evidencePosition >= 0 ? evidencePosition + 1 : null,
      freshness: primary.area.freshness,
      id: primary.area.id,
      kind: primary.area.kind,
      name: primary.area.name,
      position: primary.index + 1,
      purpose: primary.area.purpose,
      totalAreas: repositoryMap?.areas.length ?? 0,
    } : null,
    connections: matches.slice(1, 4).map((match) => ({
      id: match.area.id,
      kind: match.area.kind,
      name: match.area.name,
      sharedPaths: match.sharedPaths,
    })),
    currentPath,
    pathParts: currentPath.split("/").filter(Boolean),
    repository: canonical,
    repositorySummary: repositoryMap?.summary ?? null,
    selection: {
      explanation: `The scheduled review selected this story through editorial judgment, assigned it ${story.learningValue}/5 learning value, and attached inspectable evidence. The score describes the edition's reading priority; it does not measure the percentage or absolute importance of the codebase.`,
      headline: story.verdict,
      signals,
    },
  };
}
