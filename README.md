# Baxtori

Baxtori turns repository changes into a short reading edition. Each story says
what changed, why it matters, and which code supports the explanation.

Readers can mark a story understood, watch it for later changes, or leave a
question on an exact code range. System maps reviewed repository areas. Memory
searches earlier editions and reader notes.

[Open Baxtori](https://www.baxtori.com)

## What works

- A finite, scroll-first edition on the home page
- Commit-addressed diffs and current-code excerpts
- Read-only GitHub App access to selected repositories
- Per-account repository choices, reading state, watches, questions, and review requests
- Repository maps with reviewed areas, source files, walkthroughs, and open questions
- Search and filters across prior editions
- A configurable look-back window for the next review
- A signed-out demo that does not require GitHub access
- Desktop and mobile browser tests

Baxtori does not write to connected repositories. The hosted app fetches code
from GitHub only when a reader opens an excerpt. It does not run a model over a
connected user's private code.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Create a GitHub App and add the values described in `.env.example`. Configure:

- Homepage URL: your deployment URL
- Callback URL: `<deployment>/api/auth/github/callback`
- Setup URL: your deployment URL
- Repository permissions: **Contents: Read-only** and **Metadata: Read-only**
- User-to-server token expiration: enabled

Use a random value of at least 32 bytes for `GITHUB_SESSION_SECRET`.

The GitHub App installation controls which repositories Baxtori can see.
Authentication tokens remain in an encrypted, HttpOnly cookie. Account records
are keyed by numeric GitHub user ID. Readers can download or delete their stored
Baxtori data from Sources; GitHub App access is managed separately on GitHub.

## Validate

```bash
npm run lint
npm test
npm run test:visual
```

The visual suite runs the signed-out and connected flows at desktop and mobile
sizes and fails on browser exceptions.

## How editions are produced

The hosted app does not call a model. A scheduled local Codex task reviews the
configured repositories and writes versioned edition data to this repository.
The deterministic part of that workflow is available as:

```bash
npm run backstory:collect
npm run backstory:validate
npm run map:validate
npm run scope:validate
npm run policy:validate
```

`baxtori.sources.json` lists the repositories and branches available to the
collector. `data/review-scope.json` contains the safe, client-visible review
scope. `data/candidates.json` is ignored scratch input. Published editions live
in `data/latest.json` and `data/editions/`; repository maps live in
`data/repo-map.json` and `data/maps/`.

Published code evidence retains repository, base commit, head commit, file, and
line range. Old editions can therefore reopen the same comparison after the
current edition changes.

Repository choices and reader feedback are exported before a scheduled review.
They narrow the collection scope and provide review instructions. They do not
change an already published edition.

## Project notes

- [Product definition](docs/NORTH_STAR.md)
- [Roadmap](docs/PRODUCT_ROADMAP.md)
- [Security and account boundaries](docs/proposals/2026-07-22-account-memory-and-product-boundary.md)
- [Hackathon demo](docs/HACKATHON_DEMO.md)
- [Legacy repository aliases](docs/REPOSITORY_IDENTITY.md)

The app runs as Next.js on Vercel and as a Vinext build on Sites.
