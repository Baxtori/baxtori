"use client";

import { useMemo, useState } from "react";

type Tone = "blue" | "green" | "rust";
type View = "briefing" | "timeline";

type Story = {
  id: string;
  number: string;
  project: string;
  tone: Tone;
  signal: string;
  title: string;
  summary: string;
  attention: string;
  attentionNote: string;
  rating: number;
  timing: string;
  evidence: string;
  tradeoff: string;
  files: string[];
};

type StoryState = {
  expanded: boolean;
  understood: boolean;
  watching: boolean;
  muted: boolean;
};

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

const STORIES: Story[] = [
  {
    id: "checkout",
    number: "01",
    project: "Checkout",
    tone: "blue",
    signal: "High signal",
    title: "Payment retries now explain themselves.",
    summary:
      "Retry handling now records why an attempt stopped beside the attempt itself. Processor failures, customer-action requirements, and exhausted retries take distinct paths, so support can trace the decision without rebuilding it from logs.",
    attention: "Study this",
    attentionNote: "A named boundary between retry policy and queue plumbing.",
    rating: 5,
    timing: "Tue, 11:40",
    evidence: "4 commits · 9 files · 18 tests added",
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
    title: "Workspace permissions have a clearer edge.",
    summary:
      "Membership is resolved once at the route boundary and passed into mutations, rather than rediscovered in each one. The authorization path is easier to trace; inherited-role behavior is now concentrated in one rule set.",
    attention: "Keep an eye on it",
    attentionNote: "The shared guard is easier to audit; one edge merits a behavior matrix.",
    rating: 4,
    timing: "Wed, 15:20",
    evidence: "3 commits · 7 files · 12 permission cases",
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
    title: "The animation layer lost some old assumptions.",
    summary:
      "Three nearly matching timing helpers now route through one primitive. Current visual checks hold steady; a compatibility switch stays in place until the next release window.",
    attention: "Good to keep for now",
    attentionNote: "A simpler surface, with a deliberate follow-up still open.",
    rating: 3,
    timing: "Thu, 09:05",
    evidence: "4 commits · 6 files · 3 helpers retired",
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
  const [view, setView] = useState<View>("briefing");
  const [selectedProject, setSelectedProject] = useState("All projects");
  const [states, setStates] = useState<Record<string, StoryState>>({});
  const [showMuted, setShowMuted] = useState(false);
  const [pendingMute, setPendingMute] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const storyState = (id: string) => states[id] ?? EMPTY_STORY_STATE;

  const updateStory = (id: string, patch: Partial<StoryState>) => {
    setStates((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_STORY_STATE), ...patch },
    }));
  };

  const mutedCount = STORIES.filter((story) => storyState(story.id).muted).length;
  const watchedCount = STORIES.filter((story) => storyState(story.id).watching).length;

  const visibleStories = useMemo(
    () =>
      STORIES.filter((story) => {
        const belongsToSelection =
          selectedProject === "All projects" || story.project === selectedProject;
        return belongsToSelection && (showMuted || !storyState(story.id).muted);
      }),
    [selectedProject, showMuted, states],
  );

  const markUnderstood = (story: Story) => {
    const wasUnderstood = storyState(story.id).understood;
    updateStory(story.id, { understood: !wasUnderstood });
    setNotice(
      wasUnderstood
        ? `${story.project} is back in this brief.`
        : `Filed away. ${story.project} will only return if this area changes materially.`,
    );
  };

  const toggleWatch = (story: Story) => {
    const wasWatching = storyState(story.id).watching;
    updateStory(story.id, { watching: !wasWatching });
    setNotice(
      wasWatching
        ? `${story.project} is no longer on your watch list.`
        : `Watching ${story.project}. Follow-up changes will get a little more context next time.`,
    );
  };

  const confirmMute = (story: Story) => {
    updateStory(story.id, { muted: true });
    setPendingMute(null);
    setNotice(`${story.project} is quiet now. Its future stories are hidden until you bring it back.`);
  };

  const toggleMutedView = () => {
    setShowMuted((current) => !current);
    setNotice(showMuted ? "Muted stories are tucked away again." : "Muted stories are visible for this read.");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#briefing">
        Skip to this week&apos;s briefing
      </a>

      <aside className="project-rail" aria-label="Rundown navigation">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <span>Glimpse</span>
        </div>
        <p className="brand-caption">Your personal code rundown</p>

        <button className="edition-selector" type="button" aria-label="Current rundown, July 6 through 12, 2026">
          <span className="eyebrow">Rundown 28</span>
          <span className="edition-date">
            Jul 6–12, 2026 <span aria-hidden="true">↗</span>
          </span>
        </button>

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
                <span className="project-count">{STORIES.length - mutedCount}</span>
              </button>
            </li>
            {PROJECTS.map((project) => {
              const projectStory = STORIES.find((story) => story.project === project.name);
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
                    <span className="project-count">{isMuted ? "quiet" : "1"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="rail-note">
          A small reading habit for the code that changed while you were busy making it.
        </p>
      </aside>

      <main className="briefing-column" id="briefing">
        <header className="masthead">
          <div className="topline">
            <span className="eyebrow issue-label">Weekly code rundown</span>
            <time className="prepared" dateTime="2026-07-13">
              A quiet brief, prepared Jul 13
            </time>
          </div>
          <h1>Three changes worth knowing before Monday.</h1>
          <p className="dek">
            Not a changelog. A short editorial read on what moved, why it matters, and what deserves a second look in your own code.
          </p>
          <div className="summary-line" aria-label="Briefing summary">
            <span className="summary-rule" />
            <span>
              <strong>3 projects</strong> · 11 meaningful commits · 7 min read
            </span>
            <span className="summary-rule" />
          </div>
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
        </header>

        <section className="briefing-content" aria-labelledby="briefing-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{view === "briefing" ? "Your reading queue" : "The raw thread"}</p>
              <h2 id="briefing-title">
                {view === "briefing" ? "The week, in three changes" : "What happened, in order"}
              </h2>
            </div>
            <div className="section-tools">
              {mutedCount > 0 && (
                <button className="text-button" onClick={toggleMutedView} type="button">
                  {showMuted ? "Hide" : "Show"} muted ({mutedCount})
                </button>
              )}
              <span>Read in any order; keep only what helps.</span>
            </div>
          </div>

          <p className="action-notice" aria-live="polite" role="status">
            {notice}
          </p>

          {visibleStories.length === 0 ? (
            <section className="quiet-empty" aria-label="Quiet week">
              <span className="quiet-mark" aria-hidden="true">—</span>
              <div>
                <p className="eyebrow">Nothing worth a story</p>
                <h3>This project is quiet.</h3>
                <p>
                  Small changes landed, but none introduced a new behavior, boundary, or open tradeoff. Glimpse will not pad the page just to fill it.
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
                    className={`story-card ${story.tone} ${index === 0 ? "is-featured" : ""} ${state.understood ? "is-understood" : ""} ${state.muted ? "is-muted" : ""}`}
                    key={story.id}
                  >
                    <div className="story-topline">
                      <span className="story-number">
                        {story.number} / {story.project}
                      </span>
                      <span className="signal-label">{state.understood ? "Filed away" : state.watching ? "Watching" : story.signal}</span>
                    </div>
                    <h3>{story.title}</h3>
                    <p className="story-summary">{story.summary}</p>

                    <div className="story-meta">
                      <div className="assessment">
                        <span className="rating" aria-hidden="true">
                          {"★".repeat(story.rating)}{"☆".repeat(5 - story.rating)}
                        </span>
                        <span className="sr-only">{story.rating} out of 5</span>
                        <strong>{state.understood ? "Understood" : story.attention}</strong>
                        <span className="assessment-note">— {story.attentionNote}</span>
                      </div>
                      <button
                        aria-expanded={state.expanded}
                        className="evidence-button"
                        onClick={() => updateStory(story.id, { expanded: !state.expanded })}
                        type="button"
                      >
                        {state.expanded ? "Close evidence" : "See evidence"}
                      </button>
                    </div>

                    {state.expanded && (
                      <div className="evidence-panel">
                        <p className="evidence-count">{story.evidence}</p>
                        <p>
                          <strong>Deliberate tradeoff:</strong> {story.tradeoff}
                        </p>
                        <div className="file-list" aria-label={`Files changed in ${story.project}`}>
                          {story.files.map((file) => (
                            <code key={file}>{file}</code>
                          ))}
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
                        {state.understood ? "Understood ✓" : "Mark understood"}
                      </button>
                      <button
                        aria-pressed={state.watching}
                        className={state.watching ? "action-button watch is-active" : "action-button watch"}
                        onClick={() => toggleWatch(story)}
                        type="button"
                      >
                        {state.watching ? "Watching" : "Watch"}
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
                        <button
                          className="action-button mute"
                          onClick={() => setPendingMute(story.id)}
                          type="button"
                        >
                          Mute
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
                      <p className="story-number">{story.project} · {story.signal}</p>
                      <h3>{story.title}</h3>
                      <p>{story.summary}</p>
                      <button
                        className="text-button"
                        onClick={() => {
                          updateStory(story.id, { expanded: true });
                          setSelectedProject(story.project);
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
                <p>8 small commits stayed out of the briefing. They are available in the raw activity trail, but none introduced a new decision or tradeoff.</p>
              </li>
            </ol>
          )}
        </section>
      </main>

      <aside className="notes-rail" aria-label="Rundown notes">
        <section className="issue-note">
          <p className="side-heading">This issue</p>
          <div className="signal-count">
            <span>{visibleStories.length}</span>
            <p>
              <strong>Things to understand</strong>
              <br />
              No routine churn included.
            </p>
          </div>
        </section>

        <section className="margin-note">
          <p className="eyebrow">The quiet-week rule</p>
          <h2>Silence is an answer, too.</h2>
          <p>When a project has no fresh decisions, risks, or learning value, Glimpse gives it no card. No weekly guilt. No empty summary.</p>
          <div className="quiet-example">
            <strong>Last week / Fleet</strong>
            <span>7 small commits, no open watch items. Held quietly.</span>
          </div>
        </section>

        <section className="follow-ups">
          <p className="side-heading">For next week</p>
          <div className="follow-up">
            <strong>Checkout</strong>
            <span>Follow the new retry taxonomy into the support dashboard.</span>
          </div>
          <div className="follow-up">
            <strong>Studio</strong>
            <span>Watch the inherited-role tests before inviting more teams.</span>
          </div>
          {watchedCount > 0 && (
            <p className="watch-summary">
              {watchedCount} {watchedCount === 1 ? "story" : "stories"} on your watch list.
            </p>
          )}
        </section>

        <div className="folio">
          <span>GL / 28</span>
          <span>End of brief</span>
        </div>
      </aside>
    </div>
  );
}
