# Baxtori hackathon demo

## Short description

Baxtori turns merged changes across several repositories into a short,
evidence-backed reading edition and carries the reader's questions into the next
Codex review.

## Who it is for

I built Baxtori for solo developers and small teams using coding agents across
several projects. The agents can move faster than one person can keep every
system in their head. Baxtori reviews the work after it lands, picks the changes
that affect how the system works, and gives the owner a manageable way to catch
up.

## Demo video script — approximately 2:45

The quoted paragraphs are the voiceover. The italic text describes the shot.
Use cuts between the public and connected sessions so the video keeps moving.

### 0:00–0:22 — Why I built it

*Open `https://www.baxtori.com` at the top of Now and hold on the edition.*

> Hey, this is Baxtori. I built it after coding agents started moving work across my repositories faster than I could absorb it. I could follow each task while it happened, then come back a few days later and realize I had lost the larger shape of my own system.

### 0:22–0:48 — What Baxtori does

*Scroll through the contents and open the first story.*

> Baxtori reviews recent merged work and turns the changes worth understanding into a short edition. Each story gives me the change, its consequence, and a practical check. When every change falls below the publication threshold, the edition simply has zero stories. This page is the public example, and it opens directly into the full reading flow.

### 0:48–1:17 — Show the evidence

*Open Evidence. Show the base and head commits, the file and line range, then the
source and diff tabs.*

> The evidence view is the part I care about most. Every technical claim points to a repository, two full commit hashes, a changed file, and an exact line range. The publishing scripts verify each address, so I can read the explanation and inspect the underlying code in the same place.

### 1:17–1:43 — Show Memory

*Mark one story Understood, Watch another, then open Memory and show a topic that
appears across editions.*

> These controls turn my reading into input for the next review. I can mark something understood, watch a concern, or ask a question on a specific code range. Memory carries those decisions across editions, and the next Codex run receives them as review context.

### 1:43–2:05 — Connect GitHub

*Show the Connect GitHub button, then cut to an authorized test account and open
Sources. Change one repository mode.*

> Connect GitHub uses a read-only GitHub App. A connected account can choose its sources and sync its reading state, watches, and questions. The journal stays labeled as the public example while personalized compilation is being built. The account features already use real GitHub data.

### 2:05–2:39 — Codex and GPT-5.6

*Show the primary Codex task with `/status`, then briefly show
`codex/review-instructions.md`, `scripts/collect-backstory.mjs`,
`scripts/finalize-review-run.mjs`, and a passing validation result.*

> I built Baxtori with Codex and GPT-5.6. I used GPT-5.6 to work through the product model, trace authentication and data flows, implement the reader and GitHub features, review security, and run the tests. The review pipeline has a clear split: scripts collect the Git facts, Codex decides what matters and explains it, and validators check every published reference. The scheduled Codex task covers the owner's configured sources.

### 2:39–2:48 — Close

*Return to the journal with one evidence panel open.*

> Baxtori helps me keep up with what my agents and I ship, so I can explain the systems I own.

## Recording checklist

- Keep the final edit below three minutes and aim for about 2:45.
- Upload it publicly to YouTube with audible narration.
- Show `/status` from the primary build task with the Session ID and exact
  GPT-5.6 model name. Use that Session ID in the submission form.
- Confirm that the demo URL is running the intended Git commit before recording.
- Begin in a clean public browser session, then cut to an authorized test account
  for Sources.
- Describe the current edition as the public example and personalized compilation
  as the next product milestone.
- Show the receipt protocol and passing validators. Add a completed receipt to
  the shot when one exists.

## How the demo maps to judging

| Criterion | What the demo shows |
| --- | --- |
| Technological implementation | Codex sits between bounded Git collection and strict edition, evidence, selection, and map validation. The receipt protocol records the inputs, source heads, model/runtime, feedback, human edits, output, and validation result for a finalized run. |
| Design | The public link opens directly into a complete editorial reader. Now, System, Memory, Evidence, and Sources work across desktop and mobile. |
| Potential impact | Baxtori serves developers overseeing agent-generated work across multiple repositories and gives them a recurring way to rebuild their working knowledge. |
| Quality of the idea | The product combines editorial selection, exact code evidence, and reader memory so each review can respond to what the developer already understands and still cares about. |

## Current product boundary

The public and connected experiences share one journal. Authentication adds
GitHub evidence access, source controls, and synchronized reader memory. The
owner's local Codex automation compiles the public example and commits validated
edition files for deployment. The hosted application handles normal web and
database traffic and fetches exact code only when the reader requests it.

Source choices and reader memory already support multiple accounts. Scheduled
compilation currently uses one configured GitHub login. Repositories outside
`baxtori.sources.json` can be authorized and selected, then become eligible for
exact claims once an installation-token collector creates an isolated source
cache. A newly connected repository displays its current map status until a
completed review produces a map.

The next milestone is one personalized cycle from repository change to Codex
selection to reader feedback to a visibly responsive follow-up edition. That
work requires installation-token collection, isolated temporary caches,
per-account scheduling, and an explicit usage and consent model.

## Verification

Pull requests and main-branch pushes run lint, type-checking, builds, unit tests,
edition and map validators, and desktop/mobile browser checks. Blacksmith runs
the jobs when enabled, with GitHub-hosted runners available as the configured
fallback.
