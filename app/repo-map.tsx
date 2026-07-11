"use client";

import type { CSSProperties } from "react";

export type UnderstandingState = "unexplored" | "introduced" | "understood" | "revisit" | "skipped";
export type QuestionDisposition = "open" | "resolved" | "irrelevant";

type Walkthrough = {
  title: string;
  outcome: string;
  estimatedMinutes: number;
  steps: {
    label: string;
    file: string;
    explanation: string;
    invariant: string;
  }[];
};

export type RepoArea = {
  id: string;
  name: string;
  kind: string;
  purpose: string;
  importance: number;
  breadth: number;
  depth: number;
  confidence: number;
  freshness: number;
  changed: string;
  verdict: string;
  evidence: string[];
  concepts: string[];
  walkthrough?: Walkthrough;
};

export type RepoQuestion = {
  id: string;
  areaId: string;
  question: string;
  whyItMatters: string;
  status: "open" | "resolved";
  evidence: string[];
};

export type RepoMapData = {
  repository: string;
  generatedAt: string;
  summary: string;
  questions: RepoQuestion[];
  areas: RepoArea[];
};

type RepoMapProps = {
  data: RepoMapData;
  questionStates: Record<string, QuestionDisposition>;
  states: Record<string, UnderstandingState>;
  onQuestionChange: (question: RepoQuestion, state: QuestionDisposition) => void;
  onStateChange: (area: RepoArea, state: UnderstandingState) => void;
};

const STATE_LABELS: Record<UnderstandingState, string> = {
  introduced: "Introduced",
  revisit: "Revisit",
  skipped: "Not worth it",
  understood: "Understood",
  unexplored: "Unexplored",
};

function areaCoverage(area: RepoArea) {
  return Math.round(area.breadth * 0.35 + area.depth * 0.35 + area.confidence * 0.2 + area.freshness * 0.1);
}

function adjustedCoverage(area: RepoArea, state: UnderstandingState) {
  const observed = areaCoverage(area);
  if (state === "understood") return Math.max(observed, 88);
  if (state === "revisit") return Math.min(observed, 58);
  if (state === "introduced") return Math.min(observed, 68);
  if (state === "skipped") return 0;
  return Math.min(observed, 42);
}

export function RepoMap({ data, onQuestionChange, onStateChange, questionStates, states }: RepoMapProps) {
  const stateFor = (area: RepoArea) => states[area.id] ?? "unexplored";
  const questionStateFor = (question: RepoQuestion) => questionStates[question.id] ?? question.status;
  const includedAreas = data.areas.filter((area) => stateFor(area) !== "skipped");
  const totalWeight = includedAreas.reduce((total, area) => total + area.importance, 0);
  const coverage = totalWeight
    ? Math.round(includedAreas.reduce((total, area) => total + adjustedCoverage(area, stateFor(area)) * area.importance, 0) / totalWeight)
    : 0;
  const understood = data.areas.filter((area) => stateFor(area) === "understood").length;
  const openQuestions = data.questions.filter((question) => questionStateFor(question) === "open");
  const frontier = [...includedAreas]
    .filter((area) => stateFor(area) !== "understood")
    .sort((a, b) => {
      const stateBoost = (area: RepoArea) => stateFor(area) === "revisit" ? 30 : stateFor(area) === "introduced" ? 10 : 0;
      return (b.importance * 20 + b.freshness + stateBoost(b)) - (a.importance * 20 + a.freshness + stateBoost(a));
    })[0];

  return (
    <section className="map-view" aria-labelledby="map-heading">
      <div className="map-overview">
        <div className="coverage-dial" style={{ "--coverage": `${coverage * 3.6}deg` } as CSSProperties}>
          <div><strong>{coverage}%</strong><span>estimated</span></div>
        </div>
        <div>
          <span className="eyebrow">Repository understanding</span>
          <h2 id="map-heading">{data.repository}</h2>
          <p>{data.summary}</p>
          <div className="coverage-legend">
            <span>{understood}/{data.areas.length} areas confirmed</span>
            <span>Breadth + depth + evidence + freshness</span>
          </div>
        </div>
      </div>

      {frontier ? (
        <article className="frontier-card">
          <div>
            <span className="eyebrow">Your comprehension frontier</span>
            <h3>{frontier.name}</h3>
            <p>{frontier.purpose}</p>
          </div>
          <div className="frontier-reason">
            <strong>Why this next</strong>
            <span>{frontier.importance}/5 importance · {frontier.freshness}% fresh · {STATE_LABELS[stateFor(frontier)]}</span>
            <button onClick={() => onStateChange(frontier, "introduced")} type="button">Start here</button>
          </div>
        </article>
      ) : (
        <div className="frontier-card is-complete"><strong>No frontier right now.</strong><span>You have understood or deliberately skipped every mapped area.</span></div>
      )}

      <div className="map-list" aria-label="Mapped repository areas">
        {data.areas.map((area) => {
          const state = stateFor(area);
          const score = adjustedCoverage(area, state);
          return (
            <details className={`map-area is-${state}`} key={area.id} open={area.id === frontier?.id}>
              <summary>
                <div className="map-area-main">
                  <span>{area.kind}</span>
                  <h3>{area.name}</h3>
                  <p>{area.purpose}</p>
                </div>
                <div className="map-area-status">
                  <strong>{score}%</strong>
                  <span>{STATE_LABELS[state]}</span>
                </div>
              </summary>
              <div className="map-area-detail">
                <div className="signal-grid" aria-label={`${area.name} coverage signals`}>
                  {(["breadth", "depth", "confidence", "freshness"] as const).map((signal) => (
                    <div key={signal}>
                      <span>{signal}</span><strong>{area[signal]}%</strong>
                      <i aria-hidden="true"><b style={{ width: `${area[signal]}%` }} /></i>
                    </div>
                  ))}
                </div>
                <div className="map-columns">
                  <div>
                    <span className="eyebrow">Assessment</span>
                    <p>{area.verdict}</p>
                    <small>{area.changed}</small>
                  </div>
                  <div>
                    <span className="eyebrow">Concepts surfaced</span>
                    <ul>{area.concepts.map((concept) => <li key={concept}>{concept}</li>)}</ul>
                  </div>
                  <div>
                    <span className="eyebrow">Evidence</span>
                    <ul className="map-evidence">{area.evidence.map((file) => <li key={file}><code>{file}</code></li>)}</ul>
                  </div>
                </div>
                <div className="understanding-actions" aria-label={`Set understanding for ${area.name}`}>
                  <span>My understanding</span>
                  <button aria-pressed={state === "understood"} onClick={() => onStateChange(area, "understood")} type="button">Got it</button>
                  <button aria-pressed={state === "revisit"} onClick={() => onStateChange(area, "revisit")} type="button">Go deeper</button>
                  <button aria-pressed={state === "skipped"} onClick={() => onStateChange(area, "skipped")} type="button">Not worth it</button>
                </div>
                {area.walkthrough ? (
                  <details className="walkthrough">
                    <summary>
                      <div><span className="eyebrow">Code walkthrough · {area.walkthrough.estimatedMinutes} min</span><strong>{area.walkthrough.title}</strong></div>
                      <span>Follow the path</span>
                    </summary>
                    <p>{area.walkthrough.outcome}</p>
                    <ol>
                      {area.walkthrough.steps.map((step, index) => (
                        <li key={step.file}>
                          <span aria-hidden="true">{index + 1}</span>
                          <div>
                            <strong>{step.label}</strong>
                            <code>{step.file}</code>
                            <p>{step.explanation}</p>
                            <small><b>Invariant</b> {step.invariant}</small>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>

      <section className="question-ledger" aria-labelledby="question-ledger-heading">
        <div>
          <span className="eyebrow">Preserved uncertainty</span>
          <h2 id="question-ledger-heading">Question ledger</h2>
          <p>{openQuestions.length} open {openQuestions.length === 1 ? "question" : "questions"}. Baxtori keeps ambiguity visible instead of inventing an answer.</p>
        </div>
        <div className="question-list">
          {data.questions.map((question) => {
            const disposition = questionStateFor(question);
            const area = data.areas.find((item) => item.id === question.areaId);
            return (
              <article className={`question-card is-${disposition}`} key={question.id}>
                <div className="question-meta"><span>{area?.name ?? question.areaId}</span><strong>{disposition}</strong></div>
                <h3>{question.question}</h3>
                <p>{question.whyItMatters}</p>
                <div className="question-evidence">{question.evidence.map((file) => <code key={file}>{file}</code>)}</div>
                <div className="question-actions">
                  <button aria-pressed={disposition === "resolved"} onClick={() => onQuestionChange(question, "resolved")} type="button">Resolved</button>
                  <button aria-pressed={disposition === "open"} onClick={() => onQuestionChange(question, "open")} type="button">Keep open</button>
                  <button aria-pressed={disposition === "irrelevant"} onClick={() => onQuestionChange(question, "irrelevant")} type="button">Not relevant</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="coverage-note">This is a learning estimate, not a code-scanning score. Skipped areas leave the denominator; changed evidence can lower confidence or put an area back on your frontier.</p>
    </section>
  );
}
