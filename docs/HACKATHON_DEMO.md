# Baxtori hackathon demo

## The one-sentence case

Baxtori is the quiet continuity layer after coding agents and review tools: Codex selects the few accepted changes that should alter a developer's mental model, publishes them as a finite field journal, and carries the developer's questions and watches into the next review.

## Who it is for

Solo developers and small, AI-heavy teams can now produce more code than they can continuously absorb. Pull-request reviewers are good at finding defects in one change. Coding agents are good at explaining or fixing something on demand. Neither gives a returning developer a calm, cross-repository answer to:

- What changed that is actually worth understanding?
- How did it alter the system I think I own?
- Which concern from last week should survive into this week?

Baxtori does not replace GitHub, Codex, CodeRabbit, Greptile, or a repository graph. It edits their evidence into maintained human understanding.

## Demo video script — approximately 2:50

Record the product full-screen and use deliberate cuts rather than waiting for
OAuth or page loads. The words below are the voiceover; italic text describes
what should be visible.

### 0:00–0:18 — The problem

*Open `https://www.baxtori.com` at the top of Now. Let the title and contents
remain still for a moment.*

> Coding agents can now change several repositories faster than one developer can absorb them. Pull-request review checks whether a change can merge. It does not preserve the author's understanding after it merges. Baxtori is a quiet continuity layer for that gap.

### 0:18–0:43 — The product

*Scroll through the finite contents and stop on the first story.*

> Codex reviews accepted changes and selects only the few that should alter my mental model. Baxtori publishes those findings as a finite field journal—not another notification feed. This is a public example edition, so a judge can read it without an account. A valid review can also publish nothing when nothing is important enough.

### 0:43–1:12 — Exact evidence

*Open Evidence. Show the full base and head commits, file and line range, then
briefly switch between code and diff.*

> Every claim is attached to exact Git evidence: repository, full commits, changed file, and line range. Before publication, validators check the Git objects, ancestry, changed path, file existence, and line bounds. The prose is useful, but it never asks you to trust an unsupported summary.

### 1:12–1:39 — Memory changes the next review

*Mark the story Understood, Watch another, then open Memory and show the watched
thread across editions.*

> I can mark what I understand, watch a concern, or leave a question on exact code. Memory carries those decisions across editions. The next Codex review receives that explicit human context instead of beginning from a blank prompt every week.

### 1:39–2:02 — Connect GitHub honestly

*Show the GitHub connection button, then cut to an already connected account and
open Sources. Change one repository between Pinned, Automatic, and Muted.*

> Connect GitHub uses a read-only GitHub App. Repository access and reader memory are isolated by numeric GitHub user ID. The current journal remains clearly labeled as the public example: connection proves safe source selection and durable account memory, while unattended private compilation is the next product boundary.

### 2:02–2:38 — Codex and GPT-5.6

*Show the primary Codex task with `/status` visible, then
`codex/review-instructions.md`, `scripts/collect-backstory.mjs`,
`scripts/finalize-review-run.mjs`, and one passing validation result.*

> I built Baxtori with Codex and GPT-5.6. GPT-5.6 helped me challenge the product boundary, trace security and data-flow risks, implement the reader and GitHub workflows, and verify the result. Inside the product workflow, deterministic scripts collect bounded Git evidence; a local Codex review does the judgment-heavy selection and explanation; then strict code, edition, and map validators decide whether it can be published. The hosted app never sends a connected user's private code to my model account.

### 2:38–2:50 — Close

*Return to the journal and end on an open story with its evidence visible.*

> Review agents help code get merged. Baxtori helps the author remain able to explain what the merged system became.

## Recording preflight

- Keep the final edit under three minutes; aim for 2:45–2:50.
- Use a public YouTube upload and include audible narration.
- Run `/status` in the primary build task and show the Session ID plus the exact GPT-5.6 model name. Submit that same Session ID in the form.
- Confirm the demo URL is running the intended Git commit before recording.
- Start with a clean public browser session, then cut to an already connected test account rather than spending video time inside OAuth.
- Do not imply that connecting GitHub already compiles a private edition.
- Do not show `data/review-runs/` as proof until it contains a genuine completed receipt. Show the receipt protocol and passing validators instead.

## Judging criteria

| Criterion | What the demo proves |
| --- | --- |
| Technological implementation | A non-trivial Codex workflow sits between deterministic Git evidence collection and strict edition/map validators. The versioned instruction contract and receipt protocol can identify inputs, source heads, model/runtime, processed feedback, human edits, output, and validation results for a finalized run. |
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
