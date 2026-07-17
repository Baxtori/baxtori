from pathlib import Path

path = Path("scripts/collect-backstory.mjs")
text = path.read_text()

replacements = [
    (
        'import { buildFollowUpCandidates } from "./lib/follow-up-candidates.mjs";\n',
        'import { buildRepositoryReviewLedger, EDITION_SELECTION_PRIORITIES } from "./lib/edition-selection.mjs";\nimport { buildFollowUpCandidates } from "./lib/follow-up-candidates.mjs";\n',
    ),
    (
        '''const requestedRepositories = readerFeedback?.readerState?.payload?.selectedRepositories;
const selectedRepositorySet = Array.isArray(requestedRepositories) ? new Set(requestedRepositories) : null;
const configuredSources = selectedRepositorySet
  ? config.repositories.filter((source) => selectedRepositorySet.has(source.fullName))
  : config.repositories;
const repositories = configuredSources.map(collectRepository);
const mapImpact = buildMapImpacts(repositoryMaps, repositories);
''',
        '''const requestedRepositories = readerFeedback?.readerState?.payload?.selectedRepositories;
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
''',
    ),
    (
        '''    evidenceRule: "Every claim must be supported by the listed commits and files. Do not infer unobserved behavior.",
    quietRule: "Publish no story for repositories with no commits or only routine lockfile/documentation churn unless that churn changes behavior.",
    storyLimit: 5,
    followUpRule: "Treat follow-up candidates as review prompts only. Publish a return to the reader only after inspecting the original evidence and the new commits, then record the exact match reason and new evidence.",
''',
        '''    budgetRule: "Estimate reading time only after a finding has been reviewed and can be explained. Pack qualifying findings by priority into the target budget; do not impose a story-count ceiling. If the highest-priority finding exceeds the target, publish it alone rather than hiding it.",
    evidenceRule: "Every claim must be supported by the listed commits and files. Do not infer unobserved behavior.",
    priorityOrder: EDITION_SELECTION_PRIORITIES,
    publicationThresholdRule: "A finding qualifies only after review establishes exact evidence, a concrete consequence, an explanation that adds more than the commit message, and a reason to spend reader attention now.",
    quietRule: "Publish no story for repositories with no commits or only routine lockfile/documentation churn unless that churn changes behavior.",
    readingBudgetMinutes: 15,
    followUpRule: "Treat follow-up candidates as review prompts only. Publish a return to the reader only after inspecting the original evidence and the new commits, then record the exact match reason and new evidence.",
''',
    ),
    (
        '''    unconfiguredSelections: Array.isArray(requestedRepositories)
      ? requestedRepositories.filter((repository) => !config.repositories.some((source) => source.fullName === repository))
      : [],
''',
        '''    unconfiguredSelections,
''',
    ),
    (
        '''  periodEnd: new Date().toISOString().slice(0, 10),
''',
        '''  reviewLedger,
  periodEnd: new Date().toISOString().slice(0, 10),
''',
    ),
    (
        '''const active = repositories.filter((repository) => repository.commits.length && !repository.routineOnly).length;
console.log(`Collected ${repositories.length} selected repositories; ${active} have potentially meaningful changes.`);
''',
        '''console.log(`Collected ${reviewLedger.inspectedCount} configured repositories from ${reviewLedger.requestedCount} requested sources.`);
console.log(`Review ledger: ${reviewLedger.counts["review-candidate"]} candidates; ${reviewLedger.counts.quiet} quiet; ${reviewLedger.counts.inaccessible} inaccessible.`);
''',
    ),
]

for before, after in replacements:
    count = text.count(before)
    if count != 1:
        raise SystemExit(f"Expected one collector match, found {count}: {before[:80]!r}")
    text = text.replace(before, after, 1)

path.write_text(text)
