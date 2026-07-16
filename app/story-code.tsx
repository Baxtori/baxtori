"use client";

import { useEffect, useState } from "react";
import type { DiffLine } from "@/lib/code-diff";
import { highlightCodeLines, type SyntaxToken } from "@/lib/code-highlight";
import type { ThreadQuestionRecord } from "@/lib/story-questions";
import type { TopicThreadRecord } from "@/lib/story-topics";
import { EvidenceQuestion, type QuestionReviewLens } from "./evidence-question";

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

type StoryCodeProps = {
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

export function StoryCode({
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
  const active = evidence[activeIndex];
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
    queueMicrotask(() => {
      setLoading(true);
      setCodeResponse(null);
      setDiffResponse(null);
      setViewMode("diff");
      setCopied(false);
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
  }, [active, repository]);

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

  const visibleSourceUrl = viewMode === "diff" ? diffResponse?.sourceUrl : codeResponse?.sourceUrl;
  const visibleError = viewMode === "diff" ? diffResponse?.error : codeResponse?.error;
  const hasVisibleCode = viewMode === "diff" ? highlightedDiffLines.length > 0 : highlightedLines.length > 0;

  return (
    <section className={`story-code ${fullScreen ? "is-fullscreen" : ""}`} aria-labelledby={headingId}>
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
        <div className="code-view-bar">
          <div aria-label="Code view" className="code-view-toggle">
            <button aria-pressed={viewMode === "diff"} disabled={loading || !diffResponse?.lines} onClick={() => { setViewMode("diff"); setCopied(false); }} type="button">Change</button>
            <button aria-pressed={viewMode === "current"} disabled={loading || !codeResponse?.lines} onClick={() => { setViewMode("current"); setCopied(false); }} type="button">Current code</button>
          </div>
          {diffResponse?.lines && <span><strong>+{diffResponse.additions}</strong> <em>−{diffResponse.deletions}</em></span>}
        </div>

        <div className="code-context">
          <p>{active.why}</p>
          <code>{active.path}:{active.startLine}–{active.endLine}</code>
        </div>

        <div className="code-frame" aria-busy={loading}>
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
