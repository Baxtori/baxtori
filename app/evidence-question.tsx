"use client";

import { useMemo, useState } from "react";
import {
  localQuestionRecord,
  questionsForEvidence,
  storyQuestionInput,
  type QuestionEvidence,
  type ThreadQuestionRecord,
} from "@/lib/story-questions";
import {
  storyTopicInput,
  storyTopicSourceKey,
  type StoryTopic,
  type TopicThreadRecord,
} from "@/lib/story-topics";

export type QuestionReviewLens = {
  id: string;
  label: string;
};

type EvidenceQuestionProps = {
  defaultLens: string;
  editionId: string;
  evidence: QuestionEvidence;
  feedbackConfigured: boolean;
  lenses: QuestionReviewLens[];
  onQuestionSaved: (question: ThreadQuestionRecord, topic?: TopicThreadRecord) => void;
  onQuestionUpdated: (question: ThreadQuestionRecord) => void;
  questions: ThreadQuestionRecord[];
  repository: string;
  story: Pick<StoryTopic, "id" | "title" | "topicId">;
  topicThread?: TopicThreadRecord;
};

export function EvidenceQuestion({
  defaultLens,
  editionId,
  evidence,
  feedbackConfigured,
  lenses,
  onQuestionSaved,
  onQuestionUpdated,
  questions,
  repository,
  story,
  topicThread,
}: EvidenceQuestionProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [guidance, setGuidance] = useState("");
  const [reviewState, setReviewState] = useState<"private" | "queued">("private");
  const [lensId, setLensId] = useState(defaultLens);
  const [selectedStartLine, setSelectedStartLine] = useState(evidence.startLine);
  const [selectedEndLine, setSelectedEndLine] = useState(evidence.endLine);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const visibleQuestions = useMemo(
    () => questionsForEvidence(questions, evidence, repository),
    [evidence, questions, repository],
  );

  const resetComposer = () => {
    setQuestion("");
    setGuidance("");
    setReviewState("private");
    setLensId(defaultLens);
    setSelectedStartLine(evidence.startLine);
    setSelectedEndLine(evidence.endLine);
    setOpen(false);
  };

  const saveQuestion = async () => {
    setSaving(true);
    setMessage("");
    try {
      let thread = topicThread;
      if (feedbackConfigured && !thread) {
        const topicInput = storyTopicInput(
          { ...story, codeEvidence: [evidence], repository },
          editionId,
          "question",
        );
        if (!topicInput) throw new Error("This excerpt cannot hold a question.");
        const response = await fetch("/api/feedback/topics", {
          body: JSON.stringify(topicInput),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as { error?: string; topic?: TopicThreadRecord };
        if (!response.ok || !payload.topic) throw new Error(payload.error ?? "The question could not be created.");
        thread = payload.topic;
      }

      const sourceKey = storyTopicSourceKey({ ...story, repository });
      const threadId = thread?._id ?? (sourceKey ? `local:${sourceKey}` : `local:${story.id}`);
      const input = storyQuestionInput({
        editionId,
        evidence,
        guidance,
        lensId,
        question,
        repository,
        reviewState: feedbackConfigured ? reviewState : "private",
        selectedEndLine,
        selectedStartLine,
        story,
        threadId,
      });

      if (!feedbackConfigured) {
        const local = localQuestionRecord(input);
        onQuestionSaved(local);
        setMessage("Saved on this device.");
        resetComposer();
        return;
      }

      const response = await fetch("/api/feedback/questions", {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; question?: ThreadQuestionRecord };
      if (!response.ok || !payload.question) throw new Error(payload.error ?? "The question could not be saved.");
      onQuestionSaved(payload.question, thread ? { ...thread, status: "active" } : undefined);
      setMessage(reviewState === "queued" ? "Question queued for the next review." : "Private question saved.");
      resetComposer();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The question could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const resolveQuestion = async (record: ThreadQuestionRecord) => {
    setMessage("");
    if (record._id.startsWith("local:")) {
      onQuestionUpdated({ ...record, status: "resolved" });
      setMessage("Question resolved on this device.");
      return;
    }
    try {
      const response = await fetch("/api/feedback/questions", {
        body: JSON.stringify({ questionId: record._id, status: "resolved" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string; question?: ThreadQuestionRecord };
      if (!response.ok || !payload.question) throw new Error(payload.error ?? "The question could not be resolved.");
      onQuestionUpdated(payload.question);
      setMessage("Question resolved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The question could not be resolved.");
    }
  };

  return (
    <section className="evidence-question" aria-label="Questions about this evidence">
      <div className="evidence-question-heading">
        <div>
          <span>Reader question</span>
          <strong>{visibleQuestions.filter((item) => item.status === "open").length} open on this excerpt</strong>
        </div>
        <button aria-expanded={open} onClick={() => setOpen((current) => !current)} type="button">
          {open ? "Close" : "Ask a question"}
        </button>
      </div>

      {open && (
        <form className="evidence-question-form" onSubmit={(event) => { event.preventDefault(); void saveQuestion(); }}>
          <p>The question will remain linked to <code>{evidence.path}</code> and these lines.</p>
          <label>
            Question
            <textarea
              autoFocus
              maxLength={2_000}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What still needs an answer here?"
              required
              rows={3}
              value={question}
            />
          </label>
          <fieldset className="evidence-line-range">
            <legend>Evidence lines</legend>
            <label>
              Start
              <input
                max={evidence.endLine}
                min={evidence.startLine}
                onChange={(event) => setSelectedStartLine(Number(event.target.value))}
                type="number"
                value={selectedStartLine}
              />
            </label>
            <span aria-hidden="true">–</span>
            <label>
              End
              <input
                max={evidence.endLine}
                min={evidence.startLine}
                onChange={(event) => setSelectedEndLine(Number(event.target.value))}
                type="number"
                value={selectedEndLine}
              />
            </label>
          </fieldset>
          <fieldset className="question-disposition">
            <legend>Save as</legend>
            <label>
              <input checked={reviewState === "private"} onChange={() => setReviewState("private")} type="radio" />
              Keep private
            </label>
            <label>
              <input checked={reviewState === "queued"} disabled={!feedbackConfigured} onChange={() => setReviewState("queued")} type="radio" />
              Include in next review
            </label>
          </fieldset>
          {reviewState === "queued" && feedbackConfigured && (
            <div className="question-review-options">
              <label>
                Review lens
                <select onChange={(event) => setLensId(event.target.value)} value={lensId}>
                  {lenses.map((lens) => <option key={lens.id} value={lens.id}>{lens.label}</option>)}
                </select>
              </label>
              <label>
                Guidance, optional
                <textarea maxLength={2_000} onChange={(event) => setGuidance(event.target.value)} rows={2} value={guidance} />
              </label>
            </div>
          )}
          {!feedbackConfigured && <p className="question-sync-note">Private questions save on this device. Sign in to include one in a scheduled review.</p>}
          <div className="evidence-question-actions">
            <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save question"}</button>
            <button onClick={resetComposer} type="button">Cancel</button>
          </div>
        </form>
      )}

      {visibleQuestions.length > 0 && (
        <ul className="evidence-question-list">
          {visibleQuestions.map((record) => (
            <li className={record.status === "resolved" ? "is-resolved" : ""} key={record._id}>
              <div>
                <span>{record.reviewState === "queued" ? "Next review" : record.reviewState === "considered" ? "Considered" : "Private"} · L{record.evidence.startLine}–{record.evidence.endLine}</span>
                <p>{record.question}</p>
              </div>
              {record.status === "open" && <button onClick={() => void resolveQuestion(record)} type="button">Resolve</button>}
            </li>
          ))}
        </ul>
      )}
      {message && <p className="evidence-question-message" role="status">{message}</p>}
    </section>
  );
}
