"use client";

import { useEffect, useMemo, useState } from "react";
import latestEdition from "@/data/latest.json";

type Tone = "blue" | "green" | "rust";
type View = "briefing" | "timeline" | "repositories";

type Story = {
  id: string;
  project: string;
  tone: Tone;
  timing: string;
  title: string;
  brief: string;
  learningValue: number;
  verdict: string;
  whatChanged: string;
  whyItMatters: string;
  verify: string;
  tradeoff: string;
  evidence: string;
  files: string[];
  repository?: string;
  commits?: { sha: string; url: string }[];
};

type Edition = {
  generatedAt: string;
  id: string;
  periodEnd: string;
  periodStart: string;
  quietRepositories: string[];
  stories: Story[];
};

type StoryState = {
  expanded: boolean;
  understood: boolean;
  watching: boolean;
  muted: boolean;
};

type Repository = {
  archived: boolean;
  defaultBranch: string;
  description: string | null;
  fork: boolean;
  fullName: string;
  id: number;
  language: string | null;
  name: string;
  openIssues: number;
  private: boolean;
  pushedAt: string | null;
  updatedAt: string;
  url: string;
};

type RepositoryResponse = {
  error?: string;
  repositories: Repository[];
};

type GitHubUser = {
  avatarUrl: string;
  id: number;
  login: string;
  name: string | null;
};

type AuthStatus = {
  appSlug: string | null;
  authenticated: boolean;
  configured: boolean;
  user: GitHubUser | null;
};

type Commit = {
  author: string;
  date: string | null;
  message: string;
  sha: string;
  url: string;
};

type ActivityResponse = {
  commits: Commit[];
  days: number;
  error?: string;
  repository: string;
  since: string;
};

type SavedState = {
  hideUnderstood: boolean;
  selectedRepositories: string[];
  states: Record<string, StoryState>;
  view: View;
};

const STORAGE_KEY = "baxtori:backstory:v1";
const LEGACY_STORAGE_KEY = "glimpse:rundown:v2";
const MAX_SELECTED_REPOSITORIES = 8;

const EMPTY_STORY_STATE: StoryState = {
  expanded: false,
  muted: false,
  understood: false,
  watching: false,
};

const DEMO_STORIES: Story[] = [
  {
    id: "checkout",
    project: "Checkout",
    tone: "blue",
    timing: "Tue, 11:40",
    title: "Payment retries now explain themselves.",
    brief: "Retry decisions are recorded beside each attempt, so support no longer has to reconstruct the story from logs.",
    learningValue: 5,
    verdict: "A clean boundary worth studying",
    whatChanged: "Processor failures, customer-action requirements, and exhausted retries now move through named states instead of one opaque queue path.",
    whyItMatters: "The system exposes policy as data. Support can explain an outcome, and product can measure where recovery actually stops.",
    verify: "Follow one already-queued job through the fallback path and confirm its reason stays stable across another attempt.",
    tradeoff: "The explicit state model adds a small migration and a temporary fallback for jobs already in flight.",
    evidence: "4 commits · 9 files · 18 tests",
    files: ["src/retries/classify.ts", "src/retries/record-decision.ts", "tests/retries/attempts.test.ts"],
  },
  {
    id: "studio",
    project: "Studio",
    tone: "green",
    timing: "Wed, 15:20",
    title: "Workspace permissions have a clearer edge.",
    brief: "Membership is resolved once at the route boundary instead of being rediscovered inside every mutation.",
    learningValue: 4,
    verdict: "Good direction, one edge to watch",
    whatChanged: "Mutations now receive an already-resolved membership context from a shared route guard.",
    whyItMatters: "Authorization becomes easier to audit because the decision is visible in one place rather than scattered across handlers.",
    verify: "Compare direct membership, inherited admin access, and revoked membership across read and write routes.",
    tradeoff: "A bug in the shared guard would reach more routes, so inherited-role behavior deserves a compact test matrix.",
    evidence: "3 commits · 7 files · 12 permission cases",
    files: ["app/api/workspaces/[slug]/guard.ts", "lib/permissions/resolve-role.ts", "tests/permissions/inherited-role.test.ts"],
  },
  {
    id: "canvas",
    project: "Canvas",
    tone: "rust",
    timing: "Thu, 09:05",
    title: "The animation layer lost some old assumptions.",
    brief: "Three almost-identical timing helpers now route through one primitive while a compatibility switch protects this release.",
    learningValue: 3,
    verdict: "Useful cleanup with deliberate debt",
    whatChanged: "Shared timing behavior moved into one primitive and the three older helpers were retired.",
    whyItMatters: "The animation surface is smaller and easier to reason about without changing what users see during the current release window.",
    verify: "Remove the compatibility flag in a test branch and compare interrupted drag and resize transitions.",
    tradeoff: "Two paths remain until the next release, but keeping the switch avoids an unnecessary visual regression risk today.",
    evidence: "4 commits · 6 files · 3 helpers retired",
    files: ["lib/motion/timing.ts", "components/canvas/use-transition.ts", "components/canvas/motion-compat.ts"],
  },
];

const EDITION = latestEdition as Edition;
const STORIES: Story[] = EDITION.stories.length ? EDITION.stories : DEMO_STORIES;

function formatEditionDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatRelativeDate(value: string | null) {
  if (!value) return "No recent push";
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
  if (days === 0) return "Pushed today";
  if (days === 1) return "Pushed yesterday";
  if (days < 14) return `Pushed ${days} days ago`;
  if (days < 60) return `Pushed ${Math.round(days / 7)} weeks ago`;
  return `Pushed ${Math.round(days / 30)} months ago`;
}

export default function Home() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [view, setView] = useState<View>("briefing");
  const [states, setStates] = useState<Record<string, StoryState>>({});
  const [hideUnderstood, setHideUnderstood] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusedStoryId, setFocusedStoryId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repositoryError, setRepositoryError] = useState("");
  const [repositorySearch, setRepositorySearch] = useState("");
  const [showAllRepositories, setShowAllRepositories] = useState(false);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [activity, setActivity] = useState<Record<string, ActivityResponse>>({});
  const [activityLoading, setActivityLoading] = useState(false);

  const storyState = (id: string) => states[id] ?? EMPTY_STORY_STATE;
  const accountStorageKey = auth?.user ? `${STORAGE_KEY}:${auth.user.id}` : null;

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("github");
    queueMicrotask(() => {
      if (result === "connected") setAuthMessage("GitHub connected. Now choose the repositories that matter.");
      else if (result) setAuthMessage("GitHub sign-in could not be completed. Please try again.");
    });

    fetch("/api/auth/github/status")
      .then(async (response) => {
        const payload = (await response.json()) as AuthStatus;
        if (!response.ok) throw new Error("GitHub sign-in status is unavailable.");
        setAuth(payload);
      })
      .catch(() => setAuth({ appSlug: null, authenticated: false, configured: false, user: null }));

    if (result) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!accountStorageKey) return;
    queueMicrotask(() => {
      try {
        setStates({});
        setHideUnderstood(false);
        setView("briefing");
        setSelectedRepositories([]);
        const saved = window.localStorage.getItem(accountStorageKey) ??
          window.localStorage.getItem(STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedState> & {
            selectedRepoIds?: string[];
          };
          if (parsed.states) setStates(parsed.states);
          if (typeof parsed.hideUnderstood === "boolean") setHideUnderstood(parsed.hideUnderstood);
          if (parsed.view === "briefing" || parsed.view === "timeline" || parsed.view === "repositories") {
            setView(parsed.view);
          }
          const savedRepositories = parsed.selectedRepositories ?? parsed.selectedRepoIds;
          if (Array.isArray(savedRepositories)) setSelectedRepositories(savedRepositories);
        }
      } catch {
        window.localStorage.removeItem(accountStorageKey);
      } finally {
        setHasHydrated(true);
      }
    });
  }, [accountStorageKey]);

  useEffect(() => {
    if (!hasHydrated || !accountStorageKey) return;
    const saved: SavedState = { hideUnderstood, selectedRepositories, states, view };
    window.localStorage.setItem(accountStorageKey, JSON.stringify(saved));
  }, [accountStorageKey, hasHydrated, hideUnderstood, selectedRepositories, states, view]);

  useEffect(() => {
    if (!auth?.authenticated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRepositoryLoading(true);
    });
    fetch("/api/github/repos")
      .then(async (response) => {
        const payload = (await response.json()) as RepositoryResponse;
        if (!response.ok) throw new Error(payload.error ?? "GitHub repositories could not be loaded.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setRepositories(payload.repositories);
        setRepositoryError("");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setRepositoryError(error.message);
      })
      .finally(() => {
        if (!cancelled) setRepositoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.authenticated]);

  useEffect(() => {
    if (!auth?.authenticated || !selectedRepositories.length) {
      queueMicrotask(() => setActivity({}));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setActivityLoading(true);
    });
    Promise.all(
      selectedRepositories.slice(0, MAX_SELECTED_REPOSITORIES).map(async (repository) => {
        const response = await fetch(`/api/github/activity?repo=${encodeURIComponent(repository)}&days=14`);
        const payload = (await response.json()) as ActivityResponse;
        return [repository, payload] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setActivity(Object.fromEntries(entries));
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.authenticated, selectedRepositories]);

  const updateStory = (id: string, patch: Partial<StoryState>) => {
    setStates((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_STORY_STATE), ...patch },
    }));
  };

  const understoodCount = STORIES.filter((story) => storyState(story.id).understood).length;
  const watchedStories = STORIES.filter((story) => storyState(story.id).watching);
  const visibleStories = STORIES.filter(
    (story) => !storyState(story.id).muted && (!hideUnderstood || !storyState(story.id).understood),
  );

  const selectedRepositoryData = repositories.filter((repository) =>
    selectedRepositories.includes(repository.fullName),
  );
  const recentCommitCount = Object.values(activity).reduce(
    (total, item) => total + (item.commits?.length ?? 0),
    0,
  );

  const filteredRepositories = useMemo(() => {
    const query = repositorySearch.trim().toLowerCase();
    return repositories.filter((repository) => {
      if (!query) return true;
      return repository.fullName.toLowerCase().includes(query) ||
        repository.description?.toLowerCase().includes(query) ||
        repository.language?.toLowerCase().includes(query);
    });
  }, [repositories, repositorySearch]);

  const displayedRepositories = showAllRepositories
    ? filteredRepositories
    : filteredRepositories.slice(0, 10);

  const markUnderstood = (story: Story) => {
    const understood = storyState(story.id).understood;
    updateStory(story.id, { understood: !understood });
    setNotice(understood ? `${story.project} is back in your queue.` : `${story.project} filed away.`);
  };

  const toggleWatch = (story: Story) => {
    const watching = storyState(story.id).watching;
    updateStory(story.id, { watching: !watching });
    setNotice(watching ? `${story.project} removed from your watch list.` : `${story.project} added to your watch list.`);
  };

  const toggleRepository = (repository: string) => {
    setSelectedRepositories((current) => {
      if (current.includes(repository)) return current.filter((item) => item !== repository);
      if (current.length >= MAX_SELECTED_REPOSITORIES) {
        setNotice(`Keep the first pass focused: choose up to ${MAX_SELECTED_REPOSITORIES} repositories.`);
        return current;
      }
      return [...current, repository];
    });
  };

  const moveStoryFocus = (direction: 1 | -1) => {
    if (!visibleStories.length) return;
    const unread = visibleStories.filter((story) => !storyState(story.id).understood);
    const candidates = unread.length ? unread : visibleStories;
    const currentIndex = candidates.findIndex((story) => story.id === focusedStoryId);
    const nextIndex = currentIndex < 0
      ? direction === 1 ? 0 : candidates.length - 1
      : (currentIndex + direction + candidates.length) % candidates.length;
    const next = candidates[nextIndex];
    setFocusedStoryId(next.id);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`story-${next.id}`);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  const copyBackstory = async () => {
    const lines = STORIES.map(
      (story) => `${story.project}: ${story.title}\n${story.brief}\nTradeoff: ${story.tradeoff}`,
    ).join("\n\n");
    try {
      await navigator.clipboard.writeText(`Baxtori · Weekly code backstory\n\n${lines}`);
      setNotice("Backstory copied.");
    } catch {
      setNotice("Clipboard access is unavailable here.");
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/github/logout", { method: "POST" });
    setHasHydrated(false);
    setAuth((current) => current ? { ...current, authenticated: false, user: null } : current);
    setRepositories([]);
    setActivity({});
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowHelp(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.matches("input, textarea, select, button, a") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) return;

      const focusedStory = visibleStories.find((story) => story.id === focusedStoryId) ?? visibleStories[0];
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        event.preventDefault();
        moveStoryFocus(key === "j" ? 1 : -1);
      } else if (key === "e" && focusedStory) {
        event.preventDefault();
        updateStory(focusedStory.id, { expanded: !storyState(focusedStory.id).expanded });
      } else if (key === "u" && focusedStory) {
        event.preventDefault();
        markUnderstood(focusedStory);
      } else if (key === "f") {
        event.preventDefault();
        setFocusMode((current) => !current);
      } else if (event.key === "?") {
        event.preventDefault();
        setShowHelp((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // The handler intentionally rebinds when the reading queue or story state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedStoryId, states, visibleStories]);

  const renderSourceBanner = () => {
    if (repositoryLoading) {
      return <p>Finding your live GitHub sources…</p>;
    }
    if (repositoryError) {
      return <p>{repositoryError}</p>;
    }
    if (!selectedRepositories.length) {
      return (
        <>
          <p><strong>{repositories.length} available repositories.</strong> Choose only the ones that deserve a weekly backstory.</p>
          <button onClick={() => setView("repositories")} type="button">Choose sources</button>
        </>
      );
    }
    return (
      <>
        <p>
          <strong>{selectedRepositories.length} {selectedRepositories.length === 1 ? "repository" : "repositories"} in view.</strong>{" "}
          {activityLoading ? "Reading recent activity…" : `${recentCommitCount} commits in the last 14 days.`}
        </p>
        <button onClick={() => setView("repositories")} type="button">Manage</button>
      </>
    );
  };

  if (!auth) {
    return (
      <main className="auth-shell" aria-busy="true">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">B</span><strong>Baxtori</strong></div>
        <p>Opening your code backstory…</p>
      </main>
    );
  }

  if (!auth.authenticated) {
    return (
      <main className="auth-shell">
        <section className="auth-card" aria-labelledby="auth-heading">
          <div className="auth-brand"><span className="brand-mark" aria-hidden="true">B</span><strong>Baxtori</strong></div>
          <span className="auth-kicker">Your personal GitHub lens</span>
          <h1 id="auth-heading">Understand the code you&apos;re shipping.</h1>
          <p>Baxtori turns activity across the repositories you choose into a quiet, useful backstory—what changed, why it matters, and what is worth reading.</p>
          {auth.configured ? (
            <a className="github-button" href="/api/auth/github/start">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.24c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.11c.98 0 1.95.13 2.87.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.15v3.27c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>
              Continue with GitHub
            </a>
          ) : (
            <div className="setup-note"><strong>GitHub connection ready for credentials</strong><span>Add the GitHub App settings on the server to enable sign-in.</span></div>
          )}
          {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
          <div className="auth-assurances"><span>Read-only repository access</span><span>You choose the repositories</span><span>No email or notification feed</span></div>
        </section>
      </main>
    );
  }

  return (
    <div className={`app-shell ${focusMode ? "is-focus-mode" : ""}`}>
      <a className="skip-link" href="#content">Skip to the backstory</a>

      <aside className="site-rail" aria-label="Baxtori navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">B</span>
          <div>
            <strong>Baxtori</strong>
            <span>baxtori.com</span>
          </div>
        </div>
        <p className="brand-line">The backstory behind your code.</p>

        <nav className="primary-nav" aria-label="Primary">
          <button className={view === "briefing" ? "is-active" : ""} onClick={() => setView("briefing")} type="button">
            <span>Briefing</span><small>{STORIES.length - understoodCount}</small>
          </button>
          <button className={view === "timeline" ? "is-active" : ""} onClick={() => setView("timeline")} type="button">
            <span>Timeline</span><small>7d</small>
          </button>
          <button className={view === "repositories" ? "is-active" : ""} onClick={() => setView("repositories")} type="button">
            <span>Repositories</span><small>{selectedRepositories.length}</small>
          </button>
        </nav>

        <div className="account-card">
          {auth.user?.avatarUrl && <span aria-hidden="true" className="account-avatar" style={{ backgroundImage: `url(${auth.user.avatarUrl})` }} />}
          <div>
            <strong>{auth.user?.name ?? auth.user?.login}</strong>
            <span>@{auth.user?.login}</span>
          </div>
          <button onClick={signOut} type="button">Sign out</button>
        </div>

        <p className="rail-note">Open it when you want context. Baxtori stays quiet the rest of the time.</p>
      </aside>

      <main id="content">
        <header className="masthead">
          <div className="masthead-top">
            <span>Weekly backstory · {formatEditionDate(EDITION.periodStart)}–{formatEditionDate(EDITION.periodEnd)}</span>
            <div>
              <button aria-pressed={focusMode} onClick={() => setFocusMode((current) => !current)} type="button">
                {focusMode ? "Exit focus" : "Focus"}
              </button>
              <button onClick={copyBackstory} type="button">Copy</button>
              <button aria-expanded={showHelp} onClick={() => setShowHelp((current) => !current)} type="button">?</button>
            </div>
          </div>
          <h1>{view === "repositories" ? "Choose what deserves a backstory." : "What changed—and what it means."}</h1>
          <p className="dek">
            {view === "repositories"
              ? "Live GitHub sources, kept intentionally narrow. Pick the repositories you actually want to understand."
              : `${STORIES.length} ${STORIES.length === 1 ? "decision" : "decisions"} from the week. Everything routine stayed quiet.`}
          </p>

          {view !== "repositories" && <div className="source-banner">{renderSourceBanner()}</div>}

          {showHelp && (
            <div className="shortcut-help">
              <span><kbd>J</kbd> next</span>
              <span><kbd>K</kbd> previous</span>
              <span><kbd>E</kbd> open detail</span>
              <span><kbd>U</kbd> understood</span>
              <span><kbd>F</kbd> focus</span>
            </div>
          )}
        </header>

        <p className="notice" aria-live="polite" role="status">{notice}</p>

        {view === "briefing" && (
          <section className="briefing-view" aria-labelledby="briefing-heading">
            <div className="section-heading">
              <div>
                <span>Start here</span>
                <h2 id="briefing-heading">{understoodCount} of {STORIES.length} understood</h2>
              </div>
              <label>
                <input checked={hideUnderstood} onChange={(event) => setHideUnderstood(event.target.checked)} type="checkbox" />
                Hide understood
              </label>
            </div>

            {visibleStories.length ? (
              <div className="story-list">
                {visibleStories.map((story, index) => {
                  const state = storyState(story.id);
                  return (
                    <article
                      className={`story ${story.tone} ${index === 0 ? "is-first" : ""} ${state.understood ? "is-understood" : ""} ${focusedStoryId === story.id ? "is-focused" : ""}`}
                      id={`story-${story.id}`}
                      key={story.id}
                      onFocusCapture={() => setFocusedStoryId(story.id)}
                      tabIndex={-1}
                    >
                      <div className="story-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
                      <div className="story-body">
                        <div className="story-meta">
                          <span>{story.project}</span>
                          <span>{story.learningValue}/5 learning value</span>
                        </div>
                        <h3>{story.title}</h3>
                        <p className="story-brief">{story.brief}</p>

                        {state.expanded && (
                          <div className="backstory-panel">
                            <div>
                              <span>What changed</span>
                              <p>{story.whatChanged}</p>
                            </div>
                            <div>
                              <span>Why it matters</span>
                              <p>{story.whyItMatters}</p>
                            </div>
                            <div>
                              <span>Check this</span>
                              <p>{story.verify}</p>
                            </div>
                            <details>
                              <summary>Tradeoff and evidence</summary>
                              <p>{story.tradeoff}</p>
                              <strong>{story.evidence}</strong>
                              <div className="file-list">
                                {story.files.map((file) => <code key={file}>{file}</code>)}
                              </div>
                            </details>
                          </div>
                        )}

                        <div className="story-actions">
                          <button className="primary" onClick={() => updateStory(story.id, { expanded: !state.expanded })} type="button">
                            {state.expanded ? "Close" : "Open backstory"}
                          </button>
                          <button aria-pressed={state.understood} onClick={() => markUnderstood(story)} type="button">
                            {state.understood ? "Understood ✓" : "Got it"}
                          </button>
                          <button aria-pressed={state.watching} onClick={() => toggleWatch(story)} type="button">
                            {state.watching ? "Watching" : "Watch"}
                          </button>
                          {state.expanded && (
                            <button className="quiet-action" onClick={() => updateStory(story.id, { muted: true })} type="button">Quiet project</button>
                          )}
                        </div>
                        <p className="story-verdict">{story.verdict}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <span>All caught up</span>
                <h3>Nothing else needs your attention.</h3>
                <p>Your reading state is saved on this device. Routine work stays out of the way.</p>
              </div>
            )}

            {watchedStories.length > 0 && (
              <div className="watch-strip">
                <span>Watching</span>
                {watchedStories.map((story) => <button key={story.id} onClick={() => updateStory(story.id, { expanded: true })} type="button">{story.project}</button>)}
              </div>
            )}

            <div className="quiet-note">
              <span>Quiet-week rule</span>
              <p>If nothing introduced a new behavior, boundary, or open tradeoff, Baxtori publishes no story.</p>
            </div>
          </section>
        )}

        {view === "timeline" && (
          <section className="timeline-view" aria-labelledby="timeline-heading">
            <div className="section-heading">
              <div><span>The raw thread</span><h2 id="timeline-heading">This week, in order</h2></div>
            </div>
            <ol>
              {STORIES.map((story) => (
                <li key={story.id}>
                  <time>{story.timing}</time>
                  <div>
                    <span>{story.project}</span>
                    <h3>{story.title}</h3>
                    <button onClick={() => { setView("briefing"); updateStory(story.id, { expanded: true }); setFocusedStoryId(story.id); }} type="button">Open backstory</button>
                  </div>
                </li>
              ))}
              <li className="routine-rollup">
                <time>All week</time>
                <div><span>Routine work</span><h3>{EDITION.quietRepositories.length || "Other"} quiet {EDITION.quietRepositories.length === 1 ? "repository stayed" : "repositories stayed"} out of the briefing.</h3></div>
              </li>
            </ol>
          </section>
        )}

        {view === "repositories" && (
          <section className="repositories-view" aria-labelledby="repositories-heading">
            <div className="connection-summary">
              <div>
                <span className={`status-dot ${repositoryError ? "is-error" : ""}`} aria-hidden="true" />
                <div>
                  <strong>Connected as @{auth.user?.login}</strong>
                  <p>Baxtori can only read repositories granted to its GitHub App.</p>
                </div>
              </div>
              <div className="connection-actions">
                <span>{selectedRepositories.length}/{MAX_SELECTED_REPOSITORIES} selected</span>
                {auth.appSlug && <a href={`https://github.com/apps/${auth.appSlug}/installations/new`} rel="noreferrer" target="_blank">Manage GitHub access ↗</a>}
              </div>
            </div>

            <div className="repo-toolbar">
              <div>
                <span>Sources</span>
                <h2 id="repositories-heading">Your repositories</h2>
              </div>
              <input
                aria-label="Search repositories"
                onChange={(event) => setRepositorySearch(event.target.value)}
                placeholder="Search repositories"
                type="search"
                value={repositorySearch}
              />
            </div>

            {repositoryLoading ? (
              <div className="repo-loading">Loading live GitHub repositories…</div>
            ) : repositoryError ? (
              <div className="repo-loading is-error">{repositoryError}</div>
            ) : repositories.length ? (
              <div className="repo-list">
                {displayedRepositories.map((repository) => {
                  const selected = selectedRepositories.includes(repository.fullName);
                  return (
                    <article className={selected ? "repo-row is-selected" : "repo-row"} key={repository.id}>
                      <div className="repo-main">
                        <div>
                          <strong>{repository.name}</strong>
                          {repository.private && <span>Private</span>}
                          {repository.fork && <span>Fork</span>}
                        </div>
                        <p>{repository.language ?? "Unspecified"} · {formatRelativeDate(repository.pushedAt)} · {repository.defaultBranch}</p>
                      </div>
                      <button aria-pressed={selected} onClick={() => toggleRepository(repository.fullName)} type="button">
                        {selected ? "Watching ✓" : "Add"}
                      </button>
                    </article>
                  );
                })}
                {filteredRepositories.length > 10 && (
                  <button className="show-more" onClick={() => setShowAllRepositories((current) => !current)} type="button">
                    {showAllRepositories ? "Show fewer" : `Show all ${filteredRepositories.length}`}
                  </button>
                )}
              </div>
            ) : (
              <div className="repo-empty">
                <strong>No repositories are available yet.</strong>
                <p>Install the Baxtori GitHub App and choose the repositories you want it to read.</p>
                {auth.appSlug && <a className="github-button" href={`https://github.com/apps/${auth.appSlug}/installations/new`} rel="noreferrer" target="_blank">Choose repositories on GitHub ↗</a>}
              </div>
            )}

            {selectedRepositoryData.length > 0 && (
              <section className="live-activity" aria-labelledby="activity-heading">
                <div className="section-heading"><div><span>Live signal</span><h2 id="activity-heading">Recent activity</h2></div></div>
                {selectedRepositoryData.map((repository) => {
                  const repositoryActivity = activity[repository.fullName];
                  return (
                    <article key={repository.fullName}>
                      <div className="activity-title">
                        <div><strong>{repository.name}</strong><span>{repositoryActivity?.commits.length ?? 0} commits / 14 days</span></div>
                        <a href={repository.url} rel="noreferrer" target="_blank">GitHub ↗</a>
                      </div>
                      {activityLoading && !repositoryActivity ? (
                        <p>Reading activity…</p>
                      ) : repositoryActivity?.error ? (
                        <p>{repositoryActivity.error}</p>
                      ) : repositoryActivity?.commits.length ? (
                        <ul>
                          {repositoryActivity.commits.slice(0, 3).map((commit) => (
                            <li key={commit.sha}>
                              <a href={commit.url} rel="noreferrer" target="_blank">{commit.message}</a>
                              <span>{commit.sha} · {commit.author}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No commits in the last 14 days. Baxtori would keep this repository quiet.</p>
                      )}
                    </article>
                  );
                })}
              </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
