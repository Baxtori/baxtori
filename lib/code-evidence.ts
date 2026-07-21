import { canonicalRepository } from "./repository-identity.ts";
import {
  isValidCommitReference,
  parseEvidencePathRange,
  parseEvidenceRepository,
  type EvidenceRange,
} from "./evidence-request.ts";

export type CodeRange = EvidenceRange;

export function parseCodeEvidenceRequest(url: URL) {
  const repository = parseEvidenceRepository(url);
  const commit = url.searchParams.get("commit")?.trim() ?? "";
  if (!isValidCommitReference(commit)) throw new Error("Invalid commit reference.");
  const { endLine, path, startLine } = parseEvidencePathRange(url);

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
