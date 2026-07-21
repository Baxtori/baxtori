import { canonicalRepository, isValidRepositoryName } from "./repository-identity.ts";

const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const SAFE_PATH_SEGMENT = /^[^\0/]+$/;

export type EvidenceRange = {
  endLine: number;
  startLine: number;
};

export type EvidencePathRange = EvidenceRange & {
  path: string;
};

export function parseEvidenceRepository(url: URL) {
  const repository = canonicalRepository(url.searchParams.get("repo")?.trim() ?? "");
  if (!isValidRepositoryName(repository)) throw new Error("Invalid repository name.");
  return repository;
}

export function isValidCommitReference(commit: string) {
  return COMMIT_PATTERN.test(commit);
}

export function parseEvidencePathRange(url: URL): EvidencePathRange {
  const path = url.searchParams.get("path")?.trim() ?? "";
  const startLine = Number(url.searchParams.get("start"));
  const endLine = Number(url.searchParams.get("end"));

  if (!isSafeRepositoryPath(path)) throw new Error("Invalid file path.");
  if (!isValidEvidenceRange({ endLine, startLine })) throw new Error("Invalid line range.");

  return { endLine, path, startLine };
}

function isSafeRepositoryPath(path: string) {
  if (!path || path.startsWith("/") || path.length > 500) return false;
  const segments = path.split("/");
  return segments.every((segment) => segment !== "." && segment !== ".." && SAFE_PATH_SEGMENT.test(segment));
}

function isValidEvidenceRange({ endLine, startLine }: EvidenceRange) {
  return Number.isInteger(startLine) && Number.isInteger(endLine) &&
    startLine >= 1 && endLine >= startLine && endLine - startLine < 160;
}
