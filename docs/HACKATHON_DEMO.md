# Baxtori hackathon demo

## The one-sentence case

Baxtori is the quiet continuity layer after coding agents and review tools: Codex selects the few accepted changes that should alter a developer's mental model, publishes them as a finite field journal, and carries the developer's questions and watches into the next review.

## Who it is for

Solo developers and small, AI-heavy teams can now produce more code than they can continuously absorb. Pull-request reviewers are good at finding defects in one change. Coding agents are good at explaining or fixing something on demand. Neither gives a returning developer a calm, cross-repository answer to:

- What changed that is actually worth understanding?
- How did it alter the system I think I own?
- Which concern from last week should survive into this week?

Baxtori does not replace GitHub, Codex, CodeRabbit, Greptile, or a repository graph. It edits their evidence into maintained human understanding.

## Two-and-a-half minute demo

### 0:00 — Enter without ceremony

Open `https://www.baxtori.com`. The published edition is the home page; no login wall or product tour appears. Point out that it is finite, editorial, and scroll-first rather than an activity dashboard. A valid review may publish zero stories.

### 0:25 — Show a consequential change

Open the first story, read the brief and “Why it matters,” then open Evidence. The claim is tied to an exact repository, full base commit, full head commit, file, and line range. Publication validation checks the Git objects, ancestry, changed path, file existence, and line bounds when the source cache is available.

### 0:55 — Show the human feedback loop

Mark a story Understood, Watch another, and open Memory. Explain that questions, watches, comprehension, and re-review intent are durable account state. The next Codex review consumes those explicit signals instead of treating every edition as a blank prompt.

### 1:25 — Connect a real account

Choose Connect GitHub, install the read-only GitHub App on selected repositories, and open Sources. Repository visibility, source modes, activity, reader state, and memory are isolated by numeric GitHub user ID. Select Pinned, Automatic, or Muted for one repository and refresh to show persistence.

Be precise: the visible edition is a published example. Connecting an account does not pretend that a private edition has already been compiled. It proves safe multi-user source selection and memory; unattended per-account source retrieval and compilation remain the next boundary.

### 2:00 — Show the Codex implementation

Show `codex/review-instructions.md`, deterministic cursor-based collection, ignored `data/candidates.json`, ignored `data/review-run.json`, a published edition in `data/latest.json`, and immutable receipts in `data/review-runs/`. The scheduled Codex task performs the judgment-heavy work: clustering related changes, suppressing noise, checking exact evidence, incorporating human memory, and publishing nothing when no change deserves attention.

Finish with: “Review agents help code get merged. Baxtori helps the author remain able to explain what the merged system became.”

## Judging criteria

| Criterion | What the demo proves |
| --- | --- |
| Technological implementation | A non-trivial Codex workflow sits between deterministic Git evidence collection and strict edition/map validators. The versioned instruction contract and hashed run receipt identify inputs, source heads, model/runtime, processed feedback, human edits, output, and validation results. |
| Design | Anonymous entry goes directly to a coherent botanical field journal. The same Now, System, Memory, Evidence, and Sources loop works on desktop and mobile, with account connection introduced in context. |
| Potential impact | The audience is specific: developers overseeing agent-generated work across repositories. Baxtori reduces comprehension debt rather than adding another notification or review queue. |
| Quality of the idea | It treats code understanding as an edited, longitudinal publication. The novelty is selection plus continuity: what the human understood, questioned, or watched changes what Codex reviews next. |

## Account, automation, and cost boundary

The hackathon product uses one domain. Anonymous and connected readers share the same journal; authentication changes available evidence, source controls, and account memory rather than sending the user to a second product.

The hosted web app does not call a model API. The owner's local Codex automation compiles the published example using the owner's Codex usage, then commits validated edition files for normal deployment. OpenAI documents that Codex usage is included across ChatGPT plans with plan-dependent limits and optional additional credits, and that local scheduled automations work best while the machine is awake and Codex is running:

- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- https://openai.com/academy/codex-automations/

That means the current demo has ordinary hosting and database costs but no separate per-reader inference bill. It does **not** mean unlimited personalized editions are free. A real multi-tenant compiler must choose one explicit model:

1. bring your own Codex automation and usage;
2. manual compilation in a user's own workspace; or
3. hosted inference with quotas and paid usage.

Do not add billing for the hackathon. First prove that people want recurring comprehension enough to connect repositories and return. If they do, charge for dependable hosted compilation and team continuity—not for prettier access to GitHub metadata.

## Honest current limits

- Account source choices and memory are multi-user; scheduled compilation is still pinned to one explicit GitHub login.
- A repository outside `baxtori.sources.json` can be authorized and selected but cannot produce exact code claims until an unattended GitHub App installation-token collector can create an isolated source cache.
- A newly connected repository is shown as “not mapped” until a reviewed map exists. Baxtori never invents coverage.
- The GitHub App is read-only. Repository context export and write-back remain explicit future actions.
- Users can export or permanently delete Baxtori's account data. GitHub installation access remains separately controlled in GitHub.
- Authenticated route limits are process-local burst protection; GitHub and the backing data service remain the distributed enforcement layers.

## CI

Verification runs for every pull request and main-branch push. It uses Blacksmith when the repository variable `BLACKSMITH_ENABLED=true` and falls back to a GitHub-hosted Ubuntu runner otherwise. Both paths run lint, type-check, build, tests, validators, and desktop/mobile browser checks; browser reports are retained as workflow artifacts.

## After the hackathon

The next proof is one complete personalized loop: a user's repository changes, Codex selects one consequence, the user watches or questions it, and the following edition visibly responds to that decision. The implementation requirement is unattended GitHub App installation-token access, isolated temporary caches, and per-account compiler scheduling. Only after that should Baxtori add teams, hosted billing, app subdomains, generic integrations, or a broad all-in-one review surface.
