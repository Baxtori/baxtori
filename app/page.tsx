"use client";

import { useEffect, useMemo, useState } from "react";

type Tone = "blue" | "green" | "rust";
type View = "briefing" | "timeline";

type Story = {
  id: string;
  number: string;
  project: string;
  tone: Tone;
  signal: string;
  health: string;
  confidence: string;
  title: string;
  summary: string;
  attention: string;
  attentionNote: string;
  rating: number;
  timing: string;
  evidence: string;
  intent: string;
  verify: string;
  tradeoff: string;
  files: string[];
};

type Edition = {
  id: string;
  number: string;
  dates: string;
  prepared: string;
  preparedIso: string;
  headline: string;
  dek: string;
  storyIds: string[];
  meaningfulCommits: number;
  readTime: number;
};

type StoryState = {
  expanded: boolean;
  understood: boolean;
  watching: boolean;
  muted: boolean;
};

type SavedPreferences = {
  editionId: string;
  hideUnderstood: boolean;
  selectedProject: string;
  states: Record<string, StoryState>;
  view: View;
};

const STORAGE_KEY = "glimpse:rundown:v2";

const EMPTY_STORY_STATE: StoryState = {
  expanded: false,
  understood: false,
  watching: false,
  muted: false,
};

const PROJECTS: Array<{ name: string; tone: Tone }> = [
  { name: "Checkout", tone: "blue" },
  { name: "Studio", tone: "green" },
  { name: "Canvas", tone: "rust" },
];

const EDITIONS: Edition[] = [
  {
    id: "28",
    number: "28",
    dates: "Jul 6–12, 2026",
    prepared: "Jul 13",
    preparedIso: "2026-07-13",
    headline: "Three changes worth knowing before Monday.",
    dek: "Not a changelog. A short editorial read on what moved, why it matters, and what deserves a second look in your own code.",
    storyIds: ["checkout", "studio", "canvas"],
    meaningfulCommits: 11,
    readTime: 7,
  },
  {
    id: "27",
    number: "27",
    dates: "Jun 29–Jul 5, 2026",
    prepared: "Jul 6",
    preparedIso: "2026-07-06",
    headline: "Nothing worth interrupting you for.",
    dek: "Seven small commits landed. None introduced a new behavior, system boundary, or open tradeoff, so this edition stayed deliberately quiet.",
    storyIds: [],
    meaningfulCommits: 7,
    readTime: 0,
  },
];

const STORIES: Story[] = [
  {
    id: "checkout",
    number: "01",
    project: "Checkout",
    tone: "blue",
    signal: "High signal",
    health: "Sound direction",
    confidence: "High confidence",
    title: "Payment retries now explain themselves.",
    summary:
      "Retry handling now records why an attempt stopped beside the attempt itself. Processor failures, customer-action requirements, and exhausted retries take distinct paths, so support can trace the decision without rebuilding it from logs.",
    attention: "Study this",
    attentionNote: "A named boundary between retry policy and queue plumbing.",
    rating: 5,
    timing: "Tue, 11:40",
    evidence: "4 commits · 9 files · 18 tests added",
    intent:
      "Make retry decisions inspectable by support and product without coupling them to processor-specific failure codes.",
    verify:
      "Trace one already-queued job through the fallback path and confirm the recorded reason remains stable across another attempt.",
    tradeoff:
      "Explicit states add a small migration and a narrow fallback for jobs already waiting in the queue.",
    files: [
      "src/retries/classify.ts",
      "src/retries/record-decision.ts",
      "tests/retries/attempts.test.ts",
    ],
  },
  {
    id: "studio",
    number: "02",
    project: "Studio",
    tone: "green",
    signal: "Worth tracking",
    health: "Good with one edge",
    confidence: "Medium confidence",
    title: "Workspace permissions have a clearer edge.",
    summary:
      "Membership is resolved once at the route boundary and passed into mutations, rather than rediscovered in each one. The authorization path is easier to trace; inherited-role behavior is now concentrated in one rule set.",
    attention: "Keep an eye on it",
    attentionNote: "The shared guard is easier to audit; one edge merits a behavior matrix.",
    rating: 4,
    timing: "Wed, 15:20",
    evidence: "3 commits · 7 files · 12 permission cases",
    intent:
      "Move authorization to a single visible boundary so mutations receive an already-resolved membership context.",
    verify:
      "Compare direct membership, inherited admin access, and revoked membership across both read and write routes.",
    tradeoff:
      "A mistake in the shared guard now reaches more routes, so the inherited-role exception deserves deliberate coverage.",
    files: [
      "app/api/workspaces/[slug]/guard.ts",
      "lib/permissions/resolve-role.ts",
      "tests/permissions/inherited-role.test.ts",
    ],
  },
  {
    id: "canvas",
    number: "03",
    project: "Canvas",
    tone: "rust",
    signal: "Useful cleanup",
    health: "Deliberate debt",
    confidence: "High confidence",
    title: "The animation layer lost some old assumptions.",
    summary:
      "Three nearly matching timing helpers now route through one primitive. Current visual checks hold steady; a compatibility switch stays in place until the next release window.",
    attention: "Good to keep for now",
    attentionNote: "A simpler surface, with a deliberate follow-up still open.",
    rating: 3,
    timing: "Thu, 09:05",
    evidence: "4 commits · 6 files · 3 helpers retired",
    intent:
      "Unify animation timing without forcing an observable visual change during the current release window.",
    verify:
      "Remove the compatibility flag in a test branch and compare exit timing for interrupted drag and resize transitions.",
    tradeoff:
      "The temporary switch leaves two paths to reason about until the next cleanup pass, but avoids a release-time visual change.",
    files: [
      "lib/motion/timing.ts",
      "components/canvas/use-transition.ts",
      "components/canvas/motion-compat.ts",
    ],
  },
];

export default function Home() {
  const [editionId, setEditionId] = useState(EDITIONS[0].id);
  const [editionMenuOpen, setEditionMenuOpen] = useState(false);
  const [view, setView] = useState<View>("briefing");
  const [selectedProject, setSelectedProject] = useState("All projects");
  const [states, setStates] = useState<Record<string, StoryState>>({});
  const [showMuted, setShowMuted] = useState(false);
  const [hideUnderstood, setHideUnderstood] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusedStoryId, setFocusedStoryId] = useState<string | null>(null);
  const [pendingMute, setPendingMute] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);

  const edition = EDITIONS.find((item) => item.id === editionId) ?? EDITIONS[0];
  const editionStories = STORIES.filter((story) => edition.storyIds.includes(story.id));
  const storyState = (id: string) => states[id] ?? EMPTY_STORY_STATE;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SavedPreferences>;
        if (parsed.states) setStates(parsed.states);
        if (parsed.view === "briefing" || parsed.view === "timeline") setView(parsed.view);
        if (typeof parsed.hideUnderstood === "boolean") setHideUnderstood(parsed.hideUnderstood);
        if (parsed.editionId && EDITIONS.some((item) => item.id === parsed.editionId)) {
          setEditionId(parsed.editionId);
        }
        if (
          parsed.selectedProject === "All projects" ||
          PROJECTS.some((project) => project.name === parsed.selectedProject)
        ) {
          setSelectedProject(parsed.selectedProject ?? "All projects");
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    const preferences: SavedPreferences = {
      editionId,
      hideUnderstood,
      selectedProject,
      states,
      view,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [editionId, hasHydrated, hideUnderstood, selectedProject, states, view]);

  const updateStory = (id: string, patch: Partial<StoryState>) => {
    setStates((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_STORY_STATE), ...patch },
    }));
  };

  const mutedCount = editionStories.filter((story) => storyState(story.id).muted).length;
  const understoodCount = editionStories.filter((story) => storyState(story.id).understood).length;
  const watchedStories = STORIES.filter((story) => storyState(story.id).watching);

  const relevantStories = useMemo(
    () =>
      editionStories.filter((story) => {
        const belongsToSelection =
          selectedProject === "All projects" || story.project === selectedProject;
        return belongsToSelection && (showMuted || !storyState(story.id).muted);
      }),
    [editionId, selectedProject, showMuted, states],
  );

  const visibleStories = useMemo(
    () => relevantStories.filter((story) => !hideUnderstood || !storyState(story.id).understood),
    [hideUnderstood, relevantStories, states],
  );

  const readingProgress = editionStories.length
    ? Math.round((understoodCount / editionStories.length) * 100)
    : 100;

  const markUnderstood = (story: Story) => {
    const wasUnderstood = storyState(story.id).understood;
    updateStory(story.id, { understood: !wasUnderstood });
    setNotice(
      wasUnderstood
        ? `${story.project} is back in your reading queue.`
        : `Filed away. ${story.project} will only return if this area changes materially.`,
    );
  };

  const toggleWatch = (story: Story) => {
    const wasWatching = storyState(story.id).watching;
    updateStory(story.id, { watching: !wasWatching });
    setNotice(
      wasWatching
        ? `${story.project} is no longer on your watch list.`
        : `Watching ${story.project}. Follow-up changes will get more context next time.`,
    );
  };

  const confirmMute = (story: Story) => {
    updateStory(story.id, { muted: true });
    setPendingMute(null);
    setNotice(`${story.project} is quiet now. Its future stories are hidden until you bring it back.`);
  };

  const selectEdition = (nextEdition: Edition) => {
    setEditionId(nextEdition.id);
    setSelectedProject("All projects");
    setEditionMenuOpen(false);
    setFocusedStoryId(null);
    setNotice(
      nextEdition.storyIds.length
        ? `Opened rundown ${nextEdition.number}.`
        : `Rundown ${nextEdition.number} was quiet. No reading required.`,
    );
  };

  const moveFocus = (direction: 1 | -1) => {
    if (!visibleStories.length) {
      setNotice("Nothing is waiting in this view.");
      return;
    }
    const unreadStories = visibleStories.filter((story) => !storyState(story.id).understood);
    const navigableStories = unreadStories.length ? unreadStories : visibleStories;
    const currentIndex = navigableStories.findIndex((story) => story.id === focusedStoryId);
    const nextIndex = currentIndex < 0
      ? direction === 1 ? 0 : navigableStories.length - 1
      : (currentIndex + direction + navigableStories.length) % navigableStories.length;
    const nextStory = navigableStories[nextIndex];
    setFocusedStoryId(nextStory.id);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`story-${nextStory.id}`);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  const copyRundown = async () => {
    const storyText = editionStories.length
      ? editionStories
          .map(
            (story) =>
              `${story.project} — ${story.title}\n${story.summary}\nLearning value: ${story.rating}/5 · ${story.health}\nTradeoff: ${story.tradeoff}`,
          )
          .join("\n\n")
      : "Nothing crossed the threshold for a story this week.";
    const plainText = `Glimpse · Rundown ${edition.number} · ${edition.dates}\n\n${edition.headline}\n\n${storyText}`;
    try {
      await navigator.clipboard.writeText(plainText);
      setNotice("Copied a plain-text rundown to your clipboard.");
    } catch {
      setNotice("Clipboard access was unavailable in this browser.");
    }
  };

  const resetPreferences = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setStates({});
    setEditionId(EDITIONS[0].id);
    setSelectedProject("All projects");
    setView("briefing");
    setHideUnderstood(false);
    setShowMuted(false);
    setFocusMode(false);
    setFocusedStoryId(null);
    setNotice("Local reading state reset.");
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "Escape") {
        setEditionMenuOpen(false);
        setShowShortcuts(false);
        setPendingMute(null);
        return;
      }
      if (
        target?.isContentEditable ||
        target?.matches("input, textarea, select, button, a") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const focusedStory =
        visibleStories.find((story) => story.id === focusedStoryId) ?? visibleStories[0];

      if (key === "j" || key === "k") {
        event.preventDefault();
        moveFocus(key === "j" ? 1 : -1);
      } else if (key === "e" && focusedStory) {
        event.preventDefault();
        const state = storyState(focusedStory.id);
        updateStory(focusedStory.id, { expanded: !state.expanded });
      } else if (key === "u" && focusedStory) {
        event.preventDefault();
        markUnderstood(focusedStory);
      } else if (key === "w" && focusedStory) {
        event.preventDefault();
        toggleWatch(focusedStory);
      } else if (key === "f") {
        event.preventDefault();
        setFocusMode((current) => !current);
      } else if (event.key === "?") {
        event.preventDefault();
        setShowShortcuts((current) => !current);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [focusedStoryId, states, visibleStories]);

  const projectCount = new Set(editionStories.map((story) => story.project)).size;
  const quietBecauseComplete =
    editionStories.length > 0 && relevantStories.length > 0 && visibleStories.length === 0;

  return (
    <div className={`app-shell ${focusMode ? "is-focus-mode" : ""}`}>
      <a className="skip-link" href="#briefing">
        Skip to this week&apos;s briefing
      </a>

      <aside className="project-rail" aria-label="Rundown navigation">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <span>Glimpse</span>
        </div>
        <p className="brand-caption">Your personal code rundown</p>

        <div className="edition-stack">
          <button
            aria-expanded={editionMenuOpen}
            className="edition-selector"
            onClick={() => setEditionMenuOpen((current) => !current)}
            type="button"
          >
            <span className="eyebrow">Rundown {edition.number}</span>
            <span className="edition-date">
              {edition.dates} <span aria-hidden="true">⌄</span>
            </span>
          </button>
          {editionMenuOpen && (
            <div className="edition-menu" aria-label="Choose a rundown">
              {EDITIONS.map((item) => (
                <button
                  className={item.id === edition.id ? "edition-option is-current" : "edition-option"}
                  key={item.id}
                  onClick={() => selectEdition(item)}
                  type="button"
                >
                  <span>Rundown {item.number}</span>
                  <strong>{item.dates}</strong>
                  <small>{item.storyIds.length ? `${item.storyIds.length} stories` : "Quiet week"}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="project-nav" aria-label="Projects in this issue">
          <p className="side-heading">Projects in view</p>
          <ul>
            <li>
              <button
                className={selectedProject === "All projects" ? "project-filter is-selected" : "project-filter"}
                onClick={() => setSelectedProject("All projects")}
                type="button"
              >
                <span className="project-dot all" aria-hidden="true" />
                <span>All projects</span>
                <span className="project-count">{editionStories.length - mutedCount}</span>
              </button>
            </li>
            {PROJECTS.map((project) => {
              const projectStory = editionStories.find((story) => story.project === project.name);
              const isMuted = projectStory ? storyState(projectStory.id).muted : false;
              return (
                <li key={project.name}>
                  <button
                    className={selectedProject === project.name ? "project-filter is-selected" : "project-filter"}
                    onClick={() => setSelectedProject(project.name)}
                    type="button"
                  >
                    <span className={`project-dot ${project.tone}`} aria-hidden="true" />
                    <span>{project.name}</span>
                    <span className="project-count">{isMuted ? "quiet" : projectStory ? "1" : "—"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="rail-note">
          A small reading habit for the code that changed while you were busy making it.
        </p>
        <p className="local-state-note">Reading state stays on this device.</p>
      </aside>

      <main className="briefing-column" id="briefing">
        <header className="masthead">
          <div className="topline">
            <span className="eyebrow issue-label">Weekly code rundown</span>
            <time className="prepared" dateTime={edition.preparedIso}>
              A quiet brief, prepared {edition.prepared}
            </time>
          </div>
          <h1>{edition.headline}</h1>
          <p className="dek">{edition.dek}</p>
          <div className="summary-line" aria-label="Briefing summary">
            <span className="summary-rule" />
            <span>
              {edition.storyIds.length ? (
                <><strong>{projectCount} projects</strong> · {edition.meaningfulCommits} meaningful commits · {edition.readTime} min read</>
              ) : (
                <><strong>0 stories</strong> · {edition.meaningfulCommits} routine commits · no reading required</>
              )}
            </span>
            <span className="summary-rule" />
          </div>

          <div className="utility-bar">
            <div className="view-controls" aria-label="Choose rundown view">
              <button
                aria-pressed={view === "briefing"}
                className={view === "briefing" ? "view-button is-active" : "view-button"}
                onClick={() => setView("briefing")}
                type="button"
              >
                Briefing
              </button>
              <button
                aria-pressed={view === "timeline"}
                className={view === "timeline" ? "view-button is-active" : "view-button"}
                onClick={() => setView("timeline")}
                type="button"
              >
                Timeline
              </button>
            </div>
            <div className="utility-actions">
              {editionStories.length > 0 && (
                <button className="utility-button" onClick={() => moveFocus(1)} type="button">
                  Next unread <kbd>J</kbd>
                </button>
              )}
              <button
                aria-pressed={focusMode}
                className={focusMode ? "utility-button is-active" : "utility-button"}
                onClick={() => setFocusMode((current) => !current)}
                type="button"
              >
                {focusMode ? "Exit focus" : "Focus"} <kbd>F</kbd>
              </button>
              <button className="utility-button" onClick={copyRundown} type="button">Copy rundown</button>
              <button
                aria-expanded={showShortcuts}
                className="utility-button shortcut-trigger"
                onClick={() => setShowShortcuts((current) => !current)}
                type="button"
              >
                Shortcuts <kbd>?</kbd>
              </button>
            </div>
          </div>
          {showShortcuts && (
            <div className="shortcuts-panel">
              <span><kbd>J</kbd> next story</span>
              <span><kbd>K</kbd> previous</span>
              <span><kbd>E</kbd> evidence</span>
              <span><kbd>U</kbd> understood</span>
              <span><kbd>W</kbd> watch</span>
              <span><kbd>F</kbd> focus</span>
              <button className="text-button" onClick={resetPreferences} type="button">Reset local state</button>
            </div>
          )}
        </header>

        <section className="briefing-content" aria-labelledby="briefing-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{view === "briefing" ? "Your reading queue" : "The raw thread"}</p>
              <h2 id="briefing-title">
                {view === "briefing"
                  ? editionStories.length ? `The week, in ${editionStories.length} changes` : "A genuinely quiet week"
                  : "What happened, in order"}
              </h2>
            </div>
            <div className="section-tools">
              {editionStories.length > 0 && (
                <label className="filter-toggle">
                  <input
                    checked={hideUnderstood}
                    onChange={(event) => setHideUnderstood(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Hide understood</span>
                </label>
              )}
              {mutedCount > 0 && (
                <button
                  className="text-button"
                  onClick={() => setShowMuted((current) => !current)}
                  type="button"
                >
                  {showMuted ? "Hide" : "Show"} muted ({mutedCount})
                </button>
              )}
            </div>
          </div>

          {editionStories.length > 0 && (
            <div className="reading-progress" aria-label={`${understoodCount} of ${editionStories.length} stories understood`}>
              <div>
                <span>{understoodCount} of {editionStories.length} understood</span>
                <span>{editionStories.length - understoodCount} left · state saved locally</span>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${readingProgress}%` }} />
              </div>
            </div>
          )}

          <p className="action-notice" aria-live="polite" role="status">{notice}</p>

          {visibleStories.length === 0 ? (
            <section className="quiet-empty" aria-label={quietBecauseComplete ? "Reading complete" : "Quiet week"}>
              <span className="quiet-mark" aria-hidden="true">—</span>
              <div>
                <p className="eyebrow">{quietBecauseComplete ? "You are caught up" : "Nothing worth a story"}</p>
                <h3>{quietBecauseComplete ? "Everything in this view is understood." : "This week is quiet."}</h3>
                <p>
                  {quietBecauseComplete
                    ? "Your reading state is saved on this device. Turn off “Hide understood” whenever you want to revisit the evidence."
                    : "Small changes landed, but none introduced a new behavior, boundary, or open tradeoff. Glimpse will not pad the page just to fill it."}
                </p>
              </div>
            </section>
          ) : view === "briefing" ? (
            <div className="story-grid">
              {visibleStories.map((story, index) => {
                const state = storyState(story.id);
                const isPendingMute = pendingMute === story.id;
                return (
                  <article
                    className={`story-card ${story.tone} ${index === 0 ? "is-featured" : ""} ${state.understood ? "is-understood" : ""} ${state.muted ? "is-muted" : ""} ${focusedStoryId === story.id ? "is-focused" : ""}`}
                    id={`story-${story.id}`}
                    key={story.id}
                    onFocusCapture={() => setFocusedStoryId(story.id)}
                    tabIndex={-1}
                  >
                    <div className="story-topline">
                      <span className="story-number">{story.number} / {story.project}</span>
                      <div className="signal-group">
                        <span className="health-label">{story.health}</span>
                        <span className="signal-label">{state.understood ? "Filed away" : state.watching ? "Watching" : story.signal}</span>
                      </div>
                    </div>
                    <h3>{story.title}</h3>
                    <p className="story-summary">{story.summary}</p>

                    <div className="story-meta">
                      <div className="assessment">
                        <span className="rating">Learning value {story.rating}/5</span>
                        <strong>{state.understood ? "Understood" : story.attention}</strong>
                        <span className="assessment-note">— {story.attentionNote}</span>
                      </div>
                      <button
                        aria-expanded={state.expanded}
                        className="evidence-button"
                        onClick={() => updateStory(story.id, { expanded: !state.expanded })}
                        type="button"
                      >
                        {state.expanded ? "Close evidence" : "See evidence"} <kbd>E</kbd>
                      </button>
                    </div>

                    {state.expanded && (
                      <div className="evidence-panel">
                        <div className="evidence-heading">
                          <p className="evidence-count">{story.evidence}</p>
                          <span>{story.confidence}</span>
                        </div>
                        <div className="evidence-grid">
                          <div>
                            <span className="evidence-label">Likely intent</span>
                            <p>{story.intent}</p>
                          </div>
                          <div>
                            <span className="evidence-label">What to verify</span>
                            <p>{story.verify}</p>
                          </div>
                          <div>
                            <span className="evidence-label">Why keeping it may be reasonable</span>
                            <p>{story.tradeoff}</p>
                          </div>
                        </div>
                        <div className="start-here">
                          <span className="evidence-label">Start here</span>
                          <div className="file-list" aria-label={`Files changed in ${story.project}`}>
                            {story.files.map((file) => <code key={file}>{file}</code>)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="story-actions" aria-label={`Actions for ${story.project}: ${story.title}`}>
                      <button
                        aria-pressed={state.understood}
                        className={state.understood ? "action-button primary is-active" : "action-button primary"}
                        onClick={() => markUnderstood(story)}
                        type="button"
                      >
                        {state.understood ? "Understood ✓" : "Mark understood"} <kbd>U</kbd>
                      </button>
                      <button
                        aria-pressed={state.watching}
                        className={state.watching ? "action-button watch is-active" : "action-button watch"}
                        onClick={() => toggleWatch(story)}
                        type="button"
                      >
                        {state.watching ? "Watching" : "Watch"} <kbd>W</kbd>
                      </button>
                      {state.muted ? (
                        <button
                          className="action-button mute is-active"
                          onClick={() => {
                            updateStory(story.id, { muted: false });
                            setNotice(`${story.project} is back in view.`);
                          }}
                          type="button"
                        >
                          Bring back
                        </button>
                      ) : (
                        <button className="action-button mute" onClick={() => setPendingMute(story.id)} type="button">
                          Mute project
                        </button>
                      )}
                    </div>

                    {isPendingMute && (
                      <div className="mute-dialog" role="dialog" aria-label={`Quiet ${story.project}?`}>
                        <p>
                          <strong>Quiet {story.project}?</strong> Hide future stories from this project until you bring it back. This never changes the code or its history.
                        </p>
                        <div>
                          <button className="action-button primary" onClick={() => confirmMute(story)} type="button">
                            Mute future stories
                          </button>
                          <button className="action-button" onClick={() => setPendingMute(null)} type="button">
                            Keep in view
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <ol className="timeline-list">
              {visibleStories.map((story) => {
                const state = storyState(story.id);
                return (
                  <li className={`timeline-entry ${story.tone}`} key={story.id}>
                    <time dateTime="2026-07-08">{story.timing}</time>
                    <div>
                      <p className="story-number">{story.project} · {story.signal} · {story.health}</p>
                      <h3>{story.title}</h3>
                      <p>{story.summary}</p>
                      <button
                        className="text-button"
                        onClick={() => {
                          updateStory(story.id, { expanded: true });
                          setSelectedProject(story.project);
                          setFocusedStoryId(story.id);
                          setView("briefing");
                        }}
                        type="button"
                      >
                        {state.understood ? "Revisit evidence" : "Open the story"}
                      </button>
                    </div>
                  </li>
                );
              })}
              <li className="timeline-rollup">
                <span>Routine work</span>
                <p>{edition.meaningfulCommits - edition.storyIds.length} small commits stayed out of the briefing because none introduced a new decision or tradeoff.</p>
              </li>
            </ol>
          )}
        </section>
      </main>

      <aside className="notes-rail" aria-label="Rundown notes">
        <section className="issue-note">
          <p className="side-heading">Reading progress</p>
          <div className="signal-count">
            <span>{editionStories.length ? `${understoodCount}/${editionStories.length}` : "0"}</span>
            <p>
              <strong>{editionStories.length ? "Stories understood" : "Things to understand"}</strong>
              <br />
              {editionStories.length ? `${editionStories.length - understoodCount} still open.` : "No routine churn included."}
            </p>
          </div>
        </section>

        <section className="margin-note">
          <p className="eyebrow">The quiet-week rule</p>
          <h2>Silence is an answer, too.</h2>
          <p>When a project has no fresh decisions, risks, or learning value, Glimpse gives it no card. No weekly guilt. No empty summary.</p>
          <button className="quiet-example" onClick={() => selectEdition(EDITIONS[1])} type="button">
            <strong>Rundown 27 / quiet</strong>
            <span>7 small commits, no open watch items. See the empty edition.</span>
          </button>
        </section>

        <section className="follow-ups">
          <p className="side-heading">Your watch list</p>
          {watchedStories.length ? (
            watchedStories.map((story) => (
              <button
                className="follow-up watch-item"
                key={story.id}
                onClick={() => {
                  setEditionId("28");
                  setSelectedProject(story.project);
                  setFocusedStoryId(story.id);
                  setView("briefing");
                }}
                type="button"
              >
                <strong>{story.project}</strong>
                <span>{story.verify}</span>
              </button>
            ))
          ) : (
            <p className="watch-empty">Nothing on watch. Use Watch when a change deserves follow-up context in the next rundown.</p>
          )}
        </section>

        <div className="folio">
          <span>GL / {edition.number}</span>
          <span>End of brief</span>
        </div>
      </aside>
    </div>
  );
}
