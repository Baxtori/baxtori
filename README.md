# Baxtori

Baxtori turns repository changes into a short reading edition. Each story says
what changed, why it matters, and which code supports the explanation.

Readers can mark a story understood, watch it for later changes, or leave a
question on an exact code range. System maps reviewed repository areas. Memory
searches earlier editions and reader notes.

[Open Baxtori](https://www.baxtori.com)

## What works

- A finite, scroll-first edition on the home page, including valid quiet editions
- Commit-addressed diffs and current-code excerpts
- Read-only GitHub App access to selected repositories
- Per-account repository choices, reading state, watches, questions, and review requests
- Repository maps with reviewed areas, source files, walkthroughs, and open questions
- Search and filters across prior editions
- Cursor-based collection from the last reviewed commit, with explicit history-rewrite fallback
- Versioned Codex review instructions and an immutable run-receipt protocol
- A signed-out demo that does not require GitHub access
- Desktop and mobile browser tests

Baxtori does not write to connected repositories. The hosted app fetches code
from GitHub only when a reader opens an excerpt. It does not run a model over a
connected user's private code.

## Built with Codex and GPT-5.6

Baxtori was developed with Codex and GPT-5.6 during OpenAI Build Week. Codex
helped inspect the repository, challenge the product boundary, implement the
GitHub and account flows, refine the editorial reader, and repeatedly run the
project's tests and evidence validators. GPT-5.6 was used for the judgment-heavy
work: deciding which accepted changes deserve a developer's attention, tracing
their consequences across files, and turning exact Git evidence into a finite
reading edition.

The product workflow also uses a scheduled local Codex review. Deterministic
scripts collect bounded Git evidence; Codex performs selection and explanation;
strict validators check the resulting commit, path, range, archive, and map
claims before publication. The hosted demo itself does not invoke a model API or
send a connected reader's private code to the project owner's model account.

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
It uses Blacksmith when `BLACKSMITH_ENABLED=true`; otherwise it uses a GitHub-hosted
Ubuntu runner, so verification never disappears because a runner variable is absent.

## How editions are produced

The hosted app does not call a model. A scheduled local Codex task reviews the
configured repositories and writes versioned edition data to this repository.
The versioned judgment contract lives in `codex/review-instructions.md`.

```bash
npm run feedback:export   # optional account-scoped reader input
npm run edition:prepare  # collect evidence and create a hashed scratch manifest
# review candidates and edit data/latest.json, its archive, maps, and review-run fields
npm run edition:finalize # strict Git evidence checks and immutable run receipt
```

`edition:prepare` collects configured origin branches concurrently with bounded
Git commands. It prefers `last-reviewed-commit..origin/branch`, records history
rewrites, falls back to the configured time window when necessary, and reports
stale repository inventory. Local checkout paths never enter the candidate file.

`edition:finalize` refuses changed inputs or instructions, missing source caches,
short or unavailable commit hashes, invalid ancestry, unchanged evidence paths,
out-of-range lines, conflicting archives, and duplicate run IDs. Successful run
receipts live under `data/review-runs/` with source heads, instruction and input
hashes, model/runtime metadata, processed feedback IDs, human-edit notes, output
hash, and validator results.

`baxtori.sources.json` lists repositories that have an inspectable source cache.
`data/review-scope.json` contains the safe, client-visible review scope.
`data/candidates.json`, `data/feedback-input.json`, and `data/review-run.json` are
ignored scratch input. Published editions live in `data/latest.json` and
`data/editions/`; repository maps live in `data/repo-map.json` and `data/maps/`.

A connected repository outside `baxtori.sources.json` can currently be selected
and retained as authorized metadata, but it cannot produce exact code claims in
the scheduled review. Completing that loop requires unattended GitHub App
installation-token access and an isolated temporary source cache per account.

## Project notes

- [Product definition](docs/NORTH_STAR.md)
- [Roadmap](docs/PRODUCT_ROADMAP.md)
- [Security and account boundaries](docs/proposals/2026-07-22-account-memory-and-product-boundary.md)
- [Hackathon demo](docs/HACKATHON_DEMO.md)
- [Repository identity history](docs/REPOSITORY_IDENTITY.md)

The app runs as Next.js on Vercel and as a Vinext build on Sites.
