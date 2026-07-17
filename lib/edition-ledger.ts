export type EditionSelectionPriority =
  | "reader-directed"
  | "significant-change"
  | "useful-comprehension"
  | "optional";

export type EditionIncludedFinding = {
  estimatedMinutes: number;
  priority: EditionSelectionPriority;
  reason: string;
  repository: string;
  storyId: string;
};

export type EditionSelectionFinding = {
  estimatedMinutes: number;
  id: string;
  priority: EditionSelectionPriority;
  reason: string;
  repository: string;
  title: string;
};

export type EditionRepositoryDecision = {
  reason: string;
  repository: string;
};

export type EditionSelectionRecord = {
  deferred: EditionSelectionFinding[];
  excluded: EditionSelectionFinding[];
  inaccessible: EditionRepositoryDecision[];
  included: EditionIncludedFinding[];
  inspectedRepositories: number;
  plannedMinutes: number;
  quiet: EditionRepositoryDecision[];
  readingBudgetMinutes: number;
};

export type EditionLedgerInput = {
  quietRepositories: string[];
  selection?: EditionSelectionRecord;
  stories: { id: string; repository?: string; title: string }[];
};

export type EditionLedgerMetric = {
  label: string;
  value: number | string;
};

export type EditionLedgerView = {
  description: string;
  headline: string;
  metrics: EditionLedgerMetric[];
  recorded: boolean;
  selection?: EditionSelectionRecord;
  unknownFields: string[];
};

export function buildEditionLedgerView(edition: EditionLedgerInput): EditionLedgerView {
  if (!edition.selection) {
    return {
      description: "This edition predates the selection ledger. Published and explicitly quiet repositories are known; inspected, deferred, excluded, and inaccessible candidates were not recorded.",
      headline: `${edition.stories.length} published ${edition.stories.length === 1 ? "finding" : "findings"}`,
      metrics: [
        { label: "Published", value: edition.stories.length },
        { label: "Recorded quiet", value: edition.quietRepositories.length },
        { label: "Omission record", value: "Unavailable" },
      ],
      recorded: false,
      unknownFields: [
        "Repositories inspected",
        "Qualifying findings deferred",
        "Findings excluded after review",
        "Inaccessible requested sources",
      ],
    };
  }

  const selection = edition.selection;
  const candidateCount = selection.included.length + selection.deferred.length + selection.excluded.length;
  return {
    description: selection.plannedMinutes > selection.readingBudgetMinutes
      ? `${selection.plannedMinutes} minutes planned against a ${selection.readingBudgetMinutes}-minute target because the highest-priority finding was larger than the target.`
      : `${selection.plannedMinutes} of ${selection.readingBudgetMinutes} target reading minutes planned.`,
    headline: `${selection.included.length} of ${candidateCount} reviewed ${candidateCount === 1 ? "finding" : "findings"} published`,
    metrics: [
      { label: "Repositories inspected", value: selection.inspectedRepositories },
      { label: "Reviewed findings", value: candidateCount },
      { label: "Published", value: selection.included.length },
      { label: "Deferred", value: selection.deferred.length },
    ],
    recorded: true,
    selection,
    unknownFields: [],
  };
}
