import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRepositoryReviewLedger, EDITION_SELECTION_PRIORITIES } from "./lib/edition-selection.mjs";
import { buildFollowUpCandidates } from "./lib/follow-up-candidates.mjs";
import { buildMapImpacts } from "./lib/map-impact.mjs";
import { sourceReviewRef } from "./lib/source-ref.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(resolve(root, "baxtori.sources.json"), "utf8"));
const mapRegistry = JSON.parse(await readFile(resolve(root, "data/repository-maps.json"), "utf8"));
const repositoryMaps = await Promise.all(mapRegistry.maps.map(async (entry) =>
  JSON.parse(await readFile(resolve(root, entry.path), "utf8"))
));
let readerFeedback = null;
try {
  readerFeedback = JSON.parse(await readFile(resolve(root, "data/feedback-input.json"), "utf8"));
} catch {
  // Collection still works before account-backed feedback is configured.
}
const since = new Date(Date.now() - config.windowDays * 86_400_000).toISOString();

function git(repositoryPath, args) {
  return execFileSync("git", ["-C", repositoryPath, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function collectRepository(source) {
  const repositoryPath = resolve(root, source.path);
  try {
    const { branch, reviewRef } = sourceReviewRef(source);
    let fetchError = null;
    try {
      git(repositoryPath, ["fetch", "--quiet", "origin", branch]);
    } catch (error) {
      fetchError = error instanceof Error ? error.message.split("\n")[0] : "GitHub fetch failed.";
    }
    try {
      git(repositoryPath, ["rev-parse", "--verify", reviewRef]);
    } catch {
      return {
        additions: 0,
        commits: [],
        deletions: 0,
        empty: true,
        error: fetchError ?? `GitHub branch origin/${branch} is unavailable.`,
        fetchError,
        fullName: source.fullName,
        name: source.name,
        repositoryPath,
        routineOnly: false,
        sourceMode: "github-origin",
        testFiles: [],
        touchedFiles: [],
      };
    }
    const commits = git(repositoryPath, [
      "log",
      reviewRef,
      `--since=${since}`,
      "--no-merges",
      "--date=iso-strict",
      "--pretty=format:__COMMIT__%n%H%n%h%n%aI%n%an%n%s",
      "--numstat",
      "--",
    ]);
    const entries = commits
      .split("__COMMIT__\n")
      .filter(Boolean)
      .map((entry) => {
        const [sha, shortSha, date, author, subject, ...stats] = entry.trim().split("\n");
        const files = stats.filter(Boolean).map((line) => {
          const [added, deleted, ...pathParts] = line.split("\t");
          return {
            added: added === "-" ? null : Number(added),
            deleted: deleted === "-" ? null : Number(deleted),
            path: pathParts.join("\t"),
          };
        });
        return {
          author,
          date,
          files,
          sha,
          shortSha,
          subject,
          url: `https://github.com/${source.fullName}/commit/${sha}`,
        };
      });

    const touchedFiles = [...new Set(entries.flatMap((commit) => commit.files.map((file) => file.path)))];
    const additions = entries.flatMap((commit) => commit.files).reduce((sum, file) => sum + (file.added ?? 0), 0);
    const deletions = entries.flatMap((commit) => commit.files).reduce((sum, file) => sum + (file.deleted ?? 0), 0);
    const testFiles = touchedFiles.filter((path) => /(^|\/)(test|tests|__tests__)(\/|\.)|\.test\.|\.spec\./i.test(path));
    const routineOnly = touchedFiles.length > 0 && touchedFiles.every((path) =>
      /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|README\.md|CHANGELOG\.md)$/i.test(path),
    );

    return {
      additions,
      commits: entries,
      deletions,
      error: null,
      fetchError,
      fullName: source.fullName,
      headSha: git(repositoryPath, ["rev-parse", reviewRef]),
      name: source.name,
      repositoryPath,
      routineOnly,
      sourceMode: "github-origin",
      testFiles,
      touchedFiles,
    };
  } catch (error) {
    return {
      commits: [],
      error: error instanceof Error ? error.message.split("\n")[0] : "Repository could not be read.",
      fetchError: null,
      fullName: source.fullName,
      name: source.name,
      repositoryPath,
      sourceMode: "github-origin",
      touchedFiles: [],
    };
  }
}

const requestedRepositories = readerFeedback?.readerState?.payload?.selectedRepositories;
const repositoryModes = readerFeedback?.readerState?.payload?.repositoryModes ?? {};
const selectedRepositorySet = Array.isArray(requestedRepositories) ? new Set(requestedRepositories) : null;
const configuredSources = selectedRepositorySet
  ? config.repositories.filter((source) => selectedRepositorySet.has(source.fullName))
  : config.repositories;
const unconfiguredSelections = Array.isArray(requestedRepositories)
  ? requestedRepositories.filter((repository) => !config.repositories.some((source) => source.fullName === repository))
  : [];
const repositories = configuredSources.map(collectRepository);
const reviewLedger = buildRepositoryReviewLedger({ repositories, repositoryModes, unconfiguredSelections });
const mapImpact = buildMapImpacts(repositoryMaps, repositories);
const followUpCandidates = buildFollowUpCandidates({
  mapImpact,
  queuedQuestions: readerFeedback?.queuedQuestions ?? [],
  repositories,
  topicThreads: readerFeedback?.topicThreads ?? [],
});
const output = {
  collectedAt: new Date().toISOString(),
  instructions: {
    budgetRule: "Estimate reading time only after a finding has been reviewed and can be explained. Pack qualifying findings by priority into the target budget; do not impose a story-count ceiling. If the highest-priority finding exceeds the target, publish it alone rather than hiding it.",
    evidenceRule: "Every claim must be supported by the listed commits and files. Do not infer unobserved behavior.",
    priorityOrder: EDITION_SELECTION_PRIORITIES,
    publicationThresholdRule: "A finding qualifies only after review establishes exact evidence, a concrete consequence, an explanation that adds more than the commit message, and a reason to spend reader attention now.",
    quietRule: "Publish no story for repositories with no commits or only routine lockfile/documentation churn unless that churn changes behavior.",
    readingBudgetMinutes: 15,
    followUpRule: "Treat follow-up candidates as review prompts only. Publish a return to the reader only after inspecting the original evidence and the new commits, then record the exact match reason and new evidence.",
    mapRule: "Review every affected map area against its exact commits before changing confidence, freshness, verdict, walkthrough, or questions. New unmapped files may suggest a new area, but are not proof of one.",
  },
  followUpCandidates,
  mapImpact,
  readerFeedback: readerFeedback ? {
    exportedAt: readerFeedback.exportedAt,
    readerState: readerFeedback.readerState,
    queuedQuestions: readerFeedback.queuedQuestions ?? [],
    reviewRequests: readerFeedback.reviewRequests,
    topicThreads: readerFeedback.topicThreads ?? [],
    unconfiguredSelections,
  } : null,
  reviewLedger,
  periodEnd: new Date().toISOString().slice(0, 10),
  periodStart: since.slice(0, 10),
  repositories,
  windowDays: config.windowDays,
};

await mkdir(resolve(root, "data"), { recursive: true });
await writeFile(resolve(root, "data/candidates.json"), `${JSON.stringify(output, null, 2)}\n`);

console.log(`Collected ${reviewLedger.inspectedCount} configured repositories from ${reviewLedger.requestedCount} requested sources.`);
console.log(`Review ledger: ${reviewLedger.counts["review-candidate"]} candidates; ${reviewLedger.counts.quiet} quiet; ${reviewLedger.counts.inaccessible} inaccessible.`);
console.log(`Map impact: ${mapImpact.affectedAreas.length} affected areas; ${mapImpact.unmappedFiles.length} changed files remain unmapped.`);
console.log(`Follow-up preflight: ${followUpCandidates.candidates.length} candidates; ${followUpCandidates.unmatchedThreads.length} active threads have no related collected change.`);
