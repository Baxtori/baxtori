import { canonicalRepository } from "./repository-identity.ts";

export type HistoricalStory = {
  id: string;
  project: string;
  repository?: string;
  title: string;
  topicId: string;
};

export type HistoricalEdition<TStory extends HistoricalStory = HistoricalStory> = {
  generatedAt: string;
  id: string;
  periodEnd: string;
  periodStart: string;
  stories: TStory[];
};

export type EditionHistoryEntry<TStory extends HistoricalStory = HistoricalStory> = {
  edition: HistoricalEdition<TStory>;
  repository: string | null;
  story: TStory;
};

export type EditionHistoryFilters = {
  query?: string;
  repository?: string;
  since?: string;
  topicId?: string;
};

/**
 * Builds a newest-first immutable history index. The first occurrence of an
 * edition id wins so callers can put the canonical current edition before an
 * older archived copy retained with legacy repository names.
 */
export function buildEditionHistory<TStory extends HistoricalStory>(
  editions: readonly HistoricalEdition<TStory>[],
) {
  const seenEditions = new Set<string>();
  const history: EditionHistoryEntry<TStory>[] = [];

  for (const edition of editions) {
    if (seenEditions.has(edition.id)) continue;
    seenEditions.add(edition.id);

    for (const story of edition.stories) {
      history.push({
        edition,
        repository: story.repository ? canonicalRepository(story.repository) : null,
        story,
      });
    }
  }

  return history.sort((left, right) =>
    right.edition.periodEnd.localeCompare(left.edition.periodEnd) ||
    left.story.title.localeCompare(right.story.title),
  );
}

export function filterEditionHistory<TStory extends HistoricalStory>(
  history: readonly EditionHistoryEntry<TStory>[],
  filters: EditionHistoryFilters,
) {
  const repository = filters.repository
    ? canonicalRepository(filters.repository)
    : null;
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";

  return history.filter((entry) => {
    if (repository && entry.repository !== repository) return false;
    if (filters.since && entry.edition.periodEnd < filters.since) return false;
    if (filters.topicId && entry.story.topicId !== filters.topicId) return false;
    if (!query) return true;

    return [
      entry.story.title,
      entry.story.project,
      entry.story.topicId,
      entry.repository ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(query));
  });
}
