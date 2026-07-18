# Scroll trail experience proposal

**Status:** Exploration proposal · **Recorded:** 2026-07-19 · **Decision owner:**
Baxtori product direction · **Comparison target:** the current `Now` reader on
`main`

## Proposal

Make Baxtori's primary experience a calm, finite, vertically scrolling trail
through the most valuable things to understand. Each stop should answer one
question, retain a direct path to exact evidence, and offer a small reader
decision before the trail continues.

This is not an infinite activity feed and it is not a visual rewrite of every
surface. It is a new composition of capabilities Baxtori already has:

- deterministic Continue ranking;
- concise story orientation;
- commit-addressed diffs and current code;
- understand, watch, dismiss, question, and re-review decisions;
- repository-map frontiers and open questions;
- durable state across editions.

The intended feeling is closer to walking a curated trail or reading a short
album than operating a repository dashboard. The user should be able to open
Baxtori, begin scrolling, understand why each stop is present, inspect proof
when useful, make a decision, and arrive at a real end.

## What the current code says

The direction fits the product architecture, but the current presentation does
not yet make it the center of gravity.

### Foundations worth preserving

- `lib/continue-queue.ts` already produces a deterministic cross-surface queue
  from stories, watches, map areas, questions, and re-review context. This is a
  stronger starting point than an engagement-oriented recommendation system.
- `app/story-code.tsx` already provides the high-density inspection layer:
  exact comparisons, current code, evidence tabs, full-screen inspection, and
  evidence-attached questions.
- Reader state already distinguishes understood, watched, muted, locked, and
  re-review intent. The trail does not need a new reaction database to begin.
- `J`, `K`, `E`, and `U` keyboard behavior, direct focus targets, mobile code
  tab snapping, and reduced-motion CSS establish important accessibility and
  navigation precedents.
- `Now`, `System`, and `Memory` are already the three primary jobs. A trail can
  become the face of `Now` without weakening the system model or durable
  history.
- The north-star contract—low-density orientation, high-density inspection,
  and zero density when nothing matters—is more compatible with a finite trail
  than with an infinite feed.

### Friction in the current experience

- `Now` is one long page, but it reads as several stacked products: a masthead,
  Continue planner, Deep reads list, watch strip, re-review queue, and working
  memory summary. Scrolling moves through layout regions rather than through a
  guided sequence of understanding.
- The Continue panel recommends an item and then jumps into a separate list.
  The recommendation is not itself the beginning of the reading experience.
- Every story starts as a summary card and requires **Open backstory** before
  showing proof or rationale. This repeats a click at exactly the point where
  the product should feel frictionless.
- Story actions are presented together as a toolbar. They are capable, but they
  ask the reader to parse the interface rather than respond naturally to the
  material.
- The landing page exposes the entire planned queue before the first item has
  been read. That is useful planning information, but it competes with the one
  recommended next action.
- `app/page.tsx` currently owns authentication, persistence, repositories,
  activity, navigation, queue construction, focus behavior, and all primary
  views in roughly 1,662 lines. `app/globals.css` is roughly 2,461 lines. A
  motion- and scroll-heavy experiment inside those files would be difficult to
  compare, isolate, and remove.
- The visual suite proves the entrance, briefing, evidence opening, and Memory,
  but it does not yet exercise sequential reading, trail completion, scroll
  restoration, reduced motion, or gesture alternatives.

## Product shape

### A finite session, not an infinite feed

On entry, Baxtori should assemble a **trail session** from the existing Continue
queue and the reader's chosen attention window. The session has a visible
length, a beginning, and a completion state. New work does not appear under the
reader while a session is in progress; it becomes part of the next session.

The product may virtualize a long trail for performance, but it should never
pretend that endlessness is the goal. Quiet state and completion are product
successes.

### The stop is the primary unit

Each Continue item becomes a viewport-scale trail stop rather than a link into
another region. A story stop should normally contain:

1. **Orientation** — project, title, concise synopsis, selection reason, and
   estimated time.
2. **Meaning** — what changed and why it matters, readable without opening a
   modal or disclosure.
3. **Proof** — the best exact excerpt, immediately available but visually
   subordinate until the reader approaches it.
4. **Judgment** — verification guidance, uncertainty, and the important
   tradeoff.
5. **Decision** — understood, watch, ask, re-review, or not worth attention.

These are semantic parts of one stop, not necessarily five full screens. The
layout should keep the synopsis and rationale in the natural vertical path and
use progressive disclosure for dense code, secondary excerpts, commit lists,
and advanced review controls.

Map frontiers and open questions use the same shell with content appropriate to
their type. The trail should feel consistent even though the evidence differs.

### Vertical is progress; horizontal is adjacency

- Vertical scrolling advances through the session.
- Horizontal movement may switch among sibling evidence excerpts, before/after
  code, or closely related context.
- Horizontal gestures must never be the only way to take an action. Visible
  controls and keyboard equivalents remain available.
- Destructive or durable actions should not fire from a casual swipe. A swipe
  may reveal or select an action, but confirmation comes from an explicit
  control.
- Use `scroll-snap-type: y proximity` only where it improves orientation. Avoid
  mandatory snapping around expanded code, forms, or accessibility zoom.

### Completion and continuity

A persistent, quiet progress affordance should show where the reader is in the
current session without exposing the entire backlog. At the end, a clearing
summarizes:

- what the reader marked understood;
- what remains watched or questioned;
- what will influence the next review;
- whether another useful session is available.

Completion should update the same durable state used today. `System` and
`Memory` remain destinations for deliberate exploration, not cards injected
into the trail merely to increase content.

## Nature as a design system

Nature should supply structure and emotional pacing, not wallpaper.

- A trail line or changing horizon can represent session progress.
- Branches can introduce optional evidence or alternate explanations.
- New growth can mark additions; falling leaves can mark deletions and cleanup.
- A clearing can mark a completed or honestly quiet session.
- Color, texture, and restrained motion can distinguish orientation, evidence,
  uncertainty, and completion without adding more badges.

The first prototype should use lightweight, repository-owned art or generated
abstract assets with recorded provenance. It should not depend on remote stock
images at runtime. Photography can be explored later only with an explicit
license, attribution, responsive-image, performance, and offline strategy.

Motion must use a small token set, stay out of code inspection, and have a
meaningful reduced-motion equivalent. The experience should remain coherent
with all animation disabled.

## Proposed technical boundary

Do not begin by rewriting `app/page.tsx`. First create a parallel trail path
that consumes current data and state contracts.

```text
stories + repository maps + questions + review requests
                         │
                         ▼
              existing Continue ranking
                         │
                         ▼
                 trail session planner
          stable session id, ordered stops, budget
                         │
                         ▼
                scroll trail presentation
      orientation → evidence → decision → completion
                         │
                         ▼
              existing durable reader state
```

Suggested modules:

- `lib/trail-session.ts` — a pure planner that snapshots ordered Continue items
  into a finite session and defines completion.
- `app/trail/trail-reader.tsx` — session-level scrolling, progress, active-stop
  observation, keyboard movement, and resume behavior.
- `app/trail/trail-stop.tsx` — shared stop frame and action boundary.
- `app/trail/story-stop.tsx`, `map-stop.tsx`, and `question-stop.tsx` — content
  adapters using existing story, map, evidence, and feedback contracts.
- `app/trail/trail.module.css` — isolated layout, scroll, nature, motion, and
  reduced-motion rules.

Use stable anchors for every stop and reflect the active stop in the URL. Save
the active stop and intra-stop position locally first; account-backed resume can
follow after the behavior is proven. Use `IntersectionObserver` for active-stop
state rather than a high-frequency document scroll handler.

The first implementation should be enabled by a comparison route or explicit
flag such as `?experience=trail`. The existing reader remains the control until
the decision gate is met.

## Delivery plan

### Phase 0 — Preserve a comparison baseline

- Preserve the current desktop and mobile `Now` and `Memory` screenshots, then
  capture matching expanded-evidence and `System` baselines.
- Add explicit baseline assertions for time-to-first-evidence actions and the
  current number of required clicks.
- Record current accessibility behavior with keyboard and reduced motion.

**Exit:** current `main` can be compared with the trail using the same edition
and reader state.

### Phase 1 — Plan immutable trail sessions

- Add `trail-session.ts` and unit tests.
- Reuse `buildContinueQueue`; do not change its ranking in the experience
  experiment.
- Snapshot the planned items, reason, minutes, edition, and starting reader
  state into a stable session.
- Define completion, skip, and state-change behavior deterministically.

**Exit:** identical input produces an identical finite sequence, and changes to
live queue state do not reorder a session already being read.

### Phase 2 — Build the story-only trail

- Render current edition stories as viewport-scale stops behind the comparison
  flag.
- Put synopsis and rationale directly in the scroll path.
- Reuse `StoryCode` for exact evidence instead of rebuilding the diff viewer.
- Support visible controls plus `J`, `K`, `E`, and `U`.
- Add active-stop progress, URL anchors, refresh restoration, and a real ending.

**Exit:** the demo can be completed on desktop and mobile without using the
  legacy Deep reads list.

### Phase 3 — Add all Continue item types

- Adapt watched threads, map frontiers, open questions, and incomplete
  re-review context into the shared stop contract.
- Preserve direct routes into `System` and `Memory` for exploration beyond the
  session.
- Verify that a five-minute attention window stays small and that an empty queue
  goes directly to a quiet clearing.

**Exit:** the trail represents the same useful work as the current Continue
queue without becoming a mixed notification feed.

### Phase 4 — Add the nature and motion language

- Prototype one progress metaphor, one transition, and one completion scene.
- Establish color, texture, motion, and reduced-motion tokens.
- Measure asset weight, layout shift, main-thread work, and behavior on a
  mid-range mobile viewport.
- Remove any motif that does not communicate state or pacing.

**Exit:** nature materially improves orientation or emotional ease and does not
compete with evidence.

### Phase 5 — Compare and decide

Run the current and trail experiences against the same tasks:

1. Identify why the first item deserves attention.
2. Reach the exact code supporting its central claim.
3. Explain the change and its tradeoff.
4. Record a durable decision or question.
5. Leave and successfully resume.
6. Recognize that the session is complete.

Promote the trail only if it improves the product's existing north-star measure,
**time to trustworthy understanding**, while preserving evidence trust and
accessibility. Do not select it because it creates more scrolling or longer
sessions.

## Measures

Primary comparison signals:

- time and actions from entry to the first relevant exact code;
- percentage of started stops that reach an explicit reader decision;
- ability to explain why a stop was selected and name its important tradeoff;
- successful resume to the same stop and context;
- completed sessions versus abandoned sessions;
- evidence questions or watches that survive correctly into later review;
- keyboard-only and reduced-motion task completion;
- scroll traps, accidental actions, layout shift, and mobile rendering cost.

Session duration, total scroll distance, and raw return frequency are diagnostic
only. They are not success metrics.

## Non-goals for the experiment

- No infinite feed.
- No engagement-ranking model.
- No replacement for GitHub, code review, or the IDE.
- No swipe-only action or navigation.
- No removal of exact evidence to achieve a cleaner card.
- No migration of immutable edition data.
- No redesign of `System`, `Memory`, repository administration, or compiler
  mechanics until the `Now` experiment proves the interaction model.
- No large image library or remote runtime photography dependency.

## Recommendation

Proceed with Phases 0–2 as the next product slice. The current code already
proves the hard data and trust model; the highest-leverage uncertainty is now
whether those capabilities become more useful when composed as one continuous,
finite reading experience.

Keep the existing reader intact as the comparison baseline. Build the trail
with the current edition, current queue ranking, current evidence viewer, and
current state contracts. If the story-only version does not reduce friction to
trustworthy understanding, stop before expanding the content types or investing
in visual assets. If it does, the same interaction model can become the new face
of `Now` while `System` and `Memory` retain their depth.
