import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { buildAuthorizedSourcePlan } from "./lib/authorized-source-plan.mjs";
import { buildRepositoryReviewLedger, EDITION_SELECTION_PRIORITIES } from "./lib/edition-selection.mjs";
import { buildFollowUpCandidates } from "./lib/follow-up-candidates.mjs";
import { buildMapImpacts } from "./lib/map-impact.mjs";
import { repositoryLogPlan, repositoryReviewCursor } from "./lib/repository-range.mjs";
import { sourceReviewRef } from "./lib/source-ref.mjs";

const execFileAsync = promisify(execFile);
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
const collectedAt = new Date();
const since = new Date(collectedAt.getTime() - config.windowDays * 86_400_000).toISOString();
const GIT_TIMEOUT_MS = 20_000;
const GIT_FETCH_TIMEOUT_MS = 60_000;
const INVENTORY_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

async function git(repositoryPath, args, { timeout = GIT_TIMEOUT_MS } = {}) {
  const { stdout } = await execFileAsync("git", ["-C", repositoryPath, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
    windowsHide: true,
  });
  return stdout.trim();
}

function commandError(error, fallback) {
  if (error && typeof error === "object") {
    if (error.killed) return "Git command timed out.";
    if (typeof error.stderr === "string" && error.stderr.trim()) return error.stderr.trim().split("\n")[0];
    if (error instanceof Error && error.message) return error.message.split("\n")[0];
  }
  return fallback;
}

async function gitObjectExists(repositoryPath, revision) {
  try {
    await git(repositoryPath, ["cat-file", "-e", `${revision}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

async function gitIsAncestor(repositoryPath, ancestor, descendant) {
  try {
    await git(repositoryPath, ["merge-base", "--is-ancestor", ancestor, descendant]);
    return true;
  } catch {
    return false;
  }
}

async function collectRepository(source) {
  const repositoryPath = resolve(root, source.path);
  const cursor = repositoryReviewCursor(repositoryMaps, source.fullName);
  try {
    const { branch, reviewRef } = sourceReviewRef(source);
    let fetchError = null;
    try {
      await git(repositoryPath, ["fetch", "--quiet", "origin", branch], { timeout: GIT_FETCH_TIMEOUT_MS });
    } catch (error) {
      fetchError = commandError(error, "GitHub fetch failed.");
    }
    try {
      await git(repositoryPath, ["rev-parse", "--verify", reviewRef]);
    } catch {
      return {
        additions: 0,
        collection: {
          baseSha: cursor?.sha ?? null,
          headSha: null,
          historyRewritten: false,
          mode: "unavailable",
          reviewedAt: cursor?.reviewedAt ?? null,
        },
        commits: [],
        deletions: 0,
        empty: true,
        error: fetchError ?? `GitHub branch origin/${branch} is unavailable.`,
        fetchError,
        fullName: source.fullName,
        name: source.name,
        routineOnly: false,
        sourceMode: "github-origin",
        testFiles: [],
        touchedFiles: [],
      };
    }

    const headSha = await git(repositoryPath, ["rev-parse", reviewRef]);
    const cursorAvailable = cursor ? await gitObjectExists(repositoryPath, cursor.sha) : false;
    const cursorIsAncestor = cursorAvailable
      ? await gitIsAncestor(repositoryPath, cursor.sha, reviewRef)
      : false;
    const plan = repositoryLogPlan({ cursor, cursorAvailable, cursorIsAncestor, reviewRef, since });
    const logArgs = ["log", plan.logTarget];
    if (plan.since) logArgs.push(`--since=${plan.since}`);
    logArgs.push(
      "--no-merges",
      "--date=iso-strict",
      "--pretty=format:__COMMIT__%n%H%n%h%n%aI%n%an%n%s",
      "--numstat",
      "--",
    );
    const commits = await git(repositoryPath, logArgs);
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
      collection: {
        baseSha: plan.baseSha,
        headSha,
        historyRewritten: plan.historyRewritten,
        mode: plan.mode,
        reviewedAt: plan.reviewedAt,
      },
      commits: entries,
      deletions,
      error: null,
      fetchError,
      fullName: source.fullName,
      headSha,
      name: source.name,
      routineOnly,
      sourceMode: "github-origin",
      testFiles,
      touchedFiles,
    };
  } catch (error) {
    return {
      collection: {
        baseSha: cursor?.sha ?? null,
        headSha: null,
        historyRewritten: false,
        mode: "error",
        reviewedAt: cursor?.reviewedAt ?? null,
      },
      commits: [],
      error: commandError(error, "Repository could not be read."),
      fetchError: null,
      fullName: source.fullName,
      name: source.name,
      sourceMode: "github-origin",
      touchedFiles: [],
    };
  }
}

const requestedRepositories = readerFeedback?.readerState?.payload?.selectedRepositories;
const repositoryModes = readerFeedback?.readerState?.payload?.repositoryModes ?? {};
const repositoryInventory = readerFeedback?.repositoryInventory ?? null;
const inventoryUpdatedAt = repositoryInventory?.updatedAt ? Date.parse(repositoryInventory.updatedAt) : NaN;
const inventoryAgeMs = Number.isFinite(inventoryUpdatedAt) ? Math.max(0, collectedAt.getTime() - inventoryUpdatedAt) : null;
const inventoryFreshness = repositoryInventory === null
  ? "unavailable"
  : inventoryAgeMs !== null && inventoryAgeMs > INVENTORY_STALE_AFTER_MS
    ? "stale"
    : "fresh";
const sourcePlan = buildAuthorizedSourcePlan({
  configuredSources: config.repositories,
  inventoryAvailable: repositoryInventory !== null,
  repositoryInventory: repositoryInventory?.repositories ?? [],
  repositoryModes,
  selectedRepositories: requestedRepositories,
});
const configuredSources = sourcePlan.sourcesToCollect;
const unconfiguredSelections = sourcePlan.unconfiguredSelections;
const repositories = await Promise.all(configuredSources.map(collectRepository));
const reviewLedger = buildRepositoryReviewLedger({ repositories, repositoryModes, unconfiguredSelections });
const mapImpact = buildMapImpacts(repositoryMaps, repositories);
const followUpCandidates = buildFollowUpCandidates({
  mapImpact,
  queuedQuestions: readerFeedback?.queuedQuestions ?? [],
  repositories,
  topicThreads: readerFeedback?.topicThreads ?? [],
});
const output = {
  collectedAt: collectedAt.toISOString(),
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
  sourcePlan: {
    counts: sourcePlan.counts,
    entries: sourcePlan.entries,
    inventory: repositoryInventory ? {
      ageHours: inventoryAgeMs === null ? null : Math.round((inventoryAgeMs / 3_600_000) * 10) / 10,
      freshness: inventoryFreshness,
      repositoryCount: repositoryInventory.repositoryCount,
      revision: repositoryInventory.revision,
      truncated: repositoryInventory.truncated,
      updatedAt: repositoryInventory.updatedAt,
    } : null,
    inventoryIsCurrent: sourcePlan.inventoryIsCurrent,
    inventoryIsFresh: inventoryFreshness === "fresh",
    requestedRepositories: sourcePlan.requestedRepositories,
  },
  periodEnd: collectedAt.toISOString().slice(0, 10),
  periodStart: since.slice(0, 10),
  repositories,
  windowDays: config.windowDays,
};

await mkdir(resolve(root, "data"), { recursive: true });
await writeFile(resolve(root, "data/candidates.json"), `${JSON.stringify(output, null, 2)}\n`);

console.log(`Source plan: ${sourcePlan.counts["configured-cache"]} configured caches; ${sourcePlan.counts["metadata-only"]} metadata-only; ${sourcePlan.counts["authorization-missing"]} missing authorization; ${sourcePlan.counts.muted} not scheduled.`);
console.log(`Authorized inventory: ${inventoryFreshness}${inventoryAgeMs === null ? "" : ` (${Math.round(inventoryAgeMs / 3_600_000)}h old)`}.`);
console.log(`Collected ${reviewLedger.inspectedCount} configured repositories from ${reviewLedger.requestedCount} requested sources.`);
console.log(`Review ledger: ${reviewLedger.counts["review-candidate"]} candidates; ${reviewLedger.counts.quiet} quiet; ${reviewLedger.counts.inaccessible} inaccessible.`);
console.log(`Map impact: ${mapImpact.affectedAreas.length} affected areas; ${mapImpact.unmappedFiles.length} changed files remain unmapped.`);
console.log(`Follow-up preflight: ${followUpCandidates.candidates.length} candidates; ${followUpCandidates.unmatchedThreads.length} active threads have no related collected change.`);
