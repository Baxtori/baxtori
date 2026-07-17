from pathlib import Path


def replace_once(path: str, before: str, after: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(before)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {before[:100]!r}")
    file.write_text(text.replace(before, after, 1))


replace_once(
    "app/page.tsx",
    'import { mapWithConcurrency } from "@/lib/async-pool";\n',
    'import { mapWithConcurrency } from "@/lib/async-pool";\nimport type { EditionSelectionRecord } from "@/lib/edition-ledger";\n',
)
replace_once(
    "app/page.tsx",
    'import type { ReaderStatePayload, ReaderStoryState, ReviewRequest } from "@/lib/feedback-contract";\nimport { RepositoryModeControl } from "./repository-mode-control";\n',
    'import type { ReaderStatePayload, ReaderStoryState, ReviewRequest } from "@/lib/feedback-contract";\nimport { EditionSelectionLedger } from "./edition-selection-ledger";\nimport { RepositoryModeControl } from "./repository-mode-control";\n',
)
replace_once(
    "app/page.tsx",
    '  quietRepositories: string[];\n  stories: Story[];\n',
    '  quietRepositories: string[];\n  selection?: EditionSelectionRecord;\n  stories: Story[];\n',
)
replace_once(
    "app/page.tsx",
    '        {view === "briefing" && (\n          <section className="briefing-view" aria-labelledby="briefing-heading">\n',
    '        {view === "briefing" && <EditionSelectionLedger edition={EDITION} />}\n\n        {view === "briefing" && (\n          <section className="briefing-view" aria-labelledby="briefing-heading">\n',
)
replace_once(
    "scripts/validate-edition.mjs",
    'import { readFile } from "node:fs/promises";\n',
    'import { readFile } from "node:fs/promises";\nimport { validateEditionSelectionRecord } from "./lib/edition-selection-record.mjs";\n',
)
replace_once(
    "scripts/validate-edition.mjs",
    'for (const story of edition.stories) {\n',
    'validateEditionSelectionRecord(edition.selection, edition.stories);\n\nfor (const story of edition.stories) {\n',
)
