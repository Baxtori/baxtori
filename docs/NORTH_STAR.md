# Baxtori north star

## The job

Codex can produce more software than a person can continuously absorb. Baxtori
helps that person remain the author of the resulting system.

> After agents work, show me the one thing most worth understanding, teach it
> through exact evidence, and remember what I still care about.

Baxtori is not a repository summarizer, activity feed, code-quality score, or
replacement for GitHub. It is a durable, evidence-backed working memory shared
by a developer, their agents, and an evolving codebase.

The unit of value is not a generated explanation. It is maintained
comprehension.

## The utility horizon

Baxtori must work at three time scales.

| Horizon | Reader question | Required outcome |
| --- | --- | --- |
| 30 seconds | Does anything deserve my attention? | One justified next action, or an honest quiet state. |
| 10 minutes | Can I genuinely understand it? | Exact diffs, current code, system bearings, tradeoffs, and a useful reader decision. |
| Over time | Can I reconstruct and steer what happened? | Durable questions, watched topics, repository understanding, immutable editions, and future reviews shaped by reader intent. |

The product succeeds only when these horizons form one loop. A strong first
briefing without useful return visits is a demo. A large archive without an
obvious next action is a database.

## Information-density contract

> Low-density orientation, high-density inspection, zero density when nothing
> matters.

Baxtori compresses attention without throwing information away.

### Orientation: Now

The first screen answers only:

- what deserves attention;
- why it was selected;
- where it came from;
- how long it should take;
- whether anything else is waiting.

It must not lead with compiler mechanics, repository administration, scores, or
a grid of equally weighted changes.

### Inspection: Understand

Once the reader opens a finding, density is a feature. The inspection layer may
show:

- exact base and head commits;
- the relevant diff and current code;
- file, line, repository, and mapped-area bearings;
- selection reasoning and uncertainty;
- what changed, why it matters, how to verify it, and its tradeoffs;
- related paths and prior context;
- questions attached to exact lines;
- direct GitHub evidence.

No evidence required for a conclusion may be removed merely to make this layer
look cleaner. Progressive disclosure controls when density appears, not whether
the information exists.

### Continuity: Memory

Memory answers:

- what did I understand;
- what remains unresolved;
- what am I watching;
- what did I ask the next review to reconsider;
- how did this topic or system area change;
- what exact evidence supported an earlier explanation.

Published editions remain immutable. Personal state remains editable and is
stored separately. Weak inferred relationships never silently become reader
memory.

## Product face

The reader has three primary destinations:

1. **Now** — the current attention decision and its deep reads.
2. **System** — the evidence-backed model of how repositories fit together.
3. **Memory** — questions, watches, prior editions, and exact historical evidence.

Timeline, repository scope, compiler selection records, account state, and
policy are essential supporting tools. They remain accessible, but they do not
compete with the three reader jobs.

## The recurring loop

1. Codex or another agent changes a repository.
2. The deterministic preflight gathers attributable evidence.
3. Editorial judgment decides whether human understanding should change.
4. Baxtori recommends one next action and explains why.
5. The reader inspects exact evidence.
6. The reader understands, questions, watches, dismisses, or requests review.
7. That explicit state constrains future review.
8. The next edition either advances the thread or stays quiet.

Every step must be inspectable. Generated confidence is not evidence.

## Practical-utility requirements

Baxtori must remain valuable after generated prose stops feeling novel:

- Return visits begin with a useful next action, not an inbox to triage.
- Quiet repositories and quiet weeks create no artificial work.
- Exact evidence remains reproducible after the current edition changes.
- Watches produce attributable advances, not filename-based notifications.
- Questions visibly resolve, remain open, or are considered by the compiler.
- Repository maps expose freshness and confidence rather than pretending to be
  complete architecture documentation.
- A mistaken interpretation can be corrected and re-reviewed without erasing
  the original evidence.
- Failure states preserve useful cached reading and identify the broken
  boundary.
- The product remains keyboard accessible, mobile readable, and fast enough to
  use as a habit.

## Feature admission test

A feature belongs only if it materially improves at least one of these:

1. Direct attention more intelligently.
2. Increase understanding through trustworthy evidence.
3. Preserve understanding across time.
4. Turn human intent into better future agent work.

If it does none of them, it is dashboard furniture.

## Anti-goals

Baxtori does not optimize for:

- the number of summaries generated;
- the number of repositories connected;
- a complete feed of activity;
- invented precision such as unsupported understanding or quality scores;
- replacing source control, code review, or an IDE;
- keeping the reader engaged when there is nothing useful to learn.

## Measures

The north-star measure is **time to trustworthy understanding**.

Supporting signals are:

- time from opening Baxtori to exact relevant code;
- percentage of recommendations that receive an explicit reader decision;
- open questions later resolved by attributable evidence;
- watched topics that produce confirmed, non-noisy follow-ups;
- successful reopening of historical evidence;
- quiet editions that remain empty;
- whether a reader can explain the most consequential agent-produced change in
  ten minutes.

## Experience bar

The defining moment is not “Baxtori summarized my repository.” It is:

> A large amount of agent work happened. Baxtori found the one thing that
> changed my understanding, took me to the proof, and remembered what I decided.

That is the standard for the product, the hackathon demonstration, and future
roadmap decisions.
