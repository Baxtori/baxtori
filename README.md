# Baxtori

Baxtori turns repository changes into a short reading edition. Each story says
what changed, why it matters, and which code supports the explanation.

Readers can mark a story understood, watch it for later changes, or leave a
question on an exact code range. System maps reviewed repository areas. Memory
searches earlier editions and reader notes.

[Open Baxtori](https://www.baxtori.com)

## What works

- A finite, scroll-first edition on the home page, including valid zero-story editions
- Commit-addressed diffs and current-code excerpts
- Read-only GitHub App access to selected repositories
- Per-account repository choices, reading state, watches, questions, and review requests
- Repository maps with reviewed areas, source files, walkthroughs, and open questions
- Search and filters across prior editions
- Cursor-based collection from the last reviewed commit, with explicit history-rewrite fallback
- Versioned Codex review instructions and an immutable run-receipt protocol
- A public example that opens directly from the demo link
- Desktop and mobile browser tests

The GitHub App has read-only permissions. The hosted app fetches code when a
reader opens an excerpt. Scheduled model work covers the owner's explicitly
configured source caches.

## Built with Codex and GPT-5.6

I built Baxtori with Codex and GPT-5.6 during OpenAI Build Week. I used Codex to
inspect the repository, work through the product boundary, implement the GitHub
and account flows, refine the reader, and run the project's tests and evidence
validators. GPT-5.6 handled work that needed judgment across the codebase:
selecting consequential changes, tracing their effects across files, and turning
exact Git evidence into a finite reading edition.

The review workflow runs as a scheduled local Codex task. Deterministic scripts
collect bounded Git evidence, Codex selects and explains the important changes,
and strict validators check every commit, path, range, archive, and map claim
before publication. The hosted demo serves validated edition files and fetches
requested evidence directly from GitHub.

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

Set `BAXTORI_APP_ORIGIN` to the canonical deployment origin and use a random
value of at least 32 bytes for `GITHUB_SESSION_SECRET`.

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

CI runs lint, type-check, build, unit validation, and desktop/mobile browser tests.
It uses Blacksmith when `BLACKSMITH_ENABLED=true` and a GitHub-hosted Ubuntu
runner for the fallback path.

## How editions are produced

A scheduled local Codex task reviews the configured repositories and writes
versioned edition data to this repository. The hosted app serves those validated
files. The versioned judgment contract lives in `codex/review-instructions.md`.

```bash
npm run feedback:export   # optional account-scoped reader input
npm run edition:prepare  # collect evidence and create a hashed scratch manifest
# review candidates and edit data/latest.json, its archive, maps, and review-run fields
npm run edition:finalize # strict Git evidence checks and immutable run receipt
```

`edition:prepare` collects configured origin branches concurrently with bounded
Git commands. It prefers `last-reviewed-commit..origin/branch`, records history
rewrites, falls back to the configured time window when necessary, and reports
stale repository inventory. The candidate file excludes local checkout paths.

`edition:finalize` blocks publication when inputs or instructions changed, source
caches are missing, commit hashes are short or unavailable, ancestry is invalid,
evidence paths are unchanged, line ranges fall outside the file, archives
conflict, or run IDs collide. Successful run receipts live under
`data/review-runs/` with source heads, instruction and input hashes,
model/runtime metadata, processed feedback IDs, human-edit notes, output hashes,
and validator results.

`baxtori.sources.json` lists repositories that have an inspectable source cache.
`data/review-scope.json` contains the safe, client-visible review scope.
`data/candidates.json`, `data/feedback-input.json`, and `data/review-run.json` are
ignored scratch input. Published editions live in `data/latest.json` and
`data/editions/`; repository maps live in `data/repo-map.json` and `data/maps/`.

A connected repository outside `baxtori.sources.json` is stored as authorized
metadata and becomes eligible for exact code claims after an unattended GitHub
App installation-token collector creates an isolated source cache for that
account.

## Project notes

- [Product definition](docs/NORTH_STAR.md)
- [Roadmap](docs/PRODUCT_ROADMAP.md)
- [Security and account boundaries](docs/proposals/2026-07-22-account-memory-and-product-boundary.md)
- [Hackathon demo](docs/HACKATHON_DEMO.md)
- [Repository identity history](docs/REPOSITORY_IDENTITY.md)

The app runs as Next.js on Vercel and as a Vinext build on Sites.
