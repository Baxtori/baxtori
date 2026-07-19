"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ContinueItem } from "@/lib/continue-queue";
import type { ReaderTrail, TrailStory } from "@/lib/reader-trail";
import { BotanicalProgress } from "./botanical-progress";
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
  edition: TrailEdition;
  notice: string;
  onExit: () => void;
  onOpenContinueItem: (item: ContinueItem) => void;
  onOpenMemory: () => void;
  onOpenSystem: () => void;
  onUnderstand: (story: TrailStory) => void;
  onWatch: (story: TrailStory) => void;
  renderEvidence: (story: TrailStory) => ReactNode;
  session: ReaderTrail;
  sourceLabel: string;
  storyState: (story: TrailStory) => StoryDecisionState;
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function formatGenerated(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function evidenceBearing(story: TrailStory) {
  const evidence = story.codeEvidence?.[0];
  if (!evidence) return null;
  return `${evidence.path}:${evidence.startLine}–${evidence.endLine}`;
}

function SpecimenMark({ stage }: { stage: number }) {
  const leafCount = Math.min(4, Math.max(1, stage));
  return (
    <svg aria-hidden="true" className={styles.specimenMark} role="presentation" viewBox="0 0 92 52">
      <path d="M12 45 C 28 39 34 29 42 8" />
      {leafCount >= 1 && <path d="M28 35 C 16 31 11 24 10 18 C 21 18 29 23 28 35 Z" />}
      {leafCount >= 2 && <path d="M33 29 C 45 25 51 17 51 11 C 41 12 34 18 33 29 Z" />}
      {leafCount >= 3 && <path d="M37 21 C 28 17 25 11 26 6 C 34 8 39 13 37 21 Z" />}
      {leafCount >= 4 && <circle cx="44" cy="6" r="3" />}
      <text x="58" y="25">SP.{String(stage).padStart(2, "0")}</text>
      <text x="58" y="35">OBS.</text>
    </svg>
  );
}

export function TrailReader({
  edition,
  notice,
  onExit,
  onOpenContinueItem,
  onOpenMemory,
  onOpenSystem,
  onUnderstand,
  onWatch,
  renderEvidence,
  session: initialSession,
  sourceLabel,
  storyState,
}: TrailReaderProps) {
  const [session] = useState(initialSession);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});
  const restoredItem = useRef(false);

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
      url.searchParams.set("reader", "trail");
      url.searchParams.set("item", session.scenes[index].id);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }, { rootMargin: "-24% 0px -52%", threshold: [0, 0.2, 0.55, 0.8] });

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [session]);

  useEffect(() => {
    if (restoredItem.current) return;
    restoredItem.current = true;
    const item = new URLSearchParams(window.location.search).get("item");
    if (!item || !session.scenes.some((scene) => scene.id === item)) return;
    window.requestAnimationFrame(() => {
      document.getElementById(item)?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [session]);

  useEffect(() => {
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
  }, [activeIndex, moveTo, onUnderstand, session]);

  const firstReadingScene = readingScenes[0];
  const endScene = session.scenes.find((scene) => scene.kind === "end");

  return (
    <div className={styles.trailShell}>
      <a className={styles.skipLink} href="#trail-reading">Skip to the journal</a>
      <BotanicalProgress />

      <header className={styles.trailHeader}>
        <button className={styles.brand} onClick={() => moveTo(0)} type="button">
          <span aria-hidden="true">B</span>
          <strong>Baxtori</strong>
        </button>
        <div className={styles.headerProgress} aria-live="polite">
          <span>{Math.min(activeIndex + 1, session.scenes.length)} of {session.scenes.length}</span>
          <progress max={session.scenes.length} value={activeIndex + 1} />
        </div>
        <button className={styles.exitButton} onClick={onExit} type="button">Classic reader</button>
      </header>

      <nav aria-label="Trail progress" className={styles.sceneNav}>
        {session.scenes.map((scene, index) => (
          <button
            aria-current={index === activeIndex ? "step" : undefined}
            aria-label={`Go to ${scene.kind === "opening" ? "the beginning" : scene.kind === "end" ? "the clearing" : scene.item.title}`}
            key={scene.id}
            onClick={() => moveTo(index)}
            type="button"
          >
            <span />
          </button>
        ))}
      </nav>

      <main className={styles.journal} id="trail-reading">
        <section className={`${styles.scene} ${styles.openingScene}`} data-trail-scene id="trail-opening" tabIndex={-1}>
          <div className={styles.openingMeta}>
            <span>Field notes · {sourceLabel}</span>
            <span>{formatDay(edition.periodStart)}–{formatDay(edition.periodEnd)}</span>
          </div>
          <p className={styles.kicker}>A finite walk through what changed</p>
          <h1>Stay close to the code without living inside it.</h1>
          <p className={styles.openingDek}>
            {readingScenes.length
              ? `${readingScenes.length} ${readingScenes.length === 1 ? "stop" : "stops"}, chosen for a ${session.budgetMinutes}-minute attention window.`
              : "Nothing useful is asking for your attention. The trail is quiet."}
          </p>
          {firstReadingScene && (
            <button className={styles.firstStop} onClick={() => moveTo(1)} type="button">
              <span>First on the trail</span>
              <strong>{firstReadingScene.item.title}</strong>
              <small>{firstReadingScene.item.reason}</small>
              <i aria-hidden="true">↓</i>
            </button>
          )}
          <footer className={styles.openingFooter}>
            <span>Generated {formatGenerated(edition.generatedAt)}</span>
            <span>Use J/K or the arrow keys to move</span>
          </footer>
        </section>

        {session.scenes.map((scene, index) => {
          if (scene.kind === "opening" || scene.kind === "end") return null;

          if (scene.kind === "study") {
            return (
              <section className={`${styles.scene} ${styles.studyScene}`} data-trail-scene id={scene.id} key={scene.id} tabIndex={-1}>
                <div className={styles.sceneNumber} aria-hidden="true">{String(index).padStart(2, "0")}</div>
                <div className={styles.storyMeta}><span>Side path · {scene.item.kind}</span><span>{scene.item.minutes} min</span></div>
                <h2>{scene.item.title}</h2>
                <p className={styles.storyBrief}>{scene.item.reason}</p>
                <p className={styles.repositoryBearing}>{scene.item.repository}</p>
                <button className={styles.primaryAction} onClick={() => onOpenContinueItem(scene.item)} type="button">Open this path <span aria-hidden="true">→</span></button>
              </section>
            );
          }

          const state = storyState(scene.story);
          const bearing = evidenceBearing(scene.story);
          const evidenceOpen = Boolean(openEvidence[scene.story.id]);
          return (
            <article className={`${styles.scene} ${styles.storyScene} ${state.understood ? styles.understood : ""}`} data-trail-scene id={scene.id} key={scene.id} tabIndex={-1}>
              <div className={styles.sceneNumber} aria-hidden="true">{String(index).padStart(2, "0")}</div>
              <header className={styles.storyHeader}>
                <div className={styles.storyMeta}>
                  <span>{scene.story.project}</span>
                  <span>{scene.item.minutes} min</span>
                  <span>{scene.story.timing}</span>
                </div>
                <div className={styles.specimenBearing}>
                  <p>{scene.story.repository ?? scene.item.repository}</p>
                  <SpecimenMark stage={index} />
                </div>
              </header>
              <h2>{scene.story.title}</h2>
              <p className={styles.storyBrief}>{scene.story.brief}</p>

              <div className={styles.whyNow}>
                <span>Why now</span>
                <p>{scene.item.reason}</p>
              </div>

              <section className={styles.meaning} aria-label="Why this change matters">
                <span>What changes in your understanding</span>
                <p>{scene.story.whyItMatters}</p>
              </section>

              <div className={styles.evidenceBearing}>
                <div>
                  <span>{scene.story.codeEvidence?.length ?? 0} exact {scene.story.codeEvidence?.length === 1 ? "excerpt" : "excerpts"}</span>
                  <strong>{bearing ?? scene.story.evidence}</strong>
                </div>
                {bearing && <code>{scene.story.codeEvidence?.[0]?.title}</code>}
              </div>

              <div className={styles.storyActions} aria-label={`Actions for ${scene.story.title}`}>
                <button aria-pressed={state.understood} className={styles.primaryAction} onClick={() => onUnderstand(scene.story)} type="button">
                  <span aria-hidden="true">{state.understood ? "✓" : "○"}</span>{state.understood ? "Understood" : "Mark understood"}
                </button>
                <button aria-pressed={state.watching} onClick={() => onWatch(scene.story)} type="button">{state.watching ? "Watching" : "Watch"}</button>
                <button aria-expanded={evidenceOpen} onClick={() => setOpenEvidence((current) => ({ ...current, [scene.story.id]: !evidenceOpen }))} type="button">
                  {evidenceOpen ? "Close evidence" : "Evidence"}
                </button>
                <button aria-expanded={evidenceOpen} onClick={() => setOpenEvidence((current) => ({ ...current, [scene.story.id]: true }))} type="button">Ask</button>
              </div>

              {evidenceOpen && <div className={styles.evidenceLayer}>{renderEvidence(scene.story)}</div>}

              <details className={styles.fieldNotes}>
                <summary>Verification, tradeoff, and full field notes</summary>
                <div>
                  <section><span>What changed</span><p>{scene.story.whatChanged}</p></section>
                  <section><span>Check this</span><p>{scene.story.verify}</p></section>
                  <section><span>Tradeoff</span><p>{scene.story.tradeoff}</p></section>
                </div>
              </details>

              <button className={styles.nextCue} onClick={() => moveTo(index + 1)} type="button">
                Continue down the trail <span aria-hidden="true">↓</span>
              </button>
            </article>
          );
        })}

        {endScene?.kind === "end" && (
          <section className={`${styles.scene} ${styles.endScene}`} data-trail-scene id="trail-end" tabIndex={-1}>
            <div className={styles.clearingMark} aria-hidden="true"><span /><span /><span /></div>
            <p className={styles.kicker}>{readingScenes.length ? "The clearing" : "A quiet edition"}</p>
            <h2>{readingScenes.length ? "You reached the end of this walk." : "Nothing needs tending today."}</h2>
            <p className={styles.endDek}>
              {readingScenes.length
                ? "Your decisions stay with the next review. The published evidence stays exactly as it was."
                : "Baxtori found no useful reading for this attention window. Silence is part of the editorial decision."}
            </p>
            <dl className={styles.endSummary}>
              <div><dt>Understood</dt><dd>{understoodCount}</dd></div>
              <div><dt>Watching</dt><dd>{watchedCount}</dd></div>
              <div><dt>Minutes walked</dt><dd>{session.plannedMinutes}</dd></div>
              <div><dt>Quiet repositories</dt><dd>{endScene.quietRepositories.length}</dd></div>
            </dl>
            {endScene.deferredCount > 0 && (
              <p className={styles.deferNote}>More paths remain available whenever you choose another attention window.</p>
            )}
            <div className={styles.endActions}>
              <button className={styles.primaryAction} onClick={onOpenMemory} type="button">Open working memory</button>
              <button onClick={onOpenSystem} type="button">Walk the system model</button>
              <button onClick={onExit} type="button">Return to classic reader</button>
            </div>
          </section>
        )}
      </main>

      <p className={styles.notice} aria-live="polite" role="status">{notice}</p>
    </div>
  );
}
