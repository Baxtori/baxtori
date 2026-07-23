# Creative exploration

Use this optional workflow when a consequential reader, interface, or product-language decision has several credible answers and the preferred direction is unclear.

The sequence is:

1. **Diverge:** produce a few intentionally different candidates against the same brief and repository evidence.
2. **Converge:** make a human decision, choose one direction, and continue iterating there.

Parallel candidates help discover a direction. A continuing implementation thread is usually better once the direction is known.

## Direction or execution?

- **Direction uncertainty:** several substantially different answers could satisfy the requirements. Explore alternatives.
- **Execution uncertainty:** the intended result is clear and the current attempt needs refinement. Stay on one branch and iterate.

Choosing how an edition reads, how a repository map communicates importance, or how a story balances consequence and evidence may justify alternatives. Correcting invalid evidence, navigation, accessibility, or responsive behavior belongs in one verified implementation.

## Prepare the brief

Separate fixed requirements from open decisions.

### Fixed

Every candidate should preserve:

- exact repository, commit, path, and range evidence;
- read-only GitHub permissions;
- immutable edition and run identities;
- reader decisions and durable memory;
- accessibility and responsive behavior;
- bounded request and rate-limit behavior;
- established terminology and product promises.

### Open

Name the questions the exploration should answer:

- Which change deserves attention first?
- How should consequence and evidence share a story?
- How much code should appear before disclosure?
- How should the reader know an edition is finite?
- What belongs in a map, trail, card, or detail view?
- Which product language is precise and memorable?

## References and anti-references

Use a small set of relevant reading products, code-review tools, editorial layouts, current Baxtori screens, and prior experiments. Record the specific quality worth examining.

Also record patterns to avoid, such as endless feeds, generic dashboard cards, evidence hidden behind vague summaries, decorative code snippets, or prose that overstates what a diff proves.

References provide vocabulary. Baxtori’s exact evidence remains the source of every published claim.

## Choose the amount of divergence

- **Small variation:** compare story hierarchy, evidence disclosure, density, labels, or navigation.
- **Directional variation:** compare editorial, compact expert, evidence-first, or memory-first presentations.
- **Conceptual variation:** compare different reading models, such as pages, a finite trail, a map-led reader, or a question-led view.

Use the cheapest level that supports a real decision.

## Assign distinct candidates

Three candidates are a useful default. Possible assignments:

- **Editorial:** prioritize sequence, consequence, pacing, and a clear ending.
- **Evidence-first:** keep exact code support continuously understandable and easy to inspect.
- **Memory-first:** emphasize watched areas, prior decisions, questions, and change over time.

Candidates should work independently during their first pass and receive the same source cache, edition, reader state, and fixed requirements.

## Require comparable evidence

Every candidate should use:

- the same repository snapshot and edition;
- the same story-ordering inputs;
- the same excerpts and diffs;
- the same reader decisions and prior memory;
- matching viewport sizes;
- the same build and browser-test expectations;
- a branch and exact commit;
- matching screenshots or recordings;
- a short statement of decisions and compromises.

Useful checkpoints include the edition overview, a small change, a story with several evidence ranges, a quiet edition, a watched area with later movement, a reader question, repository-map navigation, search, mobile layout, and unavailable evidence.

## Review by decision

Compare individual decisions:

- Which version makes the consequence easiest to understand?
- Which keeps evidence close enough to audit the prose?
- Which communicates finiteness and completion?
- Which supports both quick reading and careful inspection?
- Which helps the reader remember earlier decisions?
- Which feels specific to Baxtori?
- Which remains calm with a long or technically dense edition?
- Which language implies more certainty than the evidence supports?

Agent review can check the brief, evidence, omitted states, accessibility, and consistency. Human review owns editorial taste and emphasis.

## Converge explicitly

Record accepted and rejected decisions directly:

> Use A’s story pacing, B’s inline evidence cue, and C’s watched-area summary. Preserve the finite-edition ending. Reject the endless card stream.

Choose one canonical branch. Give the convergence pass the original brief, accepted elements, rejected directions and reasons, unresolved details, and verification requirements.

Return to one implementation when the preferred direction can be described clearly, new candidates mostly rearrange details, or remaining concerns can be written as specific edits.

## Fidelity ladder

Choose the lowest-cost artifact that supports the decision:

1. written reading concept;
2. rough page sequence;
3. static HTML or screenshot;
4. isolated story or map component;
5. working branch;
6. complete reader prototype.

Use working code when scrolling, keyboard behavior, evidence disclosure, persistence, responsiveness, or transitions determine quality.

## Lightweight record

```md
# Creative exploration

## Decision to make

## Fixed requirements
- 

## Open questions
- 

## References and anti-references
- 

## Candidates
- A: editorial
- B: evidence-first
- C: memory-first

## Shared edition and required states
- 

## Selection
- Keep:
- Combine:
- Reject:
- Explore during convergence:

## Canonical branch and commit

## Remaining questions
- 
```

## Possible uses in Baxtori

This workflow may be useful for the finite edition reader, story hierarchy, evidence disclosure, repository maps, watched areas, reader memory, search, onboarding, demo copy, questions, decisions, and activity status.

Keep source validation, repository identities, exact code evidence, request limits, reader decisions, and edition receipts fixed across candidates. Explore how the reader encounters and understands those facts.