# Glimpse

**A quiet weekly briefing for understanding the code you and your agents just made.**

Glimpse is not a notification feed or a code-review bot. It is a small, personal
reading surface that turns a week of change into a few evidence-backed stories:
what changed, why it matters, what tradeoff remains, and what is worth your time.

## What this first version includes

- An editorial weekly briefing with ranked change stories
- A chronological timeline for the same work
- Evidence drawers with likely intent, verification prompts, affected files, and deliberate tradeoffs
- Personal triage controls: mark understood, watch, and mute
- Device-local reading progress that survives refreshes
- Focus mode, a next-unread flow, and keyboard navigation for batch reading
- Edition history, including a real quiet-week view
- Per-project filtering and a quiet-week state that refuses to manufacture updates
- Responsive layouts for desktop, tablet, and mobile

The interface currently uses realistic sample data. Repository collection,
change clustering, and scheduled local generation are deliberately the next
layer—not hidden behind pretend automation.

## Run it locally

```bash
npm install
npm run dev
```

Then open the local address printed by the development server.

## Validate a production build

```bash
npm run build
```

## Product direction

The intended foundation is local-first:

```text
Selected local Git repositories
  → incremental commit-range collector
  → change clustering and evidence extraction
  → structured weekly rundown
  → a calm, opt-in Glimpse briefing
```

The product should stay quiet by default: no email, no push notifications, and
no empty weekly summaries. A project with nothing materially new simply remains
quiet.
