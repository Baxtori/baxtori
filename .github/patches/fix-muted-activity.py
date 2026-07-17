from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}.")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "scripts/lib/authorized-source-plan.mjs",
    '''    if (!eligible) {
      entries.push({
        ...activitySummary,
        archived: entry.archived,''',
    '''    if (!eligible) {
      entries.push({
        ...activitySummary,
        activityCandidate: false,
        archived: entry.archived,''',
)

replace_once(
    "tests/authorized-source-plan.test.mjs",
    '''  assert.equal(plan.entries[0].sourceStatus, "muted");
  assert.equal(plan.entries[0].activityCandidate, true);''',
    '''  assert.equal(plan.entries[0].sourceStatus, "muted");
  assert.equal(plan.entries[0].activityCandidate, false);''',
)
