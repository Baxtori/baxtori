"use client";

import { RepoMap, type QuestionDisposition, type RepoArea, type RepoMapData, type RepoQuestion, type UnderstandingState } from "./repo-map";

type MapSource = {
  fullName: string;
  name: string;
  mapStatus: "mapped" | "unmapped" | "empty";
};

type RepositoryMapsProps = {
  activeRepository: string;
  data: RepoMapData[];
  onActiveRepositoryChange: (repository: string) => void;
  onQuestionChange: (repository: string, question: RepoQuestion, state: QuestionDisposition) => void;
  onStateChange: (repository: string, area: RepoArea, state: UnderstandingState) => void;
  questionStates: Record<string, QuestionDisposition>;
  sources: MapSource[];
  states: Record<string, UnderstandingState>;
};

export function RepositoryMaps({
  activeRepository,
  data,
  onActiveRepositoryChange,
  onQuestionChange,
  onStateChange,
  questionStates,
  sources,
  states,
}: RepositoryMapsProps) {
  const activeSource = sources.find((source) => source.fullName === activeRepository) ?? sources[0];
  const activeMap = data.find((map) => map.repository === activeSource?.fullName);

  return (
    <section className="repository-maps" aria-label="Repository maps">
      <div className="map-switcher" role="tablist" aria-label="Choose a repository map">
        {sources.map((source) => (
          <button
            aria-selected={activeSource?.fullName === source.fullName}
            key={source.fullName}
            onClick={() => onActiveRepositoryChange(source.fullName)}
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
            data={activeMap}
            onQuestionChange={(question, state) => onQuestionChange(activeMap.repository, question, state)}
            onStateChange={(area, state) => onStateChange(activeMap.repository, area, state)}
            questionStates={questionStates}
            states={states}
          />
        ) : (
          <div className="map-unavailable">
            <span className="eyebrow">{activeSource?.mapStatus === "empty" ? "Empty repository" : "Comprehension pending"}</span>
            <h2>{activeSource?.fullName}</h2>
            <p>{activeSource?.mapStatus === "empty"
              ? "There are no commits or files to study yet. Baxtori will keep this quiet until real code exists."
              : "This repository is scheduled, but it does not have enough reviewed evidence for a trustworthy map yet."}</p>
            <strong>No invented coverage.</strong>
          </div>
        )}
      </div>
    </section>
  );
}
