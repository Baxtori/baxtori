from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "app/page.tsx",
    '''type ActivityResponse = {
  commits?: Commit[];
  days?: number;
  error?: string;
  repository?: string;
  since?: string;
  truncated?: boolean;
  window?: "rolling" | "since-review";
};''',
    '''type ActivityResponse = {
  commits?: Commit[];
  days?: number;
  error?: string;
  repository?: string;
  since?: string;
  status?: "active" | "deferred" | "inaccessible" | "quiet" | "rate-limited" | "unavailable";
  truncated?: boolean;
  window?: "rolling" | "since-review";
};

type ActivitySyncResponse = {
  activity?: Record<string, ActivityResponse>;
  error?: string;
};''',
)

replace_once(
    "app/page.tsx",
    '''  useEffect(() => {
    if (!auth?.authenticated || !repositoryModesInitialized || !selectedRepositories.length) {
      queueMicrotask(() => setActivity({}));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setActivityLoading(true);
    });
    mapWithConcurrency(
      selectedRepositories,
      6,
      async (repository) => {
        const response = await fetch(`/api/github/activity?repo=${encodeURIComponent(repository)}&since=${encodeURIComponent(REVIEW_SCOPE.lastReviewedAt)}`);
        const payload = (await response.json()) as ActivityResponse;
        return [repository, payload] as const;
      },
    )
      .then((entries) => {
        if (!cancelled) setActivity(Object.fromEntries(entries));
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.authenticated, repositoryModesInitialized, selectedRepositories]);''',
    '''  useEffect(() => {
    if (!auth?.authenticated || !repositoryModesInitialized || !selectedRepositories.length) {
      queueMicrotask(() => setActivity({}));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setActivityLoading(true);
    });

    const loadSerialPreview = async () => Object.fromEntries(await mapWithConcurrency(
      selectedRepositories,
      1,
      async (repository) => {
        const response = await fetch(`/api/github/activity?repo=${encodeURIComponent(repository)}&since=${encodeURIComponent(REVIEW_SCOPE.lastReviewedAt)}`);
        const payload = (await response.json()) as ActivityResponse;
        return [repository, payload] as const;
      },
    ));

    const loadActivity = async () => {
      if (!feedbackConfigured) return loadSerialPreview();
      const response = await fetch("/api/github/activity/sync", {
        body: JSON.stringify({ repositoryModes, since: REVIEW_SCOPE.lastReviewedAt }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ActivitySyncResponse;
      if (!response.ok || !payload.activity) return loadSerialPreview();
      return payload.activity;
    };

    void loadActivity()
      .then((entries) => {
        if (!cancelled) setActivity(entries);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.authenticated, feedbackConfigured, repositoryModes, repositoryModesInitialized, selectedRepositories]);''',
)

replace_once(
    "scripts/collect-backstory.mjs",
    '''const repositoryModes = readerFeedback?.readerState?.payload?.repositoryModes ?? {};
const repositoryInventory = readerFeedback?.repositoryInventory ?? null;
const sourcePlan = buildAuthorizedSourcePlan({
  configuredSources: config.repositories,
  inventoryAvailable: repositoryInventory !== null,
  repositoryInventory: repositoryInventory?.repositories ?? [],
  repositoryModes,
  selectedRepositories: requestedRepositories,
});''',
    '''const repositoryModes = readerFeedback?.readerState?.payload?.repositoryModes ?? {};
const repositoryActivity = readerFeedback?.repositoryActivity ?? null;
const repositoryInventory = readerFeedback?.repositoryInventory ?? null;
const sourcePlan = buildAuthorizedSourcePlan({
  configuredSources: config.repositories,
  inventoryAvailable: repositoryInventory !== null,
  repositoryActivity: repositoryActivity?.records ?? [],
  repositoryInventory: repositoryInventory?.repositories ?? [],
  repositoryModes,
  selectedRepositories: requestedRepositories,
});''',
)

replace_once(
    "scripts/collect-backstory.mjs",
    'const reviewLedger = buildRepositoryReviewLedger({ repositories, repositoryModes, unconfiguredSelections });',
    'const reviewLedger = buildRepositoryReviewLedger({ repositories, repositoryModes, sourcePlanEntries: sourcePlan.entries, unconfiguredSelections });',
)

replace_once(
    "scripts/collect-backstory.mjs",
    '''    readerState: readerFeedback.readerState,
    queuedQuestions: readerFeedback.queuedQuestions ?? [],
    reviewRequests: readerFeedback.reviewRequests,''',
    '''    readerState: readerFeedback.readerState,
    queuedQuestions: readerFeedback.queuedQuestions ?? [],
    repositoryActivity,
    reviewRequests: readerFeedback.reviewRequests,''',
)

replace_once(
    "scripts/collect-backstory.mjs",
    '''    counts: sourcePlan.counts,
    entries: sourcePlan.entries,
    inventory: repositoryInventory ? {''',
    '''    activity: repositoryActivity ? {
      deferredCount: repositoryActivity.deferredCount,
      halted: repositoryActivity.halted,
      rateLimit: repositoryActivity.rateLimit,
      repositoryCount: repositoryActivity.repositoryCount,
      requestBudget: repositoryActivity.requestBudget,
      requestCount: repositoryActivity.requestCount,
      revision: repositoryActivity.revision,
      since: repositoryActivity.since,
      updatedAt: repositoryActivity.updatedAt,
    } : null,
    counts: sourcePlan.counts,
    entries: sourcePlan.entries,
    inventory: repositoryInventory ? {''',
)

replace_once(
    "scripts/collect-backstory.mjs",
    'console.log(`Source plan: ${sourcePlan.counts["configured-cache"]} configured caches; ${sourcePlan.counts["metadata-only"]} metadata-only; ${sourcePlan.counts["authorization-missing"]} missing authorization; ${sourcePlan.counts.muted} not scheduled.`);',
    'console.log(`Source plan: ${sourcePlan.counts["configured-cache"]} configured caches; ${sourcePlan.counts["activity-candidate"]} metadata activity candidates; ${sourcePlan.counts["metadata-only"]} metadata-only; ${sourcePlan.counts["authorization-missing"]} missing authorization; ${sourcePlan.counts.muted} not scheduled.`);',
)

replace_once(
    "scripts/lib/authorized-source-plan.mjs",
    '''      entries.push({
        ...activitySummary,
        archived: entry.archived,''',
    '''      entries.push({
        ...activitySummary,
        activityCandidate: false,
        archived: entry.archived,''',
)

replace_once(
    "tests/authorized-source-plan.test.mjs",
    '  assert.equal(plan.entries[0].activityCandidate, true);',
    '  assert.equal(plan.entries[0].activityCandidate, false);',
)
