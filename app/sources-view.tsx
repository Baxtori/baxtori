"use client";

import type { RepositoryLibraryEntry } from "@/lib/github-repository-library";
import {
  CAPTURE_WINDOWS,
  CAPTURE_WINDOW_LABELS,
  captureWindowEmptyLabel,
  type CaptureWindow,
} from "@/lib/capture-window";
import {
  REPOSITORY_MODE_DESCRIPTIONS,
  REPOSITORY_MODE_LABELS,
  repositoryModeFor,
  type RepositoryMode,
} from "@/lib/repository-modes";
import { REVIEW_SCOPE, SCHEDULED_REPOSITORIES } from "./edition-data";
import { formatRelativeDate } from "./format";
import { RepositoryModeControl } from "./repository-mode-control";
import repositoryModeStyles from "./repository-modes.module.css";

type Commit = {
  author: string;
  message: string;
  sha: string;
  url: string;
};

type Activity = {
  commits?: Commit[];
  error?: string;
  truncated?: boolean;
};

type SourcesViewProps = {
  activity: Record<string, Activity>;
  activityLoading: boolean;
  appSlug: string | null;
  candidateRepositoryCount: number;
  captureWindow: CaptureWindow;
  displayedRepositories: RepositoryLibraryEntry[];
  feedbackStatus: "loading" | "local" | "saved" | "saving";
  filteredRepositoryCount: number;
  inaccessibleScheduledRepositories: string[];
  onCaptureWindowChange: (window: CaptureWindow) => void;
  onDeleteAccount: () => void;
  onModeChange: (repository: string, mode: RepositoryMode) => void;
  onModeFilterChange: (filter: "all" | RepositoryMode) => void;
  onRestorePublishedScope: () => void;
  onSearchChange: (query: string) => void;
  onShowAllChange: () => void;
  pendingAddedCount: number;
  pendingRemovedCount: number;
  quietRepositoryCount: number;
  recentCommitCount: number;
  repositories: RepositoryLibraryEntry[];
  repositoryCounts: Record<RepositoryMode, number>;
  repositoryError: string;
  repositoryLoading: boolean;
  repositoryModeFilter: "all" | RepositoryMode;
  repositoryModes: Record<string, RepositoryMode>;
  repositorySearch: string;
  selectedRepositories: RepositoryLibraryEntry[];
  showAllRepositories: boolean;
  userLogin?: string;
};

export function SourcesView({
  activity,
  activityLoading,
  appSlug,
  candidateRepositoryCount,
  captureWindow,
  displayedRepositories,
  feedbackStatus,
  filteredRepositoryCount,
  inaccessibleScheduledRepositories,
  onCaptureWindowChange,
  onDeleteAccount,
  onModeChange,
  onModeFilterChange,
  onRestorePublishedScope,
  onSearchChange,
  onShowAllChange,
  pendingAddedCount,
  pendingRemovedCount,
  quietRepositoryCount,
  recentCommitCount,
  repositories,
  repositoryCounts,
  repositoryError,
  repositoryLoading,
  repositoryModeFilter,
  repositoryModes,
  repositorySearch,
  selectedRepositories,
  showAllRepositories,
  userLogin,
}: SourcesViewProps) {
  const scheduledRepositories = new Set(SCHEDULED_REPOSITORIES);
  const hasTruncatedActivity = Object.values(activity).some((item) => item.truncated);

  return (
    <section className="repositories-view" aria-labelledby="repositories-heading" id="repository-controls" tabIndex={-1}>
      <div className="connection-summary">
        <div>
          <span className={`status-dot ${repositoryError ? "is-error" : ""}`} aria-hidden="true" />
          <div>
            <strong>{userLogin ? `Connected as @${userLogin}` : "GitHub connection"}</strong>
            <p>Only repositories granted to the GitHub App can appear here.</p>
          </div>
        </div>
        <div className="connection-actions">
          <div className={repositoryModeStyles.summary}>
            <span>{repositoryCounts.pinned} pinned</span>
            <span>{repositoryCounts.automatic} automatic</span>
            <span>{repositoryCounts.muted} muted</span>
          </div>
          {appSlug && <><a href={`https://github.com/apps/${appSlug}/installations/new`} rel="noreferrer" target="_blank">Add repositories ↗</a><a href="https://github.com/settings/installations" rel="noreferrer" target="_blank">Manage installation ↗</a></>}
          <a href="/api/feedback/account">Download my data</a>
          <a href="/privacy">Privacy</a>
          <button onClick={onDeleteAccount} type="button">Delete Baxtori data</button>
        </div>
      </div>

      <section className="review-preview" aria-labelledby="review-preview-heading">
        <div className="review-preview-heading">
          <div>
            <span className="eyebrow">Next scheduled review · {REVIEW_SCOPE.schedule}</span>
            <h2 id="review-preview-heading">Next edition scope</h2>
            <p>Pinned sources are always checked. Automatic sources join only when their activity earns attention. Muted sources remain outside scheduled reviews.</p>
            <label className="capture-window" htmlFor="capture-window">
              <span>Look back</span>
              <select id="capture-window" onChange={(event) => onCaptureWindowChange(event.target.value as CaptureWindow)} value={captureWindow}>
                {CAPTURE_WINDOWS.map((window) => <option key={window} value={window}>{CAPTURE_WINDOW_LABELS[window]}</option>)}
              </select>
              <small>Filters candidate commits for the next edition. Published editions never change.</small>
            </label>
          </div>
          <div className="review-preview-metrics" aria-label="Scheduled review preview">
            <div><strong>{recentCommitCount}{hasTruncatedActivity ? "+" : ""}</strong><span>candidate commits</span></div>
            <div><strong>{candidateRepositoryCount}</strong><span>active sources</span></div>
            <div><strong>{quietRepositoryCount}</strong><span>quiet sources</span></div>
          </div>
        </div>

        {(pendingAddedCount > 0 || pendingRemovedCount > 0) && (
          <div className="scope-drift" role="status">
            <div><strong>Your next review scope has changed.</strong><span>{pendingAddedCount} added · {pendingRemovedCount} removed</span></div>
            <button onClick={onRestorePublishedScope} type="button">Restore published scope</button>
          </div>
        )}

        <div className="scope-list">
          {selectedRepositories.map((repository) => {
            const repositoryActivity = activity[repository.fullName];
            const scheduled = scheduledRepositories.has(repository.fullName);
            const scope = REVIEW_SCOPE.repositories.find((item) => item.fullName === repository.fullName);
            const commitCount = repositoryActivity?.commits?.length ?? 0;
            const mode = repositoryModeFor(repositoryModes, repository.fullName);
            return (
              <article className="scope-row" key={repository.fullName}>
                <div className="scope-row-main">
                  <div className="scope-row-title">
                    <strong>{repository.name}</strong>
                    <span className={scheduled ? "is-scheduled" : "is-preview"}>{scheduled ? "Published scope" : "Next review"}</span>
                    <span>{REPOSITORY_MODE_LABELS[mode]}</span>
                    {scope && <span>{scope.mapStatus === "mapped" ? "Mapped" : scope.mapStatus === "empty" ? "No code yet" : "Not mapped"}</span>}
                  </div>
                  <p>{activityLoading && !repositoryActivity ? "Checking GitHub activity…" : repositoryActivity?.error ? repositoryActivity.error : commitCount ? `${commitCount}${repositoryActivity?.truncated ? "+" : ""} commits await review.` : captureWindowEmptyLabel(captureWindow, REVIEW_SCOPE.lastReviewedAt)}</p>
                  {repositoryActivity?.commits?.length ? (
                    <details><summary>Preview candidate commits</summary><ul>{repositoryActivity.commits.slice(0, 3).map((commit) => <li key={commit.sha}><a href={commit.url} rel="noreferrer" target="_blank">{commit.message}</a><span>{commit.sha} · {commit.author}</span></li>)}</ul></details>
                  ) : null}
                </div>
                <div className={repositoryModeStyles.scopeActions}>
                  <a href={repository.url} rel="noreferrer" target="_blank">GitHub ↗</a>
                  <RepositoryModeControl mode={mode} onChange={(nextMode) => onModeChange(repository.fullName, nextMode)} repository={repository.fullName} />
                </div>
              </article>
            );
          })}
          {inaccessibleScheduledRepositories.map((repository) => (
            <article className="scope-row is-inaccessible" key={repository}>
              <div className="scope-row-main"><div className="scope-row-title"><strong>{repository}</strong><span>Needs GitHub access</span></div><p>It remains in the published scope, but the current GitHub App installation cannot see it.</p></div>
              {appSlug && <a href="https://github.com/settings/installations" rel="noreferrer" target="_blank">Manage installation ↗</a>}
            </article>
          ))}
          {repositoryLoading && <div className="scope-empty"><strong>Checking the scheduled scope…</strong><span>Reading repository access and activity from GitHub.</span></div>}
          {!repositoryLoading && !selectedRepositories.length && !inaccessibleScheduledRepositories.length && <div className="scope-empty"><strong>No sources selected.</strong><span>Add a source below or restore the published scope.</span></div>}
        </div>
        <p className="scope-boundary"><span className={`sync-status is-${feedbackStatus}`}>{feedbackStatus === "loading" ? "Loading state" : feedbackStatus === "saving" ? "Saving modes" : feedbackStatus === "saved" ? "Modes saved to account" : "Modes saved on this device"}</span>{" · "}Changes affect future collection only. Baxtori needs source access before it can publish code claims or a trustworthy system map.</p>
      </section>

      <div className="repo-toolbar">
        <div><span>Available sources</span><h2 id="repositories-heading">Your repositories</h2></div>
        <div className={repositoryModeStyles.toolbarControls}>
          <input aria-label="Search repositories" onChange={(event) => onSearchChange(event.target.value)} placeholder="Search repositories" type="search" value={repositorySearch} />
          <div className={repositoryModeStyles.filters} aria-label="Filter repositories by review mode">
            {(["all", "pinned", "automatic", "muted"] as const).map((filter) => <button aria-pressed={repositoryModeFilter === filter} key={filter} onClick={() => onModeFilterChange(filter)} type="button">{filter === "all" ? `All ${repositories.length}` : `${REPOSITORY_MODE_LABELS[filter]} ${repositoryCounts[filter]}`}</button>)}
          </div>
        </div>
      </div>

      {repositoryLoading ? <div className="repo-loading">Loading live GitHub repositories…</div> : repositoryError ? <div className="repo-loading is-error">{repositoryError}</div> : repositories.length ? (
        <div className="repo-list">
          {displayedRepositories.map((repository) => {
            const mode = repositoryModeFor(repositoryModes, repository.fullName, repository.archived ? "muted" : "automatic");
            const rowClass = mode === "pinned" ? repositoryModeStyles.pinnedRow : mode === "muted" ? repositoryModeStyles.mutedRow : "";
            return (
              <article className={`repo-row ${rowClass}`} key={repository.id}>
                <div className="repo-main">
                  <div><strong>{repository.fullName}</strong>{repository.private && <span>Private</span>}{repository.fork && <span>Fork</span>}</div>
                  <p className="repo-meta"><span>{repository.language ?? "Unspecified language"}</span><span>Pushed {formatRelativeDate(repository.pushedAt)}</span><span>{repository.defaultBranch} branch</span></p>
                </div>
                <div className="repo-mode"><RepositoryModeControl mode={mode} onChange={(nextMode) => onModeChange(repository.fullName, nextMode)} repository={repository.fullName} /><span className={repositoryModeStyles.modeNote}>{REPOSITORY_MODE_DESCRIPTIONS[mode]}</span></div>
              </article>
            );
          })}
          {filteredRepositoryCount > 10 && <button className="show-more" onClick={onShowAllChange} type="button">{showAllRepositories ? "Show fewer" : `Show all ${filteredRepositoryCount}`}</button>}
        </div>
      ) : (
        <div className="repo-empty"><strong>No repositories are available yet.</strong><p>Install the Baxtori GitHub App and choose the repositories you want it to read.</p>{appSlug && <a className="github-button" href={`https://github.com/apps/${appSlug}/installations/new`} rel="noreferrer" target="_blank">Choose repositories on GitHub ↗</a>}</div>
      )}
    </section>
  );
}
