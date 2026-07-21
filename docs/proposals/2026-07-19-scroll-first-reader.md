# Scroll-first Baxtori reader proposal

**Date:** 2026-07-19  
**Status:** Product and implementation proposal  
**Decision target:** The next reader experience after the current Now / System / Memory loop

## Recommendation

Turn **Now** into a finite, scroll-first reading trail.

The reader should open Baxtori and move through a sequence of full, legible scenes with the wheel, trackpad, touch, arrow keys, or `J` / `K`. The first scene carries the single highest-value Continue choice. Later scenes carry the rest of the chosen attention window. Each story reveals its synopsis, selection reason, repository bearings, and available evidence without requiring a click to discover the next meaningful unit.

Keep the trail finite. A satisfying end reinforces Baxtori's editorial promise: the product chooses what deserves attention and becomes quiet when the useful reading ends. The experience can feel as fluid as a social feed while serving comprehension instead of engagement.

Use horizontal movement inside a scene for adjacent evidence excerpts or clearly labeled reading layers. Every horizontal destination also needs visible controls and keyboard access. Durable actions such as Understand, Watch, Ask, Dismiss, and Re-review stay explicit buttons; swipes should move through content, never trigger an easy-to-miss destructive decision.

This direction fits the product already present in the repository. The compiler, evidence model, Continue ranking, topic memory, questions, and edition history carry most of the difficult logic. The next gain comes from presenting those systems as one continuous act of reading.

## What the current code says

Baxtori already has a coherent product model:

- `docs/NORTH_STAR.md` defines one justified next action, exact evidence, durable memory, and honest silence.
- `lib/continue-queue.ts` already creates a deterministic queue across stories, watched work, map areas, questions, and re-review context.
- `data/latest.json` already contains concise story copy, learning value, exact code evidence, commits, verification guidance, and tradeoffs.
- `app/story-code.tsx` already supports exact diffs, current code, evidence tabs, questions, full-screen reading, and repository bearings.
- `app/edition-history.tsx`, topic threads, and evidence-attached questions already support continuity across editions.
- `tests/visual/reader.spec.ts` already exercises the public entrance, the demo briefing, exact evidence, and cross-edition memory on desktop and mobile.

The signed-in reader currently presents these systems through a large root page with a persistent rail, a masthead, a Continue panel, a Deep reads list, an edition record, a repository map, history, and repository controls. A story still requires an **Open backstory** action before its exact evidence and supporting explanation become part of the reading flow.

That creates two overlapping navigation layers:

1. Continue recommends the next item.
2. The reader lands in a conventional list and opens the item again.

The current story row also grows into a broad control surface: Open backstory, Got it, Watch, Lock, Re-review, Dismiss, code tabs, question controls, and explanation details. Each capability belongs. Their simultaneous presentation makes the reader scan controls when the product wants them to read.

The implementation reflects the same accumulation. `app/page.tsx` owns authentication, hydration, repository loading, activity preview, feedback sync, queue planning, keyboard movement, all primary views, and most reader actions. `app/globals.css` owns the styling for the entire product. A scroll-first redesign inside those files would increase risk and make comparison harder.

## Product concept: the Baxtori trail

### 1. One scene per meaningful unit

The vertical trail contains a small number of scene types:

1. **Edition opening** — period, generated time, repository scope, attention window, and a one-sentence account of why this edition has work.
2. **Return scene** — an evidence-backed follow-up to a watched topic or open question.
3. **Story scene** — one published backstory with its selection reason and exact evidence.
4. **Study scene** — a map frontier or repository question selected by Continue.
5. **Edition end** — caught up, deferred work, quiet repositories, and the next scheduled review.

The current `ContinueItem` remains the ordering source. The first version can derive trail scenes from existing queue items and current edition stories, with no compiler schema change.

### 2. The first viewport earns the visit

The first viewport should answer:

- What deserves attention?
- Why did it win?
- Where did it come from?
- How long will it take?
- What movement continues the reading?

The current Continue decision already provides the title, reason, repository, and estimated minutes. Present that decision as the opening scene itself. Remove the extra handoff from Continue card to Deep reads list.

### 3. Scrolling reveals the synopsis by default

A story scene should include, without expansion:

- project and repository;
- title and brief;
- the literal selection reason;
- estimated reading time;
- exact evidence count;
- the primary evidence title and file bearing;
- compact actions: **Understand**, **Watch**, **Ask**, **Evidence**.

The reader reaches the next story by scrolling. Evidence opens within the current scene as a reading layer, a full-screen workspace, or a horizontally adjacent panel.

### 4. Horizontal movement stays local

Horizontal paging suits content with a natural sibling relationship:

- evidence excerpt 1 / 2 / 3;
- diff / current code;
- synopsis / evidence / explanation;
- earlier evidence / current evidence inside a durable thread.

Use a visible segmented control or tabs alongside touch swiping. Trackpads frequently produce diagonal movement, so the horizontal region should lock only after a clear horizontal gesture. Desktop readers keep click, arrow-key, and tab access.

Tinder-style left/right decisions would make durable reading state too easy to trigger accidentally. Baxtori's actions deserve deliberate controls.

### 5. Every edition ends

Avoid an infinite feed. The reader should encounter a clear final scene:

> You reached the end of this edition.

That scene can show:

- understood stories;
- watches and open questions created during the session;
- deferred items outside the chosen attention window;
- quiet repositories;
- next review date;
- a link into Memory or System.

A quiet edition can open directly on a quiet scene. This preserves the strongest part of Baxtori's identity: selective silence.

## Nature as the visual language

Nature can give Baxtori warmth and authorship without weakening technical precision.

The visual source should be **botanical study, not scenic photography**. A detached landscape or arbitrary nature photograph turns the reader into a generic travel blog. A nature-printed plate, herbarium specimen, or careful botanical drawing has the same evidentiary character as Baxtori: a real subject, isolated, labeled, and preserved closely enough to inspect.

Use that material structurally:

- one large, complete specimen in a reserved folio margin;
- a bottom-to-top reveal tied to reading progress, so the specimen appears to grow with the walk;
- large, inspectable crops of a second plate beside each synopsis—not detached leaf icons or thumbnail ornaments;
- plate number, historical species name, printer, and date as real caption information;
- serif editorial type, ruled paper, generous margins, and restrained accession-label typography;
- still imagery for reduced-motion readers.

Avoid synthetic sprigs assembled from repeated leaf shapes, arbitrary stock photography, decorative image cards, distressed scrapbook effects, and fake taxonomic labels. They imitate the category without carrying its authority. Keep code, evidence claims, and status language literal. A fern should never imply test success, risk, confidence, or code quality unless the interface also states that meaning in text. The visual language carries pace and atmosphere while the technical layer carries proof.

The first implementation uses Henry Bradbury's public-domain nature prints from Thomas Moore's *The Ferns of Great Britain and Ireland*: the male fern plate supplies the full reading-progress specimen and its naturally curled juvenile frond; the bracken plate supplies a substantial specimen study for each story. The reference is the scale of a botanical atlas or herbarium sheet: the plant occupies most of its allotted plate and metadata stays in a compact factual label. Preserve the original scan pixels locally, record the source and public-domain status beside the files, and do cropping, blending, and reveal in CSS. Remote hotlinks would add privacy, reliability, and visual-consistency problems.

The motion is progressive disclosure rather than a literal biological simulation: CSS scroll-driven animation reveals the real plate from its base upward while subtly settling its scale and ink tone. A requestAnimationFrame fallback supports browsers without scroll timelines, and reduced-motion mode presents the complete static specimen. This keeps the morphology credible and makes the animation subordinate to scrolling.

## Implementation sequence

### Phase 0 — Separate the reader before redesigning it

Land a refactor that preserves the current interface and moves responsibilities out of `app/page.tsx`.

Suggested files:

```text
app/reader/reader-shell.tsx
app/reader/reader-navigation.tsx
app/reader/now-view.tsx
app/reader/use-reader-state.ts
app/reader/use-feedback-sync.ts
app/reader/use-repository-library.ts
app/reader/reader.module.css
lib/reader-trail.ts
```

Keep repository controls, history, maps, and exact evidence components intact. Move state and side effects behind focused hooks. Split feature styling from `app/globals.css` as each component moves.

This refactor should preserve URLs, local storage keys, account payloads, repository aliases, and current tests.

### Phase 1 — Add a comparison route

Build the trail as an alternate reader at first:

```text
/?demo=1&reader=trail
```

The existing interface remains available through `reader=classic` during comparison. The saved reader mode can stay device-local during the experiment.

Create a pure adapter in `lib/reader-trail.ts`:

```ts
type TrailScene =
  | EditionOpeningScene
  | ThreadReturnScene
  | StoryScene
  | StudyScene
  | EditionEndScene;

function buildReaderTrail(input: BuildReaderTrailInput): TrailScene[];
```

The adapter should consume:

- the current edition;
- `buildContinueQueue` output;
- the planned attention window;
- story state;
- topic threads;
- evidence questions;
- map state;
- edition selection records.

Keep the ordering deterministic and test it as pure logic.

### Phase 2 — Build vertical scene navigation

Implement a finite scroll container with:

- `scroll-snap-type: y proximity` on desktop;
- stronger snapping on touch-sized viewports after testing;
- one scene anchor per trail item;
- `IntersectionObserver` to track the active scene;
- URL state for the active item, such as `item=story-id`;
- restored scroll position after opening evidence, Memory, or System;
- `J` / `K`, arrow keys, Page Up / Page Down, and visible next/previous controls;
- reduced-motion behavior using immediate movement and still transitions.

Use normal document flow as the accessibility baseline. Scroll snapping should assist movement and should never trap it.

Virtualization offers little value for the current edition size and would complicate browser find, focus restoration, screen readers, and dynamic story height. Add windowing later for very long history views after measurement proves a need.

### Phase 3 — Make evidence part of the scene

Refactor the story presentation around progressive reading layers:

```text
StoryScene
  ├─ StorySynopsis
  ├─ StoryActions
  ├─ EvidencePager
  │    ├─ RepositoryBearing
  │    ├─ DiffReader
  │    └─ CurrentCodeReader
  ├─ ExplanationPanel
  └─ QuestionComposer
```

Load the first evidence summary with the scene. Fetch code for the active scene and prefetch the next scene only. Keep full-screen code reading for sustained inspection.

Horizontal swipe can move among evidence excerpts. A tablist and previous/next buttons provide the same movement. Preserve selected excerpt and diff/current-code mode in the URL or reader state.

### Phase 4 — Reduce action noise

The story scene should carry four immediate actions:

- **Understand**
- **Watch**
- **Ask**
- **Evidence**

Place Lock, Dismiss, and Re-review inside a compact More menu or the expanded explanation layer. Keep every action available; prioritize the actions that close Baxtori's core loop.

After Understand, acknowledge the choice with a brief botanical motion and reveal the next-scene cue. Preserve reader control over movement; avoid forced auto-scroll.

### Phase 5 — Bring cross-edition returns to the front

Place strong follow-ups to watched topics and queued questions before ordinary new stories. The compiler already proposes evidence-backed candidates. The trail should make the return legible:

- what the reader previously watched or asked;
- the earlier evidence;
- the new evidence;
- why the match qualified;
- Resolve, Keep open, Ask again, and Open evidence.

This is the most valuable recurring moment in the product and deserves its own scene type.

### Phase 6 — Add the nature system

Treat this phase as an editorial art system, not an asset gallery. Start with a tiny set of source-backed botanical plates and reuse them through scale, crop, and reveal. Add variety only when a new plate serves a distinct structural role.

Suggested files:

```text
public/art/README.md
public/art/male-fern-nature-print.png
public/art/bracken-nature-print.png
app/botanical-progress.tsx
app/trail-reader.module.css
```

Start with:

- one viewport-scale specimen that grows with the whole reading trail;
- one secondary plate for large, scene-level specimen studies;
- factual captions and provenance recorded in the repository;
- native scroll-timeline animation, a small JavaScript fallback, and a complete reduced-motion state.

Set an explicit media budget and verify the first recommendation remains readable before imagery completes loading. The reading column must never move when a plate arrives, and mobile crops must stay faint enough that text remains primary.

## Interaction and accessibility rules

The trail ships only when all of these hold:

- A reader can move through the full edition with touch, wheel, keyboard, and visible controls.
- Every swipe destination has a button or tab equivalent.
- Focus follows programmatic navigation and returns after closing full-screen evidence.
- Deep links reopen the exact scene and evidence excerpt.
- Reduced-motion mode removes scroll animation, parallax, bloom, falling-leaf, and crossfade movement.
- Browser zoom and large text preserve readable scenes without fixed-height clipping.
- Screen-reader order follows the visual reading order.
- Understand, Watch, Ask, Dismiss, and Re-review announce state changes.
- A quiet edition remains a complete and useful screen.

## Test plan

Extend Playwright beyond screenshots into interaction coverage.

### Trail logic tests

- deterministic scene order for identical input;
- attention-window packing;
- watched follow-up before ordinary story;
- understood story removal;
- quiet edition output;
- deferred items represented in the end scene;
- repository alias preservation;
- stable scene IDs across rerenders.

### Browser tests

- open `reader=trail` in the published demo;
- move through scenes using wheel, touch emulation, `J` / `K`, and buttons;
- open evidence and return to the same scene;
- switch evidence excerpts with tabs and arrow keys;
- Understand a story and verify Continue advances;
- Watch a story and verify Memory reflects it;
- ask an evidence-attached question;
- reload and restore the active scene;
- use browser Back and Forward across scene deep links;
- verify reduced-motion mode;
- verify the quiet end scene;
- capture desktop and mobile visual artifacts.

## Comparison criteria

Compare classic and trail readers using the same edition and the same demo account state.

Primary signals:

- time from entry to the first opened exact evidence range;
- percentage of surfaced stories receiving an explicit reader decision;
- percentage of sessions reaching the end scene;
- questions or watches created per opened evidence item;
- successful resume to the same story and excerpt;
- return after later editions;
- browser errors, focus failures, accidental horizontal movement, and abandoned evidence loads.

Scroll depth can diagnose friction. It should never become an engagement target.

Qualitative questions:

- Did the reader know what to read first?
- Did the next unit feel obvious without scanning navigation?
- Did nature make the session calmer and more memorable?
- Did the imagery ever compete with the code?
- Did the reader understand why each scene appeared?
- Did the ending feel complete?

## Relationship to current repository work

The open repository-discovery and activity-snapshot work advances the compiler input side. The scroll-first reader advances presentation and comprehension. They can proceed independently, with one coordination point: pending changes to `app/page.tsx` should merge or rebase before the reader extraction begins to reduce conflicts.

The scroll-first work requires no new ranking model, hosted inference, repository indexing system, or edition schema for its first release. It reuses the product logic already built and gives that logic a distinctive reading experience.

## Proposed first three pull requests

### PR 1 — Extract the classic reader

- split reader state and side effects from `app/page.tsx`;
- move the current Now view into focused components;
- split reader styles;
- preserve behavior and visual tests.

### PR 2 — Add the trail comparison mode

- add `reader=trail`;
- build pure trail scenes from existing data;
- implement vertical scene movement and deep links;
- add desktop/mobile interaction tests;
- keep classic mode available.

### PR 3 — Integrate evidence and reader actions

- embed synopsis and evidence in each story scene;
- add horizontal evidence paging with visible alternatives;
- move secondary actions into More;
- restore scene and excerpt position;
- add the first restrained botanical opening and completion motion.

## Final product call

Baxtori should become the place where a developer takes a walk through recent code.

The compiler decides what deserves the path. The trail sets the pace. Exact evidence keeps every explanation honest. Reader actions create memory. Nature gives the experience grace. The edition ends when the useful reading ends.

That is a credible solo-maker advantage: a technical product with conviction, rhythm, and a world of its own.
