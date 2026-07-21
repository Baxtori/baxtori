# Baxtori edition review contract

Instruction version: **1**

This file is the versioned judgment contract for the scheduled local Codex review. The hosted application does not invoke a model.

## Inputs

Read these files before editing publication data:

- `data/candidates.json` — ignored deterministic evidence collected from configured origin branches
- `data/review-run.json` — ignored run manifest prepared from the candidate input
- `data/latest.json` — currently published edition
- `data/repository-maps.json` and its registered map files
- `data/review-policy.json` — preserved review rules and lenses

Treat local checkout paths as execution details. Never copy them into an edition, map, run manifest, explanation, or commit message.

## Publication threshold

Publish a story only when review establishes all of the following:

1. Exact commits and files support the claim.
2. The change has a concrete consequence for behavior, operation, security, maintenance, or reader understanding.
3. The explanation adds useful context beyond commit subjects.
4. The consequence deserves reader attention in this edition.

A repository with no qualifying consequence is quiet. An edition with no qualifying stories is valid and must remain empty.

## Evidence rules

- Use full 40-character commit hashes.
- Every story must identify its canonical repository.
- Every code excerpt must include a distinct base and head commit, a safe repository-relative path, and a bounded line range that exists at the head commit.
- The cited path must change between the base and head commits.
- Include one to four excerpts per story.
- Do not infer unobserved runtime behavior. State uncertainty directly.
- Keep historical repository URLs intact when they are part of an already published edition; use `Baxtori/baxtori` for new Baxtori records.

## Reader-directed review

Watches, questions, and re-review requests are prompts for inspection, not automatic publication. Return a topic to the reader only after comparing its original evidence with newly collected commits. Record the exact reason for the match and the new evidence.

Copy only feedback IDs that were actually considered into `processedFeedbackIds` in `data/review-run.json`. Leave inaccessible or unhandled requests queued.

## Selection and omissions

- Follow the priority order embedded in `data/candidates.json`.
- Estimate reading time after understanding a finding.
- Pack qualifying findings into the configured reading budget without imposing a story-count ceiling.
- If the highest-priority finding exceeds the budget, publish it alone.
- Account for every inspected repository and qualifying candidate in the edition selection ledger as included, deferred, excluded, quiet, or inaccessible.
- Do not use engagement language to manufacture urgency.

## Repository maps

Review exact changed evidence before changing a map area's confidence, freshness, verdict, concepts, walkthrough, or questions. A filename match is a prompt to inspect, not proof. Preserve append-only review history and exact through-commit references.

## Run procedure

1. Run `npm run edition:prepare`.
2. Review the prepared inputs and write the new `data/latest.json`, its matching archive file, and any evidence-backed map updates.
3. Fill in `model`, `runtime`, `humanEdits`, and `processedFeedbackIds` in `data/review-run.json` when applicable.
4. Run `npm run edition:finalize` from a machine with every selected source cache available.
5. Review the generated manifest under `data/review-runs/` and the complete Git diff before committing.

Do not publish when strict validation fails.
