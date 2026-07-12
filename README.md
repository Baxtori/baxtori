# Baxtori

**The backstory behind your code.**

Baxtori is a calm personal briefing that explains what changed across selected
repositories, why it matters, and where to start reading. It is designed for a
world where agents can produce more code than a person wants to review day by
day.

The product started as **Glimpse** and is being rebranded around
[baxtori.com](https://baxtori.com).

## Current capabilities

- A deliberately concise weekly briefing with details on demand
- Separate signals for learning value, code quality, and deliberate tradeoffs
- Mark-understood, watch, quiet-project, focus, and keyboard-reading flows
- A chronological activity view without notification or inbox behavior
- Device-local reading state
- GitHub account sign-in with an encrypted, HttpOnly server session
- Fine-grained GitHub App access to repositories the user explicitly chooses
- Recent commit activity for selected private or public repositories
- Responsive layouts for desktop, tablet, and mobile
- A living Repo Map with an evidence-backed comprehension frontier
- Guided execution-path walkthroughs with an invariant at every step
- A durable question ledger that preserves uncertainty instead of guessing
- An append-only map review history anchored to exact commits
- A 5, 15, or 30-minute study queue assembled from walkthroughs, frontiers, and open questions
- A validated scheduled-review scope with an honest preview-only state for device-local additions
- Candidate-versus-likely-quiet signals measured from the last completed rundown cursor
- Independent Repo Maps and learning state for every repository with enough reviewed evidence
- An explicit no-code-yet state instead of fabricated coverage for empty repositories
- Lock, dismiss, and re-review controls with versioned review lenses and custom guidance

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
  → a quiet Baxtori briefing
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
`data/review-scope.json` is the safe, client-visible half of that configuration:
it names the scheduled repositories, priorities, map coverage, review cursor, and
schedule without exposing local checkout paths. `npm run scope:validate` prevents
the visible scope and deterministic collector from drifting apart.
`data/candidates.json` is ignored scratch evidence. The automation writes a
concise, validated `data/latest.json` and archives the same edition under
`data/editions/`. Committing that edition updates the deployed app without any
separate model API billing.

`data/review-policy.json` versions the available re-review lenses and rules that
must survive prompt changes. Story locks, dismissals, and prepared re-review
requests are account-scoped on the current device; the app labels that boundary
instead of pretending the local Monday automation can read browser storage.

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
