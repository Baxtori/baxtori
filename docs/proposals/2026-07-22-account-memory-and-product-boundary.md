# Account, memory, and product boundary

Reviewed 2026-07-22 against the deployed application, GitHub App, compiler,
account store, and current first-party material from adjacent products.

## Decision

Baxtori should not try to beat CodeRabbit, Greptile, CodeGraph, or Codex at
finding defects, building a code graph, or carrying out changes. Those systems
are increasingly good at review and repository intelligence.

Baxtori should own the editorial continuity after those systems work:

> Turn a large amount of agent activity into the smallest worthwhile reading
> path, attach every claim to exact evidence, and preserve the human decisions
> that should affect the next review.

The durable object is maintained comprehension, not another review comment.
The interface can therefore stay supplemental: a finite edition for a
solo developer or small team that already uses GitHub and coding agents.

## What the application does today

### GitHub connection

- The GitHub App is the repository connector. A second connector framework is
  not needed for repository names, activity, diffs, or file contents.
- It requests **Metadata: read** and **Contents: read**. It cannot push code,
  merge pull requests, modify settings, or write a memory file.
- GitHub user and refresh tokens are AES-GCM encrypted in an HttpOnly,
  SameSite=Lax cookie. Browser JavaScript never receives either token.
- Repository, activity, and code routes revalidate the server session. The
  first page render reads identity without rotating a single-use refresh token;
  rotation remains in a response-producing route that can set the new cookie.
- The library endpoint returns the repositories permitted by both the user and
  the GitHub App installation. Missing private repositories are normally an
  installation-selection issue, not a need for broader OAuth scopes.

### Stored account data

Convex stores the following under the stable numeric GitHub user ID:

- reading state and repository modes;
- an authorized repository inventory containing identifiers and metadata, not
  source code;
- watched topic threads and evidence addresses;
- evidence-attached questions;
- queued re-review requests.

Every user-facing query and mutation is scoped by that user ID, and mutations
that address an existing record verify record ownership. The browser cannot
call Convex directly with the bridge secret. Published editions and repository
maps remain versioned in Git and separate from editable personal state.

### Present multi-user limits

The live `baxtori` GitHub App is now public, so another GitHub account can
install it and use the repository reader with account-isolated state. The
remaining single-owner boundary is compilation: the local weekly compiler
requires one explicit `FEEDBACK_GITHUB_LOGIN`. Reading and memory are
multi-user; scheduled generation and publication are not yet tenant-aware.

## Why use this instead of a review agent?

| Tool category | Its job | Baxtori's job after it |
| --- | --- | --- |
| CodeRabbit / Greptile | Review each pull request, find problems, learn review preferences, suggest fixes | Decide which accepted changes alter the reader's understanding and suppress the rest |
| CodeGraph / repository graphs | Retrieve structure, dependencies, and blast radius efficiently | Turn graph evidence into an honest system bearing and preserve where confidence is weak |
| Codex and coding agents | Explain, review, test, fix, and implement on demand | Carry the reader's explicit questions, watches, and corrections into later agent work |
| GitHub | Store code, pull requests, commits, checks, and discussion | Publish a finite cross-repository edition organized around human attention rather than repository events |

Baxtori loses if its main output is “AI reviewed your PR.” It wins when a
developer returns after a week of agent work, understands one consequential
change quickly, and finds that last week's unresolved concern has survived with
its evidence intact.

## Memory should not silently append to a repository

A continuously appended `memory.md` would be easy to implement and wrong by
default. It would mix personal reading state with shared source history, create
bot-authored churn, leak private concerns into repositories, and become stale
context that later agents may trust too much.

Use three layers instead:

1. **Account memory is canonical.** Questions, watches, comprehension state,
   and re-review intent stay private and editable in the account store.
2. **Published evidence is immutable.** Editions, maps, commits, and exact code
   addresses stay versioned and reproducible.
3. **Repository context is promoted explicitly.** A later “Promote to project
   context” action can generate a small, reviewed artifact such as
   `.baxtori/context.md`. Only durable architectural intent belongs there. The
   first version should download or copy a patch; an optional GitHub write
   permission and PR flow can follow only after users ask for it.

Every promoted item should include its repository, evidence commit, owner,
review date, and whether it is a fact, decision, or open question. Updating the
artifact should replace or resolve prior items rather than append forever.

## Public-use sequence

### P0 — Make the current loop trustworthy

- Server-render the authenticated journal so refresh never flashes the retired
  dashboard.
- Make Sources a direct destination on mobile and keep edition mechanics inside
  the edition.
- Keep repository identity readable before controls at every viewport.
- Add a browser regression that delays account hydration and asserts that the
  retired dashboard never appears.

### P1 — Make installation safe for other people

- **Done:** make the GitHub App installable and publish a plain-language
  privacy/data-retention page.
- Add account data export and deletion, including reader state, inventory,
  threads, questions, and queued reviews.
- Show exactly what is stored: repository metadata in the account store; source
  and diffs fetched from GitHub when needed; no hosted model inference today.
- Detect “authorized but not installed” separately from expired credentials and
  empty repository access.

### P2 — Tenant the compiler

- Replace the single `FEEDBACK_GITHUB_LOGIN` selector with explicit account jobs
  keyed by numeric GitHub user ID.
- Give every job an edition namespace, repository allowlist, cursor set,
  publication target, and idempotency key.
- Choose a cost model explicitly: bring-your-own local compiler, paid hosted
  inference, or a manual compile action. Never spend one user's model account on
  another user's repositories implicitly.
- Keep generated conclusions out of the shared store until validation succeeds;
  failed jobs leave the previous edition intact.

### P3 — Feed better context into existing tools

- Expose read-only Now, System, Memory, and exact evidence through MCP or a small
  agent API.
- Import PR review discussion as candidate evidence without mirroring every
  comment.
- Add explicit repository-context export before requesting any write permission.

## Security rules that should remain non-negotiable

- Read-only GitHub permissions by default and repository selection controlled
  by the installer.
- No access or refresh token in local storage, client props, logs, Convex, or
  generated editions.
- Numeric provider ID as the account key; login is display and compiler lookup
  metadata, not authorization.
- Server-side authorization on every data route; UI visibility is never an
  authorization boundary.
- No cross-user compiler fallback. If an account cannot be resolved exactly,
  publish nothing.
- Personal memory and published evidence remain separate data classes with
  separate deletion and immutability rules.

## Immediate next product proof

Do not add another dashboard or a generic chat box. Prove one complete loop on
one real repository:

1. a change lands;
2. review or graph tooling supplies candidate evidence;
3. Baxtori selects one consequence worth learning;
4. the reader reaches the exact diff in one action;
5. the reader watches, questions, or understands it;
6. the next edition shows how that decision changed what the compiler selected.

That loop is the defensible product. The botanical reader is how it becomes a
habit; the continuity is why it deserves to exist.
