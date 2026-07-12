"use client";

import { useEffect, useState } from "react";

export type CodeEvidence = {
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

type StoryCodeProps = {
  evidence: CodeEvidence[];
  repository: string;
  storyId: string;
};

export function StoryCode({ evidence, repository, storyId }: StoryCodeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [response, setResponse] = useState<CodeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const active = evidence[activeIndex];
  const headingId = `code-heading-${storyId}`;
  const panelId = `code-panel-${storyId}`;
  const activeTabId = `code-tab-${storyId}-${activeIndex}`;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      commit: active.commit,
      end: String(active.endLine),
      path: active.path,
      repo: repository,
      start: String(active.startLine),
    });
    queueMicrotask(() => {
      setLoading(true);
      setResponse(null);
      setCopied(false);
    });
    fetch(`/api/github/code?${query}`, { signal: controller.signal })
      .then(async (result) => {
        const payload = (await result.json()) as CodeResponse;
        if (!result.ok) throw new Error(payload.error ?? "This code excerpt could not be loaded.");
        setResponse(payload);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setResponse({ error: error.message });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, repository]);

  if (!active) return null;

  const copyExcerpt = async () => {
    if (!response?.lines) return;
    const source = response.lines.map((line) => line.text).join("\n");
    await navigator.clipboard.writeText(`${active.path}:${active.startLine}-${active.endLine}\n\n${source}`);
    setCopied(true);
  };

  return (
    <section className="story-code" aria-labelledby={headingId}>
      <header className="story-code-heading">
        <div>
          <span>Read the actual code</span>
          <h4 id={headingId}>The explanation is attached to exact lines.</h4>
        </div>
        <small>{active.commit.slice(0, 7)} · reviewed commit</small>
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
              <strong>{item.title}</strong>
              <span>{item.path.split("/").at(-1)} · L{item.startLine}–{item.endLine}</span>
            </button>
          ))}
        </div>
      )}

      <div aria-labelledby={evidence.length > 1 ? activeTabId : headingId} id={panelId} role="tabpanel">
        <div className="code-context">
          <div>
            <strong>{active.title}</strong>
            <p>{active.why}</p>
          </div>
          <code>{active.path}:{active.startLine}–{active.endLine}</code>
        </div>

        <div className="code-frame" aria-busy={loading}>
          {loading && <div className="code-state">Loading exact lines from GitHub…</div>}
          {!loading && response?.error && <div className="code-state is-error">{response.error}</div>}
          {!loading && response?.lines && (
            <pre aria-label={`${active.path}, lines ${active.startLine} through ${active.endLine}`} data-language={active.language}>
              {response.lines.map((line) => (
                <span className="code-line" key={line.number}>
                  <span aria-hidden="true" className="code-line-number">{line.number}</span>
                  <code>{line.text || " "}</code>
                </span>
              ))}
            </pre>
          )}
        </div>

        <footer className="code-actions">
          <button disabled={!response?.lines} onClick={() => void copyExcerpt()} type="button">{copied ? "Copied ✓" : "Copy excerpt"}</button>
          {response?.sourceUrl && <a href={response.sourceUrl} rel="noreferrer" target="_blank">Open full file on GitHub ↗</a>}
        </footer>
      </div>
    </section>
  );
}
