# Baxtori roadmap

The current product contract is in [NORTH_STAR.md](NORTH_STAR.md).

## Working now

- Scroll-first current edition
- Commit-addressed diffs and current code
- Read-only GitHub App access
- Per-account repository modes and reader state
- Watches and questions tied to code evidence
- Repository maps, walkthroughs, and study queues
- Searchable edition history
- Edition selection records
- Scheduled collection and validation scripts

## Next priorities

### 1. Complete the review loop

- Export each account's selected repositories and queued review requests safely.
- Show which requests a published review considered.
- Keep inaccessible or unhandled requests queued.
- Report failed fetches, stale cursors, and invalid evidence before publication.

### 2. Improve repository maps

- Flag map areas whose source files changed after their reviewed commit.
- Show the commits that triggered a map re-review.
- Remove remaining internal confidence scores from reader-facing copy.
- Add an explicit reset for hidden or understood areas.

### 3. Make watches useful

- Match later changes by exact retained paths or reviewed map areas.
- Explain why a new story belongs to a watched topic.
- Support active, resolved, and snoozed watch states in Memory.
- Keep weak matches out of the published edition.

### 4. Finish account behavior

- Verify multi-account isolation in production.
- Make local-only state and account-synced state visually distinct.
- Add clear recovery when an account revision changes on another device.
- Test download and deletion of account data end to end.

### 5. Reduce the root component

- Move the remaining state persistence into focused hooks.
- Remove the retired dashboard markup once migration tests no longer need it.
- Keep repository ranking and identity conversion in pure tested modules.
- Avoid rerendering the full reader when a code excerpt loads.

## Later

- Direct links to stories, excerpts, walkthroughs, and questions
- Browser history for primary views
- Resume the last open excerpt and scroll position
- Edit a queued review request before the scheduled run
- Copy selected evidence with repository and commit context
- Better wrapping and horizontal-position recovery for dense diffs

## Not planned for the hackathon

- Billing
- Team administration
- Repository write access
- A general chat interface
- Replacing GitHub, code review, or an IDE

## Release checks

- Lint, build, data validators, and unit tests pass.
- Signed-out and connected flows pass on mobile and desktop.
- Every published story has valid commit-addressed evidence.
- Empty or inaccessible repositories do not show fabricated map coverage.
- Reader actions remain reversible.
