import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { canonicalRepository } from "./repository-identity.mjs";

const execFileAsync = promisify(execFile);
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/i;
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GIT_TIMEOUT_MS = 20_000;

export function isSafeEvidenceRepository(repository) {
  const canonical = canonicalRepository(repository);
  if (!REPOSITORY_NAME_PATTERN.test(canonical)) return false;
  return canonical.split("/").every((segment) => segment !== "." && segment !== "..");
}

export function isSafeEvidencePath(path) {
  if (typeof path !== "string" || !path || path.startsWith("/") || path.length > 500 || path.includes("\u0000")) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

async function git(repositoryPath, args) {
  const { stdout } = await execFileAsync("git", ["-C", repositoryPath, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
  });
  return stdout;
}

async function sourceIsAvailable(repositoryPath) {
  try {
    await access(repositoryPath);
    await git(repositoryPath, ["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

async function commitExists(repositoryPath, sha) {
  try {
    await git(repositoryPath, ["cat-file", "-e", `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

async function pathChanged(repositoryPath, baseCommit, commit, path) {
  try {
    await git(repositoryPath, ["diff", "--quiet", baseCommit, commit, "--", path]);
    return false;
  } catch (error) {
    if (error && typeof error === "object" && error.code === 1) return true;
    throw error;
  }
}

async function isAncestor(repositoryPath, baseCommit, commit) {
  try {
    await git(repositoryPath, ["merge-base", "--is-ancestor", baseCommit, commit]);
    return true;
  } catch {
    return false;
  }
}

async function fileLineCount(repositoryPath, commit, path) {
  try {
    const content = await git(repositoryPath, ["show", `${commit}:${path}`]);
    if (content.includes("\u0000")) return null;
    return content === "" ? 0 : content.replace(/\n$/, "").split("\n").length;
  } catch {
    return null;
  }
}

export async function validateEditionGitEvidence({ edition, root, sources, strict = false }) {
  const sourcesByRepository = new Map(sources.repositories.map((source) => [
    canonicalRepository(source.fullName),
    source,
  ]));
  const skippedRepositories = new Set();
  let excerptCount = 0;

  for (const story of edition.stories) {
    const repository = canonicalRepository(story.repository);
    if (!isSafeEvidenceRepository(repository)) throw new Error(`${story.id} has an invalid repository name.`);
    if (!story.files.every(isSafeEvidencePath)) throw new Error(`${story.id} has an unsafe evidence file path.`);
    const source = sourcesByRepository.get(repository);
    if (!source) throw new Error(`${story.id} has no configured source for ${repository}.`);
    const repositoryPath = resolve(root, source.path);
    if (!await sourceIsAvailable(repositoryPath)) {
      skippedRepositories.add(repository);
      if (strict) throw new Error(`${story.id} cannot validate ${repository}; its source cache is unavailable.`);
      continue;
    }

    for (const commit of story.commits) {
      if (!FULL_COMMIT_SHA.test(commit.sha) || !await commitExists(repositoryPath, commit.sha)) {
        throw new Error(`${story.id} references unavailable commit ${commit.sha}.`);
      }
    }

    for (const excerpt of story.codeEvidence) {
      excerptCount += 1;
      if (!isSafeEvidencePath(excerpt.path)) throw new Error(`${story.id} has an unsafe code-evidence path.`);
      if (!FULL_COMMIT_SHA.test(excerpt.baseCommit) || !FULL_COMMIT_SHA.test(excerpt.commit)) {
        throw new Error(`${story.id} must use full commit hashes for code evidence.`);
      }
      if (!await commitExists(repositoryPath, excerpt.baseCommit) || !await commitExists(repositoryPath, excerpt.commit)) {
        throw new Error(`${story.id} has code evidence with an unavailable base or head commit.`);
      }
      if (!await isAncestor(repositoryPath, excerpt.baseCommit, excerpt.commit)) {
        throw new Error(`${story.id} code evidence is not an ancestor-to-descendant comparison.`);
      }
      if (!await pathChanged(repositoryPath, excerpt.baseCommit, excerpt.commit, excerpt.path)) {
        throw new Error(`${story.id} cites ${excerpt.path}, but that path did not change in the comparison.`);
      }
      const lineCount = await fileLineCount(repositoryPath, excerpt.commit, excerpt.path);
      if (lineCount === null || excerpt.endLine > lineCount) {
        throw new Error(`${story.id} cites lines outside ${excerpt.commit}:${excerpt.path}.`);
      }
    }
  }

  return {
    excerptCount,
    skippedRepositories: [...skippedRepositories].sort(),
  };
}
