"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mapWithConcurrency } from "@/lib/async-pool";
import {
  CAPTURE_WINDOWS,
  CAPTURE_WINDOW_LABELS,
  DEFAULT_CAPTURE_WINDOW,
  captureWindowEmptyLabel,
  captureWindowSearch,
  isCaptureWindow,
  type CaptureWindow,
} from "@/lib/capture-window";
import { buildContinueQueue, planContinueQueue, type ContinueItem, type ContinueItemKind } from "@/lib/continue-queue";
import { buildReaderTrail, type TrailStory } from "@/lib/reader-trail";
import type { GitHubUser } from "@/lib/github-auth";
import type { RepositoryLibraryEntry } from "@/lib/github-repository-library";
import { focusTargetFor, planStoryOpening, shouldClearReviewMarker, type FocusTarget } from "@/lib/reader-navigation";
import { parseStoredQuestionRecords, type ThreadQuestionRecord } from "@/lib/story-questions";
import {
  initializeRepositoryModes,
  repositoryModeCounts,
  repositoryModeFor,
  restorePublishedRepositoryModes,
  reviewRepositoriesFromModes,
  sortRepositoriesByMode,
  withRepositoryMode,
  REPOSITORY_MODE_DESCRIPTIONS,
  REPOSITORY_MODE_LABELS,
  type RepositoryMode,
  type RepositoryPreferenceSource,
} from "@/lib/repository-modes";
import { activeWatchThreadFor, storyWatchInput, topicThreadFor, type TopicThreadRecord } from "@/lib/story-topics";
import type { ReaderStatePayload, ReaderStoryState, ReviewRequest } from "@/lib/feedback-contract";
import {
  DEMO_TOPIC_THREAD,
  EDITION,
  HISTORY_EDITIONS,
  HISTORY_EDITION_COUNT,
  REPOSITORY_MAP,
  REPOSITORY_MAPS,
  REVIEW_POLICY,
  REVIEW_SCOPE,
  SCHEDULED_REPOSITORIES,
  STORIES,
  type Story,
} from "./edition-data";
import { EditionSelectionLedger } from "./edition-selection-ledger";
import { EditionHistory } from "./edition-history";
import { EditionTimeline } from "./edition-timeline";
import { BrandMark } from "./brand-mark";
import { formatEditionDate, formatGeneratedAt, formatRelativeDate } from "./format";
import { RepositoryModeControl } from "./repository-mode-control";
import repositoryModeStyles from "./repository-modes.module.css";
import { RepositoryMaps } from "./repository-maps";
import { type QuestionDisposition, type RepoArea, type RepoQuestion, type UnderstandingState } from "./repo-map";
import { SourcesView } from "./sources-view";
import { StoryCode } from "./story-code";
import { TrailReader } from "./trail-reader";

type View = "briefing" | "history" | "map" | "timeline" | "repositories";

type StoryState = ReaderStoryState;

type Repository = RepositoryLibraryEntry;

type RepositoryResponse = {
  error?: string;
  repositories: Repository[];
};

export type AuthStatus = {
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

type SavedState = ReaderStatePayload;

type FeedbackStateResponse = {
  configured: boolean;
  error?: string;
  reviewRequests: ReviewRequest[];
  revision?: number;
  state: ReaderStatePayload | null;
  threadQuestions: ThreadQuestionRecord[];
  topicThreads: TopicThreadRecord[];
  updatedAt?: number | null;
};

type FeedbackStatus = "loading" | "local" | "saved" | "saving";

const STORAGE_KEY = "baxtori:backstory:v1";
const LEGACY_STORAGE_KEY = "glimpse:rundown:v2";
const LOCAL_QUESTION_STORAGE_KEY = "baxtori:evidence-questions:v1";
const DEMO_STORAGE_SUFFIX = "published-demo";
const DEFAULT_CONTINUE_BUDGET = 15;
const CONTINUE_KIND_LABELS: Record<ContinueItemKind, string> = {
  area: "Map frontier",
  question: "Open question",
  review: "Re-review context",
  story: "Unread backstory",
  watch: "Watched thread",
};

const EMPTY_STORY_STATE: StoryState = {
  expanded: false,
  locked: false,
  muted: false,
  reviewGuidance: "",
  reviewLens: REVIEW_POLICY.defaultLens,
  reviewRequestedAt: null,
  revising: false,
  understood: false,
  watching: false,
};

export default function BaxtoriApp({ initialAuth, initialDemoMode = false }: {
  initialAuth: AuthStatus;
  initialDemoMode?: boolean;
}) {
  const [auth, setAuth] = useState<AuthStatus>(initialAuth);
  const [demoMode, setDemoMode] = useState(initialDemoMode);
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
  const [continueBudget, setContinueBudget] = useState(DEFAULT_CONTINUE_BUDGET);
  const [captureWindow, setCaptureWindow] = useState<CaptureWindow>(DEFAULT_CAPTURE_WINDOW);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [notice, setNotice] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [feedbackConfigured, setFeedbackConfigured] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("loading");
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [threadQuestions, setThreadQuestions] = useState<ThreadQuestionRecord[]>([]);
  const [topicThreads, setTopicThreads] = useState<TopicThreadRecord[]>([]);
  const watchMigrationAttempted = useRef(false);
  // Last account revision this client loaded or saved; sent with every save so
  // the server can refuse writes that would clobber a newer device's state.
  const stateRevision = useRef(0);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repositoryError, setRepositoryError] = useState("");
  const [repositorySearch, setRepositorySearch] = useState("");
  const [repositoryModeFilter, setRepositoryModeFilter] = useState<"all" | RepositoryMode>("all");
  const [showAllRepositories, setShowAllRepositories] = useState(false);
  const [repositoryModes, setRepositoryModes] = useState<Record<string, RepositoryMode>>({});
  const [repositoryModesInitialized, setRepositoryModesInitialized] = useState(false);
  const [repositoriesLoaded, setRepositoriesLoaded] = useState(false);
  const legacySelectedRepositories = useRef<string[]>(SCHEDULED_REPOSITORIES);
  const repositoryPreferenceSource = useRef<RepositoryPreferenceSource>("legacy");
  const [activity, setActivity] = useState<Record<string, ActivityResponse>>({});
  const [activityLoading, setActivityLoading] = useState(false);

  const storyState = useCallback((id: string): StoryState => ({ ...EMPTY_STORY_STATE, ...states[id] }), [states]);
  const selectedRepositories = useMemo(() => reviewRepositoriesFromModes(repositoryModes), [repositoryModes]);
  const readerAuthenticated = Boolean(auth.authenticated || demoMode);
  const accountStorageKey = demoMode ? `${STORAGE_KEY}:${DEMO_STORAGE_SUFFIX}` : auth?.user ? `${STORAGE_KEY}:${auth.user.id}` : null;
  const questionStorageKey = demoMode ? `${LOCAL_QUESTION_STORAGE_KEY}:${DEMO_STORAGE_SUFFIX}` : auth?.user ? `${LOCAL_QUESTION_STORAGE_KEY}:${auth.user.id}` : null;

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const result = search.get("github");
    queueMicrotask(() => {
      if (search.get("demo") === "1") setDemoMode(true);
      if (result === "connected") setAuthMessage("GitHub connected. Now choose the repositories that matter.");
      else if (result) setAuthMessage("GitHub sign-in could not be completed. Please try again.");
    });

    if (result) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const applySavedState = useCallback((parsed: Partial<SavedState> & { selectedRepoIds?: string[] }) => {
      if (parsed.states) setStates(parsed.states);
      if (parsed.mapStates) setMapStates(parsed.mapStates);
      if (parsed.questionStates) setQuestionStates(parsed.questionStates);
      if (parsed.activeMapRepository && REVIEW_SCOPE.repositories.some((repository) => repository.fullName === parsed.activeMapRepository)) {
        setActiveMapRepository(parsed.activeMapRepository);
      }
      if (typeof parsed.hideUnderstood === "boolean") setHideUnderstood(parsed.hideUnderstood);
      if (isCaptureWindow(parsed.captureWindow)) setCaptureWindow(parsed.captureWindow);
      if (
        typeof parsed.continueBudgetMinutes === "number" &&
        parsed.continueBudgetMinutes >= 5 &&
        parsed.continueBudgetMinutes <= 60 &&
        parsed.continueBudgetMinutes % 5 === 0
      ) setContinueBudget(parsed.continueBudgetMinutes);
      const savedRepositories = parsed.selectedRepositories ?? parsed.selectedRepoIds ?? SCHEDULED_REPOSITORIES;
      legacySelectedRepositories.current = Array.isArray(savedRepositories) ? savedRepositories : SCHEDULED_REPOSITORIES;
      if (parsed.repositoryModes && Object.keys(parsed.repositoryModes).length) {
        setRepositoryModes(parsed.repositoryModes);
        repositoryPreferenceSource.current = "explicit";
      } else {
        setRepositoryModes({});
        repositoryPreferenceSource.current = "legacy";
      }
  }, []);

  useEffect(() => {
    if (!accountStorageKey || !readerAuthenticated) return;
    const controller = new AbortController();

    const hydrate = async () => {
      setStates({});
      setHideUnderstood(false);
      setMapStates({});
      setQuestionStates({});
      setActiveMapRepository(REPOSITORY_MAP.repository);
      setRepositoryModes({});
      setRepositoryModesInitialized(false);
      legacySelectedRepositories.current = SCHEDULED_REPOSITORIES;
      repositoryPreferenceSource.current = "legacy";
      setReviewRequests([]);
      setThreadQuestions([]);
      setTopicThreads([]);
      watchMigrationAttempted.current = false;
      stateRevision.current = 0;
      setFeedbackStatus("loading");

      let localState: (Partial<SavedState> & { selectedRepoIds?: string[] }) | null = null;
      let localQuestions: ThreadQuestionRecord[] = [];
      try {
        const saved = window.localStorage.getItem(accountStorageKey) ??
          window.localStorage.getItem(STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) localState = JSON.parse(saved) as Partial<SavedState> & { selectedRepoIds?: string[] };
        const savedQuestions = questionStorageKey ? window.localStorage.getItem(questionStorageKey) : null;
        if (savedQuestions) localQuestions = parseStoredQuestionRecords(JSON.parse(savedQuestions));
      } catch {
        window.localStorage.removeItem(accountStorageKey);
        if (questionStorageKey) window.localStorage.removeItem(questionStorageKey);
      }
      setThreadQuestions(localQuestions);

      if (demoMode) {
        applySavedState(localState ?? {});
        setRepositoryModes(Object.fromEntries(SCHEDULED_REPOSITORIES.map((repository) => [repository, "automatic" as const])));
        setRepositoryModesInitialized(true);
        setRepositoriesLoaded(true);
        setTopicThreads([DEMO_TOPIC_THREAD]);
        setFeedbackConfigured(false);
        setFeedbackStatus("local");
        setHasHydrated(true);
        return;
      }

      try {
        const response = await fetch("/api/feedback/state", { signal: controller.signal });
        const remote = (await response.json()) as FeedbackStateResponse;
        if (!response.ok) throw new Error(remote.error ?? "Account state is unavailable.");
        if (controller.signal.aborted) return;
        setFeedbackConfigured(remote.configured);
        stateRevision.current = remote.revision ?? 0;
        setReviewRequests(remote.reviewRequests ?? []);
        setThreadQuestions([...(remote.threadQuestions ?? []), ...localQuestions]);
        setTopicThreads(remote.topicThreads ?? []);
        applySavedState(remote.state ?? localState ?? {});
        setFeedbackStatus(remote.configured ? "saved" : "local");
      } catch {
        if (controller.signal.aborted) return;
        applySavedState(localState ?? {});
        setFeedbackConfigured(false);
        setFeedbackStatus("local");
      } finally {
        if (!controller.signal.aborted) setHasHydrated(true);
      }
    };

    void hydrate();
    return () => controller.abort();
  }, [accountStorageKey, applySavedState, demoMode, questionStorageKey, readerAuthenticated]);

  useEffect(() => {
    if (!hasHydrated || !accountStorageKey || !repositoryModesInitialized) return;
    const saved: SavedState = {
      activeMapRepository,
      captureWindow,
      continueBudgetMinutes: continueBudget,
      editionId: EDITION.id,
      hideUnderstood,
      mapStates,
      questionStates,
      repositoryModes,
      selectedRepositories,
      states,
      version: 1,
      view,
    };
    window.localStorage.setItem(accountStorageKey, JSON.stringify(saved));
    if (!feedbackConfigured) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setFeedbackStatus("saving");
      fetch("/api/feedback/state", {
        body: JSON.stringify({ ...saved, baseRevision: stateRevision.current }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.status === 409) {
            // Another device saved a newer revision; reload it so this client
            // continues from the newest state instead of overwriting it.
            const refreshed = await fetch("/api/feedback/state", { signal: controller.signal });
            const remote = (await refreshed.json()) as FeedbackStateResponse;
            if (!refreshed.ok) throw new Error("Account state could not be reloaded.");
            if (controller.signal.aborted) return;
            stateRevision.current = remote.revision ?? 0;
            if (remote.state) applySavedState(remote.state);
            setReviewRequests(remote.reviewRequests ?? []);
            setTopicThreads(remote.topicThreads ?? []);
            setFeedbackStatus("saved");
            setNotice("Your reading state changed on another device, so the newer version was loaded.");
            return;
          }
          if (!response.ok) throw new Error("Account state could not be saved.");
          const payload = (await response.json()) as { revision?: number };
          if (typeof payload.revision === "number") stateRevision.current = payload.revision;
          setFeedbackStatus("saved");
        })
        .catch((error: Error) => {
          if (error.name !== "AbortError") setFeedbackStatus("local");
        });
    }, 650);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [accountStorageKey, activeMapRepository, applySavedState, captureWindow, continueBudget, feedbackConfigured, hasHydrated, hideUnderstood, mapStates, questionStates, repositoryModes, repositoryModesInitialized, selectedRepositories, states, view]);

  useEffect(() => {
    if (!hasHydrated || !questionStorageKey) return;
    const localQuestions = threadQuestions.filter((question) => question._id.startsWith("local:"));
    window.localStorage.setItem(questionStorageKey, JSON.stringify(localQuestions));
  }, [hasHydrated, questionStorageKey, threadQuestions]);

  useEffect(() => {
    if (!hasHydrated || !feedbackConfigured || watchMigrationAttempted.current) return;
    watchMigrationAttempted.current = true;
    const legacyWatches = STORIES.flatMap((story) => {
      if (!storyState(story.id).watching || activeWatchThreadFor(topicThreads, story)) return [];
      const input = storyWatchInput(story, EDITION.id);
      return input ? [input] : [];
    });
    if (!legacyWatches.length) return;

    void Promise.all(legacyWatches.map(async (input) => {
      const response = await fetch("/api/feedback/topics", {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; topic?: TopicThreadRecord };
      if (!response.ok || !payload.topic) throw new Error(payload.error ?? "The watched topic could not be migrated.");
      return payload.topic;
    })).then((migrated) => {
      setTopicThreads((current) => {
        const bySource = new Map(current.map((thread) => [thread.sourceKey, thread]));
        for (const thread of migrated) bySource.set(thread.sourceKey, thread);
        return [...bySource.values()];
      });
    }).catch(() => {
      setNotice("Existing watches remain saved on this device until account sync is available.");
    });
    // This migration runs once per account hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackConfigured, hasHydrated]);

  useEffect(() => {
    if (!auth.authenticated || demoMode) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setRepositoryLoading(true);
        setRepositoriesLoaded(false);
      }
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
        if (!cancelled) {
          setRepositoryLoading(false);
          setRepositoriesLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.authenticated, demoMode]);

  useEffect(() => {
    if (!hasHydrated || !repositoriesLoaded || repositoryModesInitialized) return;
    queueMicrotask(() => {
      setRepositoryModes((current) => initializeRepositoryModes({
        legacySelectedRepositories: legacySelectedRepositories.current,
        repositories,
        source: repositoryPreferenceSource.current,
        storedModes: current,
      }));
      setRepositoryModesInitialized(true);
    });
  }, [hasHydrated, repositories, repositoriesLoaded, repositoryModesInitialized]);

  useEffect(() => {
    if (!repositoryModesInitialized || !repositories.length) return;
    queueMicrotask(() => {
      setRepositoryModes((current) => initializeRepositoryModes({
        legacySelectedRepositories: [],
        repositories,
        source: "explicit",
        storedModes: current,
      }));
    });
  }, [repositories, repositoryModesInitialized]);

  useEffect(() => {
    if (!auth.authenticated || demoMode || !repositoryModesInitialized || !selectedRepositories.length) {
      queueMicrotask(() => setActivity({}));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setActivityLoading(true);
    });
    const windowSearch = captureWindowSearch(captureWindow, REVIEW_SCOPE.lastReviewedAt);
    mapWithConcurrency(
      selectedRepositories,
      6,
      async (repository) => {
        const search = new URLSearchParams(windowSearch);
        search.set("repo", repository);
        const response = await fetch(`/api/github/activity?${search}`);
        const payload = (await response.json()) as ActivityResponse;
        return [repository, payload] as const;
      },
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
  }, [auth.authenticated, captureWindow, demoMode, repositoryModesInitialized, selectedRepositories]);

  const updateStory = (id: string, patch: Partial<StoryState>) => {
    setStates((current) => ({
      ...current,
      [id]: { ...EMPTY_STORY_STATE, ...current[id], ...patch },
    }));
  };

  const saveThreadQuestion = (question: ThreadQuestionRecord, topic?: TopicThreadRecord) => {
    setThreadQuestions((current) => [question, ...current.filter((item) => item._id !== question._id)]);
    if (topic) {
      setTopicThreads((current) => [topic, ...current.filter((item) => item._id !== topic._id && item.sourceKey !== topic.sourceKey)]);
    }
  };

  const updateThreadQuestion = (question: ThreadQuestionRecord) => {
    setThreadQuestions((current) => current.map((item) => item._id === question._id ? question : item));
  };

  const isStoryWatching = useCallback(
    (story: Story) => Boolean(activeWatchThreadFor(topicThreads, story) || storyState(story.id).watching),
    [storyState, topicThreads],
  );
  const effectiveStoryStates = useMemo(() => Object.fromEntries(STORIES.map((story) => [
    story.id,
    { ...storyState(story.id), watching: isStoryWatching(story) },
  ])), [isStoryWatching, storyState]);
  const understoodCount = STORIES.filter((story) => storyState(story.id).understood).length;
  const watchedStories = STORIES.filter(isStoryWatching);
  const queuedReviewRequests = reviewRequests.filter((request) => request.status === "queued");
  const openThreadQuestionCount = threadQuestions.filter((question) => question.status === "open").length;
  const memoryAttentionCount = watchedStories.length + openThreadQuestionCount;
  const visibleStories = useMemo(() => STORIES.filter(
    (story) => storyState(story.id).locked || (!storyState(story.id).muted && (!hideUnderstood || !storyState(story.id).understood)),
  ), [hideUnderstood, storyState]);
  const continueQueue = useMemo(() => buildContinueQueue({
    mapStates,
    questionStates,
    repositoryMaps: REPOSITORY_MAPS,
    reviewRequests,
    stories: STORIES,
    storyStates: effectiveStoryStates,
  }), [effectiveStoryStates, mapStates, questionStates, reviewRequests]);
  const continuePlan = useMemo(() => planContinueQueue(continueQueue, continueBudget), [continueBudget, continueQueue]);
  const nextContinueItem = continuePlan.items[0];
  const editionItems = useMemo<ContinueItem[]>(() => STORIES.map((story, index) => ({
    id: `edition-story:${story.id}`,
    kind: "story",
    minutes: Math.max(3, Math.min(5, story.learningValue)),
    priority: STORIES.length - index,
    reason: "Selected for this edition.",
    repository: story.repository ?? story.project,
    targetId: story.id,
    title: story.title,
    view: "briefing",
  })), []);
  const editionMinutes = useMemo(
    () => editionItems.reduce((total, item) => total + item.minutes, 0),
    [editionItems],
  );
  const trailSession = useMemo(() => buildReaderTrail({
    budgetMinutes: editionMinutes,
    editionId: EDITION.id,
    items: editionItems,
    plannedMinutes: editionMinutes,
    quietRepositories: EDITION.quietRepositories,
    stories: STORIES,
    totalItemCount: editionItems.length,
  }), [editionItems, editionMinutes]);

  const selectedRepositoryData = sortRepositoriesByMode(repositories.filter((repository) =>
    selectedRepositories.includes(repository.fullName),
  ), repositoryModes);
  const systemSources = selectedRepositoryData.length
    ? selectedRepositoryData.map((repository) => {
        const published = REVIEW_SCOPE.repositories.find((source) => source.fullName === repository.fullName);
        return published ?? {
          fullName: repository.fullName,
          mapStatus: "unmapped" as const,
          name: repository.name,
        };
      })
    : REVIEW_SCOPE.repositories;
  const repositoryCounts = repositoryModeCounts(repositories, repositoryModes);
  const scheduledRepositorySet = new Set(SCHEDULED_REPOSITORIES);
  const selectedRepositorySet = new Set(selectedRepositories);
  const pendingAddedRepositories = selectedRepositories.filter((repository) => !SCHEDULED_REPOSITORIES.includes(repository));
  const pendingRemovedRepositories = SCHEDULED_REPOSITORIES.filter((repository) => !selectedRepositorySet.has(repository));
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
    return sortRepositoriesByMode(repositories.filter((repository) => {
      const mode = repositoryModeFor(repositoryModes, repository.fullName, repository.archived ? "muted" : "automatic");
      if (repositoryModeFilter !== "all" && mode !== repositoryModeFilter) return false;
      if (!query) return true;
      return repository.fullName.toLowerCase().includes(query) ||
        repository.description?.toLowerCase().includes(query) ||
        repository.language?.toLowerCase().includes(query);
    }), repositoryModes);
  }, [repositories, repositoryModeFilter, repositoryModes, repositorySearch]);

  const displayedRepositories = showAllRepositories
    ? filteredRepositories
    : filteredRepositories.slice(0, 10);

  const markUnderstood = (story: Story) => {
    const understood = storyState(story.id).understood;
    updateStory(story.id, { understood: !understood });
    setNotice(understood ? `${story.project} is back in your queue.` : `${story.project} filed away.`);
  };

  const toggleWatch = async (story: Story) => {
    const activeThread = activeWatchThreadFor(topicThreads, story);
    const watching = Boolean(activeThread || storyState(story.id).watching);
    const input = storyWatchInput(story, EDITION.id);
    const nextWatching = !watching;

    // Reflect the reader's decision immediately. Account persistence happens
    // behind the interaction and falls back to the local state on failure.
    updateStory(story.id, { watching: nextWatching });
    if (activeThread) {
      setTopicThreads((current) => current.map((thread) =>
        thread._id === activeThread._id ? { ...thread, status: "resolved" } : thread,
      ));
    }
    setNotice(nextWatching ? `${story.project} added to your watch list.` : `${story.project} removed from your watch list.`);

    if (feedbackConfigured && input && (!watching || activeThread)) {
      try {
        const response = await fetch("/api/feedback/topics", {
          body: JSON.stringify(activeThread
            ? { snoozedUntil: null, status: "resolved", threadId: activeThread._id }
            : input),
          headers: { "Content-Type": "application/json" },
          method: activeThread ? "PATCH" : "POST",
        });
        const payload = (await response.json()) as { error?: string; topic?: TopicThreadRecord };
        if (!response.ok || !payload.topic) throw new Error(payload.error ?? "The watch could not be saved.");
        setTopicThreads((current) => {
          const next = current.filter((thread) => thread._id !== payload.topic?._id && thread.sourceKey !== payload.topic?.sourceKey);
          return payload.topic ? [payload.topic, ...next] : next;
        });
        setNotice(activeThread ? `${story.project} watch resolved.` : `${story.project} will return when new evidence advances this topic.`);
        return;
      } catch {
        if (activeThread) {
          setTopicThreads((current) => current.map((thread) =>
            thread._id === activeThread._id ? activeThread : thread,
          ));
          updateStory(story.id, { watching: true });
        }
        setNotice("The watch is saved on this device until account sync is available.");
        return;
      }
    }
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
    const fallbackPrompt = [
      `Re-review ${story.repository ?? story.project} story \"${story.title}\" from Baxtori edition ${EDITION.id}.`,
      `Lens: ${lens.label}. ${lens.instruction}`,
      guidance ? `Custom guidance: ${guidance}` : null,
      `Preserve policy v${REVIEW_POLICY.version}: ${REVIEW_POLICY.preservedRules.join(" ")}`,
    ].filter(Boolean).join("\n\n");

    if (feedbackConfigured && story.repository) {
      try {
        const response = await fetch("/api/feedback/reviews", {
          body: JSON.stringify({
            editionId: EDITION.id,
            guidance,
            lensId: lens.id,
            lensInstruction: lens.instruction,
            lensLabel: lens.label,
            repository: story.repository,
            storyId: story.id,
            storyTitle: story.title,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as { error?: string; request?: ReviewRequest };
        if (!response.ok || !payload.request) throw new Error(payload.error ?? "The request could not be queued.");
        setReviewRequests((current) => [
          payload.request as ReviewRequest,
          ...current.map((request) => request.storyId === story.id && request.status === "queued" ? { ...request, status: "superseded" as const } : request),
        ]);
        updateStory(story.id, { reviewRequestedAt: new Date().toISOString(), revising: false });
        setNotice("Re-review queued for the next scheduled review.");
        return;
      } catch {
        setNotice("The account queue is unavailable, so the request was copied instead.");
      }
    }

    try {
      await navigator.clipboard.writeText(fallbackPrompt);
      updateStory(story.id, { reviewRequestedAt: new Date().toISOString(), revising: false });
      setNotice("Re-review request copied for Codex.");
    } catch {
      setNotice("The re-review request is saved locally, but clipboard access is unavailable.");
      updateStory(story.id, { reviewRequestedAt: new Date().toISOString(), revising: false });
    }
  };

  const cancelQueuedReview = async (requestId: string) => {
    try {
      const response = await fetch("/api/feedback/reviews", {
        body: JSON.stringify({ requestId }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      if (!response.ok) throw new Error("The request could not be canceled.");
      const request = reviewRequests.find((candidate) => candidate._id === requestId);
      const clearMarker = shouldClearReviewMarker(reviewRequests, requestId);
      setReviewRequests((current) => current.map((candidate) => candidate._id === requestId ? { ...candidate, status: "canceled" } : candidate));
      if (request && clearMarker) updateStory(request.storyId, { reviewRequestedAt: null, revising: false });
      setNotice("Re-review removed from the queue.");
    } catch {
      setNotice("The review queue could not be updated.");
    }
  };

  const updateRepositoryMode = (repository: string, mode: RepositoryMode) => {
    setRepositoryModes((current) => withRepositoryMode(current, repository, mode));
    setNotice(`${repository} is now ${REPOSITORY_MODE_LABELS[mode].toLowerCase()}.`);
  };

  const restorePublishedScope = () => {
    setRepositoryModes(restorePublishedRepositoryModes({
      modes: repositoryModes,
      publishedRepositories: SCHEDULED_REPOSITORIES,
      repositories,
    }));
    setNotice("Repository modes restored to the published review scope.");
  };

  const updateUnderstanding = (repository: string, area: RepoArea, state: UnderstandingState) => {
    setMapStates((current) => ({ ...current, [`${repository}:${area.id}`]: state }));
    const messages: Record<UnderstandingState, string> = {
      introduced: `${area.name} opened for study.`,
      revisit: `${area.name} marked Study again.`,
      skipped: `${area.name} hidden.`,
      understood: `${area.name} marked Understood.`,
      unexplored: `${area.name} reset.`,
    };
    setNotice(messages[state]);
  };

  const updateQuestion = (repository: string, question: RepoQuestion, state: QuestionDisposition) => {
    setQuestionStates((current) => ({ ...current, [`${repository}:${question.id}`]: state }));
    const messages: Record<QuestionDisposition, string> = {
      irrelevant: "Removed from your open questions.",
      open: "Question kept visible for a future review.",
      resolved: feedbackConfigured ? "Question marked resolved and queued for account sync." : "Question marked resolved on this device.",
    };
    setNotice(messages[state]);
  };

  const openStory = (story: Story, options: { revising?: boolean; notice?: string } = {}) => {
    const plan = planStoryOpening(storyState(story.id), hideUnderstood, options.revising ?? false);
    if (plan.hideUnderstood !== hideUnderstood) setHideUnderstood(plan.hideUnderstood);
    updateStory(story.id, plan.patch);
    setFocusedStoryId(story.id);
    setView("briefing");
    setFocusTarget(focusTargetFor({ kind: "story", targetId: story.id }));
    setNotice(options.notice ?? `Opened ${story.title}`);
  };

  const openRepositoryControls = () => {
    setView("repositories");
    setFocusTarget(focusTargetFor({ kind: "repositories" }));
  };

  const openContinueItem = (item: ContinueItem) => {
    if (item.view === "briefing") {
      const story = STORIES.find((candidate) => candidate.id === item.targetId);
      if (story) {
        openStory(story, { revising: item.kind === "review", notice: `Continuing with ${item.title}` });
        return;
      }
    }

    if (item.kind === "area") {
      const stateKey = `${item.repository}:${item.targetId}`;
      const currentState = mapStates[stateKey] ?? mapStates[item.targetId] ?? "unexplored";
      if (currentState === "unexplored") {
        setMapStates((current) => ({ ...current, [stateKey]: "introduced" }));
      }
      setActiveMapRepository(item.repository);
      setFocusTarget(focusTargetFor({ kind: "area", repository: item.repository, targetId: item.targetId }));
    } else {
      setActiveMapRepository(item.repository);
      setFocusTarget(focusTargetFor({ kind: "question", repository: item.repository, targetId: item.targetId }));
    }

    setView(item.view);
    setNotice(`Continuing with ${item.title}`);
  };

  useEffect(() => {
    if (!focusTarget) return;
    const focusFrame = window.requestAnimationFrame(() => {
      for (const detailsId of focusTarget.detailsIds ?? []) {
        const details = document.getElementById(detailsId) as HTMLDetailsElement | null;
        if (details) details.open = true;
      }
      const target = document.getElementById(focusTarget.elementId) ??
        (focusTarget.detailsIds ?? []).map((id) => document.getElementById(id)).find(Boolean) ?? null;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
      setFocusTarget(null);
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [activeMapRepository, focusTarget, states, view]);

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
    if (demoMode) {
      return;
    }
    await fetch("/api/auth/github/logout", { method: "POST" });
    setHasHydrated(false);
    setDemoMode(true);
    setAuth((current) => current ? { ...current, authenticated: false, user: null } : current);
    setRepositories([]);
    setRepositoriesLoaded(false);
    setRepositoryModes({});
    setRepositoryModesInitialized(false);
    setThreadQuestions([]);
    setTopicThreads([]);
    setActivity({});
  };

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your Baxtori reading state, repository inventory, questions, watches, and review requests? This does not uninstall the GitHub App.")) return;
    const response = await fetch("/api/feedback/account", { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setNotice(payload.error ?? "Your Baxtori data could not be deleted.");
      return;
    }
    if (accountStorageKey) window.localStorage.removeItem(accountStorageKey);
    setHasHydrated(false);
    setDemoMode(true);
    setAuth((current) => current ? { ...current, authenticated: false, user: null } : current);
    setRepositories([]);
    setRepositoriesLoaded(false);
    setRepositoryModes({});
    setRepositoryModesInitialized(false);
    setThreadQuestions([]);
    setTopicThreads([]);
    setActivity({});
    setNotice("Your Baxtori account data was deleted. GitHub installation access is managed on GitHub.");
  };

  useEffect(() => {
    if (view === "briefing") return;
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
  }, [focusedStoryId, states, view, visibleStories]);

  const renderSourceBanner = () => {
    if (demoMode) {
      return (
        <p><strong>Published demo · 3 repositories.</strong> Baxtori&apos;s exact evidence is read-only; your reading state stays on this device.</p>
      );
    }
    if (repositoryLoading) {
      return <p>Checking GitHub…</p>;
    }
    if (repositoryError) {
      return <p>{repositoryError}</p>;
    }
    if (!selectedRepositories.length) {
      return (
        <>
          <p><strong>{repositories.length} available repositories.</strong></p>
          <button onClick={openRepositoryControls} type="button">Choose repositories</button>
        </>
      );
    }
    return (
      <>
        <p>
          <strong>{selectedRepositories.length} {selectedRepositories.length === 1 ? "repository" : "repositories"}</strong>{" · "}
          {activityLoading ? "Checking commits…" : `${recentCommitCount} commits · ${CAPTURE_WINDOW_LABELS[captureWindow].toLowerCase()}`}
        </p>
        <button onClick={openRepositoryControls} type="button">Manage repositories</button>
      </>
    );
  };

  const actualStory = (trailStory: TrailStory) => STORIES.find((story) => story.id === trailStory.id);
  const renderTrailEvidence = (trailStory: TrailStory) => {
    const story = actualStory(trailStory);
    if (!story?.repository || !story.codeEvidence?.length) {
      return <div className="code-state">This published note does not include an exact excerpt.</div>;
    }
    if (demoMode && story.repository !== "teamleaderleo/baxtori") {
      return <div className="code-state">Sign in to inspect this repository&apos;s exact comparison. The published summary remains available in the trail.</div>;
    }
    return (
      <StoryCode
        demoMode={demoMode}
        defaultQuestionLens={REVIEW_POLICY.defaultLens}
        editionId={EDITION.id}
        evidence={story.codeEvidence}
        feedbackConfigured={feedbackConfigured}
        onQuestionSaved={saveThreadQuestion}
        onQuestionUpdated={updateThreadQuestion}
        questionLenses={REVIEW_POLICY.lenses}
        questions={threadQuestions}
        repository={story.repository}
        storyId={story.id}
        storyTitle={story.title}
        topicId={story.topicId}
        topicThread={topicThreadFor(topicThreads, story)}
      />
    );
  };

  if ((["briefing", "map", "history", "repositories", "timeline"] as View[]).includes(view)) {
    const primaryContent = view === "map" ? (
      <RepositoryMaps
        activeRepository={activeMapRepository}
        attentionBudget={continueBudget}
        data={REPOSITORY_MAPS}
        onActiveRepositoryChange={setActiveMapRepository}
        onQuestionChange={updateQuestion}
        onStateChange={updateUnderstanding}
        onAttentionBudgetChange={setContinueBudget}
        questionStates={questionStates}
        sources={systemSources}
        states={mapStates}
      />
    ) : view === "history" ? (
      <EditionHistory
        demoMode={demoMode}
        defaultQuestionLens={REVIEW_POLICY.defaultLens}
        editions={HISTORY_EDITIONS}
        feedbackConfigured={feedbackConfigured}
        onQuestionSaved={saveThreadQuestion}
        onQuestionUpdated={updateThreadQuestion}
        questionLenses={REVIEW_POLICY.lenses}
        questions={threadQuestions}
        topicThreads={topicThreads}
      />
    ) : view === "repositories" ? (
      <SourcesView
        activity={activity}
        activityLoading={activityLoading}
        appSlug={auth.appSlug}
        candidateRepositoryCount={candidateRepositoryCount}
        captureWindow={captureWindow}
        displayedRepositories={displayedRepositories}
        feedbackStatus={feedbackStatus}
        filteredRepositoryCount={filteredRepositories.length}
        inaccessibleScheduledRepositories={inaccessibleScheduledRepositories}
        onCaptureWindowChange={setCaptureWindow}
        onDeleteAccount={deleteAccount}
        onModeChange={updateRepositoryMode}
        onModeFilterChange={setRepositoryModeFilter}
        onRestorePublishedScope={restorePublishedScope}
        onSearchChange={setRepositorySearch}
        onShowAllChange={() => setShowAllRepositories((current) => !current)}
        pendingAddedCount={pendingAddedRepositories.length}
        pendingRemovedCount={pendingRemovedRepositories.length}
        quietRepositoryCount={quietRepositoryCount}
        recentCommitCount={recentCommitCount}
        repositories={repositories}
        repositoryCounts={repositoryCounts}
        repositoryError={repositoryError}
        repositoryLoading={repositoryLoading}
        repositoryModeFilter={repositoryModeFilter}
        repositoryModes={repositoryModes}
        repositorySearch={repositorySearch}
        selectedRepositories={selectedRepositoryData}
        showAllRepositories={showAllRepositories}
        userLogin={auth.user?.login}
      />
    ) : view === "timeline" ? (
      <EditionTimeline edition={EDITION} onOpenStory={openStory} stories={STORIES} />
    ) : undefined;

    return (
      <TrailReader
        accountLabel={auth.authenticated ? `@${auth.user?.login}` : undefined}
        activeView={view as "briefing" | "history" | "map" | "repositories" | "timeline"}
        connectHref={!auth.authenticated && auth.configured ? "/api/auth/github/start" : undefined}
        edition={EDITION}
        notice={notice || authMessage}
        onOpenEditionRecord={() => setView("timeline")}
        onOpenContinueItem={openContinueItem}
        onOpenMemory={() => setView("history")}
        onOpenNow={() => setView("briefing")}
        onOpenRepositories={demoMode ? undefined : openRepositoryControls}
        onSignOut={auth.authenticated ? signOut : undefined}
        onOpenSystem={() => setView("map")}
        onUnderstand={(trailStory) => {
          const story = actualStory(trailStory);
          if (story) markUnderstood(story);
        }}
        onWatch={(trailStory) => {
          const story = actualStory(trailStory);
          if (story) void toggleWatch(story);
        }}
        primaryContent={primaryContent}
        primaryDescription={view === "map"
          ? "Browse reviewed repository areas, source files, and open questions."
          : view === "repositories"
            ? "Choose which repositories Baxtori may read during the next review."
            : view === "timeline"
              ? "See what was published, what was left out, and why."
            : "Search prior editions, watched stories, and open questions."}
        primaryHeading={view === "map" ? "System." : view === "repositories" ? "Sources." : view === "timeline" ? "Edition record." : "Memory."}
        primaryKicker={view === "map"
          ? `${systemSources.length} ${systemSources.length === 1 ? "repository" : "repositories"}`
          : view === "repositories"
            ? `${selectedRepositories.length} selected · ${repositories.length} available`
            : view === "timeline"
              ? `${STORIES.length} ${STORIES.length === 1 ? "story" : "stories"}`
            : `${HISTORY_EDITION_COUNT} ${HISTORY_EDITION_COUNT === 1 ? "edition" : "editions"}`}
        renderEvidence={renderTrailEvidence}
        repositoryCount={selectedRepositories.length}
        session={trailSession}
        sourceLabel={demoMode
          ? "published example"
          : `example edition · ${selectedRepositories.length} ${selectedRepositories.length === 1 ? "source" : "sources"}`}
        storyState={(trailStory) => {
          const story = actualStory(trailStory);
          return story
            ? { understood: storyState(story.id).understood, watching: isStoryWatching(story) }
            : { understood: false, watching: false };
        }}
      />
    );
  }

  return (
    <div className={`app-shell ${focusMode ? "is-focus-mode" : ""}`}>
      <a className="skip-link" href="#content">Skip to the backstory</a>

      <aside className="site-rail" aria-label="Baxtori navigation">
        <div className="brand">
          <BrandMark />
          <div>
            <strong>Baxtori</strong>
            <span>Stay the author</span>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Primary">
          <button aria-current={view === "briefing" ? "page" : undefined} className={view === "briefing" ? "is-active" : ""} onClick={() => setView("briefing")} type="button">
            <span>Now</span><small>{continueBudget}m</small>
          </button>
          <button aria-current={view === "map" ? "page" : undefined} className={view === "map" ? "is-active" : ""} onClick={() => setView("map")} type="button">
            <span>System</span><small>{REPOSITORY_MAPS.length}</small>
          </button>
          <button aria-current={view === "history" ? "page" : undefined} className={view === "history" ? "is-active" : ""} onClick={() => setView("history")} type="button">
            <span>Memory</span><small>{memoryAttentionCount || HISTORY_EDITION_COUNT}</small>
          </button>
        </nav>

        <nav className="secondary-nav" aria-label="Edition and source tools">
          <button aria-current={view === "timeline" ? "page" : undefined} onClick={() => setView("timeline")} type="button"><span>Edition record</span><small>7d</small></button>
          {!demoMode && <button aria-current={view === "repositories" ? "page" : undefined} onClick={openRepositoryControls} type="button"><span>Review sources</span><small>{selectedRepositories.length}</small></button>}
        </nav>

        <div className="account-card">
          {!demoMode && auth.user?.avatarUrl && <span aria-hidden="true" className="account-avatar" style={{ backgroundImage: `url(${auth.user.avatarUrl})` }} />}
          <div>
            <strong>{demoMode ? "Published demo" : auth.user?.name ?? auth.user?.login}</strong>
            <span>{demoMode ? "Real editions · local state" : `@${auth.user?.login}`}</span>
          </div>
          <button onClick={signOut} type="button">{demoMode ? "Exit" : "Sign out"}</button>
        </div>

        <button className="rail-collapse" onClick={() => setFocusMode(true)} type="button">
          <span aria-hidden="true">←</span> Collapse sidebar
        </button>

      </aside>

      {focusMode && (
        <button className="rail-reopen" onClick={() => setFocusMode(false)} type="button">
          <span aria-hidden="true">→</span> Open sidebar
        </button>
      )}

      <main id="content">
        <header className="masthead">
          <div className="masthead-top">
            <span>
              {view === "history"
                ? `Working memory · ${HISTORY_EDITION_COUNT} immutable ${HISTORY_EDITION_COUNT === 1 ? "edition" : "editions"}`
                : view === "map"
                  ? `System model · ${REPOSITORY_MAPS.length} repositories`
                  : view === "repositories"
                    ? "Compiler input · repository scope"
                    : `Current edition · ${formatEditionDate(EDITION.periodStart)}–${formatEditionDate(EDITION.periodEnd)}`}
            </span>
            <div>
              {(view === "briefing" || view === "timeline") && <button onClick={copyBackstory} type="button">Copy edition</button>}
              <button aria-expanded={showHelp} aria-label={showHelp ? "Hide keyboard shortcuts" : "Show keyboard shortcuts"} onClick={() => setShowHelp((current) => !current)} type="button">?</button>
            </div>
          </div>
          <h1>{view === "repositories" ? "Review sources." : view === "map" ? "Know the system." : view === "history" ? "Working memory." : view === "timeline" ? "This edition, in order." : "What deserves attention."}</h1>
          <p className="dek">
            {view === "repositories"
              ? "Choose what the compiler may inspect and what should stay quiet."
              : view === "map"
                ? "Evidence-backed bearings, uncertainty, and what to study next."
                : view === "history"
                  ? "Return to unresolved intent and reopen the exact evidence that shaped earlier understanding."
                  : view === "timeline"
                    ? "The selected changes, quiet repositories, and literal reasons behind this review."
                    : `${continuePlan.plannedMinutes} minutes planned from the attention window you chose.`}
          </p>

          {(view === "briefing" || view === "timeline") && (
            <p className="edition-provenance">
              Generated {formatGeneratedAt(EDITION.generatedAt)} · Mondays · <span className={`sync-status is-${feedbackStatus}`}>{feedbackStatus === "loading" ? "Loading" : feedbackStatus === "saving" ? "Saving" : feedbackStatus === "saved" ? "Saved to account" : "Saved on device"}</span>
            </p>
          )}

          {(view === "briefing" || view === "timeline") && <div className="source-banner">{renderSourceBanner()}</div>}

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

        {hasHydrated && view === "briefing" && (
          <section className={`continue-queue ${nextContinueItem ? "" : "is-complete"}`} aria-labelledby="continue-heading">
            {nextContinueItem ? (
              <>
                <div className="continue-primary">
                  <span className="eyebrow">Worth understanding now · {CONTINUE_KIND_LABELS[nextContinueItem.kind]}</span>
                  <h2 id="continue-heading">{nextContinueItem.title}</h2>
                  <p>{nextContinueItem.reason}</p>
                  <div className="continue-meta">
                    <span>{nextContinueItem.repository}</span>
                    <span>{nextContinueItem.minutes} min</span>
                  </div>
                  <button onClick={() => openContinueItem(nextContinueItem)} type="button">
                    Continue <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="continue-plan">
                  <div className="continue-plan-heading">
                    <div>
                      <span>If you have more time</span>
                      <strong>{continuePlan.plannedMinutes} of {continueBudget} minutes planned</strong>
                    </div>
                    <label className="continue-budget" htmlFor="continue-budget">
                      <span>Your attention window</span>
                      <input
                        id="continue-budget"
                        max="60"
                        min="5"
                        onChange={(event) => setContinueBudget(Number(event.target.value))}
                        step="5"
                        type="range"
                        value={continueBudget}
                      />
                      <output htmlFor="continue-budget">{continueBudget} minutes</output>
                    </label>
                  </div>
                  {continuePlan.items.length > 1 ? (
                    <ol>
                      {continuePlan.items.slice(1).map((item) => (
                        <li key={item.id}>
                          <button onClick={() => openContinueItem(item)} type="button">
                            <span>{CONTINUE_KIND_LABELS[item.kind]} · {item.minutes} min</span>
                            <strong>{item.title}</strong>
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="continue-solo">One useful step fits this window. Finish it, and Baxtori will choose again.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="continue-complete">
                <span aria-hidden="true">✓</span>
                <div>
                  <span className="eyebrow">Continue queue</span>
                  <h2 id="continue-heading">Nothing is asking for your attention.</h2>
                  <p>Your stories, map areas, and questions are understood, resolved, or deliberately skipped.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {view === "briefing" && (
          <section className="briefing-view" aria-labelledby="briefing-heading">
            <div className="section-heading">
              <div>
                <span>Understand · exact evidence on demand</span>
                <h2 id="briefing-heading">Deep reads</h2>
              </div>
              <div className="section-actions">
                <span>{understoodCount} of {STORIES.length} understood</span>
                <button onClick={() => setView("timeline")} type="button">Edition record</button>
                <label>
                  <input checked={hideUnderstood} onChange={(event) => setHideUnderstood(event.target.checked)} type="checkbox" />
                  Hide understood
                </label>
              </div>
            </div>

            {visibleStories.length ? (
              <div className="story-list">
                {visibleStories.map((story, index) => {
                  const state = storyState(story.id);
                  const watching = isStoryWatching(story);
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
                          <span>{demoMode && story.repository !== "teamleaderleo/baxtori" ? "Published summary" : `${story.codeEvidence?.length ?? 0} exact ${story.codeEvidence?.length === 1 ? "excerpt" : "excerpts"}`}</span>
                          <span>{story.timing}</span>
                        </div>
                        <h3>{story.title}</h3>
                        <p className="story-brief">{story.brief}</p>

                        {state.expanded && (
                          <>
                            {story.repository && story.codeEvidence?.length && (!demoMode || story.repository === "teamleaderleo/baxtori") ? (
                              <StoryCode
                                  demoMode={demoMode}
                                  defaultQuestionLens={REVIEW_POLICY.defaultLens}
                                  editionId={EDITION.id}
                                  evidence={story.codeEvidence}
                                  feedbackConfigured={feedbackConfigured}
                                  onQuestionSaved={saveThreadQuestion}
                                  onQuestionUpdated={updateThreadQuestion}
                                  questionLenses={REVIEW_POLICY.lenses}
                                  questions={threadQuestions}
                                  repository={story.repository}
                                  storyId={story.id}
                                  storyTitle={story.title}
                                  topicId={story.topicId}
                                  topicThread={topicThreadFor(topicThreads, story)}
                                />
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
                          <button aria-pressed={watching} onClick={() => void toggleWatch(story)} type="button">
                            {watching ? "Watching" : "Watch"}
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
                              <p>{feedbackConfigured ? "Your guidance joins the next scheduled review." : "Without account sync, this is copied as a ready-to-run Codex prompt."}</p>
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
                              <button className="primary" type="submit">{feedbackConfigured ? "Queue re-review" : "Copy re-review request"}</button>
                              <button onClick={() => updateStory(story.id, { revising: false })} type="button">Cancel</button>
                            </div>
                          </form>
                        )}
                        {state.reviewRequestedAt && <p className="review-requested">Re-review requested · {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(state.reviewRequestedAt))}</p>}
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
                <p>{feedbackConfigured ? "Your reading state is saved to your account." : "Your reading state is saved on this device."}</p>
              </div>
            )}

            {watchedStories.length > 0 && (
              <div className="watch-strip">
                <span>Watching</span>
                {watchedStories.map((story) => <button key={story.id} onClick={() => openStory(story, { notice: `Opened watched thread ${story.title}` })} type="button">{story.project}</button>)}
              </div>
            )}

            {queuedReviewRequests.length > 0 && (
              <section aria-labelledby="review-queue-heading" className="review-queue">
                <div>
                  <span>Next scheduled review</span>
                  <h3 id="review-queue-heading">{queuedReviewRequests.length} queued {queuedReviewRequests.length === 1 ? "request" : "requests"}</h3>
                </div>
                <ul>
                  {queuedReviewRequests.map((request) => (
                    <li key={request._id}>
                      <div><strong>{request.storyTitle}</strong><span>{request.repository} · {request.lensLabel}</span></div>
                      <button onClick={() => void cancelQueuedReview(request._id)} type="button">Cancel</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="memory-summary" aria-labelledby="memory-summary-heading">
              <div className="memory-summary-heading">
                <div>
                  <span>Remember · continuity across editions</span>
                  <h3 id="memory-summary-heading">Your working memory</h3>
                  <p>Personal intent can change. Published evidence cannot.</p>
                </div>
                <div>
                  <button onClick={() => setView("history")} type="button">Open memory</button>
                  <button onClick={() => setView("map")} type="button">Open system model</button>
                </div>
              </div>
              <dl>
                <div><dt>Watching</dt><dd>{watchedStories.length}</dd></div>
                <div><dt>Open questions</dt><dd>{openThreadQuestionCount}</dd></div>
                <div><dt>Queued reviews</dt><dd>{queuedReviewRequests.length}</dd></div>
                <div><dt>Immutable editions</dt><dd>{HISTORY_EDITION_COUNT}</dd></div>
              </dl>
            </section>

          </section>
        )}

        {view === "map" && (
          <RepositoryMaps
            activeRepository={activeMapRepository}
            attentionBudget={continueBudget}
            data={REPOSITORY_MAPS}
            onActiveRepositoryChange={setActiveMapRepository}
            onQuestionChange={updateQuestion}
            onStateChange={updateUnderstanding}
            onAttentionBudgetChange={setContinueBudget}
            questionStates={questionStates}
            sources={REVIEW_SCOPE.repositories}
            states={mapStates}
          />
        )}

        {view === "timeline" && (
          <section className="timeline-view" aria-labelledby="timeline-heading">
            <div className="section-heading">
              <div><span>Changes</span><h2 id="timeline-heading">This week, in order</h2></div>
            </div>
            <ol>
              {STORIES.map((story) => (
                <li key={story.id}>
                  <time>{story.timing}</time>
                  <div>
                    <span>{story.project}</span>
                    <h3>{story.title}</h3>
                    <button onClick={() => openStory(story)} type="button">Open backstory</button>
                  </div>
                </li>
              ))}
              <li className="routine-rollup">
                <time>All week</time>
                <div><span>Other repositories</span><h3>{EDITION.quietRepositories.length ? `${EDITION.quietRepositories.length} ${EDITION.quietRepositories.length === 1 ? "repository had" : "repositories had"} no selected changes.` : "No other repositories added an item."}</h3></div>
              </li>
            </ol>
            <EditionSelectionLedger edition={EDITION} />
          </section>
        )}

        {view === "history" && (
          <EditionHistory
            demoMode={demoMode}
            defaultQuestionLens={REVIEW_POLICY.defaultLens}
            editions={HISTORY_EDITIONS}
            feedbackConfigured={feedbackConfigured}
            onQuestionSaved={saveThreadQuestion}
            onQuestionUpdated={updateThreadQuestion}
            questionLenses={REVIEW_POLICY.lenses}
            questions={threadQuestions}
            topicThreads={topicThreads}
          />
        )}

        {view === "repositories" && (
          <section className="repositories-view" aria-labelledby="repositories-heading" id="repository-controls" tabIndex={-1}>
            <div className="connection-summary">
              <div>
                <span className={`status-dot ${repositoryError ? "is-error" : ""}`} aria-hidden="true" />
                <div>
                  <strong>Connected as @{auth.user?.login}</strong>
                  <p>Private repositories appear only when the GitHub App can read them.</p>
                </div>
              </div>
              <div className="connection-actions">
                <div className={repositoryModeStyles.summary}>
                  <span>{repositoryCounts.pinned} pinned</span>
                  <span>{repositoryCounts.automatic} automatic</span>
                  <span>{repositoryCounts.muted} muted</span>
                </div>
                {auth.appSlug && <><a href={`https://github.com/apps/${auth.appSlug}/installations/new`} rel="noreferrer" target="_blank">Add repositories ↗</a><a href="https://github.com/settings/installations" rel="noreferrer" target="_blank">Manage installation ↗</a></>}
                <a href="/api/feedback/account">Download my data</a>
                <a href="/privacy">Privacy</a>
                <button onClick={deleteAccount} type="button">Delete Baxtori data</button>
              </div>
            </div>

            <section className="review-preview" aria-labelledby="review-preview-heading">
              <div className="review-preview-heading">
                <div>
                  <span className="eyebrow">Next scheduled review · {REVIEW_SCOPE.schedule}</span>
                  <h2 id="review-preview-heading">Monday’s scope</h2>
                  <p>Pinned repositories are checked first. Automatic repositories join when their activity provides a useful reason. Muted repositories stay outside scheduled checks.</p>
                  <label className="capture-window" htmlFor="capture-window">
                    <span>Capture window</span>
                    <select id="capture-window" onChange={(event) => setCaptureWindow(event.target.value as CaptureWindow)} value={captureWindow}>
                      {CAPTURE_WINDOWS.map((window) => <option key={window} value={window}>{CAPTURE_WINDOW_LABELS[window]}</option>)}
                    </select>
                    <small>Controls candidate commits for the next edition—not the published archive.</small>
                  </label>
                </div>
                <div className="review-preview-metrics" aria-label="Scheduled review preview">
                  <div><strong>{recentCommitCount}{Object.values(activity).some((item) => item.truncated) ? "+" : ""}</strong><span>candidate commits</span></div>
                  <div><strong>{candidateRepositoryCount}</strong><span>active repositories</span></div>
                  <div><strong>{quietRepositoryCount}</strong><span>with no new commits</span></div>
                </div>
              </div>

              {(pendingAddedRepositories.length > 0 || pendingRemovedRepositories.length > 0) && (
                <div className="scope-drift" role="status">
                  <div>
                    <strong>Your next review scope has changed.</strong>
                    <span>{pendingAddedRepositories.length} added · {pendingRemovedRepositories.length} removed</span>
                  </div>
                  <button onClick={restorePublishedScope} type="button">Restore published scope</button>
                </div>
              )}

              <div className="scope-list">
                {selectedRepositoryData.map((repository) => {
                  const repositoryActivity = activity[repository.fullName];
                  const scheduled = scheduledRepositorySet.has(repository.fullName);
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
                        <p>
                          {activityLoading && !repositoryActivity
                            ? "Checking GitHub activity…"
                            : repositoryActivity?.error
                              ? repositoryActivity.error
                              : commitCount
                                ? `${commitCount}${repositoryActivity?.truncated ? "+" : ""} commits await review.`
                                : captureWindowEmptyLabel(captureWindow, REVIEW_SCOPE.lastReviewedAt)}
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
                       <div className={repositoryModeStyles.scopeActions}>
                         <a href={repository.url} rel="noreferrer" target="_blank">GitHub ↗</a>
                         <RepositoryModeControl mode={mode} onChange={(nextMode) => updateRepositoryMode(repository.fullName, nextMode)} repository={repository.fullName} />
                       </div>
</article>
                  );
                })}
                {inaccessibleScheduledRepositories.map((repository) => (
                  <article className="scope-row is-inaccessible" key={repository}>
                    <div className="scope-row-main"><div className="scope-row-title"><strong>{repository}</strong><span>Needs GitHub access</span></div><p>Included in the published scope, but not visible to the current GitHub App installation.</p></div>
                    {auth.appSlug && <a href="https://github.com/settings/installations" rel="noreferrer" target="_blank">Manage installation ↗</a>}
                  </article>
                ))}
                {repositoryLoading && <div className="scope-empty"><strong>Checking the scheduled scope…</strong><span>Reading repository access and post-review activity from GitHub.</span></div>}
                {!repositoryLoading && !selectedRepositoryData.length && !inaccessibleScheduledRepositories.length && (
                  <div className="scope-empty"><strong>No repositories selected.</strong><span>Add a source below or restore the published scope.</span></div>
                )}
              </div>
              <p className="scope-boundary">
                <span className={`sync-status is-${feedbackStatus}`}>
                  {feedbackStatus === "loading" ? "Loading state" : feedbackStatus === "saving" ? "Saving modes" : feedbackStatus === "saved" ? "Modes saved to account" : "Modes saved on this device"}
                </span>
                {" · "}Changes apply to the next scheduled review. A repository still needs configured source access before Baxtori can publish code claims or a trustworthy system map.
              </p>
            </section>

            <div className="repo-toolbar">
              <div>
                <span>Sources</span>
                <h2 id="repositories-heading">Your repositories</h2>
              </div>
              <div className={repositoryModeStyles.toolbarControls}>
                <input
                  aria-label="Search repositories"
                  onChange={(event) => setRepositorySearch(event.target.value)}
                  placeholder="Search repositories"
                  type="search"
                  value={repositorySearch}
                />
                <div className={repositoryModeStyles.filters} aria-label="Filter repositories by review mode">
                  {(["all", "pinned", "automatic", "muted"] as const).map((filter) => (
                    <button aria-pressed={repositoryModeFilter === filter} key={filter} onClick={() => setRepositoryModeFilter(filter)} type="button">
                      {filter === "all" ? `All ${repositories.length}` : `${REPOSITORY_MODE_LABELS[filter]} ${repositoryCounts[filter]}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {repositoryLoading ? (
              <div className="repo-loading">Loading live GitHub repositories…</div>
            ) : repositoryError ? (
              <div className="repo-loading is-error">{repositoryError}</div>
            ) : repositories.length ? (
              <div className="repo-list">
                 {displayedRepositories.map((repository) => {
                   const mode = repositoryModeFor(repositoryModes, repository.fullName, repository.archived ? "muted" : "automatic");
                   const rowClass = mode === "pinned" ? repositoryModeStyles.pinnedRow : mode === "muted" ? repositoryModeStyles.mutedRow : "";
                   return (
                     <article className={`repo-row ${rowClass}`} key={repository.id}>
                      <div className="repo-main">
                        <div>
                          <strong>{repository.fullName}</strong>
                          {repository.private && <span>Private</span>}
                          {repository.fork && <span>Fork</span>}
                        </div>
                        <p className="repo-meta">
                          <span>{repository.language ?? "Unspecified language"}</span>
                          <span>Pushed {formatRelativeDate(repository.pushedAt)}</span>
                          <span>{repository.defaultBranch} branch</span>
                        </p>
                      </div>
                       <div className="repo-mode">
                         <RepositoryModeControl mode={mode} onChange={(nextMode) => updateRepositoryMode(repository.fullName, nextMode)} repository={repository.fullName} />
                         <span className={repositoryModeStyles.modeNote}>{REPOSITORY_MODE_DESCRIPTIONS[mode]}</span>
                       </div>
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
