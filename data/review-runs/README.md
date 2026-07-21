# Edition review runs

Each JSON file in this directory is an immutable receipt for one completed local Codex review.

A receipt binds:

- the hash and timestamp of ignored `data/candidates.json` input
- the version and hash of `codex/review-instructions.md`
- reviewed source heads and cursor modes
- the Codex model and runtime version
- feedback IDs actually considered
- human edits recorded before publication
- the hash and archive path of the published edition
- strict edition, map, scope, and policy validation results

Create a scratch manifest with `npm run edition:prepare`. After review, fill in the model, runtime, processed feedback IDs, and human edit descriptions in ignored `data/review-run.json`. Run `npm run edition:finalize` from the scheduled review machine with every selected source cache available. Finalization refuses changed inputs, failed strict evidence checks, conflicting archive content, or a duplicate run ID.

Do not edit completed receipts. Prepare a new run when inputs, instructions, or published output change.
