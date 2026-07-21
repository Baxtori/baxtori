"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ContinueItem } from "@/lib/continue-queue";
import type { ReaderTrail, TrailStory } from "@/lib/reader-trail";
import { BotanicalProgress } from "./botanical-progress";
import { BotanicalGlyph } from "./botanical-glyph";
import { BrandMark } from "./brand-mark";
import { GitHubMark } from "./github-mark";
import styles from "./trail-reader.module.css";

type StoryDecisionState = {
  understood: boolean;
  watching: boolean;
};

type TrailEdition = {
  generatedAt: string;
  periodEnd: string;
  periodStart: string;
};

type TrailReaderProps = {
  accountLabel?: string;
  activeView: "briefing" | "history" | "map" | "repositories" | "timeline";
  connectHref?: string;
  edition: TrailEdition;
  notice: string;
  onOpenEditionRecord: () => void;
  onOpenContinueItem: (item: ContinueItem) => void;
  onOpenMemory: () => void;
  onOpenNow: () => void;
  onOpenRepositories?: () => void;
  onSignOut?: () => void;
  onOpenSystem: () => void;
  onUnderstand: (story: TrailStory) => void;
  onWatch: (story: TrailStory) => void;
  renderEvidence: (story: TrailStory) => ReactNode;
  session: ReaderTrail;
  primaryContent?: ReactNode;
  primaryDescription?: string;
  primaryHeading?: string;
  primaryKicker?: string;
  repositoryCount?: number;
  sourceLabel: string;
  storyState: (story: TrailStory) => StoryDecisionState;
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatGenerated(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function TrailReader({
  accountLabel,
  activeView,
  connectHref,
  edition,
  notice,
  onOpenEditionRecord,
  onOpenContinueItem,
  onOpenMemory,
  onOpenNow,
  onOpenRepositories,
  onSignOut,
  onOpenSystem,
  onUnderstand,
  onWatch,
  renderEvidence,
  session,
  primaryContent,
  primaryDescription,
  primaryHeading,
  primaryKicker,
  repositoryCount = 0,
  sourceLabel,
  storyState,
}: TrailReaderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});
  const restoredItem = useRef(false);
  const shell = useRef<HTMLDivElement>(null);

  const readingScenes = session.scenes.filter((scene) => scene.kind === "story" || scene.kind === "study");
  const storyScenes = session.scenes.filter((scene) => scene.kind === "story");
  const understoodCount = storyScenes.filter((scene) => scene.kind === "story" && storyState(scene.story).understood).length;
  const watchedCount = storyScenes.filter((scene) => scene.kind === "story" && storyState(scene.story).watching).length;

  const moveTo = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(session.scenes.length - 1, index));
    const target = document.getElementById(session.scenes[bounded].id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [session]);

  useEffect(() => {
    shell.current?.setAttribute("data-reader-ready", "true");
  }, []);

  useEffect(() => {
    if (activeView !== "briefing") return;
    const elements = session.scenes
      .map((scene) => document.getElementById(scene.id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!visible) return;
      const index = session.scenes.findIndex((scene) => scene.id === visible.target.id);
      if (index < 0) return;
      setActiveIndex(index);
      const url = new URL(window.location.href);
      url.searchParams.delete("reader");
      url.searchParams.set("item", session.scenes[index].id);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }, { rootMargin: "-24% 0px -52%", threshold: [0, 0.2, 0.55, 0.8] });

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [activeView, session]);

  useEffect(() => {
    if (activeView !== "briefing") return;
    if (restoredItem.current) return;
    restoredItem.current = true;
    const item = new URLSearchParams(window.location.search).get("item");
    if (!item || !session.scenes.some((scene) => scene.id === item)) return;
    window.requestAnimationFrame(() => {
      document.getElementById(item)?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [activeView, session]);

  useEffect(() => {
    if (activeView !== "briefing") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.matches("input, textarea, select, button, a, summary") ||
        event.metaKey || event.ctrlKey || event.altKey
      ) return;
      const key = event.key.toLowerCase();
      if (key === "j" || key === "arrowdown" || event.key === "PageDown") {
        event.preventDefault();
        moveTo(activeIndex + 1);
      } else if (key === "k" || key === "arrowup" || event.key === "PageUp") {
        event.preventDefault();
        moveTo(activeIndex - 1);
      } else if (key === "u") {
        const scene = session.scenes[activeIndex];
        if (scene?.kind === "story") {
          event.preventDefault();
          onUnderstand(scene.story);
        }
      } else if (key === "e") {
        const scene = session.scenes[activeIndex];
        if (scene?.kind === "story") {
          event.preventDefault();
          setOpenEvidence((current) => ({ ...current, [scene.story.id]: !current[scene.story.id] }));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, activeView, moveTo, onUnderstand, session]);

  useEffect(() => {
    if (activeView === "briefing") return;
    window.scrollTo({ behavior: "auto", top: 0 });
  }, [activeView]);

  const endScene = session.scenes.find((scene) => scene.kind === "end");

  return (
    <div className={styles.trailShell} data-reader-ready="false" ref={shell}>
      <a className={styles.skipLink} href="#trail-reading">Skip to the journal</a>
      <BotanicalProgress />

      <aside className={styles.trailRail} aria-label="Baxtori navigation">
        <button className={styles.brand} onClick={() => activeView === "briefing" ? moveTo(0) : onOpenNow()} type="button">
          <BrandMark className={styles.brandMark} />
          <span><strong>Baxtori</strong><small>Repository notes</small></span>
        </button>

        <nav className={styles.trailPrimaryNav} aria-label="Primary">
          <button aria-current={activeView === "briefing" ? "page" : undefined} onClick={() => activeView === "briefing" ? moveTo(0) : onOpenNow()} type="button"><span>Now</span>{activeView === "briefing" && <BotanicalGlyph className={styles.navGlyph} />}</button>
          <button aria-current={activeView === "map" ? "page" : undefined} onClick={onOpenSystem} type="button"><span>System</span>{activeView === "map" && <BotanicalGlyph className={styles.navGlyph} />}</button>
          <button aria-current={activeView === "history" ? "page" : undefined} onClick={onOpenMemory} type="button"><span>Memory</span>{activeView === "history" && <BotanicalGlyph className={styles.navGlyph} />}</button>
        </nav>

        {activeView === "briefing" ? (
          <div className={styles.railProgress} aria-live="polite">
            <span>Reading · {Math.min(activeIndex + 1, session.scenes.length)} of {session.scenes.length}</span>
            <progress max={session.scenes.length} value={activeIndex + 1} />
          </div>
        ) : (
          <p className={styles.railSection}>{activeView === "map" ? "Repository map" : activeView === "repositories" ? "Sources" : activeView === "timeline" ? "Edition record" : "Edition archive"}</p>
        )}

        {activeView === "briefing" && (
          <nav aria-label="Edition progress" className={styles.sceneNav}>
            {session.scenes.map((scene, index) => (
              <button
                aria-current={index === activeIndex ? "step" : undefined}
                aria-label={`Go to ${scene.kind === "opening" ? "the beginning" : scene.kind === "end" ? "the clearing" : scene.item.title}`}
                key={scene.id}
                onClick={() => moveTo(index)}
                type="button"
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </nav>
        )}

        <nav className={styles.trailSecondaryNav} aria-label="Edition and source tools">
          <button aria-current={activeView === "timeline" ? "page" : undefined} onClick={onOpenEditionRecord} type="button">Edition record</button>
          {onOpenRepositories && <button aria-current={activeView === "repositories" ? "page" : undefined} onClick={onOpenRepositories} type="button">Review sources <small>{repositoryCount}</small></button>}
          {connectHref && (
            <a className={styles.connectGithub} href={connectHref}>
              <GitHubMark className={styles.connectGithubIcon} />
              <span>Connect GitHub</span>
            </a>
          )}
        </nav>

        {onOpenRepositories && (
          <button aria-current={activeView === "repositories" ? "page" : undefined} className={styles.mobileSources} onClick={onOpenRepositories} type="button">
            {activeView === "repositories" && <BotanicalGlyph className={styles.mobileSourcesGlyph} />}
            <span>Sources</span><small>{repositoryCount}</small>
          </button>
        )}

        {connectHref && (
          <a aria-label="Connect GitHub" className={`${styles.mobileSources} ${styles.mobileConnect}`} href={connectHref}>
            <GitHubMark className={styles.connectGithubIcon} />
            <span>Connect</span>
          </a>
        )}

        <div className={styles.railAccount}>
          <p>Current edition<br />{formatDay(edition.periodStart)}–{formatDay(edition.periodEnd)}<br />{sourceLabel}</p>
          {accountLabel && <p>{accountLabel}</p>}
          {onSignOut && <button onClick={onSignOut} type="button">Sign out</button>}
        </div>
      </aside>

      {activeView !== "briefing" ? (
        <main className={`${styles.journal} ${styles.primaryJournal}`} id="trail-reading">
          <header className={styles.primaryMasthead}>
            <span>{primaryKicker}</span>
            <h1>{primaryHeading}</h1>
            <p>{primaryDescription}</p>
          </header>
          <div className={styles.primaryContent}>{primaryContent}</div>
        </main>
      ) : (
      <main className={styles.journal} id="trail-reading">
        <section className={`${styles.scene} ${styles.openingScene}`} data-trail-scene id="trail-opening" tabIndex={-1}>
          <header className={styles.issueMasthead}>
            <strong>Baxtori Review</strong>
            <span>{formatDay(edition.periodStart)}—{formatDay(edition.periodEnd)}</span>
            <span>{sourceLabel}</span>
          </header>
          <div className={styles.openingGrid}>
            <div className={styles.openingLead}>
              <span className={styles.openingMeta}><BotanicalGlyph />{sourceLabel}</span>
              <h1>Notes from the repositories.</h1>
              <p className={styles.openingDek}>
                {readingScenes.length
                  ? `${readingScenes.length} ${readingScenes.length === 1 ? "story" : "stories"} · about ${session.plannedMinutes} minutes.`
                  : "No stories in this edition."}
              </p>
            </div>
            {readingScenes.length > 0 && (
              <ol className={styles.openingContents} aria-label="In this edition">
                {readingScenes.map((scene, index) => (
                  <li key={scene.id}>
                    <button onClick={() => moveTo(session.scenes.findIndex((candidate) => candidate.id === scene.id))} type="button">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{scene.item.title}</strong>
                      <small>{scene.kind === "story" ? scene.story.project : scene.item.repository}</small>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <footer className={styles.issueFooter}>
            <span>Generated {formatGenerated(edition.generatedAt)}</span>
            <button onClick={onOpenEditionRecord} type="button">Edition record</button>
          </footer>
        </section>

        {session.scenes.map((scene, index) => {
          if (scene.kind === "opening" || scene.kind === "end") return null;

          if (scene.kind === "study") {
            return (
              <section className={`${styles.scene} ${styles.studyScene}`} data-trail-scene id={scene.id} key={scene.id} tabIndex={-1}>
                <div className={styles.sceneNumber} aria-hidden="true">{String(index).padStart(2, "0")}</div>
                <div className={styles.storyMeta}><span>{scene.item.kind}</span><BotanicalGlyph /><span>{scene.item.minutes} min</span></div>
                <h2>{scene.item.title}</h2>
                <p className={styles.storyBrief}>{scene.item.reason}</p>
                <p className={styles.repositoryBearing}>{scene.item.repository}</p>
                <button className={styles.primaryAction} onClick={() => onOpenContinueItem(scene.item)} type="button">Open <span aria-hidden="true">→</span></button>
              </section>
            );
          }

          const state = storyState(scene.story);
          const evidenceOpen = Boolean(openEvidence[scene.story.id]);
          return (
            <article className={`${styles.scene} ${styles.storyScene} ${state.understood ? styles.understood : ""}`} data-trail-scene id={scene.id} key={scene.id} tabIndex={-1}>
              <div className={styles.sceneNumber} aria-hidden="true">{String(index).padStart(2, "0")}</div>
              <header className={styles.storyHeader}>
                <div className={styles.storyLead}>
                  <div className={styles.storyMeta}>
                    <span>{scene.story.project}</span>
                    <BotanicalGlyph />
                    <span>Published {formatDay(edition.periodEnd)}</span>
                  </div>
                  <h2>{scene.story.title}</h2>
                  <p className={styles.storyBrief}>{scene.story.brief}</p>
                </div>
              </header>

              <section className={styles.meaning} aria-label="Why it matters">
                <span>Why it matters</span>
                <p>{scene.story.whyItMatters}</p>
              </section>

              <div className={styles.storyActions} aria-label={`Actions for ${scene.story.title}`}>
                <button aria-pressed={state.understood} onClick={() => onUnderstand(scene.story)} type="button">
                  <span className={styles.actionIcon} aria-hidden="true">{state.understood ? "✓" : "○"}</span><span>Understood</span>
                </button>
                <button aria-pressed={state.watching} onClick={() => onWatch(scene.story)} type="button"><span className={styles.actionIcon} aria-hidden="true">{state.watching ? "◆" : "◇"}</span><span>Watch</span></button>
                <button aria-expanded={evidenceOpen} onClick={() => setOpenEvidence((current) => ({ ...current, [scene.story.id]: !evidenceOpen }))} type="button">
                  <span className={styles.actionIcon} aria-hidden="true">{evidenceOpen ? "−" : "+"}</span><span>Evidence</span>
                </button>
              </div>

              {evidenceOpen && <div className={styles.evidenceLayer}>{renderEvidence(scene.story)}</div>}

              <details className={styles.fieldNotes}>
                <summary><span>Field notes</span><small>Changed · verify · tradeoff</small></summary>
                <div>
                  <section><span>Changed</span><p>{scene.story.whatChanged}</p></section>
                  <section><span>Verify</span><p>{scene.story.verify}</p></section>
                  <section><span>Tradeoff</span><p>{scene.story.tradeoff}</p></section>
                </div>
              </details>

            </article>
          );
        })}

        {endScene?.kind === "end" && (
          <section className={`${styles.scene} ${styles.endScene}`} data-trail-scene id="trail-end" tabIndex={-1}>
            <h2>{readingScenes.length ? "Caught up." : "Nothing new."}</h2>
            <dl className={styles.endSummary}>
              <div><dt>Understood</dt><dd>{understoodCount}</dd></div>
              <div><dt>Watching</dt><dd>{watchedCount}</dd></div>
              <div><dt>Minutes</dt><dd>{session.plannedMinutes}</dd></div>
              <div><dt>Quiet repos</dt><dd>{endScene.quietRepositories.length}</dd></div>
            </dl>
            <div className={styles.endActions}>
              <button className={styles.primaryAction} onClick={onOpenMemory} type="button">Memory</button>
              <button onClick={onOpenSystem} type="button">System</button>
              {connectHref && <a href={connectHref}>Connect your repositories</a>}
            </div>
          </section>
        )}
      </main>
      )}

      <p className={styles.notice} aria-live="polite" role="status">{notice}</p>
    </div>
  );
}
