# Editorial product pass

**Date:** 2026-07-22  
**Status:** Implemented decision and follow-on review

## Decision

Baxtori should behave like a finite technical periodical, not an activity
dashboard and not a time-boxed recommendation engine.

The published edition is the editor's complete judgment. It must never lose
stories because a reader chose a shorter attention budget. A separate capture
window controls which GitHub commits are candidates for the *next* edition.
Memory gets its own date range because archive navigation and source collection
are different jobs.

This preserves one shared editorial edition while still giving each reader
control over collection and retrieval.

## What the review found

### The published issue was being silently shortened

The current edition contains five stories, but the trail was built from the
15-minute Continue plan. That made the opening claim that there were three
stories even though the edition record contained five. The attention budget is
useful for unfinished personal work, but it is not a publishing rule.

The trail now uses every story in published order. Continue remains a personal
queue for what to study next outside the issue.

### Collection had no reader-visible time boundary

The compiler preview always queried since the hard-coded review cursor. A
reader could select repositories but could not answer the equally important
question: "from when?"

Sources now offers bounded choices: since the last edition, or the last 7, 14,
30, or 90 days. The value is validated, stored per account, and converted to
either an exact cursor or a bounded rolling request. Arbitrary query fragments
never reach GitHub.

### Memory needed retrieval controls, not another feed

The edition archive already supported repository, topic, question, watch, and
text filters. It now also supports 7, 30, and 90-day edition ranges. A custom
date picker is deliberately deferred until the archive is large enough to
prove that fixed ranges are insufficient.

### Authentication did duplicate work

The server already determines GitHub identity for the first render, but the
client immediately requested the same status again. That added a request and
created a refresh-time opportunity for the authenticated shell to disagree
with the server.

The initial server result is now authoritative. Baxtori-owned state routes
validate the encrypted identity without rotating GitHub credentials; only
routes that actually call GitHub refresh its access token. OAuth state is bound
to an HttpOnly, SameSite browser cookie as well as an encrypted, expiring
payload. The session-encryption key is cached per server isolate.

### Action colors were carrying accidental semantics

The blue Watch and red Evidence buttons looked like competing primary and
destructive actions. Neither meaning was true. The reader now uses one green
primary action and quiet ink-and-rule secondary actions. Destructive intent is
expressed by confirmation and wording, not a permanent red control in the
reading path.

### Motion was too leisurely for a tool

Baxtori should not animate navigation for its own sake. Motion is limited to
80–160 ms state acknowledgement: a one-pixel press, a small evidence reveal,
and color/border feedback. Reduced-motion support continues to remove these
effects. No transition delays input, scrolls the reader automatically, or
turns route changes into a presentation.

## Alternatives considered

### Keep the attention-budget edition

Rejected. A changing story count makes the edition feel generated per viewport
and obscures what was actually published.

### Show an infinite GitHub activity feed

Rejected. It recreates the triage burden Baxtori is meant to compress and
weakens the value of editorial selection.

### Add a free-form start/end picker everywhere

Rejected for now. It adds input complexity before the archive or collection
volume requires it. Named windows cover the current jobs and remain easy to
explain on mobile.

## Editorial design direction

The useful lesson from serious publication interfaces is disciplined hierarchy:
editors establish a shared order, typography makes that order legible, and
personal controls help discovery without rewriting the issue. Baxtori applies
that lesson through:

- one complete current edition;
- a compact opening ledger rather than dashboard cards;
- generous story-scale reading space followed by dense exact evidence;
- restrained botanical marginalia that never encodes technical status;
- separate source controls and archive filters;
- finite endings instead of engagement-driven infinity.

The botanical layer is atmosphere and pacing. The edition hierarchy, evidence
addresses, and literal labels carry meaning.

References reviewed:

- [The Atlantic](https://www.theatlantic.com/) for a current editorial front
  page with several densities inside one typographic system;
- [The Atlantic's redesign note](https://www.theatlantic.com/press-releases/archive/2017/05/the-atlantic-debuts-new-homepage-as-it-reaches-audience-record/527202/)
  for its explicit goal of adding density without losing clarity or priority;
- [The New York Times on personalization](https://nytimes.zendesk.com/hc/en-us/articles/360003965994-Personalization)
  for the useful boundary between shared editorial judgment and personalized
  discovery;
- [Designing with Content](https://ixda.org/video/designing-with-content/) for
  the principle that interface systems should keep editorial content on the
  main stage.

## Code-health recommendation

The main remaining risk is `app/baxtori-app.tsx`, which still coordinates auth,
local and remote persistence, repository inventory, activity, queue planning,
navigation, and every major view in one component. It is over 1,600 lines. A
large rewrite during hackathon polish would introduce more risk than value, so
the next structural pass should be behavior-preserving:

1. extract `useReaderPersistence`, `useRepositoryLibrary`, and
   `useRepositoryActivity` hooks;
2. move Now, System, Memory, Sources, and Edition surfaces into focused view
   components;
3. replace the two remaining hook-dependency suppressions with stable event
   callbacks;
4. add interaction tests for optimistic watch rollback, delayed state hydration,
   and OAuth expiry;
5. batch activity preview behind one server endpoint only if measurements show
   that per-repository requests are a real bottleneck.

This is the highest-leverage next engineering step after the demo. It should
not change the product model or the visual hierarchy.
