"use client";

import { canonicalRepository, canonicalizeRepositoryStateRecord } from "@/lib/repository-identity";
import { RepoMap, type QuestionDisposition, type RepoArea, type RepoMapData, type RepoQuestion, type UnderstandingState } from "./repo-map";

type MapSource = {
  fullName: string;
  name: string;
  mapStatus: "mapped" | "unmapped" | "empty";
};

type RepositoryMapsProps = {
  activeRepository: string;
  attentionBudget: number;
  data: RepoMapData[];
  onActiveRepositoryChange: (repository: string) => void;
  onAttentionBudgetChange: (minutes: number) => void;
  onQuestionChange: (repository: string, question: RepoQuestion, state: QuestionDisposition) => void;
  onStateChange: (repository: string, area: RepoArea, state: UnderstandingState) => void;
  questionStates: Record<string, QuestionDisposition>;
  sources: MapSource[];
  states: Record<string, UnderstandingState>;
};

export function RepositoryMaps({
  activeRepository,
  attentionBudget,
  data,
  onActiveRepositoryChange,
  onAttentionBudgetChange,
  onQuestionChange,
  onStateChange,
  questionStates,
  sources,
  states,
}: RepositoryMapsProps) {
  const activeSource = sources.find((source) => canonicalRepository(source.fullName) === canonicalRepository(activeRepository)) ?? sources[0];
  const sourceMap = data.find((map) => canonicalRepository(map.repository) === canonicalRepository(activeSource?.fullName));
  const activeMap = sourceMap ? { ...sourceMap, repository: canonicalRepository(sourceMap.repository) } : undefined;
  const normalizedStates = canonicalizeRepositoryStateRecord(states);
  const normalizedQuestionStates = canonicalizeRepositoryStateRecord(questionStates);

  if (activeMap) {
    for (const area of activeMap.areas) {
      const key = `${activeMap.repository}:${area.id}`;
      if (normalizedStates[key] === undefined && states[area.id] !== undefined) normalizedStates[key] = states[area.id];
    }
    for (const question of activeMap.questions) {
      const key = `${activeMap.repository}:${question.id}`;
      if (normalizedQuestionStates[key] === undefined && questionStates[question.id] !== undefined) normalizedQuestionStates[key] = questionStates[question.id];
    }
  }

  return (
    <section className="repository-maps" aria-label="Repository maps">
      <div className="map-switcher" role="tablist" aria-label="Choose a repository map">
        {sources.map((source) => (
          <button
            aria-selected={canonicalRepository(activeSource?.fullName ?? "") === canonicalRepository(source.fullName)}
            key={source.fullName}
            onClick={() => onActiveRepositoryChange(canonicalRepository(source.fullName))}
            role="tab"
            type="button"
          >
            <strong>{source.name}</strong>
            <span>{source.mapStatus === "mapped" ? "Mapped" : source.mapStatus === "empty" ? "No code yet" : "Not mapped"}</span>
          </button>
        ))}
      </div>

      <div aria-live="polite" role="tabpanel">
        {activeMap ? (
          <RepoMap
            attentionBudget={attentionBudget}
            data={activeMap}
            onAttentionBudgetChange={onAttentionBudgetChange}
            onQuestionChange={(question, state) => onQuestionChange(activeMap.repository, question, state)}
            onStateChange={(area, state) => onStateChange(activeMap.repository, area, state)}
            questionStates={normalizedQuestionStates}
            states={normalizedStates}
          />
        ) : (
          <div className="map-unavailable">
            <span className="eyebrow">{activeSource?.mapStatus === "empty" ? "Empty repository" : "Map not ready"}</span>
            <h2>{activeSource?.fullName}</h2>
            <p>{activeSource?.mapStatus === "empty"
              ? "There are no commits or files to study yet. This map will begin when code exists."
              : "This repository has not been mapped in a completed review yet."}</p>
            <strong>Awaiting review.</strong>
          </div>
        )}
      </div>
    </section>
  );
}
