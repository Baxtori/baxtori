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

The next layer is the rundown compiler: track a per-repository Git cursor,
cluster related commits into stories, cite exact files and hunks, and publish
nothing when a project has no meaningful new context.

## Weekly compiler

Baxtori keeps model inference outside the hosted app. A local Codex automation
uses the existing subscription to run the judgment-heavy review, while the
repository supplies a deterministic evidence pre-pass:

```bash
npm run backstory:collect
npm run backstory:validate
```

`baxtori.sources.json` defines the local repositories in scope.
`data/candidates.json` is ignored scratch evidence. The automation writes a
concise, validated `data/latest.json` and archives the same edition under
`data/editions/`. Committing that edition updates the deployed app without any
separate model API billing.

The same prepass now compares changed files with each Repo Map area's evidence.
Its `mapImpact` output names affected areas, exact commits, and unmapped files.
The scheduled review must inspect those changes before adjusting confidence,
freshness, concepts, walkthroughs, or questions; a filename match alone never
rewrites repository knowledge.

## Progressive repository comprehension

`data/repo-map.json` keeps a small, evidence-backed dossier of important systems,
concepts, and decisions. The Repo Map combines breadth, depth, confidence, and
freshness into an explicitly estimated coverage score, then uses the reader's
understood, revisit, and not-worth-it feedback to choose a comprehension
frontier. Validate it with:

```bash
npm run map:validate
```

The hosted application remains a standard Next.js app. `vercel.json` selects a
native Next.js build on Vercel, while the existing Sites build scripts remain
available during the hosting transition.
