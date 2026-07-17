from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {old[:80]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "scripts/lib/authorized-source-plan.mjs",
    '''  configuredSources,
  inventoryAvailable = repositoryInventory.length > 0,
  repositoryInventory = [],
  repositoryModes = {},''',
    '''  configuredSources,
  repositoryInventory = [],
  inventoryAvailable = repositoryInventory.length > 0,
  repositoryModes = {},''',
)

replace_once(
    "lib/github-repository-library.ts",
    '''export class GitHubRepositoryLibraryError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GitHubRepositoryLibraryError";
  }
}''',
    '''export class GitHubRepositoryLibraryError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubRepositoryLibraryError";
    this.status = status;
  }
}''',
)
