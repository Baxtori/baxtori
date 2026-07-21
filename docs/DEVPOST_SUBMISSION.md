# Devpost submission copy

## About the project

### Inspiration

I built Baxtori because I was getting an uncomfortable feeling from my own
workflow. Coding agents were helping me ship changes across several repositories,
and I could follow each task while it was happening. A few days later, I would
open one of those projects and realize that I remembered the ticket or the pull
request but had lost the larger shape of the system.

That felt like a real limit on agent-assisted development. More code was landing,
yet the person responsible for it had less time to absorb what changed. I wanted
a recurring review that could look across repositories, decide which changes
actually affected my mental model, and give me a short reading session with the
code attached.

### What Baxtori does

Baxtori turns recent merged work into an evidence-backed reading edition. Codex
reviews the collected changes and selects the ones that have a meaningful effect
on architecture, behavior, security, operations, or an ongoing concern from an
earlier edition. Each published story explains the change, why it matters, what
to verify, and the tradeoff. The evidence panel links that explanation to the
exact repository, base commit, head commit, file, and line range.

The product has three main views. **Now** contains the current edition and gives
the reader a finite path through it. **System** organizes reviewed areas, source
files, walkthroughs, and open questions by repository. **Memory** keeps earlier
editions, watched topics, code questions, and the reader's own understanding
available over time.

The public link opens the complete example edition. A GitHub connection adds a
read-only source library and synchronized reading state. Connected users can
choose which repositories belong in the review scope and set each one to Pinned,
Automatic, or Muted. The current journal remains the public example while
personalized compilation is being built.

### How I built it

I built Baxtori with Codex and GPT-5.6. I used Codex throughout the project to
inspect the repository, work through the product model, implement features,
trace authentication and persistence flows, review security decisions, and run
the application through its builds and tests. GPT-5.6 was especially useful when
the work required judgment across several files or concerns at once. It helped me
catch places where the interface implied more capability than the backend could
support, and it pushed the source, account, and evidence boundaries into much
clearer shapes.

The review pipeline gives scripts and Codex separate jobs. Node.js scripts collect
bounded Git evidence from configured branches. They resume from the last reviewed
commit, record history rewrites, and use a limited date range when a cursor is no
longer usable. A versioned instruction contract then gives Codex the candidates,
repository maps, earlier selection history, and explicit reader feedback. Codex
clusters related work, chooses the changes that deserve a story, and writes the
structured edition data.

Finalization runs strict checks over the result. The validators confirm commit
existence, ancestry, changed paths, file contents, line bounds, selection records,
archives, and repository maps. A receipt protocol can record the input and
instruction hashes, source heads, model/runtime metadata, processed feedback,
human edits, output hash, and validator results for each completed run. An
edition with zero stories is also valid; its selection ledger still records what
the review inspected and why each repository produced no story.

The reader is a responsive Next.js and React application written in TypeScript.
It uses a read-only GitHub App for authentication and requested evidence, Convex
for account-scoped state, encrypted HttpOnly cookies for session material, and
same-origin checks for mutations. Vercel hosts the public application. The same
repository also builds through Vinext, and Playwright runs the reader on desktop
Chromium and a Pixel 7 mobile profile.

### Challenges

Selection took the most thought. A summary of every commit would still leave me
with a pile of material to process. The compiler needed a real publication
threshold, a reading-time budget, and a record of every included, deferred,
excluded, inaccessible, or story-free repository. That made omission part of the
review result and gave me a way to inspect the model's editorial choices.

Evidence was the second hard problem. A good explanation can become misleading
as soon as its code reference drifts. I ended up treating every claim as a
bounded Git address and validating that address during publication. The browser
uses the same boundaries when it fetches source or diff data, so the explanation
and the code stay connected.

The account boundary required just as much care. GitHub authorization, reader
memory, and scheduled compilation have different privacy and cost implications.
The current build supports real account-isolated source choices and memory. The
owner's scheduled Codex task covers the configured public example. A future
per-account compiler will need installation tokens, isolated source caches,
scheduling, consent, and usage limits before it can process each reader's private
repositories.

The interface also had to make dense material readable. I worked through several
dashboard-style versions before the field-journal structure clicked. The final
reader uses a finite scroll path, progressive evidence disclosure, keyboard
navigation, and an editorial visual system that gives the code room to breathe.

### What I learned

The main lesson was that models work well here when the surrounding program gives
them a precise job. Git establishes the facts, Codex makes the editorial decision,
and validators enforce the publication contract. That division made the output
more useful and made failures easier to understand.

I also learned that developer memory can be treated as structured product input.
An “Understood” mark, a watched topic, or a question on a code range can guide a
later review. Once those signals persist across editions, each review can build
on the last one and develop a working relationship with the reader.

The project also made me more candid about incomplete coverage. Baxtori records
inaccessible repositories, unmapped areas, deferred findings, and repositories
that produced no story. Those states tell the reader exactly how far the review
reached.

### What works today

The public application includes a complete example with five stories and sixteen
Git-validated excerpts. Readers can inspect exact source and diffs, mark stories
understood, watch topics, ask questions on code ranges, browse repository maps,
and search four editions of memory. The GitHub App provides real read-only account
connection, source modes, and synchronized reader state. The repository currently
passes 165 unit and validation tests plus 14 desktop/mobile browser tests.

### What's next

The next milestone is a complete personalized cycle: a connected repository
changes, Codex selects one consequence, the reader responds to it, and the next
edition visibly uses that response. I plan to build the installation-token
collector, isolated temporary caches, and per-account scheduler required for that
cycle. After people use it repeatedly, I will have enough evidence to make the
right decisions about teams, hosted usage, and pricing.

## Built with

Copy these as Devpost tags (18 total):

`OpenAI Codex`, `GPT-5.6`, `Next.js`, `React`, `TypeScript`, `Node.js`, `Vercel`,
`GitHub`, `GitHub API`, `GitHub Apps`, `OAuth`, `Convex`, `Playwright`, `Vinext`,
`Cloudflare Workers`, `Blacksmith`, `CSS`, `Web Crypto API`

## Installation, platforms, and testing

### Fastest judging path

1. Open [https://www.baxtori.com](https://www.baxtori.com) in Chrome or Edge.
   The public example opens immediately.
2. Read the first story and open **Evidence** to inspect its commits, file, line
   range, source, and diff.
3. Mark one story **Understood**, mark another **Watch**, and open **Memory** to
   see the same topic across earlier editions.
4. Open **System** to inspect repository maps, reviewed files, walkthroughs, and
   open questions.
5. To test account features, connect the read-only GitHub App, open **Sources**,
   and change a repository between Pinned, Automatic, and Muted.

### Supported platforms

- Hosted responsive web application for modern browsers
- Automated coverage on current desktop Chromium and a Pixel 7 mobile profile
- Local development on macOS, Linux, or Windows through WSL with Node.js 22.13+

### Local installation

```bash
git clone https://github.com/Baxtori/baxtori.git
cd baxtori
npm install
cp .env.example .env.local
npm run dev
```

The public reader starts with the included edition data. Account features use the
GitHub App and Convex values documented in `.env.example`. The GitHub App requires
**Contents: Read-only** and **Metadata: Read-only** repository permissions.

### Verification

```bash
npm run lint
npm test
npm run test:visual
npx next build
```

The suite covers evidence parsing, OAuth and request boundaries, repository
identity and modes, account state, edition selection and validation, repository
maps, and the full desktop/mobile reader flow.
