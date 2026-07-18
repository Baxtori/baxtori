# Product landscape: where Baxtori belongs

Reviewed 2026-07-18 against current first-party product material.

## The opening

Modern engineering tools are rapidly improving at producing documentation,
answering repository questions, reviewing pull requests, and navigating large
codebases. Baxtori should consume those capabilities, not recreate each one.

Its distinct job is the layer between activity and authorship:

> Decide what is worth a person's attention, teach it through exact evidence,
> and preserve the intent that should influence later agent work.

That makes Baxtori auto-wiki adjacent, review adjacent, and learning adjacent,
but not a direct substitute for any of them.

## What strong current products teach us

| Product pattern | Current signal | Baxtori implication |
| --- | --- | --- |
| Agent-maintained knowledge | [Mintlify's agent](https://www.mintlify.com/docs/agent) researches, plans, writes, validates, and opens documentation PRs. Its [AI-native guidance](https://www.mintlify.com/docs/ai-native) treats documentation as infrastructure for people and agents. | Export grounded context to documentation agents; do not make “generate a wiki” the primary experience. |
| Conversational repository orientation | [DeepWiki](https://deepwiki.com/) turns repositories into indexed, conversational wikis. | The System surface should provide durable bearings and cited uncertainty, then hand off to exact code. |
| Context-aware incremental review | [CodeRabbit](https://docs.coderabbit.ai/guides/code-review-overview) emphasizes incremental review, code graphs, severity, and conversation. [Graphite](https://graphite.com/docs/get-started) organizes focused, stack-aware review around GitHub. | Baxtori should remember which review findings actually changed understanding and suppress repeated noise. |
| Whole-codebase intelligence | [Greptile](https://www.greptile.com/) builds a code graph for review and testing. [Cursor](https://cursor.com/blog/secure-codebase-indexing) describes semantic indexing as a material input to agent performance. | Repository indexing is an input. The reader-facing output must still distinguish evidence, inference, confidence, and human memory. |
| Human-approved memory | [Cursor's background agent memory](https://cursor.com/changelog/1-2) exposes a plan and asks for approval before creating memories. [GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review) stresses validating AI feedback and supports repository instructions. | Watches, questions, and corrections must come from explicit reader actions; weak inferred relationships never become durable memory silently. |
| Purpose-built calm | [Linear's method](https://linear.app/method/introduction) argues for meaningful direction, manageable backlogs, cadence, and purpose-built workflows. [Raycast's interface API](https://developers.raycast.com/api-reference/user-interface) uses a consistent action model and keyboard shortcuts. | Show only what fits the current attention window, keep one obvious next action, and make the whole reading loop keyboard fluent. |

## Product boundary

Baxtori should integrate with:

- GitHub and code-review systems for exact activity and discussion;
- Codex and other coding agents for review, re-review, and implementation;
- documentation systems for durable public explanation;
- issue and chat systems for delivery where teams already work;
- MCP or a similarly inspectable protocol for grounded retrieval by agents.

It should own:

- editorial attention decisions;
- exact evidence addresses and immutable editions;
- the reader's comprehension frontier;
- watched concerns and unresolved questions;
- explicit corrections and re-review intent;
- continuity across changes, repositories, and weeks.

## Experience consequences

1. **Now is a budget, not a backlog.** It reports what fits the reader's chosen
   window, not every unexplored map node.
2. **System admits uncertainty.** Coverage and freshness describe the reviewed
   model, never a fabricated complete architecture.
3. **Memory shows evolution.** A durable topic should be followable across
   editions, with exact historical evidence one action away.
4. **Demo the loop, not generated prose.** The public path must work without
   credentials and prove selection, evidence, and continuity using real data.
5. **Integrations are delivery and context surfaces.** They should reduce
   switching without turning Baxtori into another notification feed.

## Near-term integration order

1. GitHub pull request and review context attached to published stories.
2. A read-only agent/MCP surface for Now, System, Memory, and exact citations.
3. Mintlify or repository-doc PR handoff for explanations the reader promotes.
4. Slack/Linear delivery for a single high-signal recommendation or a quiet
   state, never a mirrored feed.
5. IDE deep links that reopen the exact evidence and its surviving question.

The admission test remains the north star: an integration belongs only if it
directs attention, increases trustworthy understanding, preserves that
understanding, or improves later agent work.

## Why there is no magic item count

There is no defensible universal optimum such as three, five, or seven findings.
A [meta-analysis of 50 choice-overload experiments](https://doi.org/10.1086/651235)
found an average effect near zero with substantial variation, while a later
[meta-analysis](https://doi.org/10.1016/j.jcps.2014.08.002) found that complexity,
task difficulty, preference uncertainty, and the reader's goal—not a fixed item
count—moderate overload. Cross-national work also found that too little choice
can be more common and more damaging than too much
([Reutskaja et al., 2022](https://doi.org/10.1177/1069031X211073821)).

Baxtori therefore ranks the full attributable queue, asks the reader how much
time they have, and packs as much useful work as fits. The interface may recommend
a default window, but it must not present the resulting item count as a law.
