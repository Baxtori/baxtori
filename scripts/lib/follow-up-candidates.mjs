import { canonicalRepository } from "./repository-identity.mjs";

function normalizedPath(path) {
  return String(path ?? "").replace(/^\.\//, "").replace(/\/$/, "");
}

function commitSummary(commit) {
  return {
    date: commit.date,
    sha: commit.sha,
    shortSha: commit.shortSha,
    subject: commit.subject,
    url: commit.url,
  };
}

function uniqueCommits(commits) {
  const bySha = new Map();
  for (const commit of commits) {
    if (commit?.sha && !bySha.has(commit.sha)) bySha.set(commit.sha, commitSummary(commit));
  }
  return [...bySha.values()].sort((left, right) =>
    String(left.date ?? "").localeCompare(String(right.date ?? "")) || left.sha.localeCompare(right.sha),
  );
}

function questionIdsForThread(questions, threadId) {
  return questions
    .filter((question) => String(question.threadId) === String(threadId))
    .map((question) => String(question._id))
    .sort();
}

export function buildFollowUpCandidates({
  mapImpact = { affectedAreas: [] },
  queuedQuestions = [],
  repositories = [],
  topicThreads = [],
} = {}) {
  const repositoryByName = new Map(repositories.map((repository) => [
    canonicalRepository(repository.fullName),
    repository,
  ]));
  const affectedAreas = Array.isArray(mapImpact?.affectedAreas) ? mapImpact.affectedAreas : [];
  const candidates = [];
  const unmatchedThreads = [];

  for (const thread of topicThreads) {
    if (thread.status && thread.status !== "active") continue;
    const repository = canonicalRepository(thread.evidence?.repository ?? "");
    const questionIds = questionIdsForThread(queuedQuestions, thread._id);
    const collected = repositoryByName.get(repository);
    if (!collected) {
      unmatchedThreads.push({
        questionIds,
        reason: "repository-not-collected",
        repository,
        threadId: String(thread._id),
      });
      continue;
    }

    const originalPath = normalizedPath(thread.evidence?.path);
    const excludedCommits = new Set([
      thread.evidence?.baseCommit,
      thread.evidence?.headCommit,
    ].filter(Boolean));
    const exactCommits = (collected.commits ?? []).filter((commit) =>
      !excludedCommits.has(commit.sha) &&
      (commit.files ?? []).some((file) => normalizedPath(file.path) === originalPath),
    );
    const areaImpact = thread.areaId
      ? affectedAreas.find((area) =>
          canonicalRepository(area.repository) === repository && area.areaId === thread.areaId,
        )
      : null;

    if (!exactCommits.length && !areaImpact) {
      unmatchedThreads.push({
        questionIds,
        reason: "no-related-collected-change",
        repository,
        threadId: String(thread._id),
      });
      continue;
    }

    const matchReasons = [];
    if (exactCommits.length) {
      matchReasons.push({
        explanation: "A collected commit changed the exact file retained by this topic.",
        kind: "exact-path",
        path: originalPath,
      });
    }
    if (areaImpact) {
      matchReasons.push({
        areaId: areaImpact.areaId,
        areaName: areaImpact.areaName,
        explanation: "A collected commit changed evidence registered to the same mapped area.",
        kind: "mapped-area",
      });
    }

    const changedFiles = new Set();
    for (const commit of exactCommits) {
      for (const file of commit.files ?? []) {
        if (normalizedPath(file.path) === originalPath) changedFiles.add(file.path);
      }
    }
    for (const path of areaImpact?.changedFiles ?? []) changedFiles.add(path);

    const commits = uniqueCommits([
      ...exactCommits,
      ...(areaImpact?.commits ?? []),
    ]);
    candidates.push({
      changedFiles: [...changedFiles].sort(),
      commits,
      id: `follow-up:${String(thread._id)}:${commits.map((commit) => commit.shortSha ?? commit.sha.slice(0, 7)).join("-")}`,
      matchReasons,
      matchStrength: exactCommits.length ? "exact-path" : "mapped-area",
      needsReview: true,
      originalEvidence: {
        ...thread.evidence,
        repository,
      },
      origin: thread.origin,
      questionIds,
      readerFacing: false,
      repository,
      sourceKey: thread.sourceKey,
      threadId: String(thread._id),
      title: thread.title,
    });
  }

  candidates.sort((left, right) =>
    left.repository.localeCompare(right.repository) || left.threadId.localeCompare(right.threadId),
  );
  unmatchedThreads.sort((left, right) =>
    left.repository.localeCompare(right.repository) || left.threadId.localeCompare(right.threadId),
  );

  return {
    candidates,
    rules: {
      mappedAreaRequiresExplicitAreaId: true,
      readerFacingRequiresReview: true,
      weakFilenameMatchesExcluded: true,
    },
    unmatchedThreads,
  };
}
