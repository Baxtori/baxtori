# Baxtori product roadmap

## Product thesis

Baxtori helps a person keep up with agent-produced code by turning repository changes into a small, evidence-backed reading habit.

The core promise is simple:

> Open Baxtori and immediately know the most valuable thing to understand next.

Baxtori already has the difficult ingredients: exact diffs, concise backstories, repository maps, walkthroughs, persistent questions, time-boxed study queues, repository selection, and a feedback path into the scheduled compiler. The next phase should make those ingredients feel like one continuous loop.

## Product principles

1. **One recommended next action.** The reader can always continue without deciding which subsystem to inspect first.
2. **Evidence before prose.** Explanations stay attached to exact repositories, commits, files, and line ranges.
3. **Memory across editions.** Watches, questions, and unfinished learning survive publication of a new weekly review.
4. **Quiet stays quiet.** Baxtori publishes and prompts only when useful context exists.
5. **Reader intent changes future review.** Watching, revisiting, dismissing, and asking questions become explicit compiler input.
6. **Every estimate explains itself.** Queue priority, map freshness, and related-topic matching expose their reasons.

## P0 — Reliability and identity

### Canonical repository identities

Finish the `glimpse` to `baxtori` repository migration across:

- scheduled review scope
- collector source configuration
- repository-map registry
- current edition data
- saved reading state
- map and question keys
- queued re-review requests

Legacy keys should continue to load, while all new writes use `teamleaderleo/baxtori`.

### Automation health

Add a compact validation report that confirms:

- every scheduled repository can be fetched
- every mapped repository resolves to a collector source
- review cursors point to reachable commits
- current code evidence still intersects the stated diff
- stale aliases stay outside active configuration

## P1 — Unified Continue queue

**Implemented:** a deterministic cross-surface queue now ranks unread stories,
watched follow-ups, map frontiers, revisit work, open questions, and re-review
requests that still need reader context. The reader gets one primary action,
an explicit reason, direct focus navigation, and 5, 15, or 30-minute plans.

Create one queue across:

- unread briefing stories
- watched follow-ups
- repository-map frontiers
- revisit areas
- open questions
- queued re-reviews needing more reader context

The landing view should show:

- one primary Continue action
- why it was selected
- estimated time
- a compact next-up list
- 5, 15, and 30-minute modes

The queue must be deterministic for the same state and jump directly to the relevant story, excerpt, walkthrough, or question.

Tracked in #18.

## P1 — Cross-edition memory

Turn Watch into a durable topic thread.

A watched topic should retain:

- repository and mapped area
- files and prior commit range
- the reader's prior verdict or question
- later stories that provide a follow-up
- resolved, snoozed, or still-watching state

A later edition should explain why it matched the watched topic. Weak filename-only matches should remain review input and stay out of the reader-facing feed.

**Implemented foundation:** Watch and evidence questions now share durable topic identities, and the deterministic collector proposes follow-up candidates only for exact retained paths or explicitly mapped areas. Every candidate remains compiler scratch input until review confirms the relationship and publishes new exact evidence.

Tracked in #19.

## P1 — Questions attached to evidence

Let the reader ask a question beside an exact code excerpt.

Store:

- repository
- base and head commits
- file path
- selected line range
- question text
- optional review lens

Questions can remain private reading notes or become explicit input to the next scheduled re-review.

## P2 — Edition archive and repository history

Add a history view that can:

- browse prior editions
- filter by repository and topic
- find unresolved questions and watched threads
- show how one mapped area changed across reviews
- reopen exact historical diffs

Historical editions remain immutable evidence records. Personal reading state lives separately.

## P2 — Map freshness review

Surface mapped areas touched after their last reviewed commit.

Each affected area should show:

- changed evidence files
- relevant commits
- previous confidence and freshness
- whether an explanation needs review
- a one-action re-review request

Git can trigger review. Human or model judgment updates meaning and confidence.

## P2 — Compiler preview

Turn the current candidate-commit preview into a useful preflight report:

- proposed related-change clusters
- likely routine changes filtered out
- watched topics touched
- maps needing freshness review
- queued reader questions and re-review lenses
- explicit reasons for publishing nothing

This preview should remain deterministic and free of generated conclusions.

## Polish backlog

### Navigation

- command palette for view changes and story actions
- one-handed mobile navigation
- direct resume links into stories, excerpts, walkthroughs, and questions
- browser history integration for major views and selected items

### Reading

- remember the active excerpt and scroll position
- clearer watched and revisit states
- compact completion animation with reduced-motion support
- better dense-diff wrapping and horizontal position recovery
- copy selected evidence with repository and commit context

### Feedback

- show saved, queued, processed, canceled, and superseded re-review history
- let readers edit a queued request before Monday
- explain which requests the compiler considered in the published edition

### Empty and error states

- distinguish no new commits, no selected changes, unavailable access, stale map, and empty repository
- give every recoverable state one primary action
- preserve useful cached reading when GitHub is temporarily unavailable

### Performance and code health

- split `app/page.tsx` into focused view and state modules
- isolate queue ranking and repository identity logic into pure tested modules
- reduce root rerenders while code excerpts load
- add interaction tests for hydration, keyboard reading, repository rename migration, and cross-edition carry-forward

## Suggested delivery order

1. Canonical repository identity migration and validation.
2. Pure Continue-queue ranking module with tests.
3. Continue panel in the briefing view.
4. Durable watch-topic model and cross-edition follow-ups.
5. Evidence-attached questions.
6. Edition archive and repository history.
7. Map freshness review and compiler preview.
8. Command palette, mobile navigation, and root reader decomposition.

## Success signals

- a reader reaches useful code from the landing view in one action
- unfinished work survives edition changes
- watched topics receive clear follow-ups
- repository renames preserve selections, map progress, and queued requests
- quiet weeks produce no artificial reading work
- every surfaced conclusion remains inspectable through exact evidence
