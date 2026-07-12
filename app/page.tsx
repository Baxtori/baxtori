"use client";

import { useEffect, useMemo, useState } from "react";
import latestEdition from "@/data/latest.json";
import ourchivalMap from "@/data/maps/ourchival.json";
import oneMoreLegendMap from "@/data/maps/one-more-legend.json";
import repositoryMap from "@/data/repo-map.json";
import reviewPolicy from "@/data/review-policy.json";
import reviewScope from "@/data/review-scope.json";
import { RepositoryMaps } from "./repository-maps";
import { type QuestionDisposition, type RepoArea, type RepoMapData, type RepoQuestion, type UnderstandingState } from "./repo-map";
import { type CodeEvidence, StoryCode } from "./story-code";

type Tone = "blue" | "green" | "rust";
type View = "briefing" | "map" | "timeline" | "repositories";

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
  codeEvidence?: CodeEvidence[];
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
  locked: boolean;
  understood: boolean;
  watching: boolean;
  muted: boolean;
  reviewGuidance: string;
  reviewLens: string;
  reviewRequestedAt: string | null;
  revising: boolean;
};

type ReviewPolicy = {
  version: number;
  updatedAt: string;
  defaultLens: string;
  lenses: { id: string; label: string; instruction: string }[];
  preservedRules: string[];
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
  commits?: Commit[];
  days?: number;
  error?: string;
  repository?: string;
  since?: string;
  truncated?: boolean;
  window?: "rolling" | "since-review";
};

type ScopedRepository = {
  fullName: string;
  name: string;
  priority: "core" | "normal" | "low";
  mapStatus: "mapped" | "unmapped" | "empty";
};

type ReviewScope = {
  updatedAt: string;
  lastReviewedAt: string;
  schedule: string;
  windowDays: number;
  repositories: ScopedRepository[];
};

type SavedState = {
  activeMapRepository: string;
  hideUnderstood: boolean;
  mapStates: Record<string, UnderstandingState>;
  questionStates: Record<string, QuestionDisposition>;
  selectedRepositories: string[];
  states: Record<string, StoryState>;
  view: View;
};

const STORAGE_KEY = "baxtori:backstory:v1";
const LEGACY_STORAGE_KEY = "glimpse:rundown:v2";
const MAX_SELECTED_REPOSITORIES = 8;

const EMPTY_STORY_STATE: StoryState = {
  expanded: false,
  locked: false,
  muted: false,
  reviewGuidance: "",
  reviewLens: reviewPolicy.defaultLens,
  reviewRequestedAt: null,
  revising: false,
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
const REPOSITORY_MAP = repositoryMap as RepoMapData;
const REPOSITORY_MAPS = [REPOSITORY_MAP, ourchivalMap as RepoMapData, oneMoreLegendMap as RepoMapData];
const REVIEW_POLICY = reviewPolicy as ReviewPolicy;
const REVIEW_SCOPE = reviewScope as ReviewScope;
const SCHEDULED_REPOSITORIES = REVIEW_SCOPE.repositories.map((repository) => repository.fullName);

function formatEditionDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatReviewCursor(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value));
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
  const [mapStates, setMapStates] = useState<Record<string, UnderstandingState>>({});
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionDisposition>>({});
  const [activeMapRepository, setActiveMapRepository] = useState(REPOSITORY_MAP.repository);
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

  const storyState = (id: string): StoryState => ({ ...EMPTY_STORY_STATE, ...states[id] });
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
        setMapStates({});
        setQuestionStates({});
        setActiveMapRepository(REPOSITORY_MAP.repository);
        setView("briefing");
        setSelectedRepositories(SCHEDULED_REPOSITORIES);
        const saved = window.localStorage.getItem(accountStorageKey) ??
          window.localStorage.getItem(STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedState> & {
            selectedRepoIds?: string[];
          };
          if (parsed.states) setStates(parsed.states);
          if (parsed.mapStates) setMapStates(parsed.mapStates);
          if (parsed.questionStates) setQuestionStates(parsed.questionStates);
          if (parsed.activeMapRepository && REVIEW_SCOPE.repositories.some((repository) => repository.fullName === parsed.activeMapRepository)) {
            setActiveMapRepository(parsed.activeMapRepository);
          }
          if (typeof parsed.hideUnderstood === "boolean") setHideUnderstood(parsed.hideUnderstood);
          if (parsed.view === "briefing" || parsed.view === "map" || parsed.view === "timeline" || parsed.view === "repositories") {
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
    const saved: SavedState = { activeMapRepository, hideUnderstood, mapStates, questionStates, selectedRepositories, states, view };
    window.localStorage.setItem(accountStorageKey, JSON.stringify(saved));
  }, [accountStorageKey, activeMapRepository, hasHydrated, hideUnderstood, mapStates, questionStates, selectedRepositories, states, view]);

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
        const response = await fetch(`/api/github/activity?repo=${encodeURIComponent(repository)}&since=${encodeURIComponent(REVIEW_SCOPE.lastReviewedAt)}`);
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
      [id]: { ...EMPTY_STORY_STATE, ...current[id], ...patch },
    }));
  };

  const understoodCount = STORIES.filter((story) => storyState(story.id).understood).length;
  const watchedStories = STORIES.filter((story) => storyState(story.id).watching);
  const visibleStories = STORIES.filter(
    (story) => storyState(story.id).locked || (!storyState(story.id).muted && (!hideUnderstood || !storyState(story.id).understood)),
  );

  const selectedRepositoryData = repositories.filter((repository) =>
    selectedRepositories.includes(repository.fullName),
  );
  const scheduledRepositorySet = new Set(SCHEDULED_REPOSITORIES);
  const selectedRepositorySet = new Set(selectedRepositories);
  const previewOnlyRepositories = selectedRepositories.filter((repository) => !scheduledRepositorySet.has(repository));
  const hiddenScheduledRepositories = SCHEDULED_REPOSITORIES.filter((repository) => !selectedRepositorySet.has(repository));
  const inaccessibleScheduledRepositories = SCHEDULED_REPOSITORIES.filter((repository) =>
    repositories.length > 0 && !repositories.some((candidate) => candidate.fullName === repository),
  );
  const recentCommitCount = Object.values(activity).reduce(
    (total, item) => total + (item.commits?.length ?? 0),
    0,
  );
  const candidateRepositoryCount = selectedRepositoryData.filter((repository) => (activity[repository.fullName]?.commits?.length ?? 0) > 0).length;
  const quietRepositoryCount = selectedRepositoryData.filter((repository) => {
    const repositoryActivity = activity[repository.fullName];
    return repositoryActivity && !repositoryActivity.error && (repositoryActivity.commits?.length ?? 0) === 0;
  }).length;

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

  const toggleStoryLock = (story: Story) => {
    const locked = storyState(story.id).locked;
    updateStory(story.id, { locked: !locked, muted: false });
    setNotice(locked ? `${story.project} unlocked.` : `${story.project} locked in your briefing.`);
  };

  const requestRereview = async (story: Story) => {
    const state = storyState(story.id);
    const lens = REVIEW_POLICY.lenses.find((item) => item.id === state.reviewLens) ?? REVIEW_POLICY.lenses[0];
    const guidance = state.reviewGuidance.trim();
    const request = [
      `Re-review ${story.repository ?? story.project} story \"${story.title}\" from Baxtori edition ${EDITION.id}.`,
      `Lens: ${lens.label}. ${lens.instruction}`,
      guidance ? `Custom guidance: ${guidance}` : null,
      `Preserve policy v${REVIEW_POLICY.version}: ${REVIEW_POLICY.preservedRules.join(" ")}`,
    ].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(request);
      updateStory(story.id, { reviewRequestedAt: new Date().toISOString(), revising: false });
      setNotice("Re-review request saved on this device and copied for Codex.");
    } catch {
      setNotice("Re-review request is saved here, but clipboard access is unavailable.");
      updateStory(story.id, { reviewRequestedAt: new Date().toISOString(), revising: false });
    }
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

  const updateUnderstanding = (repository: string, area: RepoArea, state: UnderstandingState) => {
    setMapStates((current) => ({ ...current, [`${repository}:${area.id}`]: state }));
    const messages: Record<UnderstandingState, string> = {
      introduced: `${area.name} is now your comprehension frontier.`,
      revisit: `${area.name} will come back with more depth.`,
      skipped: `${area.name} is out of your learning denominator.`,
      understood: `${area.name} added to your understood map.`,
      unexplored: `${area.name} reset.`,
    };
    setNotice(messages[state]);
  };

  const updateQuestion = (repository: string, question: RepoQuestion, state: QuestionDisposition) => {
    setQuestionStates((current) => ({ ...current, [`${repository}:${question.id}`]: state }));
    const messages: Record<QuestionDisposition, string> = {
      irrelevant: "Removed from your open questions.",
      open: "Question kept visible for a future review.",
      resolved: "Question marked resolved on this device.",
    };
    setNotice(messages[state]);
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
          <p><strong>{repositories.length} available repositories.</strong> Choose which ones to include in the weekly review.</p>
          <button onClick={() => setView("repositories")} type="button">Choose sources</button>
        </>
      );
    }
    return (
      <>
        <p>
          <strong>{selectedRepositories.length} {selectedRepositories.length === 1 ? "repository" : "repositories"} in view.</strong>{" "}
          {activityLoading ? "Reading changes since the last review…" : `${recentCommitCount} candidate commits since ${formatReviewCursor(REVIEW_SCOPE.lastReviewedAt)}.`}
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
          <span className="auth-kicker">Sign in</span>
          <h1 id="auth-heading">Review your repositories.</h1>
          <p>Connect GitHub to choose repositories and read the weekly review.</p>
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
        <p className="brand-line">Repository review.</p>

        <nav className="primary-nav" aria-label="Primary">
          <button className={view === "briefing" ? "is-active" : ""} onClick={() => setView("briefing")} type="button">
            <span>Briefing</span><small>{STORIES.length - understoodCount}</small>
          </button>
          <button className={view === "map" ? "is-active" : ""} onClick={() => setView("map")} type="button">
            <span>Repo map</span><small>{Object.values(mapStates).filter((state) => state === "understood").length}</small>
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

        <p className="rail-note">Open it when you want context. Nothing else competes for your attention.</p>
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
          <h1>{view === "repositories" ? "Choose repositories." : view === "map" ? "Repository coverage." : "This week’s changes."}</h1>
          <p className="dek">
            {view === "repositories"
              ? "Select the repositories included in review."
              : view === "map"
                ? "Coverage, open questions, and the next areas to study."
              : `${STORIES.length} ${STORIES.length === 1 ? "item" : "items"} to read from this week’s repository activity.`}
          </p>

          {view !== "repositories" && view !== "map" && (
            <p className="edition-provenance">
              Generated {formatGeneratedAt(EDITION.generatedAt)} · Scheduled review every Monday · {STORIES.length} evidence-backed {STORIES.length === 1 ? "story" : "stories"}
            </p>
          )}

          {view !== "repositories" && view !== "map" && <div className="source-banner">{renderSourceBanner()}</div>}

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
                      className={`story ${story.tone} ${index === 0 ? "is-first" : ""} ${state.expanded ? "is-expanded" : ""} ${state.understood ? "is-understood" : ""} ${state.locked ? "is-locked" : ""} ${focusedStoryId === story.id ? "is-focused" : ""}`}
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
                          <>
                            {story.repository && story.codeEvidence?.length ? (
                              <StoryCode evidence={story.codeEvidence} repository={story.repository} storyId={story.id} />
                            ) : null}
                            <details className="story-analysis">
                              <summary>Explanation, verification, and evidence</summary>
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
                                <section aria-label="Tradeoff and supporting evidence" className="story-evidence">
                                  <span>Tradeoff</span>
                                  <p>{story.tradeoff}</p>
                                  <strong>{story.evidence}</strong>
                                  {story.commits?.length ? (
                                    <div className="commit-list" aria-label="Supporting commits">
                                      {story.commits.map((commit) => (
                                        <a href={commit.url} key={commit.sha} rel="noreferrer" target="_blank">
                                          {commit.sha} ↗
                                        </a>
                                      ))}
                                    </div>
                                  ) : null}
                                  <div className="file-list">
                                    {story.files.map((file) => <code key={file}>{file}</code>)}
                                  </div>
                                </section>
                              </div>
                            </details>
                          </>
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
                            <>
                              <button aria-pressed={state.locked} onClick={() => toggleStoryLock(story)} type="button">{state.locked ? "Locked ✓" : "Lock"}</button>
                              <button aria-expanded={state.revising} onClick={() => updateStory(story.id, { revising: !state.revising })} type="button">Re-review</button>
                              <button className="quiet-action" disabled={state.locked} onClick={() => updateStory(story.id, { muted: true })} title={state.locked ? "Unlock this item before dismissing it." : undefined} type="button">Dismiss</button>
                            </>
                          )}
                        </div>
                        {state.revising && (
                          <form className="revision-panel" onSubmit={(event) => { event.preventDefault(); void requestRereview(story); }}>
                            <div>
                              <span>Revision request · policy v{REVIEW_POLICY.version}</span>
                              <strong>Review this again from a different angle.</strong>
                              <p>The request stays on this device and is copied as a ready-to-run Codex prompt.</p>
                            </div>
                            <label>
                              Review lens
                              <select value={state.reviewLens} onChange={(event) => updateStory(story.id, { reviewLens: event.target.value })}>
                                {REVIEW_POLICY.lenses.map((lens) => <option key={lens.id} value={lens.id}>{lens.label}</option>)}
                              </select>
                            </label>
                            <label>
                              Guidance, optional
                              <textarea onChange={(event) => updateStory(story.id, { reviewGuidance: event.target.value })} placeholder="What felt wrong, what to preserve, or what view you want instead…" rows={3} value={state.reviewGuidance} />
                            </label>
                            <div className="revision-actions">
                              <button className="primary" type="submit">Copy re-review request</button>
                              <button onClick={() => updateStory(story.id, { revising: false })} type="button">Cancel</button>
                            </div>
                          </form>
                        )}
                        {state.reviewRequestedAt && <p className="review-requested">Re-review requested on this device · {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(state.reviewRequestedAt))}</p>}
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
              <span>Selection rule</span>
              <p>If nothing introduced a new behavior, boundary, or open tradeoff, Baxtori publishes no story.</p>
            </div>
          </section>
        )}

        {view === "map" && (
          <RepositoryMaps
            activeRepository={activeMapRepository}
            data={REPOSITORY_MAPS}
            onActiveRepositoryChange={setActiveMapRepository}
            onQuestionChange={updateQuestion}
            onStateChange={updateUnderstanding}
            questionStates={questionStates}
            sources={REVIEW_SCOPE.repositories}
            states={mapStates}
          />
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
                <div><span>Other repositories</span><h3>{EDITION.quietRepositories.length ? `${EDITION.quietRepositories.length} ${EDITION.quietRepositories.length === 1 ? "repository had" : "repositories had"} no selected changes.` : "No other repositories added an item."}</h3></div>
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
                  <p>Public repositories are visible; private repositories require explicit GitHub App access.</p>
                </div>
              </div>
              <div className="connection-actions">
                <span>{selectedRepositories.length}/{MAX_SELECTED_REPOSITORIES} selected</span>
                {auth.appSlug && <a href={`https://github.com/apps/${auth.appSlug}/installations/new`} rel="noreferrer" target="_blank">Manage GitHub access ↗</a>}
              </div>
            </div>

            <section className="review-preview" aria-labelledby="review-preview-heading">
              <div className="review-preview-heading">
                <div>
                  <span className="eyebrow">Next scheduled review · {REVIEW_SCOPE.schedule}</span>
                  <h2 id="review-preview-heading">What Monday will inspect</h2>
                  <p>GitHub supplies the candidate commits. The scheduled review selects what reaches your briefing.</p>
                </div>
                <div className="review-preview-metrics" aria-label="Scheduled review preview">
                  <div><strong>{recentCommitCount}{Object.values(activity).some((item) => item.truncated) ? "+" : ""}</strong><span>candidate commits</span></div>
                  <div><strong>{candidateRepositoryCount}</strong><span>active repositories</span></div>
                  <div><strong>{quietRepositoryCount}</strong><span>with no new commits</span></div>
                </div>
              </div>

              {(previewOnlyRepositories.length > 0 || hiddenScheduledRepositories.length > 0) && (
                <div className="scope-drift" role="status">
                  <div>
                    <strong>Device preview differs from the scheduled scope.</strong>
                    <span>{previewOnlyRepositories.length} preview-only · {hiddenScheduledRepositories.length} scheduled but hidden</span>
                  </div>
                  <button onClick={() => setSelectedRepositories(SCHEDULED_REPOSITORIES)} type="button">Use scheduled scope</button>
                </div>
              )}

              <div className="scope-list">
                {selectedRepositoryData.map((repository) => {
                  const repositoryActivity = activity[repository.fullName];
                  const scheduled = scheduledRepositorySet.has(repository.fullName);
                  const scope = REVIEW_SCOPE.repositories.find((item) => item.fullName === repository.fullName);
                  const commitCount = repositoryActivity?.commits?.length ?? 0;
                  return (
                    <article className="scope-row" key={repository.fullName}>
                      <div className="scope-row-main">
                        <div className="scope-row-title">
                          <strong>{repository.name}</strong>
                          <span className={scheduled ? "is-scheduled" : "is-preview"}>{scheduled ? "Scheduled" : "Preview only"}</span>
                          {scope && <span>{scope.mapStatus === "mapped" ? "Mapped" : scope.mapStatus === "empty" ? "No code yet" : "Not mapped"}</span>}
                        </div>
                        <p>
                          {activityLoading && !repositoryActivity
                            ? "Checking GitHub activity…"
                            : repositoryActivity?.error
                              ? repositoryActivity.error
                              : commitCount
                                ? `${commitCount}${repositoryActivity?.truncated ? "+" : ""} commits await review.`
                                : `No commits since ${formatReviewCursor(REVIEW_SCOPE.lastReviewedAt)}.`}
                        </p>
                        {repositoryActivity?.commits?.length ? (
                          <details>
                            <summary>Preview candidate commits</summary>
                            <ul>
                              {repositoryActivity.commits.slice(0, 3).map((commit) => (
                                <li key={commit.sha}><a href={commit.url} rel="noreferrer" target="_blank">{commit.message}</a><span>{commit.sha} · {commit.author}</span></li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                      <div className="scope-row-actions">
                        <a href={repository.url} rel="noreferrer" target="_blank">GitHub ↗</a>
                        <button onClick={() => toggleRepository(repository.fullName)} type="button">Remove</button>
                      </div>
                    </article>
                  );
                })}
                {inaccessibleScheduledRepositories.map((repository) => (
                  <article className="scope-row is-inaccessible" key={repository}>
                    <div className="scope-row-main"><div className="scope-row-title"><strong>{repository}</strong><span>Needs GitHub access</span></div><p>Scheduled locally, but not visible to the current GitHub App installation.</p></div>
                    {auth.appSlug && <a href={`https://github.com/apps/${auth.appSlug}/installations/new`} rel="noreferrer" target="_blank">Manage access ↗</a>}
                  </article>
                ))}
                {repositoryLoading && <div className="scope-empty"><strong>Checking the scheduled scope…</strong><span>Reading repository access and post-review activity from GitHub.</span></div>}
                {!repositoryLoading && !selectedRepositoryData.length && !inaccessibleScheduledRepositories.length && (
                  <div className="scope-empty"><strong>No repositories in this device preview.</strong><span>Add a source below or restore the scheduled scope.</span></div>
                )}
              </div>
              <p className="scope-boundary">Scheduled means the repository is present in Baxtori&apos;s validated local compiler manifest. Preview-only selections stay on this device until that manifest is deliberately updated.</p>
            </section>

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
                        {selected ? "Included ✓" : "Include"}
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

          </section>
        )}
      </main>
    </div>
  );
}
