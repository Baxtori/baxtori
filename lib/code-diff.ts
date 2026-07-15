import { canonicalRepository } from "./repository-identity";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const SAFE_PATH_SEGMENT = /^[^\0/]+$/;

export type DiffLine = {
  kind: "addition" | "context" | "deletion" | "hunk" | "meta";
  newNumber: number | null;
  oldNumber: number | null;
  text: string;
};

type DiffRange = {
  endLine: number;
  startLine: number;
};

type ParsedHunk = {
  lines: DiffLine[];
  newCount: number;
  newStart: number;
};

export function parseCodeDiffRequest(url: URL) {
  const repository = canonicalRepository(url.searchParams.get("repo")?.trim() ?? "");
  const base = url.searchParams.get("base")?.trim() ?? "";
  const head = url.searchParams.get("head")?.trim() ?? "";
  const path = url.searchParams.get("path")?.trim() ?? "";
  const startLine = Number(url.searchParams.get("start"));
  const endLine = Number(url.searchParams.get("end"));

  if (!REPOSITORY_PATTERN.test(repository)) throw new Error("Invalid repository name.");
  if (!COMMIT_PATTERN.test(base) || !COMMIT_PATTERN.test(head) || base === head) throw new Error("Invalid comparison.");
  if (!isSafeRepositoryPath(path)) throw new Error("Invalid file path.");
  if (!isValidCodeRange({ endLine, startLine })) throw new Error("Invalid line range.");

  return { base, endLine, head, path, repository, startLine };
}

export function buildGitHubCompareUrl(repository: string, base: string, head: string) {
  return new URL(`https://api.github.com/repos/${canonicalRepository(repository)}/compare/${base}...${head}`);
}

export function parseGitHubPatch(patch: string, range: DiffRange) {
  const hunks = parseHunks(patch);
  const selected = hunks.filter((hunk) => {
    const newEnd = hunk.newCount === 0 ? hunk.newStart : hunk.newStart + hunk.newCount - 1;
    return newEnd >= range.startLine - 3 && hunk.newStart <= range.endLine + 3;
  });
  if (!selected.length) throw new Error("No changed lines intersect this excerpt.");
  const lines = selected.flatMap((hunk) => hunk.lines);
  if (lines.length > 500) throw new Error("This diff is too large for an inline excerpt.");
  return lines;
}

function parseHunks(patch: string) {
  const hunks: ParsedHunk[] = [];
  let current: ParsedHunk | null = null;
  let oldNumber = 0;
  let newNumber = 0;

  for (const rawLine of patch.replaceAll("\r\n", "\n").split("\n")) {
    const header = rawLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (header) {
      oldNumber = Number(header[1]);
      newNumber = Number(header[3]);
      current = {
        lines: [{ kind: "hunk", newNumber: null, oldNumber: null, text: rawLine }],
        newCount: header[4] === undefined ? 1 : Number(header[4]),
        newStart: newNumber,
      };
      hunks.push(current);
      continue;
    }
    if (!current || rawLine === "") continue;

    const marker = rawLine[0];
    const text = rawLine.slice(1);
    if (marker === "+") {
      current.lines.push({ kind: "addition", newNumber, oldNumber: null, text });
      newNumber += 1;
    } else if (marker === "-") {
      current.lines.push({ kind: "deletion", newNumber: null, oldNumber, text });
      oldNumber += 1;
    } else if (marker === " ") {
      current.lines.push({ kind: "context", newNumber, oldNumber, text });
      oldNumber += 1;
      newNumber += 1;
    } else if (marker === "\\") {
      current.lines.push({ kind: "meta", newNumber: null, oldNumber: null, text: rawLine });
    }
  }

  return hunks;
}

function isSafeRepositoryPath(path: string) {
  if (!path || path.startsWith("/") || path.length > 500) return false;
  const segments = path.split("/");
  return segments.every((segment) => segment !== "." && segment !== ".." && SAFE_PATH_SEGMENT.test(segment));
}

function isValidCodeRange({ endLine, startLine }: DiffRange) {
  return Number.isInteger(startLine) && Number.isInteger(endLine) && startLine >= 1 && endLine >= startLine && endLine - startLine < 160;
}
