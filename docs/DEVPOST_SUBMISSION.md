# Devpost submission copy

## About the project

### Inspiration

Coding agents changed the bottleneck in my work. I could make changes across
several repositories much faster, but I was becoming less certain that I still
understood the systems I owned. Pull-request review could tell me whether one
change was safe to merge, and a coding agent could explain a file when asked,
but neither preserved my mental model from one week to the next.

I built Baxtori around a different question: after the code is merged, which few
changes does the author actually need to understand?

### What it does

Baxtori turns accepted repository changes into a finite, evidence-backed reading
edition. It is intentionally closer to a field journal than an activity feed.
Each story explains what changed, why it matters, what to verify, and the
tradeoff, then links the claim to an exact repository, base commit, head commit,
file, and line range.

The experience has three primary spaces:

- **Now** is the current edited edition. It may contain a few consequential
  stories—or no stories when nothing clears the publication threshold.
- **System** maps reviewed repository areas, source files, walkthroughs, and
  unresolved questions without pretending that unmapped code is understood.
- **Memory** carries watched concerns, questions, prior editions, and the
  reader's own understanding forward over time.

A reader can use the complete public example without signing in. Connecting
GitHub uses a read-only GitHub App and adds account-scoped source controls and
durable reader memory. The current journal stays clearly labeled as a public
example; Baxtori does not pretend that connecting a repository has already
compiled a private edition.

### How I built it

I built Baxtori with Codex and GPT-5.6 as both an engineering partner and part of
the review workflow.

The compiler deliberately separates deterministic evidence work from model
judgment:

1. Bounded Node.js scripts collect commits from configured repository branches.
   They use the last reviewed commit as a cursor, record history rewrites, and
   fall back to a limited time window when necessary.
2. A versioned Codex instruction contract asks GPT-5.6 to cluster related
   changes, suppress routine noise, incorporate explicit human watches and
   questions, and select only findings that deserve publication.
3. Strict validators check commit existence, ancestry, changed paths, source
   availability, line bounds, edition archives, repository maps, and the
   selection ledger before an edition can be finalized.
4. An immutable receipt protocol records input and instruction hashes, source
   heads, model/runtime metadata, processed feedback, human edits, output hashes,
   and validation results for finalized review runs.

The reader is a responsive Next.js and React application written in TypeScript.
It uses a read-only GitHub App for authentication and on-demand evidence, Convex
for account-scoped state, AES-GCM encrypted session material in secure HttpOnly
cookies, and same-origin mutation checks. The public example is deployed on
Vercel. The project also supports a Vinext build, and Playwright exercises the
same reading experience on desktop and mobile.

Codex and GPT-5.6 accelerated the work beyond code generation. I used them to
inspect the repository as a whole, challenge the product boundary, trace OAuth
and data-isolation risks, design the evidence contract, implement and refactor
the reader, and repeatedly run builds, tests, and validators. Some of the most
important decisions came from asking Codex to argue against the product: that
led to clearer privacy language, a strict distinction between public evidence
and personal memory, and a refusal to imply that an authorized repository had
already been reviewed.

### Challenges

The hardest challenge was selection. Summarizing every commit is easy but creates
another inbox. Baxtori needed an explicit publication threshold, a reading-time
budget, and a valid quiet edition so that omission became a trustworthy product
behavior rather than an accident.

The second challenge was provenance. AI-written explanations feel confident even
when their evidence has drifted. Commit-addressed excerpts, changed-path checks,
line-bound validation, immutable archives, and fail-closed evidence APIs were all
necessary to make the journal inspectable.

The third challenge was drawing an honest multi-user boundary. The GitHub App can
list authorized repositories and fetch exact code on demand, while personal
reading state belongs to one numeric GitHub user ID. The owner's scheduled Codex
task must not silently spend model usage on, or copy code from, a connected
reader's private repositories. The demo therefore proves safe source selection
and durable memory while treating unattended per-account compilation as the next
boundary, not as a finished feature.

Finally, the product had to remain calm while holding dense technical material.
Progressive disclosure, a finite scroll trail, keyboard navigation, responsive
evidence views, and a botanical editorial system kept the experience from
collapsing into another engineering dashboard.

### What I learned

I learned that the most useful role for a model here is editorial judgment
inside deterministic boundaries. Git should establish what is true; validators
should establish what is publishable; GPT-5.6 should decide what is consequential
and explain why.

I also learned that developer memory is product data. “Understood,” “watch,” and
an unresolved question are not cosmetic reactions. They are durable inputs that
should change what the next review investigates.

Most importantly, an AI product earns trust as much through what it refuses to
claim as through what it generates. Baxtori records quiet repositories,
inaccessible sources, deferred findings, and unmapped areas rather than filling
those gaps with plausible prose.

### What I am proud of

- A working public product with no login wall
- Exact commit-addressed code and diff evidence inside the reading flow
- A real read-only GitHub App and account-isolated source and memory controls
- Five published stories with sixteen Git-validated excerpts in the current
  example edition
- A valid zero-story edition path
- A versioned Codex review contract, selection ledger, and strict finalization
  protocol
- 165 unit and validation tests plus 14 desktop/mobile browser tests
- A distinctive product experience instead of a generic AI chat or dashboard

### What's next

The next proof is one complete personalized loop: a connected repository changes,
Codex selects one consequence, the reader watches or questions it, and the next
private edition visibly responds. That requires unattended GitHub App
installation-token access, isolated temporary source caches, per-account
scheduling, and an explicit usage and consent model. I want to prove that loop
before adding teams, billing, or a broader all-in-one review surface.

## Built with

Copy these as Devpost tags (18 total):

`OpenAI Codex`, `GPT-5.6`, `Next.js`, `React`, `TypeScript`, `Node.js`, `Vercel`,
`GitHub`, `GitHub API`, `GitHub Apps`, `OAuth`, `Convex`, `Playwright`, `Vinext`,
`Cloudflare Workers`, `Blacksmith`, `CSS`, `Web Crypto API`

## Installation, platforms, and testing

### Fastest judging path

1. Open [https://www.baxtori.com](https://www.baxtori.com) in a modern desktop or
   mobile browser. No account or sample-data import is required.
2. Read the first story and open **Evidence** to inspect its exact commit, file,
   lines, source view, and diff.
3. Mark a story **Understood**, mark another **Watch**, and open **Memory** to see
   how reader intent persists across the journal.
4. Open **System** to inspect repository maps, reviewed source files, walkthroughs,
   and open questions.
5. GitHub connection is optional. If used, authorize only repositories you are
   comfortable exposing to the read-only GitHub App, then open **Sources** and
   change one repository between Pinned, Automatic, and Muted.

### Supported platforms

- Hosted responsive web application intended for modern browsers
- Automated coverage on current desktop Chromium and a Pixel 7 mobile profile;
  Chrome or Edge is the simplest judging path
- Local development on macOS, Linux, or Windows through WSL with Node.js 22.13
  or newer

### Local installation

```bash
git clone https://github.com/Baxtori/baxtori.git
cd baxtori
npm install
cp .env.example .env.local
npm run dev
```

The signed-out public reader runs without GitHub or Convex credentials. To test
account features, create a GitHub App and populate the variables documented in
`.env.example`. The App needs only **Contents: Read-only** and **Metadata:
Read-only** repository permissions.

### Verification

```bash
npm run lint
npm test
npm run test:visual
npx next build
```

The test suite covers evidence parsing, OAuth and request boundaries, repository
identity and modes, account-state behavior, edition selection and validation,
repository maps, and the complete desktop/mobile reader path.
