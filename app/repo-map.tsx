"use client";

import { type CSSProperties } from "react";

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

type MapReview = {
  id: string;
  reviewedAt: string;
  summary: string;
  affectedAreaIds: string[];
  newAreaIds: string[];
  unmappedFilesReviewed: string[];
  throughCommit: {
    sha: string;
    shortSha: string;
    subject: string;
    url: string;
  };
};

export type RepoMapData = {
  repository: string;
  generatedAt: string;
  summary: string;
  questions: RepoQuestion[];
  reviews: MapReview[];
  areas: RepoArea[];
};

type RepoMapProps = {
  attentionBudget: number;
  data: RepoMapData;
  onAttentionBudgetChange: (minutes: number) => void;
  questionStates: Record<string, QuestionDisposition>;
  states: Record<string, UnderstandingState>;
  onQuestionChange: (question: RepoQuestion, state: QuestionDisposition) => void;
  onStateChange: (area: RepoArea, state: UnderstandingState) => void;
};

type StudyTask = {
  description: string;
  id: string;
  minutes: number;
  type: string;
} & ({ kind: "area"; area: RepoArea } | { kind: "question"; area?: RepoArea; question: RepoQuestion });

const STATE_LABELS: Record<UnderstandingState, string> = {
  introduced: "Started",
  revisit: "Study again",
  skipped: "Hidden",
  understood: "Understood",
  unexplored: "Unexplored",
};

function formatReviewDate(value: string, compact = false) {
  return new Intl.DateTimeFormat("en-US", compact
    ? { day: "numeric", month: "short", timeZone: "UTC" }
    : { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" }
  ).format(new Date(value));
}

export function RepoMap({ attentionBudget, data, onAttentionBudgetChange, onQuestionChange, onStateChange, questionStates, states }: RepoMapProps) {
  const acceptsLegacyState = data.repository === "teamleaderleo/glimpse";
  const stateFor = (area: RepoArea) => states[`${data.repository}:${area.id}`] ?? (acceptsLegacyState ? states[area.id] : undefined) ?? "unexplored";
  const questionStateFor = (question: RepoQuestion) => questionStates[`${data.repository}:${question.id}`] ?? (acceptsLegacyState ? questionStates[question.id] : undefined) ?? question.status;
  const includedAreas = data.areas.filter((area) => stateFor(area) !== "skipped");
  const understood = data.areas.filter((area) => stateFor(area) === "understood").length;
  const confirmedProgress = includedAreas.length ? understood / includedAreas.length : 0;
  const openQuestions = data.questions.filter((question) => questionStateFor(question) === "open");
  const frontier = [...includedAreas]
    .filter((area) => stateFor(area) !== "understood")
    .sort((a, b) => {
      const stateBoost = (area: RepoArea) => stateFor(area) === "revisit" ? 30 : stateFor(area) === "introduced" ? 10 : 0;
      return (b.importance * 20 + b.freshness + stateBoost(b)) - (a.importance * 20 + a.freshness + stateBoost(a));
    })[0];
  const latestReview = data.reviews[0];
  const areaById = new Map(data.areas.map((area) => [area.id, area]));
  const rankedAreas = [...includedAreas]
    .filter((area) => stateFor(area) !== "understood")
    .sort((a, b) => {
      const boost = (area: RepoArea) => stateFor(area) === "revisit" ? 40 : area.id === frontier?.id ? 25 : 0;
      return (b.importance * 20 + b.freshness + boost(b)) - (a.importance * 20 + a.freshness + boost(a));
    });
  const studyCandidates: StudyTask[] = [
    ...rankedAreas.map((area) => ({
      area,
      description: area.walkthrough?.outcome ?? area.purpose,
      id: `area-${area.id}`,
      kind: "area" as const,
      minutes: area.walkthrough?.estimatedMinutes ?? 8,
      type: area.walkthrough ? "Walkthrough" : "Area brief",
    })),
    ...openQuestions.map((question) => ({
      area: areaById.get(question.areaId),
      description: question.whyItMatters,
      id: `question-${question.id}`,
      kind: "question" as const,
      minutes: 5,
      question,
      type: "Open question",
    })),
  ];
  let minutesPlanned = 0;
  const studyPlan = studyCandidates.filter((task) => {
    if (minutesPlanned + task.minutes > attentionBudget) return false;
    minutesPlanned += task.minutes;
    return true;
  });

  const openStudyTask = (task: StudyTask) => {
    if (task.kind === "question") {
      document.getElementById(`question-${task.question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!task.area) return;
    onStateChange(task.area, "introduced");
    const area = document.getElementById(`area-${task.area.id}`) as HTMLDetailsElement | null;
    if (area) area.open = true;
    if (task.area.walkthrough) {
      const walkthrough = document.getElementById(`walkthrough-${task.area.id}`) as HTMLDetailsElement | null;
      if (walkthrough) walkthrough.open = true;
      walkthrough?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      area?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section className="map-view" aria-labelledby="map-heading">
      <div className="map-overview">
        <div className="coverage-dial" style={{ "--coverage": `${confirmedProgress * 360}deg` } as CSSProperties}>
          <div><strong>{understood}/{includedAreas.length}</strong><span>confirmed</span></div>
        </div>
        <div>
          <span className="eyebrow">Repository map</span>
          <h2 id="map-heading">{data.repository}</h2>
          <p>{data.summary}</p>
          <div className="coverage-legend">
            <span>{understood}/{data.areas.length} areas confirmed</span>
            <span>Your reading state</span>
          </div>
        </div>
      </div>

      {latestReview ? (
        <article className="review-pulse">
          <div className="review-pulse-main">
            <span className="eyebrow">Latest map review · {formatReviewDate(latestReview.reviewedAt, true)}</span>
            <h3>{latestReview.summary}</h3>
            <div className="review-area-list">
              {latestReview.affectedAreaIds.map((id) => <span key={id}>{areaById.get(id)?.name ?? id}</span>)}
            </div>
          </div>
          <div className="review-pulse-proof">
            <strong>
              {latestReview.newAreaIds.length} new {latestReview.newAreaIds.length === 1 ? "area" : "areas"} · {latestReview.unmappedFilesReviewed.length
                ? `${latestReview.unmappedFilesReviewed.length} files classified`
                : "evidence baseline"}
            </strong>
            <a href={latestReview.throughCommit.url} rel="noreferrer" target="_blank">Through {latestReview.throughCommit.shortSha} ↗</a>
            <details>
              <summary>Review history</summary>
              <ol>{data.reviews.map((review) => <li key={review.id}><time>{formatReviewDate(review.reviewedAt)}</time><span>{review.summary}</span></li>)}</ol>
            </details>
          </div>
        </article>
      ) : null}

      <section className="study-session" aria-labelledby="study-session-heading">
        <div className="study-session-heading">
          <div>
            <span className="eyebrow">Study queue</span>
            <h2 id="study-session-heading">{attentionBudget} minutes</h2>
            <p>{frontier ? `Starts with ${frontier.name}.` : "No unfinished map areas."}</p>
          </div>
          <label className="budget-picker" htmlFor="study-budget">
            <span>Time limit</span>
            <input
              id="study-budget"
              max="60"
              min="5"
              onChange={(event) => onAttentionBudgetChange(Number(event.target.value))}
              step="5"
              type="range"
              value={attentionBudget}
            />
            <output htmlFor="study-budget">{attentionBudget} minutes</output>
          </label>
        </div>
        {studyPlan.length ? (
          <ol className="study-plan">
            {studyPlan.map((task) => (
              <li key={task.id}>
                <div><span>{task.type} · {task.minutes} min</span><strong>{task.kind === "question" ? task.question.question : task.area.name}</strong><p>{task.description}</p></div>
                <button onClick={() => openStudyTask(task)} type="button">Open</button>
              </li>
            ))}
          </ol>
        ) : <div className="study-complete"><strong>Nothing queued.</strong><span>Every map area is understood or hidden, and no questions remain open.</span></div>}
      </section>

      <div className="map-list" aria-label="Mapped repository areas">
        {data.areas.map((area) => {
          const state = stateFor(area);
          return (
            <details className={`map-area is-${state}`} id={`area-${area.id}`} key={area.id} open={area.id === frontier?.id} tabIndex={-1}>
              <summary>
                <div className="map-area-main">
                  <span>{area.kind}</span>
                  <h3>{area.name}</h3>
                  <p>{area.purpose}</p>
                </div>
                <div className="map-area-status">
                  <strong>{area.evidence.length}</strong>
                  <small>{area.evidence.length === 1 ? "file" : "files"}</small>
                  <span>{STATE_LABELS[state]}</span>
                </div>
              </summary>
              <div className="map-area-detail">
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
                  <span>My reading state</span>
                  <button aria-pressed={state === "understood"} onClick={() => onStateChange(area, "understood")} type="button">Understood</button>
                  <button aria-pressed={state === "revisit"} onClick={() => onStateChange(area, "revisit")} type="button">Study again</button>
                  <button aria-pressed={state === "skipped"} onClick={() => onStateChange(area, "skipped")} type="button">Hide area</button>
                  <small>Editable. Saved to this device or your connected account.</small>
                </div>
                {area.walkthrough ? (
                  <details className="walkthrough" id={`walkthrough-${area.id}`} tabIndex={-1}>
                    <summary>
                      <div><span className="eyebrow">Code walkthrough · {area.walkthrough.estimatedMinutes} min</span><strong>{area.walkthrough.title}</strong></div>
                      <span>Follow the path</span>
                    </summary>
                    <p>{area.walkthrough.outcome}</p>
                    <ol>
                      {area.walkthrough.steps.map((step, index) => (
                        <li key={step.label}>
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
          <span className="eyebrow">From the last review</span>
          <h2 id="question-ledger-heading">Questions</h2>
          <p>{openQuestions.length} open {openQuestions.length === 1 ? "question" : "questions"}.</p>
        </div>
        <div className="question-list">
          {data.questions.map((question) => {
            const disposition = questionStateFor(question);
            const area = data.areas.find((item) => item.id === question.areaId);
            return (
              <article className={`question-card is-${disposition}`} id={`question-${question.id}`} key={question.id} tabIndex={-1}>
                <div className="question-meta"><span>{area?.name ?? question.areaId}</span><strong>{disposition}</strong></div>
                <h3>{question.question}</h3>
                <p>{question.whyItMatters}</p>
                <div className="question-evidence">{question.evidence.map((file) => <code key={file}>{file}</code>)}</div>
                <div className="question-actions">
                  <button aria-pressed={disposition === "resolved"} onClick={() => onQuestionChange(question, "resolved")} type="button">Mark resolved</button>
                  <button aria-pressed={disposition === "open"} onClick={() => onQuestionChange(question, "open")} type="button">Keep open</button>
                  <button aria-pressed={disposition === "irrelevant"} onClick={() => onQuestionChange(question, "irrelevant")} type="button">Dismiss</button>
                </div>
                <small className="question-state-note">Saved to this device or your connected account. Choose another status to undo it.</small>
              </article>
            );
          })}
        </div>
      </section>

      <p className="coverage-note">Reading states are editable and follow your connected account when signed in. A later review may reopen an area when its source files change.</p>
    </section>
  );
}
