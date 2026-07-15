import { canonicalRepository } from "./repository-identity";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const SAFE_PATH_SEGMENT = /^[^\0/]+$/;

export type CodeRange = {
  endLine: number;
  startLine: number;
};

export function parseCodeEvidenceRequest(url: URL) {
  const repository = canonicalRepository(url.searchParams.get("repo")?.trim() ?? "");
  const commit = url.searchParams.get("commit")?.trim() ?? "";
  const path = url.searchParams.get("path")?.trim() ?? "";
  const startLine = Number(url.searchParams.get("start"));
  const endLine = Number(url.searchParams.get("end"));

  if (!REPOSITORY_PATTERN.test(repository)) throw new Error("Invalid repository name.");
  if (!COMMIT_PATTERN.test(commit)) throw new Error("Invalid commit reference.");
  if (!isSafeRepositoryPath(path)) throw new Error("Invalid file path.");
  if (!isValidCodeRange({ endLine, startLine })) throw new Error("Invalid line range.");

  return { commit, endLine, path, repository, startLine };
}

export function buildGitHubContentsUrl(repository: string, path: string, commit: string) {
  const canonical = canonicalRepository(repository);
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const endpoint = new URL(`https://api.github.com/repos/${canonical}/contents/${encodedPath}`);
  endpoint.searchParams.set("ref", commit);
  return endpoint;
}

export function selectCodeLines(source: string, { endLine, startLine }: CodeRange) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  if (startLine > lines.length) throw new Error("The requested lines are outside this file.");
  return lines.slice(startLine - 1, Math.min(endLine, lines.length)).map((text, index) => ({
    number: startLine + index,
    text,
  }));
}

function isSafeRepositoryPath(path: string) {
  if (!path || path.startsWith("/") || path.length > 500) return false;
  const segments = path.split("/");
  return segments.every((segment) => segment !== "." && segment !== ".." && SAFE_PATH_SEGMENT.test(segment));
}

function isValidCodeRange({ endLine, startLine }: CodeRange) {
  return Number.isInteger(startLine) && Number.isInteger(endLine) &&
    startLine >= 1 && endLine >= startLine && endLine - startLine < 160;
}
