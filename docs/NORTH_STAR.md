# Baxtori product definition

## Audience

Baxtori is for developers supervising code produced across several repositories,
especially when agents create changes faster than one person can read them.

## Job

Baxtori publishes a short review of the changes worth reading. Each story links
to the relevant code. Reader decisions—understood, watched, questioned, or
hidden—remain available for later reviews.

It is not a replacement for GitHub, an IDE, or pull-request review.

## Main views

| View | Purpose |
| --- | --- |
| Now | Read the current edition and open its code. |
| System | Browse reviewed repository areas, files, walkthroughs, and questions. |
| Memory | Search prior editions, watches, and open questions. |
| Sources | Choose which repositories the next review may inspect. |

Edition records explain what was published, deferred, excluded, quiet, or
inaccessible. They are supporting records, not a primary navigation category.

## Review loop

1. The collector reads new commits from configured repository branches.
2. The scheduled review decides which changes need a story.
3. The edition is validated and committed.
4. A reader opens the story and its commit-addressed code.
5. The reader may understand, watch, question, hide, or request another review.
6. That state is available to the next scheduled review.

The collector may identify candidates, but it does not publish conclusions.

## Content rules

- The home page is a finite edition, not an activity feed.
- Lead with the change and its consequence, not compiler mechanics.
- Every code claim links to a repository, commit range, file, and lines.
- Keep code, selection records, and repository administration behind explicit controls.
- Publish no story when no change is worth reading.
- Do not show unsupported understanding or quality percentages.
- Use plain labels that describe the action or saved state.

## State and evidence

Published editions remain immutable. Personal reading state remains editable
and is stored separately.

Repository maps are reviewed snapshots. A changed source file may reopen a map
area in a later review. A map is not complete architecture documentation and
must not claim coverage for a repository that has not been reviewed.

Questions retain their exact code range. Watches retain their repository and
topic identity. Weak filename matches stay in review input and do not become
reader-facing follow-ups without review.

## Product requirements

- The signed-out home opens directly to a real edition.
- Mobile and desktop share the same information structure.
- Source access is read-only and limited to repositories selected in GitHub.
- A GitHub or storage failure preserves already published reading.
- Keyboard and touch navigation must not block ordinary browser behavior.
- Motion must respond immediately, avoid layout shifts, and respect reduced motion.

## Success checks

- A reader can reach the relevant code from a story in one action.
- Quiet reviews create no artificial work.
- Watches and questions survive a new edition.
- Historical code ranges still open after the current edition changes.
- A reader can identify the important change without reading every commit.
