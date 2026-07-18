"use client";

import { useEffect, useRef, useState, type CSSProperties, type UIEvent } from "react";
import latestEdition from "@/data/latest.json";
import ourchivalMap from "@/data/maps/ourchival.json";
import oneMoreLegendMap from "@/data/maps/one-more-legend.json";
import repositoryMap from "@/data/repo-map.json";
import type { DiffLine } from "@/lib/code-diff";
import { highlightCodeLines, type SyntaxToken } from "@/lib/code-highlight";
import {
  buildStoryOrientation,
  type OrientationMap,
  type OrientationStory,
} from "@/lib/story-orientation";
import type { ThreadQuestionRecord } from "@/lib/story-questions";
import type { TopicThreadRecord } from "@/lib/story-topics";
import { EvidenceQuestion, type QuestionReviewLens } from "./evidence-question";
import styles from "./story-code.module.css";

export type CodeEvidence = {
  baseCommit: string;
  commit: string;
  endLine: number;
  language: string;
  path: string;
  startLine: number;
  title: string;
  why: string;
};

type CodeResponse = {
  error?: string;
  lines?: { number: number; text: string }[];
  sourceUrl?: string;
};

type DiffResponse = {
  additions?: number;
  deletions?: number;
  error?: string;
  lines?: DiffLine[];
  sourceUrl?: string;
};

type HighlightedDiffLine = DiffLine & {
  tokens: SyntaxToken[];
};

type PublishedStory = OrientationStory & {
  codeEvidence?: CodeEvidence[];
  id: string;
};

type StoryCodeProps = {
  demoMode?: boolean;
  defaultQuestionLens: string;
  editionId: string;
  evidence: CodeEvidence[];
  feedbackConfigured: boolean;
  onQuestionSaved: (question: ThreadQuestionRecord, topic?: TopicThreadRecord) => void;
  onQuestionUpdated: (question: ThreadQuestionRecord) => void;
  questionLenses: QuestionReviewLens[];
  questions: ThreadQuestionRecord[];
  repository: string;
  storyId: string;
  storyTitle: string;
  topicId: string;
  topicThread?: TopicThreadRecord;
};

type ViewMode = "current" | "diff";

const REPOSITORY_MAPS = [repositoryMap, ourchivalMap, oneMoreLegendMap] as unknown as OrientationMap[];
const PUBLISHED_STORIES = latestEdition.stories as unknown as PublishedStory[];

function scrollPercentage(element: HTMLElement) {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((element.scrollTop / scrollable) * 100)));
}

export function StoryCode({
  demoMode = false,
  defaultQuestionLens,
  editionId,
  evidence,
  feedbackConfigured,
  onQuestionSaved,
  onQuestionUpdated,
  questionLenses,
  questions,
  repository,
  storyId,
  storyTitle,
  topicId,
  topicThread,
}: StoryCodeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [codeResponse, setCodeResponse] = useState<CodeResponse | null>(null);
  const [diffResponse, setDiffResponse] = useState<DiffResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("diff");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [showBearings, setShowBearings] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const active = evidence[activeIndex];
  const publishedStory = PUBLISHED_STORIES.find((story) => story.id === storyId);
  const orientation = active && publishedStory
    ? buildStoryOrientation({ active, maps: REPOSITORY_MAPS, repository, story: publishedStory })
    : null;
  const headingId = `code-heading-${storyId}`;
  const panelId = `code-panel-${storyId}`;
  const activeTabId = `code-tab-${storyId}-${activeIndex}`;
  const highlightedLines = codeResponse?.lines ? highlightCodeLines(codeResponse.lines, active?.language) : [];
  const highlightedDiffLines: HighlightedDiffLine[] = diffResponse?.lines?.map((line, index) => ({
    ...line,
    tokens: line.kind === "hunk" || line.kind === "meta"
      ? []
      : highlightCodeLines([{ number: index, text: line.text }], active?.language)[0].tokens,
  })) ?? [];

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const codeQuery = new URLSearchParams({
      commit: active.commit,
      end: String(active.endLine),
      path: active.path,
      repo: repository,
      start: String(active.startLine),
    });
    const diffQuery = new URLSearchParams({
      base: active.baseCommit,
      end: String(active.endLine),
      head: active.commit,
      path: active.path,
      repo: repository,
      start: String(active.startLine),
    });
    if (demoMode) {
      codeQuery.set("demo", "1");
      diffQuery.set("demo", "1");
    }
    queueMicrotask(() => {
      setLoading(true);
      setCodeResponse(null);
      setDiffResponse(null);
      setViewMode("diff");
      setCopied(false);
      setScrollProgress(0);
    });

    Promise.all([
      fetch(`/api/github/code?${codeQuery}`, { signal: controller.signal }),
      fetch(`/api/github/diff?${diffQuery}`, { signal: controller.signal }),
    ])
      .then(async ([codeResult, diffResult]) => {
        const [codePayload, diffPayload] = await Promise.all([
          codeResult.json() as Promise<CodeResponse>,
          diffResult.json() as Promise<DiffResponse>,
        ]);
        if (controller.signal.aborted) return;
        setCodeResponse(codeResult.ok ? codePayload : { error: codePayload.error ?? "This code excerpt could not be loaded." });
        setDiffResponse(diffResult.ok ? diffPayload : { error: diffPayload.error ?? "This diff could not be loaded." });
        if (!diffResult.ok) setViewMode("current");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setCodeResponse({ error: error.message });
          setDiffResponse({ error: error.message });
          setViewMode("current");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, demoMode, repository]);

  useEffect(() => {
    if (!fullScreen) return;
    const previousOverflow = document.documentElement.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullScreen(false);
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [fullScreen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (frameRef.current) setScrollProgress(scrollPercentage(frameRef.current));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, fullScreen, loading, viewMode, wrapLines]);

  if (!active) return null;

  const copyVisibleCode = async () => {
    let source: string;
    let label: string;
    if (viewMode === "diff" && diffResponse?.lines) {
      const markers = { addition: "+", context: " ", deletion: "-", hunk: "", meta: "" } as const;
      source = diffResponse.lines.map((line) => `${markers[line.kind]}${line.text}`).join("\n");
      label = `${active.path} · ${active.baseCommit.slice(0, 7)}...${active.commit.slice(0, 7)}`;
    } else if (codeResponse?.lines) {
      source = codeResponse.lines.map((line) => line.text).join("\n");
      label = `${active.path}:${active.startLine}-${active.endLine}`;
    } else {
      return;
    }
    await navigator.clipboard.writeText(`${label}\n\n${source}`);
    setCopied(true);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollProgress(scrollPercentage(event.currentTarget));
  };

  const visibleSourceUrl = viewMode === "diff" ? diffResponse?.sourceUrl : codeResponse?.sourceUrl;
  const visibleError = viewMode === "diff" ? diffResponse?.error : codeResponse?.error;
  const hasVisibleCode = viewMode === "diff" ? highlightedDiffLines.length > 0 : highlightedLines.length > 0;
  const repositoryLabel = orientation?.repository.split("/").at(-1) ?? repository.split("/").at(-1) ?? repository;

  return (
    <section className={`story-code ${styles.reader} ${fullScreen ? "is-fullscreen" : ""}`} aria-labelledby={headingId}>
      <header className="story-code-heading">
        <div>
          <span>Code evidence {activeIndex + 1}/{evidence.length}</span>
          <h4 id={headingId}>{active.title}</h4>
        </div>
        <div className="code-heading-actions">
          <small>{active.baseCommit.slice(0, 7)} → {active.commit.slice(0, 7)}</small>
          <button aria-pressed={fullScreen} onClick={() => setFullScreen((current) => !current)} type="button">
            {fullScreen ? "Done" : "Expand"}
          </button>
        </div>
      </header>

      {evidence.length > 1 && (
        <div className="code-tabs" role="tablist" aria-label="Code excerpts">
          {evidence.map((item, index) => (
            <button
              aria-controls={panelId}
              aria-selected={index === activeIndex}
              id={`code-tab-${storyId}-${index}`}
              key={`${item.commit}:${item.path}:${item.startLine}`}
              onClick={() => setActiveIndex(index)}
              role="tab"
              type="button"
            >
              <strong><small>{String(index + 1).padStart(2, "0")}</small>{item.title}</strong>
              <span>{item.path.split("/").at(-1)} · L{item.startLine}–{item.endLine}</span>
            </button>
          ))}
        </div>
      )}

      <div aria-labelledby={evidence.length > 1 ? activeTabId : headingId} id={panelId} role="tabpanel">
        {orientation && (
          <section className={styles.bearings} aria-label="Repository bearings">
            <div className={styles.bearingsHeading}>
              <div>
                <span>Repository bearings</span>
                <strong>{orientation.area?.name ?? "Outside the current repository map"}</strong>
                <p>{orientation.repositorySummary ?? `Current evidence in ${orientation.repository}.`}</p>
              </div>
              <button aria-expanded={showBearings} onClick={() => setShowBearings((current) => !current)} type="button">
                {showBearings ? "Hide bearings" : "Show bearings"}
              </button>
            </div>

            <nav className={styles.breadcrumb} aria-label="Code location">
              <strong>{repositoryLabel}</strong>
              <i aria-hidden="true">/</i>
              {orientation.area && <><strong>{orientation.area.name}</strong><i aria-hidden="true">/</i></>}
              {orientation.pathParts.map((part, index) => (
                <span key={`${part}-${index}`}>
                  {part}{index < orientation.pathParts.length - 1 && <i aria-hidden="true"> / </i>}
                </span>
              ))}
              <strong>L{active.startLine}–{active.endLine}</strong>
            </nav>

            {showBearings && (
              <div className={styles.bearingsBody}>
                <section className={styles.locationCard}>
                  <span className={styles.sectionLabel}>Where this sits</span>
                  <h5 className={orientation.area ? undefined : styles.unmapped}>
                    {orientation.area ? `${orientation.area.kind} · ${orientation.area.name}` : "Unmapped in the current repository model"}
                  </h5>
                  <p>{orientation.area?.purpose ?? "The exact file remains inspectable, while the current repository map has no reviewed area claiming this path yet."}</p>
                  {orientation.area && (
                    <>
                      <div className={styles.metrics}>
                        <div>
                          <strong>{orientation.area.position}/{orientation.area.totalAreas}</strong>
                          <span>Mapped area position</span>
                        </div>
                        <div>
                          <strong>{orientation.area.evidencePosition ?? "—"}/{orientation.area.evidenceCount}</strong>
                          <span>File in area evidence</span>
                        </div>
                        <div>
                          <strong>{orientation.area.coverageEstimate}%</strong>
                          <span>Map coverage estimate</span>
                        </div>
                      </div>
                      <ul className={styles.conceptList} aria-label="Area concepts">
                        {orientation.area.concepts.slice(0, 4).map((concept) => <li key={concept}>{concept}</li>)}
                      </ul>
                    </>
                  )}
                </section>

                <section className={styles.selectionCard}>
                  <span className={styles.sectionLabel}>Why this is here</span>
                  <h5>{orientation.selection.headline}</h5>
                  <p>{orientation.selection.explanation}</p>
                  <ul className={styles.signalList} aria-label="Selection signals">
                    {orientation.selection.signals.map((signal) => <li key={signal}>{signal}</li>)}
                  </ul>
                </section>

                {orientation.connections.length > 0 && (
                  <section className={styles.connections}>
                    <span className={styles.sectionLabel}>Connected through this story</span>
                    <ul className={styles.connectionList}>
                      {orientation.connections.map((connection) => (
                        <li key={connection.id}>
                          <strong>{connection.name}</strong>
                          <span>{connection.kind} · {connection.sharedPaths.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <p className={styles.modelNote}>
                  Map position and coverage describe Baxtori&apos;s reviewed knowledge model. They are bearings for reading, not a literal count of repository files or lines.
                </p>
              </div>
            )}
          </section>
        )}

        <div className="code-view-bar">
          <div aria-label="Code view" className="code-view-toggle">
            <button aria-pressed={viewMode === "diff"} disabled={loading || !diffResponse?.lines} onClick={() => { setViewMode("diff"); setCopied(false); }} type="button">Change</button>
            <button aria-pressed={viewMode === "current"} disabled={loading || !codeResponse?.lines} onClick={() => { setViewMode("current"); setCopied(false); }} type="button">Current code</button>
          </div>
          {diffResponse?.lines && <span><strong>+{diffResponse.additions}</strong> <em>−{diffResponse.deletions}</em></span>}
          <div className={styles.viewportControls}>
            <button className={styles.wrapButton} aria-pressed={wrapLines} onClick={() => setWrapLines((current) => !current)} type="button">
              {wrapLines ? "Wrapped" : "Raw lines"}
            </button>
            <span className={styles.scrollMeter} aria-label={`Code scroll position ${scrollProgress}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scrollProgress}>
              <span style={{ "--scroll-progress": `${scrollProgress}%` } as CSSProperties} />
            </span>
          </div>
        </div>

        <div className="code-context">
          <p>{active.why}</p>
          <code>{active.path}:{active.startLine}–{active.endLine}</code>
        </div>

        <div
          className={`code-frame ${styles.frame} ${wrapLines ? styles.wrapped : styles.scrollable}`}
          aria-busy={loading}
          onScroll={handleScroll}
          ref={frameRef}
          tabIndex={0}
        >
          {loading && <div className="code-state">Loading the reviewed change from GitHub…</div>}
          {!loading && visibleError && <div className="code-state is-error">{visibleError}</div>}
          {!loading && viewMode === "diff" && highlightedDiffLines.length > 0 && (
            <pre aria-label={`${active.path}, changes near lines ${active.startLine} through ${active.endLine}`} className="code-diff" data-language={active.language}>
              {highlightedDiffLines.map((line, lineIndex) => line.kind === "hunk" || line.kind === "meta" ? (
                <span className={`diff-line is-${line.kind}`} key={`${line.kind}-${lineIndex}`}>
                  <span className="diff-hunk">{line.text}</span>
                </span>
              ) : (
                <span className={`diff-line is-${line.kind}`} key={`${line.kind}-${line.oldNumber}-${line.newNumber}-${lineIndex}`}>
                  <span aria-hidden="true" className="diff-marker">{line.kind === "addition" ? "+" : line.kind === "deletion" ? "−" : " "}</span>
                  <span aria-hidden="true" className="diff-number">{line.oldNumber ?? ""}</span>
                  <span aria-hidden="true" className="diff-number">{line.newNumber ?? ""}</span>
                  <code>{line.tokens.length ? line.tokens.map((token, tokenIndex) => <span className={`syntax-${token.kind}`} key={`${lineIndex}-${tokenIndex}`}>{token.text}</span>) : " "}</code>
                </span>
              ))}
            </pre>
          )}
          {!loading && viewMode === "current" && highlightedLines.length > 0 && (
            <pre aria-label={`${active.path}, lines ${active.startLine} through ${active.endLine}`} data-language={active.language}>
              {highlightedLines.map((line) => (
                <span className="code-line" key={line.number}>
                  <span aria-hidden="true" className="code-line-number">{line.number}</span>
                  <code>{line.tokens.length ? line.tokens.map((token, tokenIndex) => <span className={`syntax-${token.kind}`} key={`${line.number}-${tokenIndex}`}>{token.text}</span>) : " "}</code>
                </span>
              ))}
            </pre>
          )}
        </div>

        <footer className="code-actions">
          <button disabled={!hasVisibleCode} onClick={() => void copyVisibleCode()} type="button">{copied ? "Copied ✓" : viewMode === "diff" ? "Copy diff" : "Copy excerpt"}</button>
          {visibleSourceUrl && <a href={visibleSourceUrl} rel="noreferrer" target="_blank">{viewMode === "diff" ? "Open comparison on GitHub ↗" : "Open full file on GitHub ↗"}</a>}
        </footer>

        <EvidenceQuestion
          defaultLens={defaultQuestionLens}
          editionId={editionId}
          evidence={active}
          feedbackConfigured={feedbackConfigured}
          key={`${active.commit}:${active.path}:${active.startLine}`}
          lenses={questionLenses}
          onQuestionSaved={onQuestionSaved}
          onQuestionUpdated={onQuestionUpdated}
          questions={questions}
          repository={repository}
          story={{ id: storyId, title: storyTitle, topicId }}
          topicThread={topicThread}
        />
      </div>
    </section>
  );
}
