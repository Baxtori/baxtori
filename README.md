# Baxtori

**Stay the author of your code.**

Baxtori is a durable, evidence-backed working memory for software built with
agents. It decides what is worth understanding, opens on the exact code, and
remembers the questions, watches, and system knowledge that should shape later
reviews. It is designed for a world where agents can produce more code than a
person can continuously absorb.

The product and information-density contract lives in
[`docs/NORTH_STAR.md`](docs/NORTH_STAR.md).

The product started as **Glimpse** and is being rebranded around
[baxtori.com](https://baxtori.com).

## Current capabilities

- A deliberately concise weekly briefing with details on demand
- Separate signals for learning value, code quality, and deliberate tradeoffs
- Mark-understood, watch, dismiss-project, focus, and keyboard-reading flows
- A deterministic 5, 15, or 30-minute Continue queue across stories, watches, map frontiers, questions, and re-review context
- A chronological activity view without notification or inbox behavior
- Account-backed reading state with an instant device fallback
- GitHub account sign-in with an encrypted, HttpOnly server session
- Fine-grained GitHub App access to repositories the user explicitly chooses
- Recent commit activity for selected private or public repositories
- Responsive layouts for desktop, tablet, and mobile
- A living Repo Map with an evidence-backed comprehension frontier
- Exact, commit-addressed code excerpts attached to every published explanation
- Guided execution-path walkthroughs with an invariant at every step
- A durable question ledger that preserves uncertainty instead of guessing
- An append-only map review history anchored to exact commits
- A 5, 15, or 30-minute study queue assembled from walkthroughs, frontiers, and open questions
- A review scope chosen in the app and consumed by the weekly compiler
- Candidate-versus-no-new-commits signals measured from the last completed rundown cursor
- Independent Repo Maps and learning state for every repository with enough reviewed evidence
- An explicit no-code-yet state instead of fabricated coverage for empty repositories
- Lock, dismiss, and re-review controls with versioned review lenses, custom guidance, and a durable review queue

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Create a GitHub App, then copy the values in `.env.example` to `.env.local`.
Configure the app with:

- Homepage URL: your Baxtori deployment
- Callback URL: `<deployment>/api/auth/github/callback`
- Setup URL (after installation): your Baxtori deployment
- Repository permissions: **Contents: Read-only** and **Metadata: Read-only**
- User-to-server token expiration: enabled

The GitHub App lets each person select the repositories Baxtori may read. User
access and refresh tokens are encrypted inside an HttpOnly cookie and never
sent to browser JavaScript. Use a random value of at least 32 bytes for
`GITHUB_SESSION_SECRET`.

## Validate a production build

```bash
npm run build
```

## Direction

```text
Selected GitHub or local repositories
  → incremental commit-range collection
  → related-change clustering
  → evidence-backed explanations
  → a concise Baxtori briefing
```

The next compiler layer is per-repository Git cursors and related-change
clustering: cite exact files and hunks, connect changes to existing map areas,
and publish nothing when a project has no meaningful new context.

## Weekly compiler

Baxtori keeps model inference outside the hosted app. A local Codex automation
uses the existing subscription to run the judgment-heavy review, while the
repository supplies a deterministic evidence pre-pass:

```bash
npm run backstory:collect
npm run backstory:validate
```

`baxtori.sources.json` defines the GitHub repositories and default branches in scope.
Its local paths are fetch caches only: collection fetches each remote and reads
`origin/<branch>`, so dirty worktrees and unpushed commits never enter a rundown.
Published stories also retain one to four exact code ranges in `codeEvidence`,
including the reviewed head and base commits. The reader opens on the matching
unified diff through authenticated GitHub routes, with the current implementation
one toggle away. GitHub credentials remain server-side and every line stays
anchored to an exact comparison. The full file and comparison remain one link away.
`data/review-scope.json` is the safe, client-visible half of that configuration:
it names the scheduled repositories, priorities, map coverage, review cursor, and
schedule without exposing local checkout paths. `npm run scope:validate` prevents
the visible scope and deterministic collector from drifting apart.
`data/candidates.json` is ignored scratch evidence. The automation writes a
concise, validated `data/latest.json` and archives the same edition under
`data/editions/`. Committing that edition updates the deployed app without any
separate model API billing. The reader assembles those versioned files into a
newest-first History view with repository, topic, question, watch, and text
filters. Opening an archived story uses its retained base commit, head commit,
path, and line range, so historical diffs remain inspectable even after the
current briefing moves on.

`data/review-policy.json` versions the available re-review lenses and rules that
must survive prompt changes. Convex stores each GitHub account's reading state,
repository choices, and queued re-review requests. The browser talks only to
authenticated Baxtori routes; the Convex URL and bridge secret remain server-side.
Before collection, the Monday automation exports that state into ignored scratch
input. Repository choices narrow the configured fetch caches, while review lenses
and custom guidance become explicit compiler input. Successfully considered
requests are marked processed after the review. Published editions and Repo Maps
remain versioned in Git rather than the application database.
`FEEDBACK_GITHUB_LOGIN` explicitly selects the account the local compiler may
consume, so another signed-in account can never silently become its input.
The completion command accepts only explicit request IDs from that export, which
keeps inaccessible or unhandled requests in the queue instead of discarding them.

The same prepass now compares changed files with every registered Repo Map area's evidence.
Its `mapImpact` output stays attributable by repository while naming affected areas, exact commits, and unmapped files.
The scheduled review must inspect those changes before adjusting confidence,
freshness, concepts, walkthroughs, or questions; a filename match alone never
rewrites repository knowledge.

## Progressive repository comprehension

`data/repository-maps.json` registers the evidence-backed dossiers under
`data/repo-map.json` and `data/maps/`. Each Repo Map combines breadth, depth, confidence, and
freshness into an explicitly estimated coverage score, then uses the reader's
understood, revisit, and not-worth-it feedback to choose a comprehension
frontier independently per repository. Review events retain the exact through-commit and files that were
classified, while the study queue packs unfinished walkthroughs and questions
into a reader-selected time budget. Validate it with:

```bash
npm run map:validate
```

The hosted application remains a standard Next.js app. `vercel.json` selects a
native Next.js build on Vercel, while the existing Sites build scripts remain
available during the hosting transition.
