"use client";

import { useMemo, useState } from "react";
import {
  buildEditionHistory,
  filterEditionHistory,
  type HistoricalEdition,
  type HistoricalStory,
} from "@/lib/edition-history";
import type { ThreadQuestionRecord } from "@/lib/story-questions";
import {
  activeWatchThreadFor,
  topicThreadFor,
  type TopicThreadRecord,
} from "@/lib/story-topics";
import { StoryCode, type CodeEvidence } from "./story-code";

type ArchiveStory = HistoricalStory & {
  brief: string;
  codeEvidence?: CodeEvidence[];
  commits?: { sha: string; url: string }[];
  evidence: string;
  files: string[];
  timing: string;
  verdict: string;
};

export type ArchiveEdition = HistoricalEdition<ArchiveStory> & {
  quietRepositories: string[];
};

type ReviewLens = {
  id: string;
  label: string;
};

type EditionHistoryProps = {
  demoMode?: boolean;
  defaultQuestionLens: string;
  editions: readonly ArchiveEdition[];
  feedbackConfigured: boolean;
  onQuestionSaved: (question: ThreadQuestionRecord, topic?: TopicThreadRecord) => void;
  onQuestionUpdated: (question: ThreadQuestionRecord) => void;
  questionLenses: ReviewLens[];
  questions: ThreadQuestionRecord[];
  topicThreads: TopicThreadRecord[];
};

type AttentionFilter = "all" | "questions" | "watched";

function editionRange(edition: HistoricalEdition) {
  const formatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(`${edition.periodStart}T00:00:00Z`))}–${formatter.format(new Date(`${edition.periodEnd}T00:00:00Z`))}`;
}

function repositoryLabel(repository: string) {
  return repository.split("/").at(-1) ?? repository;
}

export function EditionHistory({
  demoMode = false,
  defaultQuestionLens,
  editions,
  feedbackConfigured,
  onQuestionSaved,
  onQuestionUpdated,
  questionLenses,
  questions,
  topicThreads,
}: EditionHistoryProps) {
  const [query, setQuery] = useState("");
  const [repository, setRepository] = useState("");
  const [topicId, setTopicId] = useState("");
  const [attention, setAttention] = useState<AttentionFilter>("all");
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const history = useMemo(() => buildEditionHistory(editions), [editions]);
  const repositories = useMemo(
    () => [...new Set(history.flatMap((entry) => entry.repository ? [entry.repository] : []))].sort(),
    [history],
  );
  const topics = useMemo(() => {
    const labels = new Map<string, string>();
    for (const entry of history) {
      if (!labels.has(entry.story.topicId)) labels.set(entry.story.topicId, entry.story.title);
    }
    return [...labels].sort((left, right) => left[1].localeCompare(right[1]));
  }, [history]);
  const topicEditionCounts = useMemo(() => {
    const editionsByTopic = new Map<string, Set<string>>();
    for (const entry of history) {
      const editionIds = editionsByTopic.get(entry.story.topicId) ?? new Set<string>();
      editionIds.add(entry.edition.id);
      editionsByTopic.set(entry.story.topicId, editionIds);
    }
    return new Map([...editionsByTopic].map(([id, editionIds]) => [id, editionIds.size]));
  }, [history]);
  const longestThread = useMemo(() => {
    return history
      .map((entry) => ({ count: topicEditionCounts.get(entry.story.topicId) ?? 1, entry }))
      .sort((left, right) => right.count - left.count)[0];
  }, [history, topicEditionCounts]);
  const filtered = useMemo(() => {
    const matching = filterEditionHistory(history, { query, repository, topicId });
    if (attention === "questions") {
      return matching.filter((entry) => questions.some((question) =>
        question.status === "open" &&
        question.editionId === entry.edition.id &&
        question.storyId === entry.story.id
      ));
    }
    if (attention === "watched") {
      return matching.filter((entry) => Boolean(activeWatchThreadFor(topicThreads, entry.story)));
    }
    return matching;
  }, [attention, history, query, questions, repository, topicId, topicThreads]);
  const editionGroups = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      const current = groups.get(entry.edition.id) ?? [];
      current.push(entry);
      groups.set(entry.edition.id, current);
    }
    return [...groups.values()];
  }, [filtered]);

  const resetFilters = () => {
    setQuery("");
    setRepository("");
    setTopicId("");
    setAttention("all");
  };

  return (
    <section className="history-view" aria-labelledby="history-heading">
      <div className="section-heading">
        <div>
          <span>Immutable evidence</span>
          <h2 id="history-heading">{new Set(history.map((entry) => entry.edition.id)).size} archived edition{new Set(history.map((entry) => entry.edition.id)).size === 1 ? "" : "s"}</h2>
        </div>
        <p>Reading state stays live; published explanations and commit ranges do not change.</p>
      </div>

      {longestThread && longestThread.count > 1 && (
        <button
          className="history-thread-callout"
          onClick={() => {
            setTopicId(longestThread.entry.story.topicId);
            setAttention("all");
          }}
          type="button"
        >
          <span>Longest living thread · {longestThread.count} editions</span>
          <strong>{longestThread.entry.story.title}</strong>
          <small>Follow how one concern became a product capability <span aria-hidden="true">→</span></small>
        </button>
      )}

      <div className="history-filters" aria-label="History filters">
        <label className="history-search">
          <span>Search history</span>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Title, project, topic, repository" type="search" value={query} />
        </label>
        <label>
          <span>Repository</span>
          <select onChange={(event) => setRepository(event.target.value)} value={repository}>
            <option value="">All repositories</option>
            {repositories.map((item) => <option key={item} value={item}>{repositoryLabel(item)}</option>)}
          </select>
        </label>
        <label>
          <span>Topic</span>
          <select onChange={(event) => setTopicId(event.target.value)} value={topicId}>
            <option value="">All topics</option>
            {topics.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <div className="history-attention" aria-label="Filter by reader attention">
          {(["all", "watched", "questions"] as const).map((filter) => (
            <button aria-pressed={attention === filter} key={filter} onClick={() => setAttention(filter)} type="button">
              {filter === "all" ? "All" : filter === "watched" ? "Watched" : "Open questions"}
            </button>
          ))}
        </div>
      </div>

      {editionGroups.length ? (
        <div className="history-editions">
          {editionGroups.map((entries) => {
            const edition = entries[0].edition;
            return (
              <section className="history-edition" key={edition.id} aria-labelledby={`edition-${edition.id}`}>
                <header>
                  <div>
                    <span>{edition.id}</span>
                    <h3 id={`edition-${edition.id}`}>{editionRange(edition)}</h3>
                  </div>
                  <small>{entries.length} matching {entries.length === 1 ? "story" : "stories"}</small>
                </header>
                <div className="history-stories">
                  {entries.map((entry) => {
                    const key = `${entry.edition.id}:${entry.story.id}`;
                    const isOpen = openEntry === key;
                    const openQuestions = questions.filter((question) =>
                      question.status === "open" &&
                      question.editionId === entry.edition.id &&
                      question.storyId === entry.story.id
                    ).length;
                    const watched = Boolean(activeWatchThreadFor(topicThreads, entry.story));
                    const evidenceAvailable = Boolean(
                      entry.story.repository &&
                      entry.story.codeEvidence?.length &&
                      (!demoMode || entry.repository === "teamleaderleo/baxtori")
                    );
                    return (
                      <article className={`history-story ${isOpen ? "is-open" : ""}`} key={key}>
                        <div className="history-story-summary">
                          <div>
                            <div className="history-story-meta">
                              <span>{entry.story.project}</span>
                              <span>{entry.repository ? repositoryLabel(entry.repository) : "Repository unavailable"}</span>
                              {(topicEditionCounts.get(entry.story.topicId) ?? 1) > 1 && <span className="is-thread">Thread · {topicEditionCounts.get(entry.story.topicId)} editions</span>}
                              {watched && <span className="is-attention">Watching</span>}
                              {openQuestions > 0 && <span className="is-attention">{openQuestions} open {openQuestions === 1 ? "question" : "questions"}</span>}
                            </div>
                            <h4>{entry.story.title}</h4>
                            <p>{entry.story.brief}</p>
                          </div>
                          <button
                            aria-expanded={isOpen}
                            disabled={!evidenceAvailable}
                            onClick={() => setOpenEntry(isOpen ? null : key)}
                            type="button"
                          >
                            {isOpen ? "Close evidence" : evidenceAvailable ? "Reopen exact diff" : demoMode ? "Sign in for exact diff" : "Evidence unavailable"}
                          </button>
                        </div>
                        {isOpen && entry.story.repository && entry.story.codeEvidence?.length ? (
                          <div className="history-evidence">
                            <StoryCode
                              demoMode={demoMode}
                              defaultQuestionLens={defaultQuestionLens}
                              editionId={entry.edition.id}
                              evidence={entry.story.codeEvidence}
                              feedbackConfigured={feedbackConfigured}
                              onQuestionSaved={onQuestionSaved}
                              onQuestionUpdated={onQuestionUpdated}
                              questionLenses={questionLenses}
                              questions={questions}
                              repository={entry.story.repository}
                              storyId={entry.story.id}
                              storyTitle={entry.story.title}
                              topicId={entry.story.topicId}
                              topicThread={topicThreadFor(topicThreads, entry.story)}
                            />
                            <div className="history-proof">
                              <strong>{entry.story.evidence}</strong>
                              <span>Published {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(entry.edition.generatedAt))}</span>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="history-empty">
          <span>No matching evidence</span>
          <h3>Try a broader history filter.</h3>
          <p>The archive is unchanged; only this view is filtered.</p>
          <button onClick={resetFilters} type="button">Clear filters</button>
        </div>
      )}
    </section>
  );
}
